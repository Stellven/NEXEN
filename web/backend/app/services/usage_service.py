"""
API Usage tracking service.

Records and retrieves API usage statistics for different providers.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.db.models import APIUsageStats, generate_uuid

logger = logging.getLogger(__name__)

# Cost per 1M tokens (in USD) - updated Jan 2025
MODEL_PRICING = {
    # OpenAI
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4.1": {"input": 2.00, "output": 8.00},
    "gpt-4.1-mini": {"input": 0.40, "output": 1.60},
    "gpt-4.1-nano": {"input": 0.10, "output": 0.40},
    "o1": {"input": 15.00, "output": 60.00},
    "o1-mini": {"input": 1.10, "output": 4.40},
    "o3-mini": {"input": 1.10, "output": 4.40},
    # Anthropic
    "claude-opus-4-5-20251124": {"input": 15.00, "output": 75.00},
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
    # Google
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "gemini-2.0-flash-lite": {"input": 0.075, "output": 0.30},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    # DeepSeek
    "deepseek-chat": {"input": 0.14, "output": 0.28},
    "deepseek-coder": {"input": 0.14, "output": 0.28},
    "deepseek-reasoner": {"input": 0.55, "output": 2.19},
    # Qwen (DashScope)
    "qwen-max": {"input": 0.40, "output": 1.20},
    "qwen-plus": {"input": 0.08, "output": 0.24},
    "qwen-turbo": {"input": 0.02, "output": 0.06},
    "qwen-long": {"input": 0.02, "output": 0.06},
}

# Default pricing for unknown models
DEFAULT_PRICING = {"input": 1.00, "output": 3.00}


def get_provider_from_model(model: str) -> str:
    """Extract provider name from model string."""
    if model.startswith("openai/"):
        return "openai"
    elif model.startswith("anthropic/"):
        return "anthropic"
    elif model.startswith("google/"):
        return "google"
    elif model.startswith("deepseek/"):
        return "deepseek"
    elif model.startswith("qwen/"):
        return "dashscope"
    else:
        # Fallback based on model name patterns
        if "gpt" in model.lower() or model.startswith("o1") or model.startswith("o3"):
            return "openai"
        elif "claude" in model.lower():
            return "anthropic"
        elif "gemini" in model.lower():
            return "google"
        elif "deepseek" in model.lower():
            return "deepseek"
        elif "qwen" in model.lower():
            return "dashscope"
        return "unknown"


def get_model_name(model: str) -> str:
    """Extract clean model name from model string."""
    parts = model.split("/")
    return parts[-1] if len(parts) > 1 else model


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate estimated cost based on token usage."""
    model_name = get_model_name(model)
    pricing = MODEL_PRICING.get(model_name, DEFAULT_PRICING)

    input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
    output_cost = (completion_tokens / 1_000_000) * pricing["output"]

    return round(input_cost + output_cost, 6)


