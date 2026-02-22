"""Features endpoint — reports which optional features are enabled."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.model.db import get_engine

router = APIRouter()


class FeaturesResponse(BaseModel):
    database: bool


@router.get("/api/features", tags=["ops"], response_model=FeaturesResponse)
def features() -> FeaturesResponse:
    """List enabled features."""
    return FeaturesResponse(database=get_engine() is not None)
