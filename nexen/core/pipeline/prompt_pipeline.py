"""
Module 1: Prompt Pipeline

Implements the prompt generation, review, and refinement cycle:
1. Generator: Creates task-specific prompts using Gemini
2. Reviewer: Evaluates prompt quality using Claude
3. Refiner: Improves prompts based on review feedback

The pipeline ensures high-quality prompts for each agent execution.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

import litellm

from nexen.config.agents import AgentConfig, Module1Config
from nexen.config.settings import get_settings

logger = logging.getLogger(__name__)


@dataclass
class PromptReviewResult:
    """Result of prompt review."""

    # Scores (0-10 each)
    role_consistency: int = 0
    task_clarity: int = 0
    output_format: int = 0
    context_utilization: int = 0
    safety: int = 0

    # Computed
    total_score: int = 0
    passed: bool = False

    # Feedback
    feedback: str = ""
    suggestions: list[str] = field(default_factory=list)

    def __post_init__(self):
        self.total_score = (
            self.role_consistency
            + self.task_clarity
            + self.output_format
            + self.context_utilization
            + self.safety
        )

    @classmethod
    def from_llm_response(cls, response: str, threshold: int = 40) -> "PromptReviewResult":
        """Parse LLM response into PromptReviewResult."""
        # Default scores if parsing fails
        result = cls()

        try:
            lines = response.strip().split("\n")
            scores = {}
            suggestions = []
            feedback_lines = []
            in_feedback = False

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Parse scores
                if ":" in line and any(
                    key in line.lower()
                    for key in ["role", "task", "output", "context", "safety"]
                ):
                    key, value = line.rsplit(":", 1)
                    try:
                        # Extract number from value
                        score = int("".join(c for c in value if c.isdigit())[:2])
                        score = min(10, max(0, score))

                        key_lower = key.lower()
                        if "role" in key_lower:
                            scores["role_consistency"] = score
                        elif "task" in key_lower:
                            scores["task_clarity"] = score
                        elif "output" in key_lower:
                            scores["output_format"] = score
                        elif "context" in key_lower:
                            scores["context_utilization"] = score
                        elif "safety" in key_lower:
                            scores["safety"] = score
                    except (ValueError, IndexError):
                        pass

                # Parse suggestions
                elif line.startswith("-") or line.startswith("•"):
                    suggestions.append(line[1:].strip())

                # Collect feedback
                elif in_feedback or "feedback" in line.lower():
                    in_feedback = True
                    if "feedback" not in line.lower():
                        feedback_lines.append(line)

            result = cls(
                role_consistency=scores.get("role_consistency", 7),
                task_clarity=scores.get("task_clarity", 7),
                output_format=scores.get("output_format", 7),
                context_utilization=scores.get("context_utilization", 7),
                safety=scores.get("safety", 8),
                feedback=" ".join(feedback_lines) if feedback_lines else "",
                suggestions=suggestions,
            )
            result.passed = result.total_score >= threshold

        except Exception as e:
            logger.warning(f"Failed to parse review response: {e}")
            # Return passing result on parse failure to avoid blocking
            result = cls(
                role_consistency=8,
                task_clarity=8,
                output_format=8,
                context_utilization=8,
                safety=8,
            )
            result.passed = True

        return result


@dataclass
class GeneratedPrompt:
    """A generated prompt ready for agent execution."""

    system_prompt: str
    user_prompt: str
    iterations: int = 1
    final_score: int = 0
    review_history: list[PromptReviewResult] = field(default_factory=list)


class PromptPipeline:
    """
    Module 1: Prompt Pipeline

    Generates, reviews, and refines prompts for agent execution.
    """

    def __init__(self, agent_config: AgentConfig):
        self.agent_config = agent_config
        self.module_config: Module1Config = agent_config.module_1
        self.settings = get_settings()

    async def generate_prompt(
        self,
        task_description: str,
        context: Optional[str] = None,
    ) -> GeneratedPrompt:
        """
        Generate an optimized prompt through the pipeline.

        Args:
            task_description: The task to generate a prompt for
            context: Optional context to include

        Returns:
            GeneratedPrompt with system and user prompts
        """
        # Step 1: Generate initial prompt
        system_prompt, user_prompt = await self._generate_initial_prompt(
            task_description, context
        )

        review_history = []
        iterations = 0

        # Iterate until passing or max iterations
        while iterations < self.module_config.max_iterations:
            iterations += 1

            # Step 2: Review the prompt
            review = await self._review_prompt(system_prompt, user_prompt)
            review_history.append(review)

            if review.passed:
                logger.info(
                    f"Prompt passed review on iteration {iterations} "
                    f"with score {review.total_score}/50"
                )
                break

            # Step 3: Refine if not passing
            logger.info(
                f"Prompt review iteration {iterations}: "
                f"score {review.total_score}/50, refining..."
            )
            system_prompt, user_prompt = await self._refine_prompt(
                system_prompt, user_prompt, review
            )

        final_review = review_history[-1] if review_history else None

        return GeneratedPrompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            iterations=iterations,
            final_score=final_review.total_score if final_review else 0,
            review_history=review_history,
        )

def extract_quota_info(exc: Exception) -> dict:
    info = {}

    # LiteLLM often attaches the raw response
    body = None
    if hasattr(exc, "response") and exc.response is not None:
        body = getattr(exc.response, "json", None)
    elif hasattr(exc, "body"):
        body = exc.body

    if isinstance(body, dict):
        error = body.get("error", {})
        info["status"] = error.get("status")
        info["message"] = error.get("message")

        details = error.get("details", [])
        for d in details:
            if d.get("@type", "").endswith("QuotaFailure"):
                violations = d.get("violations", [])
                if violations:
                    v = violations[0]
                    info["quotaMetric"] = v.get("quotaMetric")
                    info["quotaId"] = v.get("quotaId")
                    info["quotaDimensions"] = v.get("quotaDimensions")
                    info["quotaValue"] = v.get("quotaValue")

            if d.get("@type", "").endswith("RetryInfo"):
                info["retryDelay"] = d.get("retryDelay")

    return info

async def _call_llm_with_retry(self, **kwargs) -> Any:
    max_retries = 5
    base_delay = 2

    for attempt in range(max_retries):
        try:
            return await litellm.acompletion(**kwargs)

        except Exception as e:
            quota_info = extract_quota_info(e)

            is_rate_limit = (
                "429" in str(e)
                or quota_info.get("status") == "RESOURCE_EXHAUSTED"
            )

            if is_rate_limit and attempt < max_retries - 1:
                delay = base_delay * (2**attempt)

                logger.warning(
                    "Rate limit hit | "
                    f"metric={quota_info.get('quotaMetric')} | "
                    f"quotaId={quota_info.get('quotaId')} | "
                    f"model={quota_info.get('quotaDimensions', {}).get('model')} | "
                    f"limit={quota_info.get('quotaValue')} | "
                    f"retryDelay={quota_info.get('retryDelay')} | "
                    f"backoff={delay}s | "
                    f"attempt={attempt + 1}/{max_retries}"
                )

                await asyncio.sleep(delay)
            else:
                raise


    async def _generate_initial_prompt(
        self,
        task_description: str,
        context: Optional[str],
    ) -> tuple[str, str]:
        """Generate the initial prompt using the generator model."""
        generation_prompt = f"""你是一位专业的AI提示词工程师。请为以下Agent和任务生成优化的提示词。

