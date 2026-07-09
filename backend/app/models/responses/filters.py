from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class FacetValue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str
    count: int


class RangeFacet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    min: float
    max: float


class FilterOptionsData(BaseModel):
    """backend-spec.md §3: cached facet values + counts."""

    model_config = ConfigDict(extra="forbid")

    category: list[FacetValue]
    fabric: list[FacetValue]
    color: list[FacetValue]
    print: list[FacetValue]
    season: list[FacetValue]
    brand: list[FacetValue]
    gsm: RangeFacet
    selling_price: RangeFacet
