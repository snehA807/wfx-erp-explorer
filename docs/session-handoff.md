# Session Handoff

**Deadline:** Thu 10 Jul 2026, 22:00 IST — final day.

## Completed milestones
- **M0** — Repo scaffold: `backend/`, `frontend/`, `scripts/` dirs, `.env.example`, `docs/decisions.md`, `docs/backlog.md`.
- **M1** — `db/schema.sql` (6 tables, CHECK constraints, HNSW indexes) + `db/roles.sql` (`app_readonly`, SELECT-only). Verified via `pglast` syntax parsing.
- **M2** — `scripts/seed_db.py`: idempotent CSV loader, resolves supplier/buyer names to FKs, generates `search_text`. **Run successfully against the real Supabase DB**: 12/12/1000/1000/1500/1206 rows, zero orphans, idempotent (two runs verified), embeddings stay NULL.
- **M3** — FastAPI skeleton: `core/{config,errors,rate_limit}.py`, `db/session.py`, response-envelope models, `/api/v1/health`. Verified via a real `uvicorn` boot + curl, not just TestClient.

## Current state
Backend runs locally (`backend/.venv`, `uvicorn app.main:app --reload` from `backend/`). `backend/.env` has a **real** Supabase `DATABASE_URL` — currently the `postgres` superuser on the direct host, not the intended `app_readonly` pooled connection (see Open issues).

## Key architectural decisions (full log: `docs/decisions.md`)
- All ID columns are `TEXT` (natural business keys from the CSVs), not surrogate integers.
- `DATABASE_URL_OWNER` uses Supabase's built-in `postgres` role — no custom owner role was created.
- NOT NULL policy: PK / mandatory FK / UNIQUE resolution keys / CHECK-constrained columns / a few spec-required columns (`image_url`, `search_text`, `unit_price`) — everything else nullable.
- `db/session.py` uses one lazy-singleton connection, not an app-level pool — assumes Supabase's own pooler handles pooling.
- `core/errors.py` has one addition beyond backend-spec.md §8's named list: `ServiceUnavailableError` (503), for `/health`.

## Open issues
1. **DB connectivity blocker:** `backend/.env`'s `DATABASE_URL` points at `db.<project>.supabase.co:5432`, which is **IPv6-only** (no A record) — unreachable from this sandbox (no outbound IPv6 route). SQL verification failed for this reason, not a code bug. Fix: switch to Supabase's **pooler** connection string (Project Settings → Database → Connection Pooling) — matches backend-spec.md §4's "pooled connection string" and likely matters for Render's IPv4-only egress at M11 too.
2. Same `DATABASE_URL` uses the `postgres` superuser, not `app_readonly` — breaks the defense-in-depth design. `app_readonly` also has no password set yet; `db/roles.sql` deliberately left it out — run `ALTER ROLE app_readonly WITH PASSWORD '...'` once, uncommitted, in the Supabase SQL editor.
3. Docker Compose: requirements.md marks it "definitely implement," playbook.md's cut-order marks it disposable — contradiction still unresolved (`docs/backlog.md`).
4. `finished_goods.search_text` (seed-time concatenation) isn't a locked formula — safe to change before M9 embeds it.

## Constraints that must not change
- Response envelope on every path: success `{"data","meta"}`, error `{"error":{"code","message","details"}}`.
- Routers thin (parse → service → envelope); no SQL/LLM in routers; services never import FastAPI.
- All Pydantic models `extra="forbid"`. Secrets only via env, never committed.
- Revenue = Σ(quantity × unit_price), INR, excludes `status='Cancelled'`.
- Stack is fixed (CLAUDE.md) — ask before adding dependencies.
- One milestone at a time; no unrequested scope.

## Next milestone
**M4 — Products/detail/filters endpoints**: `GET /products`, `GET /products/{style_number}`, `GET /products/{style_number}/similar`, `GET /filters/options`.

## Session Rules

- Preserve architecture.
- Prefer modifying existing files over introducing new abstractions.
- Read only the documents required for the current milestone.
- Stop after completing one milestone.
- Update project-state.md before finishing.