"""
Research API endpoints.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class ResearchRequest(BaseModel):
    """Request to start a research task."""
    
    task: str = Field(..., description="Research task description")
    session_id: Optional[str] = Field(None, description="Session ID to use")
    max_agents: int = Field(5, ge=1, le=10, description="Maximum agents to involve")
    context: Optional[str] = Field(None, description="Additional context")


class SubtaskInfo(BaseModel):
    """Information about a subtask."""
    
    task_id: str
    description: str
    assigned_agent: str
    status: str
    tokens_used: int = 0


class ResearchResponse(BaseModel):
    """Research task response."""
    
    task_id: str
    status: str  # pending, running, completed, failed
    message: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    subtasks: list[SubtaskInfo] = []
    synthesis: Optional[str] = None
    total_tokens: int = 0


class ResearchStatus(BaseModel):
    """Research task status."""
    
    task_id: str
    status: str
    progress: float = 0.0
    current_stage: str = ""
    subtasks_completed: int = 0
    subtasks_total: int = 0


# ============================================================================
# In-memory task storage (replace with database in production)
# ============================================================================

_tasks: dict[str, dict] = {}


# ============================================================================
# Endpoints
# ============================================================================

@router.post("", response_model=ResearchResponse)
async def create_research_task(
    request: ResearchRequest,
    background_tasks: BackgroundTasks,
):
    """
    Create and start a new research task.
    
    The task will be executed asynchronously. Use the returned task_id
    to poll for status or connect via WebSocket for real-time updates.
    """
    task_id = str(uuid.uuid4())
    
    task_data = {
        "task_id": task_id,
        "request": request.model_dump(),
        "status": "pending",
        "message": "Task created, starting execution...",
        "created_at": datetime.now(),
        "completed_at": None,
        "subtasks": [],
        "synthesis": None,
        "total_tokens": 0,
    }
    
    _tasks[task_id] = task_data
    
    # Start async execution
    background_tasks.add_task(execute_research_task, task_id, request)
    
    return ResearchResponse(**task_data)


@router.get("/{task_id}", response_model=ResearchResponse)
async def get_research_task(task_id: str):
    """Get the status and results of a research task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return ResearchResponse(**_tasks[task_id])


@router.get("/{task_id}/status", response_model=ResearchStatus)
async def get_research_status(task_id: str):
    """Get quick status of a research task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = _tasks[task_id]
    subtasks = task.get("subtasks", [])
    completed = sum(1 for st in subtasks if st.get("status") == "completed")
    
    return ResearchStatus(
        task_id=task_id,
        status=task["status"],
        progress=completed / len(subtasks) if subtasks else 0,
        current_stage=task.get("current_stage", ""),
        subtasks_completed=completed,
        subtasks_total=len(subtasks),
    )


@router.delete("/{task_id}")
async def cancel_research_task(task_id: str):
    """Cancel a running research task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = _tasks[task_id]
    if task["status"] in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Task already finished")
    
    task["status"] = "cancelled"
    task["message"] = "Task cancelled by user"
    
    return {"message": "Task cancelled"}


# ============================================================================
# Background Task Execution
# ============================================================================

async def execute_research_task(task_id: str, request: ResearchRequest):
    """Execute a research task in the background."""
    from app.services.research_service import ResearchService
    
    task = _tasks[task_id]
    task["status"] = "running"
    task["message"] = "Coordinating agents..."
    
    try:
        service = ResearchService()
        
        # Update callback for real-time status
        async def on_progress(stage: str, message: str, subtasks: list):
            task["current_stage"] = stage
            task["message"] = message
            task["subtasks"] = subtasks
        
        result = await service.execute(
            task=request.task,
            session_id=request.session_id,
            max_agents=request.max_agents,
            context=request.context,
            on_progress=on_progress,
        )
        
        task["status"] = "completed"
        task["message"] = "Research completed successfully"
        task["completed_at"] = datetime.now()
        task["subtasks"] = result.subtasks
        task["synthesis"] = result.synthesis
        task["total_tokens"] = result.total_tokens
        
    except Exception as e:
        task["status"] = "failed"
        task["message"] = f"Research failed: {str(e)}"
        task["completed_at"] = datetime.now()
