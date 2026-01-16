"""
Historian Agent - 技术历史学家

The technology historian who traces the evolution of methods and techniques.
Part of the Reasoning cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class HistorianAgent(BaseAgent):
    """
    Historian: The technology evolution expert.

    Responsibilities:
    - Tracing technology origins
    - Identifying milestones
    - Analyzing branching points
    - Tracking evolution axes
    - Predicting future directions
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(
            agent_id="historian",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.HISTORY_ANALYSIS

    async def trace_origin(self, technology: str) -> AgentOutput:
        """Trace the origin of a technology."""
        task = f"""请追溯以下技术的起源：

## 技术
{technology}

## 追溯要求
1. 最早的论文/提出者
2. 问题背景（为什么需要这项技术）
3. 前置技术（依赖哪些已有技术）
4. 早期演化路径

## 输出格式
### 起源
- 最早论文: [标题, 作者, 年份]
- 问题背景: [描述]

### 前置技术
[技术A] → [技术B] → [{technology}]

### 早期发展
[关键事件时间线]
"""
        return await self.execute(task)

    async def build_timeline(
        self,
        technology: str,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
    ) -> AgentOutput:
        """Build a technology development timeline."""
        period = ""
        if year_from:
            period += f"从 {year_from} 年"
        if year_to:
            period += f"到 {year_to} 年"
        if not period:
            period = "完整历史"

        task = f"""请构建以下技术的发展时间线：

## 技术
{technology}

## 时间范围
{period}

## 时间线要求
1. 标注关键里程碑
2. 区分类型（起源、改进、范式转换、分叉）
3. 标注重要性（1-5星）
4. 关联关键人物

## 输出格式
```
[年份] ●━━━ [事件名称] [类型] [重要性]
     │    [描述]
     │    [关键人物/机构]
     │
[年份] ●━━━ ...
```
"""
        return await self.execute(task)

    async def analyze_evolution(self, technology: str, depth: str = "detailed") -> AgentOutput:
        """Analyze the complete evolution of a technology."""
        task = f"""请绘制以下技术的完整演进图谱：

## 技术
{technology}

## 分析深度
{depth}

## 分析维度
1. 起源和早期形态
2. 主要演进路径
3. 分叉点和分支
4. 融合和收敛
5. 当前状态
6. 未来预测

## 输出格式
### 演进树
```
[起源年份] ─── [起源技术]
         │
[年份] ─── [改进版本] ★ (如果是重要里程碑)
         │
         ├─── [分叉1: 方向A]
         │         ├─── [变体A1]
         │         └─── [变体A2]
         │
         └─── [分叉2: 方向B]
                   └─── [变体B1]
```

### 驱动因素分析
[是什么推动了这些演进]

### 未来预测
[基于历史模式的预测]
"""
        return await self.execute(task)

    async def compare_paths(
        self,
        tech1: str,
        tech2: str,
        tech3: Optional[str] = None,
    ) -> AgentOutput:
        """Compare evolution paths of multiple technologies."""
        techs = [tech1, tech2]
        if tech3:
            techs.append(tech3)

        task = f"""请对比以下技术的演进路径：

## 技术
{', '.join(techs)}

## 对比维度
1. 起源时间和背景
2. 演进速度
3. 主要里程碑
4. 当前状态
5. 各自优势领域
6. 未来展望

## 输出格式
### 对比表
| 维度 | {' | '.join(techs)} |
|------|{'|'.join(['---'] * len(techs))}|
| 起源 | ... |
| ... | ... |

### 交叉点
[技术之间的相互影响]

### 结论
[对比分析结论]
"""
        return await self.execute(task)

    async def predict_future(self, technology: str) -> AgentOutput:
        """Predict future development of a technology."""
        task = f"""请基于历史演进模式预测技术未来发展：

## 技术
{technology}

## 预测要求
1. 短期预测（1年内）
2. 中期预测（2-3年）
3. 长期预测（5年+）
4. 可能的突破点
5. 风险和不确定性

## 输出格式
### 短期预测
[1年内可能发生什么]

### 中期预测
[2-3年展望]

### 长期预测
[5年+愿景]

### 关键不确定性
[可能影响预测的因素]
"""
        return await self.execute(task)