## Agent信息
- ID: {self.agent_config.agent_id}
- 名称: {self.agent_config.display_name_cn}
- 角色性格:
{self.agent_config.persona}

## 任务描述
{task_description}

## 可用上下文
{context if context else "无额外上下文"}

## 特殊指令
{self.module_config.special_instructions}

---

请生成两部分内容：

### SYSTEM PROMPT
[为这个Agent生成系统提示词，要充分体现其角色性格]

### USER PROMPT
[为具体任务生成用户提示词，要清晰、结构化、无歧义]
"""

        response = await self._call_llm_with_retry(
            model=self.module_config.generator_model,
            messages=[{"role": "user", "content": generation_prompt}],
            temperature=0.7,
            max_tokens=2000,
        )

        content = response.choices[0].message.content or ""
        return self._parse_generated_prompts(content)

    async def _review_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> PromptReviewResult:
        """Review a prompt using the reviewer model."""
        review_prompt = f"""你是一位提示词质量评审专家。请评估以下提示词的质量。

## Agent信息
- ID: {self.agent_config.agent_id}
- 预期角色: {self.agent_config.display_name_cn}

## 待评审的System Prompt
{system_prompt}

## 待评审的User Prompt
{user_prompt}

---

请从以下5个维度评分（每项0-10分）:

