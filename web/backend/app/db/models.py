"""
SQLAlchemy ORM models for NEXEN application.

Models:
- User, UserSettings, ResearchSession (existing)
- Conversation (AI Ask)
- Document, Folder, DocumentChunk (My Library)
- ImageGeneration (AI Image)
- WritingProject (AI Writing)
- Report (AI Reports)
- DecisionAnalysis (AI Decision)
- Team, TeamMember, TeamTask (My Teams)
- InstalledTool (AI Tools)
"""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, JSON, Integer, LargeBinary, Float
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
    conversations: Mapped[list["Conversation"]] = relationship("Conversation", back_populates="user")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="user")
    folders: Mapped[list["Folder"]] = relationship("Folder", back_populates="user")
    image_generations: Mapped[list["ImageGeneration"]] = relationship("ImageGeneration", back_populates="user")
    writing_projects: Mapped[list["WritingProject"]] = relationship("WritingProject", back_populates="user")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="user")
    decision_analyses: Mapped[list["DecisionAnalysis"]] = relationship("DecisionAnalysis", back_populates="user")
    owned_teams: Mapped[list["Team"]] = relationship("Team", back_populates="owner", foreign_keys="Team.owner_id")
    team_memberships: Mapped[list["TeamMember"]] = relationship("TeamMember", back_populates="user")
    installed_tools: Mapped[list["InstalledTool"]] = relationship("InstalledTool", back_populates="user")
    search_histories: Mapped[list["SearchHistory"]] = relationship("SearchHistory", back_populates="user")

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


# =============================================================================
# AI Ask Module - Conversation
# =============================================================================

class Conversation(Base):
    """Chat conversation for AI Ask module."""

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(200), default="New Chat")
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_id: Mapped[str] = mapped_column(String(100), default="openai/gpt-4o")

    is_bookmarked: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    # Messages stored as JSON array
    messages: Mapped[Optional[dict]] = mapped_column(JSON, default=list)

    # Usage stats
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="conversations")

    def to_dict(self, include_messages: bool = False) -> dict:
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "summary": self.summary,
            "model_id": self.model_id,
            "is_bookmarked": self.is_bookmarked,
            "is_archived": self.is_archived,
            "message_count": self.message_count,
            "total_tokens": self.total_tokens,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_messages:
            data["messages"] = self.messages or []
        return data


class Message(Base):
    """Chat message in a conversation."""

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), index=True)

    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Token usage
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", backref="message_list")


# =============================================================================
# My Library Module - Document, Folder, DocumentChunk
# =============================================================================

