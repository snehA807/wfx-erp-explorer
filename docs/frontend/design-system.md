# Design System — Direction C ("Enterprise Stripe + AI")

Status: LOCKED. All values below are the token source of truth. Raw values may
appear only in `styles/tokens.css`; every component references tokens.

Governing grammar: **light = the human's data, dark = the machine thinking.**
Dark ("inset") surfaces are exclusively: the Ask screen, AI response cards, SQL
blocks, and the command palette. Nothing else may be dark.

## 1. Colors

### Light palette (canvas)
| Token | Value | Role |
|---|---|---|
| `--bg` | `#FAFAF9` | app canvas (warm off-white) |
| `--surface` | `#FFFFFF` | cards, panels, sidebar |
| `--border` | `#E7E5E4` | hairlines |
| `--border-strong` | `#D6D3D1` | hover borders, seam (light) |
| `--text` | `#1C1917` | primary text (never pure black) |
| `--text-2` | `#78716C` | secondary/meta |
| `--action` | `#1C1917` | primary buttons (near-black fills) |
| `--action-hover` | `#292524` | |

### Inset palette (machine surfaces)
| Token | Value | Role |
|---|---|---|
| `--inset` | `#16161A` | machine canvas |
| `--inset-surface` | `#232329` | cards/tables on inset |
| `--inset-border` | `#2E2E34` | hairlines on inset |
| `--inset-text` | `#F4F4F2` | primary on inset |
| `--inset-text-2` | `#9C9A92` | secondary on inset |
| `--seam-inset` | `#3A3A42` | seam color on inset |

### Accent & status
| Token | Value | Rules |
|---|---|---|
| `--accent` | `#C8F542` (electric lime) | **never body text; never a text-bearing fill except with `--accent-ink`.** Sanctioned uses: active-nav edge, selected pills, chart highlight series, focus glow on inset, seam-progress stitch, status dot |
| `--accent-ink` | `#2A3B00` | text on accent fills |
| `--success` `--warning` `--danger` | `#16A34A` `#D97706` `#DC2626` | status badges ONLY (order/payment). Each has a soft tint (`#F0FDF4` `#FFFBEB` `#FEF2F2`) for badge backgrounds |

Contrast floor: every text token ≥ 4.5:1 on its designated surface, both palettes.
Lime is a *marker*, not a message: scarcity is what makes it read premium.

## 2. Typography

Faces: **Inter** (UI), **JetBrains Mono** (SQL, style numbers, token counts).

| Role token | Size/Weight/Detail | Use |
|---|---|---|
| `display` | 30 / 600 / tracking −0.02em | editorial page titles |
| `title` | 18 / 600 | card & section titles |
| `body` | 14 / 400 / lh 1.5 | default |
| `small` | 13 / 400 | table cells, meta |
| `micro` | 12 / 500 / UPPERCASE / +0.04em | labels, column headers, badges |
| `stat` | 28 / 600 / `tabular-nums` | stat values |
| `stat-hero` | 32 / 600 / `tabular-nums` | the Revenue card |
| `mono` | 13 / 450 (mono face) | SQL, IDs |

`tabular-nums` is mandatory on every numeric column and stat.

## 3. Spacing
4px scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48. Page gutter 24 (16 on mobile).
Card padding 20. Grid gap 16. Section stack 32. Title block bottom margin 40 —
the one place generous air is spent.

## 4. Elevation
Borders separate; shadows float. Static cards: border only. Hover: shadow blooms
`0 1px 2px rgba(0,0,0,.05)` → `0 6px 16px rgba(0,0,0,.08)`. Floating surfaces
(DetailPanel, palette, dropdowns, toasts): `0 8px 24px rgba(0,0,0,.12)`. Nothing
else casts shadow.

## 5. Radius
8px controls/cards · 12px panels/dialogs/palette · 6px badges/pills · 999 for the
status dot. One family; no mixing.

## 6. Grid
Main column max-width 1320, centered. Stat row: 5 cards, Revenue flex-grows
wider. Product grids: auto-fill `minmax(240px, 1fr)` → 4/3/2/1 columns. Search:
260px filter rail + fluid results. Ask thread: single column, max 760 (reading
measure). No bespoke grid systems.

## 7. Iconography
lucide-react only. 18px in nav/buttons, 16px inline, 24px in empty states.
Stroke width default. Icons never appear without an accessible name (visible
label or `aria-label`).

## 8. Tables
Hairline row separators only — no zebra, no vertical rules. Rows 40px, cells
13px, headers `micro` style muted. Numerics right-aligned tabular; first column
weight 500 as row anchor. Row hover: bg tint. Status/payment rendered as tinted
Badges (text always present). Dark variant (inside AI cards) uses inset tokens,
same rules. Sort indicators only on sortable columns.

## 9. Cards
`--surface`, 1px `--border`, radius 8, padding 20. Hover recipe (motion.md §2):
lift −2px + shadow bloom + border→`--border-strong`. Product cards: 4:5 image
frame (`object-cover`), image zoom-within-frame on hover, then name / meta line
(`WFX-2501 · Cotton Twill · 211 GSM`, small/muted) / price semibold.

## 10. Forms
Sparse by design. Inputs: `--surface`, 1px border, radius 8, 14px text, focus
ring per §Accessibility. Ask composer: auto-grow textarea (max 4 lines), Enter
submits, Shift+Enter newline. Search inputs debounce 300ms. Filter rail: checkbox
facets with counts, GSM dual-range slider, active filters as removable pills.
Labels always present (visible or aria).

## 11. AI cards (the flagship anatomy)
One full-width card per AI turn on `--inset`, radius 12, seam-progress line at
top (§12). Three labeled sections in pipeline order, each preceded by a `micro`
label on `--inset-text-2`:
1. **SQL** — mono on `--inset-surface`, subtle syntax tint, copy button, streams
   in first; collapsible (open by default on first turn, collapsed after).
2. **RESULT** — dark-variant ResultTable, max 10 rows + "10 of N".
3. **ANSWER** — body prose, token-streamed with caret, `aria-live="polite"`.
Footer meta: model · tokens · cost (muted mono). User turns: small right-aligned
light pills — the size/tone asymmetry (small light human / full-width dark
machine) is intentional grammar. `SQL_BLOCKED` renders inside the same anatomy
as a calm amber notice with the blocked SQL still visible: "This tool is
read-only — I can show you the data instead."

## 12. Running Stitch (Seam System) — the signature
A fine dashed line with machine-stitch rhythm. Implemented once as tokens +
two primitives (`Seam`, `SeamProgress`), consumed nowhere else.

Spec: dash 6px, gap 4px, thickness 1px (2px for seam-progress), rounded caps
(SVG stroke). Color `--border-strong` on light, `--seam-inset` on inset;
seam-progress stitches in `--accent`.

**Four sanctioned locations — exhaustive, enforced in review:**
1. The light↔inset boundary (top edge of every machine surface) — the
   human/machine seam made literal.
2. Under every editorial page title.
3. Section separators inside DetailPanel.
4. `SeamProgress`: the animated stitching line across the top of a streaming AI
   card — draws dash-by-dash while generating (motion.md §4), whole when done.
Any fifth use is a decision-log event. Overuse turns signature into wallpaper.

## 13. Design tokens
All of the above lives in `styles/tokens.css` as CSS custom properties, grouped:
color (light), color (inset scope), type roles, space scale, radius, shadow,
motion durations/easings, seam (dash metrics + colors), z-index scale (shell 10,
panel 40, palette 50, toast 60). The Tailwind theme maps to these variables;
no component may bypass the mapping. Adding a token = one-line rationale in
decisions.md.
