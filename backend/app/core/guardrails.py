from __future__ import annotations

import re

from app.core.errors import SQLGuardrailError

# backend-spec.md §4 layer (2): app-level guardrails on top of the
# `app_readonly` DB role (layer 1, SELECT-only + default_transaction_read_only
# already blocks writes at the DB itself) — this module exists to fail fast
# with a clear SQL_BLOCKED error instead of relying solely on the DB to
# reject a write.

_STRING_LITERAL_RE = re.compile(r"'(?:[^']|'')*'")

# DML/DDL/DCL plus Postgres-specific statements with no legitimate use in a
# read-only analytical SELECT/WITH query. Word-boundary matching means
# snake_case identifiers (e.g. `created_at`, `lock_status`) never collide —
# `\b` doesn't fire between "CREATE" and the "D" in "CREATED", since "_" and
# letters are both word characters.
_DENYLIST_KEYWORDS = (
    "INSERT", "UPDATE", "DELETE", "MERGE", "UPSERT",
    "DROP", "ALTER", "TRUNCATE", "CREATE",
    "GRANT", "REVOKE",
    "COPY", "VACUUM", "REINDEX", "CLUSTER", "REFRESH",
    "CALL", "EXECUTE", "PREPARE", "DEALLOCATE",
    "LISTEN", "NOTIFY", "UNLISTEN",
    "SET", "RESET", "LOCK", "DO",
    "COMMENT",
    # Not a statement-level keyword, but `SELECT ... INTO new_table` is a
    # DDL-via-SELECT bypass that an "starts with SELECT" check alone would
    # miss; this app's analytical queries never legitimately need it.
    "INTO",
)
_DENYLIST_RE = re.compile(r"\b(" + "|".join(_DENYLIST_KEYWORDS) + r")\b", re.IGNORECASE)

_ALLOWED_START_RE = re.compile(r"^\s*(SELECT|WITH)\b", re.IGNORECASE)
_LIMIT_RE = re.compile(r"\bLIMIT\b", re.IGNORECASE)

MAX_ROWS = 100


def _mask_literal(match: re.Match[str]) -> str:
    literal = match.group(0)
    return literal[0] + "x" * (len(literal) - 2) + literal[-1]


def _mask_string_literals(sql: str) -> str:
    """Blanks out the contents of '...' literals (keeping length/position)
    so structural checks (statement count, keyword scan) never trip on data
    values — e.g. a filter like `note = 'Wash; then DROP off'` is not
    chaining or a DROP attempt."""
    return _STRING_LITERAL_RE.sub(_mask_literal, sql)


def enforce_guardrails(sql: str) -> str:
    """backend-spec.md §4: single statement, SELECT/WITH only, deny-list
    DML/DDL/comment-smuggling, auto-LIMIT 100. Raises SQLGuardrailError
    (400, SQL_BLOCKED) on any violation; otherwise returns the exact SQL
    string that is safe to execute.

    Known simplification: LIMIT-presence is checked anywhere in the
    statement, not just at the top level, so `SELECT ... LIMIT 100 UNION
    SELECT ...` skips auto-LIMIT even though the UNION could still exceed
    100 rows. Accepted for M6 — the DB role's own statement_timeout and the
    fact this only ever wraps LLM-generated SQL (never handwritten) make a
    full parser disproportionate here (docs/decisions.md).
    """
    if not sql or not sql.strip():
        raise SQLGuardrailError("Empty SQL is not allowed")

    if "--" in sql or "/*" in sql or "*/" in sql:
        raise SQLGuardrailError("SQL comments are not allowed")

    masked = _mask_string_literals(sql)

    statements = [s for s in masked.split(";") if s.strip()]
    if len(statements) != 1:
        raise SQLGuardrailError("Only a single SQL statement is allowed")

    if not _ALLOWED_START_RE.match(masked.strip()):
        raise SQLGuardrailError("Only SELECT/WITH statements are allowed")

    denied = _DENYLIST_RE.search(masked)
    if denied:
        raise SQLGuardrailError(
            f"Statement contains a disallowed keyword: {denied.group(1).upper()}"
        )

    # Any semicolon surviving in `sql` outside of a masked literal has
    # already been proven (via the single-statement check above) to be at
    # most one trailing separator — safe to strip without re-parsing.
    clean_sql = sql.strip()
    if clean_sql.endswith(";"):
        clean_sql = clean_sql[:-1].rstrip()

    if not _LIMIT_RE.search(masked):
        clean_sql = f"{clean_sql} LIMIT {MAX_ROWS}"

    return clean_sql
