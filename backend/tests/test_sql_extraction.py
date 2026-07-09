from __future__ import annotations

import pytest

from app.core.errors import LLMError
from app.services.nl2sql import extract_sql


class TestExtractSql:
    def test_plain_select_returned_as_is(self) -> None:
        assert (
            extract_sql("SELECT * FROM finished_goods")
            == "SELECT * FROM finished_goods"
        )

    def test_plain_with_cte_returned_as_is(self) -> None:
        sql = "WITH x AS (SELECT 1) SELECT * FROM x"
        assert extract_sql(sql) == sql

    def test_sql_fenced_block_extracted(self) -> None:
        response = "```sql\nSELECT * FROM finished_goods\n```"
        assert extract_sql(response) == "SELECT * FROM finished_goods"

    def test_generic_fenced_block_extracted(self) -> None:
        response = "```\nSELECT * FROM finished_goods\n```"
        assert extract_sql(response) == "SELECT * FROM finished_goods"

    def test_prose_before_fenced_block_still_extracted(self) -> None:
        response = "Here is the query:\n```sql\nSELECT * FROM finished_goods\n```"
        assert extract_sql(response) == "SELECT * FROM finished_goods"

    def test_leading_and_trailing_whitespace_stripped(self) -> None:
        assert extract_sql("   SELECT 1   \n") == "SELECT 1"

    def test_case_insensitive_select_detected(self) -> None:
        assert extract_sql("select 1") == "select 1"

    def test_case_insensitive_with_detected(self) -> None:
        sql = "with x as (select 1) select * from x"
        assert extract_sql(sql) == sql

    def test_pure_prose_refusal_raises_llm_error(self) -> None:
        with pytest.raises(LLMError):
            extract_sql("I'm sorry, I cannot generate a query for that request.")

    def test_empty_response_raises_llm_error(self) -> None:
        with pytest.raises(LLMError):
            extract_sql("")

    def test_whitespace_only_response_raises_llm_error(self) -> None:
        with pytest.raises(LLMError):
            extract_sql("   \n\t  ")

    def test_prose_containing_the_word_with_is_not_treated_as_no_sql(self) -> None:
        # Known characterization, not a bug: extraction only checks for a
        # SQL keyword ANYWHERE in the text, so ordinary English use of the
        # word "with" avoids the LLMError path here. core/guardrails.py's
        # stricter "must START with SELECT/WITH" check is what actually
        # rejects text like this — extraction and guardrails are
        # deliberately two layers with different strictness.
        response = "I can't help along with that particular request."
        assert extract_sql(response) == response
