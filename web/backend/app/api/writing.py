"""
Writing API endpoints for AI Writing functionality.
"""

import json
import logging
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, WritingProject, UserSettings, Document, Folder
from app.auth.deps import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Writing Templates
# =============================================================================

WRITING_TEMPLATES = [
    {
        "id": "weekly_report",
        "name": "Weekly Report",
        "name_cn": "周报",
        "description": "Weekly work summary template",
        "icon": "calendar",
        "initial_content": """# 周报

## 本周工作总结

### 完成事项
-

### 进行中
-

### 下周计划
-

### 遇到的问题
-
""",
    },
    {
        "id": "tech_doc",
        "name": "Technical Document",
        "name_cn": "技术文档",
        "description": "Technical documentation template",
        "icon": "code",
        "initial_content": """# 技术文档

## 概述

## 架构设计

## 实现细节

## API 说明

## 部署说明
""",
    },
    {
        "id": "prd",
        "name": "Product Requirements",
        "name_cn": "产品需求",
        "description": "Product requirements document template",
        "icon": "file-text",
        "initial_content": """# 产品需求文档

## 背景

## 目标

## 功能需求

### 功能一

### 功能二

## 非功能需求

## 里程碑
""",
    },
    {
        "id": "meeting_notes",
        "name": "Meeting Notes",
        "name_cn": "会议纪要",
        "description": "Meeting notes template",
        "icon": "users",
        "initial_content": """# 会议纪要

**日期**：
**参与人**：
**主持人**：

## 会议议题

## 讨论内容

## 决议事项

## 待办事项

| 事项 | 负责人 | 截止日期 |
|------|--------|----------|
|      |        |          |
""",
    },
    {
        "id": "article",
        "name": "Article",
        "name_cn": "文章",
        "description": "General article template",
        "icon": "file-text",
        "initial_content": """# 标题

## 引言

## 正文

## 总结
""",
    },
    {
        "id": "email",
        "name": "Email",
        "name_cn": "邮件",
        "description": "Email template",
        "icon": "mail",
        "initial_content": """**收件人**：
**主题**：

---

您好，



此致
敬礼
""",
    },
]


# =============================================================================
# Request/Response Models
# =============================================================================

class WritingProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    template_type: Optional[str] = None
    content: str = ""
    content_html: str = ""


class WritingProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    content_html: Optional[str] = None
    status: Optional[str] = None


class WritingProjectResponse(BaseModel):
    id: str
    title: str
    template_type: Optional[str]
    content: str
    content_html: str
    word_count: int
    character_count: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WritingProjectListResponse(BaseModel):
    projects: List[WritingProjectResponse]
    total: int
    page: int
    page_size: int


class TemplateResponse(BaseModel):
    id: str
    name: str
    name_cn: str
    description: str
    initial_content: str
    icon: str


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]


class AIWritingRequest(BaseModel):
    action: str = Field(..., pattern="^(continue|rewrite|translate|polish)$")
    selected_text: Optional[str] = None
    cursor_position: Optional[int] = None
    context_before: Optional[str] = None
    context_after: Optional[str] = None
    target_language: Optional[str] = None
    model: str = "openai/gpt-4o"


class SaveToLibraryRequest(BaseModel):
    folder_id: Optional[str] = None
    tags: Optional[List[str]] = None


# =============================================================================
# Helper Functions
# =============================================================================

def count_words(text: str) -> int:
    """Count words in text (handles both Chinese and English)."""
    if not text:
        return 0
    # Simple word count - split by whitespace for English, count chars for Chinese
    import re
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    english_words = len(re.findall(r'\b[a-zA-Z]+\b', text))
    return chinese_chars + english_words


def count_characters(text: str) -> int:
    """Count characters in text (excluding whitespace)."""
    if not text:
        return 0
    import re
    return len(re.sub(r'\s', '', text))


