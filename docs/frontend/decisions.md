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

## D-F22 — Two tokens added beyond design-system.md's literal enumeration (M12b)
Both are values design-system.md names in prose but never assigns a CSS
variable to, so m12b-contract.md §13's "adding a token = one-line rationale"
applies:
1. `--ring` (`hsl(75 90% 32%)` / `#769B08`): m12b-contract.md §10 specifies
   "a darkened accent derivative... must pass ≥3:1 against both --bg and
   --surface" but not the exact value. Held the accent hue/saturation
   (75°/90%) and lowered lightness to the minimum clearing 3:1 against both
   (measured: 3.25:1 vs `--surface`, 3.11:1 vs `--bg`).
2. `--space-title-bottom` (40px) and `--content-max-width` (1320px):
   design-system.md §3 ("Title block bottom margin 40 — the one place
   generous air is spent") and §6 ("Main column max-width 1320") name exact
   pixel values that don't fit the 4px space scale or need a dedicated
   utility. Named as their own tokens rather than arbitrary Tailwind bracket
   values, to keep the grep check in m12b-contract.md §13 meaningful.

## D-F23 — shadcn bridge variable names collided with our own token names (M12b, real bug)
tokens.css Region 3 originally redeclared `--border`, `--ring`, and `--accent`
in `:root` to bridge shadcn's expected variable names — but Region 1 already
defines raw tokens under those *exact* names for our own semantic system.
Custom properties don't merge on a name collision in the same scope; the
later declaration wins, and since `--border-current`/`--ring-current`
themselves reference `var(--border)`/`var(--ring)`, this produced a genuine
**circular var() reference** (`--border` -> `var(--border-current)` ->
`var(--border)` -> ...), which CSS resolves to the guaranteed-invalid value.
Caught live: `/dev-tokens`' contrast table measured `accent-ink on accent` at
1.77:1 (expected ~9:1) because `--accent` had been silently overwritten to
`var(--border-current)` (a neutral grey), not lime.
**Fix:** removed the redundant `--border`/`--ring`/`--radius` bridge
redeclarations entirely — nothing in tailwind.config.js's app-facing `border`/
`ring` keys ever referenced them (they resolve to `--border-current`/
`--ring-current` directly), so the bridge declarations were dead weight *and*
the bug source. shadcn's internal hover/selected chrome color (Select/
Command/Button/Dialog-close, which use `bg-accent`/`text-accent-foreground`
in their default source) is now bridged under a distinct name, `--chrome`/
`--chrome-foreground` (assigned from `--border-current`/`--text-current`,
same neutral tint as before) — `components/ui/{button,command,dialog,select}.tsx`
edited to reference `bg-chrome`/`text-chrome-foreground` instead of
`bg-accent`/`text-accent-foreground`, both a bug fix and consistent with
D-F04: "accent" stays a single, unambiguous meaning (our sanctioned lime),
never a generic hover-chrome color repeated on every keyboard-highlighted
palette/select row.

## D-F24 — `.inset` needed an explicit `color`/`background-color`, not just redefined variables (M12b, real bug)
Region 2 originally only redefined the `--*-current` custom properties on
`.inset`. `color` is inherited, but CSS inheritance carries an already-
*computed* value down the tree — an element with no explicit `color`
declaration of its own keeps whatever it inherited from `body` (resolved
against the light-mode `--text-current`), even after `.inset` redefines the
variable for its subtree. Caught live: the ".inset block" heading on
`/dev-tokens` rendered dark-on-dark, illegible. Fixed by declaring
`background-color: hsl(var(--bg-current))` and `color: hsl(var(--text-current))`
directly on the `.inset` rule itself, making it a real inheritance root —
this is what actually delivers m12b-contract.md §8's "zero component-level
awareness" promise; redefining the variables alone was not sufficient.

## D-F25 — Reduced-motion override needed the same `@layer utilities` wrapper as the rule it overrides (M12b, real bug)
Tailwind v3's `@layer` is a build-time relocation done by PostCSS — content
inside `@layer utilities {}` is physically moved to the `@tailwind utilities;`
position and the wrapper is stripped; it is *not* the native CSS
cascade-layers at-rule. The `@media (prefers-reduced-motion: reduce)` block
was written as plain (unwrapped) CSS in tokens.css, which is `@import`ed
before `@tailwind utilities;` in index.css — so it kept its early physical
position in the compiled output, landing *before* the hoisted
`.card-hover:hover` rule instead of after it, and losing at equal
specificity despite reading later in the source. Caught live: under emulated
`prefers-reduced-motion: reduce`, a hovered `.card-hover` still computed
`transform: matrix(1,0,0,1,0,-2)` (the -2px lift) instead of `none`. Fixed by
wrapping the whole reduced-motion block in `@layer utilities` too, so it
hoists to the same position and wins by source order within that layer.
Verified via Playwright with `page.emulateMedia({ reducedMotion: "reduce" })`.

