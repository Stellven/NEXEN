"""
Agents API endpoints.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


# ============================================================================
# Response Models
# ============================================================================

class AgentInfo(BaseModel):
    """Agent information."""
    
    id: str
    display_name: str
    display_name_cn: str
    cluster: str
    role_model: str
    fallback_model: Optional[str] = None
    status: str = "idle"  # idle, running, completed, failed
    current_task: Optional[str] = None
    responsibilities: list[str] = []


class AgentList(BaseModel):
    """List of agents."""
    
    agents: list[AgentInfo]
    total: int


class AgentExecuteRequest(BaseModel):
    """Request to execute an agent directly."""
    
    task: str = Field(..., description="Task for the agent")
    session_id: Optional[str] = None
    context: Optional[str] = None


class AgentExecuteResponse(BaseModel):
    """Response from agent execution."""
    
    agent_id: str
    task: str
    result: str
    tokens_used: int
    duration_ms: int
    key_findings: list[str] = []


# ============================================================================
# Agent Status Tracking
# ============================================================================

_agent_status: dict[str, dict] = {}


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=AgentList)
async def list_agents(cluster: Optional[str] = None):
    """List all available agents."""
    from nexen.config.agents import AGENT_CONFIGS, AgentCluster
    
    agents = []
    for agent_id, config in AGENT_CONFIGS.items():
        if cluster and config.cluster.value != cluster:
            continue
        
        status_info = _agent_status.get(agent_id, {})
        
        agents.append(AgentInfo(
            id=agent_id,
            display_name=config.display_name,
            display_name_cn=config.display_name_cn,
            cluster=config.cluster.value,
            role_model=config.role_model,
            fallback_model=config.fallback_model,
            status=status_info.get("status", "idle"),
            current_task=status_info.get("current_task"),
            responsibilities=config.responsibilities[:5],
        ))
    
    return AgentList(agents=agents, total=len(agents))


@router.get("/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str):
    """Get agent details."""
    from nexen.config.agents import AGENT_CONFIGS
    
    if agent_id not in AGENT_CONFIGS:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    config = AGENT_CONFIGS[agent_id]
    status_info = _agent_status.get(agent_id, {})
    
    return AgentInfo(
        id=agent_id,
        display_name=config.display_name,
        display_name_cn=config.display_name_cn,
        cluster=config.cluster.value,
        role_model=config.role_model,
        fallback_model=config.fallback_model,
        status=status_info.get("status", "idle"),
        current_task=status_info.get("current_task"),
        responsibilities=config.responsibilities,
    )


@router.get("/{agent_id}/status")
async def get_agent_status(agent_id: str):
    """Get agent status."""
    from nexen.config.agents import AGENT_CONFIGS
    
    if agent_id not in AGENT_CONFIGS:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    status_info = _agent_status.get(agent_id, {"status": "idle"})
    
    return status_info


@router.post("/{agent_id}/execute", response_model=AgentExecuteResponse)
async def execute_agent(agent_id: str, request: AgentExecuteRequest):
    """Execute a single agent directly."""
    from app.services.agent_service import AgentService
    
    service = AgentService()
    
    try:
        # Update status
        _agent_status[agent_id] = {
            "status": "running",
            "current_task": request.task[:100],
        }
        
        result = await service.execute_agent(
            agent_id=agent_id,
            task=request.task,
            session_id=request.session_id,
            context=request.context,
        )
        
        _agent_status[agent_id] = {"status": "idle"}
        
        return AgentExecuteResponse(
            agent_id=agent_id,
            task=request.task,
            result=result.result,
            tokens_used=result.tokens_used,
            duration_ms=result.duration_ms,
            key_findings=result.key_findings,
        )
        
    except Exception as e:
        _agent_status[agent_id] = {"status": "failed"}
        raise HTTPException(status_code=500, detail=str(e))
