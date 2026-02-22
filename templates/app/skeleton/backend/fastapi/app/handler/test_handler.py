"""Unit tests for handler package."""

import os
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.handler import auth, compute, features, health


def _make_app() -> FastAPI:
    """Create a minimal app with handler routers for isolated testing."""
    test_app = FastAPI()
    test_app.include_router(health.router)
    test_app.include_router(auth.router)
    test_app.include_router(compute.router)
    test_app.include_router(features.router)
    return test_app


_app = _make_app()
client = TestClient(_app)


# ── Compute ──────────────────────────────────────────────────────────────────


class TestCompute:
    def test_add(self) -> None:
        r = client.post("/api/compute", json={"a": 2, "op": "add", "b": 3})
        assert r.status_code == 200
        assert r.json()["result"] == 5

    def test_div_by_zero(self) -> None:
        r = client.post("/api/compute", json={"a": 1, "op": "div", "b": 0})
        assert r.status_code == 400

    def test_invalid_op(self) -> None:
        r = client.post("/api/compute", json={"a": 1, "op": "modulo", "b": 2})
        assert r.status_code == 400

    def test_invalid_body(self) -> None:
        r = client.post("/api/compute", json={"a": 1})
        assert r.status_code == 422


# ── Health ───────────────────────────────────────────────────────────────────


class TestHealth:
    def test_ok_no_database_url(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            r = client.get("/healthz")
            assert r.status_code == 200
            assert r.json()["status"] == "ok"

    def test_unhealthy_when_db_expected(self) -> None:
        with (
            patch.dict(os.environ, {"DATABASE_URL": "postgresql://host/db"}),
            patch("app.handler.health.get_engine", return_value=None),
        ):
            r = client.get("/healthz")
            assert r.status_code == 503
            assert r.json()["status"] == "unhealthy"

    def test_ok_with_db_connected(self) -> None:
        with (
            patch.dict(os.environ, {"DATABASE_URL": "postgresql://host/db"}),
            patch("app.handler.health.get_engine", return_value="fake-engine"),
        ):
            r = client.get("/healthz")
            assert r.status_code == 200
            assert r.json()["status"] == "ok"


# ── Features ─────────────────────────────────────────────────────────────────


class TestFeatures:
    def test_no_db(self) -> None:
        with patch("app.handler.features.get_engine", return_value=None):
            r = client.get("/api/features")
            assert r.status_code == 200
            assert r.json()["database"] is False

    def test_with_db(self) -> None:
        with patch("app.handler.features.get_engine", return_value="fake-engine"):
            r = client.get("/api/features")
            assert r.status_code == 200
            assert r.json()["database"] is True


# ── User / Auth ──────────────────────────────────────────────────────────────


class TestUser:
    @patch.dict(os.environ, {"DEV_MODE": "true", "DEV_USER_EMAIL": "test@example.com"})
    def test_dev_mode(self) -> None:
        r = client.get("/api/user")
        assert r.status_code == 200
        assert r.json()["email"] == "test@example.com"
        assert r.json()["authenticated"] is True

    def test_no_auth(self) -> None:
        r = client.get("/api/user")
        assert r.json()["authenticated"] is False
