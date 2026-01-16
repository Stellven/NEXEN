"""
Critic Agent - 批判者

The rigorous reviewer who finds flaws and suggests improvements.
Part of the Reasoning cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class CriticAgent(BaseAgent):
    """
    Critic: The rigorous academic reviewer.

    Responsibilities:
    - Method review and critique
    - Assumption questioning
    - Counter-example construction
    - Experimental design review
    - Statistical significance verification

    Traits:
    - Very high skepticism
    - High constructiveness
    - Very high thoroughness
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(
            agent_id="critic",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.CRITIQUE

    async def review_paper(
        self,
        paper_content: str,
        review_standard: str = "顶会 (ICML/NeurIPS/ICLR)",
    ) -> AgentOutput:
        """
        Review a paper like a top-conference reviewer.

        Args:
            paper_content: The paper content to review
            review_standard: The review standard to apply

        Returns:
            AgentOutput with detailed review
        """
        task = f"""请以顶会审稿人的标准审查以下论文：

## 审查标准
{review_standard}

## 论文内容
{paper_content[:10000]}

## 审查维度
1. **Novelty (新颖性)**: 1-5分
   - 想法是否新颖？
   - 与现有工作的区别是否清晰？

2. **Soundness (技术可靠性)**: 1-5分
   - 方法是否正确？
   - 证明/推导是否有错误？
   - 假设是否合理？

3. **Significance (重要性)**: 1-5分
   - 解决的问题是否重要？
   - 影响力如何？

4. **Clarity (清晰度)**: 1-5分
   - 写作是否清晰？
   - 结构是否合理？

5. **Reproducibility (可复现性)**: 1-5分
   - 是否提供足够的细节？
   - 代码/数据是否可用？

## 输出格式
### 总体评价
[综合评价]

### 分项评分
[各维度评分和理由]

### 主要优点
[3-5点]

### 主要问题
[3-5点, 按严重程度排序]

### 建设性建议
[如何改进]

### 问题清单
[需要作者回答的具体问题]
"""
        return await self.execute(task)

    async def critique_method(
        self,
        method_description: str,
    ) -> AgentOutput:
        """
        Critique a proposed method.

        Args:
            method_description: Description of the method

        Returns:
            AgentOutput with critique
        """
        task = f"""请批判性分析以下方法：

## 方法描述
{method_description}

## 分析要求
1. **假设检验**: 方法依赖哪些假设？这些假设是否合理？
2. **边界情况**: 在什么情况下方法可能失效？
3. **反例构建**: 能否找到反例？
4. **与替代方案对比**: 与其他方法相比有何优劣？
5. **实验缺陷**: 实验设计是否有漏洞？

## 输出格式
### 关键假设
[假设列表及其可能的问题]

### 潜在问题
[按严重程度排序]

### 边界情况
[方法可能失效的场景]

### 改进建议
[如何解决这些问题]
"""
        return await self.execute(task)

    async def verify_claims(
        self,
        claims: list[str],
        evidence: Optional[str] = None,
    ) -> AgentOutput:
        """
        Verify a list of claims against evidence.

        Args:
            claims: List of claims to verify
            evidence: Optional supporting evidence

        Returns:
            AgentOutput with verification results
        """
        claims_text = "\n".join(f"{i+1}. {c}" for i, c in enumerate(claims))

        task = f"""请验证以下声明的可靠性：

## 待验证声明
{claims_text}

## 可用证据
{evidence if evidence else "请基于一般知识验证"}

## 验证要求
对于每个声明，请评估：
1. **可信度**: 高/中/低
2. **证据支持**: 有明确证据/部分证据/无证据/存在反证
3. **验证方法**: 如何进一步验证？

## 输出格式
### 验证结果

| # | 声明 | 可信度 | 证据支持 | 备注 |
|---|------|--------|---------|------|
| 1 | ... | ... | ... | ... |

### 需要进一步验证的声明
[列表]

### 可能存在问题的声明
[列表及问题说明]
"""
        return await self.execute(task)

    async def find_flaws(
        self,
        argument: str,
    ) -> AgentOutput:
        """
        Find logical flaws in an argument.

        Args:
            argument: The argument to analyze

        Returns:
            AgentOutput with identified flaws
        """
        task = f"""请找出以下论证中的逻辑漏洞：

## 论证内容
{argument}

## 分析要求
1. 识别论证的结构（前提→推理→结论）
2. 检查逻辑谬误（偷换概念、循环论证、错误类比等）
3. 识别隐含假设
4. 寻找反例
5. 评估证据的充分性

## 输出格式
### 论证结构分析
[前提和结论的梳理]

### 发现的逻辑问题
[问题列表，按严重程度排序]

### 隐含假设
[未明确说明但被默认的假设]

### 反例
[如果存在]

### 改进建议
[如何加强论证]
"""
        return await self.execute(task)
