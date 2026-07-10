# Navigation & Information Architecture

Status: LOCKED.

## 1. Information Architecture

AI-first: asking is the primary interface; browsing is secondary. The IA is flat —
five peers, no nesting, no settings (no auth by design), and it mirrors the
backend surface one-to-one so both stay learnable together.

```
Ask            /           the home; POST /query (SSE), /query/sql
Overview       /overview   GET /dashboard/stats  (renamed from "Dashboard")
Products       /products   GET /products, /products/{id}, /filters/options
Search         /search     POST /search/products, /filters/options
Visual Search  /visual     POST /search/visual, /products/{id}/similar
```

## 2. Route tree

```
/                Ask (home)
/overview        Overview
/products        Products            ?page ?sort_by ?order ?category ?fabric ?season
                                     ?color ?print ?min_gsm ?max_gsm ?supplier
                                     ?search ?style (detail panel target)
/search          Search              ?q + same filter params + ?style
/visual          Visual Search       ?q + ?style
/ask             redirect → /
*                redirect → /
```
Filter/sort/page/detail state lives in URL params (architecture.md §5) — this is
what makes chart deep-links and shareable views possible. The `?style` param
opens the DetailPanel on any grid page; Back closes it.

## 3. Navigation hierarchy

Primary: sidebar (desktop/tablet) or bottom tabs (mobile) — the five routes in
frequency order: Ask, Overview, Products, Search, Visual. Secondary: command
palette (global). Tertiary: in-content links — chart segments → filtered
/products; status badges → /products pre-filtered; "More like this" → /visual
context; Overview "View all" → /products.

## 4. Sidebar

232px fixed, `--surface`, hairline right border.
- Header: product mark + "WFX Explorer" (title style).
- Items: 18px lucide icon + 13px/500 label, radius 8, 8px vertical rhythm.
  Hover: icon nudge + label brighten. Active: 2px `--accent` left edge +
  tinted background. Ask sits first and carries a faint accent edge even at
  rest — it is the home.
- Footer: live status dot (6px, `--success`, gentle pulse; fed by /health —
  grey when unreachable) + "1,000 styles · Live" micro text + GitHub link.
- Tablet (768–1280): collapses to 64px icon rail, labels become tooltips.
- The sidebar stays light on every route — it is the constant frame that anchors
  the light↔dark transition when entering Ask.

## 5. Command palette (⌘K / Ctrl+K)

Renders on **inset tokens** regardless of backdrop (it is a machine surface).
Radius 12, floating shadow, seam at its top edge (sanctioned location 1).

Verb groups, in order:
1. **Ask** — first row is always `Ask: "{typed text}"` → navigates to `/`,
   pre-fills, auto-submits.
2. **Search products** — `Search products: "{text}"` → `/search?q=`, plus up to
   5 live product results inline (debounced 250ms `GET /products?search=`),
   each → `/products?style={id}` (opens DetailPanel).
3. **Go to** — Ask · Overview · Products · Search · Visual Search.
4. **Recent** — last 5 questions/searches from sessionStorage (`recents.ts`),
   re-runnable; empty group hidden. No backend history exists; do not invent one.

Keyboard: ⌘K/Ctrl+K toggle, arrows navigate, Enter executes, Esc closes, focus
returns to invoker. Trigger affordance: slim ghost "Search or ask… ⌘K" button in
each page title block (there is no global header — vertical pixels belong to
data).

## 6. Mobile navigation (<768px)

Bottom tab bar: five icons + 11px labels, active = accent tint. DetailPanel
becomes a full-screen sheet. Filter rail becomes a "Filters" button opening a
sheet. Palette opens via the title-block button (no hardware shortcut assumed).

## 7. User journeys

**J1 — Ask (flagship):** open app → dark hero, centered composer + 4 suggestion
chips (the assignment's example questions verbatim) → click chip or type →
hero collapses to thread → AI card stitches: SQL streams → rows → answer tokens
→ follow-up composer stays focused. First visible feedback < 1s.

**J2 — Guardrail (the evaluator's test):** ask "delete all orders" → same card
anatomy, amber notice, blocked SQL visible, suggested rephrase → trust
established by transparency.

**J3 — Find & inspect:** /search → "blue floral dress" → relevance grid with
match badges → facet-narrow → card click → DetailPanel (specs, tech pack,
supplier) → "More like this" → visually similar set.

**J4 — Scan & drill:** /overview → 5 stats in 3s → revenue-by-category bar
click → /products?category=… pre-filtered → detail panel → back restores scroll.

**J5 — Power path:** anywhere → ⌘K → type "black hoodie under 900" → Enter on
the Ask row → answer streaming within two keystrokes of intent.
