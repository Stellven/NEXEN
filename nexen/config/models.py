"""
Model configuration and routing rules for NEXEN.

Optimized for three providers: OpenAI, Anthropic (Claude), and Google (Gemini).
All model IDs use LiteLLM format: provider/model-name
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class TaskType(str, Enum):
    """Types of tasks that can be routed to different models."""

    MATH_REASONING = "math_reasoning"
    LOGIC_PROOF = "logic_proof"
    CODE_GENERATION = "code_generation"
    CODE_REVIEW = "code_review"
    CRITIQUE = "critique"
    COMPLEX_PLANNING = "complex_planning"
    GENEALOGY = "genealogy"
    HISTORY_ANALYSIS = "history_analysis"
    PAPER_ANALYSIS = "paper_analysis"
    SOCIAL_MEDIA = "social_media"
    CHINESE_CONTENT = "chinese_content"
    IMAGE_ANALYSIS = "image_analysis"
    WRITING = "writing"
    SUMMARIZATION = "summarization"
    PROMPT_GENERATION = "prompt_generation"
    GENERAL = "general"


class Language(str, Enum):
    """Supported languages."""

    ENGLISH = "en"
    CHINESE = "zh"
    AUTO = "auto"


@dataclass
class ModelConfig:
    """Configuration for a specific model."""

    model_id: str  # LiteLLM format: provider/model-name
    provider: str
    display_name: str
    max_tokens: int = 4096
    supports_vision: bool = False
    supports_tools: bool = True
    cost_tier: int = 1  # 1=low, 2=medium, 3=high, 4=very high
    fallback: Optional[str] = None

    # Rate limits
    rpm_limit: int = 60  # requests per minute
    tpm_limit: int = 100000  # tokens per minute


# =============================================================================
# Model Definitions (LiteLLM format: provider/model-name)
# =============================================================================

MODELS: dict[str, ModelConfig] = {
    # -------------------------------------------------------------------------
    # OpenAI Models
    # -------------------------------------------------------------------------
    "openai/gpt-4o": ModelConfig(
        model_id="openai/gpt-4o",
        provider="openai",
        display_name="GPT-4o",
        max_tokens=4096,
        supports_vision=True,
        cost_tier=2,
        fallback="gemini/gemini-2.0-flash",
    ),
    "openai/gpt-4o-mini": ModelConfig(
        model_id="openai/gpt-4o-mini",
        provider="openai",
        display_name="GPT-4o Mini",
        max_tokens=4096,
        supports_vision=True,
        cost_tier=1,
        fallback="gemini/gemini-2.0-flash",
    ),
    "openai/o1": ModelConfig(
        model_id="openai/o1",
        provider="openai",
        display_name="OpenAI o1",
        max_tokens=8192,
        cost_tier=4,
        fallback="gemini/gemini-2.0-flash",
    ),
    "openai/o1-mini": ModelConfig(
        model_id="openai/o1-mini",
        provider="openai",
        display_name="OpenAI o1-mini",
        max_tokens=8192,
        cost_tier=3,
        fallback="gemini/gemini-2.0-flash",
    ),

    # -------------------------------------------------------------------------
    # Anthropic Models
    # -------------------------------------------------------------------------
    "anthropic/claude-3-5-sonnet-20241022": ModelConfig(
        model_id="anthropic/claude-3-5-sonnet-20241022",
        provider="anthropic",
        display_name="Claude 3.5 Sonnet",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=2,
        fallback="gemini/gemini-2.0-flash",
    ),
    "anthropic/claude-3-opus-20240229": ModelConfig(
        model_id="anthropic/claude-3-opus-20240229",
        provider="anthropic",
        display_name="Claude 3 Opus",
        max_tokens=4096,
        supports_vision=True,
        cost_tier=4,
        fallback="gemini/gemini-2.0-flash",
    ),
    "anthropic/claude-3-haiku-20240307": ModelConfig(
        model_id="anthropic/claude-3-haiku-20240307",
        provider="anthropic",
        display_name="Claude 3 Haiku",
        max_tokens=4096,
        cost_tier=1,
        fallback="gemini/gemini-2.0-flash",
    ),

    # -------------------------------------------------------------------------
    # Google Models
    # -------------------------------------------------------------------------
    "gemini/gemini-2.0-pro": ModelConfig(
        model_id="gemini/gemini-2.0-pro",
        provider="google",
        display_name="Gemini 2 Pro",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=2,
        fallback="gemini/gemini-2.0-flash",
    ),
    "gemini/gemini-2.0-flash": ModelConfig(
        model_id="gemini/gemini-2.0-flash",
        provider="google",
        display_name="Gemini 2 Flash",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=1,
        fallback="openai/gpt-4o-mini",
    ),
    "gemini/gemini-1.5-pro": ModelConfig(
        model_id="gemini/gemini-1.5-pro",
        provider="google",
        display_name="Gemini 1.5 Pro",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=2,
        fallback="gemini/gemini-2.0-flash",
    ),

    # -------------------------------------------------------------------------
    # Local Models
    # -------------------------------------------------------------------------
    "local/lm-studio": ModelConfig(
        model_id="local/lm-studio",
        provider="local",
        display_name="Local (LM Studio)",
        max_tokens=8192,
        supports_vision=False,
        cost_tier=0,
        fallback="gemini/gemini-2.0-flash",
    ),
}

# Simplified aliases for easier reference
MODEL_ALIASES = {
    # OpenAI aliases
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
    "o1": "openai/o1",
    "o1-mini": "openai/o1-mini",
    # Anthropic aliases
    "claude-sonnet": "anthropic/claude-3-5-sonnet-20241022",
    "claude-sonnet-4": "anthropic/claude-3-5-sonnet-20241022",  # Legacy alias
    "claude-opus": "anthropic/claude-3-opus-20240229",
    "claude-opus-4": "anthropic/claude-3-opus-20240229",  # Legacy alias
    "claude-haiku": "anthropic/claude-3-haiku-20240307",
    # Google/Gemini aliases
    "gemini-pro": "gemini/gemini-2.0-pro",
    "gemini-flash": "gemini/gemini-2.0-flash",
    "google/gemini-2.0-flash": "gemini/gemini-2.0-flash",
    "google/gemini-2.0-pro": "gemini/gemini-2.0-pro",
    "google/gemini-1.5-pro": "gemini/gemini-1.5-pro",
    # Local aliases
    "lm-studio": "local/lm-studio",
    "local": "local/lm-studio",
    "local/openai/v1": "local/lm-studio",
}


def resolve_model(model_name: str) -> str:
    """Resolve model alias to full LiteLLM model ID."""
    return MODEL_ALIASES.get(model_name, model_name)


# =============================================================================
# Routing Rules (Updated for LiteLLM format)
# =============================================================================

@dataclass
class RoutingRule:
    """A rule for routing tasks to models."""

    primary: str
    fallback: Optional[str] = None
    reason: str = ""


# Task type to model routing
TASK_TYPE_ROUTING: dict[TaskType, RoutingRule] = {
    TaskType.MATH_REASONING: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="openai/o1",
        reason="Gemini 2.0 Flash for speed/cost, falling back to o1 for capability",
    ),
    TaskType.LOGIC_PROOF: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="openai/o1",
        reason="Gemini 2.0 Flash for speed/cost, falling back to o1",
    ),
    TaskType.CODE_GENERATION: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="anthropic/claude-3-5-sonnet-20241022",
        reason="Gemini 2.0 Flash for code generation",
    ),
    TaskType.CODE_REVIEW: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="anthropic/claude-3-5-sonnet-20241022",
        reason="Gemini 2.0 Flash for code review",
    ),
    TaskType.CRITIQUE: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="openai/o1-mini",
        reason="Gemini 2.0 Flash for critique",
    ),
    TaskType.COMPLEX_PLANNING: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="anthropic/claude-3-opus-20240229",
        reason="Gemini 2.0 Flash for planning",
    ),
    TaskType.GENEALOGY: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="anthropic/claude-3-opus-20240229",
        reason="Gemini 2.0 Flash for genealogy",
    ),
    TaskType.HISTORY_ANALYSIS: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="anthropic/claude-3-opus-20240229",
        reason="Gemini 2.0 Flash for history analysis",
    ),
    TaskType.PAPER_ANALYSIS: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="anthropic/claude-3-5-sonnet-20241022",
        reason="Gemini 2.0 Flash for paper analysis",
    ),
    TaskType.SOCIAL_MEDIA: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="openai/gpt-4o",
        reason="Gemini 2.0 Flash for social media",
    ),
    TaskType.CHINESE_CONTENT: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="anthropic/claude-3-5-sonnet-20241022",
        reason="Gemini 2.0 Flash supports Chinese",
    ),
    TaskType.IMAGE_ANALYSIS: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="openai/gpt-4o",
        reason="Gemini 2.0 Flash has vision capabilities",
    ),
    TaskType.WRITING: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="anthropic/claude-3-5-sonnet-20241022",
        reason="Gemini 2.0 Flash for writing",
    ),
    TaskType.SUMMARIZATION: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="anthropic/claude-3-5-sonnet-20241022",
        reason="Gemini 2.0 Flash for summarization",
    ),
    TaskType.PROMPT_GENERATION: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="gemini/gemini-2.0-pro",
        reason="Gemini optimized for prompt engineering",
    ),
    TaskType.GENERAL: RoutingRule(
        primary="gemini/gemini-2.0-flash",
        fallback="openai/gpt-4o",
        reason="Gemini 2.0 Flash as general purpose default",
    ),
}

# Language-specific routing overrides
LANGUAGE_ROUTING: dict[Language, list[str]] = {
    Language.CHINESE: [
        "gemini/gemini-2.0-flash",
        "anthropic/claude-3-5-sonnet-20241022",
        "openai/gpt-4o",
    ],
    Language.ENGLISH: [
        "gemini/gemini-2.0-flash",
        "anthropic/claude-3-5-sonnet-20241022",
        "openai/gpt-4o",
    ],
}


# Combined routing table for quick lookup
MODEL_ROUTING = {
    "task_types": TASK_TYPE_ROUTING,
    "languages": LANGUAGE_ROUTING,
    "models": MODELS,
}
