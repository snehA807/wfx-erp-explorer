# M12b Implementation Contract — Design System (Token Layer)

Status: BINDING for this milestone. Sources of truth: `design-system.md`,
`motion.md`. This document adds the *how* — file placement, naming, mapping,
and verification — without changing a single locked value. If anything here
appears to conflict with those documents, they win and the conflict is logged
in `decisions.md` before proceeding.

Scope reminder: tokens, theme wiring, shadcn binding, and the four foundation
primitives (`Seam`, `SeamProgress`, `PageTitle`, `StatusDot`) plus the
`/dev-tokens` QA route. No shell, no pages, no feature components.

---

## 1. Tailwind architecture

- Tailwind **3.4.x, pinned** (decisions.md D-F15). No v4 syntax anywhere.
- Single-source rule: **every raw value lives in `src/styles/tokens.css` as a
  CSS custom property.** The Tailwind theme *references* variables; it never
  restates values. Consequence: retheming = editing one file; the config is a
  pure mapping layer.
- Theme strategy: `theme.extend` only — Tailwind defaults remain available but
  our tokens are the only sanctioned vocabulary in app code. Enforcement is by
  review + the grep checks in §13, not by deleting defaults (deleting breaks
  shadcn internals).
- Color mapping: semantic names exposed via the `hsl(var(--token) /
  <alpha-value>)` form so Tailwind opacity modifiers work. This requires all
  color tokens stored as raw HSL channel triplets (see §2). Named utilities to
  expose: `bg`, `surface`, `border`, `border-strong`, `text`, `text-2`,
  `action`, `action-hover`, `inset`, `inset-surface`, `inset-border`,
  `inset-text`, `inset-text-2`, `accent`, `accent-ink`, `success`, `warning`,
  `danger`, the three `*-soft` tint surfaces, `seam`, `seam-inset`, `ring`.
- Fonts: **self-hosted via Fontsource** (two new packages — sanctioned here
  explicitly per the ask-first rule; rationale: no CDN dependency in the demo,
  no visible flash on the dark hero). Inter 400/500/600; JetBrains Mono
  400/450 (variable if available, else 400). `sans` and `mono` families mapped
  in the theme.
- Type roles (`display`, `title`, `body`, `small`, `micro`, `stat`,
  `stat-hero`, `mono-ui`) are **composite classes defined once in the tokens
  stylesheet's components layer** (size + weight + tracking + case + numeric
  features per design-system.md §2). App code writes `text-role-micro`, never
  hand-stacked utilities.
- Spacing: the named 4px steps mapped into `theme.extend.spacing`; radius:
  `sm` 6 / `DEFAULT` 8 / `lg` 12 / `full`; shadows: `shadow-card`,
  `shadow-card-hover`, `shadow-float` from the three elevation variables.

## 2. CSS variable architecture (`src/styles/tokens.css`)

One file, five ordered regions, each with a one-line header comment:

1. **`:root` — light palette + universal tokens.** All light colors, accent,
   status trios + soft tints, type metrics, space scale, radius, elevation,
   motion durations/easings, seam metrics (`--seam-dash: 6px`,
   `--seam-gap: 4px`), z-index scale (`--z-shell:10`, `--z-panel:40`,
   `--z-palette:50`, `--z-toast:60`).
2. **`.inset` scope — machine-surface overrides.** Redefines the *semantic*
   family — `--bg-current`, `--surface-current`, `--border-current`,
   `--text-current`, `--text-2-current`, `--seam-current`, `--ring-current` —
   to inset values. This is the entire theming mechanism: any component placed
   inside an `.inset` subtree renders correctly with zero component-level
   awareness. Raw palettes keep absolute names (`--inset-surface` etc.); the
   `-current` family is what components consume.
3. **shadcn bridge** (§7): shadcn's expected variables assigned from ours, in
   both `:root` and `.inset`.
4. **Base layer:** page background/text from semantic tokens; font smoothing;
   the global `:focus-visible` ring (§10); selection color (accent at low
   alpha paired appropriately per palette).
5. **Keyframes + reduced motion:** `fade-rise`, `stitch-draw`, `caret-blink`,
   `dot-pulse`; the global `prefers-reduced-motion` block (§9); the motion
   recipe classes (`card-hover`, `img-zoom` frame/inner pair, `press`,
   `focus-glow-inset`, `cascade-item`).

Color storage: **HSL channel triplets without the `hsl()` wrapper**, converted
once from the design-system.md §1 hexes, each with the original hex in a
trailing comment for audit. No new colors during conversion; rounding to whole
degrees/percents is acceptable.

