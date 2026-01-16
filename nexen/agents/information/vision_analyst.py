"""
Vision Analyst Agent - 视觉分析师

The multimodal expert for analyzing figures, charts, and diagrams.
Part of the Information cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class VisionAnalystAgent(BaseAgent):
    """
    Vision Analyst: The multimodal analysis expert.

    Uses Gemini for optimal vision capabilities.

    Responsibilities:
    - Figure and chart analysis
    - Architecture diagram interpretation
    - Visualization comparison
    - Multimodal understanding
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(
            agent_id="vision_analyst",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.IMAGE_ANALYSIS

    async def analyze_figure(self, figure_description: str, context: Optional[str] = None) -> AgentOutput:
        """Analyze a figure from a paper."""
        task = f"""请分析以下论文图表：

## 图表描述
{figure_description}

## 论文背景
{context if context else "无额外背景"}

## 分析要求
1. 图表类型和结构
2. 关键数据点和趋势
3. 与文字描述的一致性
4. 可能的问题或疑点

## 输出格式
### 图表概述
[类型和主要内容]

### 关键发现
[数据分析结果]

### 解读
[图表说明了什么]
"""
        return await self.execute(task, context)

    async def interpret_architecture(self, architecture_desc: str) -> AgentOutput:
        """Interpret a neural network architecture diagram."""
        task = f"""请解读以下神经网络架构：

## 架构描述
{architecture_desc}

## 分析要求
1. 整体结构
2. 关键组件和作用
3. 数据流向
4. 创新点

## 输出格式
### 架构概述
[整体描述]

### 组件分析
| 组件 | 作用 | 特点 |
|------|------|------|

### 创新点
[与标准架构的区别]
"""
        return await self.execute(task)
