from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ProductSummary(BaseModel):
    """List/card shape (design-spec.md §4 Products screen + §4 shared drawer
    trigger): image, identity, and the fields ProductCard shows directly."""

    model_config = ConfigDict(extra="forbid")

    style_number: str
    style_name: str
    category: str | None
    fabric: str
    gsm: int
    color: str | None
    print: str | None
    season: str | None
    brand: str | None
    cost: float | None
    selling_price: float
    image_url: str
    supplier_name: str


class SupplierDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    supplier_id: str
    company_name: str
    country: str | None
    contact: str | None
    lead_time_days: int
    rating: float


class TechPackDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tech_pack_id: str
    fabric_details: str | None
    construction: str | None
    wash_instructions: str | None


class ProductDetailData(BaseModel):
    """design-spec.md §4 Product Detail Drawer: spec rows + tech pack
    section + supplier section, one joined payload."""

    model_config = ConfigDict(extra="forbid")

    style_number: str
    style_name: str
    category: str | None
    fabric: str
    gsm: int
    color: str | None
    print: str | None
    season: str | None
    brand: str | None
    cost: float | None
    selling_price: float
    image_url: str
    supplier: SupplierDetail
    tech_pack: TechPackDetail | None
