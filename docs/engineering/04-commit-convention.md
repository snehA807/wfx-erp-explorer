# Commit Convention

Conventional Commits, scoped to this repo:

```
<type>(<scope>): <imperative summary ≤ 72 chars>

[optional body: why, trade-off, or dependency justification]
```

**Types:** `feat` `fix` `docs` `test` `chore` `refactor` `perf`
**Scopes:** `db` `api` `ai` `search` `web` `scripts` `deploy` `core`

Rules:
- Imperative mood ("add", not "added"); no trailing period; lower-case after colon.
- One logical change per commit. If the summary needs "and", split it.
- Body required when: adding a dependency, deviating from a spec, or invoking an escape hatch.
- Never commit: failing tests, commented-out code, secrets, `data/` files.

Examples:
- `feat(core): SQL guardrail layer with block/allow test suite`
- `fix(web): preserve scroll position when product drawer closes`
- `docs: technical documentation with architecture diagrams`
- `feat(ai): fall back to retrieval prompting for NL2SQL` + body citing decision note.
