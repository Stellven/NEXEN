"""
CN Specialist Agent - 中文专家

The Chinese content expert specializing in Chinese academic resources.
Part of the Information cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class CNSpecialistAgent(BaseAgent):
    """
    CN Specialist: The Chinese content expert.

    Uses Qwen for optimal Chinese processing.

    Responsibilities:
    - Chinese literature search
    - Chinese community analysis
    - Terminology translation
    - Domestic ecosystem understanding
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        kwargs.pop('agent_id', None)
        super().__init__(
            agent_id="cn_specialist",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.CHINESE_CONTENT

    async def search_chinese_papers(self, query: str) -> AgentOutput:
        """Search Chinese academic papers."""
        task = f"""请检索以下主题的中文学术论文：

## 检索主题
{query}

## 检索来源
- 知网 (CNKI)
- 万方
- 中文arXiv

## 输出格式
### 检索结果
| 标题 | 作者 | 期刊/会议 | 年份 | 核心观点 |
|------|------|---------|------|---------|
"""
        return await self.execute(task)

    async def analyze_zhihu(self, topic: str) -> AgentOutput:
        """Analyze discussions on Zhihu."""
        task = f"""请分析知乎上关于以下主题的讨论：

## 主题
{topic}

## 分析要求
1. 热门问答
2. 专业观点
3. 争议话题
4. 资源推荐

## 输出格式
### 热门讨论
[关键问答摘要]

### 专家观点
[专业人士的看法]
"""
        return await self.execute(task)

    async def translate_terms(self, terms: list[str], direction: str = "en-zh") -> AgentOutput:
        """Translate technical terms."""
        terms_text = "\n".join(f"- {t}" for t in terms)
        task = f"""请翻译以下技术术语（{direction}）：

## 术语列表
{terms_text}

## 翻译要求
1. 提供标准译法
2. 如有多种译法，列出常用的
3. 标注使用场景

## 输出格式
| 原文 | 译文 | 备选 | 说明 |
|------|------|------|------|
"""
        return await self.execute(task)
