# Documentation Audit — WFX Explorer

What exists, what a mature production repository typically has that this one doesn't yet, and what's worth adding — roughly ordered by how much it would move the needle for an outside reader (recruiter, engineer evaluating the repo, or a future contributor).

## What already exists (strong foundation)

| Doc | Covers |
|---|---|
| `docs/architecture.md` | Internal architecture decision record — stack rationale, escape hatches, cost model |
| `docs/backend-spec.md` | Backend behavior spec |
| `docs/design-spec.md` | Product/UX spec |
| `docs/requirements.md` | Functional/non-functional requirements, locked decisions |
| `docs/decisions.md` | Running decision log with dates and rationale |
| `docs/frontend/*` | Design system, component library, navigation, motion, implementation plan |
| `docs/engineering/*` | Dev rules, coding standards, git/commit conventions, PR/DoD/code-review checklists |
| `.env.example` | Fully annotated environment variables |
| `README.md`, `docs/portfolio/*` | *(this batch)* External-facing README, architecture, case study, diagrams |

This is an unusually well-documented internal engineering process — most of the audit below is about **externally-facing** and **operational** documentation, which is a different audience than the internal specs above.

## Missing — high value

- **CHANGELOG.md.** Nothing currently tracks what changed release-to-release. Even starting from the current state forward (`## [Unreleased]` → first tagged release) gives future you and any reader a way to see what shipped when, without spelunking `git log`.
- **OpenAPI reference committed to the repo.** FastAPI serves `/docs` and `/openapi.json` live, but nothing in the repo captures the API contract statically — useful for anyone evaluating the project without running it, and as a diffable artifact when the API changes.
- **A data dictionary / glossary.** Domain terms like GSM, tech pack, style number, and the specific revenue rule are explained inline in `docs/requirements.md` and `db/schema.sql` comments, but there's no single glossary a new reader can scan. Worth 20 minutes to extract into `docs/GLOSSARY.md`.
- **Operational runbook.** How to redeploy, how to rotate the OpenRouter key or the `app_readonly` password, what to check first if `/health` reports unhealthy, how to re-run the embedding backfill safely against a live DB. This lives implicitly in script docstrings and `docs/decisions.md` entries today, not as a single "if X breaks, do Y" reference.
- **Testing documentation.** What the 65 backend tests actually cover (guardrails, query pipeline, search API, SQL extraction) isn't summarized anywhere outside the test files themselves — worth a short `docs/TESTING.md` describing test categories and how to add a guardrail test (referencing the project's own same-commit-test rule).

## Missing — medium value

- **Architecture Decision Records (ADR) format.** `docs/decisions.md` already functions as a decision log, but it's chronological/narrative rather than the standard one-ADR-per-decision format (`docs/adr/0001-pgvector-over-typesense.md` style). Not urgent — the content exists — but the ADR format is more discoverable for someone looking for "why was X chosen" specifically.
- **Public roadmap.** `docs/backlog.md` and this document's "Future Improvements"/"Future Roadmap" sections cover this informally; a dedicated `ROADMAP.md` with rough priority/status (planned / in progress / done) is a common expectation on mature repos and is easy to derive from what already exists.
- **Monitoring/observability notes.** `structlog` JSON logging is wired throughout (`request`, `token_cost`, `guardrail_blocked`, etc. events), but there's no doc describing what's logged, where logs go in the deployed environment, or what a healthy vs. unhealthy log pattern looks like.
- **Accessibility notes.** The design system doc mentions contrast-floor rules, but there's no explicit accessibility statement (keyboard navigation, screen-reader support, WCAG target) — worth a short section if accessibility was a deliberate design input (the command palette and focus-visible treatment suggest it was).
- **Performance / load characteristics.** No documented numbers for expected latency (NL2SQL round-trip, search response time) or known limits (e.g. the single-worker process's practical concurrency ceiling). Even rough numbers from manual testing would be useful context for anyone evaluating scalability.

## Missing — lower priority / nice to have

- **Versioning policy.** Whether the project follows semver, what constitutes a breaking API change, etc. — only matters once there are real consumers of the API beyond the bundled frontend.
- **Localization/i18n notes.** Not applicable today (single-locale, INR-only), but worth a one-line "not currently supported" note if that's ever asked.
- **Backup/disaster-recovery notes.** Supabase manages backups at the platform level; worth a one-line pointer to that fact so it isn't an open question for an evaluator.
- **User-facing help content** (as opposed to engineering docs) — e.g. a short "how to ask good questions" guide for the Ask screen, since NL2SQL quality is sensitive to phrasing. Could live as in-app suggested-question chips (already partially present via `SUGGESTION_CHIPS`) plus a short doc.

## Not recommended

- **A full user manual.** The product is simple enough (5 screens, self-explanatory UI) that a full manual would be over-documentation relative to the audience.
- **Multi-language docs.** No indication of a non-English audience; not worth the maintenance burden preemptively.

## Suggested order of attack

1. `CHANGELOG.md` + a `v1.0.0` tag (cheap, immediately signals a maintained project)
2. Committed `openapi.json` export + a link to it from the README
3. `docs/GLOSSARY.md` (fast to extract from existing specs)
4. Operational runbook (highest long-term value, currently the biggest real gap)
5. Everything else, as time allows
