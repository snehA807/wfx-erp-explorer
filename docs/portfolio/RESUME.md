# Resume Project Section — WFX Explorer

Three lengths of the same project, tuned for different resume formats. All bullets are ATS-friendly (plain text, keyword-forward, no tables/icons) and use the format `<action verb> <what> <how> <measurable/technical impact>`.

---

## Concise (1 line — for a compact resume or a project list row)

```
WFX Explorer — AI-native ERP exploration platform: NL-to-SQL querying, hybrid vector search, and a dashboard, built full-stack (FastAPI, React, Postgres/pgvector) and deployed to production.
```

---

## Medium (3 bullets — standard resume "Projects" section)

```
WFX Explorer | Full-Stack AI Platform | React, TypeScript, FastAPI, PostgreSQL, pgvector, OpenRouter LLM

- Built a natural-language-to-SQL pipeline (Vanna AI + OpenRouter) with a two-layer
  security model — regex/structure-based SQL guardrails plus a database role with
  zero write privileges — that streams generated SQL, query results, and an
  AI-written answer to the client over Server-Sent Events.
- Designed and implemented hybrid semantic search combining vector similarity
  (BGE-small text embeddings, pgvector HNSW indexes) with structured relational
  filters in single SQL statements, plus a separate CLIP-based visual/appearance
  search pipeline over 1,000+ product images.
- Shipped a typed, layered FastAPI backend (routers → services → guardrails → DB)
  and a React/TypeScript frontend with 5 screens, then deployed both to production
  (Render + Vercel) with CORS, per-route rate limiting, and structured logging.
```

---

## Premium — FAANG-style (for a resume targeting Microsoft / Amazon / Atlassian / Adobe / Salesforce / Google)

```
WFX Explorer | Full-Stack AI Platform (Personal Project)
React 18 · TypeScript · FastAPI · PostgreSQL/pgvector · OpenRouter LLM · Docker

- Architected and shipped an end-to-end AI exploration platform over a 6-table
  relational schema (~4,700 rows), enabling natural-language querying, semantic
  and visual product search, and a live analytics dashboard for non-technical users.

- Designed a defense-in-depth natural-language-to-SQL pipeline: LLM-generated SQL
  passes through a deterministic guardrail layer (single-statement enforcement,
  keyword denylist, comment-injection blocking, auto row-limiting) before executing
  against a database role with SELECT-only grants and a hard statement timeout —
  ensuring a guardrail bypass alone can never mutate data.

- Built a hybrid retrieval system unifying vector similarity search (384d text /
  512d image embeddings, pgvector HNSW cosine indexes) with structured relational
  filtering in single, indexed SQL statements — avoiding the latency and
  consistency cost of fusing two separate search backends client-side.

- Engineered a 5-stage streaming pipeline (SSE) that surfaces AI reasoning
  progressively — generated SQL, query results, and a token-by-token natural-
  language answer — instead of a single opaque response, improving perceived
  latency and end-user trust in AI-generated output.

- Identified and resolved a production memory constraint: profiled a multi-model
  inference stack (LLM retrieval store + two embedding model families) against a
  512MB container ceiling, diagnosed an OOM in the image-embedding model via a
  memory-capped local reproduction, and shipped a same-contract fallback that kept
  the feature live without a frontend or API change.

- Delivered a fully typed contract across the stack: Pydantic v2 models with strict
  validation (`extra="forbid"`) on the backend, a uniform success/error response
  envelope on every endpoint, and a typed API client on the frontend — eliminating
  an entire class of shape-mismatch bugs between client and server.

- Deployed a production Docker image with build-time model-cache baking to
  eliminate cold-start network dependency, single-worker process design matched to
  in-process state (rate limiter, connection pool, trained retrieval index), and a
  CI-free but test-gated guardrail suite (65 automated tests) enforced as a
  same-commit requirement for any security-relevant change.
```

---

### Notes on usage
- The **Concise** version is meant for a "Projects" line inside a dense one-page resume, or a portfolio index.
- The **Medium** version fits a standard 3-bullet resume project entry — pick the 3 bullets most relevant to the role (swap the search bullet for a more backend- or frontend-weighted one if needed).
- The **Premium** version is intentionally longer than a typical resume bullet block — treat it as a bullet bank: pull 3–5 bullets matched to the specific job description (e.g., emphasize the guardrail/security bullet for a backend-security-adjacent role, the streaming/UX bullet for a product-engineering role).
