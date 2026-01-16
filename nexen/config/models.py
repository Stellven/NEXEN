"""
Model configuration and routing rules for NEXEN.

Optimized for three providers: OpenAI, Anthropic (Claude), and Google (Gemini).
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

    model_id: str
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
# Model Definitions (Only OpenAI, Anthropic, Google)
# =============================================================================

MODELS: dict[str, ModelConfig] = {
    # -------------------------------------------------------------------------
    # OpenAI Models
    # -------------------------------------------------------------------------
    "openai/o3": ModelConfig(
        model_id="o3",
        provider="openai",
        display_name="OpenAI o3",
        max_tokens=8192,
        cost_tier=4,
        fallback="claude-opus-4",
    ),
    "openai/o3-mini": ModelConfig(
        model_id="o3-mini",
        provider="openai",
        display_name="OpenAI o3-mini",
        max_tokens=8192,
        cost_tier=3,
        fallback="claude-sonnet-4",
    ),
    "gpt-4o": ModelConfig(
        model_id="gpt-4o",
        provider="openai",
        display_name="GPT-4o",
        max_tokens=4096,
        supports_vision=True,
        cost_tier=2,
        fallback="claude-sonnet-4",
    ),
    "gpt-4o-mini": ModelConfig(
        model_id="gpt-4o-mini",
        provider="openai",
        display_name="GPT-4o Mini",
        max_tokens=4096,
        supports_vision=True,
        cost_tier=1,
        fallback="gemini-2-flash",
    ),

    # -------------------------------------------------------------------------
    # Anthropic Models
    # -------------------------------------------------------------------------
    "claude-opus-4": ModelConfig(
        model_id="claude-opus-4-20250514",
        provider="anthropic",
        display_name="Claude Opus 4",
        max_tokens=8192,
        cost_tier=4,
        fallback="gpt-4o",
    ),
    "claude-sonnet-4": ModelConfig(
        model_id="claude-sonnet-4-20250514",
        provider="anthropic",
        display_name="Claude Sonnet 4",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=2,
        fallback="gpt-4o",
    ),
    "claude-haiku-3": ModelConfig(
        model_id="claude-3-haiku-20240307",
        provider="anthropic",
        display_name="Claude Haiku 3",
        max_tokens=4096,
        cost_tier=1,
        fallback="gpt-4o-mini",
    ),

    # -------------------------------------------------------------------------
    # Google Models
    # -------------------------------------------------------------------------
    "gemini-2-pro": ModelConfig(
        model_id="gemini-2.0-pro",
        provider="google",
        display_name="Gemini 2 Pro",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=2,
        fallback="claude-sonnet-4",
    ),
    "gemini-2-flash": ModelConfig(
        model_id="gemini-2.0-flash",
        provider="google",
        display_name="Gemini 2 Flash",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=1,
        fallback="gpt-4o-mini",
    ),
    "gemini-1.5-pro": ModelConfig(
        model_id="gemini-1.5-pro",
        provider="google",
        display_name="Gemini 1.5 Pro",
        max_tokens=8192,
        supports_vision=True,
        cost_tier=2,
        fallback="claude-sonnet-4",
    ),
}


# =============================================================================
# Routing Rules (Updated for 3 providers only)
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
        primary="openai/o3",
        fallback="claude-opus-4",
        reason="o3 has strongest mathematical reasoning capabilities",
    ),
    TaskType.LOGIC_PROOF: RoutingRule(
        primary="openai/o3",
        fallback="claude-opus-4",
        reason="o3 excels at formal logic and proofs",
    ),
    TaskType.CODE_GENERATION: RoutingRule(
        primary="claude-sonnet-4",
        fallback="gpt-4o",
        reason="Claude produces high-quality, well-documented code",
    ),
    TaskType.CODE_REVIEW: RoutingRule(
        primary="claude-sonnet-4",
        fallback="gpt-4o",
        reason="Claude is thorough in code review",
    ),
    TaskType.CRITIQUE: RoutingRule(
        primary="openai/o3-mini",
        fallback="claude-sonnet-4",
        reason="o3-mini is fast and effective for critique",
    ),
    TaskType.COMPLEX_PLANNING: RoutingRule(
        primary="claude-opus-4",
        fallback="gpt-4o",
        reason="Opus excels at long-horizon planning",
    ),
    TaskType.GENEALOGY: RoutingRule(
        primary="claude-opus-4",
        fallback="gpt-4o",
        reason="Complex reasoning needed for tracing lineages",
    ),
    TaskType.HISTORY_ANALYSIS: RoutingRule(
        primary="claude-opus-4",
        fallback="gpt-4o",
        reason="Deep analysis of technical evolution",
    ),
    TaskType.PAPER_ANALYSIS: RoutingRule(
        primary="claude-sonnet-4",
        fallback="gpt-4o",
        reason="Good balance of depth and speed",
    ),
    # Social media now uses GPT-4o (which has web browsing in ChatGPT)
    TaskType.SOCIAL_MEDIA: RoutingRule(
        primary="gpt-4o",
        fallback="gemini-2-pro",
        reason="GPT-4o with web search for social media monitoring",
    ),
    # Chinese content: Claude and GPT-4o both handle Chinese well
    TaskType.CHINESE_CONTENT: RoutingRule(
        primary="claude-sonnet-4",
        fallback="gpt-4o",
        reason="Claude handles Chinese content effectively",
    ),
    TaskType.IMAGE_ANALYSIS: RoutingRule(
        primary="gemini-2-pro",
        fallback="gpt-4o",
        reason="Gemini has strongest vision capabilities",
    ),
    TaskType.WRITING: RoutingRule(
        primary="claude-sonnet-4",
        fallback="gpt-4o",
        reason="Claude produces high-quality academic writing",
    ),
    TaskType.SUMMARIZATION: RoutingRule(
        primary="claude-sonnet-4",
        fallback="gemini-2-flash",
        reason="Good at extracting key information",
    ),
    TaskType.PROMPT_GENERATION: RoutingRule(
        primary="gemini-2-pro",
        fallback="claude-sonnet-4",
        reason="Gemini optimized for prompt engineering",
    ),
    TaskType.GENERAL: RoutingRule(
        primary="claude-sonnet-4",
        fallback="gpt-4o",
        reason="Best general-purpose model",
    ),
}

# Language-specific routing overrides (only using 3 providers)
LANGUAGE_ROUTING: dict[Language, list[str]] = {
    Language.CHINESE: ["claude-sonnet-4", "gpt-4o", "gemini-2-pro"],
    Language.ENGLISH: ["claude-sonnet-4", "gpt-4o", "gemini-2-pro"],
}


# Combined routing table for quick lookup
MODEL_ROUTING = {
    "task_types": TASK_TYPE_ROUTING,
    "languages": LANGUAGE_ROUTING,
    "models": MODELS,
}
