# M12c Implementation Contract — Layout Shell

Status: BINDING for this milestone. Sources of truth: `navigation.md` §1–§4/§6,
`component-library.md` §3, `design-system.md` §3–§7/§13, `motion.md` §2/§6,
`implementation-plan.md` (M12c section). This document adds the *how* — file
placement, responsive mechanics, health wiring, and verification — without
changing a single locked value. If anything here appears to conflict with those
documents, they win and the conflict is logged in `decisions.md` before
proceeding.

Scope reminder: the AppShell composition root, Sidebar (desktop) → icon rail
(tablet) → MobileTabs (mobile), main column, ColdStartBanner, live StatusDot
wiring, palette **mount point stub only**, and PageTitle blocks on the five
placeholders. No palette behavior, no page content, no new backend calls beyond
the existing `/health` wiring.

---

## 1. Component architecture

New files, all under `src/components/shell/`:

- **`AppShell.tsx`** — composition root (component-library.md §3). Owns: the
  responsive sidebar/rail/tabs switch, the main column (max-width
  `--content-max-width`, centered, gutters per §5), the route `<Outlet />`,
  the shadcn `ToastViewport` mount, the ColdStartBanner slot, the CommandPalette
  **mount point as a marked stub** (a comment-annotated empty slot — no
  component, no ⌘K listener; both are M12h), and the app's **single**
  `useHealth()` call. Props: none. Health state flows down to Sidebar/MobileTabs
  (status) and ColdStartBanner (isSlow) as props — no context provider (same
  reasoning as m12b-contract.md §8: a provider earns existence when two
  unrelated trees need the data, and nothing outside the shell does).
- **`Sidebar.tsx`** — desktop sidebar and tablet rail are **one component with
  two responsive presentations**, not two components (they share structure,
  active-state logic, and footer; only width/labels differ). Reads the route
  itself (NavLink); receives `status` for the footer.
- **`MobileTabs.tsx`** — bottom tab bar, <768px only.
- **`ColdStartBanner.tsx`** — props `visible` + dismiss callback per
  component-library.md §3; session-once logic lives in AppShell (§6), keeping
  the banner itself stateless.

### Router integration
`app/router.tsx` gains a layout route: AppShell wraps the five app routes
(`/`, `/overview`, `/products`, `/search`, `/visual`) via `<Outlet />`. The
`/ask` and `*` redirects are unchanged. **`/dev-tokens` stays outside the
shell** — it is a QA instrument, never linked from nav, and wrapping it would
put throwaway content inside the production frame for no verification benefit.

## 2. Breakpoints

navigation.md's 768 / 1280 boundaries coincide exactly with Tailwind 3.4's
default `md` / `xl` breakpoints — **no config change, no new tokens**:

| Range | Tailwind | Presentation |
|---|---|---|
| <768 | below `md` | MobileTabs (bottom bar); no sidebar |
| 768–1280 | `md`–`xl` | 64px icon rail, labels as tooltips |
| >1280 | `xl`+ | 232px full sidebar |

Widths 232px/64px are shell-structural constants, not design-system spacing
values — they live as two custom properties in tokens.css Region 1
(`--sidebar-width: 232px`, `--rail-width: 64px`) with a one-line decisions.md
rationale per design-system.md §13 (same pattern as D-F22: named in
navigation.md prose, never assigned a variable).

## 3. Sidebar (navigation.md §4, restated as implementation rules)

- 232px fixed, `bg-surface`, hairline right border (`--border`), full viewport
  height, `z-shell`. **Light on every route** — never inside `.inset`, never
  animates on route change (motion.md §3: it is the constant frame).
- **Header:** product mark + "WFX Explorer" in the `title` role. The mark is a
  small tile built from an 18px lucide icon on an `--action` fill (icon in
  `--surface` tone) — no image asset is created; exact icon chosen at
  implementation. Lime is *not* used here (D-F04 sanctions the active-nav edge,
  not branding).
- **Items** — the five routes in frequency order (Ask, Overview, Products,
  Search, Visual Search), each: 18px lucide icon + 13px/500 label, radius 8,
  8px vertical rhythm. The 13px/500 label is navigation.md's own spec and not
  one of the eight type roles — it composes the small-size token with medium
  weight (utilities referencing tokens, not raw values; no new role is minted).
- **Hover:** icon `translateX(1px)` + label color brighten, 100ms
  (motion.md §2, exact row).