class Folder(Base):
    """Folder for organizing documents."""

    __tablename__ = "folders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # For UI

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="folders")
    parent: Mapped[Optional["Folder"]] = relationship("Folder", remote_side=[id], backref="children")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="folder")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "description": self.description,
            "color": self.color,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Document(Base):
    """Document in the knowledge library."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    folder_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)

    # Basic info
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)  # pdf, docx, md, txt, url
    file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Local path or S3 key
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # For URL imports
    file_size: Mapped[int] = mapped_column(Integer, default=0)  # In bytes

    # Parse status
    parse_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, parsing, completed, failed
    parse_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parsed_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Plain text content

    # Embedding status
    embedding_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, processing, completed, failed
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)

    # Metadata
    tags: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    doc_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)  # Author, page count, etc.

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="documents")
    folder: Mapped[Optional["Folder"]] = relationship("Folder", back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "folder_id": self.folder_id,
            "name": self.name,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "source_url": self.source_url,
            "parse_status": self.parse_status,
            "embedding_status": self.embedding_status,
            "chunk_count": self.chunk_count,
            "tags": self.tags or [],
            "metadata": self.doc_metadata or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DocumentChunk(Base):
    """Document chunk for vector search."""

    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), index=True)

    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0)

    # Embedding stored in vector DB (Qdrant), but we keep reference here
    embedding_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Metadata for retrieval
    chunk_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)  # page_number, section, etc.

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="chunks")


# =============================================================================
# AI Explore Module - SearchHistory
# =============================================================================

class SearchHistory(Base):
    """Search history for AI Explore."""

    __tablename__ = "search_histories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    query: Mapped[str] = mapped_column(Text, nullable=False)
    results_count: Mapped[int] = mapped_column(Integer, default=0)
    filters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Applied filters

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="search_histories")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "query": self.query,
            "results_count": self.results_count,
            "filters": self.filters,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# AI Image Module
# =============================================================================

class ImageGeneration(Base):
    """Image generation record."""

    __tablename__ = "image_generations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    negative_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model: Mapped[str] = mapped_column(String(100), default="dall-e-3")

    # Generated image
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # External URL
    image_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Local/S3 path
    thumbnail_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Parameters
    width: Mapped[int] = mapped_column(Integer, default=1024)
    height: Mapped[int] = mapped_column(Integer, default=1024)
    style: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # vivid, natural
    quality: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # standard, hd

    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, generating, completed, failed
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Cost tracking
    cost_credits: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="image_generations")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "prompt": self.prompt,
            "negative_prompt": self.negative_prompt,
            "model": self.model,
            "image_url": self.image_url,
            "image_path": self.image_path,
            "width": self.width,
            "height": self.height,
            "style": self.style,
            "quality": self.quality,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# AI Writing Module
# =============================================================================

class WritingProject(Base):
    """Writing project for AI Writing module."""

    __tablename__ = "writing_projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    template_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # article, report, email, essay, etc.

    # Content
    content: Mapped[str] = mapped_column(Text, default="")  # Plain text or Markdown
    content_html: Mapped[str] = mapped_column(Text, default="")  # HTML for rich text

    # Stats
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    character_count: Mapped[int] = mapped_column(Integer, default=0)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, completed, archived

    # AI assistance history
    ai_history: Mapped[Optional[dict]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="writing_projects")

    def to_dict(self, include_content: bool = False) -> dict:
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "template_type": self.template_type,
            "word_count": self.word_count,
            "character_count": self.character_count,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_content:
            data["content"] = self.content
            data["content_html"] = self.content_html
        return data


# =============================================================================
# AI Reports Module
# =============================================================================

class Report(Base):
    """Report for AI Reports module."""

    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    research_session_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("research_sessions.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    template_type: Mapped[str] = mapped_column(String(50), default="standard")  # standard, executive, technical, research

    # Content
    content: Mapped[str] = mapped_column(Text, default="")
    content_html: Mapped[str] = mapped_column(Text, default="")

    # Sections stored as JSON
    sections: Mapped[Optional[dict]] = mapped_column(JSON, default=list)

    # Charts configuration
    charts_data: Mapped[Optional[dict]] = mapped_column(JSON, default=list)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, completed, exported

    # Export info
    export_format: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # pdf, docx
    export_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    exported_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="reports")
    research_session: Mapped[Optional["ResearchSession"]] = relationship("ResearchSession")

    def to_dict(self, include_content: bool = False) -> dict:
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "research_session_id": self.research_session_id,
            "title": self.title,
            "template_type": self.template_type,
            "status": self.status,
            "export_format": self.export_format,
            "exported_at": self.exported_at.isoformat() if self.exported_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_content:
            data["content"] = self.content
            data["sections"] = self.sections or []
            data["charts_data"] = self.charts_data or []
        return data


# =============================================================================
# AI Decision Module
# =============================================================================

class DecisionAnalysis(Base):
    """Decision analysis for AI Decision module."""

    __tablename__ = "decision_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Decision matrix data
    options: Mapped[Optional[dict]] = mapped_column(JSON, default=list)  # [{id, name, description}]
    criteria: Mapped[Optional[dict]] = mapped_column(JSON, default=list)  # [{id, name, description, type}]
    weights: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)  # {criteria_id: weight}
    scores: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)  # {option_id: {criteria_id: score}}

    # Calculated results
    results: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)  # {option_id: total_score}
    ranking: Mapped[Optional[dict]] = mapped_column(JSON, default=list)  # Sorted option IDs

    # Scenario simulation
    scenarios: Mapped[Optional[dict]] = mapped_column(JSON, default=list)  # [{name, weight_adjustments, results}]
    simulation_results: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # AI recommendation
    ai_recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, completed

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="decision_analyses")

    def to_dict(self, include_details: bool = False) -> dict:
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "option_count": len(self.options) if self.options else 0,
            "criteria_count": len(self.criteria) if self.criteria else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_details:
            data["options"] = self.options or []
            data["criteria"] = self.criteria or []
            data["weights"] = self.weights or {}
            data["scores"] = self.scores or {}
            data["results"] = self.results or {}
            data["ranking"] = self.ranking or []
            data["ai_recommendation"] = self.ai_recommendation
        return data


# =============================================================================
# My Teams Module
# =============================================================================

class Team(Base):
    """Team for collaboration."""

    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Team settings
    settings: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Stats
    member_count: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_teams", foreign_keys=[owner_id])
    members: Mapped[list["TeamMember"]] = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    tasks: Mapped[list["TeamTask"]] = relationship("TeamTask", back_populates="team", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "name": self.name,
            "description": self.description,
            "avatar_url": self.avatar_url,
            "member_count": self.member_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TeamMember(Base):
    """Team member."""

    __tablename__ = "team_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    role: Mapped[str] = mapped_column(String(20), default="member")  # owner, admin, member
    permissions: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    team: Mapped["Team"] = relationship("Team", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="team_memberships")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "team_id": self.team_id,
            "user_id": self.user_id,
            "role": self.role,
            "permissions": self.permissions or {},
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
        }


class TeamTask(Base):
    """Team task."""

    __tablename__ = "team_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    assignee_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, in_progress, completed, cancelled
    priority: Mapped[str] = mapped_column(String(20), default="medium")  # low, medium, high, urgent

    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Tags and metadata
    tags: Mapped[Optional[dict]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team: Mapped["Team"] = relationship("Team", back_populates="tasks")
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id])
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "team_id": self.team_id,
            "assignee_id": self.assignee_id,
            "created_by_id": self.created_by_id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "tags": self.tags or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# =============================================================================
# AI Tools Module
# =============================================================================

class InstalledTool(Base):
    """Installed tool from the tool store."""

    __tablename__ = "installed_tools"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    tool_id: Mapped[str] = mapped_column(String(100), nullable=False)  # Unique tool identifier
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)
    tool_version: Mapped[str] = mapped_column(String(20), default="1.0.0")

    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # User configuration for this tool
    config: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Usage stats
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    installed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="installed_tools")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "tool_id": self.tool_id,
            "tool_name": self.tool_name,
            "tool_version": self.tool_version,
            "is_enabled": self.is_enabled,
            "config": self.config or {},
            "usage_count": self.usage_count,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "installed_at": self.installed_at.isoformat() if self.installed_at else None,
        }
