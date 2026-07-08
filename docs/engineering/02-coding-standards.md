# Coding Standards

## Python (backend)
- Python 3.11, formatted with `ruff format`, linted with `ruff` — zero warnings at commit.
- Type hints on every public function; Pydantic models for all I/O boundaries.
- SQL lives in `db/queries/` as named constants with `%(param)s` placeholders — never f-string interpolation, never inline in services.
- Exceptions: raise `AppError` subclasses from `core/errors.py`; never return error dicts manually.
- Logging: `structlog` with bound `request_id`; log events are snake_case nouns (`nl2sql_generated`, `guardrail_blocked`). Never log secrets or full payloads.
- No module-level side effects except in `main.py` lifespan. Models/clients are lazy singletons.
- Docstrings: one line, only where the name isn't self-explanatory. Comments explain *why*, never *what*.

## TypeScript (frontend)
- Strict mode on. No `any` — use `unknown` + narrowing.
- All API types in `src/lib/api.ts`, mirrored from backend Pydantic models. One fetch wrapper handles envelope + errors + SSE.
- Components: function components only; one component per file; pages compose components, never fetch inline (hooks in `src/lib/`).
- Styling: Tailwind classes using config tokens only. No hex literals, no arbitrary values (`w-[13px]` banned).
- State: local `useState`/`useReducer`; URL search params for filter/pagination state (shareable links). No global state library.

## Both
- Names: full words, no abbreviations (`suppliers`, not `supps`).
- Max function length ~40 lines; extract when a comment section header appears.
- Delete dead code immediately; no commented-out blocks in commits.
