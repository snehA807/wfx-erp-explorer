from app.db.session import check_connectivity
from app.models.responses.health import HealthData
from app.services.nl2sql import get_nl2sql_service


def get_health_status() -> HealthData:
    nl2sql_ready = get_nl2sql_service().ready
    if check_connectivity():
        return HealthData(status="ok", database="connected", nl2sql_ready=nl2sql_ready)
    return HealthData(
        status="error", database="unreachable", nl2sql_ready=nl2sql_ready
    )
