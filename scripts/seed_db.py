#!/usr/bin/env python3
"""Idempotent CSV -> Supabase loader (backend-spec.md §2).

Usage:
    set -a && source .env && set +a && python scripts/seed_db.py

Requires DATABASE_URL_OWNER (local/CI only — never present in Render).
Seed order matches backend-spec.md §2 exactly: suppliers, buyers ->
finished_goods (resolve supplier name -> FK) -> tech_packs -> sales_orders
(resolve buyer name -> FK) -> sales_invoices. Every table is upserted on its
primary key, so re-running this script is safe and converges on the same
row counts.
"""

from __future__ import annotations

import csv
import os
import sys
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

import psycopg

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
ENV_VAR = "DATABASE_URL_OWNER"

ORDER_STATUSES = {"Confirmed", "In Production", "Shipped", "Delivered", "Cancelled"}
CURRENCIES = {"INR", "USD", "EUR", "GBP"}
PAYMENT_STATUSES = {"Paid", "Pending", "Partially Paid", "Overdue"}


class SeedError(Exception):
    """Raised for any bad input or integrity failure; message is the whole point."""


# ── CSV helpers ──────────────────────────────────────────────────────────


def read_csv(filename: str) -> list[dict[str, str]]:
    path = DATA_DIR / filename
    if not path.exists():
        raise SeedError(f"{filename}: not found at {path}")
    with path.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        raise SeedError(f"{filename}: no data rows")
    return rows


def require(row: dict[str, str], field: str, *, source: str, row_num: int) -> str:
    value = (row.get(field) or "").strip()
    if not value:
        raise SeedError(f"{source} row {row_num}: '{field}' is required but empty")
    return value


def optional(row: dict[str, str], field: str) -> str | None:
    value = (row.get(field) or "").strip()
    return value or None


def parse_int(
    row: dict, field: str, *, source: str, row_num: int, min_value: int | None = None
) -> int:
    raw = require(row, field, source=source, row_num=row_num)
    try:
        value = int(raw)
    except ValueError as exc:
        raise SeedError(
            f"{source} row {row_num}: '{field}'={raw!r} is not an integer"
        ) from exc
    if min_value is not None and value < min_value:
        raise SeedError(
            f"{source} row {row_num}: '{field}'={value} must be >= {min_value}"
        )
    return value


def parse_decimal(row: dict, field: str, *, source: str, row_num: int) -> Decimal:
    raw = require(row, field, source=source, row_num=row_num)
    try:
        return Decimal(raw)
    except InvalidOperation as exc:
        raise SeedError(
            f"{source} row {row_num}: '{field}'={raw!r} is not a number"
        ) from exc


def parse_optional_decimal(
    row: dict, field: str, *, source: str, row_num: int
) -> Decimal | None:
    if optional(row, field) is None:
        return None
    return parse_decimal(row, field, source=source, row_num=row_num)


def parse_date(row: dict, field: str, *, source: str, row_num: int) -> date | None:
    raw = optional(row, field)
    if raw is None:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise SeedError(
            f"{source} row {row_num}: '{field}'={raw!r} is not YYYY-MM-DD"
        ) from exc


def parse_enum(
    row: dict, field: str, allowed: set[str], *, source: str, row_num: int
) -> str:
    value = require(row, field, source=source, row_num=row_num)
    if value not in allowed:
        raise SeedError(
            f"{source} row {row_num}: '{field}'={value!r} not in {sorted(allowed)}"
        )
    return value


def check_no_duplicates(keys: list[str], *, source: str, field: str) -> None:
    seen: set[str] = set()
    for key in keys:
        if key in seen:
            raise SeedError(f"{source}: duplicate {field} {key!r}")
        seen.add(key)


def build_search_text(row: dict[str, str]) -> str:
    """finished_goods.csv has no search_text column — it's the BGE-small
    embedding input, generated here, not sourced data. Concatenates the
    descriptive fields a buyer would plausibly search on. Not a stored fact:
    changing this formula later is a one-line edit + re-run, since the
    upsert overwrites it every time (see NOTE in load_finished_goods)."""
    parts = [
        row.get("style_name"),
        row.get("category"),
        row.get("fabric"),
        row.get("color"),
        row.get("print"),
        row.get("season"),
        row.get("brand"),
    ]
    return " ".join(p.strip() for p in parts if p and p.strip())


# ── Loaders (one per table, in backend-spec.md §2 seed order) ──────────────


