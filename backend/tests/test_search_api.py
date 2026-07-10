from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.errors import ServiceUnavailableError
from app.main import app
from app.models.responses.filters import FacetValue, FilterOptionsData, RangeFacet
from app.services import products as products_service
from app.services import search as search_service
from app.services.search import _row_to_hit

# TestClient(app) without a `with` block never runs FastAPI's lifespan
# (verified: startup/shutdown only fire under the context-manager form), so
# this never calls get_nl2sql_service().train() or touches OpenRouter/Chroma
# — genuinely zero model downloads and zero DB, per the M10 plan's
# requirement for this test module.
client = TestClient(app)

_FAKE_FACETS = FilterOptionsData(
    category=[FacetValue(value="Polo", count=10)],
    fabric=[FacetValue(value="Cotton Pique", count=10)],
    color=[FacetValue(value="Blue", count=10)],
    print=[FacetValue(value="Solid", count=10)],
    season=[FacetValue(value="Summer", count=10)],
    brand=[FacetValue(value="BrandX", count=10)],
    gsm=RangeFacet(min=100, max=300),
    selling_price=RangeFacet(min=10, max=500),
)

# _LIST_COLUMNS order + trailing distance, matching db/queries/search.py.
_ROW_A = (
    "WFX-1001",
    "Style A",
    "Polo",
    "Cotton Pique",
    180,
    "Blue",
    "Solid",
    "Summer",
    "BrandX",
    50.0,
    120.0,
    "http://img/a.jpg",
    "Supplier A",
    0.10,
)
_ROW_B = (
    "WFX-1002",
    "Style B",
    "Polo",
    "Cotton Pique",
    190,
    "Blue",
    "Solid",
    "Summer",
    "BrandX",
    55.0,
    130.0,
    "http://img/b.jpg",
    "Supplier B",
    0.30,
)


class _FakeCursor:
    def __init__(self, rows: list[tuple]) -> None:
        self._rows = rows

    def __enter__(self) -> "_FakeCursor":
        return self

    def __exit__(self, *exc: object) -> bool:
        return False

    def execute(self, query: str, params: dict | None = None) -> None:
        pass

    def fetchall(self) -> list[tuple]:
        return self._rows


class _FakeConnection:
    def __init__(self, rows: list[tuple]) -> None:
        self._rows = rows

    def cursor(self) -> _FakeCursor:
        return _FakeCursor(self._rows)


@pytest.fixture(autouse=True)
def _clear_lru_caches() -> None:
    # embed_query_text is functools.lru_cache-wrapped; clear between tests
    # so monkeypatched raises/returns don't leak via a cached result from an
    # earlier test using the same query string. search_visual also calls
    # embed_query_text since the M11 escape hatch (architecture.md §5) moved
    # it off CLIP's embed_query_visual (OOMs Render's 512MB free tier).
    search_service.embed_query_text.cache_clear()
    yield
    search_service.embed_query_text.cache_clear()


class TestSearchProducts:
    def test_valid_hybrid_request(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(products_service, "get_filter_options", lambda: _FAKE_FACETS)
        monkeypatch.setattr(
            search_service, "embed_query_text", lambda query: "[0.1,0.2]"
        )
        monkeypatch.setattr(
            search_service,
            "get_connection",
            lambda: _FakeConnection([_ROW_A, _ROW_B]),
        )

        resp = client.post(
            "/api/v1/search/products",
            json={"query": "blue polo shirt", "limit": 24, "category": "Polo"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["meta"]["count"] == 2
        assert [item["style_number"] for item in body["data"]] == [
            "WFX-1001",
            "WFX-1002",
        ]
        assert [item["score"] for item in body["data"]] == [0.9, 0.7]
        for item in body["data"]:
            assert "score" in item

    def test_empty_query_returns_422(self) -> None:
        resp = client.post("/api/v1/search/products", json={"query": ""})
        assert resp.status_code == 422
        assert "error" in resp.json()

    def test_unknown_field_returns_422(self) -> None:
        resp = client.post(
            "/api/v1/search/products", json={"query": "shirt", "bogus": 1}
        )
        assert resp.status_code == 422

    @pytest.mark.parametrize("limit", [0, 49])
    def test_limit_out_of_range_returns_422(self, limit: int) -> None:
        resp = client.post(
            "/api/v1/search/products", json={"query": "shirt", "limit": limit}
        )
        assert resp.status_code == 422

    def test_unknown_categorical_filter_value_returns_422(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(products_service, "get_filter_options", lambda: _FAKE_FACETS)

        resp = client.post(
            "/api/v1/search/products",
            json={"query": "shirt", "category": "Nonexistent"},
        )

        assert resp.status_code == 422
        error = resp.json()["error"]
        assert error["code"] == "VALIDATION_ERROR"
        assert error["details"] == {"field": "category", "value": "Nonexistent"}

    def test_min_price_greater_than_max_price_returns_422(self) -> None:
        resp = client.post(
            "/api/v1/search/products",
            json={"query": "shirt", "min_price": 100, "max_price": 10},
        )
        assert resp.status_code == 422

    def test_embedding_failure_returns_503(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(products_service, "get_filter_options", lambda: _FAKE_FACETS)

        def _raise(query: str) -> str:
            raise ServiceUnavailableError("Search is warming up or unavailable")

        monkeypatch.setattr(search_service, "embed_query_text", _raise)

        resp = client.post("/api/v1/search/products", json={"query": "shirt"})

        assert resp.status_code == 503
        assert resp.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


class TestSearchVisual:
    def test_valid_visual_request(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(
            search_service, "embed_query_text", lambda query: "[0.3,0.4]"
        )
        monkeypatch.setattr(
            search_service,
            "get_connection",
            lambda: _FakeConnection([_ROW_A, _ROW_B]),
        )

        resp = client.post(
            "/api/v1/search/visual", json={"query": "dark garment with stripes"}
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["meta"]["count"] == 2
        assert [item["score"] for item in body["data"]] == [0.9, 0.7]

    def test_empty_query_returns_422(self) -> None:
        resp = client.post("/api/v1/search/visual", json={"query": ""})
        assert resp.status_code == 422

    def test_filters_field_rejected(self) -> None:
        # design-spec.md §4: visual search takes no structured filters, so
        # SearchVisualRequest doesn't declare them — extra="forbid" rejects.
        resp = client.post(
            "/api/v1/search/visual", json={"query": "shirt", "category": "Polo"}
        )
        assert resp.status_code == 422

    def test_embedding_failure_returns_503(self, monkeypatch: pytest.MonkeyPatch) -> None:
        def _raise(query: str) -> str:
            raise ServiceUnavailableError("Search is warming up or unavailable")

        monkeypatch.setattr(search_service, "embed_query_text", _raise)

        resp = client.post("/api/v1/search/visual", json={"query": "shirt"})

        assert resp.status_code == 503
        assert resp.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


class TestRowToHit:
    def test_score_is_one_minus_distance(self) -> None:
        row = (
            "WFX-9999",
            "Style Z",
            "Polo",
            "Cotton Pique",
            180,
            "Blue",
            "Solid",
            "Summer",
            "BrandX",
            50.0,
            120.0,
            "http://img/z.jpg",
            "Supplier Z",
            0.25,
        )
        hit = _row_to_hit(row)
        assert hit.score == 0.75
