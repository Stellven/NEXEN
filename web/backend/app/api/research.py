"""
Research API endpoints with user API key integration.
"""

import asyncio
import uuid
import os
import sys
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, UserSettings
from app.auth.deps import get_current_active_user, get_optional_user
from app.auth.security import decrypt_api_key

router = APIRouter()

# Request/Response Models
class ResearchRequest(BaseModel):
    task: str = Field(..., description="Research task description")
    query: Optional[str] = Field(None, description="Alias for task")
    session_id: Optional[str] = None
    max_agents: int = Field(5, ge=1, le=10)

class ResearchResponse(BaseModel):
    task_id: str
    status: str
    message: str
    result: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

# In-memory storage
_tasks: dict[str, dict] = {}

def get_user_api_keys(user: Optional[User], db: Session) -> dict[str, str]:
    """Get decrypted API keys for a user."""
    if not user:
        return {}
    
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        return {}
    
    keys = {}
    if settings.openai_api_key:
        keys["openai"] = decrypt_api_key(settings.openai_api_key)
    if settings.anthropic_api_key:
        keys["anthropic"] = decrypt_api_key(settings.anthropic_api_key)
    if settings.google_api_key:
        keys["google"] = decrypt_api_key(settings.google_api_key)
    
    return keys

@router.post("", response_model=ResearchResponse)
async def create_research_task(
    request: ResearchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Create and start a new research task."""
    task_id = str(uuid.uuid4())
    task_text = request.task or request.query or ""
    
    # Get user's API keys
    api_keys = get_user_api_keys(current_user, db)
    
    if not api_keys:
        print("Warning: No API keys found for user", file=sys.stderr)
        raise HTTPException(
            status_code=400,
            detail="请先在设置页面配置 API Keys"
        )
    
    task_data = {
        "task_id": task_id,
        "task_text": task_text,
        "status": "pending",
        "message": "任务已创建，正在启动...",
        "result": None,
        "created_at": datetime.now(),
        "completed_at": None,
        "api_keys": api_keys,
    }
    
    _tasks[task_id] = task_data
    
    # Start async execution
    background_tasks.add_task(execute_research, task_id)
    
    return ResearchResponse(
        task_id=task_id,
        status="pending",
        message="任务已创建",
        created_at=task_data["created_at"],
    )

@router.get("/{task_id}", response_model=ResearchResponse)
async def get_research_task(task_id: str):
    """Get the status and results of a research task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = _tasks[task_id]
    return ResearchResponse(
        task_id=task_id,
        status=task["status"],
        message=task["message"],
        result=task.get("result"),
        created_at=task["created_at"],
        completed_at=task.get("completed_at"),
    )

async def execute_research(task_id: str):
    """Execute research task using LiteLLM."""
    import litellm
    
    task = _tasks.get(task_id)
    if not task:
        return
    
    task["status"] = "running"
    task["message"] = "正在分析研究问题..."
    
    api_keys = task.get("api_keys", {})
    task_text = task.get("task_text", "")
    
    try:
        # Determine model and key
        model = ""
        api_key = ""
        
        print(f"Executing task {task_id}. Available keys: {list(api_keys.keys())}", file=sys.stderr)
        
        if api_keys.get("openai"):
            model = "openai/gpt-4o"
            api_key = api_keys["openai"]
        elif api_keys.get("anthropic"):
            model = "anthropic/claude-3-5-sonnet-20241022"
            api_key = api_keys["anthropic"]
        elif api_keys.get("google"):
            model = "google/gemini-2.0-pro"
            api_key = api_keys["google"]
        else:
            raise ValueError("没有可用的 API Key")
            
        print(f"Using model: {model}", file=sys.stderr)
        
        # Create research prompt
        system_prompt = """你是一个专业的研究助手。请对用户的研究问题进行深入分析和回答。

请按以下结构组织你的回答：
# 研究概述
简要介绍研究主题

## 核心内容
详细分析主要观点

## 关键发现
列出重要发现和洞察

## 相关工作
提及相关研究或背景

## 总结
总结主要结论

请用中文回答，使用 Markdown 格式。"""
        
        task["message"] = f"正在使用 {model} 进行研究分析..."
        
        # Call LLM with explicit API key
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": task_text}
            ],
            max_tokens=4000,
            temperature=0.7,
            api_key=api_key, 
        )
        
        result_text = response.choices[0].message.content
        
        task["status"] = "completed"
        task["message"] = "研究完成！"
        task["result"] = result_text
        task["completed_at"] = datetime.now()
        print(f"Task {task_id} completed successfully", file=sys.stderr)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        task["status"] = "failed"
        task["message"] = f"Research failed: {str(e)}"
        task["completed_at"] = datetime.now()
        print(f"Task {task_id} failed: {e}", file=sys.stderr)
    finally:
        # Clean up sensitive data
        if "api_keys" in task:
            del task["api_keys"]
