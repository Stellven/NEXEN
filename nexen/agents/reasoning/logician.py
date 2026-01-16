"""
Logician Agent - 逻辑推理者

The rigorous expert in mathematical reasoning and formal proofs.
Part of the Reasoning cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class LogicianAgent(BaseAgent):
    """
    Logician: The mathematical reasoning expert.

    Uses OpenAI o3 for strongest logical capabilities.

    Responsibilities:
    - Logical reasoning and proofs
    - Formal verification
    - Complexity analysis
    - Theoretical correctness review
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(
            agent_id="logician",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.MATH_REASONING

    async def prove(self, statement: str, context: Optional[str] = None) -> AgentOutput:
        """Construct a formal proof for a statement."""
        task = f"""请构建以下命题的形式化证明：

## 待证命题
{statement}

## 背景信息
{context if context else "无额外背景"}

## 证明要求
1. 明确列出所有前提假设
2. 逐步推导，标注每一步的依据
3. 使用标准数学符号
4. 如无法证明，说明原因并提供反例

## 输出格式
### 命题形式化
[将自然语言转为形式化表述]

### 假设
[列出所有假设]

### 证明
[逐步证明过程]

### 结论
[证明完成或无法证明的说明]
"""
        return await self.execute(task, context)

    async def verify_proof(self, proof: str) -> AgentOutput:
        """Verify the correctness of a proof."""
        task = f"""请验证以下证明的正确性：

## 待验证证明
{proof}

## 验证要求
1. 检查每一步推导的逻辑正确性
2. 识别隐含假设
3. 检查是否有循环论证
4. 验证结论是否确实由前提推出

## 输出格式
### 证明结构分析
[逐步分析]

### 发现的问题
[如有]

### 验证结论
✅ 证明正确 / ❌ 证明存在问题
"""
        return await self.execute(task)

    async def analyze_complexity(self, algorithm: str) -> AgentOutput:
        """Analyze the complexity of an algorithm."""
        task = f"""请分析以下算法的复杂度：

## 算法描述
{algorithm}

## 分析要求
1. 时间复杂度（最好/最坏/平均）
2. 空间复杂度
3. 关键操作次数分析
4. 与相关算法的复杂度对比

## 输出格式
### 时间复杂度
- 最好情况: O(?)
- 最坏情况: O(?)
- 平均情况: O(?)

### 空间复杂度
O(?)

### 推导过程
[详细推导]
"""
        return await self.execute(task)
