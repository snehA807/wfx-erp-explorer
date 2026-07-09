from __future__ import annotations

from fastapi import APIRouter

from app.models.responses.dashboard import DashboardStatsData
from app.models.responses.envelope import SuccessEnvelope
from app.services import dashboard as dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=SuccessEnvelope[DashboardStatsData])
async def get_dashboard_stats() -> SuccessEnvelope[DashboardStatsData]:
    stats = dashboard_service.get_dashboard_stats()
    return SuccessEnvelope(data=stats)
