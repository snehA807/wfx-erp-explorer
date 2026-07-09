# NL2SQL Domain Documentation

Each numbered item below is trained into Vanna as one independent,
retrievable documentation string (parsed by `services/nl2sql.py`, one
`train(documentation=...)` call per item). Keep each item self-contained —
it may be retrieved without any of the others.

1. Revenue is always computed as SUM(quantity * unit_price) from
   sales_orders, in INR, excluding rows where status = 'Cancelled'. Never
   use sales_invoices.amount for a revenue total.
2. sales_invoices.amount is in mixed currencies (INR, USD, EUR, GBP per the
   `currency` column) — never sum or compare amount across rows without
   filtering to a single currency first. All revenue calculations use
   sales_orders.unit_price, which is already INR, not sales_invoices.amount.
3. "Recent" or "most recent" orders means the highest sales_orders.order_number
   (a zero-padded sequential key like SO-01500), not the latest shipment_date.
   shipment_date is a planned/actual ship date and does not reflect order
   creation order.
4. Match text fields (style_name, category, fabric, color, print, season,
   brand, company_name) case-insensitively using ILIKE with '%term%', since
   user questions rarely match the exact stored casing.
5. GSM (finished_goods.gsm) is grams per square meter, a measure of fabric
   weight. In this dataset it ranges from 100 to 480.
6. Season codes are SS or AW followed by a 2-digit year, e.g. SS25, AW26.
   SS = Spring/Summer, AW = Autumn/Winter.
7. tech_packs is a strict one-to-one relationship with finished_goods via
   style_number — every style has at most one tech pack.
8. sales_invoices is a one-to-zero-or-one relationship with sales_orders via
   order_number — not every order has an invoice yet. To find orders
   without an invoice, or to count invoice presence/absence correctly, use
   a LEFT JOIN from sales_orders to sales_invoices, never an INNER JOIN.
9. Supplier and buyer names are stored in suppliers.company_name and
   buyers.company_name respectively, not on finished_goods or sales_orders
   directly — join through finished_goods.supplier_id or
   sales_orders.buyer_id to reach a name.
10. finished_goods.print only has two values: 'Solid' and 'Printed'. There
    is no finer-grained pattern column (e.g. no literal 'Striped' or
    'Floral' value) — treat any patterned/non-solid print description in a
    question (striped, floral, checked, etc.) as print = 'Printed'.
11. Always alias aggregate expressions (SUM, AVG, COUNT, etc.) with AS, and
    prefer explicit column lists over SELECT * so result columns are
    self-explanatory.
