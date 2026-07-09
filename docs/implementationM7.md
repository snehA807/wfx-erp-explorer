# M7 Implementation Strategy — Vanna + Training Package

**Staff-level context check before the plan:** project-state.md says today is **Jul 10 — deadline day** — and the playbook budgeted M7 for Jul 9. You're roughly one phase behind with ~12 usable hours. That doesn't change M7's design, but it changes its discipline: the 90-minute timebox is now a **hard** gate, the escape hatch is pre-armed, and M9 (pure machine time) should be started in a second terminal *the moment M7 wiring begins*, not after. I'll flag the schedule implications again at the end.

---

## 1. High-Level Architecture

No new architecture — M7 slots into three existing seams:

- `services/llm.py` — **the only module that touches OPENROUTER_API_KEY** (CLAUDE.md invariant 4 / backend-spec §4). Constructs one configured OpenAI-compatible client pointed at OpenRouter, owns retry/timeout/token-accounting. Vanna receives this client; it never builds its own.
- `services/nl2sql.py` — `Nl2SqlService`, the orchestrator and **the abstraction boundary the escape hatch swaps behind**. Public surface for M7: `generate_sql(question) -> GeneratedSql`. Internally: Vanna retrieval → LLM call → SQL extraction → guardrails. Nothing outside this module knows Vanna exists.
- `app/vanna_training/` — the version-controlled brain: `ddl.sql`, `docs.md`, `golden_queries.yaml`. Pure data, no logic.

Vanna is composed the standard way: a small class inheriting `ChromaDB_VectorStore` (in-memory) + `OpenAI_Chat` (injected OpenRouter client). Guardrails (M6, done) and the read-only execution path are consumed as-is — M7 adds zero execution machinery.

One scope clarification: **M7 ends at validated SQL.** The endpoint shipped is `POST /query/sql` only. Execution-for-users and answer generation are M8; execution *does* happen in M7 but only inside `train_check.py` for evaluation.

## 2. Exact Request Lifecycle (`POST /query/sql`)

1. Router (`routers/query.py`) parses `{question}` via Pydantic (3–500 chars, `extra="forbid"`), calls the service, wraps the envelope. Thin, per invariant 2.
2. Service checks readiness flag (training complete?) → if not, `ServiceUnavailableError` (503 — reuse the M3 addition; this is exactly the honest-503 case it exists for).
3. Vanna retrieval — **local, zero tokens**: top-k similar golden pairs, relevant DDL, relevant doc strings from in-memory Chroma.
4. One OpenRouter chat completion (temperature 0, `LLM_MAX_TOKENS_SQL`), wrapped by `llm.py` with a single retry on transient failure.
5. SQL extraction: strip markdown fences/prose, take the statement. Extraction failure → `LLMError` (502) with a sanitized detail.
6. `core/guardrails.py` validation (M6, unchanged). Rejection → `SQLGuardrailError` (400, `SQL_BLOCKED`) **with the generated SQL in details** — transparency-on-failure is a product feature per the design spec.
7. Response: `{"data": {"sql": ...}, "meta": {"model", "prompt_tokens", "completion_tokens", "cost_usd"}}`. Surfacing cost in meta continues the M5/M6 pattern of making budget observability visible.
8. Structlog events throughout: `nl2sql_generated`, `guardrail_blocked` / `guardrail_passed`, `token_cost` — request_id bound by existing middleware.

Apply the existing M3 rate limiter to `/query*` (10/min/IP) now — it's one decorator and this endpoint spends real money.

## 3. Vanna Initialization Lifecycle

