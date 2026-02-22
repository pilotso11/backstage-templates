"""Integration tests for todo CRUD endpoints using SQLite in-memory DB."""

from collections.abc import Generator

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.handler import features, health, todo
from app.model.db import get_db
from app.model.models import Base

_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(bind=_engine)
_test_session_factory = sessionmaker(bind=_engine)


def _test_get_db() -> Generator[Session, None, None]:
    """FastAPI dependency override: yield a session per request."""
    db = _test_session_factory()
    try:
        yield db
    finally:
        db.close()


# Create test app once
_test_app = FastAPI()
_test_app.include_router(health.router)
_test_app.include_router(features.router)
_test_app.include_router(todo.router)
_test_app.dependency_overrides[get_db] = _test_get_db

client = TestClient(_test_app)


# ── GET /api/todos ───────────────────────────────────────────────────────────


class TestListTodos:
    def test_empty_list(self) -> None:
        r = client.get("/api/todos")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_with_items(self) -> None:
        client.post("/api/todos", json={"title": "Buy milk", "description": "From the store"})
        client.post("/api/todos", json={"title": "Walk dog"})
        r = client.get("/api/todos")
        assert r.status_code == 200
        todos = r.json()
        assert len(todos) >= 2


# ── POST /api/todos ──────────────────────────────────────────────────────────


class TestCreateTodo:
    def test_success(self) -> None:
        r = client.post("/api/todos", json={"title": "New task", "description": "Details"})
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "New task"
        assert data["description"] == "Details"
        assert data["status"] == "open"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_empty_title_returns_400(self) -> None:
        r = client.post("/api/todos", json={"title": ""})
        assert r.status_code == 400

    def test_whitespace_title_returns_400(self) -> None:
        r = client.post("/api/todos", json={"title": "   "})
        assert r.status_code == 400

    def test_invalid_body_returns_422(self) -> None:
        r = client.post(
            "/api/todos",
            content=b"not json",
            headers={"content-type": "application/json"},
        )
        assert r.status_code == 422

    def test_default_description(self) -> None:
        r = client.post("/api/todos", json={"title": "No desc"})
        assert r.status_code == 201
        assert r.json()["description"] == ""


# ── PATCH /api/todos/{id} ────────────────────────────────────────────────────


class TestUpdateTodo:
    def test_complete_status_change(self) -> None:
        create = client.post("/api/todos", json={"title": "To complete"})
        todo_id = create.json()["id"]
        r = client.patch(f"/api/todos/{todo_id}", json={"status": "done"})
        assert r.status_code == 200
        assert r.json()["status"] == "done"

    def test_update_title(self) -> None:
        create = client.post("/api/todos", json={"title": "Old title"})
        todo_id = create.json()["id"]
        r = client.patch(f"/api/todos/{todo_id}", json={"title": "New title"})
        assert r.status_code == 200
        assert r.json()["title"] == "New title"

    def test_invalid_status_returns_400(self) -> None:
        create = client.post("/api/todos", json={"title": "Test"})
        todo_id = create.json()["id"]
        r = client.patch(f"/api/todos/{todo_id}", json={"status": "invalid"})
        assert r.status_code == 400

    def test_not_found_returns_404(self) -> None:
        r = client.patch("/api/todos/99999", json={"status": "done"})
        assert r.status_code == 404


# ── DELETE /api/todos/{id} ───────────────────────────────────────────────────


class TestDeleteTodo:
    def test_success(self) -> None:
        create = client.post("/api/todos", json={"title": "To delete"})
        todo_id = create.json()["id"]
        r = client.delete(f"/api/todos/{todo_id}")
        assert r.status_code == 204

    def test_not_found_returns_404(self) -> None:
        r = client.delete("/api/todos/99999")
        assert r.status_code == 404

    def test_deleted_item_gone(self) -> None:
        create = client.post("/api/todos", json={"title": "Gone soon"})
        todo_id = create.json()["id"]
        client.delete(f"/api/todos/{todo_id}")
        r = client.patch(f"/api/todos/{todo_id}", json={"status": "done"})
        assert r.status_code == 404


# ── Features with DB ─────────────────────────────────────────────────────────


class TestFeaturesWithDB:
    def test_features_returns_database_true(self) -> None:
        from unittest.mock import patch

        with patch("app.handler.features.get_engine", return_value="fake-engine"):
            r = client.get("/api/features")
            assert r.status_code == 200
            assert r.json()["database"] is True
