from __future__ import annotations

import time

import openai
import structlog
from openai import OpenAI

from app.core.config import get_settings
from app.core.errors import LLMError

logger = structlog.get_logger()

# backend-spec.md §4: the only module that touches OPENROUTER_API_KEY.
# Nothing else in the codebase should import the openai SDK or read the key.
_REQUEST_TIMEOUT_SECONDS = 30
_RETRY_BACKOFF_SECONDS = 2

_client: OpenAI | None = None


def get_openrouter_client() -> OpenAI:
    """Lazy singleton (coding-standards.md), consistent with db/session.py's
    precedent. Vanna receives this client via injection — it never builds
    its own (services/nl2sql.py)."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
    return _client


def create_chat_completion(
    messages: list[dict], *, max_tokens: int
) -> tuple[str, dict]:
    """One OpenRouter chat completion at temperature 0, with a single retry
    on transient failure. Logs a `token_cost` event (backend-spec.md §10)
    on every completed attempt — OpenRouter returns exact per-request cost
    in `usage.cost`, so no per-model pricing table is needed here.

    Returns (content, usage_meta). Raises LLMError (502, LLM_UNAVAILABLE)
    if both attempts fail.
    """
    settings = get_settings()
    client = get_openrouter_client()

    response = None
    last_error: openai.OpenAIError | None = None
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model=settings.openrouter_model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0,
            )
            last_error = None
            break
        except openai.OpenAIError as exc:
            last_error = exc
            logger.warning(
                "openrouter_request_failed", attempt=attempt, error=str(exc)
            )
            if attempt == 0:
                time.sleep(_RETRY_BACKOFF_SECONDS)

    if last_error is not None or response is None:
        raise LLMError(
            "OpenRouter request failed after retry", code="LLM_UNAVAILABLE"
        ) from last_error

    usage = response.usage
    prompt_tokens = usage.prompt_tokens if usage else None
    completion_tokens = usage.completion_tokens if usage else None
    cost_usd = getattr(usage, "cost", None) if usage else None

    logger.info(
        "token_cost",
        model=settings.openrouter_model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        cost_usd=cost_usd,
    )

    content = response.choices[0].message.content or ""
    return content, {
        "model": settings.openrouter_model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "cost_usd": cost_usd,
    }
