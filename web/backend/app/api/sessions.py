"""
Sessions API endpoints.
"""

import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class SessionCreate(BaseModel):
    """Create a new session."""
    
    topic: str = Field(..., description="Research topic")


class SessionUpdate(BaseModel):
    """Update a session."""
    
    topic: Optional[str] = None
    status: Optional[str] = None


class SessionInfo(BaseModel):
    """Session information."""
    
    id: str
    topic: str
    status: str  # active, completed, archived
    created_at: datetime
    updated_at: datetime
    agent_calls: int = 0
    total_tokens: int = 0


class SessionList(BaseModel):
    """List of sessions."""
    
    sessions: list[SessionInfo]
    total: int


# ============================================================================
# In-memory session storage (replace with database in production)
# ============================================================================

_sessions: dict[str, dict] = {}


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=SessionList)
async def list_sessions(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
):
    """List all research sessions."""
    sessions = list(_sessions.values())
    
    if status:
        sessions = [s for s in sessions if s["status"] == status]
    
    # Sort by created_at descending
    sessions.sort(key=lambda x: x["created_at"], reverse=True)
    
    total = len(sessions)
    sessions = sessions[offset : offset + limit]
    
    return SessionList(
        sessions=[SessionInfo(**s) for s in sessions],
        total=total,
    )


@router.post("", response_model=SessionInfo)
async def create_session(request: SessionCreate):
    """Create a new research session."""
    settings = get_settings()
    session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    # Create session directory
    session_path = settings.nexen_workspace / "sessions" / session_id
    session_path.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    (session_path / "raw").mkdir(exist_ok=True)
    (session_path / "digest" / "by_agent").mkdir(parents=True, exist_ok=True)
    (session_path / "digest" / "by_topic").mkdir(exist_ok=True)
    (session_path / "insights").mkdir(exist_ok=True)
    
    session_data = {
        "id": session_id,
        "topic": request.topic,
        "status": "active",
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "agent_calls": 0,
        "total_tokens": 0,
    }
    
    _sessions[session_id] = session_data
    
    return SessionInfo(**session_data)


@router.get("/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    """Get session details."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionInfo(**_sessions[session_id])


@router.put("/{session_id}", response_model=SessionInfo)
async def update_session(session_id: str, request: SessionUpdate):
    """Update a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = _sessions[session_id]
    
    if request.topic is not None:
        session["topic"] = request.topic
    if request.status is not None:
        session["status"] = request.status
    
    session["updated_at"] = datetime.now()
    
    return SessionInfo(**session)


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    del _sessions[session_id]
    
    return {"message": "Session deleted"}


@router.post("/{session_id}/archive")
async def archive_session(session_id: str):
    """Archive a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    _sessions[session_id]["status"] = "archived"
    _sessions[session_id]["updated_at"] = datetime.now()
    
    return {"message": "Session archived"}
