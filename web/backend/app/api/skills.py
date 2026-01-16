"""
Skills API endpoints - Extended with scientific skills.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class SkillInfo(BaseModel):
    """Skill information."""
    name: str
    display_name: str
    description: str
    category: str
    parameters: list[dict]


class SkillListResponse(BaseModel):
    """List of skills."""
    total: int
    categories: list[str]
    skills: list[SkillInfo]


class SkillExecuteRequest(BaseModel):
    """Request to execute a skill."""
    skill_name: str = Field(..., description="Name of the skill to execute")
    params: dict = Field(default_factory=dict, description="Skill parameters")
    session_id: Optional[str] = None


class SkillExecuteResponse(BaseModel):
    """Response from skill execution."""
    skill: str
    success: bool
    result: Optional[str] = None
    error: Optional[str] = None
    metadata: dict = {}


# Legacy skill request models (for backwards compatibility)
class SkillRequest(BaseModel):
    session_id: Optional[str] = None

class SurveyRequest(SkillRequest):
    topic: str = Field(..., description="Topic to survey")
    max_papers: int = Field(15, ge=1, le=50)

class WhoRequest(SkillRequest):
    person: str = Field(..., description="Person to research")

class EvolutionRequest(SkillRequest):
    technology: str = Field(..., description="Technology to analyze")


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=SkillListResponse)
async def list_skills(category: Optional[str] = None):
    """List all available skills."""
    from nexen.skills import SkillRegistry, SkillCategory
    
    # Import scientific skills to register them
    try:
        import nexen.skills.scientific
    except ImportError:
        pass
    
    skills = SkillRegistry.list_all()
    
    if category:
        try:
            cat = SkillCategory(category)
            skills = [s for s in skills if s.category == cat]
        except ValueError:
            pass
    
    return SkillListResponse(
        total=len(skills),
        categories=[c.value for c in SkillCategory],
        skills=[SkillInfo(**s.to_dict()) for s in skills],
    )


@router.post("/execute", response_model=SkillExecuteResponse)
async def execute_skill(request: SkillExecuteRequest):
    """Execute a skill by name."""
    from nexen.skills import get_skill
    
    # Import scientific skills
    try:
        import nexen.skills.scientific
    except ImportError:
        pass
    
    skill = get_skill(request.skill_name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill not found: {request.skill_name}")
    
    try:
        result = await skill.execute(request.params)
        return SkillExecuteResponse(
            skill=request.skill_name,
            success=result.success,
            result=result.to_markdown() if result.success else None,
            error=result.error,
            metadata=result.metadata,
        )
    except Exception as e:
        return SkillExecuteResponse(
            skill=request.skill_name,
            success=False,
            error=str(e),
        )


# ============================================================================
# Legacy Endpoints (backwards compatibility)
# ============================================================================

@router.post("/survey", response_model=SkillExecuteResponse)
async def skill_survey(request: SurveyRequest):
    """Execute /survey skill - Literature survey on a topic."""
    from nexen.skills import get_skill
    import nexen.skills.scientific
    
    skill = get_skill("literature_review")
    if skill:
        result = await skill.execute({"topic": request.topic, "scope": "comprehensive"})
        return SkillExecuteResponse(
            skill="survey",
            success=result.success,
            result=result.to_markdown() if result.success else None,
            error=result.error,
        )
    
    # Fallback to simple execution
    return SkillExecuteResponse(
        skill="survey",
        success=False,
        error="Literature review skill not available",
    )


@router.post("/who", response_model=SkillExecuteResponse)
async def skill_who(request: WhoRequest):
    """Execute /who skill - Build researcher profile."""
    from nexen.skills.base import LLMSkill, SkillResult
    
    class ProfileSkill(LLMSkill):
        name = "researcher_profile"
        
    skill = ProfileSkill()
    prompt = f"""Build a comprehensive researcher profile for: {request.person}

Include:
1. Current position and institution
2. Research areas and expertise
3. Education and career trajectory
4. Key publications and citations
5. Notable collaborations
6. Awards and recognition
7. Research impact and influence"""
    
    try:
        result = await skill.call_llm(prompt)
        return SkillExecuteResponse(skill="who", success=True, result=result)
    except Exception as e:
        return SkillExecuteResponse(skill="who", success=False, error=str(e))


@router.post("/evolution", response_model=SkillExecuteResponse)
async def skill_evolution(request: EvolutionRequest):
    """Execute /evolution skill - Analyze technology evolution."""
    from nexen.skills.base import LLMSkill
    
    class EvolutionSkill(LLMSkill):
        name = "tech_evolution"
    
    skill = EvolutionSkill()
    prompt = f"""Analyze the evolution of: {request.technology}

Provide:
1. Origins and early history
2. Key milestones and breakthroughs
3. Major contributors and institutions
4. Evolution timeline with branches
5. Current state of the art
6. Future directions and trends"""
    
    try:
        result = await skill.call_llm(prompt)
        return SkillExecuteResponse(skill="evolution", success=True, result=result)
    except Exception as e:
        return SkillExecuteResponse(skill="evolution", success=False, error=str(e))
