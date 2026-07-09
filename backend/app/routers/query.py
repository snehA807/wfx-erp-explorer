from __future__ import annotations

from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.models.requests.query import QuestionRequest
from app.models.responses.envelope import SuccessEnvelope
from app.models.responses.query import GeneratedSqlResponse
from app.services.nl2sql import get_nl2sql_service

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
