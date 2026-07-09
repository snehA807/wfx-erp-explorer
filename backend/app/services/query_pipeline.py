from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Iterator

import structlog

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.guardrails import enforce_guardrails
from app.db.session import get_connection
from app.models.responses.envelope import ErrorDetail
from app.models.responses.query import (
    QueryAnswerEvent,
    QueryDoneEvent,
    QueryDoneMeta,
    QueryRowsEvent,
    QuerySqlEvent,
    QueryStatusEvent,
)
from app.services.llm import StreamedCompletion
from app.services.nl2sql import get_nl2sql_service

logger = structlog.get_logger()

# Bounds the answer-generation prompt independent of guardrails.MAX_ROWS
# (100) — a 100-row/many-column result set would blow the ~700-1000 token
# prompt budget docs/implementationM7.md established for SQL generation;
# the `rows` SSE event still carries the full result set to the client,
# only the LLM's context is capped.
_MAX_ANSWER_SAMPLE_ROWS = 20

# Training deliberately hides these from the LLM (docs/implementationM7.md
# §4: "the LLM must never see or select them" — ddl.sql strips them from
# the trained schema), but that intent doesn't survive a bare `SELECT *`,
# which still returns them at execution time. Stripped here rather than in
# guardrails.py: this is a data-hygiene/cost concern (huge vectors bloating
# the SSE payload and the answer prompt, and — once M9 backfills real
# embeddings — a non-JSON-serializable pgvector value that would crash
# QueryRowsEvent's serialization), not a security one, so it doesn't need
# guardrails' denylist-and-block treatment.
_HIDDEN_COLUMNS = frozenset({"text_embedding", "image_embedding"})

# design-spec.md: "Zero-row SQL result: the AI answer states this in prose,
# never a bare empty table." Answered deterministically, no second LLM call
# — there is nothing for a model to summarize, and a fixed honest message
# can't hallucinate over empty data (docs/decisions.md).
_ZERO_ROW_ANSWER = "No matching records were found for this query."

_ANSWER_SYSTEM_PROMPT = (
    "You are an analyst summarizing SQL query results for an apparel ERP "
    "dashboard. Answer the user's question in 2-4 concise sentences, using "
    "only the data provided below - never invent figures not present in "
    "it. Do not mention SQL, tables, columns, or databases; state the "
    "answer directly in plain business language. Format monetary values "
    "as INR with a ₹ symbol."
)


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _sse(event: str, payload: Any) -> bytes:
    return f"event: {event}\ndata: {payload.model_dump_json()}\n\n".encode("utf-8")


def _strip_hidden_columns(
    columns: list[str], raw_rows: list[tuple]
) -> tuple[list[str], list[dict[str, Any]]]:
    visible_columns = [col for col in columns if col not in _HIDDEN_COLUMNS]
    rows = [
        {
            col: _serialize_value(val)
            for col, val in zip(columns, row)
            if col not in _HIDDEN_COLUMNS
        }
        for row in raw_rows
    ]
    return visible_columns, rows


def _format_rows_for_prompt(columns: list[str], rows: list[dict[str, Any]]) -> str:
    sample = rows[:_MAX_ANSWER_SAMPLE_ROWS]
    lines = [", ".join(f"{col}={row[col]}" for col in columns) for row in sample]
    if len(rows) > _MAX_ANSWER_SAMPLE_ROWS:
        lines.append(f"...({len(rows) - _MAX_ANSWER_SAMPLE_ROWS} more row(s) not shown)")
    return "\n".join(lines)


def stream_query(question: str) -> Iterator[bytes]:
    """Full POST /query pipeline (backend-spec.md §3): generate -> guard ->
    execute -> answer, emitted as SSE events: status -> sql -> rows ->
    answer(tokens) -> done/error.

    Every failure path is caught here and turned into a single `error`
    event rather than raised — once StreamingResponse has sent the first
    byte, response headers are locked at 200 and main.py's global
    AppError/Exception handlers can no longer intervene to produce a normal
    JSON error response (backend-spec.md §8: "SSE failures emit a
    structured error event and close cleanly").
    """
    sql_meta: dict = {}
    answer_meta: dict = {}
    try:
        yield _sse(
            "status",
            QueryStatusEvent(stage="generating_sql", message="Generating SQL..."),
        )

        service = get_nl2sql_service()
        generated = service.generate_sql(question)
        sql_meta = {
            "model": generated.model,
            "prompt_tokens": generated.prompt_tokens,
            "completion_tokens": generated.completion_tokens,
            "cost_usd": generated.cost_usd,
        }
        yield _sse("sql", QuerySqlEvent(sql=generated.sql))

        yield _sse(
            "status",
            QueryStatusEvent(stage="running_query", message="Running query..."),
        )

        # generate_sql() already ran guardrails once; a fresh check
        # immediately before execution is cheap insurance against ever
        # executing SQL that travelled across a function boundary
        # unchecked (train_check.py applies the same belt-and-suspenders
        # pattern) — the DB role is still the superuser today (open issue
        # #2, gated to M11), so guardrails are the only enforcement layer
        # actually in effect for this execution path right now.
        safe_sql = enforce_guardrails(generated.sql)
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(safe_sql)
            fetched_columns = (
                [desc[0] for desc in cur.description] if cur.description else []
            )
            raw_rows = cur.fetchall()
        columns, rows = _strip_hidden_columns(fetched_columns, raw_rows)
        yield _sse(
            "rows", QueryRowsEvent(columns=columns, rows=rows, row_count=len(rows))
        )

        yield _sse(
            "status",
            QueryStatusEvent(stage="writing_answer", message="Writing answer..."),
        )

        if not rows:
            yield _sse("answer", QueryAnswerEvent(delta=_ZERO_ROW_ANSWER))
        else:
            messages = [
                {"role": "system", "content": _ANSWER_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Question: {question}\n\n"
                        f"Results ({len(rows)} row(s)):\n"
                        f"{_format_rows_for_prompt(columns, rows)}"
                    ),
                },
            ]
            completion = StreamedCompletion(
                messages, max_tokens=get_settings().llm_max_tokens_answer
            )
            for delta_text in completion:
                yield _sse("answer", QueryAnswerEvent(delta=delta_text))
            answer_meta = completion.usage

        sql_cost = sql_meta.get("cost_usd") or 0.0
        answer_cost = answer_meta.get("cost_usd") or 0.0
        yield _sse(
            "done",
            QueryDoneEvent(
                meta=QueryDoneMeta(
                    sql_model=sql_meta.get("model"),
                    sql_prompt_tokens=sql_meta.get("prompt_tokens"),
                    sql_completion_tokens=sql_meta.get("completion_tokens"),
                    sql_cost_usd=sql_meta.get("cost_usd"),
                    answer_model=answer_meta.get("model"),
                    answer_prompt_tokens=answer_meta.get("prompt_tokens"),
                    answer_completion_tokens=answer_meta.get("completion_tokens"),
                    answer_cost_usd=answer_meta.get("cost_usd"),
                    total_cost_usd=round(sql_cost + answer_cost, 6),
                )
            ),
        )
    except AppError as exc:
        logger.warning("query_stream_error", code=exc.code, message=exc.message)
        yield _sse(
            "error", ErrorDetail(code=exc.code, message=exc.message, details=exc.details)
        )
    except Exception as exc:
        logger.error("query_stream_unhandled_exception", error=str(exc))
        yield _sse(
            "error",
            ErrorDetail(
                code="INTERNAL_ERROR",
                message="An unexpected error occurred",
                details=None,
            ),
        )