- **Module-level lazy singleton** inside `nl2sql.py` with an explicit `ready` flag, initialized from FastAPI lifespan (consistent with `db/session.py`'s lazy-singleton precedent).
- Construction: in-memory Chroma (no persistence path — determinism from files, not disk), injected OpenRouter client from `llm.py`, model/config from `core/config.py`.
- Training runs **synchronously in lifespan** — the corpus is ~34 items; after Chroma's embedding model is cached locally, this is seconds and inside the <15s acceptance criterion. First-ever run downloads Chroma's default ONNX embedding model (~80MB) — a one-time local cost; note it in project-state for the M11 Docker image (pre-bake the cache dir in the image or accept one slow cold start).
- `/health` extends its existing `models_loaded`-style reporting with `nl2sql_ready: bool`. No new endpoint.
- No retrain endpoint, no persistence, no incremental training. Process boot = full deterministic retrain from the three files. Restart *is* the retrain mechanism.

## 4. Training Strategy

Three files, all reviewed by hand before tuning starts:

**`ddl.sql` — sanitized, not verbatim.** Derived from `db/schema.sql` with the **vector columns removed** (`text_embedding`, `image_embedding`). The LLM must never see or select them — removing them from its world is cheaper and safer than instructing around them. Also strip index definitions (noise) but keep CHECKs — they teach the enum vocabularies (status, currency, payment_status) for free.

**`docs.md` — ~10 domain strings, each one retrievable fact:**
1. Revenue rule verbatim from CLAUDE.md invariant 8 (Σ qty × unit_price, INR, exclude `status='Cancelled'`).
2. **Currency trap:** `sales_invoices.amount` is in mixed currencies (INR/USD/EUR/GBP) — never sum it across currencies; all revenue math uses `sales_orders.unit_price` (INR).
3. Recency = `order_number` ordering, not `shipment_date` (the M5 decision — keep NL2SQL consistent with the dashboard).
4. Text matching is case-insensitive by convention: use `ILIKE '%term%'` for fabric/color/category/name terms.
5. GSM = grams per square meter, fabric weight, integer 100–480 in this data.
6. Season codes: SS/AW + 2-digit year (SS25, AW26…).
7. tech_packs is strict 1:1 with finished_goods on style_number.
8. sales_invoices is 1:0..1 with sales_orders; ~294 orders legitimately have no invoice — use LEFT JOIN when counting invoice presence.
9. Supplier/buyer names live in `company_name`; joins go through `supplier_id`/`buyer_id`.
10. Result etiquette: always alias aggregates; prefer explicit column lists over `SELECT *`.

**`golden_queries.yaml` — 18 pairs, composition:**
- All **9 assignment example questions** (both the Problem Context set and the AI Feature 1 set: cotton shirts by ABC Textiles, buyers above 220 GSM, blue striped shirts, highest average order value supplier, most denim supplier, black hoodies under ₹900, highest revenue buyer, pending invoices above ₹1,000 — plus the show-blue-striped variant). Evaluators will type these verbatim.
- 9 more covering the shape-space: multi-join (product→supplier→order→buyer), GROUP BY + HAVING, revenue-rule application, date filtering on shipment_date, LEFT JOIN invoice-absence, top-N ranking, AVG with rounding, a tech-pack join, a payment-status aggregate.
- Every reference SQL is **executed against live Supabase and hand-verified before it enters the file** — a wrong golden answer poisons both retrieval and the eval harness.
- Golden SQL follows the rules the prompt states (no comments — M6 guardrails block them; ILIKE; aliased aggregates; explicit LIMITs on ranking queries) so the examples model the target dialect exactly.

## 5. Startup Strategy

Lifespan order: config validation (existing) → DB singleton (existing) → NL2SQL singleton + synchronous training → ready. Local `--reload` pays a few seconds per restart; acceptable. If training throws (corrupt YAML, Chroma failure), **fail the boot loudly** — consistent with the pydantic-settings fail-at-deploy philosophy in backend-spec §6. No half-alive states: either `/query/sql` works or `/health` says why.

## 6. Prompt Strategy

Use Vanna's built-in prompt assembly (that's the point of adopting it) with a customized `initial_prompt` stating, in order of importance:
- PostgreSQL dialect; output **exactly one** statement starting with SELECT or WITH; no other text, no markdown fences, no comments of either style (comments are guardrail-fatal — telling the model this eliminates the most common self-inflicted block).
- Read-only intent framing ("you can only read data").
- ILIKE for text matching; alias aggregates; explicit small LIMIT for ranking questions.
- Never reference columns not present in the provided schema.

Retrieval breadth (Vanna's `n_results`-style knobs): all 6 DDLs (they're tiny — reliability beats the ~300 tokens saved by retrieving 3), top ~4 doc strings, top 3 golden examples. Estimated prompt: **700–1,000 tokens** — comfortably in budget.

## 7. OpenRouter Integration

- `llm.py` builds one OpenAI-SDK client: `base_url=https://openrouter.ai/api/v1`, key from `core/config.py`, model from `OPENROUTER_MODEL` env (pinned flash-class slug — swap via env, not deploy).
- Temperature 0, `max_tokens=LLM_MAX_TOKENS_SQL` (600), request timeout ~30s, exactly one retry with short backoff on 429/5xx/timeouts.
- Token accounting lives in `llm.py`: every completion logs `token_cost` (prompt/completion tokens, computed USD from a per-model rate constant) via structlog. Override/wrap Vanna's submit path so **all** its calls flow through this accounting — no untracked spend.
- Nothing else in the codebase imports the OpenAI SDK or reads the key.

## 8. Failure Handling

All mapped to the existing `AppError` hierarchy — no new error types needed beyond what exists:
- OpenRouter unreachable/exhausted/timeout after retry → `LLMError` (502, `LLM_UNAVAILABLE`).
- Un-extractable SQL from the completion → `LLMError` with a "model returned no SQL" detail (never echo raw model prose to the client).
- Guardrail block → `SQLGuardrailError` (400, `SQL_BLOCKED`, generated SQL in details).
- Service not yet trained → `ServiceUnavailableError` (503).
- Pydantic edge failures → existing 422 envelope.
Global handlers from M3 already serialize all of these; M7 adds no handler code. SSE error events are explicitly **not** in scope (M8).

## 9. Token Optimization

- Retrieval-based prompting (~700–1,000 tokens) instead of corpus-stuffing — though note honestly: the corpus is small enough that even the escape hatch's full-context prompt is only ~2.5K tokens. Token risk on this project is **iteration count, not prompt size**.
- Therefore the real optimization is process: one full `train_check.py` run = 18 LLM calls ≈ $0.02–0.04. **Budget a maximum of 4 full eval runs during tuning** (~$0.15); between runs, debug individual failing questions singly, not by re-running the suite.
- Temperature 0 (determinism = no wasted regeneration), max_tokens capped, single retry only, answer-generation call deferred to M8 (M7 spends one call per question, not two).
- Cumulative-cost visibility already lands via `token_cost` logs; eyeball it at the M7→M8 boundary against the $0.50 checkpoint.

