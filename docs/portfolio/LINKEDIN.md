# LinkedIn Project Description — WFX Explorer

A professional, engineering-focused post/description. Not promotional copy — written the way you'd actually explain the project to another engineer.

---

## Post version

```
Spent the last stretch building WFX Explorer — a full-stack AI platform over
a relational apparel ERP (finished goods, suppliers, sales orders, invoices).

The core problem: business users needed to ask ad hoc questions of the data
without writing SQL, and search a product catalog by meaning and appearance,
not just exact keyword matches.

A few things I found genuinely interesting to build:

→ A natural-language-to-SQL pipeline (Vanna AI + an OpenRouter-hosted LLM)
  that streams its own reasoning: generated SQL, query results, and a
  written answer all arrive as separate stages over one SSE connection, so
  the UI shows its work instead of waiting on one big response.

→ Two independent safety layers on generated SQL — a deterministic
  guardrail (single statement, SELECT/WITH-only, keyword denylist, no SQL
  comments) in front of a database role with zero write privileges. Neither
  layer trusts the other to be sufficient alone.

→ Hybrid search where vector similarity (pgvector, HNSW) and structured
  filters live in the same SQL statement — not a vector-search API and a
  SQL API stitched together client-side.

→ A real capacity constraint that shaped a real decision: running an LLM
  retrieval store plus two embedding model families (BGE + CLIP) in a
  512MB container. I reproduced the memory ceiling locally, found that the
  image embedding model was the one that didn't fit, and shipped a
  same-contract fallback rather than let it become a live incident.

Full architecture writeup and case study are in the repo if you want the
details: [repo URL]
Live demo: [demo URL]

#softwareengineering #fullstack #ai #llm #postgresql #react #fastapi
```

---

## Shorter version (for a "Featured" section blurb, ~500 characters)

```
WFX Explorer — a full-stack AI platform over a relational apparel ERP:
natural-language-to-SQL querying with a two-layer safety model, hybrid
vector + relational product search, and a separate visual search pipeline.
Built and deployed solo (React, FastAPI, Postgres/pgvector, OpenRouter),
with every non-obvious design decision — including a real production
memory constraint — documented in the repo's case study.

[repo URL] · [demo URL]
```

---

### Notes
- Both versions link out to the repo rather than trying to explain everything inline — LinkedIn rewards a strong hook + a reason to click through, not an exhaustive writeup in the post itself.
- Swap the four `→` bullets in the long version for whichever two or three are most relevant if you're posting into a specific community (e.g. lead with the guardrail/security bullet for a security-adjacent audience, the SSE/streaming bullet for a product-engineering audience).
- Replace `[repo URL]` / `[demo URL]` before posting.
