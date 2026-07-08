# Development Rules

1. **One milestone at a time.** Work only on the current playbook milestone. Anything out of scope goes to `docs/backlog.md`, not into the diff.
2. **Green before next.** A milestone is complete only when its acceptance criteria pass. Never stack unfinished work.
3. **Commit on green.** Every passing acceptance criterion = a commit, pushed immediately. Small commits are the audit trail.
4. **Spec is law.** docs/ specs win over improvisation. If a spec is wrong, change the spec first (one-line note), then the code.
5. **No new dependencies without a reason written in the commit body.**
6. **Escape hatches are pre-approved:** Vanna → direct retrieval-prompting (same service interface); CLIP → BGE text fallback for visual search. Invoking one requires a docs/decisions note, not deliberation.
7. **Feature freeze at Jul 10, 18:00.** After that: demo-breaking fixes only.
8. **Never debug in production first.** Reproduce locally against Supabase, fix, push, verify.
9. **Secrets discipline:** keys exist only in Render/Vercel dashboards and local `.env`. Run `git log -p | grep -i "sk-or"` before submission.
10. **Sleep is on the critical path.** No commits between 01:00–07:00.