def load_suppliers(conn: psycopg.Connection) -> dict[str, str]:
    source = "suppliers.csv"
    rows = read_csv(source)
    by_name: dict[str, str] = {}
    values = []
    for i, r in enumerate(rows, start=2):
        supplier_id = require(r, "supplier_id", source=source, row_num=i)
        company_name = require(r, "company_name", source=source, row_num=i)
        if company_name in by_name:
            raise SeedError(
                f"{source} row {i}: duplicate company_name {company_name!r}"
            )
        rating = parse_decimal(r, "rating", source=source, row_num=i)
        if not (Decimal("0") <= rating <= Decimal("5")):
            raise SeedError(f"{source} row {i}: rating {rating} out of range 0-5")
        by_name[company_name] = supplier_id
        values.append(
            (
                supplier_id,
                company_name,
                optional(r, "country"),
                optional(r, "contact"),
                parse_int(r, "lead_time_days", source=source, row_num=i, min_value=1),
                rating,
            )
        )
    check_no_duplicates([v[0] for v in values], source=source, field="supplier_id")
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO suppliers (supplier_id, company_name, country, contact, lead_time_days, rating)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (supplier_id) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                country = EXCLUDED.country,
                contact = EXCLUDED.contact,
                lead_time_days = EXCLUDED.lead_time_days,
                rating = EXCLUDED.rating
            """,
            values,
        )
    print(f"  suppliers      {len(values)} rows")
    return by_name


def load_buyers(conn: psycopg.Connection) -> dict[str, str]:
    source = "buyers.csv"
    rows = read_csv(source)
    by_name: dict[str, str] = {}
    values = []
    for i, r in enumerate(rows, start=2):
        buyer_id = require(r, "buyer_id", source=source, row_num=i)
        company_name = require(r, "company_name", source=source, row_num=i)
        if company_name in by_name:
            raise SeedError(
                f"{source} row {i}: duplicate company_name {company_name!r}"
            )
        by_name[company_name] = buyer_id
        values.append(
            (
                buyer_id,
                company_name,
                optional(r, "country"),
                optional(r, "buyer_category"),
            )
        )
    check_no_duplicates([v[0] for v in values], source=source, field="buyer_id")
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO buyers (buyer_id, company_name, country, buyer_category)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (buyer_id) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                country = EXCLUDED.country,
                buyer_category = EXCLUDED.buyer_category
            """,
            values,
        )
    print(f"  buyers         {len(values)} rows")
    return by_name


def load_finished_goods(
    conn: psycopg.Connection, supplier_by_name: dict[str, str]
) -> set[str]:
    source = "finished_goods.csv"
    rows = read_csv(source)
    style_numbers: set[str] = set()
    values = []
    for i, r in enumerate(rows, start=2):
        style_number = require(r, "style_number", source=source, row_num=i)
        if style_number in style_numbers:
            raise SeedError(
                f"{source} row {i}: duplicate style_number {style_number!r}"
            )
        style_numbers.add(style_number)

        supplier_name = require(r, "supplier", source=source, row_num=i)
        supplier_id = supplier_by_name.get(supplier_name)
        if supplier_id is None:
            raise SeedError(
                f"{source} row {i}: supplier {supplier_name!r} not found in suppliers.csv"
            )

        gsm = parse_int(r, "gsm", source=source, row_num=i)
        if not (50 <= gsm <= 1000):
            raise SeedError(f"{source} row {i}: gsm {gsm} out of range 50-1000")

        values.append(
            (
                style_number,
                require(r, "style_name", source=source, row_num=i),
                optional(r, "category"),
                require(r, "fabric", source=source, row_num=i),
                gsm,
                optional(r, "color"),
                optional(r, "print"),
                optional(r, "season"),
                optional(r, "brand"),
                supplier_id,
                parse_optional_decimal(r, "cost", source=source, row_num=i),
                parse_decimal(r, "selling_price", source=source, row_num=i),
                require(r, "image_url", source=source, row_num=i),
                build_search_text(r),
            )
        )
    with conn.cursor() as cur:
        # NOTE: text_embedding/image_embedding are deliberately absent from
        # this statement (both the column list and the SET clause). They are
        # populated by the offline M9 job; if this script touched them,
        # re-seeding after M9 would silently wipe every embedding back to
        # NULL. This is the one line in the whole script where an omission
        # is load-bearing, not an oversight.
        cur.executemany(
            """
            INSERT INTO finished_goods (
                style_number, style_name, category, fabric, gsm, color, print,
                season, brand, supplier_id, cost, selling_price, image_url, search_text
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (style_number) DO UPDATE SET
                style_name = EXCLUDED.style_name,
                category = EXCLUDED.category,
                fabric = EXCLUDED.fabric,
                gsm = EXCLUDED.gsm,
                color = EXCLUDED.color,
                print = EXCLUDED.print,
                season = EXCLUDED.season,
                brand = EXCLUDED.brand,
                supplier_id = EXCLUDED.supplier_id,
                cost = EXCLUDED.cost,
                selling_price = EXCLUDED.selling_price,
                image_url = EXCLUDED.image_url,
                search_text = EXCLUDED.search_text
            """,
            values,
        )
    print(f"  finished_goods {len(values)} rows")
    return style_numbers


