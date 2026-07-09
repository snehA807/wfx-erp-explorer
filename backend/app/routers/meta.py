from fastapi import APIRouter

from app.core.errors import ServiceUnavailableError
from app.models.responses.envelope import SuccessEnvelope
from app.models.responses.filters import FilterOptionsData
from app.models.responses.health import HealthData
from app.services import filters as filters_service
from app.services.health import get_health_status

router = APIRouter(tags=["meta"])


@router.get("/health", response_model=SuccessEnvelope[HealthData])
async def health() -> SuccessEnvelope[HealthData]:
    status = get_health_status()
    if status.status != "ok":
        raise ServiceUnavailableError("database unreachable")
    return SuccessEnvelope(data=status)


@router.get("/filters/options", response_model=SuccessEnvelope[FilterOptionsData])
async def filter_options() -> SuccessEnvelope[FilterOptionsData]:
    options = filters_service.get_filter_options()
    return SuccessEnvelope(data=options)
