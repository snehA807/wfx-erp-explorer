from __future__ import annotations

from pydantic import ConfigDict

from app.models.responses.products import ProductSummary


class SearchHit(ProductSummary):
    """ProductSummary plus a similarity score (M10 plan §6): score is
    1 - cosine_distance, both encoders verified L2-normalized (M9), so no
    renormalization is needed. Cards render identically to Products/
    Similar — zero new frontend shape beyond this one extra field."""

    model_config = ConfigDict(extra="forbid")

    score: float
