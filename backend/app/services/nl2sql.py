from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import structlog
import yaml
from vanna.legacy.chromadb import ChromaDB_VectorStore
from vanna.legacy.openai import OpenAI_Chat

from app.core.config import get_settings
from app.core.errors import LLMError, ServiceUnavailableError
from app.core.guardrails import enforce_guardrails
from app.services.llm import create_chat_completion, get_openrouter_client

logger = structlog.get_logger()

_TRAINING_DIR = Path(__file__).resolve().parent.parent / "vanna_training"

# Order matches backend-spec.md §6's prompt strategy: statement shape and
# guardrail-fatal formatting first (comments/markdown are the most common
# self-inflicted SQL_BLOCKED), then read-only framing, then dialect style.
_INITIAL_PROMPT = (
    "You are a PostgreSQL expert generating read-only analytical queries "
    "for an apparel ERP database.\n"
    "Rules, in order of importance:\n"
    "1. Output exactly one SQL statement, starting with SELECT or WITH. "
    "No other text, no markdown code fences, no SQL comments (-- or /* */) "
    "of any kind.\n"
    "2. You can only read data — never write, modify, or delete anything.\n"
    "3. Use ILIKE with '%term%' for case-insensitive text matching.\n"
    "4. Always alias aggregate expressions with AS.\n"
    "5. Use an explicit small LIMIT for ranking/top-N questions.\n"
    "6. Never reference a column or table not present in the provided schema.\n"
)

_SQL_KEYWORD_RE = re.compile(r"\b(SELECT|WITH)\b", re.IGNORECASE)
_CODE_FENCE_RE = re.compile(r"```(?:sql)?\s*\n?(.*?)```", re.DOTALL | re.IGNORECASE)


def extract_sql(llm_response: str) -> str:
    """Strips markdown fences/prose to isolate the SQL statement. Raises
    LLMError if the response has nothing SQL-shaped in it at all — a
    distinct failure mode from a guardrail block (core/guardrails.py
    handles text that IS SQL-shaped but disallowed)."""
    text = llm_response.strip()

    fence_match = _CODE_FENCE_RE.search(text)
    if fence_match:
        text = fence_match.group(1).strip()

    if not _SQL_KEYWORD_RE.search(text):
        raise LLMError("The model did not return a SQL query")

    return text


class _TrainedVanna(ChromaDB_VectorStore, OpenAI_Chat):
    """Vanna composed the standard way: in-memory vector store (no
    persistence — determinism from the training files, not disk) + an
    injected OpenRouter-backed chat client (services/llm.py owns the key).
    submit_prompt/extract_sql are overridden so every completion flows
    through llm.py's token accounting and this module's own extraction."""

    def __init__(self, client, config: dict) -> None:
        ChromaDB_VectorStore.__init__(self, config=config)
        OpenAI_Chat.__init__(self, client=client, config=config)
        self.last_usage: dict | None = None

    def submit_prompt(self, prompt, **kwargs) -> str:
        settings = get_settings()
        content, usage = create_chat_completion(
            prompt, max_tokens=settings.llm_max_tokens_sql
        )
        self.last_usage = usage
        return content

    def extract_sql(self, llm_response: str) -> str:
        return extract_sql(llm_response)

    def log(self, message: str, title: str = "Info") -> None:
        # VannaBase.log() does a raw print() of the full prompt/response on
        # every call — not in backend-spec.md §10's required log list (that
        # list is question/sql/guardrail-verdict/tokens/cost, all already
        # covered by nl2sql_generated/guardrail_*/token_cost below), and
        # printing it would fight structlog's structured-JSON-stdout
        # requirement on every single request. No-op by design.
        pass


@dataclass
class GeneratedSql:
    sql: str
    model: str | None
    prompt_tokens: int | None
    completion_tokens: int | None
    cost_usd: float | None


def _split_ddl_statements(path: Path) -> list[str]:
    text = path.read_text()
    statements = re.split(r"(?=CREATE TABLE)", text)
    return [s.strip() for s in statements if s.strip().startswith("CREATE TABLE")]


def _split_doc_items(path: Path) -> list[str]:
    text = path.read_text()
    items = re.findall(
        r"^\d+\.\s+(.+?)(?=^\d+\.\s|\Z)", text, re.MULTILINE | re.DOTALL
    )
    return [" ".join(item.split()) for item in items if item.strip()]


def _load_golden_queries(path: Path) -> list[dict]:
    with path.open() as f:
        pairs = yaml.safe_load(f)
    return [{"question": p["question"], "sql": p["sql"].strip()} for p in pairs]


class Nl2SqlService:
    """The abstraction boundary the escape hatch swaps behind
    (docs/implementationM7.md §12) — nothing outside this module knows
    Vanna exists. Public surface: train(), generate_sql()."""

    def __init__(self) -> None:
        self._vn: _TrainedVanna | None = None
        self.ready = False

    def train(self) -> None:
        settings = get_settings()
        client = get_openrouter_client()
        config = {
            "client": "in-memory",
            "model": settings.openrouter_model,
            "temperature": 0,
            "initial_prompt": _INITIAL_PROMPT,
            # Plan §6: all 6 DDLs (tiny — reliability over token savings),
            # top ~4 docs, top 3 golden examples.
            "n_results_ddl": 6,
            "n_results_documentation": 4,
            "n_results_sql": 3,
        }
        vn = _TrainedVanna(client=client, config=config)

        for ddl_statement in _split_ddl_statements(_TRAINING_DIR / "ddl.sql"):
            vn.train(ddl=ddl_statement)

        for doc in _split_doc_items(_TRAINING_DIR / "docs.md"):
            vn.train(documentation=doc)

        for pair in _load_golden_queries(_TRAINING_DIR / "golden_queries.yaml"):
            vn.train(question=pair["question"], sql=pair["sql"])

        self._vn = vn
        self.ready = True
        logger.info("nl2sql_trained")

    def generate_sql(self, question: str) -> GeneratedSql:
        if not self.ready or self._vn is None:
            raise ServiceUnavailableError("NL2SQL service is not ready")

        vn = self._vn
        vn.last_usage = None
        raw_sql = vn.generate_sql(question, allow_llm_to_see_data=False)

        try:
            safe_sql = enforce_guardrails(raw_sql)
        except Exception:
            logger.warning("guardrail_blocked", question=question, sql=raw_sql)
            raise
        else:
            logger.info("guardrail_passed", question=question)

        usage = vn.last_usage or {}
        logger.info("nl2sql_generated", question=question, sql=safe_sql)

        return GeneratedSql(
            sql=safe_sql,
            model=usage.get("model"),
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            cost_usd=usage.get("cost_usd"),
        )


_service = Nl2SqlService()


def get_nl2sql_service() -> Nl2SqlService:
    return _service
