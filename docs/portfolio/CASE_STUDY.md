# Case Study: Building WFX Explorer

*An engineering writeup of the decisions, tradeoffs, and failure modes behind an AI-native exploration layer over an apparel ERP.*

## Problem

Apparel sourcing and merchandising teams sit on top of relational ERP data — finished goods, suppliers, sales orders, invoices — but the people who need answers from it (merchandisers, sourcing managers, finance staff) are rarely the people who can write SQL. The standard workaround is one of three bad options: a fixed BI dashboard that only answers the questions someone thought to build, a request queue to whoever *can* write SQL, or a search box that only matches on exact keywords and misses "blue floral dress" when the record says `color: cobalt, print: floral`.

None of these scale well to ad hoc, conversational questions, and none of them make it easy to search a catalog the way a human actually thinks about garments — by what they look like, not just their tagged metadata.

## Why Existing Workflows Are Inefficient

- **Fixed dashboards answer yesterday's questions.** Every new business question is a backlog item for whoever maintains the BI layer.
- **SQL-literacy is a bottleneck, not a skill gap that should exist.** Merchandising and sourcing decisions shouldn't wait on engineering availability.
- **Keyword search misses semantic intent.** Structured filters (category, fabric, GSM) are precise but require the user to already know the taxonomy; free-text search over a catalog needs to understand meaning, not just match substrings.
- **Appearance is a real search axis apparel teams use and no keyword search captures it** — "something like this but darker" isn't a metadata query.

## Solution

WFX Explorer is a single platform addressing all four: a guarded natural-language-to-SQL pipeline for ad hoc questions, hybrid vector+relational search for semantic product queries, a dedicated visual/appearance search surface, and a live dashboard for the standing questions that *do* stay fixed (revenue, order mix). The unifying design principle across all three AI-driven features: **never hide the mechanism**. Every AI answer ships with the SQL that produced it; every search result ships with its similarity score; every blocked query still shows the SQL that got blocked. Trust in an AI-native tool is built by making it inspectable, not by making it feel magic.

## Design Decisions

**A modular monolith, not microservices.** With one engineer's time and one deployable target, splitting `nl2sql`, `search`, and `dashboard` into separate services would have bought deployment isolation at the cost of integration risk and operational overhead, for zero actual scaling benefit at this data volume. The code is layered as if it were headed toward that split (`routers → services → core → db`, services with no cross-imports into FastAPI) — so the boundary work is already done if it's ever needed — without paying for it up front.

**pgvector over a dedicated vector database.** Keeping embeddings as columns on the same relational tables they describe means a hybrid query — vector similarity *and* structured filters — is one indexed SQL statement, not an application-layer join between two systems with different consistency and latency characteristics. The cost is pgvector's HNSW index being somewhat less tunable than a purpose-built vector engine at very large scale; at the current catalog size that tradeoff is a clear win.

**Two independent security layers for generated SQL, not one elaborate one.** A regex/structure-based guardrail (single statement, `SELECT`/`WITH`-only, keyword denylist, comment rejection) sits in front of a database role that has no write grants at all. Neither layer depends on the other being correct. This was chosen over building or importing a full SQL parser: every statement on this path is LLM output, never handwritten, so the guardrail's job is narrower than general SQL validation — and the read-only database role means a guardrail defect is a bug, not an incident.

**Streaming, staged output over one big response.** The `/query` pipeline emits five SSE stages (status → sql → rows → answer tokens → done) instead of returning one payload once everything is ready. This means the user sees the generated SQL and result set while the natural-language answer is still being written — turning a multi-second AI operation into something that feels responsive within a few hundred milliseconds, and making the AI's "showing its work" the default UX, not an optional debug view.

**A deterministic answer for zero-row results.** Rather than asking the LLM to "summarize" an empty result set — a classic hallucination trap — a zero-row query short-circuits to a fixed, honest sentence with no model call at all. Cheaper and strictly more correct than the general case.

## Technical Challenges

**Getting NL2SQL to reliably produce valid, safe, on-schema SQL.** Retrieval-augmented prompting (Vanna, trained on the schema DDL, domain documentation strings, and a curated bank of question→SQL examples) rather than a single giant system prompt keeps the effective context small and relevant per question, which matters both for cost and for the model staying on-schema. Vector columns were stripped from the DDL the model actually sees — the model never needs to know `text_embedding`/`image_embedding` exist to write correct analytical SQL, and hiding them removes an entire category of "the model tried to SELECT the vector column" failures before they can happen.

