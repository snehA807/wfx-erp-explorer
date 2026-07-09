-- Sanitized training DDL for NL2SQL (Vanna). Derived from db/schema.sql
-- with text_embedding/image_embedding and index definitions removed — the
-- LLM must never see or select the vector columns, and indexes are
-- retrieval noise. CHECK constraints are kept: they teach the enum
-- vocabularies (status, currency, payment_status) for free.

CREATE TABLE suppliers (
    supplier_id     TEXT PRIMARY KEY,
    company_name    TEXT NOT NULL UNIQUE,
    country         TEXT,
    contact         TEXT,
    lead_time_days  INTEGER NOT NULL CHECK (lead_time_days > 0),
    rating          NUMERIC(2,1) NOT NULL CHECK (rating BETWEEN 0 AND 5)
);

CREATE TABLE buyers (
    buyer_id        TEXT PRIMARY KEY,
    company_name    TEXT NOT NULL UNIQUE,
    country         TEXT,
    buyer_category  TEXT
);

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
    search_text      TEXT NOT NULL
);

CREATE TABLE tech_packs (
    tech_pack_id      TEXT PRIMARY KEY,
    style_number      TEXT NOT NULL UNIQUE REFERENCES finished_goods (style_number),
    fabric_details    TEXT,
    construction      TEXT,
    wash_instructions TEXT
);

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

CREATE TABLE sales_invoices (
    invoice_number  TEXT PRIMARY KEY,
    order_number    TEXT NOT NULL UNIQUE REFERENCES sales_orders (order_number),
    amount          NUMERIC(12,2) NOT NULL,
    currency        TEXT NOT NULL CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP')),
    payment_status  TEXT NOT NULL CHECK (
                         payment_status IN ('Paid', 'Pending', 'Partially Paid', 'Overdue')
                     )
);
