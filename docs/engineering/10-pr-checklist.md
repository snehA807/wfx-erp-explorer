# Pull Request Checklist

Used only for `risk/*` branches (M7, M11, escape hatches) — trunk commits use the code review checklist directly.

**Before opening**
- [ ] Branch is ≤ 1 day old and addresses exactly one risk experiment
- [ ] Rebased on latest `main`; conflicts resolved locally
- [ ] All tests green; new behavior has new tests

**PR description (3 lines max)**
- [ ] What was risky, what was tried, what the outcome is
- [ ] Escape hatch invoked? Link the `docs/decisions.md` line
- [ ] Verification command an evaluator could run

**Merge gate**
- [ ] Full code review checklist run on the final diff
- [ ] Production implications checked (env vars? memory? new model download?)
- [ ] Merge with `--no-ff`, delete branch, verify auto-deploy, smoke-test the affected endpoint in prod

**If the experiment failed**
- [ ] Close unmerged, delete branch, one-line decision note — `main` never knew.
