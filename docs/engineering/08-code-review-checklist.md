# Code Review Checklist

Self-review every diff (you are the reviewer of Claude Code's output — read it like hostile code):

**Correctness**
- [ ] Does what the milestone says — nothing more (spot uninvited refactors/features)
- [ ] Edge cases: empty result, page overflow, zero rows, missing image, LLM failure
- [ ] SQL parameterized; no string interpolation anywhere near the DB

**Architecture**
- [ ] Layering intact: router → service → db; no upward imports; no FastAPI in services
- [ ] Envelope on every response path, including exceptions
- [ ] New code lives in the right folder per CLAUDE.md layout

**Security**
- [ ] Generated SQL routed through guardrails; execution on read-only pool
- [ ] No secrets, keys, or connection strings in the diff
- [ ] Input constraints present (lengths, enums, ranges, `extra="forbid"`)

**Quality**
- [ ] Types on public surfaces; no `any`; ruff clean
- [ ] Names honest; no dead/commented code; no TODO without a backlog entry
- [ ] Frontend: tokens only, states covered, keyboard reachable

**Meta**
- [ ] Commit message matches the diff content
- [ ] Tests updated in the same commit when behavior changed
