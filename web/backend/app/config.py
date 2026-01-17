"""
Backend configuration using Pydantic Settings.
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Backend configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "NEXEN Web"
    debug: bool = False
    api_prefix: str = "/api"

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://nexen:nexen@localhost:5432/nexen",
        alias="DATABASE_URL",
    )

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        alias="REDIS_URL",
    )

    # Qdrant Vector Database
    qdrant_url: str = Field(
        default="http://localhost:6333",
        alias="QDRANT_URL",
    )

    # Auth
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        alias="SECRET_KEY",
    )
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # NEXEN
    nexen_workspace: Path = Field(
        default=Path("./research_workspace"),
        alias="NEXEN_WORKSPACE_DIR",
    )

    # API Keys (passed through to NEXEN)
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings."""
    return Settings()
