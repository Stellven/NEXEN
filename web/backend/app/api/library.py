"""
Library API endpoints for document and folder management.
"""

import logging
import os
import shutil
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models import User, UserSettings, Document, DocumentChunk, Folder
from app.auth.deps import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Upload directory - use environment variable or default to local path
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Supported file types
SUPPORTED_FILE_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/markdown": "md",
    "text/plain": "txt",
}

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}


# =============================================================================
# Request/Response Models
# =============================================================================

class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    parent_id: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    parent_id: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class FolderResponse(BaseModel):
    id: str
    name: str
    parent_id: Optional[str]
    description: Optional[str]
    color: Optional[str]
    document_count: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class FolderTreeResponse(BaseModel):
    id: str
    name: str
    parent_id: Optional[str]
    description: Optional[str]
    color: Optional[str]
    document_count: int
    children: List["FolderTreeResponse"] = []

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: str
    name: str
    file_type: str
    file_size: int
    folder_id: Optional[str]
    source_url: Optional[str]
    parse_status: str
    embedding_status: str
    chunk_count: int
    tags: List[str]
    metadata: dict
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
    page: int
    page_size: int


class DocumentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    tags: Optional[List[str]] = None


class DocumentMoveRequest(BaseModel):
    folder_id: Optional[str] = None


class ImportUrlRequest(BaseModel):
    url: str = Field(..., min_length=1)
    folder_id: Optional[str] = None
    tags: Optional[List[str]] = None


class DocumentStatusResponse(BaseModel):
    parse_status: str
    embedding_status: str
    parse_error: Optional[str]
    chunk_count: int


class TagItem(BaseModel):
    name: str
    count: int


class TagsResponse(BaseModel):
    tags: List[TagItem]


# =============================================================================
# Helper Functions
# =============================================================================

def get_file_extension(filename: str) -> str:
    """Get file extension from filename."""
    return os.path.splitext(filename)[1].lower()


def build_folder_tree(folders: List[Folder], parent_id: Optional[str] = None) -> List[dict]:
    """Build a tree structure from flat folder list."""
    tree = []
    for folder in folders:
        if folder.parent_id == parent_id:
            children = build_folder_tree(folders, folder.id)
            doc_count = len(folder.documents) if folder.documents else 0
            tree.append({
                "id": folder.id,
                "name": folder.name,
                "parent_id": folder.parent_id,
                "description": folder.description,
                "color": folder.color,
                "document_count": doc_count,
                "children": children,
            })
    return tree


