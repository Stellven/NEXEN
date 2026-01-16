"""
SQLAlchemy ORM models for user management.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    """User account model."""
    
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    settings: Mapped[Optional["UserSettings"]] = relationship("UserSettings", back_populates="user", uselist=False)
    sessions: Mapped[list["ResearchSession"]] = relationship("ResearchSession", back_populates="user")
    
    def to_dict(self, include_email: bool = False) -> dict:
        """Convert to dictionary, excluding sensitive fields."""
        data = {
            "id": self.id,
            "display_name": self.display_name,
            "is_active": self.is_active,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_email:
            data["email"] = self.email
        return data


class UserSettings(Base):
    """User settings including API keys."""
    
    __tablename__ = "user_settings"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    # API Keys (encrypted in storage)
    openai_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    anthropic_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Preferences
    default_model: Mapped[str] = mapped_column(String(100), default="openai/gpt-4o")
    theme: Mapped[str] = mapped_column(String(20), default="dark")
    language: Mapped[str] = mapped_column(String(10), default="zh")
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="settings")
    
    def to_dict(self, mask_keys: bool = True) -> dict:
        """Convert to dictionary, optionally masking API keys."""
        def mask_key(key: Optional[str]) -> Optional[str]:
            if not key or not mask_keys:
                return key
            if len(key) <= 8:
                return "****"
            return key[:4] + "****" + key[-4:]
        
        return {
            "id": self.id,
            "user_id": self.user_id,
            "openai_api_key": mask_key(self.openai_api_key),
            "anthropic_api_key": mask_key(self.anthropic_api_key),
            "google_api_key": mask_key(self.google_api_key),
            "default_model": self.default_model,
            "theme": self.theme,
            "language": self.language,
            "has_openai": bool(self.openai_api_key),
            "has_anthropic": bool(self.anthropic_api_key),
            "has_google": bool(self.google_api_key),
        }


class ResearchSession(Base):
    """Research session model."""
    
    __tablename__ = "research_sessions"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, archived
    
    # Session data stored as JSON
    messages: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    research_results: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "message_count": len(self.messages) if self.messages else 0,
        }
