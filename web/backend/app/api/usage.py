"""
API Usage statistics endpoints.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.auth.deps import get_current_active_user
from app.services.usage_service import get_usage_summary, get_daily_usage

router = APIRouter()


# Response Models
class ModelUsage(BaseModel):
    requests: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost: float


class ProviderUsage(BaseModel):
    requests: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost: float
    models: dict[str, ModelUsage]


class UsageSummaryResponse(BaseModel):
    period_days: int
    start_date: str
    end_date: str
    total_requests: int
    total_tokens: int
    total_cost: float
    by_provider: dict[str, ProviderUsage]


class DailyProviderUsage(BaseModel):
    requests: int
    tokens: int
    cost: float


class DailyUsageItem(BaseModel):
    date: str
    requests: int
    tokens: int
    cost: float
    providers: dict[str, DailyProviderUsage]


class DailyUsageResponse(BaseModel):
    daily: List[DailyUsageItem]


# Endpoints
@router.get("/summary", response_model=UsageSummaryResponse)
async def get_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days to include"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get usage summary for the specified period."""
    summary = get_usage_summary(db, current_user.id, days)
    return summary


@router.get("/daily", response_model=DailyUsageResponse)
async def get_daily(
    days: int = Query(7, ge=1, le=90, description="Number of days to include"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get daily usage breakdown."""
    daily = get_daily_usage(db, current_user.id, days, provider)
    return {"daily": daily}


@router.get("/providers")
async def get_supported_providers():
    """Get list of supported providers with their model pricing."""
    from app.services.usage_service import MODEL_PRICING

    providers = {
        "openai": {
            "name": "OpenAI",
            "models": {k: v for k, v in MODEL_PRICING.items() if k.startswith("gpt") or k.startswith("o1") or k.startswith("o3")},
        },
        "anthropic": {
            "name": "Anthropic",
            "models": {k: v for k, v in MODEL_PRICING.items() if "claude" in k},
        },
        "google": {
            "name": "Google",
            "models": {k: v for k, v in MODEL_PRICING.items() if "gemini" in k},
        },
        "deepseek": {
            "name": "DeepSeek",
            "models": {k: v for k, v in MODEL_PRICING.items() if "deepseek" in k},
        },
        "dashscope": {
            "name": "DashScope (Qwen)",
            "models": {k: v for k, v in MODEL_PRICING.items() if "qwen" in k},
        },
    }
    return providers
