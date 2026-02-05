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
- AgentProfile, AgentExecution, ResearchTask (Multi-Agent Research)
- AgentWorkflow (Agent Workflow DAG Templates)
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
    agent_profiles: Mapped[list["AgentProfile"]] = relationship("AgentProfile", back_populates="user")
    agent_workflows: Mapped[list["AgentWorkflow"]] = relationship("AgentWorkflow", back_populates="user")

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
    deepseek_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dashscope_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 阿里云/千问
    serper_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 联网搜索

    # Preferences
    default_model: Mapped[str] = mapped_column(String(100), default="google/gemini-2.0-flash")
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
            "deepseek_api_key": mask_key(self.deepseek_api_key),
            "dashscope_api_key": mask_key(self.dashscope_api_key),
            "serper_api_key": mask_key(self.serper_api_key),
            "default_model": self.default_model,
            "theme": self.theme,
            "language": self.language,
            "has_openai": bool(self.openai_api_key),
            "has_anthropic": bool(self.anthropic_api_key),
            "has_google": bool(self.google_api_key),
            "has_deepseek": bool(self.deepseek_api_key),
            "has_dashscope": bool(self.dashscope_api_key),
            "has_serper": bool(self.serper_api_key),
        }


class APIUsageStats(Base):
    """API usage statistics for tracking costs and quotas."""

    __tablename__ = "api_usage_stats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # Provider identification
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # openai, anthropic, google, deepseek, dashscope
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)  # Date (day granularity)

    # Usage metrics
    request_count: Mapped[int] = mapped_column(Integer, default=0)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)

    # Cost estimation (in USD)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)

    # Model-level breakdown (JSON)
    model_usage: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)  # {"gpt-4o": {"requests": 5, "tokens": 1000, "cost": 0.05}}

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", backref="usage_stats")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "provider": self.provider,
            "date": self.date.isoformat() if self.date else None,
            "request_count": self.request_count,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "estimated_cost": self.estimated_cost,
            "model_usage": self.model_usage or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
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
    agent_executions: Mapped[list["AgentExecution"]] = relationship("AgentExecution", back_populates="session", cascade="all, delete-orphan")
    research_tasks: Mapped[list["ResearchTask"]] = relationship("ResearchTask", back_populates="session", cascade="all, delete-orphan")

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


# =============================================================================
# Multi-Agent Research Module
# =============================================================================

class AgentProfile(Base):
    """Agent configuration profile for multi-agent research system."""

    __tablename__ = "agent_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # Agent identification
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)  # meta_coordinator, explorer, logician, etc.
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name_cn: Mapped[str] = mapped_column(String(100), nullable=False)
    cluster: Mapped[str] = mapped_column(String(30), default="custom")  # reasoning, information, production, coordination, custom
    is_custom: Mapped[bool] = mapped_column(Boolean, default=True)  # False for default agents

    # Model configuration
    role_model: Mapped[str] = mapped_column(String(100), nullable=False)  # claude-opus-4, openai/o3, etc.
    fallback_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, default=4000)

    # Persona configuration
    persona: Mapped[str] = mapped_column(Text, default="")  # System prompt / persona description
    traits: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)  # {"risk_preference": "high", "creativity": "medium"}
    responsibilities: Mapped[Optional[dict]] = mapped_column(JSON, default=list)  # ["文献检索", "趋势分析"]

    # Pipeline configuration (Module 1/2/3)
    pipeline_config: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Data sources and skills
    data_sources: Mapped[Optional[dict]] = mapped_column(JSON, default=list)  # ["arxiv", "semantic_scholar"]
    enabled_skills: Mapped[Optional[dict]] = mapped_column(JSON, default=list)  # ["/survey", "/paper-deep-dive"]

    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="agent_profiles")
    executions: Mapped[list["AgentExecution"]] = relationship("AgentExecution", back_populates="agent_profile")

    def to_dict(self, include_config: bool = False) -> dict:
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "agent_type": self.agent_type,
            "display_name": self.display_name,
            "display_name_cn": self.display_name_cn,
            "cluster": self.cluster,
            "is_custom": self.is_custom,
            "role_model": self.role_model,
            "fallback_model": self.fallback_model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "is_enabled": self.is_enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_config:
            data["persona"] = self.persona
            data["traits"] = self.traits or {}
            data["responsibilities"] = self.responsibilities or []
            data["pipeline_config"] = self.pipeline_config or {}
            data["data_sources"] = self.data_sources or []
            data["enabled_skills"] = self.enabled_skills or []
        return data


