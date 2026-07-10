# Project State

Live snapshot of implementation progress against `docs/playbook.md`. Updated
at the end of every milestone (definition-of-done.md item 4: "committed per
convention"). Distinct from `docs/decisions.md` (spec deviations) and
`docs/backlog.md` (deferred scope) — this file only answers "what stage is
the build at."

**Last updated:** 2026-07-10
**Current milestone:** M12a — Frontend project foundation (docs/frontend/implementation-plan.md)
**Status:** ✅ Complete
**Next milestone:** M12b — Design system (tokens layer)

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
| M9 | Offline embeddings job | 1 — Backend core | ✅ Complete |
| M10 | Search endpoints | 1 — Backend core | ✅ Complete |
| M11 | Backend to production | 2 — Deploy early 🔴 | ✅ Complete |
| M12 | Frontend foundation | 3 — Frontend | 🟡 In progress (M12a done) |
| M13 | Dashboard + Products screens | 3 — Frontend | ⬜ Not started |
| M14 | Ask AI screen | 3 — Frontend | ⬜ Not started |
| M15 | Search, Visual, Detail drawer | 3 — Frontend | ⬜ Not started |
| M16 | Polish pass | 3 — Frontend | ⬜ Not started |
| M17 | Frontend to production | 3 — Frontend | ⬜ Not started |
| M18 | Docker Compose + documentation | 4 — Ship | ⬜ Not started |
| M19 | Final evaluation + hardening | 4 — Ship | ⬜ Not started |
| M20 | Video + submission | 4 — Ship | ⬜ Not started |

🔴 = red-flagged risk milestone (playbook.md).

## Open items carried into M10

- `docs/backlog.md`: Docker Compose scope conflict — resolved 2026-07-10
  (`docs/decisions.md`): playbook.md is the execution authority, stays in
  the cut order.
- `finished_goods.search_text` is generated at seed time by
  `scripts/seed_db.py::build_search_text()` (concatenates style_name,
  category, fabric, color, print, season, brand) since no source CSV column
  exists for it. **Now locked** (`docs/decisions.md`, M9) — it's the BGE
  input for all 1,000 embedded rows; changing it means a full re-embed.
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
  cosine-distance lookup on `text_embedding`. Pre-M9 it honestly returned an
  empty list (all 1,000 rows had `text_embedding IS NULL`); **M9 backfilled
  every row, and the endpoint now returns real neighbors with zero code
  changes** — verified live (WFX-3310 "Signature Brown Polo" → 6 neighbors,
  all Polo category, mostly Cotton Pique/Cotton-Spandex, all "Solid" print).
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
- **M9 (Offline embeddings job, `scripts/generate_embeddings.py`):**
  standalone owner-role script, symmetric with `seed_db.py` — no imports
  from `backend/app/`, no FastAPI, no LLM. Two independent stages, each
  resumable via `WHERE <col> IS NULL` (no checkpoint file, no `--force`
  flag): text via `BAAI/bge-small-en-v1.5` (384d), image via
  `Qdrant/clip-ViT-B-32-vision` (512d, paired with
  `Qdrant/clip-ViT-B-32-text` for M10). Model IDs verified live against
  fastembed 0.7.4's `list_supported_models()` before writing the script,
  not trusted from memory.
  - **Dependency proof run first** (biggest flagged risk: this machine only
    has Python 3.9, no 3.10/3.11, and recent `onnxruntime` often needs
    ≥3.10): `fastembed==0.7.4` installed cleanly into `backend/.venv`
    (py3.9) with no PyTorch; a live 2-sample smoke test (one string, one
    downloaded real dataset image) confirmed 384d/512d output before any
    real script code was written. `requests` and `Pillow` came in as
    fastembed's own transitive dependencies, confirmed via the actual
    install log — no new deps beyond `fastembed` added to
    `scripts/requirements.txt`.
  - Full run against real Supabase: **1000/1000 text embeddings, 1000/1000
    image embeddings, 0 download failures.** Text stage ~seconds, image
    stage the long pole (1,000 downloads via an 8-worker
    `ThreadPoolExecutor`, cached to gitignored `data/images/`, chunks of 32
    committed independently). In-script assertions (count +
    `vector_dims()`) all passed.
  - Independent verification beyond the script's own assertions: an
    out-of-band client-side check on 8 random rows recomputed vector norms
    from the raw `::text` cast — all exactly 384d/512d, norm ≈1.0
    (confirms both fastembed models really do output L2-normalized
    vectors, so `<=>` needs no extra normalization at query time).
  - Idempotency verified by an immediate second full run:
    `text stage: 0 rows to process` / `image stage: 0 rows to process`,
    zero rows touched, same 1000/1000 verification passed again.
  - Live regression, both endpoints already built in earlier milestones,
    zero code changes needed to either:
    1. `GET /products/{style}/similar` now returns real neighbors (WFX-3310
       "Signature Brown Polo" → 6 results, all Polo/Cotton Pique or
       Cotton-Spandex/Solid print) instead of the pre-M9 honest empty list.
    2. `POST /query` re-run on a `SELECT *` question (M8's known risk
       area): the SSE `rows` event's `columns` list still excludes
       `text_embedding`/`image_embedding` even though both are now real,
       non-NULL pgvector values — confirms `_strip_hidden_columns`
       (`query_pipeline.py`, added in M8) actually pre-empts the
       non-JSON-serializable-vector crash it was written to guard against,
       not just the NULL case it was tested against at the time.
  - No image download failures occurred against the real dataset, so the
    retry/skip/NULL-and-report failure path is verified only in isolation
    (a deliberately-invalid URL), not against a real transient failure —
    flagged in `docs/decisions.md`, not re-tested further since the real
    run had nothing to retry.
- **M10 (Search endpoints, `POST /search/products` + `POST /search/visual`):**
  `services/embeddings.py` (lazy `TextEmbedding`/CLIP-text singletons,
  `functools.lru_cache`-wrapped `embed_query_text`/`embed_query_visual`,
  `ServiceUnavailableError` on model download/init failure),
  `services/search.py`, `db/queries/search.py` (SQL builders reusing
  `products.py`'s `build_where_clause`/`_LIST_COLUMNS`/`_LIST_FROM`
  verbatim), `models/requests/search.py`, `models/responses/search.py`
  (`SearchHit(ProductSummary)` + `score`), `routers/search.py` (two thin
  30/min-rate-limited POST routes). `GET /products/{style}/similar` (M9)
  untouched, per plan — M10 was net-new endpoints only.
  - **Blocker found and fixed (approved before applying, full detail in
    `docs/decisions.md`):** `core/config.py`'s `Settings` inherited
    pydantic-settings' default `extra="forbid"`, so it choked on
    `DATABASE_URL_OWNER` (added to `backend/.env` in M9) and the FastAPI
    app couldn't boot at all — pre-existing since M9, invisible until M10
    needed to actually start `uvicorn`/`TestClient` for the first time
    since then. Fixed with one line (`extra="ignore"`).
  - Step-1 dependency proof (M9's pattern) run before any implementation:
    `Qdrant/clip-ViT-B-32-text` confirmed live in fastembed 0.7.4's
    `list_supported_models()`, 512d output, norm ≈ 1.0, and a matching
    text query scored meaningfully higher cosine similarity (0.334) than
    an unrelated one (0.175) against a real `image_embedding` — the CLIP
    pairing locked in M9 produces a real cross-modal signal, not just
    matching dimensions.
  - Smallest-possible refactor to satisfy the plan's reuse requirement:
    `services/products.py::_validate_categorical_filters`/
    `_row_to_summary` renamed to `validate_categorical_filters`/
    `row_to_summary` (dropped leading underscore) with the former's
    parameter generalized to a `Protocol`, so `services/search.py` imports
    both verbatim — no behavior change, one call site updated.
  - `tests/test_search_api.py`: 13 new contract-level tests (envelope
    shape, score-descending ordering, `meta.count`, empty query,
    unknown/extra body field, limit out of range, unknown categorical
    filter value with `{field, value}` details, `min_price > max_price`,
    score-math unit test, visual request rejecting filter fields, 503 on
    embedding failure) — zero model downloads, zero DB: `TestClient(app)`
    used without the `with`-context form never triggers FastAPI's
    lifespan (verified directly), so `get_nl2sql_service().train()` is
    never called; DB and embedding calls are monkeypatched at the
    `app.services.search` module level. Full suite: 78 passed (65 prior +
    13 new) in ~1.2s.
  - Live verification against real Supabase, all green (full detail in
    `docs/decisions.md`): a semantic hybrid query ("blue floral dress")
    returned score-descending, category-correct results; adding
    `category="Polo"` correctly constrained every hit; a visual query ("a
    dark garment with stripes") surfaced dark/patterned garments (CLIP
    match quality on product photos is fuzzy as the plan anticipated, but
    directionally right); an over-constrained filter combination returned
    an honest empty list; a product's own `search_text` fed back as the
    query ranked that exact product #1 with `score: 1.0`; a 32-request
    burst against `/search/products` passed exactly 30 then hit
    `RATE_LIMITED` on the 31st/32nd, while `/search/visual`'s independent
    per-route bucket was unaffected.
  - `core/guardrails.py`/`tests/test_guardrails.py` untouched — CLAUDE.md
    invariant 6 not triggered, no guardrail-relevant change in this
    milestone.
- **M11 (Backend to production) found already live** while verifying M12a
  against a deployed backend: `https://wfx-erp-explorer.onrender.com`
  responds correctly on `/api/v1/health` (`database: connected,
  nl2sql_ready: true`), `/products`, `/products/{id}/similar`,
  `/dashboard/stats`, `/filters/options`, `/search/products`, and `/query`
  (full SSE run verified, answer streamed and reassembled correctly). Marked
  Complete above on that evidence — this file hadn't been updated since the
  M11 Docker-config commit (`b7997ec`) landed.
- **M12a (Frontend project foundation, `docs/frontend/implementation-plan.md`):**
  bare Vite + React 18 + TS scaffold — `app/{main,router,providers}`, 5
  lazy-loaded route placeholders, `lib/{api.ts,sse.ts,format.ts,recents.ts}`,
  `lib/hooks/useHealth.ts`. No Tailwind/shadcn/tokens/theme — the kickoff
  brief listed those as M12a scope, but implementation-plan.md's M12a section
  states its goal as "zero visual work" and explicitly excludes them,
  reserving them for M12b; followed the locked doc after confirming with the
  requester (`docs/frontend/decisions.md` D-F19).
  - `api.ts`/`sse.ts` verified against the live Render backend (not local):
    `GET /health` success, forced `404 NOT_FOUND` on a bad style number, and
    a complete `/query` SSE run, via a throwaway esbuild-bundled Node
    harness (deleted after use, D-F21).
  - Found and logged one real doc/backend mismatch: the `/query` `done`
    event's `meta` shape is `{sql_model, sql_prompt_tokens,
    sql_completion_tokens, sql_cost_usd, answer_model, answer_prompt_tokens,
    answer_completion_tokens, answer_cost_usd, total_cost_usd}`, not the
    documented `{model, tokens, cost}` (`docs/frontend/decisions.md` D-F20).
    `sse.ts`'s `QueryDoneMeta` type matches the real payload; M12g's AICard
    footer will need to render from it.
  - `npm run build` clean (5 route chunks + shared vendor chunk); dev server
    boots and serves all routes. No headless browser tool was available to
    interactively click through the `/ask` and `*` redirects, so that part
    was verified via code review of `app/router.tsx` plus the clean build,
    not an interactive pass — flagged for a real-browser re-check at M12c.
  - `npm audit` reports a moderate esbuild/vite dev-server advisory
    (GHSA-67mh-4wv8-2f99); fixing it means jumping to `vite@8`, a breaking
    major bump out of scope for this milestone and a call for the requester,
    not made unilaterally. Dev-only; does not affect production build output.
