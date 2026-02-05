"""
Explorer Agent - 探索者

The curious researcher who discovers new directions and finds relevant literature.
Part of the Information cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class ExplorerAgent(BaseAgent):
    """
    Explorer: The curious research explorer.

    Responsibilities:
    - Literature search and discovery
    - New direction identification
    - Hypothesis generation
    - Research trend tracking

    Traits:
    - Very high curiosity
    - High risk preference
    - High creativity
    - Very high breadth
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        kwargs.pop('agent_id', None)
        super().__init__(
            agent_id="explorer",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.PAPER_ANALYSIS

    async def search_papers(
        self,
        query: str,
        max_results: int = 20,
        year_from: Optional[int] = None,
    ) -> AgentOutput:
        """
        Search for relevant papers.

        Args:
            query: Search query
            max_results: Maximum number of results
            year_from: Filter papers from this year

        Returns:
            AgentOutput with search results
        """
        task = f"""请检索与以下主题相关的论文：

## 检索查询
{query}

## 检索要求
- 最多返回 {max_results} 篇论文
- 优先返回高引用和最新发表的论文
{f'- 只返回 {year_from} 年之后的论文' if year_from else ''}

## 输出格式
对于每篇论文，请提供:
1. 标题
2. 作者
3. 年份
4. 一句话摘要
5. 为什么相关

## 关键发现
总结检索中的关键发现和模式。
"""
        return await self.execute(task)

    async def discover_trends(
        self,
        field: str,
        period: str = "1y",
    ) -> AgentOutput:
        """
        Discover research trends in a field.

        Args:
            field: Research field to analyze
            period: Time period (e.g., "6m", "1y", "2y")

        Returns:
            AgentOutput with trend analysis
        """
        task = f"""请分析以下领域的研究趋势：

## 研究领域
{field}

## 分析时间段
过去 {period}

## 分析要求
1. 识别主要研究方向
2. 找出热门话题和技术
3. 标注关键里程碑论文
4. 识别新兴趋势
5. 预测未来发展方向

## 输出格式
- 趋势概述
- 关键技术列表
- 里程碑时间线
- 预测与建议
"""
        return await self.execute(task)

    async def find_related_work(
        self,
        idea_description: str,
    ) -> AgentOutput:
        """
        Find related work for a research idea.

        Args:
            idea_description: Description of the research idea

        Returns:
            AgentOutput with related work analysis
        """
        task = f"""请为以下研究想法找到相关工作：

## 研究想法
{idea_description}

## 任务要求
1. 找到最相关的现有工作（5-10篇）
2. 分析与我的想法的相似性和差异
3. 识别潜在的竞争/互补关系
4. 找出可能的研究空白

## 输出格式
### 最相关工作
[列表，附带相关性说明]

### 差异化分析
[我的想法与现有工作的区别]

### 研究空白
[可以探索的方向]

### Related Work 段落
[可直接用于论文的段落]
"""
        return await self.execute(task)

    async def analyze_paper(
        self,
        paper_id: str,
    ) -> AgentOutput:
        """
        Analyze a specific paper.

        Args:
            paper_id: arXiv ID or paper identifier

        Returns:
            AgentOutput with paper analysis
        """
        task = f"""请深度分析以下论文：

## 论文ID
{paper_id}

## 分析维度
1. **核心贡献**: 这篇论文的主要创新点是什么？
2. **方法概述**: 方法是如何工作的？
3. **实验设置**: 实验是如何设计的？
4. **主要结果**: 关键结果是什么？
5. **局限性**: 有哪些不足？
6. **与其他工作的关系**: 继承了什么？改进了什么？

## 输出格式
结构化的分析报告，包含上述所有维度。
"""
        return await self.execute(task)
