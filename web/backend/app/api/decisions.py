"""
Decision Analysis API - AI Decision/Simulation Module.
"""

import json
import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, DecisionAnalysis
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()

# =============================================================================
# Pydantic Models
# =============================================================================

class OptionData(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""


class CriterionData(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    type: str = "benefit"  # "benefit" or "cost"


class ScenarioData(BaseModel):
    id: str
    name: str
    weight_adjustments: dict[str, float]  # {criteria_id: adjusted_weight}
    results: Optional[dict[str, float]] = None  # {option_id: score}
    ranking: Optional[list[str]] = None


# Request Models
class DecisionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class DecisionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None


class OptionsUpdate(BaseModel):
    options: list[OptionData]


class CriteriaUpdate(BaseModel):
    criteria: list[CriterionData]


class WeightsUpdate(BaseModel):
    weights: dict[str, float]  # {criteria_id: weight (0-1)}


class ScoresUpdate(BaseModel):
    scores: dict[str, dict[str, float]]  # {option_id: {criteria_id: score (1-10)}}


class ScenarioCreate(BaseModel):
    name: str
    weight_adjustments: dict[str, float]


class SimulateRequest(BaseModel):
    scenario_id: str


class AIRecommendationRequest(BaseModel):
    prompt: Optional[str] = None
    model: str = "openai/gpt-4o"


# Response Models
class DecisionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    options: list[dict]
    criteria: list[dict]
    weights: dict[str, float]
    scores: dict[str, dict[str, float]]
    results: dict[str, float]
    ranking: list[str]
    scenarios: list[dict]
    ai_recommendation: Optional[str]
    ai_analysis: Optional[dict]
    status: str
    created_at: str
    updated_at: str


class DecisionListItem(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    option_count: int
    criteria_count: int
    created_at: str
    updated_at: str


class DecisionListResponse(BaseModel):
    analyses: list[DecisionListItem]
    total: int
    page: int
    page_size: int


class CalculationResult(BaseModel):
    results: dict[str, float]
    ranking: list[str]


# =============================================================================
# Helper Functions
# =============================================================================

def calculate_weighted_scores(
    options: list[dict],
    criteria: list[dict],
    weights: dict[str, float],
    scores: dict[str, dict[str, float]]
) -> tuple[dict[str, float], list[str]]:
    """
    Calculate weighted scores for each option.

    For "benefit" criteria: higher is better
    For "cost" criteria: lower is better (invert the score)
    """
    results = {}

    for option in options:
        option_id = option["id"]
        total_score = 0.0

        for criterion in criteria:
            criterion_id = criterion["id"]
            weight = weights.get(criterion_id, 0)
            score = scores.get(option_id, {}).get(criterion_id, 0)

            # Normalize: cost criteria need inversion (11 - score)
            if criterion.get("type") == "cost":
                score = 11 - score  # Invert 1-10 to 10-1

            total_score += weight * score

        results[option_id] = round(total_score, 2)

    # Generate ranking (highest to lowest)
    ranking = sorted(results.keys(), key=lambda x: results[x], reverse=True)

    return results, ranking


def analysis_to_response(analysis: DecisionAnalysis) -> DecisionResponse:
    """Convert database model to response."""
    return DecisionResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        title=analysis.title,
        description=analysis.description,
        options=analysis.options or [],
        criteria=analysis.criteria or [],
        weights=analysis.weights or {},
        scores=analysis.scores or {},
        results=analysis.results or {},
        ranking=analysis.ranking or [],
        scenarios=analysis.scenarios or [],
        ai_recommendation=analysis.ai_recommendation,
        ai_analysis=analysis.ai_analysis,
        status=analysis.status,
        created_at=analysis.created_at.isoformat() if analysis.created_at else "",
        updated_at=analysis.updated_at.isoformat() if analysis.updated_at else "",
    )


# =============================================================================
# CRUD Endpoints
# =============================================================================

@router.get("", response_model=DecisionListResponse)
async def list_analyses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all decision analyses for current user."""
    query = db.query(DecisionAnalysis).filter(DecisionAnalysis.user_id == current_user.id)

    if status:
        query = query.filter(DecisionAnalysis.status == status)

    total = query.count()
    analyses = query.order_by(DecisionAnalysis.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return DecisionListResponse(
        analyses=[
            DecisionListItem(
                id=a.id,
                title=a.title,
                description=a.description,
                status=a.status,
                option_count=len(a.options) if a.options else 0,
                criteria_count=len(a.criteria) if a.criteria else 0,
                created_at=a.created_at.isoformat() if a.created_at else "",
                updated_at=a.updated_at.isoformat() if a.updated_at else "",
            )
            for a in analyses
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=DecisionResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    request: DecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new decision analysis."""
    analysis = DecisionAnalysis(
        id=str(uuid4()),
        user_id=current_user.id,
        title=request.title,
        description=request.description,
        options=[],
        criteria=[],
        weights={},
        scores={},
        results={},
        ranking=[],
        scenarios=[],
        ai_recommendation=None,
        ai_analysis={},
        status="draft",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return analysis_to_response(analysis)


@router.get("/{analysis_id}", response_model=DecisionResponse)
async def get_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific decision analysis."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return analysis_to_response(analysis)


@router.put("/{analysis_id}", response_model=DecisionResponse)
async def update_analysis(
    analysis_id: str,
    request: DecisionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update basic info of a decision analysis."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if request.title is not None:
        analysis.title = request.title
    if request.description is not None:
        analysis.description = request.description
    if request.status is not None:
        analysis.status = request.status

    db.commit()
    db.refresh(analysis)

    return analysis_to_response(analysis)


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a decision analysis."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    db.delete(analysis)
    db.commit()


# =============================================================================
# Matrix Operations
# =============================================================================

@router.put("/{analysis_id}/options", response_model=DecisionResponse)
async def update_options(
    analysis_id: str,
    request: OptionsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update the options (alternatives) list."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    analysis.options = [o.model_dump() for o in request.options]
    db.commit()
    db.refresh(analysis)

    return analysis_to_response(analysis)


@router.put("/{analysis_id}/criteria", response_model=DecisionResponse)
async def update_criteria(
    analysis_id: str,
    request: CriteriaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update the criteria list."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    analysis.criteria = [c.model_dump() for c in request.criteria]
    db.commit()
    db.refresh(analysis)

    return analysis_to_response(analysis)


@router.put("/{analysis_id}/weights", response_model=DecisionResponse)
async def update_weights(
    analysis_id: str,
    request: WeightsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update the criteria weights."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    analysis.weights = request.weights
    db.commit()
    db.refresh(analysis)

    return analysis_to_response(analysis)


@router.put("/{analysis_id}/scores", response_model=DecisionResponse)
async def update_scores(
    analysis_id: str,
    request: ScoresUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update the option scores."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    analysis.scores = request.scores
    db.commit()
    db.refresh(analysis)

    return analysis_to_response(analysis)


# =============================================================================
# Calculation
# =============================================================================

@router.post("/{analysis_id}/calculate", response_model=CalculationResult)
async def calculate_scores(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Calculate weighted scores and ranking."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if not analysis.options or not analysis.criteria:
        raise HTTPException(status_code=400, detail="Options and criteria are required")

    results, ranking = calculate_weighted_scores(
        analysis.options or [],
        analysis.criteria or [],
        analysis.weights or {},
        analysis.scores or {},
    )

    analysis.results = results
    analysis.ranking = ranking
    db.commit()

    return CalculationResult(results=results, ranking=ranking)


# =============================================================================
# Scenarios
# =============================================================================

@router.post("/{analysis_id}/scenarios", response_model=dict)
async def add_scenario(
    analysis_id: str,
    request: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a new scenario."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    scenario = ScenarioData(
        id=str(uuid4()),
        name=request.name,
        weight_adjustments=request.weight_adjustments,
        results=None,
        ranking=None,
    )

    scenarios = analysis.scenarios or []
    scenarios.append(scenario.model_dump())
    analysis.scenarios = scenarios
    db.commit()

    return {"message": "Scenario added", "scenario": scenario.model_dump()}


@router.delete("/{analysis_id}/scenarios/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(
    analysis_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a scenario."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    scenarios = analysis.scenarios or []
    analysis.scenarios = [s for s in scenarios if s.get("id") != scenario_id]
    db.commit()


@router.post("/{analysis_id}/simulate", response_model=CalculationResult)
async def simulate_scenario(
    analysis_id: str,
    request: SimulateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Run simulation for a specific scenario."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Find the scenario
    scenario = next((s for s in (analysis.scenarios or []) if s.get("id") == request.scenario_id), None)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Merge base weights with adjustments
    base_weights = analysis.weights or {}
    adjustments = scenario.get("weight_adjustments", {})
    adjusted_weights = {**base_weights, **adjustments}

    # Normalize weights to sum to 1
    total = sum(adjusted_weights.values())
    if total > 0:
        adjusted_weights = {k: v / total for k, v in adjusted_weights.items()}

    # Calculate with adjusted weights
    results, ranking = calculate_weighted_scores(
        analysis.options or [],
        analysis.criteria or [],
        adjusted_weights,
        analysis.scores or {},
    )

    # Update scenario with results
    scenarios = analysis.scenarios or []
    for s in scenarios:
        if s.get("id") == request.scenario_id:
            s["results"] = results
            s["ranking"] = ranking
            break
    analysis.scenarios = scenarios
    db.commit()

    return CalculationResult(results=results, ranking=ranking)


# =============================================================================
# AI Recommendation
# =============================================================================

def build_decision_prompt(analysis: DecisionAnalysis, prompt: Optional[str] = None) -> tuple[str, str]:
    """Build system and user prompts for AI decision recommendation."""

    options_str = "\n".join([
        f"- {o['name']}: {o.get('description', '')}"
        for o in (analysis.options or [])
    ])

    criteria_str = "\n".join([
        f"- {c['name']} (权重: {(analysis.weights or {}).get(c['id'], 0) * 100:.0f}%, 类型: {'收益型' if c.get('type') == 'benefit' else '成本型'})"
        for c in (analysis.criteria or [])
    ])

    # Build score matrix string
    score_matrix = []
    for option in (analysis.options or []):
        opt_scores = (analysis.scores or {}).get(option['id'], {})
        scores_str = ", ".join([
            f"{c['name']}: {opt_scores.get(c['id'], 'N/A')}"
            for c in (analysis.criteria or [])
        ])
        score_matrix.append(f"  {option['name']}: {scores_str}")

    # Results
    results_str = "\n".join([
        f"- {next((o['name'] for o in (analysis.options or []) if o['id'] == opt_id), opt_id)}: {score:.2f}分"
        for opt_id, score in sorted(
            (analysis.results or {}).items(),
            key=lambda x: x[1],
            reverse=True
        )
    ])

    system_prompt = """你是一位专业的决策分析顾问。请基于提供的决策矩阵数据,分析各选项的优劣并给出推荐建议。

要求:
1. 先总结当前决策情况
2. 分析各选项在不同维度的表现
3. 指出关键差异点
4. 给出明确的推荐及理由
5. 提供风险提示和注意事项
6. 使用Markdown格式输出"""

    ranking_str = " > ".join([
        next((o['name'] for o in (analysis.options or []) if o['id'] == opt_id), opt_id)
        for opt_id in (analysis.ranking or [])
    ])

    user_prompt = f"""请分析以下决策:

## 决策主题
{analysis.title}

## 决策描述
{analysis.description or '无'}

## 备选方案
{options_str}

## 评估标准
{criteria_str}

## 评分矩阵 (1-10分)
{chr(10).join(score_matrix)}

## 加权计算结果
{results_str}

## 当前排名
{ranking_str}
"""

    if prompt:
        user_prompt += f"\n\n## 额外要求\n{prompt}"

    return system_prompt, user_prompt


@router.post("/{analysis_id}/ai-recommendation")
async def generate_ai_recommendation(
    analysis_id: str,
    request: AIRecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generate AI recommendation for the decision analysis (streaming)."""
    analysis = db.query(DecisionAnalysis).filter(
        DecisionAnalysis.id == analysis_id,
        DecisionAnalysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if not analysis.options or not analysis.criteria:
        raise HTTPException(status_code=400, detail="Options and criteria are required")

    system_prompt, user_prompt = build_decision_prompt(analysis, request.prompt)

    async def generate():
        try:
            import litellm

            full_response = ""
            response = await litellm.acompletion(
                model=request.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
            )

            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield f"data: {json.dumps({'content': content})}\n\n"

            # Save recommendation
            analysis.ai_recommendation = full_response
            db.commit()

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            logger.error(f"AI recommendation error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
