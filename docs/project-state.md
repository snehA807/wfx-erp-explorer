# Project State

Live snapshot of implementation progress against `docs/playbook.md`. Updated
at the end of every milestone (definition-of-done.md item 4: "committed per
convention"). Distinct from `docs/decisions.md` (spec deviations) and
`docs/backlog.md` (deferred scope) — this file only answers "what stage is
the build at."

**Last updated:** 2026-07-10
**Current milestone:** M8 — /query SSE pipeline
**Status:** ✅ Complete
**Next milestone:** M9 — Offline embeddings job

## Milestone status

| # | Milestone | Phase | Status |
|---|---|---|---|
| M0 | Repo scaffold & CLAUDE.md | 0 — Foundations | ✅ Complete |
| M1 | DB schema + roles | 0 — Foundations | ✅ Complete |
| M2 | Seed script + integrity gates | 0 — Foundations | ✅ Complete |
| M3 | FastAPI skeleton | 1 — Backend core | ✅ Complete |
| M4 | Products/detail/filters endpoints | 1 — Backend core | ✅ Complete |
| M5 | Dashboard stats | 1 — Backend core | ✅ Complete |
| M6 | SQL guardrails + tests | 1 — Backend core | ✅ Complete |
| M7 | Vanna + training package | 1 — Backend core 🔴 | ✅ Complete |
| M8 | /query SSE pipeline | 1 — Backend core | ✅ Complete |
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

## Open items carried into M9

- `docs/backlog.md`: Docker Compose scope conflict — resolved 2026-07-10
  (`docs/decisions.md`): playbook.md is the execution authority, stays in
  the cut order.
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
  at it) before M11 deploy. Still open after M5/M6 — both are read-only.
- M5 (`GET /dashboard/stats`) verified live: revenue excl.
  Cancelled = ₹3,343,324,073 vs. ₹3,520,227,834 including it (matches
  independent SQL computed with a differently-shaped query); the 11
  category-revenue rows sum exactly to the total; the 5 order-status counts
  sum exactly to 1500 total orders. `recent_orders` intentionally shows all
  statuses (including Cancelled) — the CLAUDE.md revenue exclusion rule
  applies only to the revenue figures, not to order listings/counts.
  `order_number` (zero-padded `SO-#####`) is used as the recency sort key
  instead of `shipment_date`, since shipment_date is a planned/actual ship
  date uncorrelated with order-creation order. 5-minute in-process TTL
  cache verified directly (same object within TTL, re-fetched with
  consistent values after expiry via a monkeypatched short TTL). No bugs
  found this milestone.
- M6 (`core/guardrails.py` + `tests/test_guardrails.py`): 35 test cases
  (playbook.md asked for ~20), all green — allowed SELECT/CTE/join/
  aggregate shapes with and without an existing LIMIT, plus blocked DML/
  DDL/DCL, statement chaining, both comment styles, a data-modifying CTE
  (`WITH d AS (DELETE ... RETURNING *) SELECT * FROM d` — starts with WITH
  so a naive "starts with SELECT/WITH" check alone would miss it), and a
  `SELECT ... INTO` DDL-via-SELECT bypass. String literals are masked
  (length-preserving) before any structural check, so data values
  containing semicolons or denylisted words (e.g. a fabric-care note with
  "DROP" in it) are never misread as SQL structure. Also verified two
  guardrail-approved queries (a plain SELECT and a GROUP BY CTE) actually
  execute correctly against the real Supabase DB, including confirming the
  auto-LIMIT truly caps `finished_goods` (1000 rows) at 100. One accepted
  simplification logged in `docs/decisions.md`: LIMIT-presence is detected
  anywhere in the statement, not only at the top level.
- Added `pytest>=8.0,<9` to `backend/requirements.txt` (dev/test only —
  already named by CLAUDE.md's own `pytest -q` command, not a new
  dependency choice) and `backend/pytest.ini` (`pythonpath = .`) so `pytest
  -q` from `backend/` can resolve `from app...` imports — there's no
  `tests/__init__.py`, so pytest's default import-mode wouldn't otherwise
  put `backend/` itself on `sys.path`.
