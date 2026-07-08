# CLAUDE.md — WFX ERP Explorer

AI-native exploration layer over an apparel ERP: NL→SQL querying, hybrid semantic search, visual (CLIP) search, dashboard. Single engineer, hard deadline. Ship > perfect.

## Stack (fixed — do not propose alternatives)
- Backend: FastAPI (Python 3.11), psycopg3, Vanna AI + OpenRouter, fastembed (BGE-small 384d, CLIP ViT-B/32 512d), slowapi, structlog
- DB: Supabase Postgres + pgvector (HNSW, cosine). App connects as read-only role `app_readonly`.
- Frontend: Vite + React 18 + TS + Tailwind + shadcn/ui + Recharts. Deploy: Render (API) / Vercel (web).

## Layout
```
backend/app/{core,db,models,services,routers,vanna_training}
frontend/src/{pages,components,lib}
scripts/          # local-only: seed_db.py, generate_embeddings.py, train_check.py
db/schema.sql     # source of truth for schema
docs/             # specs — READ THESE, don't ask me to re-explain
data/             # gitignored CSVs, never commit
```

## Hard invariants (never violate)
1. Response envelope: success `{"data":..., "meta":{...}}`; error `{"error":{"code","message","details"}}`. Every path, no exceptions.
2. Routers are thin: parse → service call → envelope. No SQL or LLM calls in routers. Services never import FastAPI.
3. All runtime SQL executes via the read-only pool. Generated SQL must pass `core/guardrails.py` first.
4. Secrets only via env (`core/config.py`, pydantic-settings). Never in code, logs, tests, or fixtures.
5. Every request/response is a Pydantic model, `extra="forbid"`.
6. Guardrail changes require matching tests in `tests/test_guardrails.py` in the same commit.
7. Frontend styling: Tailwind tokens from config only — no hex literals, no inline px values off the 4px scale.
8. Business rule: revenue = Σ(quantity × unit_price) in INR, excluding status='Cancelled'.
9. Never mention the hiring assignment anywhere in repo content.

## Commands
- API dev: `uvicorn app.main:app --reload` (from backend/)
- Tests: `pytest -q` (from backend/)
- Web dev: `npm run dev` (from frontend/)
- Seed: `python scripts/seed_db.py` (needs DATABASE_URL_OWNER)

## Working style
- Implement exactly the current milestone (see docs/playbook). No drive-by refactors, no unrequested features.
- Prefer editing existing files over creating new ones. Ask before adding dependencies.
- When a spec exists in docs/, follow it; flag conflicts instead of silently deviating.