def load_tech_packs(conn: psycopg.Connection, style_numbers: set[str]) -> None:
    source = "tech_packs.csv"
    rows = read_csv(source)
    seen: set[str] = set()
    values = []
    for i, r in enumerate(rows, start=2):
        tech_pack_id = require(r, "tech_pack_id", source=source, row_num=i)
        style_number = require(r, "style_number", source=source, row_num=i)
        if style_number in seen:
            raise SeedError(
                f"{source} row {i}: duplicate style_number {style_number!r} (must be 1:1)"
            )
        if style_number not in style_numbers:
            raise SeedError(
                f"{source} row {i}: style_number {style_number!r} not found in finished_goods.csv"
            )
        seen.add(style_number)
        values.append(
            (
                tech_pack_id,
                style_number,
                optional(r, "fabric_details"),
                optional(r, "construction"),
                optional(r, "wash_instructions"),
            )
        )
    check_no_duplicates([v[0] for v in values], source=source, field="tech_pack_id")
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO tech_packs (tech_pack_id, style_number, fabric_details, construction, wash_instructions)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (tech_pack_id) DO UPDATE SET
                style_number = EXCLUDED.style_number,
                fabric_details = EXCLUDED.fabric_details,
                construction = EXCLUDED.construction,
                wash_instructions = EXCLUDED.wash_instructions
            """,
            values,
        )
    print(f"  tech_packs     {len(values)} rows")


def load_sales_orders(
    conn: psycopg.Connection, buyer_by_name: dict[str, str], style_numbers: set[str]
) -> set[str]:
    source = "sales_orders.csv"
    rows = read_csv(source)
    order_numbers: set[str] = set()
    values = []
    for i, r in enumerate(rows, start=2):
        order_number = require(r, "order_number", source=source, row_num=i)
        if order_number in order_numbers:
            raise SeedError(
                f"{source} row {i}: duplicate order_number {order_number!r}"
            )
        order_numbers.add(order_number)

        buyer_name = require(r, "buyer", source=source, row_num=i)
        buyer_id = buyer_by_name.get(buyer_name)
        if buyer_id is None:
            raise SeedError(
                f"{source} row {i}: buyer {buyer_name!r} not found in buyers.csv"
            )

        style_number = require(r, "style_number", source=source, row_num=i)
        if style_number not in style_numbers:
            raise SeedError(
                f"{source} row {i}: style_number {style_number!r} not found in finished_goods.csv"
            )

        values.append(
            (
                order_number,
                buyer_id,
                style_number,
                parse_int(r, "quantity", source=source, row_num=i, min_value=1),
                parse_decimal(r, "unit_price", source=source, row_num=i),
                parse_date(r, "shipment_date", source=source, row_num=i),
                parse_enum(r, "status", ORDER_STATUSES, source=source, row_num=i),
            )
        )
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO sales_orders (order_number, buyer_id, style_number, quantity, unit_price, shipment_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (order_number) DO UPDATE SET
                buyer_id = EXCLUDED.buyer_id,
                style_number = EXCLUDED.style_number,
                quantity = EXCLUDED.quantity,
                unit_price = EXCLUDED.unit_price,
                shipment_date = EXCLUDED.shipment_date,
                status = EXCLUDED.status
            """,
            values,
        )
    print(f"  sales_orders   {len(values)} rows")
    return order_numbers


