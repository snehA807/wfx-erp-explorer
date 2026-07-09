from __future__ import annotations

# coding-standards.md: named constants with %(param)s placeholders, never
# f-string interpolation of values. sort_by/filter columns are still
# assembled dynamically (page/filter combinations aren't enumerable as
# static constants), but only ever from the whitelists below — user input
# never reaches the SQL text itself, only %(param)s values.

SORT_COLUMNS: dict[str, str] = {
    "style_number": "fg.style_number",
    "style_name": "fg.style_name",
    "selling_price": "fg.selling_price",
    "gsm": "fg.gsm",
    "category": "fg.category",
}

# Exact-match categorical filters. Values are validated against
# services.filters's cached facet set before reaching this module
# (backend-spec.md §9 tier 2), so an unrecognized column name here would
# only ever come from a programming error, not user input.
EXACT_FILTER_COLUMNS: dict[str, str] = {
    "category": "fg.category",
    "fabric": "fg.fabric",
    "color": "fg.color",
    "print": "fg.print",
    "season": "fg.season",
    "brand": "fg.brand",
    "supplier_id": "fg.supplier_id",
}

_LIST_COLUMNS = """
    fg.style_number,
    fg.style_name,
    fg.category,
    fg.fabric,
    fg.gsm,
    fg.color,
    fg.print,
    fg.season,
    fg.brand,
    fg.cost,
    fg.selling_price,
    fg.image_url,
    s.company_name AS supplier_name
"""

_LIST_FROM = """
FROM finished_goods fg
JOIN suppliers s ON s.supplier_id = fg.supplier_id
"""


def build_where_clause(filters: dict) -> tuple[str, dict]:
    """Builds a WHERE clause from whitelisted columns only; every value is
    bound via %(param)s, never interpolated into the SQL text."""
    clauses: list[str] = []
    params: dict = {}

    for key, column in EXACT_FILTER_COLUMNS.items():
        value = filters.get(key)
        if value is not None:
            clauses.append(f"{column} = %({key})s")
            params[key] = value

    if filters.get("min_price") is not None:
        clauses.append("fg.selling_price >= %(min_price)s")
        params["min_price"] = filters["min_price"]
    if filters.get("max_price") is not None:
        clauses.append("fg.selling_price <= %(max_price)s")
        params["max_price"] = filters["max_price"]
    if filters.get("min_gsm") is not None:
        clauses.append("fg.gsm >= %(min_gsm)s")
        params["min_gsm"] = filters["min_gsm"]
    if filters.get("max_gsm") is not None:
        clauses.append("fg.gsm <= %(max_gsm)s")
        params["max_gsm"] = filters["max_gsm"]

    return (" AND ".join(clauses) if clauses else "TRUE"), params


def build_list_query(where_sql: str, sort_column: str, order: str) -> str:
    # order is validated (Literal["asc","desc"]) before this is called, and
    # sort_column comes only from SORT_COLUMNS.values() — neither is raw
    # user input by the time it reaches this f-string.
    return (
        f"SELECT{_LIST_COLUMNS}{_LIST_FROM}"
        f"WHERE {where_sql}\n"
        f"ORDER BY {sort_column} {order}, fg.style_number ASC\n"
        "LIMIT %(limit)s OFFSET %(offset)s"
    )


def build_count_query(where_sql: str) -> str:
    return f"SELECT count(*) AS total{_LIST_FROM}WHERE {where_sql}"


PRODUCT_DETAIL = """
SELECT
    fg.style_number,
    fg.style_name,
    fg.category,
    fg.fabric,
    fg.gsm,
    fg.color,
    fg.print,
    fg.season,
    fg.brand,
    fg.cost,
    fg.selling_price,
    fg.image_url,
    s.supplier_id,
    s.company_name AS supplier_name,
    s.country AS supplier_country,
    s.contact AS supplier_contact,
    s.lead_time_days AS supplier_lead_time_days,
    s.rating AS supplier_rating,
    tp.tech_pack_id,
    tp.fabric_details,
    tp.construction,
    tp.wash_instructions
FROM finished_goods fg
JOIN suppliers s ON s.supplier_id = fg.supplier_id
LEFT JOIN tech_packs tp ON tp.style_number = fg.style_number
WHERE fg.style_number = %(style_number)s
"""

# Existence + embedding-availability check, kept separate from the vector
# lookup below so the service can return an honest empty list (M4 scope)
# instead of relying on incidental NULL propagation inside the ORDER BY.
PRODUCT_EMBEDDING_STATUS = """
SELECT text_embedding IS NOT NULL AS has_embedding
FROM finished_goods
WHERE style_number = %(style_number)s
"""

SIMILAR_PRODUCTS = f"""
SELECT{_LIST_COLUMNS}{_LIST_FROM}
WHERE fg.style_number != %(style_number)s
  AND fg.text_embedding IS NOT NULL
ORDER BY fg.text_embedding <=> (
    SELECT text_embedding FROM finished_goods WHERE style_number = %(style_number)s
)
LIMIT %(limit)s
"""
