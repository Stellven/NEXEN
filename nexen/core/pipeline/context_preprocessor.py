"""
Module 3: Context Preprocessor

Preprocesses the combined context before agent execution:
- Deduplication: Remove redundant information
- Noise reduction: Filter irrelevant content
- Importance ranking: Prioritize critical information
- Conflict detection: Flag contradictory claims
- Format normalization: Standardize formatting
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

import litellm

from nexen.config.agents import AgentConfig, Module3Config
from nexen.config.models import resolve_model
from nexen.config.settings import get_settings

logger = logging.getLogger(__name__)


@dataclass
class PreprocessingResult:
    """Result of context preprocessing."""

    processed_context: str
    original_tokens: int
    processed_tokens: int
    compression_ratio: float

    # Preprocessing details
    duplicates_removed: int = 0
    conflicts_detected: list[str] = field(default_factory=list)
    gaps_identified: list[str] = field(default_factory=list)

    # Metadata
    tasks_applied: list[str] = field(default_factory=list)


class ContextPreprocessor:
    """
    Module 3: Context Preprocessor

    Uses the agent's own model to preprocess context before execution.
    """

    # Preprocessing task definitions
    TASK_PROMPTS = {
        "deduplication": """识别并合并重复或高度相似的信息。保留最完整、最新的版本。
标记已去重的内容数量。""",
        "noise_reduction": """移除与任务无关的内容，包括：
- 过于细节的技术描述（除非直接相关）
- 冗余的背景说明
- 无信息量的填充内容
保留所有关键信息。""",
        "importance_ranking": """按重要性重新排序内容：
1. 关键发现和核心结论
2. 支持证据和数据
3. 方法描述
4. 背景信息
5. 其他
重要内容放在前面。""",
        "conflict_detection": """识别上下文中的矛盾或冲突信息：
- 不同来源的相反结论
- 数据不一致
- 方法差异
用 ⚔️ 标记冲突点。""",
        "format_normalization": """统一格式规范：
- 使用一致的标题层级
- 统一术语表达
- 规范化引用格式
- 确保Markdown语法正确""",
        "gap_filling": """识别信息缺失：
- 标注需要但未提供的关键信息
- 识别需要验证的未确认声明
用 ❓ 标记缺失内容。""",
        "mathematical_notation_check": """检查数学符号和公式：
- 确保公式格式正确
- 验证符号定义一致
- 检查数学表达式完整性""",
        "claim_extraction": """提取所有待验证的声明：
- 识别论文/讨论中的核心论断
- 区分事实陈述和推测
- 标注证据强度""",
        "evidence_mapping": """建立证据映射：
- 将声明与支持证据关联
- 标注证据来源
- 评估证据可靠性""",
    }

    def __init__(self, agent_config: AgentConfig):
        self.agent_config = agent_config
        self.module_config: Module3Config = agent_config.module_3
        self.settings = get_settings()

        # Use agent's role model or configured preprocessor model
        self.model = resolve_model(self.module_config.preprocessor_model or agent_config.role_model)

    async def preprocess(
        self,
        context: str,
        task_description: str,
        tasks: Optional[list[str]] = None,
    ) -> PreprocessingResult:
        """
        Preprocess context before agent execution.

        Args:
            context: The raw context to preprocess
            task_description: Description of the main task
            tasks: Preprocessing tasks to apply (uses config if None)

        Returns:
            PreprocessingResult with processed context
        """
        tasks_to_apply = tasks or self.module_config.tasks
        original_tokens = self._estimate_tokens(context)

        # Skip preprocessing if context is small
        if original_tokens < 500:
            return PreprocessingResult(
                processed_context=context,
                original_tokens=original_tokens,
                processed_tokens=original_tokens,
                compression_ratio=1.0,
                tasks_applied=[],
            )

        # Build preprocessing prompt
        task_instructions = "\n".join(
            f"### {task}\n{self.TASK_PROMPTS.get(task, task)}"
            for task in tasks_to_apply
            if task in self.TASK_PROMPTS
        )

        preprocess_prompt = f"""你是一位上下文预处理专家。请对以下上下文进行预处理，使其更适合后续任务。

## 主任务
{task_description}

## 预处理指令
{task_instructions}

## 原始上下文
{context}

---

## 输出要求
1. 输出预处理后的上下文
2. 在末尾附加预处理摘要：
   - 去重数量（如适用）
   - 检测到的冲突（如有）
   - 识别的信息缺失（如有）

### 预处理后的上下文

"""

        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{"role": "user", "content": preprocess_prompt}],
                temperature=self.module_config.temperature,
                max_tokens=self.module_config.max_tokens,
            )

            processed = response.choices[0].message.content or context
            processed_tokens = self._estimate_tokens(processed)

            # Parse preprocessing summary
            conflicts = self._extract_conflicts(processed)
            gaps = self._extract_gaps(processed)

            return PreprocessingResult(
                processed_context=processed,
                original_tokens=original_tokens,
                processed_tokens=processed_tokens,
                compression_ratio=processed_tokens / original_tokens
                if original_tokens > 0
                else 1.0,
                conflicts_detected=conflicts,
                gaps_identified=gaps,
                tasks_applied=tasks_to_apply,
            )

        except Exception as e:
            logger.error(f"Preprocessing failed: {e}")
            # Return original context on failure
            return PreprocessingResult(
                processed_context=context,
                original_tokens=original_tokens,
                processed_tokens=original_tokens,
                compression_ratio=1.0,
                tasks_applied=[],
            )

    async def quick_dedupe(self, context: str) -> str:
        """Quick deduplication without full preprocessing."""
        if self._estimate_tokens(context) < 1000:
            return context

        prompt = f"""快速去重以下内容，合并重复信息，保留完整版本：

{context}

---
输出去重后的内容："""

        try:
            response = await litellm.acompletion(
                model=resolve_model("gemini-flash"),  # Use fast model for quick dedupe
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=len(context) // 2,
            )
            return response.choices[0].message.content or context
        except Exception:
            return context

    def _extract_conflicts(self, text: str) -> list[str]:
        """Extract detected conflicts from preprocessed text."""
        conflicts = []
        for line in text.split("\n"):
            if "⚔️" in line or "冲突" in line.lower() or "矛盾" in line:
                conflicts.append(line.strip())
        return conflicts[:5]  # Limit to top 5

    def _extract_gaps(self, text: str) -> list[str]:
        """Extract identified gaps from preprocessed text."""
        gaps = []
        for line in text.split("\n"):
            if "❓" in line or "缺失" in line or "待验证" in line:
                gaps.append(line.strip())
        return gaps[:5]  # Limit to top 5

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count."""
        return len(text) // 4
