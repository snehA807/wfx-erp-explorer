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


class StreamedCompletion:
    """Streaming counterpart to create_chat_completion, used only by M8's
    /query answer-generation call (design-spec.md: the prose answer streams
    token-by-token). Retries once, but only before the first chunk has been
    read — once iteration has yielded content to the caller (which by then
    may already be on the wire to a client), a dropped connection surfaces
    as LLMError instead of silently retrying and duplicating output.

    Usage: `for delta in StreamedCompletion(messages, max_tokens=N): ...`,
    then read `.usage` once iteration completes (mirrors the (content,
    usage) tuple create_chat_completion returns, just split across the
    iteration boundary since a generator can't return a value through
    a plain `for` loop).
    """

    def __init__(self, messages: list[dict], *, max_tokens: int) -> None:
        self._messages = messages
        self._max_tokens = max_tokens
        settings = get_settings()
        self.usage: dict = {
            "model": settings.openrouter_model,
            "prompt_tokens": None,
            "completion_tokens": None,
            "cost_usd": None,
        }

    def _open_stream(self):
        settings = get_settings()
        client = get_openrouter_client()
        return client.chat.completions.create(
            model=settings.openrouter_model,
            messages=self._messages,
            max_tokens=self._max_tokens,
            temperature=0,
            stream=True,
            stream_options={"include_usage": True},
        )

    def __iter__(self):
        try:
            stream = self._open_stream()
        except openai.OpenAIError as exc:
            logger.warning("openrouter_stream_request_failed", attempt=0, error=str(exc))
            time.sleep(_RETRY_BACKOFF_SECONDS)
            try:
                stream = self._open_stream()
            except openai.OpenAIError as exc2:
                raise LLMError(
                    "OpenRouter request failed after retry", code="LLM_UNAVAILABLE"
                ) from exc2

        try:
            for chunk in stream:
                if chunk.usage is not None:
                    self.usage["prompt_tokens"] = chunk.usage.prompt_tokens
                    self.usage["completion_tokens"] = chunk.usage.completion_tokens
                    self.usage["cost_usd"] = getattr(chunk.usage, "cost", None)
                if chunk.choices:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        yield delta
        except openai.OpenAIError as exc:
            raise LLMError(
                "OpenRouter stream interrupted", code="LLM_UNAVAILABLE"
            ) from exc
        finally:
            logger.info("token_cost", **self.usage)
