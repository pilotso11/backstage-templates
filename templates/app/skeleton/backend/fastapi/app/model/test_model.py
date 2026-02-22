"""Unit tests for model package."""

from app.model.db import build_dsn
from app.model.dto import TodoCreate, TodoResponse, TodoUpdate


class TestBuildDSN:
    def test_basic(self) -> None:
        result = build_dsn("postgresql://localhost:5432/mydb", "user", "pass")
        assert result == "postgresql://user:pass@localhost:5432/mydb"

    def test_invalid_url_returns_original(self) -> None:
        result = build_dsn("not-a-url", "user", "pass")
        assert result == "not-a-url"

    def test_preserves_query_params(self) -> None:
        result = build_dsn("postgresql://host:5432/db?sslmode=disable", "u", "p")
        assert "sslmode=disable" in result
        assert "u:p@host" in result

    def test_no_port(self) -> None:
        result = build_dsn("postgresql://host/db", "u", "p")
        assert result == "postgresql://u:p@host/db"


class TestTodoCreateSchema:
    def test_with_title_only(self) -> None:
        t = TodoCreate(title="test")
        assert t.title == "test"
        assert t.description == ""

    def test_with_title_and_description(self) -> None:
        t = TodoCreate(title="test", description="desc")
        assert t.description == "desc"


class TestTodoUpdateSchema:
    def test_all_none_by_default(self) -> None:
        t = TodoUpdate()
        assert t.title is None
        assert t.description is None
        assert t.status is None

    def test_partial_update(self) -> None:
        t = TodoUpdate(status="done")
        assert t.status == "done"
        assert t.title is None


class TestTodoResponseSchema:
    def test_from_attributes(self) -> None:
        class FakeRow:
            id = 1
            title = "test"
            description = "desc"
            status = "open"
            created_at = "2024-01-01T00:00:00+00:00"
            updated_at = "2024-01-01T00:00:00+00:00"

        r = TodoResponse.model_validate(FakeRow(), from_attributes=True)
        assert r.id == 1
        assert r.title == "test"
