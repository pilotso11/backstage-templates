"""Database initialization and session dependency."""

from collections.abc import Generator
from urllib.parse import urlparse, urlunparse

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def build_dsn(base_url: str, user: str, password: str) -> str:
    """Inject user/pass credentials into a database URL."""
    parsed = urlparse(base_url)
    if not parsed.hostname:
        return base_url
    netloc = f"{user}:{password}@{parsed.hostname}"
    if parsed.port:
        netloc += f":{parsed.port}"
    return urlunparse(parsed._replace(netloc=netloc))


def init_db(database_url: str) -> Engine:
    """Create engine, run migrations, return engine."""
    global _engine, _session_factory  # noqa: PLW0603
    from app.model.models import Base

    _engine = create_engine(database_url)
    _session_factory = sessionmaker(bind=_engine)
    Base.metadata.create_all(bind=_engine)
    return _engine


def get_engine() -> Engine | None:
    """Return the current engine (None if not initialized)."""
    return _engine


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yield a session per request."""
    if _session_factory is None:
        raise RuntimeError("Database not initialized")
    db = _session_factory()
    try:
        yield db
    finally:
        db.close()
