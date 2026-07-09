from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal

from app.models.responses.query import QuerySqlEvent
from app.services.query_pipeline import (
    _MAX_ANSWER_SAMPLE_ROWS,
    _format_rows_for_prompt,
    _serialize_value,
    _sse,
    _strip_hidden_columns,
)


class TestSerializeValue:
    def test_decimal_becomes_float(self) -> None:
        assert _serialize_value(Decimal("12.50")) == 12.5

    def test_date_becomes_isoformat(self) -> None:
        assert _serialize_value(date(2026, 7, 10)) == "2026-07-10"

    def test_datetime_becomes_isoformat(self) -> None:
        value = datetime(2026, 7, 10, 9, 30)
        assert _serialize_value(value) == value.isoformat()

    def test_passthrough_types_unchanged(self) -> None:
        assert _serialize_value("abc") == "abc"
        assert _serialize_value(5) == 5
        assert _serialize_value(None) is None
        assert _serialize_value(True) is True


class TestSse:
    def test_event_framing(self) -> None:
        frame = _sse("sql", QuerySqlEvent(sql="SELECT 1"))
        text = frame.decode("utf-8")
        assert text.startswith("event: sql\n")
        assert text.endswith("\n\n")
        data_line = text.split("\n")[1]
        assert data_line.startswith("data: ")
        payload = json.loads(data_line[len("data: ") :])
        assert payload == {"sql": "SELECT 1"}

    def test_data_payload_is_single_line(self) -> None:
        # SSE frames are newline-delimited; a multi-line `data:` payload
        # would silently corrupt the wire format, so this guards against
        # ever switching model_dump_json() to an indented/pretty mode.
        frame = _sse("sql", QuerySqlEvent(sql="SELECT 1"))
        # "event: sql\n" + "data: {...}\n" + trailing blank "\n" terminator.
        assert frame.count(b"\n") == 3


class TestStripHiddenColumns:
    def test_select_star_drops_vector_columns(self) -> None:
        # A SELECT * doesn't survive ddl.sql's training-time vector-column
        # stripping — the DB still returns them, so this is the execution-
        # time backstop (docs/decisions.md).
        columns = ["style_number", "text_embedding", "image_embedding", "gsm"]
        raw_rows = [("SN-1", [0.1, 0.2], [0.3, 0.4], 180)]
        visible_columns, rows = _strip_hidden_columns(columns, raw_rows)
        assert visible_columns == ["style_number", "gsm"]
        assert rows == [{"style_number": "SN-1", "gsm": 180}]

    def test_no_hidden_columns_present_is_unchanged(self) -> None:
        columns = ["category", "revenue"]
        raw_rows = [("Shirts", Decimal("100.50"))]
        visible_columns, rows = _strip_hidden_columns(columns, raw_rows)
        assert visible_columns == ["category", "revenue"]
        assert rows == [{"category": "Shirts", "revenue": 100.5}]

    def test_empty_result_set(self) -> None:
        visible_columns, rows = _strip_hidden_columns(["style_number"], [])
        assert visible_columns == ["style_number"]
        assert rows == []


class TestFormatRowsForPrompt:
    def test_small_result_set_lists_every_row(self) -> None:
        columns = ["category", "revenue"]
        rows = [{"category": "Shirts", "revenue": 100.0}]
        text = _format_rows_for_prompt(columns, rows)
        assert text == "category=Shirts, revenue=100.0"

    def test_large_result_set_is_capped_with_a_note(self) -> None:
        columns = ["n"]
        rows = [{"n": i} for i in range(_MAX_ANSWER_SAMPLE_ROWS + 5)]
        text = _format_rows_for_prompt(columns, rows)
        lines = text.split("\n")
        assert len(lines) == _MAX_ANSWER_SAMPLE_ROWS + 1
        assert lines[-1] == "...(5 more row(s) not shown)"

    def test_exactly_at_cap_has_no_truncation_note(self) -> None:
        columns = ["n"]
        rows = [{"n": i} for i in range(_MAX_ANSWER_SAMPLE_ROWS)]
        text = _format_rows_for_prompt(columns, rows)
        assert "more row" not in text
        assert len(text.split("\n")) == _MAX_ANSWER_SAMPLE_ROWS
