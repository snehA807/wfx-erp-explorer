# Component Library

Status: LOCKED. Promotion rule: a component enters this file (and `components/`)
on its second usage site. Props are described by intent; exact TS shapes are the
implementer's mechanical translation. All styling via tokens.

## 1. shadcn/ui primitives (vendored, restyled by tokens only)
Button · Input · Textarea · Select · Checkbox · Slider · Sheet · Dialog ·
Command · Table · Badge · Skeleton · Tooltip · Toast · Tabs.
Never edited per-feature; variants come from the token layer.

## 2. Foundation primitives

### Seam
Static stitched divider. Props: `variant: "light" | "inset"`. Used: page title
underline, DetailPanel section separators, top edge of machine surfaces.
Responsibility: render the dash pattern exactly per design-system §12; nothing
else.

### SeamProgress
Animated stitching line. Props: `state: "idle" | "stitching" | "complete"`.
Used: top edge of a streaming AICard. Stitching = dash-by-dash draw loop
(motion.md §4); complete = solid seam with accent stitches settling to seam
color. Reduced-motion: skips to complete state per event.

### PageTitle
Editorial title block. Props: `title`, `description?`, `meta?` (e.g. result
count), `actions?` (e.g. palette trigger). Renders display type, description in
body/muted, Seam underneath, 40px bottom air. Used: every page.

### StatusDot
Props: `status: "live" | "degraded" | "down"`. Pulsing 6px dot + label. Used:
sidebar footer. Grey/red states from /health failures.

## 3. Shell components

### AppShell
Owns sidebar/rail/bottom-tabs responsive switch, main column (max 1320,
gutters), route outlet, ToastViewport, CommandPalette mount, cold-start banner
slot, /health hook. Props: none (composition root).

### Sidebar / MobileTabs
Nav per navigation.md §4/§6. Props: none (reads route). Responsibility: active
states, tooltips in rail mode, footer status.

### ColdStartBanner
Props: `visible`. Dismissible strip: "Waking the server (free tier) — a few
seconds." Shown if first /health exceeds 3s; never shown twice per session.

### CommandPalette
Props: none (global). Behavior per navigation.md §5. Owns its debounced live
product query and recents read/write. Renders on inset tokens with top Seam.

## 4. Data display components

### StatCard
Props: `label`, `value` (preformatted string), `hero?`, `footnote?`, `icon?`,
`href?`. Hero = stat-hero type + flex-grow. Used: Overview (×5). Footnote
carries the revenue rule text ("excl. cancelled · INR"). Skeleton variant
matches geometry.

### ProductCard
Props: `product` (style_number, style_name, category, fabric, gsm, color,
selling_price, image_url), `matchScore?` (0–1, renders badge ≥ threshold 0.55),
`onOpen(style_number)`. 4:5 image frame, zoom-on-hover, image `onError` →
CategoryPlaceholder. Used: Products, Search, Visual, palette results (compact
row variant via `variant: "row"`).

### ResultTable
Schema-agnostic table for arbitrary SQL results. Props: `columns: string[]`,
`rows: unknown[][]`, `variant: "light" | "inset"`, `maxRows = 10`. Right-aligns
numeric-detected columns, tabular-nums, "Showing 10 of N" footer. Used: AICard
result section (inset), Overview recent orders (light, with Badge cells via
`cellRenderer?`).

### Badge (status)
Props: `kind: "order" | "payment"`, `value` (backend string). Maps value →
status tint + always-visible text. Used: tables, DetailPanel.

### FilterRail
Props: `facets` (from /filters/options), `active` (parsed URL params),
`onChange(params)`, `resultCount`. Renders grouped checkbox facets with counts,
GSM range slider, active-filter pills with ×, "Clear all". Collapses to a
Sheet-trigger button below 1280. Used: Search (full), Products (subset —
selects + pills toolbar variant via `variant: "toolbar"`).

