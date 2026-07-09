from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class GeneratedSqlResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sql: str


# --- POST /query SSE event payloads (backend-spec.md §3: status -> sql ->
# rows -> answer(tokens) -> done/error). One Pydantic model per event `data`
# line, per CLAUDE.md invariant 5 — SSE framing (`event: <name>\ndata:
# <json>\n\n`) is applied by services/query_pipeline.py, not here.


class QueryStatusEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stage: str
    message: str


class QuerySqlEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sql: str


class QueryRowsEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int


class QueryAnswerEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    delta: str


class QueryDoneMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sql_model: str | None = None
    sql_prompt_tokens: int | None = None
    sql_completion_tokens: int | None = None
    sql_cost_usd: float | None = None
    answer_model: str | None = None
    answer_prompt_tokens: int | None = None
    answer_completion_tokens: int | None = None
    answer_cost_usd: float | None = None
    total_cost_usd: float | None = None


class QueryDoneEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    meta: QueryDoneMeta
