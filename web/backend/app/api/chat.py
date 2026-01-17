"""
Chat API endpoints for AI Ask functionality.
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
from app.db.models import User, Conversation, Message
from app.auth.deps import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()


# Request/Response Models
class CreateConversationRequest(BaseModel):
    title: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    title: str
    model: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    model: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1)
    model: Optional[str] = "openai/gpt-4o"


class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    total: int


class ConversationDetailResponse(BaseModel):
    conversation: ConversationResponse
    messages: List[MessageResponse]


# Endpoints
@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all conversations for the current user."""
    query = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    total = query.count()
    conversations = query.offset(skip).limit(limit).all()

    return ConversationListResponse(
        conversations=[
            ConversationResponse(
                id=c.id,
                title=c.title,
                model=c.model,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in conversations
        ],
        total=total,
    )


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    request: CreateConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new conversation."""
    conversation = Conversation(
        id=str(uuid4()),
        user_id=current_user.id,
        title=request.title or "新对话",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        model=conversation.model,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a conversation with all its messages."""
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return ConversationDetailResponse(
        conversation=ConversationResponse(
            id=conversation.id,
            title=conversation.title,
            model=conversation.model,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        ),
        messages=[
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                model=m.model,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a conversation."""
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Delete messages first
    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    db.delete(conversation)
    db.commit()


@router.put("/conversations/{conversation_id}/title", response_model=ConversationResponse)
async def update_conversation_title(
    conversation_id: str,
    request: CreateConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a conversation's title."""
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if request.title:
        conversation.title = request.title
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conversation)

    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        model=conversation.model,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send a message and get AI response (streaming)."""
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    user_message = Message(
        id=str(uuid4()),
        conversation_id=conversation_id,
        role="user",
        content=request.content,
    )
    db.add(user_message)

    # Update conversation
    conversation.updated_at = datetime.utcnow()
    if conversation.model != request.model:
        conversation.model = request.model

    # If first message, update title
    message_count = db.query(Message).filter(Message.conversation_id == conversation_id).count()
    if message_count == 0:
        conversation.title = request.content[:50] + ("..." if len(request.content) > 50 else "")

    db.commit()

    # Generate AI response (streaming)
    async def generate_response():
        try:
            # Get user's API settings
            from app.db.models import UserSettings
            settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

            # Get all messages for context
            messages = (
                db.query(Message)
                .filter(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.asc())
                .all()
            )

            # Build message history
            history = [{"role": m.role, "content": m.content} for m in messages]

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
                # Return error as stream
                error_msg = "请先在设置中配置相应的 API 密钥"
                yield f"data: {json.dumps({'error': error_msg})}\n\n"
                return

            # Call appropriate API
            full_response = ""

            if model.startswith("openai/"):
                import openai
                client = openai.OpenAI(api_key=api_key)
                model_name = model.replace("openai/", "")

                stream = client.chat.completions.create(
                    model=model_name,
                    messages=history,
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

                # Convert to Anthropic format
                system_msg = ""
                anthropic_messages = []
                for msg in history:
                    if msg["role"] == "system":
                        system_msg = msg["content"]
                    else:
                        anthropic_messages.append(msg)

                with client.messages.stream(
                    model=model_name,
                    max_tokens=4096,
                    system=system_msg if system_msg else "You are a helpful AI assistant.",
                    messages=anthropic_messages,
                ) as stream:
                    for text in stream.text_stream:
                        full_response += text
                        yield f"data: {json.dumps({'content': text})}\n\n"

            elif model.startswith("google/"):
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model_name = model.replace("google/", "")

                gemini = genai.GenerativeModel(model_name)

                # Convert to Gemini format
                gemini_history = []
                for msg in history[:-1]:
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_history.append({"role": role, "parts": [msg["content"]]})

                chat = gemini.start_chat(history=gemini_history)
                response = chat.send_message(history[-1]["content"], stream=True)

                for chunk in response:
                    if chunk.text:
                        full_response += chunk.text
                        yield f"data: {json.dumps({'content': chunk.text})}\n\n"

            # Save assistant message
            assistant_message = Message(
                id=str(uuid4()),
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                model=model,
            )
            db.add(assistant_message)
            db.commit()

            yield f"data: {json.dumps({'done': True, 'message_id': assistant_message.id})}\n\n"

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
