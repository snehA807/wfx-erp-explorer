from __future__ import annotations

import time

from app.db.queries import dashboard as dashboard_queries
from app.db.session import get_connection
from app.models.responses.dashboard import (
    CategoryRevenue,
    DashboardStatsData,
    DashboardTotals,
    OrderStatusCount,
    RecentOrder,
)

_CACHE_TTL_SECONDS = 5 * 60  # backend-spec.md §7: 5-min TTL
_RECENT_ORDERS_LIMIT = 10

_cache: DashboardStatsData | None = None
_cache_expires_at: float = 0.0


def _fetch_totals() -> DashboardTotals:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(dashboard_queries.TOTALS)
        row = cur.fetchone()
    return DashboardTotals(
        finished_goods=row[0],
        suppliers=row[1],
        buyers=row[2],
        orders=row[3],
        revenue=float(row[4]),
    )


def _fetch_revenue_by_category() -> list[CategoryRevenue]:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(dashboard_queries.REVENUE_BY_CATEGORY)
        rows = cur.fetchall()
    return [CategoryRevenue(category=row[0], revenue=float(row[1])) for row in rows]


def _fetch_order_status_counts() -> list[OrderStatusCount]:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(dashboard_queries.ORDER_STATUS_COUNTS)
        rows = cur.fetchall()
    return [OrderStatusCount(status=row[0], count=row[1]) for row in rows]


def _fetch_recent_orders() -> list[RecentOrder]:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(dashboard_queries.RECENT_ORDERS, {"limit": _RECENT_ORDERS_LIMIT})
        rows = cur.fetchall()
    return [
        RecentOrder(
            order_number=row[0],
            buyer_name=row[1],
            style_number=row[2],
            style_name=row[3],
            quantity=row[4],
            unit_price=float(row[5]),
            status=row[6],
            shipment_date=row[7],
        )
        for row in rows
    ]


def _fetch_dashboard_stats() -> DashboardStatsData:
    return DashboardStatsData(
        totals=_fetch_totals(),
        revenue_by_category=_fetch_revenue_by_category(),
        order_status_counts=_fetch_order_status_counts(),
        recent_orders=_fetch_recent_orders(),
    )


def get_dashboard_stats() -> DashboardStatsData:
    """Lazy singleton with a 5-minute TTL (coding-standards.md's no-module-
    side-effects rule + backend-spec.md §7)."""
    global _cache, _cache_expires_at
    now = time.monotonic()
    if _cache is None or now >= _cache_expires_at:
        _cache = _fetch_dashboard_stats()
        _cache_expires_at = now + _CACHE_TTL_SECONDS
    return _cache
