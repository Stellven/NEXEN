"""
Skills API endpoints - Quick access to common research operations.
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, Field

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class SkillRequest(BaseModel):
    """Base skill request."""
    
    session_id: Optional[str] = None


class SurveyRequest(SkillRequest):
    """Request for /survey skill."""
    
    topic: str = Field(..., description="Topic to survey")
    max_papers: int = Field(15, ge=1, le=50)


class WhoRequest(SkillRequest):
    """Request for /who skill."""
    
    person: str = Field(..., description="Person to research")


class EvolutionRequest(SkillRequest):
    """Request for /evolution skill."""
    
    technology: str = Field(..., description="Technology to analyze")


class SkillResponse(BaseModel):
    """Skill execution response."""
    
    skill: str
    result: str
    tokens_used: int = 0
    duration_ms: int = 0


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/survey", response_model=SkillResponse)
async def skill_survey(request: SurveyRequest):
    """
    Execute /survey skill - Literature survey on a topic.
    
    Uses the Explorer agent to search and summarize papers.
    """
    from app.services.skill_service import SkillService
    
    service = SkillService()
    result = await service.survey(
        topic=request.topic,
        max_papers=request.max_papers,
        session_id=request.session_id,
    )
    
    return SkillResponse(
        skill="survey",
        result=result.result,
        tokens_used=result.tokens_used,
        duration_ms=result.duration_ms,
    )


@router.post("/who", response_model=SkillResponse)
async def skill_who(request: WhoRequest):
    """
    Execute /who skill - Build researcher profile.
    
    Uses the Genealogist agent to research a person.
    """
    from app.services.skill_service import SkillService
    
    service = SkillService()
    result = await service.who(
        person=request.person,
        session_id=request.session_id,
    )
    
    return SkillResponse(
        skill="who",
        result=result.result,
        tokens_used=result.tokens_used,
        duration_ms=result.duration_ms,
    )


@router.post("/evolution", response_model=SkillResponse)
async def skill_evolution(request: EvolutionRequest):
    """
    Execute /evolution skill - Analyze technology evolution.
    
    Uses the Historian agent to trace technology history.
    """
    from app.services.skill_service import SkillService
    
    service = SkillService()
    result = await service.evolution(
        technology=request.technology,
        session_id=request.session_id,
    )
    
    return SkillResponse(
        skill="evolution",
        result=result.result,
        tokens_used=result.tokens_used,
        duration_ms=result.duration_ms,
    )


@router.post("/critique", response_model=SkillResponse)
async def skill_critique(request: SkillRequest, content: str = ""):
    """
    Execute /critique skill - Critical analysis of content.
    
    Uses the Critic agent to review methods or papers.
    """
    from app.services.skill_service import SkillService
    
    service = SkillService()
    result = await service.critique(
        content=content,
        session_id=request.session_id,
    )
    
    return SkillResponse(
        skill="critique",
        result=result.result,
        tokens_used=result.tokens_used,
        duration_ms=result.duration_ms,
    )
