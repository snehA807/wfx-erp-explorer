from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class SuccessEnvelope(BaseModel, Generic[T]):
    """CLAUDE.md invariant 1: every successful response is {"data":..., "meta":{...}}."""

    model_config = ConfigDict(extra="forbid")

    data: T
    meta: dict = {}


class ErrorDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: dict | None = None


class ErrorEnvelope(BaseModel):
    """CLAUDE.md invariant 1: every error response is {"error": {...}}."""

    model_config = ConfigDict(extra="forbid")

    error: ErrorDetail
