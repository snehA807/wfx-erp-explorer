-- WFX ERP Explorer — schema.sql
-- Source of truth for the database structure (CLAUDE.md). Applied once via
-- the Supabase SQL editor (backend-spec.md §11); db/roles.sql applies after.
--
-- NOT NULL policy (backend-spec.md §1 names PK/FK/UNIQUE/CHECK but not
-- nullability, so this is the one explicit rule applied uniformly): a column
-- is NOT NULL only if (a) it is a primary key, (b) it is a foreign key for a
-- relationship §2 marks as mandatory (i.e. not the one "0..1" case), (c) it
-- is a UNIQUE column the seed script resolves names against (company_name),
-- (d) it carries an explicit CHECK constraint (a CHECK never rejects NULL,
-- so pairing it with NOT NULL is what makes the constraint mean anything),
-- or (e) a named spec elsewhere makes the value structurally required
-- (revenue rule, mandatory product images, the hybrid-search input text).
-- Everything else is left nullable rather than assumed.
--
-- ID columns are TEXT: they are natural/business identifiers from the ERP
-- CSVs (backend-spec.md §2's "resolve name→FK" seed step only makes sense
-- against real-world codes, not assumed surrogate integers), and TEXT
-- carries no length-truncation risk.

CREATE EXTENSION IF NOT EXISTS vector;

-- ── suppliers ────────────────────────────────────────────────────────────
-- Root of the supplier → finished_goods relationship (§2); seeded first so
-- finished_goods.supplier_id can resolve against company_name.
CREATE TABLE suppliers (
    supplier_id     TEXT PRIMARY KEY,
    company_name    TEXT NOT NULL UNIQUE,
    country         TEXT,
    contact         TEXT,
    lead_time_days  INTEGER NOT NULL CHECK (lead_time_days > 0),
    rating          NUMERIC(2,1) NOT NULL CHECK (rating BETWEEN 0 AND 5)
);

-- ── buyers ───────────────────────────────────────────────────────────────
-- Independent of suppliers; referenced by sales_orders. Seeded alongside
-- suppliers since neither depends on the other (§2).
CREATE TABLE buyers (
    buyer_id        TEXT PRIMARY KEY,
    company_name    TEXT NOT NULL UNIQUE,
    country         TEXT,
    buyer_category  TEXT
);

-- ── finished_goods ───────────────────────────────────────────────────────
-- The product catalog; backs Products/Search/Visual (design-spec.md §4).
-- text_embedding/image_embedding are nullable by design: populated by the
-- offline M9 job, not at seed time.
CREATE TABLE finished_goods (
    style_number     TEXT PRIMARY KEY,
    style_name       TEXT NOT NULL,
    category         TEXT,
    fabric           TEXT NOT NULL,
    gsm              INTEGER NOT NULL CHECK (gsm BETWEEN 50 AND 1000),
    color            TEXT,
    print            TEXT,
    season           TEXT,
    brand            TEXT,
    supplier_id      TEXT NOT NULL REFERENCES suppliers (supplier_id),
    cost             NUMERIC(12,2),
    selling_price    NUMERIC(12,2) NOT NULL,
    image_url        TEXT NOT NULL,
    search_text      TEXT NOT NULL,
    text_embedding   vector(384),
    image_embedding  vector(512)
);

-- ── tech_packs ───────────────────────────────────────────────────────────
-- True 1:1 with finished_goods (§2): NOT NULL + UNIQUE on style_number means
-- every tech pack belongs to exactly one style, and a style has at most one.
CREATE TABLE tech_packs (
    tech_pack_id      TEXT PRIMARY KEY,
    style_number      TEXT NOT NULL UNIQUE REFERENCES finished_goods (style_number),
    fabric_details    TEXT,
    construction      TEXT,
    wash_instructions TEXT
);

