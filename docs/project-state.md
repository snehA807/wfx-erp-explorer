# Project State

Live snapshot of implementation progress against `docs/playbook.md`. Updated
at the end of every milestone (definition-of-done.md item 4: "committed per
convention"). Distinct from `docs/decisions.md` (spec deviations) and
`docs/backlog.md` (deferred scope) — this file only answers "what stage is
the build at."

**Last updated:** 2026-07-10
**Current milestone:** M4 — Products/detail/filters endpoints
**Status:** ✅ Complete
**Next milestone:** M5 — Dashboard stats

## Milestone status

| # | Milestone | Phase | Status |
|---|---|---|---|
| M0 | Repo scaffold & CLAUDE.md | 0 — Foundations | ✅ Complete |
| M1 | DB schema + roles | 0 — Foundations | ✅ Complete |
| M2 | Seed script + integrity gates | 0 — Foundations | ✅ Complete |
| M3 | FastAPI skeleton | 1 — Backend core | ✅ Complete |
| M4 | Products/detail/filters endpoints | 1 — Backend core | ✅ Complete |
| M5 | Dashboard stats | 1 — Backend core | ⬜ Not started |
| M6 | SQL guardrails + tests | 1 — Backend core | ⬜ Not started |
| M7 | Vanna + training package | 1 — Backend core 🔴 | ⬜ Not started |
| M8 | /query SSE pipeline | 1 — Backend core | ⬜ Not started |
| M9 | Offline embeddings job | 1 — Backend core | ⬜ Not started |
| M10 | Search endpoints | 1 — Backend core | ⬜ Not started |
| M11 | Backend to production | 2 — Deploy early 🔴 | ⬜ Not started |
| M12 | Frontend foundation | 3 — Frontend | ⬜ Not started |
| M13 | Dashboard + Products screens | 3 — Frontend | ⬜ Not started |
| M14 | Ask AI screen | 3 — Frontend | ⬜ Not started |
| M15 | Search, Visual, Detail drawer | 3 — Frontend | ⬜ Not started |
| M16 | Polish pass | 3 — Frontend | ⬜ Not started |
| M17 | Frontend to production | 3 — Frontend | ⬜ Not started |
| M18 | Docker Compose + documentation | 4 — Ship | ⬜ Not started |
| M19 | Final evaluation + hardening | 4 — Ship | ⬜ Not started |
| M20 | Video + submission | 4 — Ship | ⬜ Not started |

🔴 = red-flagged risk milestone (playbook.md).

## Open items carried into M5

- `docs/backlog.md`: Docker Compose scope conflict (requirements.md vs.
  playbook.md) — still unresolved.
- `finished_goods.search_text` is generated at seed time by
  `scripts/seed_db.py::build_search_text()` (concatenates style_name,
  category, fabric, color, print, season, brand) since no source CSV column
  exists for it. Not a locked decision — safe to change before M9 embeds it,
  since re-running the seed script overwrites the column via upsert.
- ~~`scripts/requirements.txt` vs. a shared manifest~~ — resolved during M3:
  kept separate on purpose. `backend/requirements.txt` now exists (full API
  stack); merging would force anyone running just the seed script to install
  FastAPI/uvicorn/slowapi/structlog for no reason.
- `core/errors.py` gained a `ServiceUnavailableError` (503) not in
  backend-spec.md §8's named list — needed for `/health` to honestly report
  a DB outage instead of being forced into one of the six listed error
  types. Flagging since it's an addition beyond the literal spec, not because
  it seems likely to need reverting.
- All Pydantic-model files in `backend/app/` use `from __future__ import
  annotations` for PEP 604 (`X | None`) syntax support. Harmless on the
  Python 3.11 deploy target; only exists to verify locally against this
  machine's Python 3.9. Fine to remove once the dev machine/CI is on 3.11+
  if it ever reads as clutter.
- **DB connectivity blocker (session-handoff.md Open issue #1) resolved**:
  `backend/.env`'s `DATABASE_URL` now uses Supabase's pooler connection
  string. All M4 verification ran against the real Supabase DB successfully.
- `GET /products/{style_number}/similar` is implemented as a real HNSW
  cosine-distance lookup on `text_embedding`, but returns an honestly empty
  list pre-M9 — confirmed live that all 1000 `finished_goods` rows still
  have `text_embedding IS NULL`. No fabricated similarity logic; revisit
  once M9 backfills embeddings (nothing to change in the endpoint itself,
  since the query already excludes NULL embeddings on both sides).
- Query-param dependency gotcha (found + fixed during M4 verification):
  FastAPI's bare `Depends()` on a Pydantic model only extracts individual
  declared fields as separate `Query(...)` params — it does not validate
  the model as a whole. That silently defeated both the `min_price <=
  max_price` / `min_gsm <= max_gsm` cross-field `model_validator` (raised a
  raw `pydantic.ValidationError` that fell through to the generic 500
  handler instead of a 422 envelope) and `extra="forbid"` (unknown query
  params were dropped, not rejected). Fixed in `routers/products.py` by
  switching to `Annotated[ProductListParams, Query()]`, which runs full
  model validation and is the FastAPI-supported pattern for Pydantic-model
  query params (available since FastAPI 0.115, well under the installed
  0.128.8). Worth remembering for any future GET endpoint that takes a
  multi-field Pydantic query model (e.g. `/search/products` in M10).
- session-handoff.md Open issue #2 is **still open**: the pooler
  `DATABASE_URL` used for M4 verification connects as `postgres.<project>`
  (the Supabase superuser), not `app_readonly` — confirmed by inspecting
  the configured role directly. M4's own queries are all read-only so this
  didn't block M4, but the read-only-role defense-in-depth layer
  (CLAUDE.md invariant 3, backend-spec.md §4) is not actually in effect
  yet. Must be fixed (set `app_readonly`'s password, point `DATABASE_URL`
  at it) before M11 deploy.
