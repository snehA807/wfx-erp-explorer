# Frontend Implementation Plan

Status: LOCKED. One milestone per session; commit on green acceptance; update
`docs/project-state.md` at each close (existing repo convention). Backend is
frozen — any "the API should…" thought is a decisions.md entry, not a change.
Schedule context: deadline-day compression applies — the cut order at the end
of this file is pre-authorized and requires no deliberation.

---

## M12a — Project foundation
**Goal:** A booting Vite + React 18 + TS app with routing, the API/SSE client
layer, and env wiring — zero visual work.
**Files created:** `frontend/` scaffold; `src/app/{main,router,providers}`;
`src/lib/{api.ts,sse.ts,format.ts,recents.ts}`; `src/lib/hooks/useHealth.ts`;
placeholder page components (5); `.env.example` entry `VITE_API_BASE_URL`;
`vercel.json` (SPA rewrite, held until M12i deploy).
**Files modified:** root `.gitignore` (frontend build artifacts), `docs/project-state.md`.
**Acceptance:** all five routes render placeholders; `/ask` and `*` redirect to
`/`; `api.ts` unwraps the envelope and throws typed `ApiError{code}` (proven
against the live Render backend for one success + one forced 404); `sse.ts`
streams `POST /query` events end-to-end in a console harness; Tailwind pinned
3.4.x; strict TS; `npm run build` clean.
**Risks:** SSE-over-fetch parsing quirks (mitigate: verify against production
/query before building any UI on it); CORS — Vercel origin not yet allowed
(dev origin localhost already is; production origin added at M12i).
**Out of scope:** tokens, shell, any styled component.

## M12b — Design system (tokens layer)
**Goal:** `styles/tokens.css` + Tailwind theme mapping = the entire
design-system.md §1–§6, §13 and motion.md §1 encoded; shadcn installed and
token-bound; Seam/SeamProgress primitives built and visually verified.
**Files created:** `src/styles/tokens.css`; `components/ui/*` (shadcn vendored);
`components/{Seam,SeamProgress,PageTitle,StatusDot}.tsx`; a throwaway
`/dev-tokens` route (deleted in M12i) rendering every token, type role, badge
tint, and both SeamProgress states for eyeball QA.
**Files modified:** `tailwind.config`, `index.css`, router (dev route).
**Acceptance:** every design-system value present as a variable; light + inset
scopes both render with passing contrast on the dev page; SeamProgress plays
stitching/complete/error and respects reduced-motion; no raw hex/px outside
tokens.css (grep check).
**Risks:** dash rendering crispness at 1px on non-retina (mitigate: SVG
shape-rendering tuning on the dev page before mass use).
**Out of scope:** shell, pages.

## M12c — Layout shell
**Goal:** AppShell: sidebar → rail → bottom tabs, main column, palette mount
point (stub), cold-start banner, health status dot.
**Files created:** `components/shell/{AppShell,Sidebar,MobileTabs,ColdStartBanner}.tsx`.
**Files modified:** router (wrap routes), placeholders get PageTitle blocks.
**Acceptance:** three breakpoints reflow per navigation.md §4/§6; active states
+ Ask's resting accent edge correct; status dot live against production
/health; banner fires on simulated slow health (throttle test) once per
session; keyboard: tab order sane, focus visible everywhere.
**Risks:** none material.
**Out of scope:** palette behavior (M12h), page content.

## M12d — Overview (Dashboard)
**Goal:** the /overview screen complete: 5 StatCards (Revenue hero + footnote),
2 ChartCards with deep-links, recent-orders ResultTable with status Badges.
**Files created:** `pages/overview/*` (page, useStats hook), `components/{StatCard,ChartCard,ResultTable,Badge}.tsx`, skeleton variants.
**Files modified:** —
**Acceptance:** numbers match `GET /dashboard/stats` exactly; ₹ crore
formatting; tabular-nums verified; chart segment click lands on
`/products?category=…` (params correct even though Products ships next);
skeletons geometry-locked (no CLS at throttled load); load cascade plays once;
error state = regional EmptyState(error) + retry, shell intact.
**Risks:** Recharts token theming friction (timebox: fall back to two-color
hardcoded-via-token styling rather than fighting the theme API).
**Out of scope:** dynamic charts from SQL results (M12h/stretch).

