#!/usr/bin/env python3
"""Golden-query evaluation harness (M7, docs/implementationM7.md §12).

Unlike seed_db.py/generate_embeddings.py, this script exercises the
trained NL2SQL service directly, so it needs the full backend dependency
set (vanna, chromadb, openai, ...) rather than scripts/requirements.txt's
minimal psycopg-only environment — run it with backend/.venv active.

For every golden question: generates SQL via the live Nl2SqlService
(guardrails already run inside generate_sql() for the generated
statement), runs the hand-verified reference SQL through
core/guardrails.py too ("every generated statement" is read broadly here
— both sides of the comparison execute against the real DB), executes
both against the real Supabase DB, and compares result sets as sorted
multisets of row tuples with values rounded to 2dp for float tolerance —
every numeric column in this schema is NUMERIC(12,2) or INTEGER, so
rounding is a sufficient tolerance mechanism (docs/implementationM7.md
§12). Prints a pass-rate table.

Usage (from backend/, with backend/.env populated):
    source .venv/bin/activate && python ../scripts/train_check.py
"""

from __future__ import annotations

import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.errors import AppError  # noqa: E402
from app.core.guardrails import enforce_guardrails  # noqa: E402
from app.db.session import get_connection  # noqa: E402
from app.services.nl2sql import (  # noqa: E402
    Nl2SqlService,
    _TRAINING_DIR,
    _load_golden_queries,
)


def _normalize(value: object) -> object:
    if isinstance(value, Decimal):
        return round(float(value), 2)
    if isinstance(value, float):
        return round(value, 2)
    return value


def _run(sql: str) -> list[tuple]:
    safe_sql = enforce_guardrails(sql)
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(safe_sql)
        return cur.fetchall()


def _rows_match(a: list[tuple], b: list[tuple]) -> bool:
    norm_a = sorted((tuple(_normalize(v) for v in row) for row in a), key=str)
    norm_b = sorted((tuple(_normalize(v) for v in row) for row in b), key=str)
    return norm_a == norm_b


def main() -> None:
    pairs = _load_golden_queries(_TRAINING_DIR / "golden_queries.yaml")

    service = Nl2SqlService()
    print(f"Training NL2SQL service on {len(pairs)} golden questions...")
    service.train()
    print("Trained.\n")

    results = []
    for i, pair in enumerate(pairs, 1):
        question = pair["question"]
        reference_sql = pair["sql"]

        try:
            generated = service.generate_sql(question)
        except AppError as exc:
            results.append((i, question, False, f"generation failed: {exc.code}: {exc.message}"))
            continue

        try:
            reference_rows = _run(reference_sql)
        except Exception as exc:
            results.append((i, question, False, f"reference SQL failed: {exc}"))
            continue

        try:
            generated_rows = _run(generated.sql)
        except Exception as exc:
            results.append((i, question, False, f"generated SQL failed to execute: {exc}"))
            continue

        passed = _rows_match(reference_rows, generated_rows)
        detail = (
            ""
            if passed
            else f"reference={len(reference_rows)} rows, generated={len(generated_rows)} rows"
        )
        results.append((i, question, passed, detail))

    print(f"{'#':>3}  {'PASS':<5} question")
    print("-" * 90)
    pass_count = 0
    for i, question, passed, detail in results:
        status = "PASS" if passed else "FAIL"
        if passed:
            pass_count += 1
        print(f"{i:>3}  {status:<5} {question}")
        if detail:
            print(f"          -> {detail}")

    print("-" * 90)
    print(f"Result: {pass_count}/{len(pairs)} passed")


if __name__ == "__main__":
    main()