def load_sales_invoices(conn: psycopg.Connection, order_numbers: set[str]) -> int:
    source = "sales_invoices.csv"
    rows = read_csv(source)
    seen: set[str] = set()
    values = []
    for i, r in enumerate(rows, start=2):
        invoice_number = require(r, "invoice_number", source=source, row_num=i)
        # CSV column is "sales_order"; DB column is "order_number" (§1) — a
        # rename, not a lookup: the value itself is already the FK.
        order_number = require(r, "sales_order", source=source, row_num=i)
        if order_number in seen:
            raise SeedError(
                f"{source} row {i}: duplicate sales_order {order_number!r} (must be 0..1)"
            )
        if order_number not in order_numbers:
            raise SeedError(
                f"{source} row {i}: sales_order {order_number!r} not found in sales_orders.csv"
            )
        seen.add(order_number)
        values.append(
            (
                invoice_number,
                order_number,
                parse_decimal(r, "amount", source=source, row_num=i),
                parse_enum(r, "currency", CURRENCIES, source=source, row_num=i),
                parse_enum(
                    r, "payment_status", PAYMENT_STATUSES, source=source, row_num=i
                ),
            )
        )
    check_no_duplicates([v[0] for v in values], source=source, field="invoice_number")
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO sales_invoices (invoice_number, order_number, amount, currency, payment_status)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (invoice_number) DO UPDATE SET
                order_number = EXCLUDED.order_number,
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                payment_status = EXCLUDED.payment_status
            """,
            values,
        )
    print(f"  sales_invoices {len(values)} rows")
    return len(values)


# ── Integrity gates (backend-spec.md §2: "asserts row counts + zero-orphan
# invariants on every run") ─────────────────────────────────────────────
#
# schema.sql's FK constraints already make orphans structurally impossible,
# and the loaders above already refuse to insert an unresolved name/style
# before any SQL runs. These queries are a second, independent layer: they
# would also catch drift introduced outside this script (e.g. a manual
# psql edit between runs), and they make the "zero-orphan" guarantee an
# explicit, visible assertion rather than an implicit side effect.


def assert_row_count(conn: psycopg.Connection, table: str, expected: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT COUNT(*) FROM {table}"
        )  # table is a fixed literal, never user input
        (actual,) = cur.fetchone()
    if actual != expected:
        raise SeedError(
            f"integrity check: {table} has {actual} rows, expected {expected}"
        )


def assert_no_orphans(conn: psycopg.Connection, description: str, query: str) -> None:
    with conn.cursor() as cur:
        cur.execute(query)
        (count,) = cur.fetchone()
    if count:
        raise SeedError(f"integrity check failed: {count} {description}")


ORPHAN_CHECKS = [
    (
        "finished_goods row(s) with an unknown supplier_id",
        """SELECT COUNT(*) FROM finished_goods fg
           LEFT JOIN suppliers s ON s.supplier_id = fg.supplier_id
           WHERE s.supplier_id IS NULL""",
    ),
    (
        "tech_packs row(s) with an unknown style_number",
        """SELECT COUNT(*) FROM tech_packs tp
           LEFT JOIN finished_goods fg ON fg.style_number = tp.style_number
           WHERE fg.style_number IS NULL""",
    ),
    (
        "sales_orders row(s) with an unknown buyer_id",
        """SELECT COUNT(*) FROM sales_orders so
           LEFT JOIN buyers b ON b.buyer_id = so.buyer_id
           WHERE b.buyer_id IS NULL""",
    ),
    (
        "sales_orders row(s) with an unknown style_number",
        """SELECT COUNT(*) FROM sales_orders so
           LEFT JOIN finished_goods fg ON fg.style_number = so.style_number
           WHERE fg.style_number IS NULL""",
    ),
    (
        "sales_invoices row(s) with an unknown order_number",
        """SELECT COUNT(*) FROM sales_invoices si
           LEFT JOIN sales_orders so ON so.order_number = si.order_number
           WHERE so.order_number IS NULL""",
    ),
]


def main() -> None:
    database_url = os.environ.get(ENV_VAR)
    if not database_url:
        print(
            f"error: {ENV_VAR} is not set (local/CI only — never in Render)",
            file=sys.stderr,
        )
        print("  fix: set -a && source .env && set +a", file=sys.stderr)
        sys.exit(1)

    try:
        with psycopg.connect(database_url) as conn:
            print("seeding:")
            supplier_by_name = load_suppliers(conn)
            buyer_by_name = load_buyers(conn)
            style_numbers = load_finished_goods(conn, supplier_by_name)
            load_tech_packs(conn, style_numbers)
            order_numbers = load_sales_orders(conn, buyer_by_name, style_numbers)
            load_sales_invoices(conn, order_numbers)

            print("verifying:")
            assert_row_count(conn, "suppliers", len(supplier_by_name))
            assert_row_count(conn, "buyers", len(buyer_by_name))
            assert_row_count(conn, "finished_goods", len(style_numbers))
            assert_row_count(conn, "sales_orders", len(order_numbers))
            for description, query in ORPHAN_CHECKS:
                assert_no_orphans(conn, description, query)
            print("  row counts and referential integrity OK")
        # `with psycopg.connect(...)` commits on clean exit, rolls back on
        # any exception raised inside — the whole seed is one transaction.
    except SeedError as exc:
        print(f"seed failed: {exc}", file=sys.stderr)
        sys.exit(1)
    except psycopg.Error as exc:
        print(f"database error: {exc}", file=sys.stderr)
        sys.exit(1)

    print("seed complete.")


if __name__ == "__main__":
    main()
