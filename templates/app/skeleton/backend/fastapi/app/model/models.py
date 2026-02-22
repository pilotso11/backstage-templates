"""SQLAlchemy 2.0 models."""

from datetime import datetime, timezone

from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)  # noqa: UP017


class Base(DeclarativeBase):
    pass


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), default="")
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=_utcnow, onupdate=_utcnow)
