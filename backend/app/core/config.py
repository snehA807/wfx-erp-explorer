from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """backend-spec.md §6, backend-only subset: DATABASE_URL_OWNER and
    VITE_API_BASE_URL are read by scripts/ and the frontend respectively,
    never by this process, so they are deliberately absent here."""

    # extra="ignore": pydantic-settings defaults to extra="forbid", which
    # broke app boot once backend/.env gained DATABASE_URL_OWNER (M9, read
    # directly by scripts/ via os.environ, never through this class) — found
    # as a blocker during M10 live-verification prep (docs/decisions.md).
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    openrouter_api_key: str
    openrouter_model: str
    llm_max_tokens_sql: int = 600
    llm_max_tokens_answer: int = 400
    # Kept as str, not list[str]: pydantic-settings tries to JSON-decode any
    # list-typed field straight from the raw env string before any
    # field_validator runs, which breaks on a plain comma-separated value.
    # Parsing it ourselves in cors_origin_list sidesteps that entirely.
    cors_origins: str
    rate_limit_query: str = "10/minute"
    rate_limit_search: str = "30/minute"
    env: str = "development"

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """Lazy singleton (coding-standards.md) — constructed on first use, not
    at import time, so importing this module never fails on missing env."""
    return Settings()