def build_writing_prompt(action: str, **kwargs) -> tuple:
    """Build system and user prompts for AI writing actions."""

    selected_text = kwargs.get('selected_text', '')
    context_before = kwargs.get('context_before', '')
    context_after = kwargs.get('context_after', '')
    target_language = kwargs.get('target_language', '英语')

    prompts = {
        "continue": {
            "system": "你是一位专业的写作助手。请根据给定的上下文，自然地续写内容。保持原文的风格、语气和主题。直接输出续写内容，不要添加任何解释或说明。",
            "user": f"请续写以下内容：\n\n{context_before}\n\n请从这里继续写下去，保持连贯性和一致性。"
        },
        "rewrite": {
            "system": "你是一位专业的写作助手。请改写给定的文本，使其更加清晰、流畅，同时保持原意。直接输出改写后的内容，不要添加任何解释或说明。",
            "user": f"请改写以下文本：\n\n{selected_text}\n\n上下文参考：\n前文：{context_before[-200:] if context_before else '（无）'}\n后文：{context_after[:200] if context_after else '（无）'}"
        },
        "translate": {
            "system": f"你是一位专业的翻译。请将文本翻译成{target_language}，保持原文的风格和意思。直接输出翻译结果，不要添加任何解释或说明。",
            "user": f"请翻译以下文本：\n\n{selected_text}"
        },
        "polish": {
            "system": "你是一位专业的编辑。请润色给定的文本，提升文字质量，使其更加优雅、专业，同时保持原意。直接输出润色后的内容，不要添加任何解释或说明。",
            "user": f"请润色以下文本：\n\n{selected_text}\n\n上下文参考：\n前文：{context_before[-200:] if context_before else '（无）'}\n后文：{context_after[:200] if context_after else '（无）'}"
        }
    }

    prompt_config = prompts.get(action, prompts["polish"])
    return prompt_config["system"], prompt_config["user"]


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/templates", response_model=TemplateListResponse)
async def get_templates():
    """Get all available writing templates."""
    return TemplateListResponse(
        templates=[
            TemplateResponse(**template) for template in WRITING_TEMPLATES
        ]
    )


