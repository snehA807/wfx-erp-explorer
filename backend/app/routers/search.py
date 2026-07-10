from __future__ import annotations

from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.models.requests.search import SearchProductsRequest, SearchVisualRequest
from app.models.responses.envelope import SuccessEnvelope
from app.models.responses.search import SearchHit
from app.services import search as search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/products", response_model=SuccessEnvelope[list[SearchHit]])
@limiter.limit(get_settings().rate_limit_search)
async def search_products(
    request: Request, body: SearchProductsRequest
) -> SuccessEnvelope[list[SearchHit]]:
    items = search_service.search_products(body)
    return SuccessEnvelope(data=items, meta={"count": len(items)})


@router.post("/visual", response_model=SuccessEnvelope[list[SearchHit]])
@limiter.limit(get_settings().rate_limit_search)
async def search_visual(
    request: Request, body: SearchVisualRequest
) -> SuccessEnvelope[list[SearchHit]]:
    items = search_service.search_visual(body)
    return SuccessEnvelope(data=items, meta={"count": len(items)})
