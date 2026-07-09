from app.db.session import check_connectivity
from app.models.responses.health import HealthData


def get_health_status() -> HealthData:
    if check_connectivity():
        return HealthData(status="ok", database="connected")
    return HealthData(status="error", database="unreachable")
