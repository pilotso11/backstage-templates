"""Todo CRUD router."""

from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.model.db import get_db
from app.model.dto import TodoCreate, TodoResponse, TodoUpdate
from app.model.models import Todo

router = APIRouter()

VALID_STATUSES = {"open", "done"}


def _to_response(todo: Todo) -> TodoResponse:
    """Convert a Todo ORM object to a TodoResponse DTO."""
    return TodoResponse(
        id=todo.id,
        title=todo.title,
        description=todo.description,
        status=todo.status,
        created_at=todo.created_at.replace(tzinfo=timezone.utc).isoformat(),  # noqa: UP017
        updated_at=todo.updated_at.replace(tzinfo=timezone.utc).isoformat(),  # noqa: UP017
    )


@router.get("/api/todos", tags=["todos"], response_model=list[TodoResponse])
def list_todos(db: Session = Depends(get_db)) -> list[TodoResponse]:
    """List all todos ordered by creation date (newest first)."""
    todos = db.query(Todo).order_by(Todo.created_at.desc()).all()
    return [_to_response(t) for t in todos]


@router.post("/api/todos", tags=["todos"], response_model=TodoResponse, status_code=201)
def create_todo(req: TodoCreate, db: Session = Depends(get_db)) -> TodoResponse:
    """Create a new todo."""
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="title is required")
    todo = Todo(title=req.title, description=req.description, status="open")
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return _to_response(todo)


@router.patch("/api/todos/{todo_id}", tags=["todos"], response_model=TodoResponse)
def update_todo(todo_id: int, req: TodoUpdate, db: Session = Depends(get_db)) -> TodoResponse:
    """Update an existing todo (partial update)."""
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="todo not found")
    if req.title is not None:
        todo.title = req.title
    if req.description is not None:
        todo.description = req.description
    if req.status is not None:
        if req.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="status must be open or done")
        todo.status = req.status
    db.commit()
    db.refresh(todo)
    return _to_response(todo)


@router.delete("/api/todos/{todo_id}", tags=["todos"], status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a todo."""
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="todo not found")
    db.delete(todo)
    db.commit()
