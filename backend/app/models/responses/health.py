from pydantic import BaseModel, ConfigDict


class HealthData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    database: str
