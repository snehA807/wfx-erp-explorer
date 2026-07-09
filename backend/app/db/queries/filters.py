from __future__ import annotations

# One named constant per facet column (coding-standards.md). Written out
# explicitly rather than templated from a column list: the six columns are
# fixed for good (backend-spec.md §1's filterable-column list), so there is
# no real dynamism to abstract over.

CATEGORY_FACETS = """
SELECT category AS value, count(*) AS count
FROM finished_goods
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC, category ASC
"""

FABRIC_FACETS = """
SELECT fabric AS value, count(*) AS count
FROM finished_goods
WHERE fabric IS NOT NULL
GROUP BY fabric
ORDER BY count DESC, fabric ASC
"""

COLOR_FACETS = """
SELECT color AS value, count(*) AS count
FROM finished_goods
WHERE color IS NOT NULL
GROUP BY color
ORDER BY count DESC, color ASC
"""

PRINT_FACETS = """
SELECT print AS value, count(*) AS count
FROM finished_goods
WHERE print IS NOT NULL
GROUP BY print
ORDER BY count DESC, print ASC
"""

SEASON_FACETS = """
SELECT season AS value, count(*) AS count
FROM finished_goods
WHERE season IS NOT NULL
GROUP BY season
ORDER BY count DESC, season ASC
"""

BRAND_FACETS = """
SELECT brand AS value, count(*) AS count
FROM finished_goods
WHERE brand IS NOT NULL
GROUP BY brand
ORDER BY count DESC, brand ASC
"""

RANGE_FACETS = """
SELECT
    min(gsm) AS gsm_min,
    max(gsm) AS gsm_max,
    min(selling_price) AS price_min,
    max(selling_price) AS price_max
FROM finished_goods
"""
