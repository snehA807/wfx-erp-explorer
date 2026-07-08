# Prompting Guidelines (Claude Code)

1. **Reference, don't paste.** Every prompt = one sentence of intent + file pointers: "Read docs/backend-spec.md §5. Implement core/guardrails.py per spec." Never inline a document that's in the repo.
2. **One milestone per conversation thread.** Don't mix frontend questions into a backend thread — context bleed causes wrong-file edits.
3. **Plan-first on HIGH-risk milestones** (M7, M8, M11): "Give me a short implementation plan, wait for approval." Approve, then "implement the plan." A wrong plan costs 50 tokens; a wrong implementation costs 5,000.
4. **Debugging format:** paste the traceback/error + failing command only. Say "read the relevant file yourself." Never paste whole files.
5. **Constrain the diff:** end risky prompts with "touch only <files>; no refactors; no new dependencies."
6. **Acceptance criteria in the prompt** for anything non-trivial: "Done when: pytest tests/test_guardrails.py passes all 20 cases."
7. **After incorrect output, correct — don't restart.** State precisely what's wrong ("the LIMIT injection appends inside the CTE; it must wrap the outer statement") rather than re-prompting from scratch.
8. **Phase 4 prompts start with "Fix only the following. No other changes."** Late-stage agents refactor uninvited.
9. **Ask for verification commands**, not assurances: "show me the command to prove this works."
