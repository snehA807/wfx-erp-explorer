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

## D-F40 — Products toolbar `search`/`supplier`: real gaps between navigation.md and the frozen backend (M12e)
navigation.md §2's route tree names `/products ... ?search ?supplier` and
navigation.md §5 documents the command palette hitting `GET
/products?search=`. `ProductListParams`
(`backend/app/models/requests/products.py`) has neither field —
`extra="forbid"` would 422 on `?search`, and the categorical filter is
`supplier_id`, not `supplier`, with no supplier facet in
`FilterOptionsData` to populate a picker from. Per CLAUDE.md ("flag
conflicts instead of silently deviating") and the backend-frozen
invariant:
- `search` is implemented as a client-side quick-filter over the already-
  fetched page (matches `style_name`/`style_number`/`brand`/`fabric`),
  still synced to a `?search` URL param for round-trip — honest about what
  it actually does (real cross-catalog search is `/search`, M12f;
  "semantic search" is explicitly out of scope for this milestone per
  implementation-plan.md).
- No supplier picker was built; `supplier_id` filtering remains reachable
  via the API but isn't surfaced in the toolbar. Low-value to hand-roll an
  undiscoverable free-text supplier-ID input against a facet-less field.

Also logged here (same D-F22/D-F28 pattern — named in a doc's prose, no
variable assigned there): `--detail-panel-width: 480px` (component-
library.md §4: "Right Sheet 480px"), and two non-token utilities added to
`tokens.css` for values that would otherwise need a Tailwind arbitrary
bracket value (invariant 7 / m12b-contract.md §13.2 grep check): `.aspect-
product` (design-system.md §9: "4:5 image frame") and `.grid-products`
(design-system.md §6: "auto-fill minmax(240px, 1fr)" — no fixed-breakpoint
`grid-cols-*` utility can express `auto-fill`).

## D-F41 — FilterRail's `variant: "toolbar"` is the only variant built (M12e)
component-library.md §4 documents FilterRail's full prop surface (facet
checkboxes with counts, GSM dual-range slider, Sheet-collapse below 1280)
but Products only ever needs the named "selects + pills toolbar variant."
Built exactly that: one Select per categorical facet (`GET
/filters/options`) + removable pills + "Clear all." No GSM/price slider,
no Sheet-trigger collapse. `variant` is typed as the literal `"toolbar"`
rather than a `"toolbar" | "full"` union — the second member joins when
Search (M12f) actually needs it, same incremental-growth pattern as
EmptyState's D-F37 and StatusDot's `compact` prop (M12c).

