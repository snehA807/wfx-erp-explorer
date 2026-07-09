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

<!-- Example, remove once a second real entry lands:
2026-07-09 — M7 — invoked Vanna→retrieval-prompting escape hatch — golden-query
pass rate was 9/18 after the 90-minute timebox, below the 12/18 threshold in
architecture.md §5
-->
