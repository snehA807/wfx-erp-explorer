from __future__ import annotations

from functools import lru_cache

import structlog

from app.core.errors import ServiceUnavailableError

logger = structlog.get_logger()

# Same model IDs as scripts/generate_embeddings.py, verified live against
# fastembed 0.7.4's list_supported_models() before this file was written
# (M10 implementation plan §1) — the query-side encoder for each column
# must come from the exact same checkpoint pairing as the offline job.
TEXT_MODEL = "BAAI/bge-small-en-v1.5"
VISUAL_MODEL = "Qdrant/clip-ViT-B-32-text"  # paired with Qdrant/clip-ViT-B-32-vision (M9)

_QUERY_EMBEDDING_LRU_SIZE = 256

_text_model = None
_visual_model = None


def to_vector_literal(vec) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"


def _get_text_model():
    global _text_model
    if _text_model is None:
        from fastembed import TextEmbedding

        _text_model = TextEmbedding(model_name=TEXT_MODEL)
    return _text_model


def _get_visual_model():
    global _visual_model
    if _visual_model is None:
        from fastembed import TextEmbedding

        _visual_model = TextEmbedding(model_name=VISUAL_MODEL)
    return _visual_model


@lru_cache(maxsize=_QUERY_EMBEDDING_LRU_SIZE)
def embed_query_text(query: str) -> str:
    """BGE-small query-side embedding for hybrid product search, returned as
    a pgvector literal string ready for the %(qvec)s::vector param."""
    try:
        model = _get_text_model()
        vector = next(iter(model.embed([query])))
    except Exception as exc:  # model download/init failure (network, disk)
        logger.error("embedding_model_unavailable", model=TEXT_MODEL, error=str(exc))
        raise ServiceUnavailableError(
            "Search is warming up or unavailable, please try again shortly"
        ) from exc
    return to_vector_literal(vector)


@lru_cache(maxsize=_QUERY_EMBEDDING_LRU_SIZE)
def embed_query_visual(query: str) -> str:
    """CLIP-text query-side embedding for visual search, paired with the
    CLIP-vision image_embedding column populated in M9."""
    try:
        model = _get_visual_model()
        vector = next(iter(model.embed([query])))
    except Exception as exc:
        logger.error("embedding_model_unavailable", model=VISUAL_MODEL, error=str(exc))
        raise ServiceUnavailableError(
            "Search is warming up or unavailable, please try again shortly"
        ) from exc
    return to_vector_literal(vector)