async def process_document(document_id: str, db: Session):
    """Background task to parse and embed document."""
    from app.services.parsing_service import ParsingService
    from app.api.explore import EmbeddingService, VectorService
    from app.config import get_settings

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        logger.error(f"Document not found: {document_id}")
        return

    # Get user settings for API key
    settings = db.query(UserSettings).filter(UserSettings.user_id == document.user_id).first()
    if not settings or not settings.openai_api_key:
        document.parse_status = "failed"
        document.parse_error = "OpenAI API Key not configured"
        db.commit()
        return

    # Parse document
    try:
        document.parse_status = "parsing"
        db.commit()

        parsing_service = ParsingService()

        if document.source_url:
            content = await parsing_service.parse_url(document.source_url)
        else:
            content = await parsing_service.parse_file(document.file_path, document.file_type)

        document.parsed_content = content
        document.parse_status = "completed"
        db.commit()

    except Exception as e:
        logger.error(f"Parse error for document {document_id}: {e}")
        document.parse_status = "failed"
        document.parse_error = str(e)
        db.commit()
        return

    # Embed document
    try:
        document.embedding_status = "processing"
        db.commit()

        app_settings = get_settings()
        qdrant_url = getattr(app_settings, 'qdrant_url', 'http://localhost:6333')

        embedding_service = EmbeddingService(settings.openai_api_key)
        vector_service = VectorService(url=qdrant_url)
        vector_service.ensure_collection()

        # Chunk the content
        chunks = chunk_text(content)

        # Delete old chunks
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()

        # Process each chunk
        from qdrant_client.models import PointStruct
        points = []

        for i, chunk_content in enumerate(chunks):
            chunk_id = str(uuid4())

            # Get embedding
            embedding = embedding_service.get_embedding(chunk_content)

            # Create chunk record
            chunk = DocumentChunk(
                id=chunk_id,
                document_id=document_id,
                chunk_index=i,
                content=chunk_content,
                token_count=len(chunk_content.split()),
                embedding_id=chunk_id,
            )
            db.add(chunk)

            # Prepare point for Qdrant
            points.append(PointStruct(
                id=chunk_id,
                vector=embedding,
                payload={
                    "user_id": document.user_id,
                    "document_id": document_id,
                    "chunk_id": chunk_id,
                    "title": document.name,
                    "content": chunk_content,
                    "source": "url" if document.source_url else "library",
                    "tags": document.tags or [],
                    "created_at": document.created_at.isoformat() if document.created_at else "",
                }
            ))

        # Upsert to Qdrant
        if points:
            vector_service.client.upsert(
                collection_name=vector_service.collection_name,
                points=points
            )

        document.chunk_count = len(chunks)
        document.embedding_status = "completed"
        db.commit()

        logger.info(f"Document {document_id} processed: {len(chunks)} chunks")

    except Exception as e:
        logger.error(f"Embedding error for document {document_id}: {e}")
        document.embedding_status = "failed"
        document.parse_error = f"Embedding failed: {str(e)}"
        db.commit()


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into chunks with overlap."""
    if not text:
        return []

    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


# =============================================================================
# Folder Endpoints
# =============================================================================

@router.get("/folders", response_model=List[FolderTreeResponse])
async def list_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all folders as a tree structure."""
    folders = (
        db.query(Folder)
        .filter(Folder.user_id == current_user.id)
        .all()
    )

    tree = build_folder_tree(folders)
    return tree


