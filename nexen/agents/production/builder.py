"""
Builder Agent - 构建者

The engineering expert who implements code and designs experiments.
Part of the Production cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class BuilderAgent(BaseAgent):
    """
    Builder: The ML engineering expert.

    Responsibilities:
    - Code implementation
    - Experiment design
    - Prototype building
    - Performance optimization
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        kwargs.pop('agent_id', None)
        super().__init__(
            agent_id="builder",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.CODE_GENERATION

    async def implement(self, specification: str, framework: str = "pytorch") -> AgentOutput:
        """Implement a method based on specification."""
        task = f"""请实现以下方法：

## 规格说明
{specification}

## 框架
{framework}

## 实现要求
1. 完整可运行的代码
2. 类型注解
3. 详细docstring
4. 关键逻辑注释
5. 单元测试示例

## 代码风格
- 清晰可读
- 模块化设计
- 遵循PEP 8
"""
        return await self.execute(task)

    async def design_experiment(self, hypothesis: str, constraints: Optional[str] = None) -> AgentOutput:
        """Design experiments to test a hypothesis."""
        task = f"""请设计实验验证以下假设：

## 假设
{hypothesis}

## 约束条件
{constraints if constraints else "无特殊约束"}

## 实验设计要求
1. 实验目标
2. 数据集选择
3. 评估指标
4. 基线方法
5. 消融实验
6. 预计资源需求

## 输出格式
### 实验计划
[整体设计]

### 实验细节
| 实验 | 目的 | 配置 | 预期结果 |
|------|------|------|---------|
"""
        return await self.execute(task)

    async def review_code(self, code: str) -> AgentOutput:
        """Review code for quality and correctness."""
        task = f"""请审查以下代码：

## 代码
```python
{code}
```

## 审查维度
1. 正确性
2. 效率
3. 可读性
4. 测试覆盖
5. 潜在bug

## 输出格式
### 总体评价
[概述]

### 问题列表
| 位置 | 问题 | 严重程度 | 建议 |
|------|------|---------|------|

### 改进建议
[具体建议]
"""
        return await self.execute(task)
