# Git Branch Strategy

**Trunk-based, solo variant.** `main` is the only long-lived branch and is always deployable — Render/Vercel auto-deploy from it, so every push is a production smoke test.

- **Default:** commit directly to `main` in small, green increments. For a solo 48-hour project, PR ceremony against yourself adds latency without review value; commit quality substitutes for PR quality.
- **Exception — risk branches:** the two red-flagged milestones (M7 Vanna, M11 deploy) and any escape-hatch pivot happen on short-lived branches (`risk/vanna-accuracy`, `risk/clip-memory`). Merge with `--no-ff` so history shows the decision point; delete after merge. If the experiment fails, the branch dies and `main` never broke.
- **Never:** force-push to `main`, rebase published history, or commit with failing tests.
- **Tags:** `v0.1-backend-live` after M11, `v0.2-frontend-live` after M17, `v1.0` at submission. Tags mark the demo-safe rollback points.
- **Rollback:** `git revert` (never reset) + push; Render/Vercel redeploy previous automatically.