class AgentExecution(Base):
    """Agent execution record for tracking agent activities."""

    __tablename__ = "agent_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True)
    agent_profile_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("agent_profiles.id", ondelete="SET NULL"), nullable=True)
    research_task_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("research_tasks.id", ondelete="SET NULL"), nullable=True)

    # Agent info (denormalized for historical record)
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Task
    task_description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, running, completed, failed

    # Input/Output
    input_context: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    output_result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    structured_output: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)  # key_findings, uncertainties, suggestions

    # Performance metrics
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    # Memory path
    raw_output_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # L0 storage path

    # Error handling
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["ResearchSession"] = relationship("ResearchSession", back_populates="agent_executions")
    agent_profile: Mapped[Optional["AgentProfile"]] = relationship("AgentProfile", back_populates="executions")
    research_task: Mapped[Optional["ResearchTask"]] = relationship("ResearchTask", back_populates="execution")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "agent_profile_id": self.agent_profile_id,
            "research_task_id": self.research_task_id,
            "agent_type": self.agent_type,
            "agent_name": self.agent_name,
            "task_description": self.task_description,
            "status": self.status,
            "output_result": self.output_result,
            "structured_output": self.structured_output or {},
            "tokens_used": self.tokens_used,
            "duration_ms": self.duration_ms,
            "model_used": self.model_used,
            "confidence": self.confidence,
            "error_message": self.error_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class ResearchTask(Base):
    """Research task decomposition for multi-agent coordination."""

    __tablename__ = "research_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True)
    parent_task_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("research_tasks.id", ondelete="CASCADE"), nullable=True)

    # Task details
    description: Mapped[str] = mapped_column(Text, nullable=False)
    assigned_agent: Mapped[str] = mapped_column(String(50), nullable=False)  # agent_type
    priority: Mapped[str] = mapped_column(String(20), default="medium")  # critical, high, medium, low
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, in_progress, completed, failed, blocked

    # Execution order and dependencies
    dependencies: Mapped[Optional[dict]] = mapped_column(JSON, default=list)  # [task_id, ...]
    execution_order: Mapped[int] = mapped_column(Integer, default=0)
    execution_group: Mapped[int] = mapped_column(Integer, default=0)  # For parallel execution

    # Task claiming (NEW)
    created_by: Mapped[str] = mapped_column(String(50), default="meta_coordinator")
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    claimed_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # agent_type that claimed

    # File-based data passing (NEW)
    input_files: Mapped[Optional[dict]] = mapped_column(JSON, default=list)   # Files from dependent tasks
    output_files: Mapped[Optional[dict]] = mapped_column(JSON, default=list)  # Files produced by this task

    # Execution tracking (NEW)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=300)

    # Quality assessment (NEW)
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reviewer_agent: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Output
    output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    session: Mapped["ResearchSession"] = relationship("ResearchSession", back_populates="research_tasks")
    parent_task: Mapped[Optional["ResearchTask"]] = relationship("ResearchTask", remote_side=[id], backref="subtasks")
    execution: Mapped[Optional["AgentExecution"]] = relationship("AgentExecution", back_populates="research_task", uselist=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "parent_task_id": self.parent_task_id,
            "description": self.description,
            "assigned_agent": self.assigned_agent,
            "priority": self.priority,
            "status": self.status,
            "dependencies": self.dependencies or [],
            "execution_order": self.execution_order,
            "execution_group": self.execution_group,
            "created_by": self.created_by,
            "claimed_at": self.claimed_at.isoformat() if self.claimed_at else None,
            "claimed_by": self.claimed_by,
            "input_files": self.input_files or [],
            "output_files": self.output_files or [],
            "retry_count": self.retry_count,
            "quality_score": self.quality_score,
            "output": self.output,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TaskPlan(Base):
    """Task plan created by Meta-Coordinator for research sessions."""

    __tablename__ = "task_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True)

    version: Mapped[int] = mapped_column(Integer, default=1)
    original_task: Mapped[str] = mapped_column(Text, nullable=False)

    # Plan structure (JSON)
    plan_data: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    # Contains: subtasks, execution_order, estimated_time, agent_assignments

    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, active, completed, revised

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    session: Mapped["ResearchSession"] = relationship("ResearchSession", backref="task_plans")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "version": self.version,
            "original_task": self.original_task,
            "plan_data": self.plan_data or {},
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "activated_at": self.activated_at.isoformat() if self.activated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class AgentOutput(Base):
    """Agent output file reference for file-based data passing."""

    __tablename__ = "agent_outputs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True)
    execution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("agent_executions.id", ondelete="SET NULL"), nullable=True)
    task_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("research_tasks.id", ondelete="SET NULL"), nullable=True)

    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    output_type: Mapped[str] = mapped_column(String(30), default="markdown")  # markdown, json, yaml
    file_path: Mapped[str] = mapped_column(Text, nullable=False)  # Relative path within workspace
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # SHA256

    # Content summary for quick retrieval
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_findings: Mapped[Optional[dict]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["ResearchSession"] = relationship("ResearchSession", backref="agent_outputs")
    execution: Mapped[Optional["AgentExecution"]] = relationship("AgentExecution", backref="outputs")
    task: Mapped[Optional["ResearchTask"]] = relationship("ResearchTask", backref="outputs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "execution_id": self.execution_id,
            "task_id": self.task_id,
            "agent_type": self.agent_type,
            "output_type": self.output_type,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "summary": self.summary,
            "key_findings": self.key_findings or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# Agent Workflow Module
# =============================================================================

class AgentWorkflow(Base):
    """Agent workflow template for DAG-based multi-agent orchestration."""

    __tablename__ = "agent_workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    # user_id is nullable - null means system template

    # Basic info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_cn: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="Workflow")

    # Template metadata
    is_template: Mapped[bool] = mapped_column(Boolean, default=False)  # True = system template
    template_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # research, analysis, writing

    # DAG configuration (JSON)
    nodes: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)
    # Structure: [{"id": "node_1", "agentType": "explorer", "position": {"x": 100, "y": 200}, "config": {...}}]

    edges: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)
    # Structure: [{"id": "edge_1", "sourceNodeId": "node_1", "targetNodeId": "node_2", "edgeType": "data_flow", "config": {...}}]

    # Default settings
    default_settings: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    # Contains: max_concurrent_agents, timeout_per_task, storage_config, etc.

    # Status and versioning
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, active, archived
    version: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="agent_workflows")

    # Relationships
    missions: Mapped[list["WorkflowMission"]] = relationship("WorkflowMission", back_populates="workflow", cascade="all, delete-orphan")

    def to_dict(self, include_dag: bool = True) -> dict:
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "name_cn": self.name_cn,
            "description": self.description,
            "icon": self.icon,
            "is_template": self.is_template,
            "template_category": self.template_category,
            "status": self.status,
            "version": self.version,
            "node_count": len(self.nodes) if self.nodes else 0,
            "edge_count": len(self.edges) if self.edges else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_dag:
            data["nodes"] = self.nodes or []
            data["edges"] = self.edges or []
            data["default_settings"] = self.default_settings or {}
        return data


