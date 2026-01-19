"""
SQLite database configuration.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pathlib import Path


# Database file path - use /app/data in Docker (volume mounted) or local path for dev
def get_db_path() -> Path:
    # In Docker, use /app/data which is a persistent volume
    data_dir = Path("/app/data")
    if data_dir.exists():
        return data_dir / "nexen.db"
    # For local development, use path relative to project
    return Path(__file__).parent.parent.parent / "nexen.db"


DB_PATH = get_db_path()
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite
    echo=False,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for ORM models."""
    pass


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    # Import all models to ensure they're registered
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized at {DB_PATH}")

    # Run migrations for existing databases
    try:
        from app.db.migrations.migration_001 import run_migration
        run_migration()
    except Exception as e:
        print(f"Migration note: {e}")
