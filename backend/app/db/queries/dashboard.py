from __future__ import annotations

# CLAUDE.md invariant 8 / backend-spec.md §1: revenue = Σ(quantity ×
# unit_price), sales_orders.unit_price is already INR-base (schema.sql),
# excludes status='Cancelled'. Order counts and status counts are NOT
# revenue figures, so they intentionally include every status.

TOTALS = """
SELECT
    (SELECT count(*) FROM finished_goods) AS finished_goods_count,
    (SELECT count(*) FROM suppliers) AS suppliers_count,
    (SELECT count(*) FROM buyers) AS buyers_count,
    (SELECT count(*) FROM sales_orders) AS orders_count,
    (SELECT coalesce(sum(quantity * unit_price), 0)
       FROM sales_orders
      WHERE status != 'Cancelled') AS revenue
"""

REVENUE_BY_CATEGORY = """
SELECT
    fg.category AS category,
    coalesce(sum(so.quantity * so.unit_price), 0) AS revenue
FROM sales_orders so
JOIN finished_goods fg ON fg.style_number = so.style_number
WHERE so.status != 'Cancelled'
GROUP BY fg.category
ORDER BY revenue DESC
"""

ORDER_STATUS_COUNTS = """
SELECT status, count(*) AS count
FROM sales_orders
GROUP BY status
ORDER BY count DESC
"""

# order_number is a zero-padded sequential business key (SO-00001..), so a
# lexicographic DESC sort is also creation-recency order; shipment_date is
# a planned/actual ship date, not a reliable recency signal, and is
# nullable besides.
RECENT_ORDERS = """
SELECT
    so.order_number,
    b.company_name AS buyer_name,
    so.style_number,
    fg.style_name,
    so.quantity,
    so.unit_price,
    so.status,
    so.shipment_date
FROM sales_orders so
JOIN buyers b ON b.buyer_id = so.buyer_id
JOIN finished_goods fg ON fg.style_number = so.style_number
ORDER BY so.order_number DESC
LIMIT %(limit)s
"""
