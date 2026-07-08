# Requirements — WFX ERP Explorer

## Executive Summary
An AI-native exploration layer over an apparel ERP. Business users ask natural-language
questions instead of writing SQL or clicking through ERP screens. Core capabilities:
NL-to-SQL querying, hybrid semantic product search, visual (image) search, and a
summary dashboard. This is explicitly **not a chatbot** — it is a full-stack platform:
database + AI integrations + search + NL2SQL + modern frontend + backend APIs + deployment.

Users: merchandisers, sourcing managers, sales/finance staff at a global apparel
sourcing company — non-technical, need fast answers without SQL.

## Functional Requirements

### Mandatory
- Supabase Postgres with 6 tables: Finished Goods, Suppliers, Buyers, Sales Orders,
  Tech Packs, Sales Invoices — populated from provided CSVs (1,000 finished goods rows).
- NL2SQL: open-source framework (Vanna AI), handling aggregation/filtering/joins/ranking
  questions. Must display: user question, generated SQL, SQL execution result, AI answer.
- Search: text search over garments (e.g. "blue floral dress"); Finished Goods must
  have images.
- 5 frontend screens (see design-spec.md): Dashboard, Natural Language Query, Product
  Search, Image Search, Finished Goods Explorer.
- Clean REST APIs for: NL query, SQL generation, product search, image search,
  dashboard statistics.
- Deployment: Backend → Render, Frontend → Vercel, DB → Supabase (all free tier).
- Deliverables: public GitHub repo (clean history, setup instructions), working
  deployment (frontend + backend URLs), technical documentation (min. 3 pages:
  architecture, deployment, API docs, screenshots, future improvements), 1-minute
  demo video, submission email.

### Recommended
- Streaming responses for NL query flow.
- Schema extensions where they improve the solution.

### Optional
- Image upload → visually similar garments.
- Dashboard charts.

### Stretch / Bonus (prioritized per decision log)
Definitely implement: vector/semantic search, production-quality UI, streaming
responses, Docker Compose. Only if time remains: dynamic charts from SQL results.
Explicitly skipped: CI/CD, webhooks/background jobs, confidence scores.

## Non-Functional Requirements
- **Performance:** dynamic/low-latency search updates; paginate, never dump 1,000 rows.
- **Security:** NL2SQL must be read-only (no DROP/DELETE/UPDATE); no secrets in the
  public repo; correct CORS between Vercel and Render.
- **Maintainability:** modular architecture, not one large script — explicitly graded.
- **Responsiveness:** works across desktop and mobile — explicitly graded.
- **Developer experience:** easy setup — explicitly graded; `.env.example`, seed scripts.
- **Documentation:** clarity, completeness, design decisions, architecture diagrams —
  its own graded category.

## Key Data Findings (from provided sample CSVs)
- 1,000 finished goods / 12 suppliers / 12 buyers / 1,500 sales orders / 1,206 invoices
  / 1,000 tech packs (1:1 with finished goods). Zero referential integrity issues.
- `sales_orders.unit_price` is the INR base price; `sales_invoices.amount` is the same
  value FX-converted into the buyer's currency (verified by cross-check). **Decision:**
  compute Total Revenue in INR directly from sales_orders, excluding Cancelled orders.
  Document this as a data-driven design decision.
- Only 800 unique image URLs across 1,000 products (some products share images) — note
  this in docs so it doesn't read as a bug.
- Images hosted on raw.githubusercontent.com (clothing-dataset repo) — no re-hosting needed.

## Decisions Log (locked)
1. Deadline: Thu 10 Jul, 10:00 PM IST.
2. Revenue = Σ(quantity × unit_price), INR, excluding Cancelled orders.
3. Free tiers only, everywhere.
4. pgvector accepted as the "equivalent approach" to Typesense.
5. Product Search and Image Search are **separate screens**.
6. NL2SQL hard-blocks all write operations (read-only).
7. Vanna + OpenRouter as the LLM; local/in-memory vector store acceptable.
8. CSVs excluded from the public repo; README does not describe the hiring assignment.
9. No authentication — app is fully open for evaluation.
10. Live deployment may be evaluated post-submission — keep it funded and warm.
