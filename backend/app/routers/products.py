from __future__ import annotations

import math
from typing import Annotated

from fastapi import APIRouter, Query

from app.models.requests.products import ProductListParams
from app.models.responses.envelope import SuccessEnvelope
from app.models.responses.products import ProductDetailData, ProductSummary
from app.services import products as products_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=SuccessEnvelope[list[ProductSummary]])
async def list_products(
    # Annotated[Model, Query()], not bare Depends(): the latter extracts each
    # field as an independent Query param and never runs the model as a
    # whole, so model_validator errors escape as raw pydantic.ValidationError
    # (500) instead of a 422 envelope, and extra="forbid" is silently inert.
    params: Annotated[ProductListParams, Query()],
) -> SuccessEnvelope[list[ProductSummary]]:
    items, total = products_service.list_products(params)
    total_pages = math.ceil(total / params.page_size) if total else 0
    return SuccessEnvelope(
        data=items,
        meta={
            "page": params.page,
            "page_size": params.page_size,
            "total": total,
            "total_pages": total_pages,
        },
    )


@router.get("/{style_number}", response_model=SuccessEnvelope[ProductDetailData])
async def get_product(style_number: str) -> SuccessEnvelope[ProductDetailData]:
    detail = products_service.get_product_detail(style_number)
    return SuccessEnvelope(data=detail)


@router.get(
    "/{style_number}/similar", response_model=SuccessEnvelope[list[ProductSummary]]
)
async def get_similar_products(
    style_number: str,
    limit: int = Query(default=6, ge=1, le=24),
) -> SuccessEnvelope[list[ProductSummary]]:
    items = products_service.get_similar_products(style_number, limit)
    return SuccessEnvelope(data=items, meta={"count": len(items)})
