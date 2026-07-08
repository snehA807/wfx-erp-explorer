# Token Management Guidelines

## Claude Code context budget
- **Fresh session at each phase boundary** (5 sessions: data layer / backend core / AI+deploy / frontend / shipping). CLAUDE.md + docs/ rehydrate context in one read.
- **/compact** after: seed debugging converges (pre-M3), Vanna tuning converges (pre-M8), screen-building sprint (pre-M14), and any debugging detour > ~10 exchanges. Rule: compact when the conclusion matters but the journey doesn't.
- `.claudeignore` keeps data, lockfiles, media, and caches out of context — never override it.
- Don't ask Claude Code to "review the whole repo." Point it at specific files.
- Keep CLAUDE.md ≤ 150 lines; it's loaded every session.

## OpenRouter budget ($5 hard cap)
- Model: pinned flash-class slug via `OPENROUTER_MODEL`; max_tokens 600 (SQL) / 400 (answer).
- Every LLM call logs prompt/completion tokens + computed cost (`token_cost` event).
- Checkpoints: ≤ $0.50 at backend-live, ≤ $1.00 at frontend-live, ≤ $1.50 at submission. Grep: `render logs | grep token_cost`.
- Dev testing uses the 18 golden questions, not freestyle chat. Rate limit (10/min/IP) stays on in prod.
- Never loop LLM calls (no retry storms — max 1 retry with backoff).
