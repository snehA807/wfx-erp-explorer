from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.db.session import close_connection
from app.models.responses.envelope import ErrorDetail, ErrorEnvelope
from app.routers import dashboard, meta, products, query, search
from app.services.nl2sql import get_nl2sql_service

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Synchronous, on purpose (docs/implementationM7.md §5): the training
    # corpus is tiny (~seconds once Chroma's embedding model is cached), and
    # a training failure should fail the boot loudly rather than leave the
    # app half-alive — either /query/sql works or /health says why.
    get_nl2sql_service().train()
    yield
    close_connection()


app = FastAPI(title="WFX ERP Explorer API", lifespan=lifespan)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def bind_request_context(request: Request, call_next):
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=str(uuid.uuid4()))
    start = time.monotonic()
    response = await call_next(request)
    logger.info(
        "request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round((time.monotonic() - start) * 1000, 1),
    )
    return response


def _error_response(
    status_code: int, code: str, message: str, details: dict | None = None
) -> JSONResponse:
    envelope = ErrorEnvelope(
        error=ErrorDetail(code=code, message=message, details=details)
    )
    return JSONResponse(status_code=status_code, content=envelope.model_dump())


# backend-spec.md §8: "one global handler serializes any AppError into the
# envelope; unexpected exceptions -> generic 500... never returned." Four
# handlers below cover every path an unhandled-exception could otherwise
# take: our own errors, FastAPI's request-validation errors, any raised
# HTTPException (including Starlette's own 404/405 for unmatched
# routes/methods — without this one, those would bypass the envelope
# entirely), slowapi's rate-limit signal, and truly unexpected exceptions.


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    logger.warning("app_error", code=exc.code, message=exc.message)
    return _error_response(exc.status_code, exc.code, exc.message, exc.details)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return _error_response(
        422,
        "VALIDATION_ERROR",
        "Invalid request",
        {"errors": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    return _error_response(exc.status_code, "HTTP_ERROR", str(exc.detail))


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return _error_response(429, "RATE_LIMITED", "Too many requests")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("unhandled_exception", error=str(exc))
    return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred")


app.include_router(meta.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
