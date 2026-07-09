from fastapi import APIRouter

from app.core.errors import ServiceUnavailableError
from app.models.responses.envelope import SuccessEnvelope
from app.models.responses.health import HealthData
from app.services.health import get_health_status

router = APIRouter(tags=["meta"])


@router.get("/health", response_model=SuccessEnvelope[HealthData])
async def health() -> SuccessEnvelope[HealthData]:
    status = get_health_status()
    if status.status != "ok":
        raise ServiceUnavailableError("database unreachable")
    return SuccessEnvelope(data=status)