@router.post("/folders", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    request: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new folder."""
    # Validate parent folder
    if request.parent_id:
        parent = db.query(Folder).filter(
            Folder.id == request.parent_id,
            Folder.user_id == current_user.id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")

    folder = Folder(
        id=str(uuid4()),
        user_id=current_user.id,
        parent_id=request.parent_id,
        name=request.name,
        description=request.description,
        color=request.color,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)

    return FolderResponse(
        id=folder.id,
        name=folder.name,
        parent_id=folder.parent_id,
        description=folder.description,
        color=folder.color,
        document_count=0,
        created_at=folder.created_at.isoformat() if folder.created_at else "",
        updated_at=folder.updated_at.isoformat() if folder.updated_at else "",
    )


@router.put("/folders/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: str,
    request: FolderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a folder."""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Validate parent folder
    if request.parent_id is not None:
        if request.parent_id == folder_id:
            raise HTTPException(status_code=400, detail="Folder cannot be its own parent")
        if request.parent_id:
            parent = db.query(Folder).filter(
                Folder.id == request.parent_id,
                Folder.user_id == current_user.id
            ).first()
            if not parent:
                raise HTTPException(status_code=404, detail="Parent folder not found")

    # Update fields
    if request.name is not None:
        folder.name = request.name
    if request.parent_id is not None:
        folder.parent_id = request.parent_id if request.parent_id else None
    if request.description is not None:
        folder.description = request.description
    if request.color is not None:
        folder.color = request.color

    db.commit()
    db.refresh(folder)

    doc_count = db.query(Document).filter(Document.folder_id == folder_id).count()

    return FolderResponse(
        id=folder.id,
        name=folder.name,
        parent_id=folder.parent_id,
        description=folder.description,
        color=folder.color,
        document_count=doc_count,
        created_at=folder.created_at.isoformat() if folder.created_at else "",
        updated_at=folder.updated_at.isoformat() if folder.updated_at else "",
    )


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a folder and move its documents to root."""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Move documents to root
    db.query(Document).filter(Document.folder_id == folder_id).update({"folder_id": None})

    # Move child folders to parent
    db.query(Folder).filter(Folder.parent_id == folder_id).update({"parent_id": folder.parent_id})

    db.delete(folder)
    db.commit()


# =============================================================================
# Document Endpoints
# =============================================================================

@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    folder_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    tags: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List documents with optional filtering."""
    query = db.query(Document).filter(Document.user_id == current_user.id)

    if folder_id:
        query = query.filter(Document.folder_id == folder_id)

    if search:
        query = query.filter(Document.name.ilike(f"%{search}%"))

    # Total count
    total = query.count()

    # Pagination
    offset = (page - 1) * page_size
    documents = query.order_by(Document.updated_at.desc()).offset(offset).limit(page_size).all()

    return DocumentListResponse(
        documents=[
            DocumentResponse(
                id=doc.id,
                name=doc.name,
                file_type=doc.file_type,
                file_size=doc.file_size,
                folder_id=doc.folder_id,
                source_url=doc.source_url,
                parse_status=doc.parse_status,
                embedding_status=doc.embedding_status,
                chunk_count=doc.chunk_count,
                tags=doc.tags or [],
                metadata=doc.doc_metadata or {},
                created_at=doc.created_at.isoformat() if doc.created_at else "",
                updated_at=doc.updated_at.isoformat() if doc.updated_at else "",
            )
            for doc in documents
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a document file."""
    # Validate file extension
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate folder
    if folder_id:
        folder = db.query(Folder).filter(
            Folder.id == folder_id,
            Folder.user_id == current_user.id
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

    # Save file
    file_id = str(uuid4())
    file_path = os.path.join(UPLOAD_DIR, current_user.id, f"{file_id}{ext}")
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get file size
    file_size = os.path.getsize(file_path)

    # Parse tags
    tag_list = []
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    # Create document record
    document = Document(
        id=file_id,
        user_id=current_user.id,
        folder_id=folder_id,
        name=file.filename,
        file_type=ext[1:],  # Remove leading dot
        file_path=file_path,
        file_size=file_size,
        tags=tag_list,
        parse_status="pending",
        embedding_status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Queue background processing
    background_tasks.add_task(process_document, document.id, db)

    return DocumentResponse(
        id=document.id,
        name=document.name,
        file_type=document.file_type,
        file_size=document.file_size,
        folder_id=document.folder_id,
        source_url=document.source_url,
        parse_status=document.parse_status,
        embedding_status=document.embedding_status,
        chunk_count=document.chunk_count,
        tags=document.tags or [],
        metadata=document.doc_metadata or {},
        created_at=document.created_at.isoformat() if document.created_at else "",
        updated_at=document.updated_at.isoformat() if document.updated_at else "",
    )


@router.post("/documents/import-url", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def import_url(
    request: ImportUrlRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Import a document from URL."""
    # Validate folder
    if request.folder_id:
        folder = db.query(Folder).filter(
            Folder.id == request.folder_id,
            Folder.user_id == current_user.id
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

    # Extract title from URL
    from urllib.parse import urlparse
    parsed_url = urlparse(request.url)
    name = parsed_url.netloc + parsed_url.path[:50] if len(parsed_url.path) > 50 else parsed_url.netloc + parsed_url.path

    # Create document record
    document = Document(
        id=str(uuid4()),
        user_id=current_user.id,
        folder_id=request.folder_id,
        name=name or request.url[:100],
        file_type="url",
        source_url=request.url,
        file_size=0,
        tags=request.tags or [],
        parse_status="pending",
        embedding_status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Queue background processing
    background_tasks.add_task(process_document, document.id, db)

    return DocumentResponse(
        id=document.id,
        name=document.name,
        file_type=document.file_type,
        file_size=document.file_size,
        folder_id=document.folder_id,
        source_url=document.source_url,
        parse_status=document.parse_status,
        embedding_status=document.embedding_status,
        chunk_count=document.chunk_count,
        tags=document.tags or [],
        metadata=document.doc_metadata or {},
        created_at=document.created_at.isoformat() if document.created_at else "",
        updated_at=document.updated_at.isoformat() if document.updated_at else "",
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get document details."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse(
        id=document.id,
        name=document.name,
        file_type=document.file_type,
        file_size=document.file_size,
        folder_id=document.folder_id,
        source_url=document.source_url,
        parse_status=document.parse_status,
        embedding_status=document.embedding_status,
        chunk_count=document.chunk_count,
        tags=document.tags or [],
        metadata=document.doc_metadata or {},
        created_at=document.created_at.isoformat() if document.created_at else "",
        updated_at=document.updated_at.isoformat() if document.updated_at else "",
    )


@router.put("/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    request: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update document name or tags."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if request.name is not None:
        document.name = request.name
    if request.tags is not None:
        document.tags = request.tags

    db.commit()
    db.refresh(document)

    return DocumentResponse(
        id=document.id,
        name=document.name,
        file_type=document.file_type,
        file_size=document.file_size,
        folder_id=document.folder_id,
        source_url=document.source_url,
        parse_status=document.parse_status,
        embedding_status=document.embedding_status,
        chunk_count=document.chunk_count,
        tags=document.tags or [],
        metadata=document.doc_metadata or {},
        created_at=document.created_at.isoformat() if document.created_at else "",
        updated_at=document.updated_at.isoformat() if document.updated_at else "",
    )


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from Qdrant
    try:
        from app.api.explore import VectorService
        from app.config import get_settings

        app_settings = get_settings()
        qdrant_url = getattr(app_settings, 'qdrant_url', 'http://localhost:6333')
        vector_service = VectorService(url=qdrant_url)

        # Get chunk IDs
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
        chunk_ids = [chunk.embedding_id for chunk in chunks if chunk.embedding_id]

        if chunk_ids:
            vector_service.client.delete(
                collection_name=vector_service.collection_name,
                points_selector=chunk_ids
            )
    except Exception as e:
        logger.warning(f"Failed to delete vectors: {e}")

    # Delete file
    if document.file_path and os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except Exception as e:
            logger.warning(f"Failed to delete file: {e}")

    # Delete document (cascades to chunks)
    db.delete(document)
    db.commit()


@router.post("/documents/{document_id}/move", response_model=DocumentResponse)
async def move_document(
    document_id: str,
    request: DocumentMoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Move document to another folder."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Validate target folder
    if request.folder_id:
        folder = db.query(Folder).filter(
            Folder.id == request.folder_id,
            Folder.user_id == current_user.id
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Target folder not found")

    document.folder_id = request.folder_id
    db.commit()
    db.refresh(document)

    return DocumentResponse(
        id=document.id,
        name=document.name,
        file_type=document.file_type,
        file_size=document.file_size,
        folder_id=document.folder_id,
        source_url=document.source_url,
        parse_status=document.parse_status,
        embedding_status=document.embedding_status,
        chunk_count=document.chunk_count,
        tags=document.tags or [],
        metadata=document.doc_metadata or {},
        created_at=document.created_at.isoformat() if document.created_at else "",
        updated_at=document.updated_at.isoformat() if document.updated_at else "",
    )


@router.get("/documents/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get document processing status."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentStatusResponse(
        parse_status=document.parse_status,
        embedding_status=document.embedding_status,
        parse_error=document.parse_error,
        chunk_count=document.chunk_count,
    )


@router.get("/documents/{document_id}/content")
async def get_document_content(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get parsed document content."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": document.id,
        "name": document.name,
        "content": document.parsed_content or "",
        "parse_status": document.parse_status,
    }


# =============================================================================
# Tags Endpoint
# =============================================================================

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
