from __future__ import annotations

import time

from app.db.queries import filters as filter_queries
from app.db.session import get_connection
from app.models.responses.filters import FacetValue, FilterOptionsData, RangeFacet

_CACHE_TTL_SECONDS = 60 * 60  # backend-spec.md §7: 1-hour TTL

_cache: FilterOptionsData | None = None
_cache_expires_at: float = 0.0


def _fetch_facet(query: str) -> list[FacetValue]:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()
    return [FacetValue(value=row[0], count=row[1]) for row in rows]


def _fetch_filter_options() -> FilterOptionsData:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(filter_queries.RANGE_FACETS)
        gsm_min, gsm_max, price_min, price_max = cur.fetchone()

    return FilterOptionsData(
        category=_fetch_facet(filter_queries.CATEGORY_FACETS),
        fabric=_fetch_facet(filter_queries.FABRIC_FACETS),
        color=_fetch_facet(filter_queries.COLOR_FACETS),
        print=_fetch_facet(filter_queries.PRINT_FACETS),
        season=_fetch_facet(filter_queries.SEASON_FACETS),
        brand=_fetch_facet(filter_queries.BRAND_FACETS),
        gsm=RangeFacet(min=gsm_min, max=gsm_max),
        selling_price=RangeFacet(min=float(price_min), max=float(price_max)),
    )


def get_filter_options() -> FilterOptionsData:
    """Lazy singleton with a 1-hour TTL (coding-standards.md's no-module-
    side-effects rule + backend-spec.md §7): first call populates the
    cache, later calls within the window reuse it."""
    global _cache, _cache_expires_at
    now = time.monotonic()
    if _cache is None or now >= _cache_expires_at:
        _cache = _fetch_filter_options()
        _cache_expires_at = now + _CACHE_TTL_SECONDS
    return _cache