## D-F26 — Locked status colors fail their own contrast floor on `-soft` tints (M12b, flagged not fixed)
design-system.md §1 requires "every text token ≥ 4.5:1 on its designated
surface" and separately locks `--success`/`--warning`/`--danger` and their
`-soft` tint backgrounds as literal hexes. Measured live (real computed
colors, not estimated) on `/dev-tokens`' contrast table:
`success` (#16A34A) on `success-soft` (#F0FDF4) = **3.20:1**, `warning`
(#D97706) on `warning-soft` (#FFFBEB) = **3.04:1**, `danger` (#DC2626) on
`danger-soft` (#FEF2F2) = **4.36:1** — all below the doc's own 4.5:1 floor
for status-on-tint text. Per CLAUDE.md ("flag conflicts instead of silently
deviating") and this contract's own header ("If anything here appears to
conflict with those documents, they win and the conflict is logged..."), the
hex values were used exactly as locked rather than altered unilaterally.
Needs a call from the requester before M12d (Badge/status consumption):
either accept as a soft-tint-only exception (common in status-badge systems,
where the surrounding badge shape + icon/label carries meaning, not raw
WCAG-AA text contrast), or darken the three text colors slightly when used
specifically on their own soft tint (not elsewhere, since `--success` etc.
alone on `--bg`/`--surface` pass comfortably).

## D-F28 — Three shell-structural tokens added beyond design-system.md's literal enumeration (M12c)
Same D-F22 pattern: each is named in prose (navigation.md/m12c-contract.md)
but never assigned a CSS variable there.
1. `--sidebar-width` (232px) and `--rail-width` (64px): navigation.md §4
   names both pixel values ("232px fixed"; "collapses to 64px icon rail")
   but they're shell-structural constants, not design-system spacing
   values, so per m12c-contract.md §2 they live as their own tokens rather
   than arbitrary Tailwind bracket values. Mapped into `tailwind.config.js`
   as `width.sidebar`/`width.rail` so component code writes `w-sidebar`/
   `w-rail`, never `w-[232px]`.
2. `--text-tab-size` (11px, + `--text-tab-weight`/`--text-tab-lh`
   companions): m12c-contract.md §4 — 11px isn't in the type scale (micro
   is 12px) but navigation.md §6 names it explicitly for mobile tab
   labels. Composed into a `.text-role-tab` class in tokens.css's
   components layer, matching the existing eight type-role classes'
   pattern exactly, rather than a one-off Tailwind arbitrary value.

Icon sizing (18px nav icons per design-system.md §7) did **not** need a
token: lucide-react icons accept a `size` prop (`<Icon size={18} />`),
which sets width/height as element attributes rather than a Tailwind
class — no arbitrary bracket value is ever written, so no token was
needed for it.

## D-F29 — StatusDot's `compact` prop and mobile safe-area padding are ordinary class-level edits (M12c)
Two small additions authorized directly by m12c-contract.md, not
independent decisions, logged here only for the "adding a token/utility"
paper trail:
1. `StatusDot.tsx` gained a `compact?: boolean` prop (m12c-contract.md
   §3): when set, the label span gets Tailwind's built-in `sr-only`
   utility instead of being removed — the accessible name survives, only
   the visual label is hidden, for the rail footer's compact presentation
   (full label surfaces via an enclosing Tooltip instead).
2. `tokens.css` gained a `.pb-safe-bottom` utility
   (`padding-bottom: env(safe-area-inset-bottom)`) for MobileTabs'
   home-indicator clearance (m12c-contract.md §4). `env()` has no
   Tailwind utility and doesn't match the grep-forbidden arbitrary-bracket
   pattern either way, but a named utility class was preferred over an
   inline arbitrary value to keep the pattern consistent with every other
   custom utility in the file (`.card-hover`, `.img-zoom-frame`, etc).

## D-F30 — `useHealth`'s degraded/down split, resolved per m12c-contract.md §5
Pre-M12c, `useHealth`'s catch block mapped every thrown error (network
failure *or* a reachable-but-unhealthy backend) to `"down"`, so `degraded`
was dead code — nothing could ever produce it. Fixed per m12c-contract.md
§5's explicit mapping: an `ApiError` with a non-null `status` (the backend
answered, e.g. `api.ts`'s 503 envelope on a DB outage) now maps to
`"degraded"`; only a true network-level failure (`ApiError.status ===
null`, set by `api.ts`'s fetch-rejection branch) maps to `"down"`. Verified
live via Playwright route interception: a mocked 503 `/health` response
renders "Degraded"; an aborted request renders "Offline"; the real
production backend (reachable, `status: "ok"`) renders "Live" with the
pulsing dot.

## D-F31 — Ask's resting accent edge extended to MobileTabs, not just Sidebar (M12c)
m12c-contract.md §3 (Sidebar) explicitly specs Ask's faint resting edge at
non-active reduced opacity; §4 (MobileTabs) only says "Active = the
sidebar's active treatment rotated to this geometry" without repeating the
resting-edge clause verbatim. Read "the sidebar's active treatment" as
including the resting edge (it's part of that treatment as a whole), which
also matches m12c-contract.md §11 acceptance criterion 3's literal
wording: "Ask shows its faint resting edge whenever another route is
active" stated under the same "in all three presentations" umbrella as the
rest of the active-state checks. Implemented identically to Sidebar: the
top-edge indicator renders at all times for the Ask tab, full accent when
active, 30% opacity otherwise. Verified via Playwright across all five
routes at 375px.

## D-F27 — Vendored shadcn files: shadow-token alignment + Badge status variants (M12b)
Class-level edits only (m12b-contract.md §7), each vendored file carries a
one-line `// wfx:` header comment naming the change:
- Removed `shadow`/`shadow-sm`/`shadow-md`/`shadow-lg`/data-active `shadow`
  from `button.tsx`, `input.tsx`, `textarea.tsx`, `checkbox.tsx`, `slider.tsx`,
  `tabs.tsx` (static controls — design-system.md §4 "Nothing else casts
  shadow" beyond cards/floating surfaces) and swapped `shadow-lg`/`shadow-md`
  → `shadow-float` in `sheet.tsx`, `dialog.tsx`, `toast.tsx`, `select.tsx`
  (the exact floating surfaces §4 names: DetailPanel/Sheet, dialogs, toasts,
  dropdowns).
- `badge.tsx`: added `success`/`warning`/`danger` variants (soft-tint
  background + solid status text, no border — design-system.md §1/§8), per
  §7's own instruction that the recipe belongs here so "M12d consumes rather
  than invents." Tint choice for the demonstration matrix on `/dev-tokens`
  (order/payment status → variant) is a dev-tokens-only prototype, not a
  locked mapping — the real `kind`/`value` → tint logic is M12d's custom
  status Badge component.

## D-F32 — D-F26 contrast conflict resolved: soft-tint exception accepted (M12d)
D-F26 flagged that the locked `success`/`warning`/`danger` hexes fail
design-system.md §1's own 4.5:1 text-contrast floor when used as text on
their matching `-soft` tint background (measured: 3.20:1 / 3.04:1 / 4.36:1),
and deferred the call to M12d's status Badge consumption. Put to the
requester directly before building `StatusBadge`: accept as a soft-tint-only
exception, per the option D-F26 itself named as plausible ("common in
status-badge systems, where the surrounding badge shape + icon/label carries
meaning, not raw WCAG-AA text contrast"). Requester chose this option.
`components/ui/badge.tsx`'s `success`/`warning`/`danger` variants ship
unchanged; no tokens.css edit. `--success`/`--warning`/`--danger` alone on
`--bg`/`--surface` (e.g. ChartCard, StatusDot) already pass comfortably —
the exception is scoped to text-on-own-soft-tint only, which is exactly
Badge's use.

## D-F33 — Recharts pinned to 2.15.4, not the 3.x line (M12d)
CLAUDE.md's fixed stack names "Recharts" without a major version. 3.x is
current upstream but is a breaking-change migration off the well-documented
2.x API; 2.x is deprecated but still the version nearly every existing
Recharts tutorial/pattern targets. Same reasoning as D-F15 (Tailwind pinned
to 3.4.x): under deadline compression, the well-trodden major version is
lower-risk than the newest one. `recharts@2.15.4` (latest 2.x, confirmed
compatible with React 18 peer range) added to `package.json`. Pre-sanctioned
by CLAUDE.md's stack list, not a new-dependency decision requiring a
separate ask.

## D-F34 — Custom status Badge named `StatusBadge`, not `Badge` (M12d)
component-library.md §4 documents this component simply as "Badge (status)"
and its own header notes "exact TS shapes are the implementer's mechanical
translation." A literal `Badge` export would collide with the already-
exported `Badge` from `components/ui/badge.tsx` (the shadcn primitive
`StatusBadge` composes internally). Named the file/export `StatusBadge` to
avoid the collision; behavior and props (`kind`, `value`) match the spec
exactly. `kind="order"`/`"payment"` → variant mapping matches the prototype
already shown on `/dev-tokens`' `BadgeMatrix` (D-F27) exactly, so the
demonstration and the real mapping agree.

## D-F35 — ChartCard color rule: single accent highlight = the largest segment (M12d)
design-system.md §1 says charts get "accent highlight series + neutral
grays" but doesn't specify which segment is highlighted. Read literally:
success/warning/danger are reserved for status Badges only ("status badges
ONLY (order/payment)"), so ChartCard never uses them, even for a
Cancelled-orders slice — the highlight is purely about visual emphasis, not
status semantics. Implemented: the single largest-value segment gets
`--accent`; every other segment cycles a 3-tone neutral-gray palette built
from `--border-strong`/`--text-2-current` alpha steps (tokens only, no raw
hex). `hbar` data is sorted descending so the highlight is always the top
bar; `donut` keeps the caller's given order (a status funnel reads better
in pipeline order than value-sorted) and computes the highlight index
separately.

## D-F36 — Only the revenue-by-category chart gets a deep-link `onSegment` (M12d)
implementation-plan.md's M12d acceptance criterion literally names one
target: "chart segment click lands on `/products?category=…`."
`ProductListParams` (`backend/app/models/requests/products.py`) has no
`status` field — order status isn't a Products filter — so the "Orders by
status" donut has no valid deep-link target and renders without an
`onSegment` prop. This isn't a shortcut: there is no backend-supported
route for it.

## D-F37 — `EmptyState` ships with only what `error` needs; `chips`/`closest` deferred (M12d)
component-library.md §4 documents `EmptyState`'s full prop surface
(`chips`, `closest`) for its `invite`/`no-results` flavors, but those
flavors' real consumers — `SuggestionChips` (Ask, M12g) and `ProductCard`
mini-grids (Search/Visual, M12f) — don't exist yet. Building `chips`/
`closest` handling now would mean depending on components that don't exist
or inventing throwaway rendering that gets replaced wholesale later.
Shipped `flavor`, `title`, `body?`, `action?` only — exactly what
Overview's regional error fallback (this milestone's one consumer) needs.
Same incremental-growth pattern as `StatusDot`'s `compact` prop (added in
M12c exactly when the rail presentation needed it, not preemptively in
M12b). `chips`/`closest` are added when M12f/M12g's flavors ship, logged
here as the reason the prop surface looks incomplete against the locked
doc in the meantime.

## D-F38 — `ResultTable`'s "Showing N of M" footer only renders when rows are actually truncated (M12d)
component-library.md §4 spec's the footer as "Showing 10 of N," written for
the arbitrary-SQL-result case (AICard, M12g) where results can run into the
thousands. Overview's recent-orders call always passes exactly `maxRows`
(10) rows — the backend itself caps at 10
(`backend/app/services/dashboard.py::_RECENT_ORDERS_LIMIT`) — so a literal
"Showing 10 of 10" footer would be true but uninformative noise on every
load. Implemented the footer to render only when `rows.length > maxRows`;
Overview never triggers it, AICard will once real truncation occurs.

## D-F39 — M12d live verification method
Verified via a throwaway Playwright harness (M12b/M12c pattern — Chromium
already cached, installed `--no-save` in the scratchpad, deleted after use)
against the Vite dev server on port 5173 (CORS requirement, D-F31's
carry-over note) proxying to the real production backend
(`https://wfx-erp-explorer.onrender.com`). 22/22 checks green: all 5 stat
values match `GET /dashboard/stats` exactly (fetched independently as
ground truth in the same script), ₹ crore formatting on the revenue hero,
`tabular-nums` confirmed via computed `font-variant-numeric`, both chart
titles render, revenue-by-category bar click navigates to
`/products?category=Jacket` (real data), recent-orders table renders with
status badges, skeletons appear during a throttled (1.5s-delayed) load with
zero measurable layout shift on the stat row, the regional error state (a
mocked 503) renders `EmptyState` + a working Retry that recovers real data
while the shell (sidebar) stays intact, reduced-motion collapses the
load-cascade animation, and zero real console errors (two "Failed to load
resource: 503" browser network-log lines from the deliberately-mocked
error test are expected, not application errors, and are excluded from that
count). One harness bug found and fixed during this pass, not a product
bug: a request-count-based error/success mock raced React 18 StrictMode's
dev-only double-invoked effect (mount → cleanup → mount) — the first
(mocked-error) request's callback lost its race against the `cancelled`
guard, so the second, real request silently won before any assertion ran.
Fixed by using a persistent boolean flag instead of a counter, so both
StrictMode-duplicated requests behave identically within each test phase.
Full regression sweep across all 8 routes (5 app routes + `/dev-tokens` +
`/ask` and an unknown path, both redirecting to `/`) at 1440px: zero
console errors on any route. 375px visual check: MobileTabs (`position:
fixed; bottom: 0`, confirmed via computed style, unchanged from M12c)
correctly stays pinned to the viewport bottom with the last recent-order
row fully clear of it — a full-page (stitched) screenshot briefly appeared
to show the tab bar floating mid-page, which is a known Chromium
full-page-screenshot artifact for `position: fixed` elements during
capture stitching, not a runtime bug; confirmed via computed style plus a
non-stitched viewport screenshot.