@router.get("/projects", response_model=WritingProjectListResponse)
async def list_projects(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all writing projects for the current user."""
    query = (
        db.query(WritingProject)
        .filter(WritingProject.user_id == current_user.id)
    )

    if status:
        query = query.filter(WritingProject.status == status)

    query = query.order_by(WritingProject.updated_at.desc())

    total = query.count()
    projects = query.offset((page - 1) * page_size).limit(page_size).all()

    return WritingProjectListResponse(
        projects=[
            WritingProjectResponse(
                id=p.id,
                title=p.title,
                template_type=p.template_type,
                content=p.content or "",
                content_html=p.content_html or "",
                word_count=p.word_count or 0,
                character_count=p.character_count or 0,
                status=p.status or "draft",
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in projects
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/projects", response_model=WritingProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    request: WritingProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new writing project."""
    # Get template content if template_type is provided
    content = request.content
    if request.template_type and not content:
        template = next(
            (t for t in WRITING_TEMPLATES if t["id"] == request.template_type),
            None
        )
        if template:
            content = template["initial_content"]

    project = WritingProject(
        id=str(uuid4()),
        user_id=current_user.id,
        title=request.title,
        template_type=request.template_type,
        content=content,
        content_html=request.content_html or f"<p>{content}</p>" if content else "",
        word_count=count_words(content),
        character_count=count_characters(content),
        status="draft",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return WritingProjectResponse(
        id=project.id,
        title=project.title,
        template_type=project.template_type,
        content=project.content or "",
        content_html=project.content_html or "",
        word_count=project.word_count or 0,
        character_count=project.character_count or 0,
        status=project.status or "draft",
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("/projects/{project_id}", response_model=WritingProjectResponse)
async def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a writing project by ID."""
    project = (
        db.query(WritingProject)
        .filter(
            WritingProject.id == project_id,
            WritingProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return WritingProjectResponse(
        id=project.id,
        title=project.title,
        template_type=project.template_type,
        content=project.content or "",
        content_html=project.content_html or "",
        word_count=project.word_count or 0,
        character_count=project.character_count or 0,
        status=project.status or "draft",
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.put("/projects/{project_id}", response_model=WritingProjectResponse)
async def update_project(
    project_id: str,
    request: WritingProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a writing project (used for auto-save)."""
    project = (
        db.query(WritingProject)
        .filter(
            WritingProject.id == project_id,
            WritingProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if request.title is not None:
        project.title = request.title
    if request.content is not None:
        project.content = request.content
        project.word_count = count_words(request.content)
        project.character_count = count_characters(request.content)
    if request.content_html is not None:
        project.content_html = request.content_html
    if request.status is not None:
        project.status = request.status

    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)

    return WritingProjectResponse(
        id=project.id,
        title=project.title,
        template_type=project.template_type,
        content=project.content or "",
        content_html=project.content_html or "",
        word_count=project.word_count or 0,
        character_count=project.character_count or 0,
        status=project.status or "draft",
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a writing project."""
    project = (
        db.query(WritingProject)
        .filter(
            WritingProject.id == project_id,
            WritingProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()


@router.post("/projects/{project_id}/ai")
async def ai_writing_action(
    project_id: str,
    request: AIWritingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Execute AI writing action with streaming response."""
    # Validate project ownership
    project = (
        db.query(WritingProject)
        .filter(
            WritingProject.id == project_id,
            WritingProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    async def generate_response():
        try:
            # Get user's API settings
            settings = db.query(UserSettings).filter(
                UserSettings.user_id == current_user.id
            ).first()

            # Build prompts based on action
            system_prompt, user_prompt = build_writing_prompt(
                action=request.action,
                selected_text=request.selected_text,
                context_before=request.context_before,
                context_after=request.context_after,
                target_language=request.target_language,
            )

            # Get API key based on model
            model = request.model or "openai/gpt-4o"
            api_key = None

            if model.startswith("openai/"):
                api_key = settings.openai_api_key if settings else None
            elif model.startswith("anthropic/"):
                api_key = settings.anthropic_api_key if settings else None
            elif model.startswith("google/"):
                api_key = settings.google_api_key if settings else None

            if not api_key:
                error_msg = "请先在设置中配置相应的 API 密钥"
                yield f"data: {json.dumps({'error': error_msg})}\n\n"
                return

            full_response = ""

            if model.startswith("openai/"):
                import openai
                client = openai.OpenAI(api_key=api_key)
                model_name = model.replace("openai/", "")

                stream = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    stream=True,
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield f"data: {json.dumps({'content': content})}\n\n"

            elif model.startswith("anthropic/"):
                import anthropic
                client = anthropic.Anthropic(api_key=api_key)
                model_name = model.replace("anthropic/", "")

                with client.messages.stream(
                    model=model_name,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                ) as stream:
                    for text in stream.text_stream:
                        full_response += text
                        yield f"data: {json.dumps({'content': text})}\n\n"

            elif model.startswith("google/"):
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model_name = model.replace("google/", "")

                gemini = genai.GenerativeModel(
                    model_name,
                    system_instruction=system_prompt,
                )
                response = gemini.generate_content(user_prompt, stream=True)

                for chunk in response:
                    if chunk.text:
                        full_response += chunk.text
                        yield f"data: {json.dumps({'content': chunk.text})}\n\n"

            # Log AI action to history
            ai_history = project.ai_history or []
            ai_history.append({
                "action": request.action,
                "timestamp": datetime.utcnow().isoformat(),
                "input_length": len(request.selected_text or request.context_before or ""),
                "output_length": len(full_response),
                "model": model,
            })
            project.ai_history = ai_history
            project.updated_at = datetime.utcnow()
            db.commit()

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            logger.error(f"AI writing error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/projects/{project_id}/save-to-library")
async def save_to_library(
    project_id: str,
    request: SaveToLibraryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Save writing project to library as a document."""
    # Validate project ownership
    project = (
        db.query(WritingProject)
        .filter(
            WritingProject.id == project_id,
            WritingProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate folder if provided
    if request.folder_id:
        folder = (
            db.query(Folder)
            .filter(
                Folder.id == request.folder_id,
                Folder.user_id == current_user.id,
            )
            .first()
        )
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

    # Create document from writing project
    document = Document(
        id=str(uuid4()),
        user_id=current_user.id,
        folder_id=request.folder_id,
        title=project.title,
        file_type="md",
        file_size=len((project.content or "").encode("utf-8")),
        content=project.content,
        doc_metadata={
            "source": "writing_project",
            "writing_project_id": project.id,
            "template_type": project.template_type,
        },
        tags=request.tags or [],
        parsing_status="completed",
        embedding_status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # TODO: Trigger embedding generation in background

    return {
        "id": document.id,
        "title": document.title,
        "message": "Document saved to library successfully",
    }