### DetailPanel
Props: `styleNumber | null`, `onClose`. Right Sheet 480px (full-screen sheet on
mobile). Fetches `GET /products/{id}` itself (single-use fetch exception,
documented). Anatomy: image → identity (name, number·supplier) → price + cost →
Seam → spec key-values (2-col) → Seam → tech pack → Seam → supplier block (lead
time, rating, country) → "More like this" action → similar strip (uses
/products/{id}/similar; renders honestly empty state if none). Used from:
Products, Search, Visual, palette. URL-driven via `?style=`.

### EmptyState
Props: `flavor: "invite" | "no-results" | "error"`, `title`, `body?`,
`chips?: {label, onSelect}[]`, `action?: {label, onAct}`, `closest?: product[]`
(no-results flavor renders "Closest matches" mini-grid). Used: Ask hero (invite),
Search/Visual/Products zero states, regional error fallbacks.

### ChartCard
Props: `title`, `type: "hbar" | "donut"`, `data`, `onSegment?(key)`. Wraps
Recharts with token colors (accent highlight series + neutral grays), 300ms
initial draw only, tooltip on surface tokens. Used: Overview (×2). Segment click
→ deep-link.

## 5. Ask experience components

### AskHero
Props: `onSubmit(question)`, `chips: string[]`. Full-inset centered composer +
suggestion chips; collapses (motion.md §3) into AskComposer on first submit.
Used: Ask empty state only.

### AskComposer
Props: `onSubmit`, `disabled` (while streaming), `autoFocus`. Bottom-pinned
textarea (grow to 4 lines), Enter/Shift+Enter, lime focus glow on inset. Used:
Ask thread state; AskHero embeds it.

### AICard
The flagship. Props: `turn` = { question, stage: "sql" | "rows" | "answer" |
"done" | "error", sql?, rows?, columns?, answerText (accumulating), error?
{code, message, sql?}, meta? {model, tokens, cost} }, `defaultSqlOpen`.
Composition: SeamProgress (top, state from stage) → SQL section (SQLBlock) →
RESULT (ResultTable inset) → ANSWER (streamed prose + caret, aria-live) →
footer meta. Error rendering: `SQL_BLOCKED` = amber in-card notice + blocked
SQL + rephrase suggestion; `LLM_UNAVAILABLE` = in-card retry; execution error =
failed SQL kept visible + plain-language message. Used: Ask thread (list).

### SQLBlock
Props: `sql`, `streaming?`, `collapsed?`, `onCopy`. Mono on inset-surface,
minimal keyword tinting, copy button with "Copied" toast. Used: AICard; also
DetailPanel? — no. AICard only (single use today; lives in pages/ask/ until a
second consumer appears — noted to keep the promotion rule honest).

### UserTurn
Props: `text`. Small right-aligned light pill. Used: Ask thread.

### SuggestionChips
Props: `chips`, `onSelect`. Pill row; also consumed by EmptyState(invite).
Chips content = the assignment's example questions, defined once in
`pages/ask/chips.ts`.

## 6. Utility components
CategoryPlaceholder (icon + category label for broken images) · SkeletonGrid /
SkeletonStats / SkeletonTable (geometry-matched) · CopyButton (used by SQLBlock)
· VisuallyHidden (a11y labels).

## 7. Usage matrix (who uses what)

| Component | Ask | Overview | Products | Search | Visual | Shell |
|---|---|---|---|---|---|---|
| PageTitle / Seam | ● | ● | ● | ● | ● | palette |
| StatCard / ChartCard | | ● | | | | |
| ProductCard | | | ● | ● | ● | palette |
| ResultTable | ● | ● | | | | |
| FilterRail | | | ◐ toolbar | ● | | |
| DetailPanel | | | ● | ● | ● | via ?style |
| AICard suite | ● | | | | | |
| EmptyState | ● | | ● | ● | ● | |
| CommandPalette / StatusDot / Banner | | | | | | ● |
