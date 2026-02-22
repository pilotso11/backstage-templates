"""Database initialization and session dependency."""

import logging
import os
import time
from collections.abc import Generator
from urllib.parse import urlparse, urlunparse

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

logger = logging.getLogger(__name__)

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
    # SQLAlchemy 2.x requires 'postgresql://' scheme, not 'postgres://'
    scheme = "postgresql" if parsed.scheme == "postgres" else parsed.scheme
    return urlunparse(parsed._replace(scheme=scheme, netloc=netloc))


def init_db(database_url: str, max_retries: int = 6, retry_delay: int = 5) -> Engine:
    """Create engine, run migrations, return engine. Raise on failure after retries."""
    global _engine, _session_factory  # noqa: PLW0603
    from app.model.models import Base

    retry_count = 0

    while retry_count < max_retries:
        try:
            logger.info("Connecting to database (attempt %d/%d)...", retry_count + 1, max_retries)
            _engine = create_engine(database_url, echo=(os.getenv("DEBUG") == "true"))
            _session_factory = sessionmaker(bind=_engine)

            # Create all tables in the public schema
            logger.info("Creating database tables...")
            Base.metadata.create_all(bind=_engine, checkfirst=True)
            logger.info("Database initialized successfully")
            return _engine

        except Exception as e:
            retry_count += 1
            if retry_count < max_retries:
                logger.warning(
                    "Database connection failed (attempt %d/%d): %s. Retrying in %ds...",
                    retry_count,
                    max_retries,
                    e,
                    retry_delay,
                )
                time.sleep(retry_delay)
            else:
                logger.error(
                    "Failed to connect to database after %d attempts: %s",
                    max_retries,
                    e,
                )
                raise RuntimeError(
                    f"Database initialization failed after {max_retries} attempts"
                ) from None  # noqa: B904
    # Should never reach here
    raise AssertionError("unreachable")  # pragma: no cover


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