- **Active:** 2px `--accent` left edge + tinted background. The tint is
  `--accent` at low alpha via Tailwind's alpha modifier (exact alpha chosen at
  implementation; label/icon color stays `--text`, keeping D-F04's "lime is
  never a message" intact and the 4.5:1 floor trivially met). `aria-current="page"`
  on the active link.
- **Ask's resting edge:** identical 2px edge geometry at reduced opacity when
  Ask is not the active route; full accent when it is. It reads as a faint
  reminder that Ask is home, not as a second active state.
- **Footer:** StatusDot (M12b primitive, fed per §5) preceded by "1,000 styles"
  in the `micro` role — the "· Live" of navigation.md's copy **is StatusDot's
  own label** (the two are composed, the word "Live" is not duplicated). Below
  it, a GitHub link (repo URL from the origin remote) with visible label.
  "1,000 styles" is static copy per navigation.md; no count endpoint is called.

### Rail presentation (768–1280)
64px wide, icons only, centered. Labels move into shadcn Tooltips (vendored in
M12b), and each link carries `aria-label` so the accessible name never depends
on hover. Active state: same accent left edge + tint. Footer: StatusDot in a
**compact form** — dot only visible, label rendered screen-reader-only, full
label in the tooltip. This adds one presentational prop (`compact` or
equivalent) to `StatusDot.tsx` — our own M12b component, not a vendored file,
so a class-level prop addition is an ordinary edit, noted in its doc comment.

## 4. MobileTabs (<768px, navigation.md §6)

- Fixed bottom bar: `bg-surface`, hairline top border, `z-shell`, safe-area
  bottom padding (`env(safe-area-inset-bottom)`) for home-indicator devices.
- Five items: icon + 11px label. **11px is not in the type scale** (micro is
  12) — navigation.md names it explicitly, so it becomes one new token
  (`--text-tab: 11px`) with a one-line decisions.md rationale (design-system.md
  §13 / D-F22 pattern), not an arbitrary bracket value.
- Active = the sidebar's active treatment rotated to this geometry: 2px
  `--accent` top edge + low-alpha accent tint; icon/label color stays `--text`.
  navigation.md's "active = accent tint" is read as this background tint —
  a lime *label* would violate D-F04 and the contrast floor outright, so that
  reading is rejected. `aria-current="page"` as above.
- The main column reserves bottom padding equal to the bar height so content
  is never occluded.
- DetailPanel-as-sheet and the filter sheet mentioned in §6 are M12e/M12f
  concerns — the bar itself is this milestone's only mobile deliverable.

## 5. Health wiring (StatusDot)

`useHealth` (M12a) already provides `status: live | degraded | down` and the 3s
`isSlow` cold-start signal. This milestone makes one refinement to its mapping,
because the current code can never actually produce `degraded` in practice:

- 200 with `status: "ok"` → **live**
- `ApiError` thrown (backend reachable but unhealthy — e.g. the 503 envelope
  `/health` returns on a DB outage) **or** 200 with non-ok status → **degraded**
- Network-level failure (fetch rejection, backend unreachable) → **down**

This matches component-library.md §2's three states and navigation.md §4's
"grey when unreachable" (StatusDot's existing colors: success+pulse / warning /
grey). The refinement is logged in decisions.md as the resolution of the
degraded-vs-down ambiguity. The hook's existing refetch-on-window-focus
behavior is kept as-is; no polling is added.

## 6. ColdStartBanner

- Trigger: `useHealth().isSlow` — first health check exceeding 3s (D-F12,
  already implemented in the hook).
- Copy, verbatim from component-library.md §3: **"Waking the server (free
  tier) — a few seconds."** plus a labeled dismiss button.
- Presentation: a full-width strip at the top of the main column — `bg-surface`,
  hairline bottom border, `small` text, `role="status"`. It is deliberately
  **neutral, not warning-tinted**: the copy is calm and honest, and the
  warning-on-warning-soft pairing is the exact D-F26 contrast conflict, which
  stays quarantined until the requester's M12d call.
- Session-once: AppShell checks/sets a sessionStorage flag
  (`wfx.coldstart.shown`, set the moment the banner first renders). It hides on
  manual dismiss or automatically when the pending health check resolves
  successfully; either way the flag means it never renders again this session.
