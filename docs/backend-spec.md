# Backend Spec — WFX ERP Explorer

## 1. Database Schema (Postgres + pgvector)
- **suppliers**(supplier_id PK, company_name UNIQUE, country, contact,
  lead_time_days CHECK>0, rating CHECK 0–5)
- **buyers**(buyer_id PK, company_name UNIQUE, country, buyer_category)
- **finished_goods**(style_number PK, style_name, category, fabric,
  gsm CHECK 50–1000, color, print, season, brand, supplier_id FK, cost, selling_price,
  image_url, search_text, text_embedding vector(384), image_embedding vector(512))
- **sales_orders**(order_number PK, buyer_id FK, style_number FK, quantity CHECK>0,
  unit_price [INR base], shipment_date, status CHECK IN
  (Confirmed, In Production, Shipped, Delivered, Cancelled))
- **sales_invoices**(invoice_number PK, order_number FK UNIQUE, amount, currency
  CHECK IN (INR,USD,EUR,GBP), payment_status CHECK IN
  (Paid, Pending, Partially Paid, Overdue))
- **tech_packs**(tech_pack_id PK, style_number FK UNIQUE [true 1:1], fabric_details,
  construction, wash_instructions)

Indexes: B-tree on every FK and every filterable column (category, fabric, season,
color, print, gsm, selling_price, status, payment_status); HNSW (cosine) on both
vector columns; composite index on sales_orders(buyer_id, status).

CHECK constraints preferred over Postgres ENUMs — same integrity guarantee, easier to
evolve, self-documenting directly in schema.sql.

## 2. Entity Relationships
suppliers 1—N finished_goods 1—1 tech_packs; finished_goods 1—N sales_orders N—1 buyers;
sales_orders 1—0..1 sales_invoices. Seed order: suppliers, buyers → finished_goods
(resolve supplier name→FK) → tech_packs → sales_orders (resolve buyer name→FK) →
sales_invoices. Seed script is idempotent (upsert on PK) and asserts row counts +
zero-orphan invariants on every run.

## 3. API Design
Base path `/api/v1`. Every response uses one envelope:
- success: `{"data": ..., "meta": {...}}`
- error: `{"error": {"code", "message", "details"}}`

| Method & Path | Purpose |
|---|---|
| GET /health | liveness + keep-warm, checks DB connectivity |
| GET /dashboard/stats | totals, revenue-by-category, order-status counts, recent orders |
| POST /query | NL2SQL, **SSE**: status → sql → rows → answer(tokens) → done/error |
| POST /query/sql | SQL generation only |
| GET /products | paginated list: page, page_size≤48, sort_by, order, + filters |
| GET /products/{style_number} | detail: product + tech pack + supplier, one joined payload |
| GET /products/{style_number}/similar | vector lookup, no model call |
| POST /search/products | hybrid semantic + structured filters |
| POST /search/visual | CLIP text→image search |
| GET /filters/options | cached facet values + counts |

## 4. Authentication & Authorization
No end-user auth (open evaluation tool, by design decision). Service-to-service only:
backend↔Supabase via a pooled connection string using the **read-only role**
(`app_readonly`: SELECT-only, `default_transaction_read_only=on`,
`statement_timeout=10s`); backend↔OpenRouter via a bearer key in env, touched only by
the LLM client module. A separate owner-role connection string exists for local
seed/embedding scripts only — never present in Render's environment.

Authorization layers: (1) DB role is SELECT-only — guardrail bypass still can't write;
(2) app-level guardrails (`core/guardrails.py`) — single statement, SELECT/WITH only,
deny-list DML/DDL/comment-smuggling, auto-LIMIT 100; (3) perimeter — CORS allow-list of
the Vercel domain only, rate limiting (10/min/IP on `/query*`, 30/min/IP on search).

## 5. Folder Structure
```
backend/app/
  main.py
  core/       config.py, errors.py, guardrails.py, rate_limit.py
  db/         session.py, queries/
  models/     requests/, responses/, domain.py
  services/   nl2sql.py, llm.py, embeddings.py, search.py, dashboard.py
  routers/    query.py, products.py, search.py, dashboard.py, meta.py
  vanna_training/  ddl.sql, docs.md, golden_queries.yaml
backend/tests/
scripts/      seed_db.py, generate_embeddings.py, train_check.py
db/schema.sql
```
Rule: routers are thin (parse → service → envelope); services never import FastAPI;
no SQL or LLM calls outside `services/`.

## 6. Environment Variables
DATABASE_URL (read-only role, Render), OPENROUTER_API_KEY (Render, never committed),
OPENROUTER_MODEL, LLM_MAX_TOKENS_SQL/_ANSWER, CORS_ORIGINS, RATE_LIMIT_QUERY, ENV,
DATABASE_URL_OWNER (local only), VITE_API_BASE_URL (Vercel only).
`.env.example` is committed with placeholders; `pydantic-settings` validates at boot —
a missing key fails loudly at deploy, not silently at first request.

## 7. Caching Strategy
No Redis — Render free tier runs one instance, so in-process caches are correct, not
just convenient. Dashboard stats: 5-min TTL. Filter options/facet counts: 1-hour TTL.
Embedding models: lazy singletons, process lifetime. Query-text embeddings: small LRU.
NL2SQL answers: deliberately uncached (correctness/transparency over cost).

## 8. Error Handling
`AppError` hierarchy in `core/errors.py`: ValidationError(422), SQLGuardrailError(400,
code SQL_BLOCKED), SQLExecutionError(400, carries the failed SQL), LLMError(502),
NotFoundError(404), RateLimitedError(429). One global handler serializes any AppError
into the envelope; unexpected exceptions → generic 500 with internals logged, never
returned. SSE failures emit a structured `error` event and close cleanly.

## 9. Validation Strategy
Three tiers: (1) Pydantic at the edge — length/range/enum constraints,
`extra="forbid"`; (2) semantic — filter values checked against cached facet sets,
NL2SQL guardrails as validation-of-generated-code; (3) DB constraints as the final
backstop, plus seed-time assertions re-checking the CSV profiling invariants.

## 10. Logging Strategy
Structured JSON to stdout, `request_id` bound to every log line via middleware. Log:
request line, NL2SQL events (question, generated SQL, guardrail verdict, execution ms,
row count, **prompt/completion tokens + computed cost**), slow-query warnings >2s.
Never log secrets or full payloads. `token_cost` events are the running $5-budget check.

## 11. Deployment Strategy
Render: Docker deploy (python-slim, non-root, single uvicorn worker — 512MB shared
budget), health check `/health`, auto-deploy on push to `main`. Vercel: auto-detect
Vite, SPA rewrite rule so deep links survive refresh. Supabase: schema.sql applied via
SQL editor, pgvector enabled, both roles created, seeded from local scripts against the
owner URL. Deploy backend and frontend a full day before the deadline so the last 24h
only pushes increments to an already-working pipeline.

## 12. Testing Strategy (time-boxed, ~3h)
1. Guardrails unit tests (~20 cases) — the non-negotiable file.
2. Golden-query evaluation harness (`train_check.py`) — runs ~18 golden questions,
   compares generated vs. reference SQL result sets, prints a pass-rate table.
3. API contract tests — pagination, filter validation, 422/404 envelope shape.
4. Seed integrity assertions (built into the seed script itself).
Explicitly out of scope: frontend unit tests, load tests, full E2E automation —
documented as a stated Future Improvement.
