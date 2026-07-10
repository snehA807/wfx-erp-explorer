# Frontend Decisions Log

Long-term memory for implementation. Append-only; every deviation from the
docs in this folder gets a dated line here before the deviating commit.

## D-F01 — AI-first: Ask is the home page (`/`)
The product thesis is "asking is the primary interface"; the homepage is a
thesis statement. First-open experience = the dark ask hero with one-click
example chips, not stat cards. Overview remains one click away. Trade-off
accepted: returning daily users are status-first; for this product's audience
(first-impression evaluation), ask-first wins. `/ask` redirects to `/`.

## D-F02 — Light-first with dark machine surfaces (Direction C)
Dense tabular reading favors light; deadline risk of full-dark (double
calibration of charts/badges/images) is unaffordable; and full-dark erases the
semantic grammar. Dark is reserved for machine surfaces only: the Ask screen,
AI cards, SQL blocks, the command palette. Light = the human's data; dark =
the machine thinking. The theme is information architecture, not preference.

## D-F03 — The Running Stitch (Seam system) is the sole signature
Domain-true (thread/stitching from apparel), thesis-true (the human/machine
boundary rendered as a literal seam), app-wide, and cheap (one dash spec + one
animation). Hard budget: four sanctioned locations (design-system §12); the
animated form exists only as SeamProgress on AI cards. A fifth location is a
logged decision, not a vibe.

## D-F04 — Lime is a marker, never a message
`#C8F542` fails contrast as text on light (~1.4:1). Sanctioned: active-nav
edge, selected pills, chart highlight, inset focus glow, seam stitches, status
dot. Text-bearing lime fills pair with `--accent-ink` only. Primary actions are
near-black — usability over aesthetic per the approved challenge round.

## D-F05 — No global state library, no query-cache library
Five screens, one user, small state budget. URL params carry filter/sort/page/
detail state (shareability + deep links); useReducer carries the ask thread;
sessionStorage carries palette recents. Adding TanStack Query/Zustand would be
a new dependency (repo rule: ask first) buying nothing at this scale. Revisit
threshold: the moment two pages need the same server cache.

## D-F06 — SPA, client-only, route-lazy
No SEO/auth/multi-tenant requirements; Vercel rewrite handles deep links. SSR
would add build/deploy risk hours before freeze for zero evaluator-visible
benefit.

## D-F07 — Detail is a panel, not a page
Master–detail (per the approved Salesforce-reference reading): grid + scroll
position survive; one component serves three pages + palette. URL-driven
(`?style=`) so back-button and sharing still work.

## D-F08 — Command palette is verb-first and machine-styled
Ask / Search-with-live-results / Go-to / Recent — Raycast-grade verbs, not a nav
switcher. Renders on inset tokens (it is a machine surface). Recents are
sessionStorage only: no backend history endpoint exists and the backend is
frozen; inventing one violates the API contract.

## D-F09 — Chat framing rejected in the AI thread
Full-width structured AI cards (SQL → Result → Answer) with small light user
pills — a query console with language input, not a chatbot (the assignment's
own framing). No avatars, no bubbles for the machine, no conversation memory.

## D-F10 — Error rendering branches on envelope codes
`error.code` (SQL_BLOCKED, LLM_UNAVAILABLE, …) is the contract; message strings
are display-only. Guardrail blocks are styled as a calm, visible product
feature — blocked SQL stays on screen (transparency builds trust, and the
evaluator will test it).

## D-F11 — Skeletons over spinners; streaming is its own loading state
Geometry-matched skeletons everywhere a layout waits (zero CLS). The AI card
never shows a skeleton: SeamProgress + the status narration line *are* its
loading state. Spinners exist only inside buttons.

## D-F12 — Cold-start banner
Render free tier sleeps. If first /health exceeds 3s: one dismissible,
once-per-session banner naming the cause honestly. Converts the worst
free-tier moment into evidence of production awareness.

## D-F13 — Match badges thresholded
Cosine scores below ~0.55 hide their badge — weak matches shouldn't advertise
weakness. Final threshold tuned on production data at M12f acceptance;
record the number here when set.

