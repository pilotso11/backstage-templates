"""DB-aware health check endpoint."""

import os

from fastapi import APIRouter, Response

from app.model.db import get_engine

router = APIRouter()


@router.get("/healthz", tags=["ops"])
def health(response: Response) -> dict[str, str]:
    """Health check — returns 503 if DATABASE_URL is set but DB is not connected."""
    if os.getenv("DATABASE_URL") and get_engine() is None:
        response.status_code = 503
        return {"status": "unhealthy", "reason": "database not connected"}
    return {"status": "ok"}
