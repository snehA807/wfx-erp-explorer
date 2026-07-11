# Project State

Live snapshot of implementation progress against `docs/playbook.md`. Updated
at the end of every milestone (definition-of-done.md item 4: "committed per
convention"). Distinct from `docs/decisions.md` (spec deviations) and
`docs/backlog.md` (deferred scope) — this file only answers "what stage is
the build at."

**Last updated:** 2026-07-11
**Current milestone:** M12i — Polish, Production Deployment, and Release (implementation-plan.md M12i section)
**Status:** ✅ Complete — frontend feature-complete and deployed to production
**Next milestone:** None. Per the M12i kickoff instruction, no further implementation is performed after this milestone; feature freeze is in effect.

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
| M12 | Frontend foundation | 3 — Frontend | ✅ Complete (M12a–M12i done) |
| M13 | Dashboard + Products screens | 3 — Frontend | ✅ Complete — delivered as M12d/M12e under `implementation-plan.md`'s sub-milestone plan, not this table's original per-screen split (see note below) |
| M14 | Ask AI screen | 3 — Frontend | ✅ Complete — delivered as M12g |
| M15 | Search, Visual, Detail drawer | 3 — Frontend | ✅ Complete — delivered as M12e/M12f |
| M16 | Polish pass | 3 — Frontend | ✅ Complete — delivered as M12i (this milestone) |
| M17 | Frontend to production | 3 — Frontend | ✅ Complete — delivered as M12i (this milestone): Vercel production deploy verified |
| M18 | Docker Compose + documentation | 4 — Ship | ⬜ Not started |
| M19 | Final evaluation + hardening | 4 — Ship | ⬜ Not started |
| M20 | Video + submission | 4 — Ship | ⬜ Not started |

🔴 = red-flagged risk milestone (playbook.md).

**Note on M13–M17 (added at M12i close-out):** these rows are playbook.md's
original per-screen milestone split. Actual frontend execution followed
`docs/frontend/implementation-plan.md`'s finer-grained M12a–M12i sub-plan
instead (each sub-milestone's own entry below already documents this),
which covers the same scope under different milestone numbers. This table
was never reconciled against that in real time across M12d–M12h; corrected
here at the M12i close-out rather than left showing "Not started" against
work that has in fact shipped and been verified.

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
- **M12b (Design system / tokens layer, `docs/frontend/m12b-contract.md`):**
  `styles/tokens.css` (5 regions per the contract), Tailwind 3.4.x mapping
  layer (`tailwind.config.js`, `theme.extend` only, every value a `var()`
  reference), shadcn CLI vendored into `components/ui/*` (Button, Input,
  Textarea, Select, Checkbox, Slider, Sheet, Dialog, Command, Table, Badge,
  Skeleton, Tooltip, Toast, Tabs — 15 primitives per component-library.md
  §1), the four foundation primitives (`Seam`, `SeamProgress`, `PageTitle`,
  `StatusDot`), `lib/theme.ts` (`.inset`/`data-surface` contract, z-index
  names, `usePrefersReducedMotion`), and the `/dev-tokens` QA route (10
  sections per contract §12).
  - New deps: `tailwindcss@3.4.14`/`postcss`/`autoprefixer`,
    `@fontsource/inter`+`@fontsource/jetbrains-mono` (self-hosted, no CDN),
    shadcn's peer utilities (`clsx`, `tailwind-merge`,
    `class-variance-authority`, `lucide-react`) and Radix primitives pulled
    in by the vendored components — all pre-sanctioned by the contract §11.
  - `@/*` path alias added (`tsconfig.app.json`/`tsconfig.json`/
    `vite.config.ts`) for the shadcn CLI's expected `@/components`/`@/lib`
    aliases — not used elsewhere in the codebase, which keeps its existing
    relative-import style.
  - Verified live via a throwaway Playwright harness (Chromium installed via
    `npx playwright install`, not a project dependency — deleted after use,
    same pattern as D-F21's Node harness): full `/dev-tokens` screenshot
    pass of all 10 sections, zero console errors; SeamProgress state
    stepper (idle/stitching ¼-¾/complete/error×2) driven live; contrast
    ratios measured from real computed DOM colors (not hand-typed hex),
    `usePrefersReducedMotion` + `prefers-reduced-motion` emulation confirmed
    (durations collapse to 0.01ms, card-hover lift/shadow vanish, marching
    stitch animation doesn't mount); keyboard-tab focus ring confirmed on
    both a plain link (global `outline`) and a shadcn Button (Tailwind
    `ring` utility) on both palettes; all five existing routes + `/ask` +
    an unknown path re-smoke-tested for regressions (zero console errors).
  - **Three real bugs found and fixed during live verification** (full
    detail in `docs/frontend/decisions.md` D-F23–D-F25): (1) the shadcn
    bridge redeclared `--border`/`--ring`/`--accent` under the same names
    Region 1 already used, producing a circular `var()` reference that
    silently broke `--accent` (measured live: `accent-ink` on `accent`
    scored 1.77:1 instead of ~9:1) — fixed by dropping the redundant/dead
    `--border`/`--ring`/`--radius` re-bridges and renaming shadcn's internal
    hover-chrome color to `--chrome`/`--chrome-foreground` so "accent" keeps
    one meaning (our sanctioned lime). (2) `.inset` only redefined CSS
    variables, not `color`/`background-color` themselves, so unstyled text
    inside an inset subtree kept its inherited light-mode color
    (dark-on-dark) — fixed by declaring both directly on `.inset`. (3) the
    reduced-motion override for `.card-hover:hover` was plain CSS while the
    rule it overrides is Tailwind-layered (`@layer utilities`), and Tailwind
    v3's `@layer` is a build-time relocation, not the native cascade-layers
    at-rule — the override kept its early physical position and lost;
    wrapping it in `@layer utilities` too fixed it.
  - **One conflict flagged, not fixed** (`docs/frontend/decisions.md`
    D-F26): design-system.md §1's own 4.5:1 text-contrast floor is not met
    by its own locked `success`/`warning`/`danger` hexes on their `-soft`
    tint backgrounds (measured live: 3.20:1 / 3.04:1 / 4.36:1). Hex values
    used exactly as locked per CLAUDE.md; needs a requester call before M12d
    (status Badge) consumes these as text-on-tint.
  - Two tokens added beyond design-system.md's literal enumeration
    (`docs/frontend/decisions.md` D-F22): `--ring` (derived — design-system
    specifies the constraint, not the value) and `--space-title-bottom` /
    `--content-max-width` (design-system names exact px values that don't
    fit the 4px scale).
  - Vendored shadcn files got class-level-only edits (contract §7): shadow
    tokens aligned to the 3-token elevation system (removed from static
    controls, `shadow-lg`/`-md` → `shadow-float` on floating surfaces), and
    `badge.tsx` gained `success`/`warning`/`danger` variants for M12d
    (`docs/frontend/decisions.md` D-F27).
  - Grep acceptance check (contract §13.2) clean: zero raw hex/arbitrary
    bracket values/`shadow-[`/raw duration literals in `src/` outside
    `styles/tokens.css` and `components/ui/`.
- **M12c (Layout shell, `docs/frontend/m12c-contract.md`):**
  `components/shell/{AppShell,Sidebar,MobileTabs,ColdStartBanner}.tsx`,
  `StatusDot.tsx` gained a `compact` presentation prop, `useHealth.ts`'s
  degraded/down split (§5), three new tokens (`--sidebar-width`,
  `--rail-width`, `--text-tab-*`) plus a `.pb-safe-bottom` utility in
  `tokens.css`, `tailwind.config.js` width mappings, `router.tsx`'s new
  AppShell layout route wrapping the five app routes (`/dev-tokens` stays
  outside per the contract), and PageTitle blocks on all five placeholder
  pages. Full detail on the three added tokens, the StatusDot/pb-safe
  class-level edits, the health-mapping fix, and the Ask-resting-edge
  extension to MobileTabs in `docs/frontend/decisions.md` D-F28–D-F31.
  - Sidebar/rail is one component with two responsive presentations
    (Tailwind `md`/`xl` breakpoints only, no JS media queries): 232px full
    sidebar above 1280px, 64px icon-only rail 768–1280px with labels
    moved into shadcn Tooltips (`aria-label` still carries the accessible
    name), bottom tabs below 768px. Icon sizing (18px per
    design-system.md §7) uses lucide-react's `size` prop rather than a
    Tailwind class, so no arbitrary bracket value or extra token was
    needed for it.
  - ColdStartBanner's session-once gate lives in AppShell: a ref reads
    `sessionStorage` once at mount (not state, so it can't race the first
    `isSlow` transition); the banner shows only while `triggered &&
    health === null && !dismissed` — `health` is only ever set on a
    *successful* `/health` response, so `health === null` doubles as "the
    pending check hasn't resolved successfully yet," which is what makes
    the banner auto-hide the moment it does, per the contract's exact
    wording, without needing any change to `useHealth`'s public shape.
  - **Verified live via a throwaway Playwright harness** (Chromium
    already cached from M12b, installed as a `--no-save` dependency in
    the scratchpad, not a project dependency — deleted after use, same
    pattern as D-F21/M12b): 56/56 checks green, run against the real
    production backend (`https://wfx-erp-explorer.onrender.com`) on the
    Vite dev server. Covered: 1440/1024/375px breakpoint pass + resize
    reflow across both boundaries; `aria-current` and the accent
    edge/tint correct on all five routes in all three presentations,
    including Ask's resting edge (verified faint-but-present on all three
    presentations, not just the sidebar — see D-F31); StatusDot live
    (real green pulse against production `/health`), degraded (mocked 503
    envelope) and down (aborted request) via Playwright route
    interception; ColdStartBanner appearing verbatim after a gated >3s
    `/health` response, auto-hiding on resolution, surviving navigation
    and reload without reappearing (same `sessionStorage` flag), and a
    fresh browser context showing it's eligible again; keyboard tab
    order + visible focus ring on nav items + non-trapping rail tooltips
    on focus; the D-F21 carry-over (`/ask` and an unknown path both
    redirecting to `/`, this time genuinely interactive since a headless
    browser was available); reduced-motion emulation collapsing the nav
    hover transition and the status-dot pulse to ~0; zero console errors
    across all five routes at all three widths.
  - **One test-harness-only issue found, not a product bug:** the
    backend's CORS allow-list rejects any dev origin other than Vite's
    default `http://localhost:5173` — the harness's first pass ran the
    dev server on port 5183 (chosen only to avoid a port clash) and every
    live-backend check silently degraded to "Offline" via a CORS-shaped
    network failure. Confirmed directly with a manual `OPTIONS`
    preflight (`Disallowed CORS origin`) before re-running the whole
    harness against port 5173, where every check passed cleanly.
- **M12d (Overview/Dashboard, implementation-plan.md's M12d section — no
  separate contract doc; consulted component-library.md §4 and
  design-system.md for anatomy, same as m12c-contract.md did for the
  shell):** `pages/overview/{index,useStats}.tsx`,
  `components/{StatCard,ChartCard,ResultTable,StatusBadge,EmptyState}.tsx`
  (skeleton variants colocated as named exports —
  `StatCardSkeleton`/`ChartCardSkeleton`/`ResultTableSkeleton`), one new dep
  (`recharts@2.15.4`, pre-sanctioned by CLAUDE.md's stack list — D-F33),
  `lib/api.ts` gained `getDashboardStats()` + the `DashboardStats`/
  `DashboardTotals`/`CategoryRevenue`/`OrderStatusCount`/`RecentOrder` types
  matching `backend/app/models/responses/dashboard.py` exactly. Five
  StatCards (Revenue hero, flex-wider via a 6-col grid `col-span-2` — not
  arbitrary width values, see below), two ChartCards (`hbar` revenue-by-
  category with a `/products?category=` deep-link, `donut` orders-by-status
  with no deep-link since Products has no status filter — D-F36), recent-
  orders `ResultTable` with `StatusBadge` cells.
  - **D-F26 resolved** (deferred from M12b to this exact milestone): put
    the soft-tint contrast-floor conflict to the requester directly before
    building `StatusBadge`; accepted as a soft-tint-only exception, zero
    token changes (D-F32).
  - One real mistake caught before commit, not shipped: an early draft used
    Tailwind arbitrary bracket values (`min-w-[260px]`, `h-[240px]`) for the
    hero stat card's extra width and the chart skeleton's height — both
    violate invariant 7 / the m12b-contract.md §13.2 grep check. Fixed
    before verification: the stat row uses a 6-column grid with the hero
    card at `col-span-2` (core Tailwind utility, no bracket), and the chart
    skeleton's height moved to an inline `style` prop, matching how
    `ChartCard`'s own real chart already sizes itself. Grep re-run clean
    (zero hex/bracket/duration-literal matches outside `tokens.css`/
    `components/ui/`) before the build.
  - Full detail on the Recharts version pin, `StatusBadge` naming (avoids
    colliding with `components/ui/badge.tsx`'s own `Badge` export), the
    chart accent/neutral-gray color rule, the deep-link scoping, and
    `EmptyState`'s deliberately-incomplete-for-now prop surface in
    `docs/frontend/decisions.md` D-F33–D-F38.
  - **Verified live via a throwaway Playwright harness** (M12b/M12c
    pattern, Chromium already cached, deleted after use): 22/22 checks
    green against the Vite dev server (port 5173, CORS requirement)
    proxying to the real production backend. All 5 stat values matched
    `GET /dashboard/stats` exactly (fetched independently in the same
    script as ground truth); ₹ crore formatting and `tabular-nums`
    (computed `font-variant-numeric`) confirmed on the revenue hero; a real
    bar click on the revenue-by-category chart navigated to
    `/products?category=Jacket`; skeletons appeared under a throttled
    1.5s-delayed load with ~0px measured shift on the stat row; the
    regional error state (mocked 503) rendered `EmptyState` + a working
    Retry that recovered real data with the shell (sidebar) intact;
    reduced-motion collapsed the load-cascade animation; zero real console
    errors (two expected 503 network-log lines from the deliberate mock
    excluded, D-F39). Full 8-route regression sweep (5 app routes +
    `/dev-tokens` + `/ask` and an unknown-path redirect) at 1440px: zero
    console errors anywhere. 375px visual pass confirmed MobileTabs (from
    M12c, untouched this milestone) stays correctly pinned to the viewport
    bottom via computed style + a non-stitched screenshot, after a
    stitched full-page screenshot briefly looked wrong (Chromium
    full-page-capture artifact for `position: fixed`, not a runtime bug —
    D-F39).
  - **One test-harness bug found and fixed during verification, not a
    product bug** (D-F39): the error-state mock used a request-count
    counter to serve one 503 then succeed on retry, which raced React 18
    StrictMode's dev-only double-invoked effect (mount → cleanup → mount)
    — the first (error) request's state update lost to the `cancelled`
    guard, letting the second, real request silently win before any
    assertion ran, so the error UI never appeared to check. Fixed by
    switching the mock to a persistent boolean flag instead of a counter,
    so both StrictMode-duplicated requests behave identically within each
    test phase.
  - `npm run build` clean, strict TS clean.
  - `docs/frontend/decisions.md` gained D-F32–D-F39 (this milestone's own
    entries plus the D-F26 resolution). Commit: `feat(frontend): M12d
    overview dashboard`.
- **M12e (Product Explorer, implementation-plan.md's M12e section — no
  separate contract doc):** `pages/products/{index,params,useProducts,
  Pagination,ProductsTable}.tsx`, `components/{ProductCard,DetailPanel,
  CategoryPlaceholder,FilterRail,VisuallyHidden}.tsx`,
  `lib/hooks/useFilterOptions.ts`, `lib/api.ts` gained
  `getProducts()`/`getProductDetail()`/`getSimilarProducts()`/
  `getFilterOptions()` + matching types against `backend/app/models/
  {requests,responses}/products.py` and `responses/filters.py`. Two small
  additive `tokens.css`/`tailwind.config.js` entries (`--detail-panel-
  width`, `.aspect-product`, `.grid-products`), same D-F22/D-F28 pattern as
  prior milestones — not a previous-milestone behavior change.
  `EmptyState`/`ResultTable` (M12d files) were **not** modified, per this
  session's explicit instruction; Products' table view is a page-local
  `ProductsTable` instead of a `ResultTable` reuse (D-F42).
  - Toolbar: quick-filter search input (client-side, 300ms debounce),
    sort Select (8 presets over the 5 backend sort fields × 2 orders),
    grid/table toggle, `FilterRail` toolbar variant (6 categorical Select
    facets + removable pills + "Clear all," from `GET /filters/options`).
    All state lives in URL params (`page`, `sort_by`, `order`, the 6
    categorical filters, `search`, `view`, `style`) — refresh restores the
    full view, verified live.
  - **Real doc/backend gap found and flagged, not silently worked around**
    (D-F40): navigation.md's route tree and command-palette spec both
    reference a `GET /products?search=` capability that doesn't exist on
    the frozen backend (`ProductListParams` has no `search` field,
    `extra="forbid"`). Implemented `search` as a client-side quick-filter
    over the already-fetched page instead of a fabricated backend call; a
    supplier picker was similarly omitted (no supplier facet exists to
    populate one from).
  - `DetailPanel` fetches `GET /products/{id}` and `/products/{id}/similar`
    itself (component-library.md's documented single-use fetch exception).
    Open/close rides real browser history (push on open, `navigate(-1)` on
    close) specifically so "back button closes panel and restores scroll"
    holds for both the browser Back button and the panel's own close
    controls (D-F43) — verified live within 50px, including a two-hop
    "More like this" journey and Back.
  - `npm run build` clean, strict TS clean, grep acceptance check (m12b-
    contract.md §13.2) clean.
  - **Verified live via a throwaway Playwright harness** (M12b–M12d
    pattern, Chromium cached, reinstalled at the pinned revision, deleted
    after use): **33/33 checks green** against the Vite dev server proxying
    the real production backend — full detail (including two harness bugs
    found and fixed mid-verification, neither a product bug) in
    `docs/frontend/decisions.md` D-F44.
  - `docs/frontend/decisions.md` gained D-F40–D-F44. Commit:
    `feat(frontend): M12e product explorer`.
- **M12f (Search + Visual Search, implementation-plan.md's M12f section —
  no separate contract doc):** `pages/search/{index,useSearch,params}.tsx`,
  `pages/visual/{index,useVisualSearch,VisualTile}.tsx`,
  `lib/api.ts` gained `searchProducts()`/`searchVisual()` + `SearchHit`/
  `SearchProductsParams`/`SearchVisualParams` matching `backend/app/models/
  {requests,responses}/search.py` exactly, `lib/hooks/useDetailPanelRoute.ts`
  (extracted from Products, D-F46).
  - `components/FilterRail.tsx` gained the `"full"` variant (M12e's plan
    explicitly authorized this as an M12f "Files modified" target):
    grouped checkbox facets with real counts, a GSM dual-range slider
    (`onValueCommit`, not every drag tick), active pills (incl. a GSM
    pill), collapsing to a "Filters" Sheet-trigger below xl (1280px).
    `components/ui/slider.tsx` (shadcn primitive) needed a structural edit
    to render one thumb per `value` entry — shadcn's own documented
    range-slider pattern, not a deviation (D-F45).
  - `components/ProductCard.tsx` gained an optional `matchScore` badge
    (also explicitly plan-authorized); `components/EmptyState.tsx` gained
    a `closest` prop + `onSelectClosest` for the `no-results` flavor's
    "Closest matches" mini-grid (reuses `ProductCard` at `size="compact"`,
    D-F47).
  - `pages/products/params.ts` and the new `pages/search/params.ts` both
    derive the six categorical-filter keys from `FilterRail.tsx`'s
    `CATEGORICAL_FIELDS` export instead of each redefining the list
    (D-F45) — the point at which a third independent copy would have been
    worse than a small consolidating edit.
  - **Real threshold correction, on real production data** (D-F48):
    D-F13's placeholder match-badge threshold (~0.55) was measured live
    and found to sit *inside* the score range a pure-nonsense query
    produces (0.59–0.60) — shipping it as-is would have badged random
    results as "58% match" on a garbage query. Raised to **0.65**, which
    cleanly separates every nonsense/weak-keyword query tested (≤0.65)
    from every genuinely descriptive query tested (≥0.71). `MATCH_BADGE_
    THRESHOLD` is one exported constant in `ProductCard.tsx`, shared by
    Search's `ProductCard` usage and Visual's `VisualTile` — both are
    scored by the same backend function (`embed_query_text`/BGE), since
    `search_visual` is the pre-existing M11 CLIP-OOM escape hatch
    (architecture.md §5), not a new finding this milestone.
  - `npm run build` clean, strict TS clean, grep acceptance check clean.
  - **Verified live via a throwaway Playwright harness** (M12b–M12e
    pattern, Chromium cached, deleted after use): **33/33 checks green**
    against the Vite dev server proxying the real production backend —
    full detail (including one harness bug found and fixed mid-
    verification: a simulated mouse-drag on the Radix Slider thumb never
    registered reliably in headless automation, fixed by driving it via
    keyboard instead — confirmed with a standalone debug script that the
    component itself was already correct) in `docs/frontend/decisions.md`
    D-F49.
  - `docs/frontend/decisions.md` gained D-F45–D-F49. Commit:
    `feat(frontend): M12f search + visual search`.
- **M12g (AI Query / flagship, implementation-plan.md's M12g section — no
  separate contract doc):** `pages/ask/{index,reducer,chips,AskHero,
  AskComposer,AICard,SQLBlock,UserTurn,SuggestionChips}.tsx` — the Ask page
  rewritten wholesale from M12c's PageTitle placeholder into the full AI
  workspace: dark hero (4 suggestion chips, verbatim assignment questions
  from `golden_queries.yaml` pairs 1-9, D-F18) → 250ms-ish hero collapse →
  a `useReducer` thread of `UserTurn`/`AICard` pairs → a bottom-docked
  `AskComposer`. `AICard` is the flagship: `SeamProgress` wired to the
  real backend pipeline stage names (`generating_sql`/`running_query`/
  `writing_answer`/`done`/`error`, not a looser sketch enum) → `SQLBlock`
  (keyword-tinted, collapsible, copy-to-clipboard) → `ResultTable` (inset,
  capped at 10) → streamed `ANSWER` prose with a blinking caret and
  `aria-live="polite"` → a footer sourced from the real `done` meta shape.
  Every documented state is implemented: loading (SeamProgress + status
  narration, no skeleton, per motion.md §5), streaming, `SQL_BLOCKED`
  (calm amber notice, blocked SQL kept visible, rephrase suggestion, no
  retry), other error codes (one shared danger notice + Retry, covering
  the real backend's `LLM_ERROR`/`SERVICE_UNAVAILABLE`/`INTERNAL_ERROR`
  plus a client-synthesized `NETWORK_ERROR` for a stream that ends without
  a terminal SSE event), and success.
  - Wired the existing (frozen, unmodified) `lib/sse.ts` client to the
    production `/query` endpoint — `pages/ask/index.tsx`'s `runTurn()` is
    the only consumer, translating each SSE event into a reducer action
    and detecting a dropped connection (stream ends without `done`/`error`)
    as its own `NETWORK_ERROR` case (D-F54).
  - Two small, justified deviations from implementation-plan.md's literal
    "Files modified: —": `components/shell/AppShell.tsx` now applies
    `.inset` + a `transition-colors` crossfade to `<main>` only on the Ask
    route (motion.md §3.2's light↔inset route transition needs a DOM node
    that persists across navigation — only AppShell's `<main>` qualifies;
    pre-authorized by m12c-contract.md §10), and `tokens.css`/
    `tailwind.config.js` gained a `.light` break-out scope (UserTurn's
    "small light human pill" on the now-dark Ask canvas, D-F09) plus
    `--ask-thread-max-width` (design-system.md §6's named-but-unassigned
    "760" reading measure). Full detail in `docs/frontend/decisions.md`
    D-F50–D-F54.
  - **Real live finding, not a bug:** navigation.md's J2 names asking
    "delete all orders" verbatim as the path to `SQL_BLOCKED`. Verified
    live against production: that exact phrase (and two further
    adversarial rephrasings tried this session) resolves to `LLM_ERROR`
    instead — the model refuses in prose before guardrails ever run —
    exactly matching M8's own decisions.md precedent, which already
    treated the literal phrase as the `LLM_ERROR` case and a *separate*
    adversarial prompt as the `SQL_BLOCKED` case. One adversarial attempt
    additionally produced a live LLM hallucination worth flagging (a decoy
    `SELECT 1` paired with an answer falsely claiming a row was deleted,
    with no write ever executed) — backend-frozen, flagged not fixed.
    `AICard`'s `SQL_BLOCKED` render path was verified instead via a
    deterministic mocked SSE `error` event. Full detail in
    `docs/frontend/decisions.md` D-F55.
  - `npm run build` clean, strict TS clean, grep acceptance check
    (m12b-contract.md §13.2 pattern) clean.
  - **Verified live via a throwaway Playwright harness** (M12b–M12f
    pattern, Chromium cached, deleted after use; `playwright` installed
    `--no-save` directly in `frontend/` this time for Node ESM resolution
    reasons, also deleted after use): **30/30 checks green** against the
    Vite dev server proxying the real production backend — a full J1 run
    end-to-end (SQL visible, RESULT capped at 10, streamed ANSWER with
    `aria-live`, real footer meta), SQL open-then-collapsed across turns,
    a real clipboard-backed Copy → "Copied" toast, both J2 paths
    (`SQL_BLOCKED` mocked, `LLM_ERROR` live), a mocked mid-stream
    connection drop rendering an error notice with Retry recovering to a
    real completion, Enter/Shift+Enter/Esc, a keyboard-only J1 pass,
    reduced-motion collapsing the hero transition to an instant swap, and
    a full 8-route regression sweep confirming the `AppShell.tsx` change
    is not a regression elsewhere. Full detail in
    `docs/frontend/decisions.md` D-F56.
  - `docs/frontend/decisions.md` gained D-F50–D-F56. Commit:
    `feat(frontend): M12g ai query`.
- **M12h (Command Palette + Productivity, implementation-plan.md's M12h
  section — no separate contract doc, navigation.md §5 is the full verb
  spec):** `components/shell/CommandPalette.tsx` (the palette itself +
  the exported `CommandPaletteTrigger`), `lib/hooks/useCommandPalette.tsx`
  (a small React Context provider for the shared open/close state — the
  first provider in the app, justified per m12b-contract.md §8's own
  threshold: AppShell and every page's title-block trigger are genuinely
  separate trees needing the same boolean). Global ⌘K/Ctrl+K toggle,
  four verb groups in navigation.md §5's documented order (Ask, Search
  products + up to 5 live results, Go to, Recent), inset styling with a
  top Seam (sanctioned location 1), focus trap + return-to-invoker (both
  free from Radix Dialog), a hand-rolled 150ms fade+scale open animation.
  - `components/ProductCard.tsx` gained its documented `variant: "row"`
    (D-F58) — the palette's live results are its second consumer, per
    D-F37's incremental-growth pattern. `components/shell/Sidebar.tsx`
    exported its existing `NAV_ITEMS` for reuse in the "Go to" group
    (second usage site). `components/shell/AppShell.tsx` wraps its return
    in the new `CommandPaletteProvider` and mounts `CommandPalette`
    (replacing the M12c stub-mount comment). `pages/ask/index.tsx` gained
    a small mount effect consuming `location.state.autoAsk` (D-F60) —
    reuses the page's own existing `submitQuestion()`, no duplicated
    thread logic. `pages/{overview,products,search,visual}/index.tsx` each
    pass `<CommandPaletteTrigger />` as `PageTitle`'s `actions`; Ask (no
    PageTitle, D-F01) gets a fixed-corner placement instead (D-F61).
  - **Two real doc/backend gaps found and worked around, not silently
    deviated from** (D-F57): navigation.md's literal `GET
    /products?search=` for live results doesn't exist on the frozen
    backend — the same gap M12e already found and logged as D-F40 for the
    Products toolbar. Reused the real `POST /search/products` (M10/M12f)
    instead, `limit: 5`. Separately (D-F59): `tailwindcss-animate` was
    never added as a dependency back in M12b, so the shadcn-vendored
    `animate-in`/`zoom-in-95` classes already present on
    `Dialog`/`Sheet`/`Command` are inert app-wide (a pre-existing gap, out
    of scope to fix here) — the palette's own "fade + scale 0.98→1,
    150ms" open animation is hand-rolled in `tailwind.config.js` instead,
    the same way `fade-rise`/`caret-blink`/`dot-pulse` already are, rather
    than adding a new dependency to light up dead classes elsewhere.
  - **Stretch scope cut, not attempted** (D-F62): implementation-plan.md
    names the dynamic bar-chart slot in `AICard` as the milestone's one
    optional item and lists it first in the pre-authorized cut order.
    `AICard` is untouched this milestone.
  - `npm run build` clean, strict TS clean, grep acceptance check
    (m12b-contract.md §13.2 pattern) clean.
  - **Verified live via a throwaway Playwright harness** (M12b–M12g
    pattern, Chromium cached, `playwright` installed `--no-save` in
    `frontend/`, deleted after use): **37/37 checks green** against the
    Vite dev server proxying the real production backend — ⌘K/toggle/Esc
    on all five routes including Ask (no PageTitle); real Go-to
    navigation; the Ask verb running a genuine end-to-end turn via
    `state.autoAsk`; the Search-products verb navigating to `/search?q=`;
    5 real live product results from production `/search/products`
    opening a real DetailPanel via `?style=`; Recent populated after
    those actions and confirmed hidden in a fresh session; a
    keyboard-only pass; a verified focus trap; reduced-motion emulation;
    a 375px pass (trigger + palette fit, no hardware shortcut assumed);
    zero console errors throughout, including an 8-route regression
    sweep. One harness-timing-only bug found and fixed mid-run, not a
    product bug (D-F63).
  - `docs/frontend/decisions.md` gained D-F57–D-F63. Commit:
    `feat(frontend): M12h command palette`.
- **M12i (Polish, Production Deployment, and Release, implementation-plan.md's
  M12i section):** production-quality floor pass across all five screens plus
  the Vercel deploy. No new features, no redesign — the design language stayed
  frozen throughout; every change below is a fix or a spacing/positioning
  refinement within the existing token system.
  - **Three real, previously-undetected bugs found and fixed**, all only
    surfaced by exercising a genuine multi-turn Ask session with real
    production data at 375px — prior milestones' verification passes used
    shorter or single-turn runs that never hit these paths (full detail in
    `docs/frontend/decisions.md` D-F64):
    1. **Whole-page horizontal overflow on mobile whenever an AI turn's SQL/
       Result content was wide** (e.g. a multi-column join). Root cause:
       `AppShell.tsx`'s own sidebar/content flex split (`<div className="flex
       min-h-screen">` wrapping the content column) had no `min-w-0` on the
       content column — a flex row item's default automatic minimum width is
       its content's min-content size, so a wide, unwrapped SQL line or table
       forced the *entire shell* wider than the viewport instead of scrolling
       within its own already-present `overflow-x-auto` containers
       (SQLBlock's `<pre>`, shadcn `Table`'s wrapping div). This is a
       shell-level bug, not an Ask-page one — it predates M12i and was simply
       never exercised at a narrow viewport with wide real content before.
       Fixed with `min-w-0` on `AppShell.tsx`'s content column and `<main>`,
       plus a defensive `min-w-0` chain down through the Ask thread column,
       each turn wrapper, `AICard`, `Section`, `SQLBlock`, and
       `ResultTable`'s own outer wrapper.
    2. **The fixed command-palette trigger overlapped the first message pill
       on the mobile Ask thread** — both are pinned to the top-right corner
       at 375px once the sidebar disappears. Fixed with top clearance
       (`pt-12`) on the thread column.
    3. **The Ask composer didn't behave like a docked chat input** on two
       counts: for a short thread it sat wherever normal document flow put
       it (mid-screen, with empty space below) instead of the bottom of the
       viewport, since `position: sticky` only pins during scroll and does
       nothing when there's no overflow to scroll past; and its `bottom-4`
       offset didn't know about the fixed mobile tab bar, so on a long
       thread it would pin itself partially behind it. Fixed with
       `min-h-screen` on the thread column + `mt-auto` on the composer
       (docks it to the bottom of the viewport-height box when the thread is
       short) and a new `.composer-dock` utility in `tokens.css` (mobile
       clearance for `MobileTabs`' real height + `env(safe-area-inset-bottom)`,
       collapsing to the ordinary `--space-4` edge gap at `md:`).
  - **Viewport utilization fix, not a bug**: Search's `FilterRail` (`variant:
    "full"`) rendered as a plain block, so its facet list (dozens of rows)
    forced the whole page to its height even when the results column was a
    single short `EmptyState` (the pre-query invite state) — most of that
    height was pure unused canvas next to the short results column. Made the
    desktop rail `sticky` + independently `overflow-y-auto`-capped via a new
    `.filter-rail-scroll` utility (`tokens.css`), so a long facet list
    scrolls in place instead of dictating page height. No behavior change to
    the facets themselves; the mobile/tablet Sheet-trigger variant is
    unaffected.
  - Removed the `/dev-tokens` QA route and its eleven files (`app/router.tsx`,
    `pages/dev-tokens/*` deleted) per the plan's explicit instruction — the
    catch-all route now redirects it to `/` like any other unknown path,
    verified live.
  - `vercel.json` (SPA rewrite) created — implementation-plan.md's M12a entry
    had it listed as a file this scaffold would eventually need but
    explicitly held it until this milestone's deploy.
  - **Vercel deploy**: the interactive `vercel login` OAuth handshake fails
    from this session's sandboxed shell environment (`fetch failed` /
    intermittent `403` from `api.vercel.com` — the CLI's own output shows it
    fingerprinting the caller as an agent). Confirmed this isn't a local
    network issue (raw `curl` to `vercel.com` succeeds); the login flow
    itself is what doesn't complete non-interactively here. Per the
    requester's choice, the deploy was performed by the requester directly
    from their own terminal, following a command-by-command walkthrough
    (login → link → set `VITE_API_BASE_URL` → `vercel --prod`) provided in
    conversation, not committed as a separate doc since it's a one-time
    operational runbook, not project state. Production URL:
    `https://wfx-explorer.vercel.app`. `.vercel/` added to the root
    `.gitignore` ahead of the link step; the Vercel CLI also auto-generated
    its own `frontend/.gitignore` (`.vercel`, `.env*`) during the requester's
    `vercel link`, kept as-is (harmless, standard CLI behavior).
  - **Render CORS**: the deployed backend's `CORS_ORIGINS` env var (`backend/
    app/core/config.py` → `main.py`'s `CORSMiddleware`) required the new
    Vercel origin; the requester added it directly on Render (backend is
    frozen — not a change made from this session). Verified live via a raw
    `OPTIONS` preflight against the production backend with `Origin:
    https://wfx-explorer.vercel.app`: `access-control-allow-origin` echoes
    the origin back correctly.
  - `npm run build` clean, strict TS clean (5 route chunks, down from 6 with
    `/dev-tokens` gone), grep acceptance check (m12b-contract.md §13.2
    pattern: zero raw hex/px/bracket values outside `tokens.css`/
    `components/ui/`) clean.
  - **Verified live via a throwaway Playwright harness** (M12b–M12h pattern,
    `playwright` installed `--no-save` in `frontend/`, deleted after use),
    run twice — once against the Vite dev server proxying production (during
    the fix/inspect loop) and once directly against the live production URL
    post-deploy: **43/43 checks green** on the production run — full 8-route
    sweep (5 app routes + `/dev-tokens`/`/ask`/an unknown path all redirecting
    to `/`) at both 1440px and 375px with zero horizontal overflow anywhere;
    a direct hard-navigation hit on `/products` (not a client-side route
    change) confirming the `vercel.json` SPA rewrite; the sidebar status dot
    reading "Live" from the real production `/health`; a complete J1 turn
    end-to-end against the live production backend (SQL visible, a real
    streamed answer, zero overflow after completion); the same J1 turn at
    375px confirming the composer no longer overlaps `MobileTabs`; Products
    grid + DetailPanel, Search with a real query, and the command palette all
    verified against the live production backend; zero console or failed-
    request errors across every check. J2 (SQL_BLOCKED), reduced-motion, and
    keyboard-only passes were re-confirmed against the dev-proxying run
    (already covered end-to-end in M12g/M12h and unaffected by this
    milestone's changes) rather than re-run a third time against production.
  - `docs/frontend/decisions.md` gained D-F64. Commit: `feat(frontend): M12i
    polish, deploy, release`.
