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

2026-07-10 — M9 — `finished_goods.search_text` (seed-time concatenation of
style_name/category/fabric/color/print/season/brand) is now locked as the
BGE input; not changing it post-embed since any change would require a
full re-embed of all 1,000 rows.

2026-07-10 — M9 — Embedding model IDs fixed and verified live against
fastembed 0.7.4's `list_supported_models()` before use (not trusted from
memory): `BAAI/bge-small-en-v1.5` (text, 384d) and
`Qdrant/clip-ViT-B-32-vision` (image, 512d), paired at query time in M10
with `Qdrant/clip-ViT-B-32-text` — same CLIP checkpoint on both sides of
visual search, or cosine similarity across the two encoders is
meaningless. Both models confirmed to output L2-normalized vectors (norm
1.0 on live samples), so `<=>` needs no extra normalization step.

2026-07-10 — M9 — A row whose image download fails after 3 retries is
skipped, not faked: `image_embedding` stays NULL and the run reports it
loudly (non-zero exit + failed style list) rather than silently
succeeding with partial data. `/similar` and future M10 search queries
already filter `IS NOT NULL`, so this degrades coverage, not correctness.
Live run against the real dataset: 1000/1000 images embedded, 0
failures, so this path is untested against a real failure — only
verified via a deliberately-broken URL in isolation.

2026-07-10 — M7 — Vanna→retrieval-prompting escape hatch (architecture.md
§5) was **not** invoked: train_check.py passed 18/18 on both full runs
(well above the 12/18 gate), so the escape hatch code itself was not
built — docs/implementationM7.md §12 frames it as a contingency, and
building unused code for a threshold that wasn't crossed would be
scope creep beyond M7.

2026-07-10 — M8 — Zero-row results skip the second (answer-generation) LLM
call entirely; `services/query_pipeline.py` emits a fixed honest-prose
string instead. design-spec.md only requires "the AI answer states this in
prose, never a bare empty table" — it doesn't require an LLM call
specifically, and a templated message can't hallucinate over empty data,
costs nothing, and is one round-trip faster.

2026-07-10 — M8 — `POST /query`'s `rows` SSE event and the answer-generation
prompt both strip `text_embedding`/`image_embedding` from any result set
(`services/query_pipeline.py::_strip_hidden_columns`), even though
guardrails don't block `SELECT *`. Found live: a `SELECT *` question
returned these two vector columns despite ddl.sql deliberately hiding them
from Vanna's trained schema (docs/implementationM7.md §4) — training-time
hiding doesn't survive execution-time `SELECT *`. Left `core/guardrails.py`
unchanged (this is a payload-hygiene/cost concern, not a write-safety one,
so it doesn't need guardrails' denylist-and-block treatment) and fixed at
the serialization boundary instead; also pre-empts a crash once M9
backfills real (non-JSON-serializable) pgvector values into these columns.

