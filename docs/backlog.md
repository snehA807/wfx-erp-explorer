# Backlog

Work explicitly out of scope for the current milestone, per
`docs/engineering/01-development-rules.md` rule 1. Only items a spec has
already named and deferred — not a wishlist. See `docs/project-state.md` for
what milestone is currently active.

## 1. Cuttable under time pressure
Ranked cut order per playbook.md standing rules — if behind schedule, cut
top-down, stop as soon as back on track.
1. Dynamic charts generated from arbitrary NL2SQL results
2. ⌘K command palette
3. Docker Compose (resolved 2026-07-10, docs/decisions.md: playbook.md is
   the execution authority — stays in the cut order, ships only if M18
   runs on schedule)
4. Dashboard revenue-by-category / order-status charts → degrade to plain stat cards

## 2. Explicitly skipped (out of scope entirely)
Per requirements.md decision log — not revisited unless the user changes scope.
- CI/CD pipeline
- Webhooks / background jobs
- NL2SQL confidence scores

## 3. Optional, unscheduled
Build only if time remains after the mandatory + "definitely implement" scope;
no fixed slot in playbook.md.
- Image upload → visually similar garments (requirements.md; distinct from
  CLIP text→image search, which *is* in scope)

## Open questions
Documentation conflicts that need a one-line resolution in
`docs/decisions.md` before they become load-bearing:
- **`roles.sql` location:** playbook.md names it as an M1 deliverable; it has
  no entry in CLAUDE.md's or backend-spec.md's documented folder layout.
  Recommend `db/roles.sql` as a sibling to `db/schema.sql` — needs sign-off
  before M1 starts.