- Reduced motion: the banner appears/disappears as an instant swap (it is not
  in motion.md §2's inventory, so it gets **no** entrance animation at all).

## 7. Main column & PageTitle blocks

- Main column: `max-width: var(--content-max-width)` (1320, D-F22), centered,
  page gutter 24 (16 below `md`) per design-system.md §3/§6.
- Each of the five placeholder pages renders a `PageTitle` (M12b primitive)
  with its route name as title and a one-line description; the `actions` slot
  stays **empty** — the "Search or ask… ⌘K" palette trigger is listed by
  implementation-plan.md as an M12h file modification and is not built here.
- The Ask placeholder gets a PageTitle like the others for now; M12g replaces
  it wholesale with the dark hero. No `.inset` surface is created in this
  milestone, so the light↔inset route crossfade (motion.md §3.2) has nothing
  to animate yet — the mechanism ships with M12g, noted in §10.

## 8. Accessibility (this milestone's share)

- Landmarks: `<nav aria-label="Primary">` (sidebar/rail and tabs each), a
  single `<main>` for the route outlet.
- `aria-current="page"` on active links; every icon-only link (rail, mark)
  carries an accessible name (D-F16, design-system.md §7).
- Tab order: nav items in visual order, then main content. Focus ring is
  M12b's global `:focus-visible` — nothing in the shell may suppress it;
  verified on nav items in all three presentations.
- Tooltips (rail) are hover/focus-triggered, non-trapping, and are *labels*,
  not the accessible name (which is the `aria-label`).
- StatusDot semantics unchanged from M12b: dot decorative, text carries state.
- Reduced motion: nav hover nudge and dot pulse already collapse via the M12b
  global block — re-verified on shell surfaces, no new JS-mediated cases.

## 9. Folder structure changes

    frontend/src/
      components/shell/AppShell.tsx         NEW — composition root
      components/shell/Sidebar.tsx          NEW — sidebar + rail presentations
      components/shell/MobileTabs.tsx       NEW
      components/shell/ColdStartBanner.tsx  NEW
      components/StatusDot.tsx              MODIFIED — compact presentation prop
      lib/hooks/useHealth.ts                MODIFIED — degraded/down split (§5)
      styles/tokens.css                     MODIFIED — --sidebar-width, --rail-width, --text-tab (§2/§4)
      app/router.tsx                        MODIFIED — layout route wrapping the five app routes
      pages/{ask,overview,products,search,visual}/  MODIFIED — PageTitle blocks
    tailwind.config.js                      MODIFIED only if the three new tokens need mappings
    docs/project-state.md                   MODIFIED at close
    docs/frontend/decisions.md              MODIFIED — token rationales + §5 resolution

**Zero new dependencies.** Tooltip, Toast, lucide icons, and all tokens already
exist from M12b.

## 10. Out of scope (restated)

CommandPalette behavior and the ⌘K listener (M12h; stub mount only), the
palette trigger button in PageTitle `actions` (M12h), the light↔inset route
crossfade (ships with M12g's first real inset surface), all page content
(M12d–M12g), DetailPanel/filter sheets on mobile (M12e/M12f), the D-F26
status-color contrast call (blocks M12d, not this), deploy changes, any backend
call beyond `/health`.

## 11. Acceptance criteria (all must pass before the M12c commit closes)

1. `npm run build` + strict TS clean; m12b-contract.md §13.2's grep checks
   still return zero matches under the same exclusions.
2. **Real-browser breakpoint pass** (throwaway Playwright, M12b pattern) at
   1440 / 1024 / 375px: full sidebar / icon rail / bottom tabs respectively;
   reflow correct when resizing across both boundaries; main column max-width
   and gutters hold; tab bar never occludes content at 375px.
3. Active states: navigating each of the five routes moves the accent edge +
   tint and `aria-current` correctly in all three presentations; Ask shows its
   faint resting edge whenever another route is active.
4. StatusDot live against production `/health` (green, pulsing, "Live");
   **degraded** and **down** each simulated (blocked route / offline emulation)
   and rendering per §5.
5. ColdStartBanner: with throttled/delayed first health (>3s), banner appears
   with the verbatim copy; dismiss works; it does not reappear on navigation or
   reload within the session; a fresh session is eligible again.
6. Keyboard pass: tab order per §8, focus ring visible on nav items in
   sidebar, rail, and tabs; rail tooltips appear on focus and don't trap.
7. D-F21 carry-over cleared: `/ask` → `/` and unknown-path → `/` redirects
   verified by real-browser click-through (first interactive check).
8. Reduced-motion emulation on the shell: hover nudge gone, dot static,
   banner swap instant.
9. Zero console errors across all five routes at all three widths.
10. `docs/project-state.md` updated; decisions.md gains the §2/§4 token
    rationales and the §5 health-mapping resolution (expected deviations
    beyond those: zero). Commit: `feat(frontend): M12c layout shell`.