## D-F14 — Images are untrusted
Dataset shares images across ~200 products and URLs can rot: fixed 4:5 frames,
lazy load, onError → CategoryPlaceholder. Duplicate-image similarity hits are
expected behavior, noted in the technical doc, not a bug.

## D-F15 — Tailwind pinned to 3.4.x
shadcn + token-mapping workflow verified against v3 config format; a v4
migration is post-deadline concern. Pin recorded to stop drive-by upgrades.

## D-F16 — Accessibility floor, honestly scoped
Landmarks, labels, visible focus, keyboard-complete J1, aria-live on the
streamed answer, color+text status, contrast on both palettes, reduced-motion
full coverage (motion.md §6 — seam progress degrades to per-stage jumps, and
the status text always carries the same information). Consciously skipped:
full ARIA grid semantics and exhaustive focus-trap auditing — half-tested ARIA
is worse than clean semantics; logged as future improvement.

## D-F17 — Analytics = language, not a page
No invented analytics backend. Analytics surface = Overview's two charts with
deep-links + every NL2SQL result table; the dynamic-chart-from-SQL stretch has
a reserved slot in AICard and ships only per the cut order. Framed in the
technical doc as deliberate: analytics through asking.

## D-F18 — Suggestion chips are the assignment's example questions, verbatim
Defined once in `pages/ask/chips.ts`. The evaluator's first click must be a
guaranteed, impressive success; these are the questions the golden set was
tuned on (M7).

## D-F19 — M12a scope held to implementation-plan.md's letter, not the kickoff prompt
The kickoff instructions for M12a listed Tailwind, shadcn/ui, theme foundation,
and design tokens as in-scope. implementation-plan.md's M12a section states its
goal as "zero visual work" and explicitly lists "tokens, shell, any styled
component" as out of scope, reserving Tailwind install, `tailwind.config`,
shadcn vendoring, and the token layer for M12b. Followed the locked doc: M12a
shipped a bare Vite + React 18 + TS scaffold, routing, and the API/SSE client
layer only — no CSS framework, no component library, no tokens. Confirmed with
the requester before implementing.

## D-F20 — `POST /query`'s `done` event `meta` shape differs from the documented one
component-library.md's AICard spec and design-system.md §11 document the SSE
`done` event's `meta` as `{model, tokens, cost}`. Verified live against the
deployed backend (`https://wfx-erp-explorer.onrender.com`): the actual payload
is `{sql_model, sql_prompt_tokens, sql_completion_tokens, sql_cost_usd,
answer_model, answer_prompt_tokens, answer_completion_tokens, answer_cost_usd,
total_cost_usd}` — split per LLM call (SQL generation vs. answer generation),
not a single flat trio. Per instruction, trusting the deployed backend over
the doc. `lib/sse.ts`'s `QueryDoneMeta` type matches the real payload. M12g
(AICard footer) should render from this real shape — the "model · tokens ·
cost" footer copy in design-system.md §11 still applies, just sourced from
richer fields (e.g. sum `sql_cost_usd + answer_cost_usd` for a single cost
figure, or show both calls — a call for M12g, not resolved here).

## D-F21 — M12a live-backend verification method
implementation-plan.md's M12a acceptance requires proving `api.ts`/`sse.ts`
against the live Render backend. Verified via a throwaway Node harness
(bundled with esbuild, `import.meta.env.VITE_API_BASE_URL` statically defined,
deleted after use — not a shipped artifact): `GET /health` (success),
`GET /products/{bad-id}` (forced `404 NOT_FOUND`), and a full `POST /query`
SSE run (`status -> sql -> status -> rows -> status -> answer* -> done`,
answer reassembled correctly from token deltas). All match architecture.md's
documented envelope/SSE contract exactly except D-F20 above. No headless
browser tool was available in this environment, so the 5-route/redirect
behavior was verified via a clean `npm run build` (5 lazy chunks) + dev-server
boot + code review of `app/router.tsx`, not an interactive click-through —
flagging so M12c's shell work re-checks this in a real browser.