## 10. File Layout (all within existing structure — no new top-level anything)

```
backend/app/services/llm.py            # NEW — OpenRouter client + token accounting
backend/app/services/nl2sql.py         # NEW — Nl2SqlService, Vanna subclass, singleton
backend/app/vanna_training/ddl.sql     # NEW — sanitized DDL (no vector cols)
backend/app/vanna_training/docs.md     # NEW — 10 domain strings
backend/app/vanna_training/golden_queries.yaml  # NEW — 18 verified pairs
backend/app/routers/query.py           # NEW — POST /query/sql only
backend/app/models/requests/query.py   # NEW — QuestionRequest
backend/app/models/responses/query.py  # NEW — GeneratedSqlResponse
scripts/train_check.py                 # NEW — eval harness (execute + compare + pass table)
backend/tests/test_sql_extraction.py   # NEW — extraction unit tests, zero LLM calls
```
Dependency additions (ask-first rule satisfied here): `vanna` + `chromadb` + `openai`, **pinned exact versions** in `backend/requirements.txt`, with a one-line commit-body justification per the commit convention.

## 11. Risks

1. **Local Python 3.9 vs. pinned deps** — Vanna/ChromaDB versions must be chosen to install cleanly on 3.9 while targeting 3.11 in Docker. Pin after one local `pip install` proof, before writing any service code. (Same category as the existing `from __future__ import annotations` accommodation.)
2. **Chroma's embedding-model download** — first-run ~80MB fetch; on this machine it's a one-time wait, but record the cache-dir implication for the M11 image in project-state.
3. **Accuracy below gate** — mitigated by the pre-armed escape hatch (§12) and by the corpus being small enough that the fallback is nearly equivalent in quality.
4. **`app_readonly` still not in effect** (open issue #2) — M7's user-facing endpoint doesn't execute SQL, so guardrails-only is acceptable *today*, but `train_check.py` **does** execute generated SQL against the DB as superuser. Guardrails run on every generated statement inside the harness too — make that non-negotiable in the harness design — and keep the issue as a hard M11 gate.
5. **Vanna API surface churn** — its class-composition API has moved between versions; pinning (risk 1) is the mitigation, and the `Nl2SqlService` boundary is the containment.
6. **Schedule** — see §13; M7 running long is now the single biggest project risk. The gate is: **<12/18 at the 90-minute mark → escape hatch, no deliberation** (that's Development Rule 6 — invoking it needs a decisions.md line, not a debate).

## 12. Simplifications Appropriate for the Deadline

- In-memory Chroma, no persistence, restart-to-retrain.
- `train_check.py` comparison = execute both statements, compare **sorted multisets of row tuples with float tolerance**, ignore column names/order. Crude, correct enough, cheap.
- One retry, no circuit breakers, no fallback model chain.
- No conversation history/context — every question standalone (matches the structured-card, not-a-chatbot product framing anyway).
- No confidence scores (explicitly descoped in requirements), no SQL self-repair loop (a failed generation returns its error honestly; the M14 UI already designs for that).
- **Escape hatch, pre-specified so it's a 30-minute pivot, not a design session:** same `Nl2SqlService.generate_sql` signature; internals become "concatenate all three training files into one prompt + question → same LLM call → same extraction → same guardrails." Chroma/Vanna imports quarantined behind the flag. Everything downstream (M8's SSE, the router, tests) is untouched by the swap.

## 13. Deferred to M8–M10 (explicitly not M7's problem)

- **M8:** SSE streaming, the second LLM call (natural-language answer), user-facing execution via `db/session`, zero-row honest-prose behavior, structured SSE `error` events.
- **M9:** all embedding backfill (the NULL `text_embedding` columns; `/similar` stays honestly empty). *Process note: start `generate_embeddings.py` in parallel now — it's unattended machine time.*
- **M10:** `/search/products`, `/search/visual`, the `Annotated[Model, Query()]` lesson from M4 applied there.
- **M11 gates (recorded, not acted on today):** `app_readonly` password + DATABASE_URL swap; Chroma model cache in the Docker image; pooler-URL-for-Render note already captured.
- **Docker Compose conflict (open issue #3):** resolve it now with one decisions.md line rather than carrying it further — recommended ruling: *playbook.md is the execution authority; Compose stays on the cut-order list and ships only if M18 runs on schedule.* Given today's compression, it is very likely cut — decide once, stop re-litigating.

**Final schedule note as the responsible engineer:** with M7 starting on deadline day, pre-authorize the cut order now (dynamic charts, ⌘K, Compose are gone unless a miracle occurs; M16 polish compresses to the state-coverage sweep only) and hold the 18:00 feature freeze sacred. M7's own plan above fits in 2–2.5 focused hours with the gate at 90 minutes. Ship it.