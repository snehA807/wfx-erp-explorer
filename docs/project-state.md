# Project State

Live snapshot of implementation progress against `docs/playbook.md`. Updated
at the end of every milestone (definition-of-done.md item 4: "committed per
convention"). Distinct from `docs/decisions.md` (spec deviations) and
`docs/backlog.md` (deferred scope) — this file only answers "what stage is
the build at."

**Last updated:** 2026-07-09
**Current milestone:** M2 — Seed script + integrity gates
**Status:** ✅ Complete
**Next milestone:** M3 — FastAPI skeleton

## Milestone status

| # | Milestone | Phase | Status |
|---|---|---|---|
| M0 | Repo scaffold & CLAUDE.md | 0 — Foundations | ✅ Complete |
| M1 | DB schema + roles | 0 — Foundations | ✅ Complete |
| M2 | Seed script + integrity gates | 0 — Foundations | ✅ Complete |
| M3 | FastAPI skeleton | 1 — Backend core | ⬜ Not started |
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

## Open items carried into M3

- `docs/backlog.md`: Docker Compose scope conflict (requirements.md vs.
  playbook.md) — still unresolved.
- `finished_goods.search_text` is generated at seed time by
  `scripts/seed_db.py::build_search_text()` (concatenates style_name,
  category, fabric, color, print, season, brand) since no source CSV column
  exists for it. Not a locked decision — safe to change before M9 embeds it,
  since re-running the seed script overwrites the column via upsert.
- `scripts/requirements.txt` pins `psycopg[binary]` for `scripts/` only,
  since `backend/`'s own dependency manifest doesn't exist until M3 — worth
  folding into a shared manifest if M3 introduces one, rather than keeping
  two.
