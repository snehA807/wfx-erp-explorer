from __future__ import annotations

from app.db.queries import search as search_queries
from app.db.session import get_connection
from app.models.requests.search import SearchProductsRequest, SearchVisualRequest
from app.models.responses.search import SearchHit
from app.services.embeddings import embed_query_text, embed_query_visual
from app.services.products import row_to_summary, validate_categorical_filters


def _row_to_hit(row: tuple) -> SearchHit:
    # row is _LIST_COLUMNS (13 fields, same order as products.py::row_to_summary)
    # plus a trailing cosine distance column appended by the search queries.
    summary = row_to_summary(row[:13])
    distance = float(row[13])
    return SearchHit(**summary.model_dump(), score=round(1 - distance, 4))


def search_products(request: SearchProductsRequest) -> list[SearchHit]:
    validate_categorical_filters(request)

    filters = {
        "category": request.category,
        "fabric": request.fabric,
        "color": request.color,
        "print": request.print,
        "season": request.season,
        "brand": request.brand,
        "supplier_id": request.supplier_id,
        "min_price": request.min_price,
        "max_price": request.max_price,
        "min_gsm": request.min_gsm,
        "max_gsm": request.max_gsm,
    }
    where_sql, where_params = search_queries.build_where_clause(filters)
    qvec = embed_query_text(request.query)

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            search_queries.build_hybrid_search_query(where_sql),
            {**where_params, "qvec": qvec, "limit": request.limit},
        )
        rows = cur.fetchall()

    return [_row_to_hit(row) for row in rows]


def search_visual(request: SearchVisualRequest) -> list[SearchHit]:
    qvec = embed_query_visual(request.query)

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            search_queries.VISUAL_SEARCH, {"qvec": qvec, "limit": request.limit}
        )
        rows = cur.fetchall()

    return [_row_to_hit(row) for row in rows]