# =============================================================================
# Workflow Mission Module
# =============================================================================

class WorkflowMission(Base):
    """Workflow mission execution record."""

    __tablename__ = "workflow_missions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("agent_workflows.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # Mission info
    leader_type: Mapped[str] = mapped_column(String(50), nullable=False)
    leader_name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, running, completed, cancelled, failed

    # Progress
    progress_current: Mapped[int] = mapped_column(Integer, default=0)
    progress_total: Mapped[int] = mapped_column(Integer, default=0)

    # Sub-tasks stored as JSON array
    sub_tasks: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    # Structure: [{id, title, agent_type, agent_name, status, input, output, started_at, completed_at, duration_ms}]

    # Final result
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Notification
    notification_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    workflow: Mapped["AgentWorkflow"] = relationship("AgentWorkflow", back_populates="missions")
    user: Mapped["User"] = relationship("User", backref="workflow_missions")

    def to_dict(self, include_sub_tasks: bool = True) -> dict:
        data = {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "user_id": self.user_id,
            "leader_type": self.leader_type,
            "leader_name": self.leader_name,
            "description": self.description,
            "status": self.status,
            "progress": {
                "current": self.progress_current,
                "total": self.progress_total,
            },
            "result": self.result,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
        if include_sub_tasks:
            data["sub_tasks"] = self.sub_tasks or []
        return data