def record_usage(
    db: Session,
    user_id: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> None:
    """Record API usage for a request."""
    try:
        provider = get_provider_from_model(model)
        model_name = get_model_name(model)
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        total_tokens = prompt_tokens + completion_tokens
        cost = calculate_cost(model, prompt_tokens, completion_tokens)

        # Find or create daily stats record
        stats = db.query(APIUsageStats).filter(
            and_(
                APIUsageStats.user_id == user_id,
                APIUsageStats.provider == provider,
                APIUsageStats.date == today,
            )
        ).first()

        if stats:
            # Update existing record
            stats.request_count += 1
            stats.prompt_tokens += prompt_tokens
            stats.completion_tokens += completion_tokens
            stats.total_tokens += total_tokens
            stats.estimated_cost += cost

            # Update model-level breakdown
            model_usage = stats.model_usage or {}
            if model_name not in model_usage:
                model_usage[model_name] = {
                    "requests": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "cost": 0.0,
                }
            model_usage[model_name]["requests"] += 1
            model_usage[model_name]["prompt_tokens"] += prompt_tokens
            model_usage[model_name]["completion_tokens"] += completion_tokens
            model_usage[model_name]["total_tokens"] += total_tokens
            model_usage[model_name]["cost"] += cost
            stats.model_usage = model_usage

            stats.updated_at = datetime.utcnow()
        else:
            # Create new record
            model_usage = {
                model_name: {
                    "requests": 1,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "cost": cost,
                }
            }
            stats = APIUsageStats(
                id=generate_uuid(),
                user_id=user_id,
                provider=provider,
                date=today,
                request_count=1,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost=cost,
                model_usage=model_usage,
            )
            db.add(stats)

        db.commit()
        logger.info(f"Recorded usage: user={user_id}, model={model_name}, tokens={total_tokens}, cost=${cost:.4f}")

    except Exception as e:
        logger.error(f"Failed to record usage: {e}")
        db.rollback()


def get_usage_summary(
    db: Session,
    user_id: str,
    days: int = 30,
) -> Dict[str, Any]:
    """Get usage summary for the specified period."""
    start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)

    stats = db.query(APIUsageStats).filter(
        and_(
            APIUsageStats.user_id == user_id,
            APIUsageStats.date >= start_date,
        )
    ).all()

    # Aggregate by provider
    by_provider = {}
    total_requests = 0
    total_tokens = 0
    total_cost = 0.0

    for stat in stats:
        provider = stat.provider
        if provider not in by_provider:
            by_provider[provider] = {
                "requests": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
                "cost": 0.0,
                "models": {},
            }

        by_provider[provider]["requests"] += stat.request_count
        by_provider[provider]["prompt_tokens"] += stat.prompt_tokens
        by_provider[provider]["completion_tokens"] += stat.completion_tokens
        by_provider[provider]["total_tokens"] += stat.total_tokens
        by_provider[provider]["cost"] += stat.estimated_cost

        # Merge model usage
        if stat.model_usage:
            for model, usage in stat.model_usage.items():
                if model not in by_provider[provider]["models"]:
                    by_provider[provider]["models"][model] = {
                        "requests": 0,
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "total_tokens": 0,
                        "cost": 0.0,
                    }
                for key in ["requests", "prompt_tokens", "completion_tokens", "total_tokens", "cost"]:
                    by_provider[provider]["models"][model][key] += usage.get(key, 0)

        total_requests += stat.request_count
        total_tokens += stat.total_tokens
        total_cost += stat.estimated_cost

    return {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "total_requests": total_requests,
        "total_tokens": total_tokens,
        "total_cost": round(total_cost, 4),
        "by_provider": by_provider,
    }


def get_daily_usage(
    db: Session,
    user_id: str,
    days: int = 7,
    provider: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get daily usage breakdown."""
    start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)

    query = db.query(APIUsageStats).filter(
        and_(
            APIUsageStats.user_id == user_id,
            APIUsageStats.date >= start_date,
        )
    )

    if provider:
        query = query.filter(APIUsageStats.provider == provider)

    stats = query.order_by(APIUsageStats.date.desc()).all()

    # Group by date
    daily = {}
    for stat in stats:
        date_str = stat.date.strftime("%Y-%m-%d")
        if date_str not in daily:
            daily[date_str] = {
                "date": date_str,
                "requests": 0,
                "tokens": 0,
                "cost": 0.0,
                "providers": {},
            }

        daily[date_str]["requests"] += stat.request_count
        daily[date_str]["tokens"] += stat.total_tokens
        daily[date_str]["cost"] += stat.estimated_cost
        daily[date_str]["providers"][stat.provider] = {
            "requests": stat.request_count,
            "tokens": stat.total_tokens,
            "cost": stat.estimated_cost,
        }

    # Sort by date descending
    result = sorted(daily.values(), key=lambda x: x["date"], reverse=True)
    return result
