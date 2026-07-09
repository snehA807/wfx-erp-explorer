from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

SortBy = Literal["style_number", "style_name", "selling_price", "gsm", "category"]
Order = Literal["asc", "desc"]


class ProductListParams(BaseModel):
    """Query params for GET /products (backend-spec.md §3): pagination,
    sort, and structured filters. Categorical values are checked against
    cached facet sets in the service layer, not here (tier 2, §9) — this
    model only enforces shape/range (tier 1)."""

    model_config = ConfigDict(extra="forbid")

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=24, ge=1, le=48)
    sort_by: SortBy = "style_number"
    order: Order = "asc"

    category: str | None = None
    fabric: str | None = None
    color: str | None = None
    print: str | None = None
    season: str | None = None
    brand: str | None = None
    supplier_id: str | None = None

    min_price: float | None = Field(default=None, ge=0)
    max_price: float | None = Field(default=None, ge=0)
    min_gsm: int | None = Field(default=None, ge=0)
    max_gsm: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _check_ranges(self) -> ProductListParams:
        if (
            self.min_price is not None
            and self.max_price is not None
            and self.min_price > self.max_price
        ):
            raise ValueError("min_price must be <= max_price")
        if (
            self.min_gsm is not None
            and self.max_gsm is not None
            and self.min_gsm > self.max_gsm
        ):
            raise ValueError("min_gsm must be <= max_gsm")
        return self