## 3. Color system + light/inset semantic tokens

- Two raw palettes (light, inset) + accent/status — values verbatim from
  design-system.md §1. **No dark mode exists**: `.inset` is semantic scoping
  (machine surfaces), not a preference. No `prefers-color-scheme`, no toggle,
  no persistence. A future dark mode is a decisions.md event.
- Sanctioned `.inset` roots (exhaustive, D-F02): the Ask page main region,
  `AICard`, `SQLBlock`, `CommandPalette`. In M12b the class appears only on
  `/dev-tokens` demo panels; feature milestones apply it to real surfaces. For
  grep-ability, every machine surface also carries `data-surface="machine"`.
- Lime constraints (D-F04) as implementation rules: `accent` never used as a
  text color on light surfaces; accent fills always pair with `accent-ink`.
  The dev-tokens page renders the sanctioned-uses list as living text.

## 4. Typography

Values per design-system.md §2 via the role classes in §1. Mechanics:
`display` tracking −0.02em; `micro` uppercase + +0.04em + weight 500;
`stat`/`stat-hero` bake in `tabular-nums` (not opt-in); `mono-ui` = mono
family at 13. Line-height 1.5 body/small, 1.2 display/title/stat. No other
font sizes may appear in app code.

## 5. Spacing · Radius · Elevation

Verbatim from design-system.md §3–§5 as variables, mapped per §1. The three
shadow tokens are the only shadows in the codebase; arbitrary `shadow-[…]`
values are prohibited (grep-checked).

## 6. Seam system implementation

Two primitives in `src/components/`, consuming only seam tokens:

- **`Seam` (static):** 1px-high element; horizontal repeating background
  gradient built from `--seam-dash`/`--seam-gap`/`--seam-current` (cheap,
  crisp at 1px; no SVG needed for the static form). Palette resolution is
  automatic via `--seam-current`; the `variant` prop from component-library.md
  remains as explicit override only. Decorative: `aria-hidden`.
- **`SeamProgress` (kinetic):** SVG line spanning full width, stroke 2,
  `stroke-linecap: round`, dasharray from the seam tokens; base line
  `--seam-current`, progress line `accent`, animated via `stroke-dashoffset`
  (`stitch-draw`). State machine per component-library.md + motion.md §4:
  `idle | stitching | complete | error`; progress anchor = stage index ÷ 4 of
  width; the loop animates only the remaining segment; complete settles
  accent→seam over 300ms; error recolors drawn portion to warning/danger in
  150ms. Crispness: verify at 1× DPR on the dev page; if the 1px base blurs,
  apply `shape-rendering: crispEdges` to the base line only (never the
  animated line — it needs smooth caps).
- The four-locations budget (design-system.md §12) restated in both
  primitives' doc comments so it travels with the code.

## 7. shadcn customization

- Vendor via the shadcn CLI into `src/components/ui/`: the components named in
  component-library.md §1 — installed and token-bound now, consumed later.
- **Bridge, don't fork:** region 3 of tokens.css assigns shadcn's expected
  variables (`--background`, `--foreground`, `--primary`,
  `--primary-foreground`, `--muted`, `--muted-foreground`, `--border`,
  `--input`, `--ring`, `--radius`, popover/card families) from our tokens in
  `:root`, and reassigns the surface/text/border family inside `.inset`.
  Result: unmodified shadcn components are automatically correct on both
  palettes.
- Permitted edits to vendored files: class-level token alignment only (e.g.
  Badge status variants). Behavioral/structural edits prohibited
  (architecture.md §7). Each edited vendored file gets a one-line header
  comment naming the change.
- Badge status recipe defined here as variants (soft-tint background + solid
  status text + no border, per design-system.md §1) so M12d consumes rather
  than invents.

## 8. ThemeProvider architecture

Deliberately minimal, and documented as such: theming is scoped semantics, not
a global mode, so **no context provider exists for color.** The deliverable
is `src/lib/theme.ts` exporting: the machine-surface contract (the `.inset`
class constant + `data-surface="machine"` convention), the z-index token
names, and a `usePrefersReducedMotion()` hook (media-query subscription) for
the one JS-mediated reduced-motion behavior (SeamProgress stage jumps).
`app/providers.tsx` mounts nothing new — recorded explicitly so a theme
context is never added out of habit. If a user-facing dark mode ever arrives,
*that* is when a provider earns existence (decisions.md event).

## 9. Motion token architecture

