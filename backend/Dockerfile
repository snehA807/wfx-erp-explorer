# M11 (docs/decisions.md, backend-spec.md §11): single-service Docker deploy
# to Render. python:3.11-slim is the real deploy target — local dev has been
# on 3.9 (CLAUDE.md pins 3.11 for deploy only).
FROM python:3.11-slim

# onnxruntime (pulled in by chromadb + fastembed) needs libgomp1 on slim
# base images — not always present by default.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

USER appuser

# Pin both model caches under the non-root user's home rather than relying
# on fastembed's /tmp default — makes the build-time bake location and the
# runtime read location unambiguously the same path.
ENV HOME=/home/appuser \
    FASTEMBED_CACHE_PATH=/home/appuser/.cache/fastembed

# Pre-bake model caches at build time (M11 plan): Chroma's ONNX MiniLM
# (boot-critical — train() runs in main.py's lifespan before the port
# opens) and fastembed's BGE-small (lazy at runtime, but Render's disk is
# ephemeral, so an unbaked image re-downloads on every cold start's first
# search request). Converts a runtime network risk into a build-time one,
# where there's memory, logs, and retries.
#
# CLIP (Qdrant/clip-ViT-B-32-text) deliberately NOT pre-baked: the M11
# escape hatch (architecture.md §5) moved /search/visual off CLIP after it
# OOM'd Render's 512MB free tier in the local Docker memory gate —
# services/search.py never calls embed_query_visual anymore, so baking its
# model would only cost build time/image size for a path that's never hit.
RUN python -c "\
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction; \
DefaultEmbeddingFunction()(['warm']); \
from fastembed import TextEmbedding; \
TextEmbedding(model_name='BAAI/bge-small-en-v1.5'); \
print('model caches baked')"

EXPOSE 8000

# Shell form so $PORT expands (Render injects it at runtime).
# --workers 1: the in-process TTL caches, slowapi's in-memory rate-limit
# state, the DB connection singleton, and the trained Vanna instance all
# assume one process (backend-spec.md §7/§11).
# --proxy-headers --forwarded-allow-ips='*': behind Render's proxy,
# request.client.host is the proxy, not the caller — without these,
# slowapi's per-IP rate limiting would bucket every visitor together.
# Safe here because only Render's proxy can reach the container.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers --forwarded-allow-ips='*'