2026-07-10 — M8 — `db/session.py::get_connection()` now pings
(`SELECT 1`) the cached connection before returning it, reconnecting
transparently on failure, and the underlying `psycopg.connect()` call now
sets short TCP keepalives (20s idle / 10s interval / 3 probes). Found live:
a connection left idle ~9 minutes between requests was silently dropped
(by Supabase's pooler or an intermediate network hop) without a clean
FIN/RST — `.closed` still read `False`, so the next `execute()` hung
indefinitely instead of erroring. This affects every DB-touching endpoint
(M4/M5 included), not just M8's new `/query`; M8 surfaced it because it was
the first endpoint exercised after a multi-minute idle gap in this
session. Still a single lazy-singleton connection — no pooling library, no
architecture change, `app_readonly` migration still deferred to M11 as
directed.

2026-07-10 — M8 — `POST /query`'s `SQLGuardrailError` (`SQL_BLOCKED`) SSE
`error` event carries `details: null`, not the blocked SQL, even though
docs/implementationM7.md §8 and design-spec.md ("keep the generated SQL
visible" on failure) both call for it. Root cause: `core/guardrails.py`'s
`enforce_guardrails()` never attached the offending SQL to the exception's
`details` in M7 either — confirmed live that `POST /query/sql` has the
same gap today. Fixing it means editing either `enforce_guardrails()` or
`Nl2SqlService.generate_sql()` (both shared with `/query/sql`), which
would change `/query/sql`'s error response shape — out of scope given this
session's explicit direction to preserve `/query/sql` exactly as
implemented in M7. Left as a known, pre-existing gap; not introduced by
M8. Flagged for a fast-follow, not fixed here.

2026-07-10 — M8 (fast-follow) — The `SQL_BLOCKED` `details: null` gap
(logged above) is fixed: `core/guardrails.py::enforce_guardrails()` now
attaches `details={"sql": sql}` — the caller's exact, unmasked input — to
every `SQLGuardrailError` it raises. No change needed in `nl2sql.py`,
`query_pipeline.py`, or `main.py`: all three already read `exc.details`
off the exception and pass it straight through, so both `/query/sql` and
`/query`'s SSE `error` event picked up the fix automatically once
`details` was populated at the source. Response envelope shape is
unchanged for both endpoints (`details` was already typed `dict | None`;
it was simply always `None` for this one error path before). 6 new cases
added to `tests/test_guardrails.py` per CLAUDE.md invariant 6, plus
re-verified live against both endpoints with real OpenRouter output.

2026-07-10 — M8 — `core/rate_limit.py`'s `limiter` singleton is applied
per-route (`@limiter.limit(...)` on both `/query/sql` and `/query`
independently), matching the pattern M7 already established — each route
gets its own 10/min/IP counter rather than a single bucket shared across
the whole `/query*` prefix backend-spec.md §3's table notation might
imply. Not changed here: this is M7's existing pattern (slowapi's default
per-endpoint scoping), and building a cross-route shared-limit key is a
bigger call than a same-session M8 fix should make unilaterally.

2026-07-10 — M10 — Blocker found and fixed before any M10 code could be
exercised: `core/config.py`'s `Settings` (via `SettingsConfigDict(env_file=
".env")`) inherited pydantic-settings' default `extra="forbid"`, so
`Settings()` construction has been raising a `ValidationError` on
`DATABASE_URL_OWNER` (added to `backend/.env` in M9 for `scripts/`, read
via `os.environ` directly, never through this class — the docstring
already documented it as "deliberately absent") ever since. This meant the
FastAPI app could not boot at all (confirmed: `uvicorn`/`from app.routers
import query` both failed identically) — pre-existing since M9, invisible
until now because M9 only ran a standalone script and the existing test
suite never imports `main.py` or a router module. Fixed with a one-line
`extra="ignore"` on `Settings.model_config`, approved before applying.
Unblocked M10's own `TestClient` contract tests and live `uvicorn`
verification; every prior milestone's live testing predates this
regression and is unaffected.

2026-07-10 — M10 — Confirmed `Qdrant/clip-ViT-B-32-text` (fastembed
0.7.4) live before writing any implementation code: 512d output, norm ≈
1.0, and a matching text query ("plum colored shorts, solid") scored
0.334 cosine similarity against a real `image_embedding` for that exact
product vs. 0.175 for an unrelated query — confirms the CLIP text/vision
pairing locked in M9 actually produces a meaningful cross-modal signal,
not just matching dimensions.

2026-07-10 — M10 — `services/products.py::_validate_categorical_filters`
and `_row_to_summary` were renamed to `validate_categorical_filters` and
`row_to_summary` (dropped the leading underscore) and the former's
parameter type generalized to a `Protocol` (`CategoricalFilterParams`)
matching the six shared filter fields, so `services/search.py` imports
and reuses both verbatim instead of duplicating them — mechanical rename,
no behavior change, only call site updated is `list_products`.

2026-07-10 — M10 — Live verification against real Supabase, all green:
hybrid query ("blue floral dress") returned semantically relevant, score-
descending results; adding `category="Polo"` correctly constrained every
result to that category; visual query ("a dark garment with stripes")
surfaced dark/patterned garments (CLIP-text-on-product-photos match
quality is fuzzy as anticipated, but directionally correct); a filter
combination excluding every row returned an honest `{"data":[],"meta":
{"count":0}}`; feeding a product's own `search_text` back as the query
ranked that exact product #1 with `score: 1.0`; a 32-request burst against
`/search/products` passed exactly 30 then returned `RATE_LIMITED` (429)
on the 31st and 32nd, while `/search/visual` was unaffected (independent
per-route bucket, same pattern as M8's `/query*`).
