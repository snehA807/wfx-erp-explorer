# Project State

Live snapshot of implementation progress against `docs/playbook.md`. Updated
at the end of every milestone (definition-of-done.md item 4: "committed per
convention"). Distinct from `docs/decisions.md` (spec deviations) and
`docs/backlog.md` (deferred scope) — this file only answers "what stage is
the build at."

**Last updated:** 2026-07-08
**Current milestone:** M1 — DB schema + roles
**Status:** ✅ Complete
**Next milestone:** M2 — Seed script + integrity gates

## Milestone status

| # | Milestone | Phase | Status |
|---|---|---|---|
| M0 | Repo scaffold & CLAUDE.md | 0 — Foundations | ✅ Complete |
| M1 | DB schema + roles | 0 — Foundations | ✅ Complete |
| M2 | Seed script + integrity gates | 0 — Foundations | ⬜ Not started |
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

## Open items carried into M2

- `docs/backlog.md`: Docker Compose scope conflict (requirements.md vs.
  playbook.md) — still unresolved.
- ~~`roles.sql` location~~ — resolved: user directed `db/roles.sql` as a
  sibling to `db/schema.sql`.
- ~~`DATABASE_URL_OWNER` role ambiguity~~ — resolved during M1: it uses
  Supabase's built-in `postgres` connection string; no custom owner role is
  created. See `docs/decisions.md`.