## M12e — Product Explorer
**Goal:** /products complete: toolbar (count · search · sort · grid/table
toggle), ProductCard grid, pagination, URL-param state, DetailPanel.
**Files created:** `pages/products/*`, `components/{ProductCard,DetailPanel,EmptyState,CategoryPlaceholder,FilterRail(toolbar variant)}.tsx`.
**Files modified:** router (— none; `?style` is param only).
**Acceptance:** all list params round-trip through the URL (refresh restores
view); page_size ≤ 48 honored; image zoom + card hover per motion.md; broken
image → placeholder (test with a bad URL); DetailPanel: joined payload renders
(specs/tech pack/supplier), Seam separators, similar strip shows honest empty
state (embeddings note) or items; back button closes panel and restores scroll;
grid/table toggle preserves state.
**Risks:** detail similar-strip depends on M9 embeddings being present in prod —
if NULL, the "no similar items yet" copy ships (already designed; not a bug).
**Out of scope:** semantic search, match badges.

## M12f — Search + Visual Search
**Goal:** both search screens: hero inputs, FilterRail (full) with facet counts
+ pills, relevance grids with match badges, Visual's image-forward variant,
"More like this" journey.
**Files created:** `pages/search/*`, `pages/visual/*`; FilterRail full variant.
**Files modified:** ProductCard (matchScore badge), EmptyState (closest-matches
flavor wired to top-2 semantic hits).
**Acceptance:** debounce 300ms; results re-rank on query against production;
badges suppressed < 0.55; facet counts from /filters/options; pills
add/remove/clear correctly and reflect in URL; Visual subtitle copy present
("Searches what garments look like…"); no-results state offers closest matches
+ clear filters; DetailPanel reachable from both.
**Risks:** match-score distribution may cluster oddly → tune threshold on real
data during acceptance, note final value in decisions.md.
**Out of scope:** palette live-results (M12h).

## M12g — AI Query (flagship)
**Goal:** the home screen complete: AskHero + chips → thread with AICard full
anatomy, SSE-staged rendering, SeamProgress wired to stages, all error states.
**Files created:** `pages/ask/*` (page, thread reducer, chips.ts,
{AskHero,AskComposer,AICard,SQLBlock,UserTurn,SuggestionChips}).
**Files modified:** —
**Acceptance:** J1 end-to-end against production (< 1s to SQL visible on warm
backend); hero collapse plays once; status line narrates stages; SQL open on
first turn, collapsed after; copy button works; ResultTable inset variant caps
at 10; answer streams with caret + aria-live; `done` meta (model/tokens/cost)
in footer; **J2 verified live**: "delete all orders" → amber SQL_BLOCKED card;
kill backend mid-stream → error event renders, thread survives, retry works;
Enter/Shift+Enter/Esc; keyboard-only J1 pass; reduced-motion pass (seam jumps
by stage).
**Risks:** the highest-value screen with the most states — protect its 2h; if
squeezed, UserTurn/chips polish gives way before AICard correctness ever does.
**Out of scope:** conversation memory (deliberately none), dynamic charts.

## M12h — Analytics + Command Palette
**Goal:** the honest analytics layer: palette (full verb spec) + Overview
deep-link audit; STRETCH ONLY: dynamic bar chart above single-group-by SQL
results in AICard (the reserved slot).
**Files created:** `components/shell/CommandPalette.tsx`.
**Files modified:** AICard (stretch slot), title blocks (palette trigger).
**Acceptance:** ⌘K/Ctrl+K everywhere; Ask row auto-submits; live product rows
(debounced 250ms) open DetailPanel; Go-to group; Recent from sessionStorage
capped at 5, hidden when empty; inset styling + top Seam; focus trap + return.
Stretch chart only if all prior milestones green AND before 17:00.
**Risks:** scope temptation — the stretch is the only optional item in this
plan; everything else in M12h ships or is cut whole per the cut order.
**Out of scope:** any new backend call beyond `GET /products?search=`.

## M12i — Polish, deploy, handoff
**Goal:** production quality floor + Vercel live + docs updated.
**Files created:** none (deletes `/dev-tokens`).
**Files modified:** cross-cutting fixes; `docs/project-state.md`;
`docs/frontend/decisions.md` (final entries).
**Acceptance:** loading/empty/error sweep — every fetch region has all three
(throttled-network walkthrough); 375px pass on all five screens; reduced-motion
full pass; contrast spot-check both palettes; alt text on product images;
console clean; `npm run build` clean; **Vercel deployed**, rewrite rule proven
(refresh on /products), CORS origin added on Render, J1–J5 executed twice on
production URLs.
**Risks:** CORS/env misconfiguration — deploy at the *start* of this milestone,
not the end, so fixes have runway.
**Out of scope:** everything. Feature freeze is in effect at 18:00.

---

## Cut order (pre-authorized, no deliberation)
1. M12h stretch chart → 2. Palette live product results (keep Ask/Go-to/Recent)
→ 3. Grid/table toggle → 4. Donut becomes badge row → 5. Hero collapse
animation (instant swap). **Never cut:** five screens, AICard error states,
SeamProgress, deploy, the three-state sweep.
