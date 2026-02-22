"""Pydantic request/response schemas for todos."""

from pydantic import BaseModel


class TodoCreate(BaseModel):
    title: str
    description: str = ""


class TodoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None


class TodoResponse(BaseModel):
    id: int
    title: str
    description: str
    status: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
