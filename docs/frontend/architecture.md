# Frontend Architecture

Status: LOCKED. This document is the implementation contract. Deviations require a
line in `docs/frontend/decisions.md` before the deviating commit.

## 1. What this frontend is

A five-screen SPA over a finished, deployed FastAPI backend. The backend is the
source of truth; the frontend renders its envelope, never reshapes its semantics.
AI-first: the ask experience is the home page and the product's center of gravity.
Everything else exists to let a person browse what the AI can also be asked about.

## 2. Overall architecture

- **SPA, client-rendered only.** Vite + React 18 + TypeScript. No SSR, no meta-
  framework. Rationale: no SEO requirement, no auth, one evaluator audience, and
  Vercel serves static assets with a rewrite rule so deep links survive refresh.
- **One data direction:** route/page → hook → API client → backend. Components
  below page level never fetch; they receive typed props.
- **Route-level code splitting** via lazy imports — five small bundles behind one
  shell. No further splitting; the app is too small to justify it.
- **No global state library.** State budget (see §5) is deliberately small enough
  for React primitives. Adding Redux/Zustand/TanStack Query is a *decision-log
  event*, not a refactor.

## 3. Folder philosophy

```
frontend/src/
  app/            # composition root: router, providers, AppShell mount
  pages/          # one folder per route: ask/, overview/, products/, search/, visual/
  components/     # cross-page reusable components (see component-library.md)
    ui/           # shadcn primitives, restyled via tokens only — never edited per-use
  lib/            # api.ts (client + types), sse.ts, hooks/, format.ts, recents.ts
  styles/         # tokens.css (design tokens + seam + motion), globals
```

Rules:
- A component used by exactly one page lives in that page's folder; promotion to
  `components/` happens on second use, not speculatively.
- `lib/api.ts` is the **only** file that knows the backend base URL, the envelope
  shape, and error codes. Pages import functions and types from it, never `fetch`.
- `styles/tokens.css` is the only place a raw color/size/duration value may appear.
  Everything else references tokens (design-system.md §13). This is the frontend
  mirror of CLAUDE.md invariant 7.
- No `utils/` junk drawer. `format.ts` (currency ₹ crore, numbers, dates) and
  `recents.ts` (sessionStorage) are the only utility modules.

## 4. API boundaries

Backend base: `VITE_API_BASE_URL` (the Render URL), path prefix `/api/v1`.

| Frontend surface | Endpoint(s) |
|---|---|
| Ask (home) | `POST /query` (SSE), `POST /query/sql` |
| Overview | `GET /dashboard/stats`, `GET /health` |
| Products | `GET /products`, `GET /products/{style_number}`, `GET /filters/options` |
| Search | `POST /search/products`, `GET /filters/options` |
| Visual Search | `POST /search/visual`, `GET /products/{style_number}/similar` |
| Command palette | `GET /products?search=` (live results), local recents |
| Shell | `GET /health` (status dot, cold-start banner) |

Envelope contract (from backend-spec §3): success `{data, meta}`, error
`{error: {code, message, details}}`. The client unwraps `data`, exposes `meta`
where useful (pagination, token cost), and throws a typed `ApiError{code,message,
details,status}`. **UI branches on `error.code`, never on message strings.**
Codes in play: `SQL_BLOCKED`, `LLM_UNAVAILABLE`, `VALIDATION_ERROR`, `NOT_FOUND`,
`RATE_LIMITED`, plus network failure (no response) as its own branch.

SSE contract (`POST /query`): ordered events `status` → `sql` → `rows` →
`answer` (token chunks) → `done | error`. `lib/sse.ts` wraps this as an async
event stream with an abort handle; the Ask page consumes events, it never parses
wire format. `done` carries token usage; render it as muted meta text in the AI
card footer (cost transparency is a product feature).

## 5. State management

| State | Mechanism | Notes |
|---|---|---|
| Server data (lists, detail, stats) | page-level hooks (`useProducts`, `useStats`…) wrapping the API client; local `useState` + `useEffect`, request de-dup by simple in-flight guard | small app; no cache library |
| Filters, sort, page, search query | **URL search params** | shareable/bookmarkable; chart deep-links depend on this |
| Ask thread | page-local reducer (`useReducer`) — turns, streaming stage, partial answer | survives within session only; no persistence by design (not a chatbot) |
| Detail panel open/target | URL param `?style=WFX-2501` | back button closes panel; works from all three grid pages |
| Command palette | local state + `recents.ts` (sessionStorage, cap 5) | no backend history API exists; do not invent one |
| Health/cold-start | one shell-level hook, polled once + on-focus | feeds status dot and banner |

## 6. Rendering strategy

- Skeletons match final geometry (zero CLS) for every fetch-backed region.
- Streaming UI renders per SSE event; the answer region is `aria-live="polite"`.
- Images: fixed 4:5 frames, `object-cover`, lazy-loaded, `onError` → category
  placeholder. Treat dataset imagery as untrusted (shared/broken URLs exist).
- Lists: paginated server-side (`page_size` ≤ 48); never render 1,000 rows.
- Errors are regional: a failed panel shows its own error+retry; the shell and
  sibling regions never blank (error-states spec in design-system + motion docs).

## 7. Feature organization

Each page folder owns: its page component, page-specific components, and its
hook(s). Cross-page components live in `components/` and are documented in
component-library.md — seven custom components + shell pieces + seam primitives.
shadcn primitives are vendored under `components/ui/` and restyled only through
tokens; editing a shadcn file per-feature is prohibited.

## 8. Route organization

```
/            Ask (home)             lazy
/overview    Overview               lazy
/products    Products               lazy
/search      Search                 lazy
/visual      Visual Search          lazy
/ask         → redirect to /
*            → redirect to /  (no 404 page; five-route app)
```
Router: react-router (already implied by the stack; declarative routes in
`app/router.tsx`). Titles set per route ("Ask · WFX Explorer" pattern).

## 9. Design principles (binding)

1. Light canvas is for reading data; dark surfaces are exclusively machine
   surfaces (Ask screen, AI cards, SQL blocks, command palette). No exceptions —
   the grammar is information architecture.
2. The Seam is the only signature; it appears in its four sanctioned locations
   and nowhere else (design-system.md §12).
3. Typography and spacing carry hierarchy; borders separate; shadows only float
   or respond to hover.
4. Motion is feedback, ≤ 300ms, transform/opacity/box-shadow/color only, and all
   of it respects `prefers-reduced-motion` (motion.md).
5. Every fetch-backed region has designed loading, empty, and error states.
6. Accessibility floor: labeled inputs, visible focus, keyboard-complete F1 flow,
   status = color + text, contrast ≥ 4.5:1 on both palettes.
7. No feature creep: if it isn't in implementation-plan.md, it doesn't get built.
