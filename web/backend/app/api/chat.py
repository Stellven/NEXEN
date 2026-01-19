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
    features: Optional[List[str]] = []  # web_search, deep_research, etc.
    knowledge_bases: Optional[List[str]] = []  # folder:id, doc:id
    skills: Optional[List[str]] = []  # Anthropic skill names


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
                model=c.model_id,
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
        model=conversation.model_id,
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
            model=conversation.model_id,
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
        model=conversation.model_id,
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
    if conversation.model_id != request.model:
        conversation.model_id = request.model

    # If first message, update title
    message_count = db.query(Message).filter(Message.conversation_id == conversation_id).count()
    if message_count == 0:
        conversation.title = request.content[:50] + ("..." if len(request.content) > 50 else "")

    db.commit()

    # Generate AI response (streaming)
    async def generate_response():
        prompt_tokens = 0
        completion_tokens = 0

        try:
            # Get user's API keys from file storage
            from app.services.api_key_storage import get_user_api_keys as get_file_api_keys
            from app.services.usage_service import record_usage
            from app.services.search_service import search_web, format_search_results_for_prompt, should_search, extract_search_query

            api_keys = get_file_api_keys(current_user.id)
            logger.info(f"User ID: {current_user.id}, API keys available: {list(api_keys.keys())}, has values: {[k for k,v in api_keys.items() if v]}")

            # Get all messages for context
            messages = (
                db.query(Message)
                .filter(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.asc())
                .all()
            )

            # Build message history
            history = [{"role": m.role, "content": m.content} for m in messages]

            # Build system prompt with skills context
            system_prompt = "You are a helpful AI assistant."

            # Add skill context if skills are selected
            if request.skills:
                try:
                    from nexen.skills.anthropic_loader import get_skill_context
                    skill_contexts = []
                    for skill_name in request.skills:
                        ctx = get_skill_context(skill_name)
                        if ctx:
                            skill_contexts.append(ctx)
                    if skill_contexts:
                        system_prompt += "\n\n# Available Skills\n\n"
                        system_prompt += "\n\n---\n\n".join(skill_contexts)
                        system_prompt += "\n\nUse the above skill instructions when relevant to the user's request."
                except ImportError:
                    logger.warning("Skills module not available")

            # Web search integration
            if should_search(request.content, request.features):
                serper_key = api_keys.get("serper")
                if serper_key:
                    yield f"data: {json.dumps({'search_status': 'searching'})}\n\n"
                    search_query = extract_search_query(request.content)
                    search_results = await search_web(search_query, serper_key)
                    if not search_results.get("error"):
                        search_context = format_search_results_for_prompt(search_results)
                        system_prompt += f"""

{search_context}

**重要指示**：你已获得最新的网络搜索结果。请务必：
1. 直接引用并总结搜索结果中的信息来回答用户问题
2. 明确标注信息来源（如"根据搜索结果..."）
3. 如果搜索结果包含数据、数字或事实，请如实报告
4. 即使是敏感话题（如股市、新闻等），也应报告搜索到的客观信息
5. 仅在搜索结果确实不包含相关信息时，才说明需要依赖其他知识"""
                        yield f"data: {json.dumps({'search_status': 'done', 'results_count': len(search_results.get('results', []))})}\n\n"
                    else:
                        yield f"data: {json.dumps({'search_status': 'error', 'error': search_results.get('error')})}\n\n"
                else:
                    yield f"data: {json.dumps({'search_status': 'no_key'})}\n\n"

            # Prepend system message
            history = [{"role": "system", "content": system_prompt}] + history

            # Get API key based on model
            model = request.model or "openai/gpt-4o"
            api_key = None
            provider = None

            if model.startswith("openai/"):
                api_key = api_keys.get("openai")
                provider = "openai"
            elif model.startswith("anthropic/"):
                api_key = api_keys.get("anthropic")
                provider = "anthropic"
            elif model.startswith("google/"):
                api_key = api_keys.get("google")
                provider = "google"
            elif model.startswith("deepseek/"):
                api_key = api_keys.get("deepseek")
                provider = "deepseek"
            elif model.startswith("qwen/"):
                api_key = api_keys.get("dashscope")
                provider = "dashscope"

            logger.info(f"Model: {model}, Provider: {provider}, API key exists: {bool(api_key)}")

            if not api_key:
                error_msg = f"请先在设置中配置相应的 API 密钥 (provider: {provider})"
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
                    stream_options={"include_usage": True},
                )

                for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield f"data: {json.dumps({'content': content})}\n\n"
                    if hasattr(chunk, 'usage') and chunk.usage:
                        prompt_tokens = chunk.usage.prompt_tokens
                        completion_tokens = chunk.usage.completion_tokens

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
                    # Get usage from final message
                    final_message = stream.get_final_message()
                    if final_message and final_message.usage:
                        prompt_tokens = final_message.usage.input_tokens
                        completion_tokens = final_message.usage.output_tokens

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
                # Estimate tokens for Google (no direct API)
                prompt_tokens = sum(len(m["content"]) // 4 for m in history)
                completion_tokens = len(full_response) // 4

            elif model.startswith("deepseek/"):
                # DeepSeek uses OpenAI-compatible API
                import openai
                client = openai.OpenAI(
                    api_key=api_key,
                    base_url="https://api.deepseek.com/v1"
                )
                model_name = model.replace("deepseek/", "")

                stream = client.chat.completions.create(
                    model=model_name,
                    messages=history,
                    stream=True,
                    stream_options={"include_usage": True},
                )

                for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield f"data: {json.dumps({'content': content})}\n\n"
                    if hasattr(chunk, 'usage') and chunk.usage:
                        prompt_tokens = chunk.usage.prompt_tokens
                        completion_tokens = chunk.usage.completion_tokens

            elif model.startswith("qwen/"):
                # Qwen/DashScope
                import dashscope
                from dashscope import Generation
                dashscope.api_key = api_key
                model_name = model.replace("qwen/", "")

                responses = Generation.call(
                    model=model_name,
                    messages=history,
                    result_format='message',
                    stream=True,
                    incremental_output=True,
                )

                for response in responses:
                    if response.status_code == 200:
                        if response.output and response.output.choices:
                            choice = response.output.choices[0]
                            if choice.message and choice.message.content:
                                content = choice.message.content
                                full_response += content
                                yield f"data: {json.dumps({'content': content})}\n\n"
                        # Get usage from last response
                        if response.usage:
                            prompt_tokens = response.usage.input_tokens
                            completion_tokens = response.usage.output_tokens
                    else:
                        error_msg = f"DashScope error: {response.code} - {response.message}"
                        yield f"data: {json.dumps({'error': error_msg})}\n\n"
                        return

            # Save assistant message with token usage
            assistant_message = Message(
                id=str(uuid4()),
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
            )
            db.add(assistant_message)
            db.commit()

            # Record usage statistics
            if prompt_tokens > 0 or completion_tokens > 0:
                try:
                    record_usage(db, current_user.id, model, prompt_tokens, completion_tokens)
                except Exception as e:
                    logger.error(f"Failed to record usage: {e}")

            yield f"data: {json.dumps({'done': True, 'message_id': assistant_message.id, 'usage': {'prompt_tokens': prompt_tokens, 'completion_tokens': completion_tokens}})}\n\n"

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
