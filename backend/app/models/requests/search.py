from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SearchProductsRequest(BaseModel):
    """POST /search/products body (M10 plan §6): hybrid vector + structured
    filters, same filter semantics as ProductListParams (backend-spec.md
    §9 tier 2 categorical validation happens in the service layer)."""

    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=24, ge=1, le=48)

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
    def _check_ranges(self) -> SearchProductsRequest:
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


class SearchVisualRequest(BaseModel):
    """POST /search/visual body: appearance-only query, no structured
    filters (design-spec.md §4 — visual search matches appearance, not
    metadata)."""

    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=24, ge=1, le=48)
