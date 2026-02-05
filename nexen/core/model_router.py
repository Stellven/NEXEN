"""
Model Router for NEXEN.

Intelligently routes tasks to the optimal model based on:
- Task type (math, code, writing, etc.)
- Language (Chinese, English)
- Modality (text, image)
- Cost constraints
- Model availability
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from nexen.config.models import (
    MODELS,
    TASK_TYPE_ROUTING,
    LANGUAGE_ROUTING,
    TaskType,
    Language,
    ModelConfig,
    RoutingRule,
)
from nexen.config.settings import get_settings

logger = logging.getLogger(__name__)


@dataclass
class Task:
    """A task to be routed to a model."""

    description: str
    task_type: TaskType = TaskType.GENERAL
    language: Language = Language.AUTO
    has_images: bool = False
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None

    # Optional: explicitly request a specific model
    preferred_model: Optional[str] = None

    # Cost control
    allow_expensive: bool = True

    # Context
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        # Auto-detect language if not specified
        if self.language == Language.AUTO:
            self.language = self._detect_language()

    def _detect_language(self) -> Language:
        """Simple language detection based on character analysis."""
        chinese_chars = sum(1 for c in self.description if "\u4e00" <= c <= "\u9fff")
        total_chars = len(self.description.strip())

        if total_chars == 0:
            return Language.ENGLISH

        chinese_ratio = chinese_chars / total_chars
        return Language.CHINESE if chinese_ratio > 0.3 else Language.ENGLISH


@dataclass
class RoutingResult:
    """Result of model routing."""

    model_id: str
    model_config: ModelConfig
    routing_reason: str
    fallback_model: Optional[str] = None
    is_fallback: bool = False


class ModelRouter:
    """
    Intelligent model router for NEXEN.

    Routes tasks to the optimal model based on multiple factors.
    """

    def __init__(self):
        self.settings = get_settings()
        self._cache: dict[str, RoutingResult] = {}

    def route(self, task: Task) -> RoutingResult:
        """
        Route a task to the optimal model.

        Routing priority:
        1. Explicit model preference
        2. Modality requirements (vision)
        3. Language requirements (Chinese)
        4. Task type routing
        5. Default model
        """
        # Check for explicit preference
        if task.preferred_model:
            return self._route_to_model(
                task.preferred_model,
                reason=f"Explicitly requested: {task.preferred_model}",
            )

        # Priority 1: Modality routing (images require vision models)
        if task.has_images:
            result = self._route_for_vision(task)
            if result:
                return result

        # Priority 2: Language routing (Chinese content)
        if task.language == Language.CHINESE and task.task_type != TaskType.MATH_REASONING:
            result = self._route_for_language(task)
            if result:
                return result

        # Priority 3: Task type routing
        result = self._route_for_task_type(task)
        if result:
            return result

        # Fallback: Default model
        return self._route_to_model(
            self.settings.default_model,
            reason="Default fallback",
        )

    def _route_for_vision(self, task: Task) -> Optional[RoutingResult]:
        """Route tasks that require vision capabilities."""
        vision_models = [
            model_id
            for model_id, config in MODELS.items()
            if config.supports_vision
        ]

        for model_id in vision_models:
            if self._is_model_available(model_id, task):
                return self._route_to_model(
                    model_id,
                    reason="Vision capability required",
                )
        return None

    def _route_for_language(self, task: Task) -> Optional[RoutingResult]:
        """Route based on language preference."""
        if task.language not in LANGUAGE_ROUTING:
            return None

        preferred_models = LANGUAGE_ROUTING[task.language]
        for model_id in preferred_models:
            if self._is_model_available(model_id, task):
                return self._route_to_model(
                    model_id,
                    reason=f"Language preference: {task.language.value}",
                )
        return None

    def _route_for_task_type(self, task: Task) -> Optional[RoutingResult]:
        """Route based on task type."""
        if task.task_type not in TASK_TYPE_ROUTING:
            return None

        rule: RoutingRule = TASK_TYPE_ROUTING[task.task_type]

        # Try primary model
        if self._is_model_available(rule.primary, task):
            return self._route_to_model(
                rule.primary,
                reason=rule.reason,
                fallback=rule.fallback,
            )

        # Try fallback
        if rule.fallback and self._is_model_available(rule.fallback, task):
            return self._route_to_model(
                rule.fallback,
                reason=f"Fallback for {task.task_type.value}: {rule.primary} unavailable",
                is_fallback=True,
            )

        return None

    def _route_to_model(
        self,
        model_id: str,
        reason: str,
        fallback: Optional[str] = None,
        is_fallback: bool = False,
    ) -> RoutingResult:
        """Create a routing result for a specific model."""
        from nexen.config.models import resolve_model

        # First, try to resolve the model via aliases
        if model_id not in MODELS:
            resolved_id = resolve_model(model_id)
            if resolved_id in MODELS:
                logger.info(f"Resolved model alias {model_id} -> {resolved_id}")
                model_id = resolved_id
            else:
                # Try the user's default_model setting
                logger.warning(f"Unknown model {model_id}, trying user's default_model")
                default_model = self.settings.default_model
                resolved_default = resolve_model(default_model)
                if resolved_default in MODELS:
                    model_id = resolved_default
                    logger.info(f"Using resolved default model: {model_id}")
                else:
                    # Use a safe, guaranteed fallback
                    model_id = "gemini/gemini-2.0-flash"
                    logger.warning(f"Default model {default_model} not found, using safe fallback: {model_id}")

        config = MODELS[model_id]
        return RoutingResult(
            model_id=model_id,
            model_config=config,
            routing_reason=reason,
            fallback_model=fallback or config.fallback,
            is_fallback=is_fallback,
        )

    def _is_model_available(self, model_id: str, task: Task) -> bool:
        """Check if a model is available for use."""
        if model_id not in MODELS:
            return False

        config = MODELS[model_id]

        # Check cost constraints
        if not task.allow_expensive and config.cost_tier >= 4:
            return False

        # Check if expensive models are enabled
        if model_id == "openai/o3" and not self.settings.enable_o3:
            return False
        if model_id == "claude-opus-4" and not self.settings.enable_opus:
            return False

        # Check API key availability
        if not self._has_api_key(config.provider):
            return False

        return True

    def _has_api_key(self, provider: str) -> bool:
        """Check if API key is configured for a provider."""
        key_mapping = {
            "openai": self.settings.openai_api_key,
            "anthropic": self.settings.anthropic_api_key,
            "google": self.settings.google_api_key,
            "xai": self.settings.xai_api_key,
            "dashscope": self.settings.dashscope_api_key,
            "deepseek": self.settings.deepseek_api_key,
        }
        key = key_mapping.get(provider, "")
        return bool(key)

    def get_model_for_agent(self, agent_id: str) -> RoutingResult:
        """Get the configured model for a specific agent."""
        from nexen.config.agents import get_agent_config

        config = get_agent_config(agent_id)
        return self._route_to_model(
            config.role_model,
            reason=f"Agent configuration: {agent_id}",
            fallback=config.fallback_model,
        )

    def list_available_models(self) -> list[str]:
        """List all currently available models."""
        return [
            model_id
            for model_id, config in MODELS.items()
            if self._has_api_key(config.provider)
        ]


# Global router instance
_router: Optional[ModelRouter] = None


def get_router() -> ModelRouter:
    """Get the global model router instance."""
    global _router
    if _router is None:
        _router = ModelRouter()
    return _router
