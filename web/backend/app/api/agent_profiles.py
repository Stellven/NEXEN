"""
Agent Profiles API - Configuration management for multi-agent research system.

Provides endpoints for:
- Viewing and managing agent configurations
- Creating custom agents
- Testing agents with simple tasks
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.db.database import get_db
from app.db.models import AgentProfile, User
from app.services.api_key_storage import get_user_api_keys as get_file_api_keys

router = APIRouter()


# =============================================================================
# Default Agent Configurations (from nexen/config/agents.py)
# =============================================================================

DEFAULT_AGENTS = [
    {
        "agent_type": "meta_coordinator",
        "display_name": "Meta-Coordinator",
        "display_name_cn": "元协调者",
        "cluster": "coordination",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.7,
        "max_tokens": 4000,
        "persona": "你是一位资深的AI研究PI，负责分解任务、协调Agent并整合输出。",
        "traits": {"leadership": "very_high", "decision_making": "very_high"},
        "responsibilities": [
            "分解复杂研究任务",
            "分配任务给合适的Agent",
            "整合各Agent输出",
            "做出最终决策",
        ],
        "data_sources": [],
        "enabled_skills": [],
    },
    {
        "agent_type": "logician",
        "display_name": "Logician",
        "display_name_cn": "逻辑推理者",
        "cluster": "reasoning",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.1,
        "max_tokens": 4000,
        "persona": "你是一个严格的逻辑推理专家，擅长数学证明和形式化验证。",
        "traits": {"rigor": "very_high", "creativity": "low", "formalization": "very_high"},
        "responsibilities": ["逻辑推理和数学证明", "形式化验证", "复杂度分析", "理论正确性审查"],
        "data_sources": [],
        "enabled_skills": [],
    },
    {
        "agent_type": "critic",
        "display_name": "Critic",
        "display_name_cn": "批判者",
        "cluster": "reasoning",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.3,
        "max_tokens": 4000,
        "persona": "你是一个严格的学术批判者，善于发现方法缺陷和提供建设性意见。",
        "traits": {"critical_thinking": "very_high", "constructiveness": "high"},
        "responsibilities": ["方法审查和批判", "假设质疑", "反例构建", "实验设计审查"],
        "data_sources": [],
        "enabled_skills": [],
    },
    {
        "agent_type": "connector",
        "display_name": "Connector",
        "display_name_cn": "连接者",
        "cluster": "reasoning",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.7,
        "max_tokens": 4000,
        "persona": "你是一个跨领域的知识连接者，擅长发现不同领域间的深层联系。",
        "traits": {"creativity": "very_high", "cross_domain": "very_high"},
        "responsibilities": ["跨领域关联发现", "类比推理", "思想融合", "创新点识别"],
        "data_sources": [],
        "enabled_skills": [],
    },
    {
        "agent_type": "genealogist",
        "display_name": "Genealogist",
        "display_name_cn": "谱系学家",
        "cluster": "reasoning",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.5,
        "max_tokens": 4000,
        "persona": "你是一位学术谱系学家，专注于构建人物档案和追溯学术师承关系。",
        "traits": {"research_depth": "very_high", "people_focus": "very_high"},
        "responsibilities": ["人物档案构建", "学术师承追溯", "思想演进分析", "学派识别"],
        "data_sources": ["google_scholar", "semantic_scholar"],
        "enabled_skills": ["/who", "/lineage", "/thought-evolution"],
    },
    {
        "agent_type": "historian",
        "display_name": "Historian",
        "display_name_cn": "技术历史学家",
        "cluster": "reasoning",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.5,
        "max_tokens": 4000,
        "persona": "你是一位技术史学家，专注于梳理技术演进历程和识别里程碑。",
        "traits": {"historical_perspective": "very_high", "pattern_recognition": "high"},
        "responsibilities": ["技术起源追溯", "里程碑识别", "演进轴识别", "趋势预测"],
        "data_sources": ["arxiv", "semantic_scholar"],
        "enabled_skills": ["/tech-origin", "/timeline", "/evolution", "/predict-next"],
    },
    {
        "agent_type": "explorer",
        "display_name": "Explorer",
        "display_name_cn": "探索者",
        "cluster": "information",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.7,
        "max_tokens": 4000,
        "persona": "你是一个充满好奇心的研究探索者，擅长文献检索和趋势发现。",
        "traits": {"curiosity": "very_high", "breadth": "high"},
        "responsibilities": ["文献检索和筛选", "新方向发现", "假设提出", "研究趋势追踪"],
        "data_sources": ["arxiv", "semantic_scholar", "google_scholar"],
        "enabled_skills": ["/survey", "/paper-deep-dive", "/trend"],
    },
    {
        "agent_type": "social_scout",
        "display_name": "Social Scout",
        "display_name_cn": "社交侦察",
        "cluster": "information",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.6,
        "max_tokens": 4000,
        "persona": "你是AI研究社区的情报专家，擅长追踪社交媒体上的研究动态。",
        "traits": {"social_awareness": "very_high", "timeliness": "high"},
        "responsibilities": ["社交媒体监控", "热点追踪", "舆情分析", "非正式信息获取"],
        "data_sources": ["twitter", "reddit", "hacker_news"],
        "enabled_skills": [],
    },
    {
        "agent_type": "cn_specialist",
        "display_name": "CN Specialist",
        "display_name_cn": "中文专家",
        "cluster": "information",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.5,
        "max_tokens": 4000,
        "persona": "你是中文学术资源专家，擅长中文文献检索和术语翻译。",
        "traits": {"chinese_proficiency": "very_high", "bilingual": "very_high"},
        "responsibilities": ["中文文献检索", "中文社区分析", "术语翻译", "国内生态理解"],
        "data_sources": ["cnki", "wanfang", "zhihu"],
        "enabled_skills": [],
    },
    {
        "agent_type": "vision_analyst",
        "display_name": "Vision Analyst",
        "display_name_cn": "视觉分析师",
        "cluster": "information",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.5,
        "max_tokens": 4000,
        "persona": "你是一个多模态研究分析师，擅长解读论文图表和架构图。",
        "traits": {"visual_analysis": "very_high", "detail_oriented": "high"},
        "responsibilities": ["图表分析", "架构图解读", "可视化比较", "多模态理解"],
        "data_sources": [],
        "enabled_skills": [],
    },
    {
        "agent_type": "builder",
        "display_name": "Builder",
        "display_name_cn": "构建者",
        "cluster": "production",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.3,
        "max_tokens": 8000,
        "persona": "你是一个资深的ML工程研究员，擅长将想法转化为可执行代码。",
        "traits": {"coding": "very_high", "engineering": "very_high"},
        "responsibilities": ["代码实现", "实验设计", "原型构建", "性能优化"],
        "data_sources": ["github", "huggingface"],
        "enabled_skills": ["/replicate", "/ablation", "/benchmark"],
    },
    {
        "agent_type": "scribe",
        "display_name": "Scribe",
        "display_name_cn": "记录者",
        "cluster": "production",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.5,
        "max_tokens": 8000,
        "persona": "你是一个优秀的学术写作者，擅长将复杂讨论提炼为清晰结构。",
        "traits": {"writing": "very_high", "organization": "very_high"},
        "responsibilities": ["论文撰写", "文档整理", "报告生成", "知识结构化"],
        "data_sources": [],
        "enabled_skills": ["/draft", "/rebuttal", "/slides", "/blog"],
    },
    {
        "agent_type": "archivist",
        "display_name": "Archivist",
        "display_name_cn": "档案管理员",
        "cluster": "production",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-flash",
        "temperature": 0.3,
        "max_tokens": 4000,
        "persona": "你是研究档案管理员，负责整理和提炼研究过程中产生的信息。",
        "traits": {"organization": "very_high", "summarization": "high"},
        "responsibilities": ["记忆管理", "摘要生成", "知识索引", "矛盾检测"],
        "data_sources": [],
        "enabled_skills": [],
    },
    {
        "agent_type": "prompt_engineer",
        "display_name": "Prompt Engineer",
        "display_name_cn": "提示词工程师",
        "cluster": "production",
        "role_model": "google/gemini-2.0-flash",
        "fallback_model": "google/gemini-2.0-pro",
        "temperature": 0.5,
        "max_tokens": 4000,
        "persona": "你是一位专业的AI提示词工程师，擅长设计高质量的系统提示词。",
        "traits": {"prompt_design": "very_high", "creativity": "high"},
        "responsibilities": ["系统提示词设计", "Agent性格优化", "任务提示词生成", "提示词评审"],
        "data_sources": [],
        "enabled_skills": [],
    },
]


# =============================================================================
# Pydantic Models
# =============================================================================


class PipelineConfig(BaseModel):
    module1: dict = Field(
        default_factory=lambda: {
            "generator_model": "openai/gpt-4o",
            "pass_threshold": 40,
            "max_iterations": 3,
        }
    )
    module2: dict = Field(
        default_factory=lambda: {
            "token_budget": 8000,
            "semantic_top_k": 5,
            "default_insights": ["key_findings.md"],
        }
    )
    module3: dict = Field(
        default_factory=lambda: {
            "tasks": ["deduplication", "importance_ranking"],
            "temperature": 0.3,
        }
    )


class AgentProfileCreate(BaseModel):
    agent_type: str = Field(..., min_length=1, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=100)
    display_name_cn: str = Field(..., min_length=1, max_length=100)
    cluster: str = Field(default="custom")
    role_model: str = Field(..., min_length=1)
    fallback_model: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4000, ge=100, le=32000)
    persona: str = Field(default="")
    traits: dict = Field(default_factory=dict)
    responsibilities: List[str] = Field(default_factory=list)
    pipeline_config: Optional[dict] = None
    data_sources: List[str] = Field(default_factory=list)
    enabled_skills: List[str] = Field(default_factory=list)


class AgentProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    display_name_cn: Optional[str] = Field(None, min_length=1, max_length=100)
    role_model: Optional[str] = None
    fallback_model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=100, le=32000)
    persona: Optional[str] = None
    traits: Optional[dict] = None
    responsibilities: Optional[List[str]] = None
    pipeline_config: Optional[dict] = None
    data_sources: Optional[List[str]] = None
    enabled_skills: Optional[List[str]] = None
    is_enabled: Optional[bool] = None


class AgentProfileResponse(BaseModel):
    id: str
    user_id: str
    agent_type: str
    display_name: str
    display_name_cn: str
    cluster: str
    is_custom: bool
    role_model: str
    fallback_model: Optional[str]
    temperature: float
    max_tokens: int
    persona: str
    traits: dict
    responsibilities: List[str]
    pipeline_config: dict
    data_sources: List[str]
    enabled_skills: List[str]
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentProfileListResponse(BaseModel):
    profiles: List[AgentProfileResponse]
    total: int


class AgentTestRequest(BaseModel):
    task: str = Field(..., min_length=1, max_length=1000)


class AgentTestResponse(BaseModel):
    agent_type: str
    task: str
    result: str
    tokens_used: int
    model_used: str


# =============================================================================
# Helper Functions
# =============================================================================


def get_user_api_keys_for_agent(user_id: str) -> dict[str, str]:
    """Get API keys for a user from file storage."""
    api_keys = get_file_api_keys(user_id)
    # Filter out None values
    return {k: v for k, v in api_keys.items() if v}


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/profiles/defaults")
async def get_default_agents():
    """Get all 14 default agent configurations."""
    return {"agents": DEFAULT_AGENTS, "total": len(DEFAULT_AGENTS)}


@router.get("/profiles", response_model=AgentProfileListResponse)
async def get_agent_profiles(
    cluster: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all agent profiles for the current user."""
    query = db.query(AgentProfile).filter(AgentProfile.user_id == current_user.id)

    if cluster:
        query = query.filter(AgentProfile.cluster == cluster)

    profiles = query.order_by(AgentProfile.created_at.desc()).all()

    # Helper to get current default model for an agent type
    default_models = {a["agent_type"]: a["role_model"] for a in DEFAULT_AGENTS}

    results = []
    for p in profiles:
        # If this is a default profile (not custom), always use the system default model
        # This ensures updates to system defaults (like model upgrades) are reflected
        role_model = p.role_model
        if not p.is_custom and p.agent_type in default_models:
            role_model = default_models[p.agent_type]

        results.append(
            AgentProfileResponse(
                id=p.id,
                user_id=p.user_id,
                agent_type=p.agent_type,
                display_name=p.display_name,
                display_name_cn=p.display_name_cn,
                cluster=p.cluster,
                is_custom=p.is_custom,
                role_model=role_model,
                fallback_model=p.fallback_model,
                temperature=p.temperature,
                max_tokens=p.max_tokens,
                persona=p.persona,
                traits=p.traits or {},
                responsibilities=p.responsibilities or [],
                pipeline_config=p.pipeline_config or {},
                data_sources=p.data_sources or [],
                enabled_skills=p.enabled_skills or [],
                is_enabled=p.is_enabled,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )

    return AgentProfileListResponse(
        profiles=results,
        total=len(results),
    )


@router.post("/profiles", response_model=AgentProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_agent_profile(
    request: AgentProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a custom agent profile."""
    profile = AgentProfile(
        user_id=current_user.id,
        agent_type=request.agent_type,
        display_name=request.display_name,
        display_name_cn=request.display_name_cn,
        cluster=request.cluster,
        is_custom=True,
        role_model=request.role_model,
        fallback_model=request.fallback_model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        persona=request.persona,
        traits=request.traits,
        responsibilities=request.responsibilities,
        pipeline_config=request.pipeline_config or {},
        data_sources=request.data_sources,
        enabled_skills=request.enabled_skills,
        is_enabled=True,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return AgentProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        agent_type=profile.agent_type,
        display_name=profile.display_name,
        display_name_cn=profile.display_name_cn,
        cluster=profile.cluster,
        is_custom=profile.is_custom,
        role_model=profile.role_model,
        fallback_model=profile.fallback_model,
        temperature=profile.temperature,
        max_tokens=profile.max_tokens,
        persona=profile.persona,
        traits=profile.traits or {},
        responsibilities=profile.responsibilities or [],
        pipeline_config=profile.pipeline_config or {},
        data_sources=profile.data_sources or [],
        enabled_skills=profile.enabled_skills or [],
        is_enabled=profile.is_enabled,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/profiles/{profile_id}", response_model=AgentProfileResponse)
async def get_agent_profile(
    profile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific agent profile."""
    profile = (
        db.query(AgentProfile)
        .filter(AgentProfile.id == profile_id, AgentProfile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")

    return AgentProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        agent_type=profile.agent_type,
        display_name=profile.display_name,
        display_name_cn=profile.display_name_cn,
        cluster=profile.cluster,
        is_custom=profile.is_custom,
        role_model=profile.role_model,
        fallback_model=profile.fallback_model,
        temperature=profile.temperature,
        max_tokens=profile.max_tokens,
        persona=profile.persona,
        traits=profile.traits or {},
        responsibilities=profile.responsibilities or [],
        pipeline_config=profile.pipeline_config or {},
        data_sources=profile.data_sources or [],
        enabled_skills=profile.enabled_skills or [],
        is_enabled=profile.is_enabled,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.put("/profiles/{profile_id}", response_model=AgentProfileResponse)
async def update_agent_profile(
    profile_id: str,
    request: AgentProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an agent profile."""
    profile = (
        db.query(AgentProfile)
        .filter(AgentProfile.id == profile_id, AgentProfile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")

    # Update fields
    if request.display_name is not None:
        profile.display_name = request.display_name
    if request.display_name_cn is not None:
        profile.display_name_cn = request.display_name_cn
    if request.role_model is not None:
        profile.role_model = request.role_model
    if request.fallback_model is not None:
        profile.fallback_model = request.fallback_model
    if request.temperature is not None:
        profile.temperature = request.temperature
    if request.max_tokens is not None:
        profile.max_tokens = request.max_tokens
    if request.persona is not None:
        profile.persona = request.persona
    if request.traits is not None:
        profile.traits = request.traits
    if request.responsibilities is not None:
        profile.responsibilities = request.responsibilities
    if request.pipeline_config is not None:
        profile.pipeline_config = request.pipeline_config
    if request.data_sources is not None:
        profile.data_sources = request.data_sources
    if request.enabled_skills is not None:
        profile.enabled_skills = request.enabled_skills
    if request.is_enabled is not None:
        profile.is_enabled = request.is_enabled

    db.commit()
    db.refresh(profile)

    return AgentProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        agent_type=profile.agent_type,
        display_name=profile.display_name,
        display_name_cn=profile.display_name_cn,
        cluster=profile.cluster,
        is_custom=profile.is_custom,
        role_model=profile.role_model,
        fallback_model=profile.fallback_model,
        temperature=profile.temperature,
        max_tokens=profile.max_tokens,
        persona=profile.persona,
        traits=profile.traits or {},
        responsibilities=profile.responsibilities or [],
        pipeline_config=profile.pipeline_config or {},
        data_sources=profile.data_sources or [],
        enabled_skills=profile.enabled_skills or [],
        is_enabled=profile.is_enabled,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent_profile(
    profile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an agent profile."""
    profile = (
        db.query(AgentProfile)
        .filter(AgentProfile.id == profile_id, AgentProfile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")

    db.delete(profile)
    db.commit()


@router.post(
    "/profiles/{profile_id}/clone",
    response_model=AgentProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def clone_agent_profile(
    profile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Clone an agent profile."""
    # Check if cloning from default or existing profile
    original = (
        db.query(AgentProfile)
        .filter(AgentProfile.id == profile_id, AgentProfile.user_id == current_user.id)
        .first()
    )

    if original:
        # Clone from existing profile
        new_profile = AgentProfile(
            user_id=current_user.id,
            agent_type=f"{original.agent_type}_copy",
            display_name=f"{original.display_name} (Copy)",
            display_name_cn=f"{original.display_name_cn} (副本)",
            cluster=original.cluster,
            is_custom=True,
            role_model=original.role_model,
            fallback_model=original.fallback_model,
            temperature=original.temperature,
            max_tokens=original.max_tokens,
            persona=original.persona,
            traits=original.traits,
            responsibilities=original.responsibilities,
            pipeline_config=original.pipeline_config,
            data_sources=original.data_sources,
            enabled_skills=original.enabled_skills,
            is_enabled=True,
        )
    else:
        raise HTTPException(status_code=404, detail="Agent profile not found")

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    return AgentProfileResponse(
        id=new_profile.id,
        user_id=new_profile.user_id,
        agent_type=new_profile.agent_type,
        display_name=new_profile.display_name,
        display_name_cn=new_profile.display_name_cn,
        cluster=new_profile.cluster,
        is_custom=new_profile.is_custom,
        role_model=new_profile.role_model,
        fallback_model=new_profile.fallback_model,
        temperature=new_profile.temperature,
        max_tokens=new_profile.max_tokens,
        persona=new_profile.persona,
        traits=new_profile.traits or {},
        responsibilities=new_profile.responsibilities or [],
        pipeline_config=new_profile.pipeline_config or {},
        data_sources=new_profile.data_sources or [],
        enabled_skills=new_profile.enabled_skills or [],
        is_enabled=new_profile.is_enabled,
        created_at=new_profile.created_at,
        updated_at=new_profile.updated_at,
    )


@router.post("/profiles/init-defaults", status_code=status.HTTP_201_CREATED)
async def initialize_default_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Initialize default agent profiles for the current user."""
    # Check if user already has profiles
    existing_count = (
        db.query(AgentProfile)
        .filter(AgentProfile.user_id == current_user.id, AgentProfile.is_custom == False)
        .count()
    )

    if existing_count > 0:
        return {"message": "Default profiles already initialized", "count": existing_count}

    # Create default profiles
    created = 0
    for agent in DEFAULT_AGENTS:
        profile = AgentProfile(
            user_id=current_user.id,
            agent_type=agent["agent_type"],
            display_name=agent["display_name"],
            display_name_cn=agent["display_name_cn"],
            cluster=agent["cluster"],
            is_custom=False,
            role_model=agent["role_model"],
            fallback_model=agent.get("fallback_model"),
            temperature=agent["temperature"],
            max_tokens=agent["max_tokens"],
            persona=agent["persona"],
            traits=agent["traits"],
            responsibilities=agent["responsibilities"],
            pipeline_config={},
            data_sources=agent["data_sources"],
            enabled_skills=agent["enabled_skills"],
            is_enabled=True,
        )
        db.add(profile)
        created += 1

    db.commit()
    return {"message": "Default profiles initialized", "count": created}


@router.post("/profiles/{profile_id}/test", response_model=AgentTestResponse)
async def test_agent(
    profile_id: str,
    request: AgentTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Test an agent with a simple task."""
    import litellm

    profile = (
        db.query(AgentProfile)
        .filter(AgentProfile.id == profile_id, AgentProfile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")

    # Get API keys from file storage
    api_keys = get_user_api_keys_for_agent(current_user.id)
    if not api_keys:
        raise HTTPException(status_code=400, detail="请先在设置页面配置 API Keys")

    # Determine model and API key
    model = profile.role_model
    api_key = None
    base_url = None

    if "openai" in model and api_keys.get("openai"):
        api_key = api_keys["openai"]
    elif "anthropic" in model and api_keys.get("anthropic"):
        api_key = api_keys["anthropic"]
    elif "google" in model and api_keys.get("google"):
        api_key = api_keys["google"]
    elif "deepseek" in model and api_keys.get("deepseek"):
        api_key = api_keys["deepseek"]
        base_url = "https://api.deepseek.com/v1"
    elif "qwen" in model and api_keys.get("dashscope"):
        api_key = api_keys["dashscope"]
    elif api_keys.get("openai"):
        # Fallback to OpenAI if available
        model = "openai/gpt-4o"
        api_key = api_keys["openai"]
    elif api_keys.get("deepseek"):
        # Fallback to DeepSeek
        model = "deepseek/deepseek-chat"
        api_key = api_keys["deepseek"]
        base_url = "https://api.deepseek.com/v1"
    else:
        raise HTTPException(status_code=400, detail="No suitable API key found for this model")

    try:
        completion_kwargs = {
            "model": model,
            "messages": [
                {"role": "system", "content": profile.persona or "You are a helpful assistant."},
                {"role": "user", "content": request.task},
            ],
            "max_tokens": min(profile.max_tokens, 1000),  # Limit for test
            "temperature": profile.temperature,
            "api_key": api_key,
        }
        if base_url:
            completion_kwargs["api_base"] = base_url

        response = await litellm.acompletion(**completion_kwargs)

        result = response.choices[0].message.content
        tokens_used = response.usage.total_tokens if response.usage else 0

        return AgentTestResponse(
            agent_type=profile.agent_type,
            task=request.task,
            result=result,
            tokens_used=tokens_used,
            model_used=model,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent test failed: {str(e)}")