-- ── sales_orders ─────────────────────────────────────────────────────────
-- buyer_id/style_number are mandatory FKs (§2: "finished_goods 1—N
-- sales_orders N—1 buyers" — neither side is marked 0..1). unit_price is
-- NOT NULL because it is a direct operand of the locked revenue rule
-- (CLAUDE.md: revenue = Σ(quantity × unit_price) in INR); a NULL here would
-- silently corrupt that total. shipment_date is left nullable — orders in
-- Confirmed/In Production/Cancelled status plausibly have no shipment date
-- yet.
CREATE TABLE sales_orders (
    order_number   TEXT PRIMARY KEY,
    buyer_id       TEXT NOT NULL REFERENCES buyers (buyer_id),
    style_number   TEXT NOT NULL REFERENCES finished_goods (style_number),
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    unit_price     NUMERIC(12,2) NOT NULL,
    shipment_date  DATE,
    status         TEXT NOT NULL CHECK (
                       status IN ('Confirmed', 'In Production', 'Shipped', 'Delivered', 'Cancelled')
                   )
);

-- ── sales_invoices ───────────────────────────────────────────────────────
-- order_number UNIQUE + NOT NULL encodes the "1—0..1" relationship (§2) from
-- the sales_orders side: optionality is expressed by a missing invoice row,
-- not a nullable column. amount is NOT NULL because an invoice without one
-- is not a real invoice (amount is FX-converted, per requirements.md, and is
-- intentionally not used in the INR revenue rule).
CREATE TABLE sales_invoices (
    invoice_number  TEXT PRIMARY KEY,
    order_number    TEXT NOT NULL UNIQUE REFERENCES sales_orders (order_number),
    amount          NUMERIC(12,2) NOT NULL,
    currency        TEXT NOT NULL CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP')),
    payment_status  TEXT NOT NULL CHECK (
                         payment_status IN ('Paid', 'Pending', 'Partially Paid', 'Overdue')
                     )
);

-- ── Indexes ──────────────────────────────────────────────────────────────
-- B-tree on every FK (backend-spec.md §1). sales_invoices.order_number and
-- tech_packs.style_number are skipped here deliberately, not omitted by
-- oversight: both are declared UNIQUE above, and Postgres creates a
-- supporting B-tree index for every UNIQUE constraint automatically — a
-- second explicit index on the same column would be a redundant duplicate.
CREATE INDEX idx_finished_goods_supplier_id ON finished_goods (supplier_id);
CREATE INDEX idx_sales_orders_buyer_id ON sales_orders (buyer_id);
CREATE INDEX idx_sales_orders_style_number ON sales_orders (style_number);

-- B-tree on every filterable column (backend-spec.md §1).
CREATE INDEX idx_finished_goods_category ON finished_goods (category);
CREATE INDEX idx_finished_goods_fabric ON finished_goods (fabric);
CREATE INDEX idx_finished_goods_season ON finished_goods (season);
CREATE INDEX idx_finished_goods_color ON finished_goods (color);
CREATE INDEX idx_finished_goods_print ON finished_goods (print);
CREATE INDEX idx_finished_goods_gsm ON finished_goods (gsm);
CREATE INDEX idx_finished_goods_selling_price ON finished_goods (selling_price);
CREATE INDEX idx_sales_orders_status ON sales_orders (status);
CREATE INDEX idx_sales_invoices_payment_status ON sales_invoices (payment_status);

-- Composite index for the buyer order-history access pattern (backend-spec.md
-- §1). Kept alongside idx_sales_orders_buyer_id per the spec's explicit
-- separate bullet, even though this composite also serves buyer_id-only
-- lookups as a leftmost-prefix match.
CREATE INDEX idx_sales_orders_buyer_status ON sales_orders (buyer_id, status);

-- HNSW (cosine) on both vector columns (backend-spec.md §1), backing
-- Product Search (text_embedding) and Visual Search (image_embedding) —
-- architecture.md §4. NULL embeddings (pre-M9) are simply excluded until
-- backfilled.
CREATE INDEX idx_finished_goods_text_embedding
    ON finished_goods USING hnsw (text_embedding vector_cosine_ops);
CREATE INDEX idx_finished_goods_image_embedding
    ON finished_goods USING hnsw (image_embedding vector_cosine_ops);
