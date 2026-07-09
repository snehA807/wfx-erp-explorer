# Project State

Live snapshot of implementation progress against `docs/playbook.md`. Updated
at the end of every milestone (definition-of-done.md item 4: "committed per
convention"). Distinct from `docs/decisions.md` (spec deviations) and
`docs/backlog.md` (deferred scope) — this file only answers "what stage is
the build at."

**Last updated:** 2026-07-09
**Current milestone:** M3 — FastAPI skeleton
**Status:** ✅ Complete
**Next milestone:** M4 — Products/detail/filters endpoints

## Milestone status

| # | Milestone | Phase | Status |
|---|---|---|---|
| M0 | Repo scaffold & CLAUDE.md | 0 — Foundations | ✅ Complete |
| M1 | DB schema + roles | 0 — Foundations | ✅ Complete |
| M2 | Seed script + integrity gates | 0 — Foundations | ✅ Complete |
| M3 | FastAPI skeleton | 1 — Backend core | ✅ Complete |
| M4 | Products/detail/filters endpoints | 1 — Backend core | ⬜ Not started |
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

## Open items carried into M4

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