- Durations/easings per motion.md §1 as variables, mapped into the theme as
  `fast/base/slow/zoom` and `ease-out-app`/`ease-press`.
- Keyframes + recipe classes defined once in tokens.css region 5; motion is
  composed from recipes, never re-declared per component.
- **Reduced motion is one global block**: durations and decorative keyframes
  collapse per motion.md §6. SeamProgress's informational degradation (stage
  jumps) is the only JS-mediated case, via the §8 hook.

## 10. Accessibility requirements (this milestone's share)

- **Focus ring, globally:** `:focus-visible` everywhere — 2px ring + 2px
  offset; ring color = a darkened accent derivative stored as `--ring`
  (must pass ≥ 3:1 against both `--bg` and `--surface`); lime glow recipe on
  inset. Never suppressed; shadcn `--ring` bridged to the same token.
- Contrast: dev-tokens renders every text/surface pairing with computed ratio
  labels; all ≥ 4.5:1 (both palettes), including status text on soft tints.
- Seam/StatusDot decorative → `aria-hidden`; StatusDot's *text label* carries
  state ("Live"), never color alone.
- Reduced-motion coverage verified via devtools emulation on the dev page.
- Fonts: `font-display: swap` with metric-compatible fallbacks; the dark hero
  title must not visibly reflow on cold load.

## 11. Folder structure changes

    frontend/src/
      styles/tokens.css            NEW — single source of raw values
      components/ui/*              NEW — vendored shadcn per component-library §1
      components/Seam.tsx          NEW
      components/SeamProgress.tsx  NEW
      components/PageTitle.tsx     NEW
      components/StatusDot.tsx     NEW
      lib/theme.ts                 NEW — §8 exports + reduced-motion hook
      pages/dev-tokens/            NEW — QA route (deleted in M12i)
    tailwind.config                MODIFIED — mapping layer only
    src/index.css                  MODIFIED — imports tokens.css + fonts
    app/router.tsx                 MODIFIED — /dev-tokens route
    docs/project-state.md          MODIFIED at close

New dependencies sanctioned by this contract: shadcn CLI output (not a runtime
dep), `@fontsource` Inter + JetBrains Mono, and shadcn's peer utilities
(clsx / tailwind-merge / class-variance-authority). Nothing else.

## 12. `/dev-tokens` QA page content (the acceptance instrument)

Sections in order: (1) all color tokens as labeled swatches — light block and
`.inset` block side by side; (2) every type role with sample text; (3)
spacing/radius/shadow specimens; (4) Badge status matrix (5 order × 4 payment
values); (5) both Seam variants + SeamProgress with a stage stepper cycling
idle→stitching(¼,½,¾)→complete plus an error trigger; (6) motion recipes on
dummy cards (hover/press/cascade); (7) focus-ring demo — a row of focusable
elements on both palettes; (8) the contrast-ratio table per §10; (9) the lime
sanctioned-uses list as rendered text; (10) PageTitle and StatusDot specimens.

## 13. Acceptance criteria (all must pass before the M12b commit closes)

1. `npm run build` + strict TS clean; app boots with tokens applied (body uses
   `--bg`/`--text`).
2. Grep checks return **zero** matches in `src/` excluding `styles/tokens.css`
   and `components/ui/`: raw hex (`#[0-9a-fA-F]{3,8}`), arbitrary values
   (`\[(#|[0-9]+px)`), `shadow-[`, raw duration literals.
3. Dev-tokens: every §12 section renders; contrast table all-green; swatches
   match design-system.md hexes on inspection.
4. shadcn Button/Input/Badge/Table render correctly *unmodified* inside both a
   light container and an `.inset` container (the bridge works).
5. SeamProgress: stitching loop runs; stage anchors hold at ¼ increments via
   the stepper; complete settles in 300ms; error recolors; base line crisp at
   1px.
6. Reduced-motion emulation: lifts/zoom/cascade/press vanish; caret and dot
   static; SeamProgress jumps by stage; focus rings unaffected.
7. Keyboard pass on the dev page: every specimen reachable, ring visible on
   both palettes.
8. `docs/project-state.md` updated; deviations logged in `decisions.md`
   (expected count: zero). Commit:
   `feat(web): design token layer, seam primitives, shadcn bridge`.

## 14. Out of scope (restated)

AppShell, sidebar, palette behavior, all feature pages/components, deploy
changes, any backend contact beyond M12a's wiring, any `.inset` application
outside the dev page. The dev route ships un-deleted until M12i by design.
