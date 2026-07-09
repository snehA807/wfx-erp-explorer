from __future__ import annotations

import pytest

from app.core.errors import SQLGuardrailError
from app.core.guardrails import enforce_guardrails


class TestAllowedStatements:
    def test_simple_select(self) -> None:
        assert enforce_guardrails("SELECT * FROM finished_goods") == (
            "SELECT * FROM finished_goods LIMIT 100"
        )

    def test_select_with_join_and_where(self) -> None:
        sql = (
            "SELECT fg.style_number FROM finished_goods fg "
            "JOIN suppliers s ON s.supplier_id = fg.supplier_id "
            "WHERE fg.category = 'Jacket'"
        )
        result = enforce_guardrails(sql)
        assert result.endswith("LIMIT 100")
        assert "JOIN suppliers" in result

    def test_select_with_aggregate_and_group_by(self) -> None:
        sql = "SELECT category, COUNT(*) FROM finished_goods GROUP BY category"
        result = enforce_guardrails(sql)
        assert "LIMIT 100" in result

    def test_with_cte(self) -> None:
        sql = "WITH recent AS (SELECT * FROM sales_orders) SELECT * FROM recent"
        result = enforce_guardrails(sql)
        assert result.startswith("WITH")
        assert result.endswith("LIMIT 100")

    def test_case_insensitive_select(self) -> None:
        result = enforce_guardrails("select 1")
        assert "LIMIT 100" in result

    def test_lowercase_with(self) -> None:
        result = enforce_guardrails("with x as (select 1) select * from x")
        assert "LIMIT 100" in result

    def test_existing_limit_not_duplicated(self) -> None:
        result = enforce_guardrails("SELECT * FROM finished_goods LIMIT 10")
        assert result == "SELECT * FROM finished_goods LIMIT 10"

    def test_existing_lowercase_limit_not_duplicated(self) -> None:
        result = enforce_guardrails("select * from finished_goods limit 5")
        assert result.lower().count("limit") == 1

    def test_trailing_semicolon_stripped_and_limit_appended(self) -> None:
        result = enforce_guardrails("SELECT * FROM finished_goods;")
        assert result == "SELECT * FROM finished_goods LIMIT 100"

    def test_leading_and_trailing_whitespace(self) -> None:
        result = enforce_guardrails("   SELECT 1   \n")
        assert result == "SELECT 1 LIMIT 100"

    def test_semicolon_inside_string_literal_not_treated_as_chaining(self) -> None:
        sql = "SELECT * FROM tech_packs WHERE wash_instructions = 'Wash; then dry'"
        result = enforce_guardrails(sql)
        assert "Wash; then dry" in result

    def test_denylisted_word_inside_string_literal_not_blocked(self) -> None:
        sql = "SELECT * FROM finished_goods WHERE style_name = 'Created for Fall'"
        result = enforce_guardrails(sql)
        assert "Created for Fall" in result

    def test_denylisted_word_as_identifier_substring_not_blocked(self) -> None:
        # "created_at"/"lock_status"-shaped identifiers must not trip the
        # CREATE/LOCK entries via substring matching.
        sql = "SELECT created_at, lock_status FROM sales_orders"
        result = enforce_guardrails(sql)
        assert "created_at" in result and "lock_status" in result


class TestBlockedStatements:
    @pytest.mark.parametrize(
        "sql",
        [
            "INSERT INTO finished_goods (style_number) VALUES ('X')",
            "UPDATE finished_goods SET selling_price = 0",
            "DELETE FROM finished_goods",
            "DROP TABLE finished_goods",
            "ALTER TABLE finished_goods ADD COLUMN hacked TEXT",
            "TRUNCATE finished_goods",
            "CREATE TABLE evil (id INT)",
            "GRANT ALL ON finished_goods TO public",
            "REVOKE ALL ON finished_goods FROM app_readonly",
            "COPY finished_goods TO '/tmp/out.csv'",
            "CALL some_procedure()",
            "DO $$ BEGIN DELETE FROM finished_goods; END $$",
            "SET search_path TO public",
        ],
    )
    def test_denylisted_keyword_blocked(self, sql: str) -> None:
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails(sql)

    def test_modifying_cte_blocked(self) -> None:
        sql = (
            "WITH deleted AS (DELETE FROM finished_goods RETURNING *) "
            "SELECT * FROM deleted"
        )
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails(sql)

    def test_select_into_blocked(self) -> None:
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails("SELECT * INTO evil_table FROM finished_goods")

    def test_statement_chaining_blocked(self) -> None:
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails("SELECT 1; DROP TABLE finished_goods")

    def test_line_comment_smuggling_blocked(self) -> None:
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails("SELECT 1 -- ; DROP TABLE finished_goods")

    def test_block_comment_smuggling_blocked(self) -> None:
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails("SELECT 1 /* sneaky */ FROM finished_goods")

    def test_non_select_start_blocked(self) -> None:
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails("EXPLAIN SELECT 1")

    def test_empty_sql_blocked(self) -> None:
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails("")

    def test_whitespace_only_sql_blocked(self) -> None:
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails("   \n\t  ")

    def test_semicolon_only_sql_blocked(self) -> None:
        with pytest.raises(SQLGuardrailError):
            enforce_guardrails(";")


class TestBlockedStatementDetails:
    """design-spec.md's "keep the generated SQL visible" requirement:
    SQLGuardrailError.details must carry the exact SQL that was blocked, on
    every rejection path, not just some of them."""

    def test_denylisted_keyword_detail_carries_sql(self) -> None:
        sql = "DROP TABLE finished_goods"
        with pytest.raises(SQLGuardrailError) as exc_info:
            enforce_guardrails(sql)
        assert exc_info.value.details == {"sql": sql}

    def test_non_select_start_detail_carries_sql(self) -> None:
        sql = "EXPLAIN SELECT 1"
        with pytest.raises(SQLGuardrailError) as exc_info:
            enforce_guardrails(sql)
        assert exc_info.value.details == {"sql": sql}

    def test_statement_chaining_detail_carries_sql(self) -> None:
        sql = "SELECT 1; DROP TABLE finished_goods"
        with pytest.raises(SQLGuardrailError) as exc_info:
            enforce_guardrails(sql)
        assert exc_info.value.details == {"sql": sql}

    def test_comment_smuggling_detail_carries_sql(self) -> None:
        sql = "SELECT 1 -- ; DROP TABLE finished_goods"
        with pytest.raises(SQLGuardrailError) as exc_info:
            enforce_guardrails(sql)
        assert exc_info.value.details == {"sql": sql}

    def test_empty_sql_detail_carries_sql(self) -> None:
        with pytest.raises(SQLGuardrailError) as exc_info:
            enforce_guardrails("")
        assert exc_info.value.details == {"sql": ""}

    def test_detail_is_exact_sql_not_masked_or_modified(self) -> None:
        # The denylist/single-statement checks run against a literal-masked
        # copy internally; details must still surface the caller's original
        # string verbatim, not the masked working copy.
        sql = "DELETE FROM finished_goods WHERE style_name = 'DROP the beat'"
        with pytest.raises(SQLGuardrailError) as exc_info:
            enforce_guardrails(sql)
        assert exc_info.value.details == {"sql": sql}
        assert "xxxx" not in exc_info.value.details["sql"]
