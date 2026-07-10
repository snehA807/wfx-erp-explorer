from __future__ import annotations

from typing import Protocol

from app.core.errors import NotFoundError, ValidationError
from app.db.queries import products as product_queries
from app.db.session import get_connection
from app.models.requests.products import ProductListParams
from app.models.responses.products import (
    ProductDetailData,
    ProductSummary,
    SupplierDetail,
    TechPackDetail,
)
from app.services.filters import get_filter_options

_CATEGORICAL_FILTERS = ("category", "fabric", "color", "print", "season", "brand")


class CategoricalFilterParams(Protocol):
    """Structural type for anything carrying the six categorical filter
    fields — satisfied by both ProductListParams and
    SearchProductsRequest (M10) without either inheriting from the other."""

    category: str | None
    fabric: str | None
    color: str | None
    print: str | None
    season: str | None
    brand: str | None


def validate_categorical_filters(params: CategoricalFilterParams) -> None:
    """backend-spec.md §9 tier 2: filter values checked against cached
    facet sets, not just shape. Generalized in M10 so services/search.py
    reuses this verbatim instead of duplicating it."""
    options = get_filter_options()
    facets = {
        "category": options.category,
        "fabric": options.fabric,
        "color": options.color,
        "print": options.print,
        "season": options.season,
        "brand": options.brand,
    }
    for field in _CATEGORICAL_FILTERS:
        value = getattr(params, field)
        if value is None:
            continue
        known_values = {facet.value for facet in facets[field]}
        if value not in known_values:
            raise ValidationError(
                f"Unknown {field} filter value: {value!r}",
                details={"field": field, "value": value},
            )


def row_to_summary(row: tuple) -> ProductSummary:
    return ProductSummary(
        style_number=row[0],
        style_name=row[1],
        category=row[2],
        fabric=row[3],
        gsm=row[4],
        color=row[5],
        print=row[6],
        season=row[7],
        brand=row[8],
        cost=float(row[9]) if row[9] is not None else None,
        selling_price=float(row[10]),
        image_url=row[11],
        supplier_name=row[12],
    )


def list_products(params: ProductListParams) -> tuple[list[ProductSummary], int]:
    validate_categorical_filters(params)

    filters = {
        "category": params.category,
        "fabric": params.fabric,
        "color": params.color,
        "print": params.print,
        "season": params.season,
        "brand": params.brand,
        "supplier_id": params.supplier_id,
        "min_price": params.min_price,
        "max_price": params.max_price,
        "min_gsm": params.min_gsm,
        "max_gsm": params.max_gsm,
    }
    where_sql, where_params = product_queries.build_where_clause(filters)
    sort_column = product_queries.SORT_COLUMNS[params.sort_by]

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(product_queries.build_count_query(where_sql), where_params)
        total = cur.fetchone()[0]

        list_params = {
            **where_params,
            "limit": params.page_size,
            "offset": (params.page - 1) * params.page_size,
        }
        cur.execute(
            product_queries.build_list_query(where_sql, sort_column, params.order),
            list_params,
        )
        rows = cur.fetchall()

    return [row_to_summary(row) for row in rows], total


def get_product_detail(style_number: str) -> ProductDetailData:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            product_queries.PRODUCT_DETAIL, {"style_number": style_number}
        )
        row = cur.fetchone()

    if row is None:
        raise NotFoundError(f"No product with style_number {style_number!r}")

    tech_pack = None
    if row[18] is not None:
        tech_pack = TechPackDetail(
            tech_pack_id=row[18],
            fabric_details=row[19],
            construction=row[20],
            wash_instructions=row[21],
        )

    return ProductDetailData(
        style_number=row[0],
        style_name=row[1],
        category=row[2],
        fabric=row[3],
        gsm=row[4],
        color=row[5],
        print=row[6],
        season=row[7],
        brand=row[8],
        cost=float(row[9]) if row[9] is not None else None,
        selling_price=float(row[10]),
        image_url=row[11],
        supplier=SupplierDetail(
            supplier_id=row[12],
            company_name=row[13],
            country=row[14],
            contact=row[15],
            lead_time_days=row[16],
            rating=float(row[17]),
        ),
        tech_pack=tech_pack,
    )


def get_similar_products(style_number: str, limit: int) -> list[ProductSummary]:
    """Vector lookup only, no model call (backend-spec.md §3). Pre-M9, no
    row has a text_embedding yet, so this honestly returns an empty list
    rather than inventing a similarity signal."""
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            product_queries.PRODUCT_EMBEDDING_STATUS, {"style_number": style_number}
        )
        status_row = cur.fetchone()

        if status_row is None:
            raise NotFoundError(f"No product with style_number {style_number!r}")

        has_embedding = status_row[0]
        if not has_embedding:
            return []

        cur.execute(
            product_queries.SIMILAR_PRODUCTS,
            {"style_number": style_number, "limit": limit},
        )
        rows = cur.fetchall()

    return [row_to_summary(row) for row in rows]
