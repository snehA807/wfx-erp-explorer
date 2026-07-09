from __future__ import annotations

import psycopg
import structlog

from app.core.config import get_settings

logger = structlog.get_logger()

_connection: psycopg.Connection | None = None

# TCP keepalives tuned well below libpq's OS-default idle threshold
# (commonly ~2h) — found during M8 live verification: a connection idle
# between requests for ~9 minutes was silently dropped by an intermediate
# hop (Supabase's pooler or the local network path) without a clean
# FIN/RST, so `.closed` below still read False and the next `execute()`
# blocked forever on a peer that no longer existed. With these set, a dead
# socket is detected by the kernel within roughly idle+interval*count
# (~50s) instead of hanging indefinitely.
_KEEPALIVE_KWARGS = {
    "keepalives": 1,
    "keepalives_idle": 20,
    "keepalives_interval": 10,
    "keepalives_count": 3,
}


def _connect() -> psycopg.Connection:
    settings = get_settings()
    return psycopg.connect(
        settings.database_url,
        autocommit=True,
        connect_timeout=5,
        **_KEEPALIVE_KWARGS,
    )


def get_connection() -> psycopg.Connection:
    """Lazy singleton (coding-standards.md): opened on first use, reopened
    if the previous one died or a cheap liveness ping (below) proves it
    stale. A single connection is enough for backend-spec.md §11's
    single-uvicorn-worker deploy; DATABASE_URL is expected to point at
    Supabase's own pooler (§4: "pooled connection string"), so adding
    app-level pooling (a new dependency) on top of that would be
    redundant, not just simpler to skip.

    The `SELECT 1` ping on every call is a real extra round-trip, but it's
    what makes a silently-dropped connection self-heal transparently
    instead of hanging the caller — safe to do unconditionally now that
    _KEEPALIVE_KWARGS bounds how long a truly-dead socket can take to fail.
    """
    global _connection
    if _connection is None or _connection.closed:
        _connection = _connect()
        return _connection

    try:
        with _connection.cursor() as cur:
            cur.execute("SELECT 1")
    except psycopg.Error:
        logger.warning("db_connection_stale_reconnecting")
        _connection = _connect()

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
