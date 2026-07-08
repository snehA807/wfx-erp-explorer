# Feature Development Checklist

Run top-to-bottom for every milestone/feature:

- [ ] Milestone objective and acceptance criteria read aloud (literally) before first prompt
- [ ] Relevant spec section identified (docs/…, §…)
- [ ] Files-to-touch list written; anything outside it is scope creep
- [ ] Pydantic/TS types defined before logic
- [ ] Happy path implemented and manually exercised (curl / browser)
- [ ] Error paths return the envelope (force at least one failure)
- [ ] Loading, empty, and error states covered (frontend features)
- [ ] Guardrail/validation implications considered (anything touching SQL or LLM)
- [ ] Tests written where the milestone demands them (guardrails, contracts, business rules)
- [ ] `pytest -q` / `npm run build` green
- [ ] No secrets, no `data/`, no dead code in the diff (`git diff --staged` reviewed)
- [ ] Committed per convention, pushed, auto-deploy verified if backend/frontend live
- [ ] Acceptance criteria re-checked against **production** once deployed
