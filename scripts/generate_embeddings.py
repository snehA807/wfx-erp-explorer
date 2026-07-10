#!/usr/bin/env python3
"""Offline embeddings backfill (backend-spec.md §5, architecture.md §1/§4).

Usage:
    set -a && source .env && set +a && python scripts/generate_embeddings.py

Requires DATABASE_URL_OWNER (local/CI only — app_readonly can't UPDATE).
Standalone, symmetric with seed_db.py: no imports from backend/app.

Two independent stages, resumable via the embedding columns themselves
(WHERE <col> IS NULL) — no checkpoint file, no --force flag:
  1. text_embedding  <- BAAI/bge-small-en-v1.5 over search_text (384d)
  2. image_embedding <- Qdrant/clip-ViT-B-32-vision over image_url (512d)

The image model is paired with Qdrant/clip-ViT-B-32-text, which M10's
visual search uses to embed the query — both must come from the same CLIP
checkpoint or cosine similarity across the two encoders is meaningless.
Both fastembed models output L2-normalized vectors (confirmed live: norm
1.0 on a real sample of each), so `<=>` against the existing HNSW indexes
needs no extra normalization step.

A row whose image download fails after retries is logged and skipped; its
image_embedding stays NULL rather than being faked (same "loud, never
silent" partial-run policy as seed_db.py's integrity gates) — the
similar/search queries already filter IS NOT NULL on both sides, so a dead
URL degrades results, not correctness. Re-running only touches
WHERE <col> IS NULL rows and retries earlier failures for free; a crash
mid-run loses at most one chunk since each chunk commits independently.
"""

from __future__ import annotations

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import psycopg
import requests

ENV_VAR = "DATABASE_URL_OWNER"
IMAGE_CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "images"

# Verified live against fastembed 0.7.4's list_supported_models() before
# writing this script — not trusted from memory (model IDs drift between
# fastembed releases).
TEXT_MODEL = "BAAI/bge-small-en-v1.5"
IMAGE_MODEL = "Qdrant/clip-ViT-B-32-vision"  # paired query-side encoder for M10: Qdrant/clip-ViT-B-32-text

TEXT_CHUNK_SIZE = 100
IMAGE_CHUNK_SIZE = 32
IMAGE_DOWNLOAD_WORKERS = 8
DOWNLOAD_TIMEOUT = 10
DOWNLOAD_RETRIES = 3

# Same rationale as db/session.py: a connection idle for minutes between
# image chunks must not hang forever on a silently-dropped socket.
_KEEPALIVE_KWARGS = {
    "keepalives": 1,
    "keepalives_idle": 20,
    "keepalives_interval": 10,
    "keepalives_count": 3,
}


class DownloadError(Exception):
    """A single image failed after all retries; caller skips and logs it."""


def to_vector_literal(vec) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"


def chunked(seq: list, size: int):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


# ── Stage 1: text ────────────────────────────────────────────────────────


def embed_text_stage(conn: psycopg.Connection) -> None:
    from fastembed import TextEmbedding

    with conn.cursor() as cur:
        cur.execute(
            "SELECT style_number, search_text FROM finished_goods "
            "WHERE text_embedding IS NULL ORDER BY style_number"
        )
        rows = cur.fetchall()

    if not rows:
        print("text stage: 0 rows to process")
        return

    print(f"text stage: {len(rows)} rows to embed")
    model = TextEmbedding(model_name=TEXT_MODEL)

    done = 0
    for chunk in chunked(rows, TEXT_CHUNK_SIZE):
        style_numbers = [r[0] for r in chunk]
        texts = [r[1] or "" for r in chunk]
        vectors = list(model.embed(texts))
        with conn.cursor() as cur:
            cur.executemany(
                "UPDATE finished_goods SET text_embedding = %s::vector WHERE style_number = %s",
                [(to_vector_literal(v), sn) for v, sn in zip(vectors, style_numbers)],
            )
        conn.commit()
        done += len(chunk)
        print(f"  text: {done}/{len(rows)} committed")

    print(f"text stage complete: {done} embedded")


# ── Stage 2: images ──────────────────────────────────────────────────────


def download_image(style_number: str, url: str) -> Path:
    IMAGE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = IMAGE_CACHE_DIR / f"{style_number}.jpg"
    if path.exists() and path.stat().st_size > 0:
        return path

    last_exc: Exception | None = None
    for attempt in range(DOWNLOAD_RETRIES):
        try:
            resp = requests.get(url, timeout=DOWNLOAD_TIMEOUT)
            resp.raise_for_status()
            path.write_bytes(resp.content)
            return path
        except requests.RequestException as exc:
            last_exc = exc
            if attempt < DOWNLOAD_RETRIES - 1:
                time.sleep(2**attempt)
    raise DownloadError(
        f"{style_number}: {url} failed after {DOWNLOAD_RETRIES} attempts: {last_exc}"
    )


