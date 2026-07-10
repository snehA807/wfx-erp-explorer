from __future__ import annotations

from app.db.queries.products import _LIST_COLUMNS, _LIST_FROM, build_where_clause

# Re-exported so services/search.py has one import surface for both filter
# building and column/table constants (M10 plan §6: "reuse import directly").
__all__ = ["build_where_clause", "build_hybrid_search_query", "VISUAL_SEARCH"]


def build_hybrid_search_query(where_sql: str) -> str:
    # architecture.md §4's definition of "hybrid": vector distance + a
    # structured WHERE in one statement, not vector+keyword fusion.
    return (
        f"SELECT{_LIST_COLUMNS},\n"
        "    fg.text_embedding <=> %(qvec)s::vector AS distance"
        f"{_LIST_FROM}"
        f"WHERE {where_sql} AND fg.text_embedding IS NOT NULL\n"
        "ORDER BY fg.text_embedding <=> %(qvec)s::vector\n"
        "LIMIT %(limit)s"
    )


# No structured filters (design-spec.md §4: appearance-only query), so this
# is a static string rather than a builder.
#
# M11 escape hatch (architecture.md §5): CLIP (image_embedding) OOMs Render's
# 512MB free tier once loaded alongside BGE + Chroma (confirmed live — a
# hard 512MB-capped local Docker run was OOM-killed on the first
# /search/visual request). Falls back to BGE text embeddings
# (text_embedding) — same endpoint contract, appearance-only queries just
# match against the garment's text description instead of its pixels.
VISUAL_SEARCH = f"""
SELECT{_LIST_COLUMNS},
    fg.text_embedding <=> %(qvec)s::vector AS distance
{_LIST_FROM}
WHERE fg.text_embedding IS NOT NULL
ORDER BY fg.text_embedding <=> %(qvec)s::vector
LIMIT %(limit)s
"""