**A 512MB memory ceiling meeting a multi-model inference stack.** The serving container needs to hold a retrieval vector store (Chroma, for NL2SQL's few-shot retrieval), a text embedding model (BGE-small, for hybrid search), and — as designed — an image embedding model (CLIP, for visual search) simultaneously, on a free-tier container capped at 512MB. Rather than assume this would fit, the actual constraint was verified directly: a local Docker run capped to the same memory ceiling was pushed through a real `/search/visual` request, and it was OOM-killed. That's the kind of failure that's expensive to discover in production and cheap to discover in a 10-minute local repro.

**The fix, and why it's a fallback rather than a redesign.** `services/search.py::search_visual` was changed to call the already-loaded BGE text encoder instead of loading the CLIP text encoder, matching CLIP's *image* embeddings against BGE's *text* query vector would be meaningless (different embedding spaces), so the fallback instead queries the same `text_embedding` column and index that hybrid product search already uses — same endpoint contract, same response shape, appearance queries just match against the garment's text description rather than its pixels. The CLIP image-embedding computation itself was **not** removed: `scripts/generate_embeddings.py` still backfills `image_embedding` for every product, and the HNSW index on it still exists. The fallback is a serving-path decision, isolated behind `services/search.py`, not a data-model decision — re-enabling true CLIP-based visual search is a matter of giving the container more memory and pointing one query back at the other column, not re-architecting anything.

**Keeping an SSE pipeline honest about failure.** Once a `StreamingResponse` has sent its first byte, HTTP status and headers are locked — a mid-stream failure can no longer become a normal error response, it has to become an `error` *event* on the same connection. Every exception path in `stream_query` is caught explicitly and turned into a structured `error` SSE event rather than allowed to propagate, and the frontend treats a stream that ends without ever emitting a terminal `done`/`error` event as a network failure in its own right — a dropped connection mid-generation is a real failure mode, and pretending it isn't (leaving the UI stuck on "writing answer…" forever) would be worse than surfacing it.

## Architecture Decisions (Summary)

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for full diagrams. In short: one FastAPI service, layered internally; Postgres + pgvector as the single source of truth for both relational and vector data; a React/TypeScript SPA consuming a uniformly-enveloped, typed REST + SSE API; Vanna AI + OpenRouter behind a single-module abstraction boundary; offline, idempotent, resumable embedding computation kept entirely out of the deployed request path.

## Tradeoffs

| Decision | Gained | Given up |
|---|---|---|
| Monolith over microservices | Zero integration risk, simpler deploy, faster iteration | Independent per-service scaling (not needed yet — clear split points already exist in the code) |
| pgvector over a dedicated vector DB | Single-query hybrid search, one system to operate | Some large-scale ANN tuning headroom a dedicated engine would offer |
| Guardrail + role, not a full SQL parser | Fast to build, fast to reason about, narrow attack surface actually covered | Would not catch a SQL edge case outside the narrow "LLM-generated analytical query" shape it's scoped to |
| BGE fallback for visual search | Kept the feature live under real memory constraints, zero frontend/API changes | Appearance queries currently match text descriptions, not literal pixel content, until CLIP is re-enabled |
| Synchronous training at boot | Simple mental model — the app is either fully ready or it fails to boot with a clear reason | Adds fixed seconds to cold start (acceptable: the training corpus is small) |

## Performance Considerations

- **HNSW indexes** on both embedding columns keep similarity search sub-linear as the catalog grows, rather than a full sequential scan with a distance computation per row.
- **Query embeddings are LRU-cached** (`embed_query_text`/`embed_query_visual`), so repeated or paginated searches for the same text don't re-run model inference.
- **The LLM's view of query results is capped independently of the client's.** The `rows` SSE event carries the full result set (up to the guardrail's 100-row cap) to the UI, but the answer-generation prompt only samples the first 20 rows — the two concerns (showing the user everything, keeping the summarization prompt affordable) are decoupled on purpose.
- **A single-worker process is a correctness decision that also caps throughput** — the honest tradeoff of an in-memory rate limiter, connection singleton, and trained retrieval index all living in one process. The scaling answer, if needed, is documented as a service split, not a worker-count bump (which would silently break all three in-memory assumptions).

## Lessons Learned

- **Verify resource constraints directly, early, in the actual deploy shape — don't infer them from documentation.** The CLIP/memory issue was found by reproducing the real constraint locally before it could surface as a production incident, and the fix was scoped in minutes because the failure mode was already understood, not discovered live.
- **Transparency is a design requirement for AI features, not a debug nicety.** Every design decision that surfaces the SQL, the score, or the blocked query instead of hiding it behind a friendlier message paid for itself in how much easier the system was to reason about — for the person building it and for anyone using it.
- **A narrow, well-scoped security layer beats a general one you don't fully trust.** Two independent, understandable layers (guardrail regexes + a role with zero write grants) that together cover the actual threat model were more valuable than one large, harder-to-audit SQL-parsing layer would have been.
- **Behind-the-interface fallbacks are cheap when the abstraction boundary is real.** Because `services/search.py` and `services/nl2sql.py` were the only places that knew which model or provider was in use, both the visual-search fallback and the NL2SQL provider swap were isolated, contract-preserving changes rather than cross-cutting rewrites.

## Future Roadmap

- Re-enable CLIP-based visual search once the deployment target has more memory headroom — the data and index already support it.
- Move offline embedding computation from a manual script into a queue-driven worker so new catalog entries are indexed automatically.
- Add automated regression scoring for the NL2SQL golden-query bank in CI, so prompt/training changes have a measurable accuracy signal instead of manual spot-checks.
- Introduce authenticated sessions with saved searches and query history.
- Revisit the guardrail layer if the query surface ever needs to support statements outside the current "single analytical SELECT" shape (e.g. window functions across CTEs at a complexity the current checks weren't scoped for).
