# Portfolio Website Content — WFX Explorer

Copy-ready content blocks for a portfolio site project page. Drop each section into your site's template as-is, or trim further for a card/tile view using the short description.

---

## Short Description (card / tile / list view — ~160 characters)

```
AI-native exploration layer over an apparel ERP — natural-language SQL querying, hybrid semantic search, and visual search, built full-stack and deployed to production.
```

## Long Description (project detail page)

```
WFX Explorer is a full-stack AI platform that lets non-technical users query a
relational apparel ERP in plain English, search its product catalog by meaning
or by appearance, and view a live operational dashboard — without writing SQL
or navigating fixed ERP screens.

At its core is a natural-language-to-SQL pipeline built on Vanna AI and an
OpenRouter-hosted LLM: a question is turned into SQL, checked against a
deterministic guardrail layer, executed against a database role with no write
privileges, and summarized in plain language — with the generated SQL, the
raw query results, and the AI's answer all streamed to the client stage by
stage, never hidden behind a single opaque response.

Product discovery runs on a hybrid search architecture: BGE-small text
embeddings and CLIP image embeddings, indexed with pgvector's HNSW index
directly alongside the relational data they describe, so a single SQL
statement can combine semantic similarity ranking with structured filters
like fabric, GSM, and price range.

The system is a modular monolith — a single FastAPI service, cleanly layered
into routers, services, and a guarded data-access layer — paired with a
React/TypeScript frontend and deployed end to end (Render, Vercel, Supabase).
Every design decision, including a real production memory constraint that
reshaped how visual search is served, is documented in the project's
architecture notes and case study.
```

## Key Features

```
- Natural-language querying with a guarded, transparent NL→SQL pipeline
- Streamed AI responses (SSE): generated SQL, results, and answer, staged live
- Hybrid semantic + structured product search over a vector-indexed catalog
- Dedicated visual/appearance search surface
- "More like this" — zero-cost vector similarity on every product
- Live operational dashboard with an explicit, documented revenue rule
- Fully typed, uniformly-enveloped REST + SSE API
- Responsive, accessible frontend with a command palette and design-token
  discipline
```

## Engineering Highlights

```
- Defense-in-depth SQL safety: a deterministic guardrail layer (statement
  shape, keyword denylist, comment-injection blocking) in front of a
  database role with zero write grants — two independent layers, neither
  trusting the other to be sufficient alone.
- Single-statement hybrid search: vector similarity and relational filters
  combined in one indexed SQL query, not fused client-side across two
  separate search systems.
- A production memory constraint (512MB container, multi-model inference
  stack) found and fixed via direct local reproduction rather than
  discovered live — shipped as a same-contract fallback with zero frontend
  or API changes.
- A five-stage SSE pipeline that surfaces AI reasoning progressively instead
  of returning one response once everything is ready.
- Strict typed contracts end to end: Pydantic v2 models with extra="forbid"
  on the backend, a uniform success/error envelope on every endpoint, a
  typed API client on the frontend.
- 65 automated backend tests, with guardrail changes held to a
  same-commit-test requirement as a project rule.
```

## Technologies

```
React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Recharts
FastAPI · Python 3.11 · Pydantic v2 · psycopg3 · structlog · slowapi
PostgreSQL · pgvector (HNSW) · Vanna AI · OpenRouter · fastembed (BGE, CLIP)
Docker · Render · Vercel · Supabase
```

## Challenges

```
Getting an LLM to reliably generate safe, on-schema SQL required more than
prompt engineering — it required a guardrail layer the LLM's output couldn't
talk its way around, and a database role that made the guardrail's
correctness a defense-in-depth measure rather than the only line standing
between a bad generation and a write.

The hardest infrastructure problem was capacity, not code: running an LLM
retrieval store and two embedding model families inside a 512MB serving
container. Rather than discover the failure in production, it was reproduced
locally under the same memory ceiling, diagnosed precisely (the image
embedding model was the one that didn't fit), and resolved with a fallback
that preserved the feature's contract completely — the frontend and API
shape never changed, only which embedding index the query serves from.
```

## Outcome

```
A production-deployed, full-stack AI platform — frontend, backend, database,
and two LLM-integration surfaces — built and shipped solo, with every
non-obvious design decision (why pgvector over a dedicated vector store, why
a monolith, why visual search serves off a fallback index today) documented
rather than left implicit. Live at [demo URL]; source at [repo URL].
```

---

### Usage notes for the portfolio site
- If your site supports it, link "documented" and "case study" language above directly to `docs/portfolio/CASE_STUDY.md` and `ARCHITECTURE.md` in the repo — recruiters and engineers both respond well to being able to click through to real depth.
- The **Long Description** is ~180 words — sized for a project detail page with room for screenshots alongside it. Trim to the first two paragraphs if your template wants something shorter.
- Replace `[demo URL]` / `[repo URL]` with the actual production links before publishing.
