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
        fallback="anthropic/claude-3-5-sonnet-20241022",
    ),
    "openai/gpt-4o-mini": ModelConfig(
        model_id="openai/gpt-4o-mini",
        provider="openai",
        display_name="GPT-4o Mini",
        max_tokens=4096,
        supports_vision=True,
        cost_tier=1,
        fallback="google/gemini-2.0-flash",
    ),
    "openai/o1": ModelConfig(
        model_id="openai/o1",
        provider="openai",
        display_name="OpenAI o1",
        max_tokens=8192,
        cost_tier=4,
        fallback="anthropic/claude-3-5-sonnet-20241022",
    ),
    "openai/o1-mini": ModelConfig(
        model_id="openai/o1-mini",
        provider="openai",
        display_name="OpenAI o1-mini",
        max_tokens=8192,
        cost_tier=3,
        fallback="anthropic/claude-3-5-sonnet-20241022",
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
        fallback="openai/gpt-4o",
    ),
    "anthropic/claude-3-opus-20240229": ModelConfig(
        model_id="anthropic/claude-3-opus-20240229",
        provider="anthropic",
        display_name="Claude 3 Opus",
        max_tokens=4096,
        supports_vision=True,
        cost_tier=4,
        fallback="openai/gpt-4o",
    ),
    "anthropic/claude-3-haiku-20240307": ModelConfig(
        model_id="anthropic/claude-3-haiku-20240307",
        provider="anthropic",
        display_name="Claude 3 Haiku",
        max_tokens=4096,
        cost_tier=1,
        fallback="openai/gpt-4o-mini",
    ),

    # -------------------------------------------------------------------------
    # Google Models
    # -------------------------------------------------------------------------
    "google/gemini-2.0-pro": ModelConfig(
        model_id="google/gemini-2.0-pro",
        provider="google",
        display_name="Gemini 2 Pro",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=2,
        fallback="anthropic/claude-3-5-sonnet-20241022",
    ),
    "google/gemini-2.0-flash": ModelConfig(
        model_id="google/gemini-2.0-flash",
        provider="google",
        display_name="Gemini 2 Flash",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=1,
        fallback="openai/gpt-4o-mini",
    ),
    "google/gemini-1.5-pro": ModelConfig(
        model_id="google/gemini-1.5-pro",
        provider="google",
        display_name="Gemini 1.5 Pro",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=2,
        fallback="anthropic/claude-3-5-sonnet-20241022",
    ),
}

# Simplified aliases for easier reference
MODEL_ALIASES = {
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
    "o1": "openai/o1",
    "o1-mini": "openai/o1-mini",
    "claude-sonnet": "anthropic/claude-3-5-sonnet-20241022",
    "claude-opus": "anthropic/claude-3-opus-20240229",
    "claude-haiku": "anthropic/claude-3-haiku-20240307",
    "gemini-pro": "google/gemini-2.0-pro",
    "gemini-flash": "google/gemini-2.0-flash",
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
        primary="openai/o1",
        fallback="anthropic/claude-3-opus-20240229",
        reason="o1 has strongest mathematical reasoning capabilities",
    ),
    TaskType.LOGIC_PROOF: RoutingRule(
        primary="openai/o1",
        fallback="anthropic/claude-3-opus-20240229",
        reason="o1 excels at formal logic and proofs",
    ),
    TaskType.CODE_GENERATION: RoutingRule(
        primary="anthropic/claude-3-5-sonnet-20241022",
        fallback="openai/gpt-4o",
        reason="Claude produces high-quality, well-documented code",
    ),
    TaskType.CODE_REVIEW: RoutingRule(
        primary="anthropic/claude-3-5-sonnet-20241022",
        fallback="openai/gpt-4o",
        reason="Claude is thorough in code review",
    ),
    TaskType.CRITIQUE: RoutingRule(
        primary="openai/o1-mini",
        fallback="anthropic/claude-3-5-sonnet-20241022",
        reason="o1-mini is fast and effective for critique",
    ),
    TaskType.COMPLEX_PLANNING: RoutingRule(
        primary="anthropic/claude-3-opus-20240229",
        fallback="openai/gpt-4o",
        reason="Opus excels at long-horizon planning",
    ),
    TaskType.GENEALOGY: RoutingRule(
        primary="anthropic/claude-3-opus-20240229",
        fallback="openai/gpt-4o",
        reason="Complex reasoning needed for tracing lineages",
    ),
    TaskType.HISTORY_ANALYSIS: RoutingRule(
        primary="anthropic/claude-3-opus-20240229",
        fallback="openai/gpt-4o",
        reason="Deep analysis of technical evolution",
    ),
    TaskType.PAPER_ANALYSIS: RoutingRule(
        primary="anthropic/claude-3-5-sonnet-20241022",
        fallback="openai/gpt-4o",
        reason="Good balance of depth and speed",
    ),
    TaskType.SOCIAL_MEDIA: RoutingRule(
        primary="openai/gpt-4o",
        fallback="google/gemini-2.0-pro",
        reason="GPT-4o with web search for social media monitoring",
    ),
    TaskType.CHINESE_CONTENT: RoutingRule(
        primary="anthropic/claude-3-5-sonnet-20241022",
        fallback="openai/gpt-4o",
        reason="Claude handles Chinese content effectively",
    ),
    TaskType.IMAGE_ANALYSIS: RoutingRule(
        primary="google/gemini-2.0-pro",
        fallback="openai/gpt-4o",
        reason="Gemini has strongest vision capabilities",
    ),
    TaskType.WRITING: RoutingRule(
        primary="anthropic/claude-3-5-sonnet-20241022",
        fallback="openai/gpt-4o",
        reason="Claude produces high-quality academic writing",
    ),
    TaskType.SUMMARIZATION: RoutingRule(
        primary="anthropic/claude-3-5-sonnet-20241022",
        fallback="google/gemini-2.0-flash",
        reason="Good at extracting key information",
    ),
    TaskType.PROMPT_GENERATION: RoutingRule(
        primary="google/gemini-2.0-pro",
        fallback="anthropic/claude-3-5-sonnet-20241022",
        reason="Gemini optimized for prompt engineering",
    ),
    TaskType.GENERAL: RoutingRule(
        primary="anthropic/claude-3-5-sonnet-20241022",
        fallback="openai/gpt-4o",
        reason="Best general-purpose model",
    ),
}

# Language-specific routing overrides
LANGUAGE_ROUTING: dict[Language, list[str]] = {
    Language.CHINESE: [
        "anthropic/claude-3-5-sonnet-20241022",
        "openai/gpt-4o",
        "google/gemini-2.0-pro",
    ],
    Language.ENGLISH: [
        "anthropic/claude-3-5-sonnet-20241022",
        "openai/gpt-4o",
        "google/gemini-2.0-pro",
    ],
}


# Combined routing table for quick lookup
MODEL_ROUTING = {
    "task_types": TASK_TYPE_ROUTING,
    "languages": LANGUAGE_ROUTING,
    "models": MODELS,
}
