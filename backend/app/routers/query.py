from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.models.requests.query import QuestionRequest
from app.models.responses.envelope import SuccessEnvelope
from app.models.responses.query import GeneratedSqlResponse
from app.services.nl2sql import get_nl2sql_service
from app.services.query_pipeline import stream_query

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/sql", response_model=SuccessEnvelope[GeneratedSqlResponse])
@limiter.limit(get_settings().rate_limit_query)
async def generate_sql(
    request: Request, body: QuestionRequest
) -> SuccessEnvelope[GeneratedSqlResponse]:
    service = get_nl2sql_service()
    result = service.generate_sql(body.question)
    return SuccessEnvelope(
        data=GeneratedSqlResponse(sql=result.sql),
        meta={
            "model": result.model,
            "prompt_tokens": result.prompt_tokens,
            "completion_tokens": result.completion_tokens,
            "cost_usd": result.cost_usd,
        },
    )


# backend-spec.md §3: POST /query — NL2SQL, SSE: status -> sql -> rows ->
# answer(tokens) -> done/error. Rate-limited the same way as /query/sql
# above (slowapi scopes @limiter.limit() per-route by default, so this is
# its own independent 10/min/IP counter, not a bucket shared with
# /query/sql — see docs/decisions.md). No response_model since the body is
# a raw SSE byte stream, not a single validated payload.
@router.post("")
@limiter.limit(get_settings().rate_limit_query)
async def query(request: Request, body: QuestionRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_query(body.question),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
