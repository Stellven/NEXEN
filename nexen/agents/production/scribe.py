"""
Scribe Agent - 记录者

The skilled academic writer who produces clear, structured documentation.
Part of the Production cluster.
"""

from typing import Optional, Literal

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class ScribeAgent(BaseAgent):
    """
    Scribe: The academic writing expert.

    Responsibilities:
    - Paper writing
    - Documentation organizing
    - Report generation
    - Knowledge structuring

    Traits:
    - Very high writing skill
    - Very high organization
    - Very high clarity
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(
            agent_id="scribe",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.WRITING

    async def write_section(
        self,
        section: Literal[
            "abstract",
            "introduction",
            "related_work",
            "method",
            "experiments",
            "conclusion",
        ],
        content_notes: str,
        style: str = "academic",
    ) -> AgentOutput:
        """
        Write a specific paper section.

        Args:
            section: Section type to write
            content_notes: Notes and key points to include
            style: Writing style (academic, blog, etc.)

        Returns:
            AgentOutput with written section
        """
        section_guides = {
            "abstract": """
Abstract 写作指南:
- 150-250词
- 问题→方法→结果→结论 结构
- 突出核心贡献
- 避免引用和缩写
""",
            "introduction": """
Introduction 写作指南:
- 3-4段结构
- 第1段: 领域背景和问题重要性
- 第2段: 现有方法及其局限
- 第3段: 本文方法的高层描述
- 第4段: 核心贡献列表和论文结构
""",
            "related_work": """
Related Work 写作指南:
- 按主题分类组织
- 简洁指出每类工作的特点
- 清晰说明本文的区别
- 避免过于详细的描述
- 公平客观地讨论竞争方法
""",
            "method": """
Method 写作指南:
- 问题定义 → 方法概述 → 详细描述
- 使用符号一致
- 包含必要的公式推导
- 提供直觉解释
- 讨论设计选择
""",
            "experiments": """
Experiments 写作指南:
- 实验设置（数据集、评估指标、基线）
- 主实验结果
- 消融实验
- 分析和讨论
- 结果表格和图表清晰
""",
            "conclusion": """
Conclusion 写作指南:
- 总结核心贡献
- 讨论局限性
- 提出未来工作方向
- 2-3段，简洁有力
""",
        }

        guide = section_guides.get(section, "")

        task = f"""请撰写论文的 {section.upper()} 部分：

## 写作要求
{guide}

## 写作风格
{style}

## 内容要点
{content_notes}

## 输出要求
1. 直接输出可用的段落
2. 遵循学术写作规范
3. 语言简洁精确
4. 逻辑连贯
5. 如使用 LaTeX 格式，确保正确
"""
        return await self.execute(task)

    async def write_survey(
        self,
        topic: str,
        papers_summary: str,
        max_words: int = 2000,
    ) -> AgentOutput:
        """
        Write a survey/literature review.

        Args:
            topic: Survey topic
            papers_summary: Summary of papers to include
            max_words: Maximum word count

        Returns:
            AgentOutput with survey document
        """
        task = f"""请撰写关于以下主题的文献综述：

## 主题
{topic}

## 论文资料
{papers_summary}

## 写作要求
1. 字数限制: 约 {max_words} 词
2. 结构:
   - 背景介绍
   - 主要研究方向（分类讨论）
   - 方法对比
   - 研究空白与未来方向
   - 参考文献

## 写作风格
- 客观全面
- 逻辑清晰
- 对重要工作详细讨论
- 对一般工作简要提及
"""
        return await self.execute(task)

    async def generate_report(
        self,
        research_data: str,
        report_type: str = "research_summary",
    ) -> AgentOutput:
        """
        Generate a structured research report.

        Args:
            research_data: Data and findings to include
            report_type: Type of report to generate

        Returns:
            AgentOutput with formatted report
        """
        task = f"""请生成结构化的研究报告：

## 报告类型
{report_type}

## 研究数据
{research_data}

## 输出格式
```markdown
# 研究报告

## 概述
[一段总结]

## 关键发现
- 发现1
- 发现2
...

## 详细分析
[分节讨论]

## 结论与建议
[总结和下一步建议]

## 附录
[如需要]
```
"""
        return await self.execute(task)

    async def write_rebuttal(
        self,
        reviews: str,
        paper_content: Optional[str] = None,
    ) -> AgentOutput:
        """
        Write rebuttal response to reviewer comments.

        Args:
            reviews: Reviewer comments
            paper_content: Original paper content for reference

        Returns:
            AgentOutput with rebuttal responses
        """
        task = f"""请撰写审稿回复 (Rebuttal)：

## 审稿意见
{reviews}

## 论文内容
{paper_content[:5000] if paper_content else "请基于审稿意见推断论文内容"}

## 回复要求
1. 礼貌专业地回应每个问题
2. 对于批评：承认合理之处，解释误解，提供改进方案
3. 对于问题：直接回答，附带证据
4. 对于建议：说明将如何采纳

## 输出格式
```
# Response to Reviewers

## Common Responses
[对多位审稿人共同关注的问题统一回复]

## Reviewer 1
**Comment 1.1**: [原文]
**Response**: [回复]

**Comment 1.2**: ...
...

## Reviewer 2
...
```
"""
        return await self.execute(task)

    async def create_slides(
        self,
        content: str,
        style: str = "academic",
        num_slides: int = 15,
    ) -> AgentOutput:
        """
        Create presentation slides outline.

        Args:
            content: Content to present
            style: Presentation style
            num_slides: Target number of slides

        Returns:
            AgentOutput with slides outline
        """
        task = f"""请创建演示文稿大纲：

## 内容
{content}

## 风格
{style}

## 目标: {num_slides} 页幻灯片

## 输出格式
```
# 演示文稿大纲

## Slide 1: 标题
- 标题
- 副标题
- 作者信息

## Slide 2: 问题背景
- 要点1
- 要点2
- [图示建议]

## Slide 3: 核心想法
...

[继续其他幻灯片]
```

## 要求
- 每页3-4个要点
- 标注需要图表的位置
- 保持逻辑流畅
"""
        return await self.execute(task)
