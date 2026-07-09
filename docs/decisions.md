# Decisions Log

One line per entry: any spec deviation or escape-hatch invocation, in the same
commit that makes it. Referenced by `docs/engineering/09-definition-of-done.md`
and `docs/engineering/10-pr-checklist.md`. This log is for deviations made
*during implementation* — the pre-existing, locked decisions are already in
`docs/requirements.md`'s decision log and don't need repeating here.

Format: `YYYY-MM-DD — <milestone> — <decision> — why`

2026-07-08 — M1 — `DATABASE_URL_OWNER` uses Supabase's built-in `postgres`
role; no custom owner role is created in `db/roles.sql` — backend-spec.md §4
names and fully specifies `app_readonly` but never names or specifies an
owner role, despite §11 saying "both roles created"; user chose the simpler
option over creating a distinct least-privilege `app_owner` role when asked.

2026-07-10 — M6 — `core/guardrails.py`'s auto-LIMIT check looks for `LIMIT`
anywhere in the statement, not only at the top level, so
`SELECT ... LIMIT 100 UNION SELECT ...` skips appending an outer LIMIT even
though the UNION could still return more than 100 rows — a real SQL parser
would close this, but is disproportionate for a module that only ever wraps
LLM-generated SQL, sits behind the `app_readonly` role's own
`statement_timeout`, and is a 1.5h/LOW-risk milestone per playbook.md.

2026-07-10 — M7 — Docker Compose scope conflict (open issue #3, backlog.md)
resolved: playbook.md is the execution authority; Compose stays on the
cut-order list and ships only if M18 runs on schedule — decided once per
docs/implementationM7.md §13 rather than re-litigated at M18.

2026-07-10 — M7 — 9 of the 18 `golden_queries.yaml` question strings are
composed from the topic descriptions in docs/implementationM7.md §4
("cotton shirts by ABC Textiles", "buyers above 220 GSM", etc.), not
transcribed verbatim from the original assignment document — that
document isn't checked into this repo and wasn't otherwise available.
Every reference SQL was still executed against live Supabase and hand-
verified; only the exact English wording of these 9 questions is an
approximation. If an evaluator's literal wording differs, Vanna's
semantic retrieval should still match closely — train_check.py passed
18/18 against the wording actually used.

2026-07-10 — M7 — Vanna→retrieval-prompting escape hatch (architecture.md
§5) was **not** invoked: train_check.py passed 18/18 on both full runs
(well above the 12/18 gate), so the escape hatch code itself was not
built — docs/implementationM7.md §12 frames it as a contingency, and
building unused code for a threshold that wasn't crossed would be
scope creep beyond M7.