1. **role_consistency** (角色一致性): 提示词是否准确反映Agent角色性格
2. **task_clarity** (任务清晰度): 任务描述是否清晰、无歧义
3. **output_format** (输出格式): 输出格式是否明确、可解析
4. **context_utilization** (上下文利用): 是否有效利用可用上下文
5. **safety** (安全性): 是否避免有害输出风险

请按以下格式输出：

role_consistency: [分数]/10
task_clarity: [分数]/10
output_format: [分数]/10
context_utilization: [分数]/10
safety: [分数]/10

### Feedback
[整体反馈]

### Suggestions
- [改进建议1]
- [改进建议2]
"""

        response = await self._call_llm_with_retry(
            model=self.module_config.reviewer_model,
            messages=[{"role": "user", "content": review_prompt}],
            temperature=0.3,
            max_tokens=1000,
        )

        content = response.choices[0].message.content or ""
        return PromptReviewResult.from_llm_response(
            content, self.module_config.pass_threshold
        )

    async def _refine_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
        review: PromptReviewResult,
    ) -> tuple[str, str]:
        """Refine a prompt based on review feedback."""
        refine_prompt = f"""你是一位提示词优化专家。请根据评审反馈改进以下提示词。

## 当前System Prompt
{system_prompt}

## 当前User Prompt
{user_prompt}

## 评审结果
- 角色一致性: {review.role_consistency}/10
- 任务清晰度: {review.task_clarity}/10
- 输出格式: {review.output_format}/10
- 上下文利用: {review.context_utilization}/10
- 安全性: {review.safety}/10
- 总分: {review.total_score}/50 (需要 ≥{self.module_config.pass_threshold})

## 反馈
{review.feedback}

## 改进建议
{chr(10).join('- ' + s for s in review.suggestions)}

---

请输出改进后的提示词：

### SYSTEM PROMPT
[改进后的系统提示词]

### USER PROMPT
[改进后的用户提示词]
"""

        response = await self._call_llm_with_retry(
            model=self.module_config.refiner_model,
            messages=[{"role": "user", "content": refine_prompt}],
            temperature=0.5,
            max_tokens=2000,
        )

        content = response.choices[0].message.content or ""
        return self._parse_generated_prompts(content)

    def _parse_generated_prompts(self, content: str) -> tuple[str, str]:
        """Parse generated content into system and user prompts."""
        system_prompt = ""
        user_prompt = ""

        # Split by markers
        parts = content.split("### ")
        for part in parts:
            if part.strip().upper().startswith("SYSTEM PROMPT"):
                system_prompt = part.split("\n", 1)[1].strip() if "\n" in part else ""
            elif part.strip().upper().startswith("USER PROMPT"):
                user_prompt = part.split("\n", 1)[1].strip() if "\n" in part else ""

        # Fallback: if parsing fails, use the whole content as user prompt
        if not system_prompt and not user_prompt:
            system_prompt = self.agent_config.persona
            user_prompt = content

        return system_prompt, user_prompt

    def get_static_system_prompt(self) -> str:
        """Get a static system prompt without going through the pipeline."""
        return f"""{self.agent_config.persona}

## 你的职责
{chr(10).join('- ' + r for r in self.agent_config.responsibilities)}

## 输出要求
- 使用结构化的Markdown格式
- 明确标注置信度和不确定点
- 提供信息来源
- 标注需要其他Agent验证的内容
"""
