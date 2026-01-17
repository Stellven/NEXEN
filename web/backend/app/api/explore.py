"""
Explore API endpoints for semantic search functionality.
"""

import logging
import time
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models import User, UserSettings, Document, DocumentChunk, SearchHistory
from app.auth.deps import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Request/Response Models
# =============================================================================

class SearchFilters(BaseModel):
    source: Optional[List[str]] = None  # ["library", "url"]
    tags: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    filters: Optional[SearchFilters] = None


class SearchResultItem(BaseModel):
    id: str
    document_id: str
    title: str
    snippet: str
    score: float
    source: str
    tags: List[str]
    created_at: str

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    results: List[SearchResultItem]
    total: int
    query_time_ms: int


class SearchHistoryItem(BaseModel):
    id: str
    query: str
    results_count: int
    created_at: str


class SearchHistoryResponse(BaseModel):
    history: List[SearchHistoryItem]


class TagItem(BaseModel):
    name: str
    count: int


class TagsResponse(BaseModel):
    tags: List[TagItem]


class DocumentPreviewResponse(BaseModel):
    id: str
    title: str
    content: str
    source: str
    file_type: str
    tags: List[str]
    created_at: str
    chunks_count: int


# =============================================================================
# Embedding Service
# =============================================================================

class EmbeddingService:
    """Service for generating text embeddings using OpenAI."""

    def __init__(self, api_key: str):
        import openai
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "text-embedding-3-small"

    def get_embedding(self, text: str) -> List[float]:
        """Generate embedding for text."""
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text[:8000]  # Limit text length
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


# =============================================================================
# Vector Service (Qdrant)
# =============================================================================

class VectorService:
    """Service for vector search using Qdrant."""

    def __init__(self, url: str = "http://localhost:6333"):
        from qdrant_client import QdrantClient
        self.client = QdrantClient(url=url)
        self.collection_name = "documents"

    def ensure_collection(self):
        """Ensure the collection exists."""
        from qdrant_client.models import Distance, VectorParams

        collections = self.client.get_collections().collections
        if not any(c.name == self.collection_name for c in collections):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=1536,  # text-embedding-3-small dimension
                    distance=Distance.COSINE
                )
            )
            logger.info(f"Created collection: {self.collection_name}")

    def search(
        self,
        query_vector: List[float],
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[SearchFilters] = None
    ) -> List[dict]:
        """Search for similar documents."""
        from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny

        # Build filter conditions
        must_conditions = [
            FieldCondition(key="user_id", match=MatchValue(value=user_id))
        ]

        if filters:
            if filters.source:
                must_conditions.append(
                    FieldCondition(key="source", match=MatchAny(any=filters.source))
                )
            if filters.tags:
                for tag in filters.tags:
                    must_conditions.append(
                        FieldCondition(key="tags", match=MatchValue(value=tag))
                    )

        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=Filter(must=must_conditions) if must_conditions else None,
                limit=limit,
                offset=offset,
                with_payload=True
            )

            return [
                {
                    "id": str(r.id),
                    "score": r.score,
                    "payload": r.payload
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Vector search error: {e}")
            # Return empty if collection doesn't exist yet
            if "not found" in str(e).lower():
                return []
            raise


# =============================================================================
# API Endpoints
# =============================================================================

@router.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Perform semantic search across user's documents.

    Requires OpenAI API key for embedding generation.
    """
    start_time = time.time()

    # Get user's OpenAI API key
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings or not settings.openai_api_key:
        raise HTTPException(
            status_code=400,
            detail="请先在设置中配置 OpenAI API Key"
        )

    # Generate query embedding
    embedding_service = EmbeddingService(settings.openai_api_key)
    query_vector = embedding_service.get_embedding(request.query)

    # Search in vector database
    from app.config import get_settings
    app_settings = get_settings()
    qdrant_url = getattr(app_settings, 'qdrant_url', 'http://localhost:6333')

    vector_service = VectorService(url=qdrant_url)
    vector_service.ensure_collection()

    vector_results = vector_service.search(
        query_vector=query_vector,
        user_id=current_user.id,
        limit=request.limit,
        offset=request.offset,
        filters=request.filters
    )

    # Format results
    results = []
    for vr in vector_results:
        payload = vr.get("payload", {})
        results.append(SearchResultItem(
            id=vr["id"],
            document_id=payload.get("document_id", ""),
            title=payload.get("title", "未知文档"),
            snippet=payload.get("content", "")[:300] + "..." if len(payload.get("content", "")) > 300 else payload.get("content", ""),
            score=round(vr["score"], 4),
            source=payload.get("source", "library"),
            tags=payload.get("tags", []),
            created_at=payload.get("created_at", "")
        ))

    # Record search history
    history = SearchHistory(
        id=str(uuid4()),
        user_id=current_user.id,
        query=request.query,
        results_count=len(results),
        filters=request.filters.dict() if request.filters else None
    )
    db.add(history)
    db.commit()

    query_time_ms = int((time.time() - start_time) * 1000)

    return SearchResponse(
        results=results,
        total=len(results),
        query_time_ms=query_time_ms
    )


@router.get("/history", response_model=SearchHistoryResponse)
async def get_search_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get user's search history."""
    history = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(limit)
        .all()
    )

    return SearchHistoryResponse(
        history=[
            SearchHistoryItem(
                id=h.id,
                query=h.query,
                results_count=h.results_count,
                created_at=h.created_at.isoformat() if h.created_at else ""
            )
            for h in history
        ]
    )


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_search_history(
    history_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a search history entry."""
    history = (
        db.query(SearchHistory)
        .filter(
            SearchHistory.id == history_id,
            SearchHistory.user_id == current_user.id
        )
        .first()
    )

    if not history:
        raise HTTPException(status_code=404, detail="History not found")

    db.delete(history)
    db.commit()


@router.get("/tags", response_model=TagsResponse)
async def get_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all unique tags from user's documents."""
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .all()
    )

    # Aggregate tags
    tag_counts = {}
    for doc in documents:
        if doc.tags:
            for tag in doc.tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    # Sort by count
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)

    return TagsResponse(
        tags=[TagItem(name=name, count=count) for name, count in sorted_tags]
    )


@router.get("/preview/{document_id}", response_model=DocumentPreviewResponse)
async def preview_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get document preview."""
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get chunks count
    chunks_count = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .count()
    )

    # Determine source
    source = "url" if document.source_url else "library"

    return DocumentPreviewResponse(
        id=document.id,
        title=document.name,
        content=document.parsed_content or "",
        source=source,
        file_type=document.file_type,
        tags=document.tags or [],
        created_at=document.created_at.isoformat() if document.created_at else "",
        chunks_count=chunks_count
    )
