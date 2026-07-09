from __future__ import annotations

import psycopg
import structlog

from app.core.config import get_settings

logger = structlog.get_logger()

_connection: psycopg.Connection | None = None


def get_connection() -> psycopg.Connection:
    """Lazy singleton (coding-standards.md): opened on first use, reopened
    if the previous one died. A single connection is enough for backend-
    spec.md §11's single-uvicorn-worker deploy; DATABASE_URL is expected to
    point at Supabase's own pooler (§4: "pooled connection string"), so
    adding app-level pooling (a new dependency) on top of that would be
    redundant, not just simpler to skip."""
    global _connection
    if _connection is None or _connection.closed:
        settings = get_settings()
        _connection = psycopg.connect(
            settings.database_url, autocommit=True, connect_timeout=5
        )
    return _connection


def check_connectivity() -> bool:
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        return True
    except psycopg.Error:
        logger.warning("db_connectivity_check_failed")
        return False


def close_connection() -> None:
    global _connection
    if _connection is not None and not _connection.closed:
        _connection.close()
    _connection = None
