"""
Knowledge Base API endpoints.
"""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter()


# ============================================================================
# Response Models
# ============================================================================

class FileInfo(BaseModel):
    """File information."""
    
    name: str
    path: str
    type: str  # file, directory
    size: int = 0
    modified: Optional[str] = None


class DirectoryContent(BaseModel):
    """Directory content listing."""
    
    path: str
    items: list[FileInfo]


class FileContent(BaseModel):
    """File content."""
    
    path: str
    content: str
    size: int


class SearchResult(BaseModel):
    """Search result item."""
    
    path: str
    snippet: str
    score: float


class SearchResponse(BaseModel):
    """Search response."""
    
    query: str
    results: list[SearchResult]
    total: int


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=DirectoryContent)
async def browse_knowledge(
    path: str = Query("", description="Path within knowledge base"),
    session_id: Optional[str] = None,
):
    """Browse knowledge base directory."""
    settings = get_settings()
    
    if session_id:
        base_path = settings.nexen_workspace / "sessions" / session_id
    else:
        base_path = settings.nexen_workspace
    
    target_path = base_path / path if path else base_path
    
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    
    if not target_path.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    
    items = []
    for item in sorted(target_path.iterdir()):
        if item.name.startswith("."):
            continue
        
        file_info = FileInfo(
            name=item.name,
            path=str(item.relative_to(base_path)),
            type="directory" if item.is_dir() else "file",
            size=item.stat().st_size if item.is_file() else 0,
        )
        items.append(file_info)
    
    return DirectoryContent(
        path=path or "/",
        items=items,
    )


@router.get("/file", response_model=FileContent)
async def get_file(
    path: str = Query(..., description="File path"),
    session_id: Optional[str] = None,
):
    """Get file content."""
    settings = get_settings()
    
    if session_id:
        base_path = settings.nexen_workspace / "sessions" / session_id
    else:
        base_path = settings.nexen_workspace
    
    target_path = base_path / path
    
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")
    
    # Safety check: only allow reading text files
    allowed_extensions = {".md", ".txt", ".yaml", ".yml", ".json"}
    if target_path.suffix.lower() not in allowed_extensions:
        raise HTTPException(status_code=400, detail="File type not supported")
    
    try:
        content = target_path.read_text(encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {e}")
    
    return FileContent(
        path=path,
        content=content,
        size=len(content),
    )


@router.get("/search", response_model=SearchResponse)
async def search_knowledge(
    q: str = Query(..., description="Search query"),
    session_id: Optional[str] = None,
    limit: int = 10,
):
    """Search knowledge base using semantic search."""
    settings = get_settings()
    
    if session_id:
        base_path = settings.nexen_workspace / "sessions" / session_id
    else:
        base_path = settings.nexen_workspace
    
    # Simple text search (replace with vector search in production)
    results = []
    query_lower = q.lower()
    
    for file_path in base_path.rglob("*.md"):
        try:
            content = file_path.read_text(encoding="utf-8")
            if query_lower in content.lower():
                # Find snippet around match
                idx = content.lower().find(query_lower)
                start = max(0, idx - 50)
                end = min(len(content), idx + len(q) + 50)
                snippet = content[start:end]
                
                results.append(SearchResult(
                    path=str(file_path.relative_to(base_path)),
                    snippet=f"...{snippet}...",
                    score=1.0,
                ))
        except Exception:
            continue
    
    return SearchResponse(
        query=q,
        results=results[:limit],
        total=len(results),
    )


@router.get("/insights")
async def get_insights(session_id: Optional[str] = None):
    """Get all insights for a session."""
    settings = get_settings()
    
    if session_id:
        insights_path = settings.nexen_workspace / "sessions" / session_id / "insights"
    else:
        return {"insights": {}}
    
    if not insights_path.exists():
        return {"insights": {}}
    
    insights = {}
    for file_path in insights_path.glob("*.md"):
        try:
            content = file_path.read_text(encoding="utf-8")
            insights[file_path.stem] = content
        except Exception:
            continue
    
    return {"insights": insights}
