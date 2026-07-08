# Execution Playbook — WFX ERP Explorer

Deadline: Thu 10 Jul, 10:00 PM IST. ~38.5h of work budgeted, rest is sleep/buffer.
Critical path (red-flagged risk milestones: M7, M11):
**M0→M1→M2→M3→M6→M7→M8→M11→M12→M14→M17→M19→M20**

## Phase 0 — Foundations (tonight, ~4.5h)
- **M0 — Repo scaffold & CLAUDE.md** (1h, LOW): monorepo skeleton, docs/ populated,
  .gitignore, .env.example. Done when: repo pushed, `data/` untracked.
- **M1 — DB schema + roles** (1.5h, LOW): schema.sql, roles.sql applied to Supabase.
  Done when: schema applies clean, app_readonly cannot INSERT.
- **M2 — Seed script + integrity gates** (2h, MEDIUM): idempotent CSV loader with
  name→FK resolution + row-count/orphan assertions. Done when: two runs give identical
  counts (1000/12/12/1500/1206/1000), zero FK violations.

## Phase 1 — Backend core (Jul 9, ~10.5h) ⚡ CRITICAL PATH DAY
- **M3 — FastAPI skeleton** (1.5h, LOW): config, error envelope, logging, CORS, rate
  limiter, `/health`.
- **M4 — Products/detail/filters endpoints** (2h, LOW).
- **M5 — Dashboard stats** (1h, LOW): revenue rule tested (excludes Cancelled).
- **M6 — SQL guardrails + tests** (1.5h, LOW, isolated/parallelizable): ~20 test cases,
  block DML/DDL/chaining/comment-smuggling, allow SELECT/CTE/joins/aggregates.
- **M7 — Vanna + training package** (2.5h, **HIGH** 🔴): OpenRouter+Chroma wiring, ~18
  golden question/SQL pairs (incl. every assignment example), train_check.py harness.
  Timebox 90min; escape hatch = direct retrieval-prompting behind same interface if
  accuracy <12/18.
- **M8 — /query SSE pipeline** (2h, MEDIUM): full stream generate→guard→execute→answer,
  structured error events, honest zero-row prose.
- **M9 — Offline embeddings job** (1.5h, MEDIUM, runs parallel to M7/M8): BGE-small +
  CLIP over all 1,000 products, resumable.
- **M10 — Search endpoints** (2h, MEDIUM): hybrid product search, visual search,
  more-like-this.

## Phase 2 — Deploy early (Jul 9 evening, 1.5h) ⚡ CRITICAL
- **M11 — Backend to production** (1.5h, **HIGH** 🔴): Docker + Render deploy, uptime
  pinger. This is the pre-planned risk gate — if CLIP exceeds memory here, execute the
  Screen-4 fallback tonight, with 24h still on the clock.

## Phase 3 — Frontend (Jul 9 night + Jul 10 morning, 10h)
- **M12 — Frontend foundation** (2h, LOW): Vite+Tailwind tokens wired first, shell,
  routing, typed API client + SSE handling.
- **M13 — Dashboard + Products screens** (2.5h, LOW).
- **M14 — Ask AI screen** (2.5h, MEDIUM ⚡ flagship): SSE-staged UI, suggested chips,
  designed error/blocked states.
- **M15 — Search, Visual, Detail drawer** (2.5h, LOW).
- **M16 — Polish pass** (2h, LOW): loading/empty/error sweep, ⌘K, responsive, a11y.
- **M17 — Frontend to production** (1h, MEDIUM): Vercel deploy, CORS update, full F1–F3
  smoke test on production.

## Phase 4 — Ship (Jul 10, 7h + buffer)
- **M18 — Docker Compose + documentation** (2.5h, LOW): 3+ page tech doc, README
  (generic product framing, no assignment references, no secrets in history).
- **M19 — Final evaluation + hardening** (1.5h, LOW): train_check on prod, 12-step demo
  checklist run twice, feature freeze in effect.
- **M20 — Video + submission** (2h, LOW but immovable): 60s scripted recording,
  submission email with all required inclusions, sent ≥1h before deadline.

## Standing Rules
- Commit on every green acceptance criterion; push immediately (Render/Vercel
  auto-deploy = free regression test after M11/M17).
- No commits 01:00–07:00 — sleep is on the critical path.
- At Jul 10, 18:00: feature freeze. Only M19/M20 remain.
- Cut order if behind: dynamic charts → ⌘K → Docker Compose → dashboard charts become
  plain stat cards. Never cut: the five screens, guardrails, deployment, docs, video.
