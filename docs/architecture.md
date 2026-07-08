# Architecture — WFX ERP Explorer

## Chosen Design: Modular Monolith + pgvector (Candidate B)

A single FastAPI application, internally layered (`routers → services → core → db`) —
a monolith in deployment, modular in code. Exactly three deployed services, matching
the assignment's mandated platforms.

## 1. System Diagram (components)
- **Browser** → **React SPA (Vercel)** → **FastAPI backend (Render)**
  - NL2SQL service (Vanna + guardrails) → OpenRouter LLM
  - Search service (embeddings + filters) → Supabase Postgres + pgvector
- **Offline pipeline** (local scripts, not deployed): seed CSVs → Supabase; generate
  text + image embeddings → Supabase. Runs once, keeps Render's free-tier compute idle
  of heavy ML work.

## 2. Stack & Rationale
| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind + shadcn/ui + Recharts | All named in the assignment's own reference list |
| Backend | FastAPI | Named first in spec; free `/docs` OpenAPI page doubles as API documentation deliverable |
| Database | Supabase Postgres + pgvector | Mandated DB; pgvector is an "equivalent approach" to Typesense, explicitly permitted, and the assignment itself links the pgvector guide |
| NL2SQL | Vanna AI + OpenRouter + in-memory ChromaDB | Named in spec; retrieval-based prompting keeps token cost low |
| Embeddings | fastembed (ONNX): BGE-small (text, 384d), CLIP ViT-B/32 (image/text, 512d) | No PyTorch — fits Render's 512MB free-tier RAM; embeddings precomputed offline |
| Deployment | Render (API) / Vercel (web) / Supabase (DB) | Mandated, all free tier |

**Why pgvector over Typesense:** Typesense isn't hostable on any of the three mandated
platforms, and its free cloud tier is a time-limited trial. pgvector keeps vectors next
to relational data, enabling a single SQL statement that combines semantic similarity
*and* structured filters (fabric, GSM, supplier) — exactly what Product Search needs.
This is a documented trade-off, not a shortcut.

**Why a monolith over microservices:** "Modularity" is a code-quality property
(layered packages, single responsibilities), not a deployment-topology requirement.
A monolith delivers it with zero integration risk, which matters inside a 48-hour
single-engineer window.

## 3. NL2SQL Pipeline
Question → Vanna retrieves relevant schema/DDL + few-shot examples from ChromaDB →
LLM generates SQL → **guardrail layer** (single-statement, SELECT/WITH only,
deny-list DML/DDL, auto-LIMIT 100) → execute on a **read-only DB role** → results +
LLM-generated natural-language answer, streamed via SSE in stages: `sql` → `rows` →
`answer` tokens. Defense in depth: even a guardrail bypass cannot write, because the
execution role has no write privileges at the database level.

Vanna is trained (at startup, from a version-controlled file) on: the 6 table DDLs,
~10 domain documentation strings (GSM, tech pack, currency rule, revenue rule), and
~18 golden question→SQL pairs including every example question from the assignment.

## 4. Search Architecture
- **Product Search (hybrid, Screen 3):** query text → BGE-small embedding → one SQL
  statement combining cosine similarity on `text_embedding` with structured WHERE
  filters (category, fabric, GSM, supplier, color, season, print). This hybrid query
  is the "vector embeddings for semantic search" bonus.
- **Visual Search (Screen 4, separate from Product Search):** natural language → CLIP
  text encoder → cosine similarity against precomputed CLIP image embeddings — matches
  what garments *look like*, not their metadata. A zero-cost "More like this" vector
  lookup on every product card is the "image similarity search" bonus.
- All 1,000 product embeddings are computed **offline, once**, and written to Supabase.

## 5. Escape Hatches (pre-planned degradation paths)
- If CLIP doesn't fit in Render's 512MB RAM: Visual Search falls back to BGE text
  embeddings over rich product descriptions; "More like this" still works (pure vector
  lookup, no model call).
- If Vanna accuracy is poor after ~90 minutes of tuning: swap to direct
  retrieval-augmented prompting behind the same service interface — a ~1-hour,
  isolated pivot, not a redesign.

## 6. Budget & Cost Model
OpenRouter, $5 credit, flash-class model. ~2 LLM calls per NL2SQL query
(SQL generation + answer) at ~$0.002 total → 1,000+ query headroom. All search is
local ONNX inference — $0 marginal cost. Rate limiting protects the budget from abuse
during open, unauthenticated live evaluation.

## 7. Scalability Story (for Future Improvements)
Current design is right-sized for ~1,000 rows. Growth path: pgvector HNSW handles
100K–1M rows before revisiting; the offline embedding script becomes a queue worker;
the modular monolith splits along its existing service boundaries (`nl2sql`, `search`,
`dashboard`) if independent scaling is ever needed.
