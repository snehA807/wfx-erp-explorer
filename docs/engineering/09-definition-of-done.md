# Definition of Done

## A milestone is DONE when
1. All acceptance criteria pass, verified by command or click — not by assumption.
2. Tests required by the milestone are green (`pytest -q`).
3. Diff self-reviewed against the code review checklist.
4. Committed per convention and pushed to `main`.
5. If the service is deployed: verified working **in production**, not just locally.
6. Any spec deviation documented in `docs/decisions.md` (one line each).

## The project is DONE when
1. All five screens work on the production URLs (F1–F3 flows pass twice consecutively).
2. Golden-query eval ≥ 15/18 against production.
3. "delete all orders" is blocked gracefully in the live app.
4. Docs ≥ 3 pages with diagrams + screenshots; README reproducible; zero assignment references; zero secrets in full git history.
5. Docker Compose boots both apps locally.
6. 60-second video recorded from production, covering the five required beats.
7. Submission email sent with all six inclusions ≥ 1h before the deadline.
8. Token spend < $1.50; uptime pinger active; `v1.0` tagged.

Not done = not claimed. "Works on my machine" is not a state that exists in this project.