- **M7 (Vanna + training package, docs/implementationM7.md is the written
  spec):** `train_check.py` passed **18/18 on both full runs** — no
  wobble, well above the 12/18 gate. Escape hatch not built (M7 frames it
  as a contingency for <12/18; building unused code for an uncrossed
  threshold would be scope creep). Total OpenRouter spend across the
  entire session (dependency proof calls + 2 full 18-question runs, ~50
  real calls): **$0.0067 of the $5 budget** — confirmed live via
  OpenRouter's `/auth/key` endpoint.
  - Chose `openai/gpt-4o-mini` after querying OpenRouter's live model
    catalog (346 models) and checking the key was real and funded ($5
    limit, $0 used at the time) — cost turned out to be a total non-issue
    at these prices (~$0.0002/call), so the model choice was driven by
    NL2SQL format-reliability track record, not budget.
  - **Vanna 2.0.2's API moved**: the classic `ChromaDB_VectorStore` +
    `OpenAI_Chat` composition classes are no longer at `vanna.chromadb` /
    `vanna.openai` — they're under `vanna.legacy.chromadb` /
    `vanna.legacy.openai`. The top-level `vanna` package in 2.x is a full
    agents/tools rewrite. Confirmed the legacy API's method surface
    (`train`, `generate_sql`, `extract_sql`, `submit_prompt`) matches the
    intended architecture exactly — a one-line import fix, not a design
    problem.
  - Vanna's built-in `OpenAI_Chat.submit_prompt` doesn't pass `max_tokens`
    or expose `response.usage` — overridden on the `_TrainedVanna`
    subclass in `services/nl2sql.py` to delegate to `services/llm.py`'s
    `create_chat_completion` instead, which is also where per-instance
    `code` overrides on `AppError` came from (`core/errors.py` gained an
    optional `code` constructor kwarg so `LLMError` can carry either
    `LLM_ERROR` or `LLM_UNAVAILABLE` without a new error class).
  - OpenRouter's completion response includes an exact `usage.cost` field
    — no per-model pricing table needed in `llm.py`, simpler than planned.
  - `extract_sql` is reimplemented in `services/nl2sql.py` rather than
    reusing Vanna's built-in version: ours raises `LLMError` when nothing
    SQL-shaped is found at all (distinct from a guardrail block on
    SQL-shaped-but-disallowed text), which Vanna's version doesn't
    distinguish. Unit-tested in `tests/test_sql_extraction.py` (12 cases,
    zero LLM calls) including a documented characterization: text
    containing the ordinary English word "with" is not treated as "no
    SQL" (extraction only checks for a keyword anywhere in the text) —
    `core/guardrails.py`'s stricter "must START with SELECT/WITH" check is
    what actually rejects that case.
  - Overrode `_TrainedVanna.log()` as a no-op — `VannaBase.log()` does a
    raw `print()` of the full prompt/response on every call, which isn't
    in backend-spec.md §10's required log list and fights the "structured
    JSON to stdout" requirement on every single request.
  - Chroma's first-run ONNX embedding model download is ~79.3MB (matches
    the ~80MB estimate); training after that cache is warm takes ~4s, well
    inside the <15s target. **M11 note:** pre-bake `~/.cache/chroma` into
    the Docker image, or accept one slow cold start on first deploy.
  - 9 of 18 golden questions are composed from topic descriptions, not
    verbatim assignment text (`docs/decisions.md`) — the assignment
    document isn't in this repo.
  - `GET /health` now reports `nl2sql_ready: bool` (extends the M3
    envelope, doesn't change `/health`'s pass/fail semantics — that's
    still DB-connectivity-only; `/query/sql` raises its own 503 if
    generation is attempted before training completes).
  - Rate limiting (10/min/IP) on `POST /query/sql` verified live: blocked
    with a proper `RATE_LIMITED` envelope after ~9-10 requests in a tight
    loop.
