"""
Global settings for NEXEN using Pydantic Settings.

Loads configuration from environment variables and .env file.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global NEXEN configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="NEXEN_",
        extra="ignore",
    )

    # ==========================================================================
    # API Keys (loaded from environment without prefix)
    # ==========================================================================
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    xai_api_key: str = Field(default="", alias="XAI_API_KEY")
    dashscope_api_key: str = Field(default="", alias="DASHSCOPE_API_KEY")
    deepseek_api_key: str = Field(default="", alias="DEEPSEEK_API_KEY")

    # ==========================================================================
    # Vector Database
    # ==========================================================================
    qdrant_url: str = Field(default="http://localhost:6333", alias="QDRANT_URL")
    qdrant_api_key: str = Field(default="", alias="QDRANT_API_KEY")

    # ==========================================================================
    # System Configuration
    # ==========================================================================
    workspace_dir: Path = Field(default=Path("./research_workspace"))
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # Model availability flags (for cost control)
    enable_o3: bool = True
    enable_opus: bool = True

    # ==========================================================================
    # Pipeline Configuration
    # ==========================================================================
    # Module 1: Prompt Pipeline
    prompt_review_threshold: int = Field(default=40, ge=0, le=50)
    prompt_max_iterations: int = Field(default=3, ge=1, le=5)

    # Module 2: Memory Retrieval
    memory_token_budget: int = Field(default=8000, ge=1000)
    memory_semantic_top_k: int = Field(default=3, ge=1, le=10)

    # Module 3: Context Preprocessing
    context_max_tokens: int = Field(default=12000, ge=1000)

    # ==========================================================================
    # Default Model Configuration
    # ==========================================================================
    default_model: str = "claude-sonnet-4"
    default_temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    default_max_tokens: int = Field(default=4000, ge=100)

    def get_workspace_path(self, *parts: str) -> Path:
        """Get a path within the workspace directory."""
        path = self.workspace_dir.joinpath(*parts)
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def get_session_path(self, session_id: str, *parts: str) -> Path:
        """Get a path within a specific session directory."""
        return self.get_workspace_path("sessions", session_id, *parts)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
