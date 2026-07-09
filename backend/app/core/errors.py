from __future__ import annotations

from app.models.responses.envelope import ErrorDetail, ErrorEnvelope


class AppError(Exception):
    """Base of backend-spec.md §8's error hierarchy. Subclasses fix
    status_code/code; the message is supplied at raise time."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(
        self, message: str, *, details: dict | None = None, code: str | None = None
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details
        # Per-instance override, e.g. LLMError needs distinct codes for
        # "unreachable/exhausted" (LLM_UNAVAILABLE) vs. other failures
        # (the class default LLM_ERROR) without a new subclass per code.
        if code is not None:
            self.code = code

    def to_envelope(self) -> ErrorEnvelope:
        return ErrorEnvelope(
            error=ErrorDetail(
                code=self.code, message=self.message, details=self.details
            )
        )


class ValidationError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class SQLGuardrailError(AppError):
    status_code = 400
    code = "SQL_BLOCKED"


class SQLExecutionError(AppError):
    status_code = 400
    code = "SQL_EXECUTION_ERROR"


class LLMError(AppError):
    status_code = 502
    code = "LLM_ERROR"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class RateLimitedError(AppError):
    status_code = 429
    code = "RATE_LIMITED"


class ServiceUnavailableError(AppError):
    """Not in backend-spec.md §8's named list — added for /health (M3), the
    one endpoint that must honestly report a dependency outage instead of
    being forced into one of the six listed error types."""

    status_code = 503
    code = "SERVICE_UNAVAILABLE"
