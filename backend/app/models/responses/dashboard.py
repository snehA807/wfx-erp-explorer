from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict


class DashboardTotals(BaseModel):
    """design-spec.md §4: the 5 stat cards (Total Finished Goods, Suppliers,
    Buyers, Orders, Revenue)."""

    model_config = ConfigDict(extra="forbid")

    finished_goods: int
    suppliers: int
    buyers: int
    orders: int
    revenue: float


class CategoryRevenue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: str | None
    revenue: float


class OrderStatusCount(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    count: int


class RecentOrder(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order_number: str
    buyer_name: str
    style_number: str
    style_name: str
    quantity: int
    unit_price: float
    status: str
    shipment_date: date | None


class DashboardStatsData(BaseModel):
    """backend-spec.md §3: totals, revenue-by-category, order-status
    counts, recent orders."""

    model_config = ConfigDict(extra="forbid")

    totals: DashboardTotals
    revenue_by_category: list[CategoryRevenue]
    order_status_counts: list[OrderStatusCount]
    recent_orders: list[RecentOrder]