## D-F42 — Products' table view is a page-local `ProductsTable`, not a reuse of `components/ResultTable.tsx` (M12e)
component-library.md §4's own usage matrix marks `ResultTable` as
consumed by Ask and Overview only — Products is not listed, unlike
`ProductCard`/`FilterRail`/`DetailPanel`/`EmptyState`, which the matrix
does mark for Products. Read literally rather than treated as an
oversight: `ResultTable` is scoped to schema-agnostic SQL/API row
rendering (`columns: string[]`, `rows: unknown[][]`), while the Products
grid/table toggle (design-spec.md §4: "professional gallery, grid/table
toggle") needs row click-through to `DetailPanel`, which `ResultTable`
doesn't support and — per this session's explicit instruction not to
modify previous-milestone files — wasn't a candidate for extending
either. `pages/products/ProductsTable.tsx` is page-local (component-
library's promotion rule: shared file on the *second* usage site; same
pattern as `SQLBlock` living in `pages/ask/` and `Pagination.tsx` living
in `pages/products/`), reusing `components/ui/table.tsx` primitives
directly.

## D-F43 — DetailPanel open/close rides browser history, not just the `?style` param (M12e)
implementation-plan.md's M12e acceptance requires "back button closes
panel and restores scroll." Setting `?style` via `replace: true` would
satisfy "URL reflects the open panel" but not scroll restoration — a
`replace`d history entry never had the pre-open scroll position recorded
against it. Instead: opening a product **pushes** a new history entry
(`setSearchParams(next)`, default `replace: false`); the panel's own close
paths (X button, Esc, overlay click, and a `More like this` chain) all
call the same `closeDetail()`, which calls `navigate(-1)` when this page
itself did the pushing (tracked via a ref, not state — avoids re-render
timing issues) and falls back to stripping `?style` via `replace: true`
only for a cold deep link with no prior in-app entry to pop. One
consequence, not a bug: clicking through a "More like this" chain and
then hitting Back walks back one product at a time, matching normal
browser expectations for a chain of pushed views. Verified live (Playwright): scroll
position preserved within 50px across open→close on both the X button and
the browser Back button; a two-hop "More like this" journey correctly
restores the first product's panel on Back.

Also promoted `components/VisuallyHidden.tsx` (component-library.md §6,
first real usage): Radix's Dialog primitive (which `Sheet` wraps) requires
a `Title` for its accessible name; DetailPanel's own visible `<h2>` already
serves sighted users, so the required `SheetTitle` renders but is visually
hidden rather than duplicated on screen.

## D-F44 — M12e live verification method, and two harness bugs found (not product bugs)
Verified via a throwaway Playwright harness (M12b–M12d pattern — Chromium
cached from earlier milestones, reinstalled at the pinned version via
`npx playwright install chromium` since the cache held a different browser
revision than this Playwright version expected; deleted after use)
against the Vite dev server on port 5173 proxying to the real production
backend. **33/33 checks green** on the final run: sort/category-filter/
search all round-trip through the URL and survive a real page reload;
`page_size` honored (24 ≤ 48); image zoom + card lift confirmed via
computed `transform` before/after hover; grid/table toggle round-trips
`?view` and preserves the active sort/filters in both presentations;
broken image swaps to `CategoryPlaceholder` (verified via before/after DOM
inspection of the same physical card, not a text heuristic); pagination
advances `?page`; DetailPanel renders Seam separators, the spec grid,
Supplier section, and an honest "More like this" state (real similar items
here, since M9's embeddings backfill covers this dataset); Escape/X-button/
browser-Back all close the panel and restore scroll within 50px; a
two-hop "More like this" journey and Back both work; keyboard-only open
(focus + Enter) works; the Overview revenue-by-category chart's deep-link
to `/products?category=` (M12d) still lands correctly — a regression
check, not new scope; reduced-motion and 375px passes clean. Zero real
console errors (one deliberate `net::ERR_NAME_NOT_RESOLVED` from the
broken-image test, expected, same exclusion as M12d's D-F39).

**Two harness bugs found and fixed during this pass, not product bugs**
(both diagnosed with a standalone debug script before touching any
verification code, per instruction not to reimplement anything without
confirming root cause first):
1. Early locators used `page.locator("main button")` for "the product
   grid." `<main>` also contains the FilterRail Select triggers, the Sort
   trigger, and the grid/table toggle buttons — all real `<button>`
   elements rendered *above* the grid. `.first()` was silently grabbing a
   toolbar control instead of a card. Fixed by scoping every such locator
   to `.grid-products button` (the actual `ProductCard` grid container),
   confirmed via a standalone debug script that logged intermediate DOM
   state on a timer rather than trusting a single post-hoc assertion.
2. The broken-image check additionally filtered on `button:has(img)` to
   find "a card with an image" — self-defeating, since the very fix being
   tested (swap `<img>` for `CategoryPlaceholder`'s `<svg>`) makes that
   card stop matching `has(img)`, so the locator silently re-resolved to
   the *next* card with every later `.evaluate()` call, making a correct
   swap look like a no-op. Separately, the image-zoom-hover and card-lift-
   hover checks originally reused the same physical card back-to-back:
   hovering the `<img>` puts its ancestor `<button>` in CSS `:hover` too
   (hover cascades to ancestors), so the second check's "before"
   measurement was already mid-hover. Fixed by using two distinct cards
   for the two hover checks and moving the mouse to `(0, 0)` between them.

## D-F45 — FilterRail's categorical-key vocabulary consolidated into one export (M12f)
M12e had already produced a small duplication: `components/FilterRail.tsx`
defined its own `CategoricalFilterKey`/`FIELDS`, and
`pages/products/params.ts` independently redefined an identical
`CategoricalFilterKey`/`CATEGORICAL_KEYS`. M12f's Search page needs the
same six-field vocabulary a third time (`pages/search/params.ts`) — the
point past which a third copy is worse than a small integration edit.
Consolidated: `components/FilterRail.tsx` now exports `CATEGORICAL_FIELDS`
(key + label) as the single source; both `pages/products/params.ts` and
`pages/search/params.ts` derive their key list from it
(`CATEGORICAL_FIELDS.map(f => f.key)`) instead of redefining it. No
behavior change to Products — verified live (D-F44's follow-up run in
D-F48 below). Also logged here (same D-F22/D-F28/D-F40 pattern): a new
`--filter-rail-width: 260px` token (design-system.md §6: "Search: 260px
filter rail + fluid results") and a `.grid-visual` utility (`auto-fill
minmax(300px, 1fr)`, design-spec.md §4: "image-forward grid, larger
tiles" — wider minimum than `.grid-products`'s 240px, same reasoning as
that token: no fixed-breakpoint `grid-cols-*` utility can express
`auto-fill`, so a named utility class rather than an arbitrary bracket
value).

`components/ui/slider.tsx` (shadcn primitive) also needed a real
structural edit, not just a class tweak: it hardcoded exactly one
`<SliderPrimitive.Thumb>`, which only supports a single-value slider.
FilterRail's GSM control is a dual-range slider (design-system.md §10),
which needs one `Thumb` per array entry in `value` — this is shadcn's own
documented range-slider pattern (`value.map(...) => <Thumb />`), not a
custom deviation. Edited to render `Array.from({length: value.length}).map(...)`;
a length-1 value still renders exactly one thumb, so no existing/future
single-value usage regresses.

## D-F46 — DetailPanel open/close history logic extracted to `lib/hooks/useDetailPanelRoute.ts` (M12f)
Products (M12e) built the `?style` push-on-open/`navigate(-1)`-on-close
logic (D-F43) inline in its own page component. Search and Visual both
need the identical behavior this milestone — three near-identical copies
of ~20 lines of history-management logic is worse than extracting it
once. `lib/hooks/useDetailPanelRoute.ts` is a mechanical extraction (same
`openedRef`/`openDetail`/`closeDetail` shape, zero behavior change);
Products was refactored to consume it instead of its own inline copy.
Verified live post-refactor: opening/closing the Products DetailPanel via
both the panel's own controls and the browser Back button still works
identically (docs/frontend/decisions.md D-F44's own Products checks,
re-run clean this milestone).

## D-F47 — "Closest matches" fallback: a second, filter-free query capped at 2 (M12f)
component-library.md's `EmptyState` documents a `closest?: product[]` prop
for the `no-results` flavor; design-spec.md §9 specifies "2 nearest
semantic matches." Implemented in `pages/search/useSearch.ts`: when the
filtered query returns zero rows *and* at least one structured filter is
active (`hasActiveSearchFilters`), a second `POST /search/products` call
re-runs the same query text with `limit: 2` and no filters — the
assumption being that the filters, not the query itself, caused the
empty result. If no filters are active, `closest` stays `null` and
`EmptyState` renders without the mini-grid (a query that matches nothing
even unfiltered has no meaningful "closest" fallback to show beyond what
was already the primary result set). Not built for Visual Search:
`SearchVisualRequest` has no filter fields to blame, and the endpoint's
`WHERE fg.text_embedding IS NOT NULL` clause matches effectively every
row, making a genuine zero-result response unreachable in practice.
Verified live: an over-constrained real filter combination (category +
fabric) against production produced a real zero-result response, and the
closest-matches mini-grid rendered with real product cards from an
unfiltered re-query.

`EmptyState` also gained an `onSelectClosest` callback (not explicitly
named in component-library.md, but required to make the closest-matches
cards clickable) and reuses `ProductCard` at `size="compact"` for the
mini-grid — no new card component, same reuse-over-invention pattern as
DetailPanel's "More like this" strip. `chips` (the `invite` flavor) is
still deferred, per D-F37's original reasoning: `SuggestionChips` doesn't
exist yet (M12g), and Ask's chips are the assignment's specific example
NL2SQL questions, not applicable to a product-search invite state anyway.

## D-F48 — Match-score badge threshold raised from D-F13's placeholder ~0.55 to 0.65, on real production data (M12f)
implementation-plan.md's M12f Risk note calls this out explicitly: "tune
threshold on real data during acceptance, note final value here."
Measured live against the deployed backend (`POST /search/products`,
BGE `text_embedding` cosine scores) across a deliberate range of query
quality:
- Pure nonsense (`"xyzzy quantum flavor 42"`): **0.59–0.60**
- Off-topic but grammatical (`"the quick brown fox jumps"`, coincidentally
  shares the word "brown" with several colors in the catalog): **0.53–0.54**
- Single weak/generic keyword with one real signal (`"red something"`):
  **0.62–0.65**
- Single genuinely relevant keyword (`"cotton"`, `"garment"`): **0.72–0.76**
- Descriptive, on-target queries (`"blue floral dress"`,
  `"expensive jacket for winter"`): **0.72–0.83**

D-F13's ~0.55 placeholder sits *inside* the nonsense-query band — shipping
it as-is would badge random results for a garbage query as "58% match."
0.65 sits cleanly between the weak/nonsense cluster (≤0.65) and every
genuinely descriptive query tested (≥0.71), with no observed case landing
in between. `MATCH_BADGE_THRESHOLD` is now a single exported constant in
`components/ProductCard.tsx` (`components/ProductCard.tsx`'s own
docstring carries this measurement summary) consumed by both `ProductCard`
(Search) and `pages/visual/VisualTile.tsx` (Visual) — Visual reuses the
same constant since `search_visual` also scores via
`embed_query_text`/BGE, not CLIP (see below), so its score distribution
is the same instrument.

**Cross-reference, not a new finding**: `search_visual`
(`backend/app/services/search.py`, `backend/app/db/queries/search.py`)
matches queries against `text_embedding` via `embed_query_text` (BGE), not
`image_embedding` via CLIP — already documented as the "M11 escape hatch"
in `backend/app/db/queries/search.py`'s own comment and architecture.md
§5 (CLIP OOMs Render's 512MB free tier alongside BGE + Chroma, confirmed
live during M11). Noted here only because it's *why* D-F48's single
threshold constant is safe to share between Search and Visual — both
literally run the same scoring function server-side, just against
different structured-filter surfaces. No frontend code changes as a
result; flagging per CLAUDE.md's "flag conflicts instead of silently
deviating" since the Visual screen's design intent ("natural-language
query describing appearance") reads as CLIP-powered even though the
backend (frozen, pre-existing) isn't.

## D-F49 — M12f live verification method, and one harness bug found (not a product bug)
Verified via a throwaway Playwright harness (M12b–M12e pattern — Chromium
cached, reinstalled at the pinned revision, deleted after use) against
the Vite dev server proxying the real production backend. **33/33 checks
green** on the final run: Search's invite state before any query,
300ms-debounced `?q` round-trip, real re-ranked results from
`POST /search/products`, match badges present at the tuned threshold,
facet checkbox groups with real counts from `GET /filters/options`,
checking/unchecking a facet setting/clearing its URL param and pill, the
GSM dual-range slider committing `min_gsm`/`max_gsm` on release (not on
every drag tick), "Clear all" resetting everything, a genuine
over-constrained-filter zero-result response rendering the closest-
matches fallback + "Clear filters" action, DetailPanel reachable from a
Search result card, FilterRail collapsing to a "Filters" Sheet-trigger
below xl (tested at 1024px) with the same facet content inside; Visual's
subtitle copy, invite state, debounced query, real results, the
info-on-hover overlay (`opacity: 0` at rest, `1` on hover, verified via
computed style) and DetailPanel reachability; 375px passes on both
pages; a reduced-motion pass; and a regression check that Products'
DetailPanel open/close still works identically after the D-F46 hook
extraction, plus a full 8-route sweep (5 app routes + `/dev-tokens` +
`/ask` + an unknown path) with zero real console errors.

**One harness bug found and fixed mid-verification, not a product bug**
(diagnosed with a standalone debug script before touching the
verification code, per instruction not to guess-fix): the first pass
simulated the GSM slider drag with raw `page.mouse.move/down/move/up`
calls, which never registered as a valid drag against the Radix Slider
thumb — likely imprecise pointer-event sequencing in headless automation,
not a rendering issue. A standalone debug script confirmed the component
itself was fine: it logged two real slider thumbs (dual-range render
correct — D-F45) and that a **keyboard** interaction (`focus()` +
`ArrowRight` × 10) correctly moved `aria-valuenow` and committed
`min_gsm`/`max_gsm` to the URL immediately, matching `onValueCommit`'s
documented key-up-commits behavior. Fixed the harness to drive the
slider via keyboard instead of a simulated mouse drag — more reliable in
headless automation regardless of the component under test. The GSM
slider's downstream "Clear all" button check had also failed as a
consequence (no active filters left to render the button once the GSM
commit silently no-opped), confirming the failure was a single root
cause, not two independent bugs.