def embed_image_stage(conn: psycopg.Connection) -> list[str]:
    from fastembed import ImageEmbedding

    with conn.cursor() as cur:
        cur.execute(
            "SELECT style_number, image_url FROM finished_goods "
            "WHERE image_embedding IS NULL ORDER BY style_number"
        )
        rows = cur.fetchall()

    if not rows:
        print("image stage: 0 rows to process")
        return []

    print(f"image stage: {len(rows)} rows to embed")
    model = ImageEmbedding(model_name=IMAGE_MODEL)

    failed: list[str] = []
    done = 0
    for chunk in chunked(rows, IMAGE_CHUNK_SIZE):
        paths_by_style: dict[str, Path] = {}
        with ThreadPoolExecutor(max_workers=IMAGE_DOWNLOAD_WORKERS) as pool:
            futures = {
                pool.submit(download_image, style_number, url): style_number
                for style_number, url in chunk
            }
            for future in as_completed(futures):
                style_number = futures[future]
                try:
                    paths_by_style[style_number] = future.result()
                except DownloadError as exc:
                    print(f"  WARN: {exc}", file=sys.stderr)
                    failed.append(style_number)

        if not paths_by_style:
            continue

        ordered_styles = [sn for sn, _ in chunk if sn in paths_by_style]
        image_paths = [str(paths_by_style[sn]) for sn in ordered_styles]
        vectors = list(model.embed(image_paths))

        with conn.cursor() as cur:
            cur.executemany(
                "UPDATE finished_goods SET image_embedding = %s::vector WHERE style_number = %s",
                [(to_vector_literal(v), sn) for v, sn in zip(vectors, ordered_styles)],
            )
        conn.commit()
        done += len(ordered_styles)
        print(f"  image: {done}/{len(rows)} committed ({len(failed)} failed so far)")

    print(f"image stage complete: {done} embedded, {len(failed)} failed")
    return failed


# ── Verification (seed_db.py style: explicit, visible assertions) ────────


def verify(conn: psycopg.Connection, failed_styles: list[str]) -> None:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM finished_goods")
        (total,) = cur.fetchone()
        cur.execute(
            "SELECT COUNT(*) FROM finished_goods WHERE text_embedding IS NOT NULL"
        )
        (text_count,) = cur.fetchone()
        cur.execute(
            "SELECT COUNT(*) FROM finished_goods WHERE image_embedding IS NOT NULL"
        )
        (image_count,) = cur.fetchone()
        cur.execute(
            "SELECT COUNT(*) FROM finished_goods "
            "WHERE text_embedding IS NOT NULL AND vector_dims(text_embedding) != 384"
        )
        (bad_text_dims,) = cur.fetchone()
        cur.execute(
            "SELECT COUNT(*) FROM finished_goods "
            "WHERE image_embedding IS NOT NULL AND vector_dims(image_embedding) != 512"
        )
        (bad_image_dims,) = cur.fetchone()

    print("verification:")
    print(f"  finished_goods total: {total}")
    print(f"  text_embedding set:   {text_count} (expected {total})")
    print(f"  image_embedding set:  {image_count} (expected {total - len(failed_styles)})")
    print(f"  text dim mismatches:  {bad_text_dims}")
    print(f"  image dim mismatches: {bad_image_dims}")

    problems = []
    if text_count != total:
        problems.append(f"{total - text_count} row(s) missing text_embedding")
    if bad_text_dims:
        problems.append(f"{bad_text_dims} text_embedding row(s) with wrong dimension")
    if bad_image_dims:
        problems.append(f"{bad_image_dims} image_embedding row(s) with wrong dimension")
    if failed_styles:
        problems.append(
            f"{len(failed_styles)} image download/embed failure(s): {sorted(failed_styles)}"
        )

    if problems:
        print("done with problems:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        sys.exit(1)

    print("all embeddings present and correctly dimensioned.")


def main() -> None:
    database_url = os.environ.get(ENV_VAR)
    if not database_url:
        print(
            f"error: {ENV_VAR} is not set (local/CI only — never in Render)",
            file=sys.stderr,
        )
        print("  fix: set -a && source .env && set +a", file=sys.stderr)
        sys.exit(1)

    try:
        with psycopg.connect(database_url, connect_timeout=5, **_KEEPALIVE_KWARGS) as conn:
            embed_text_stage(conn)
            failed_styles = embed_image_stage(conn)
            verify(conn, failed_styles)
    except psycopg.Error as exc:
        print(f"database error: {exc}", file=sys.stderr)
        sys.exit(1)

    print("generate_embeddings complete.")


if __name__ == "__main__":
    main()
