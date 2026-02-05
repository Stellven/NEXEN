"""
Prompt Engineer Agent - 提示词工程师

The meta-cognitive expert who optimizes prompts for other agents.
Part of the Production cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class PromptEngineerAgent(BaseAgent):
    """
    Prompt Engineer: The prompt optimization expert.

    Responsibilities:
    - System prompt design
    - Agent persona optimization
    - Task prompt generation
    - Prompt review and improvement
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        kwargs.pop('agent_id', None)
        super().__init__(
            agent_id="prompt_engineer",
            session_id=session_id,
            use_pipeline=False,  # Don't use pipeline for prompt engineer
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.PROMPT_GENERATION

    async def design_system_prompt(
        self,
        agent_role: str,
        responsibilities: list[str],
        traits: Optional[dict] = None,
    ) -> AgentOutput:
        """Design a system prompt for an agent."""
        resp_text = "\n".join(f"- {r}" for r in responsibilities)
        traits_text = "\n".join(f"- {k}: {v}" for k, v in (traits or {}).items())

        task = f"""请为以下Agent设计系统提示词：

## Agent角色
{agent_role}

## 职责
{resp_text}

## 性格特征
{traits_text if traits_text else "无特殊要求"}

## 设计原则
1. 明确角色定位
2. 体现性格特点
3. 指导输出方式
4. 包含约束条件

## 输出格式
### System Prompt
[设计的提示词]

### 设计说明
[为什么这样设计]
"""
        return await self.execute(task)

    async def optimize_prompt(self, original_prompt: str, issue: str) -> AgentOutput:
        """Optimize an existing prompt based on observed issues."""
        task = f"""请优化以下提示词：

## 原始提示词
{original_prompt}

## 观察到的问题
{issue}

## 优化要求
1. 保持原有功能
2. 解决描述的问题
3. 提高输出质量

## 输出格式
### 优化后的提示词
[优化版本]

### 修改说明
[做了什么改动，为什么]
"""
        return await self.execute(task)

    async def review_prompt(self, prompt: str) -> AgentOutput:
        """Review a prompt for quality and effectiveness."""
        task = f"""请评审以下提示词的质量：

## 待评审提示词
{prompt}

## 评审维度
1. 清晰度 (1-10)
2. 完整性 (1-10)
3. 可执行性 (1-10)
4. 输出控制 (1-10)
5. 安全性 (1-10)

## 输出格式
### 评分
| 维度 | 分数 | 说明 |
|------|------|------|

### 问题
[发现的问题]

### 改进建议
[具体建议]
"""
        return await self.execute(task)
