from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class GeneratedSqlResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sql: str