- **M8 (`/query` SSE pipeline, backend-spec.md §3: `status -> sql -> rows ->
  answer(tokens) -> done/error`):** `POST /query/sql` (M7) left completely
  unmodified — `nl2sql.py` and `core/guardrails.py` untouched. New pieces:
  `services/query_pipeline.py::stream_query()` (generate → guard → execute →
  answer, as SSE bytes), `StreamedCompletion` in `services/llm.py` (streaming
  counterpart to `create_chat_completion`, temperature 0, `stream_options:
  {include_usage: true}` so OpenRouter's exact per-request cost still lands
  even in streaming mode), and five new Pydantic event-payload models in
  `models/responses/query.py`. `POST /query` uses FastAPI's built-in
  `StreamingResponse` — no new dependency. All errors (guardrail block, LLM
  failure, unready service, unhandled exception) are caught **inside** the
  generator and emitted as a structured `error` SSE event, since
  `main.py`'s global exception handlers can't intervene once the stream has
  started (headers already sent at 200).
  - Zero-row results skip the second LLM call and emit a fixed honest-prose
    string instead (`docs/decisions.md`) — matches design-spec.md's "never a
    bare empty table" requirement without spending a token or risking
    hallucination over empty data.
  - Verified live end-to-end against real OpenRouter + Supabase: a
    revenue-ranking question (correct application of the CLAUDE.md revenue
    rule, ₹-formatted prose, token-by-token streamed answer), a zero-row
    question, a non-empty `SELECT *` question, an outright destructive
    request ("delete all cancelled orders" — refused by the model itself,
    LLM_ERROR, closes cleanly) and an adversarial prompt engineered to make
    the model emit real `DELETE` SQL text (caught by guardrails,
    SQL_BLOCKED, closes cleanly) — satisfies definition-of-done.md's "delete
    all orders is blocked gracefully" project-done criterion. Rate limiting
    burst-tested on the new endpoint directly: exactly 10 requests passed,
    11th+ got a proper `RATE_LIMITED` envelope. Total OpenRouter spend this
    session (dependency proof + all live verification calls): **$0.0022**.
  - **Two real bugs found and fixed during live verification, both
    documented in `docs/decisions.md`:**
    1. `db/session.py`'s lazy-singleton connection hung *indefinitely* (not
       erroring) on the first query after the connection sat idle a few
       minutes — a silently-dropped socket that `.closed` doesn't detect.
       Fixed with short TCP keepalives + a liveness ping before reuse. This
       predates M8 (same connection singleton since M3) and affects every
       DB-touching endpoint, not just `/query`; M8 just happened to be the
       first thing exercised after an idle gap in this session.
    2. `SELECT *` questions returned the `text_embedding`/`image_embedding`
       vector columns despite `vanna_training/ddl.sql` deliberately hiding
       them from the model's trained schema — training-time hiding doesn't
       constrain execution-time `SELECT *`. Fixed by stripping both columns
       from the `rows` SSE payload and the answer-generation prompt
       (`query_pipeline.py::_strip_hidden_columns`); also pre-empts a crash
       once M9 backfills real (non-JSON-serializable) pgvector values there.
  - **Fast-follow, resolved same day:** guardrail-block error responses
    (`SQL_BLOCKED`) now carry the blocked SQL in `details` on both
    `/query/sql` and `/query` — `core/guardrails.py::enforce_guardrails()`
    attaches `details={"sql": sql}` at the source; every caller already
    passed `.details` straight through, so no other file needed changes.
    Response envelope shape unchanged (`details` was already `dict | None`
    in the contract, just always `None` for this path before). 6 new
    `tests/test_guardrails.py` cases (CLAUDE.md invariant 6) plus re-
    verified live against real OpenRouter output on both endpoints.
  - `core/rate_limit.py`'s stale comment (said `/query` "doesn't exist
    until M8" — cosmetic drift from M7) corrected in passing.
