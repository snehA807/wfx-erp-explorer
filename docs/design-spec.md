# Design Spec — WFX ERP Explorer

Design philosophy: Linear/Stripe/Vercel-grade restraint — one accent color, one font,
neutral surfaces, density with breathing room, motion as feedback not theater,
typography carrying hierarchy instead of boxes/borders. Loading/empty/error states are
designed, not defaulted. Persona: a sourcing manager scanning data between meetings —
optimize every screen for scan speed.

## 1. Information Architecture
```
/            Dashboard (overview, landing page)
/ask         Ask AI (NL2SQL — flagship screen)
/products    Products (Finished Goods Explorer)
/search      Search (hybrid semantic + filters)
/visual      Visual Search (CLIP text-to-image)
```
Flat, five peer destinations, zero nesting.

## 2. Navigation
Fixed left sidebar (232px, collapsible to 64px icon rail). Active item: accent-tinted
background + 2px accent left-edge indicator. Footer: live data status dot + GitHub
link. Mobile (<768px): bottom tab bar, same 5 destinations.

## 3. Core User Flows
- **F1 (Ask a question):** land on /ask → click a suggested chip or type → SQL streams
  in first (<1s) → result table → prose answer streams token-by-token.
- **F2 (Find a product):** /search → semantic query → narrow with filters → click card
  → detail drawer (specs, tech pack, supplier) → "More like this".
- **F3 (Executive scan):** / → 5 stat cards readable in 3s → charts → click a chart
  segment → deep-links to pre-filtered /products.

## 4. Screen Inventory
1. **Dashboard (/)** — stat cards (Total Finished Goods, Suppliers, Buyers, Orders,
   Revenue) + revenue-by-category and order-status charts + recent orders table.
2. **Ask AI (/ask)** — chat-style thread; each assistant turn is a structured card
   with three labeled sections: SQL (collapsible, syntax-highlighted, copy button) →
   Result table → streamed prose Answer. Suggested-question chips seeded from the
   assignment's own example questions. NOT styled as rounded chat bubbles — full-width
   structured cards, to avoid "chatbot" framing.
3. **Products (/products)** — professional gallery, grid/table toggle, each card shows
   image, style number, name, fabric, GSM, supplier, price. Pagination, sorting,
   filtering.
4. **Search (/search)** — hero search bar, left filter rail with facet counts,
   relevance-ranked results with match-percentage badges (hidden below a low-confidence
   threshold), removable filter chips.
5. **Visual Search (/visual)** — image-forward grid, larger tiles, info-on-hover;
   natural-language query describing appearance, not metadata.
- **Product Detail Drawer** (shared across Products/Search/Visual): image, identity,
  spec key-value rows, tech pack section, supplier section, "More like this" button.

## 5. Component Inventory
From shadcn/ui: Button, Input, Select, Sheet, Dialog, Table, Tabs, Badge, Skeleton,
Tooltip, Slider, Command (⌘K), Toast.
Custom: StatCard, ProductCard, SQLBlock, ResultTable, MessageBubble, FilterRail,
EmptyState (one component, three flavors: first-visit-with-suggestions, no-results,
zero-row-SQL-result).

## 6. Design System
**Typography:** Inter (UI), JetBrains Mono (SQL/style numbers only). 14px body base.
Scale: display 24/semibold, title 18/semibold, body 14/regular, small 13/regular,
micro 12/medium uppercase, stat 28/semibold tabular-nums.

**Color (tokens, light mode):**
- bg #FAFAF9, surface #FFFFFF, border #E7E5E4
- text-primary #1C1917, text-secondary #78716C
- accent #4F46E5 (indigo-600), accent-soft #EEF2FF
- success #16A34A, warning #D97706, danger #DC2626
Status color is reserved for data semantics only (order/payment status badges) —
scarcity makes the accent meaningful.

**Spacing:** 4px base scale (4/8/12/16/24/32/48). Page gutter 24 (16 mobile). Card
padding 20. Grid gap 16. Radius: 8px controls/cards, 12px drawer/modals, 6px badges.
Elevation: borders separate static elements; shadows only on floating elements
(drawer, dropdown, ⌘K palette) — `0 4px 16px rgba(0,0,0,0.08)`.

## 7. Interaction Guidelines
150ms ease-out transitions on color/border-color/opacity/transform only. Hover: cards
lift 1px + border darkens; rows tint background. Focus: 2px accent ring, 2px offset,
on every interactive element. Search inputs debounce 300ms; filters apply instantly.
Enter submits in Ask AI (Shift+Enter for newline); Esc closes drawer.

## 8. Loading States
Skeletons (matching final geometry, zero layout shift) for stat cards, grids, tables —
never spinners for layout-shaped waits. Ask AI streaming has its own staged loading
state: a status line cycling "Generating SQL… → Running query… → Writing answer…".
Cold-start guard: if `/health` hasn't responded in 3s, show a one-time banner
explaining the free-tier server is waking up.

## 9. Empty States
- First-visit (Ask AI/Search/Visual): 4 suggested-query chips, not a blank screen.
- No results: "No products match" + "Clear filters" + 2 nearest semantic matches.
- Zero-row SQL result: the AI answer states this in prose, never a bare empty table.

## 10. Error States
- NL2SQL failure: keep the generated SQL visible, one-line explanation, a working
  suggested alternative — never a stack trace.
- Blocked write attempt: calm inline notice — "This tool is read-only. I can show you
  the data instead." (Evaluators will test this; treat it as a visible product feature.)
- Network failure: toast + inline retry on the failed panel only.
- Broken product image: neutral placeholder with category icon.

## 11. Accessibility (targeted subset)
Semantic landmarks; every input labeled; visible focus rings everywhere; full keyboard
path through flow F1; alt text = style name + color + category; status conveyed by
color + text together, never color alone; all text tokens ≥ 4.5:1 contrast;
`prefers-reduced-motion` respected.

## 12. Signature Interaction
⌘K command palette (shadcn Command component): navigate to any screen, or
"Ask: [typed text]" jumps to /ask pre-filled. High polish-per-hour; ~45 minutes of work.

## 13. Responsive Strategy
≥1280px: full layout. 768–1280px: sidebar → icon rail, filter rail → "Filters" button
opening a Sheet, grids 4→3 columns. <768px: bottom tabs, single-column grids, drawer →
full-screen sheet.
