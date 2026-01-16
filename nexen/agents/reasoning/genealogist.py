"""
Genealogist Agent - 谱系学家

The academic genealogy expert who tracks researchers and their intellectual lineage.
Part of the Reasoning cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class GenealogistAgent(BaseAgent):
    """
    Genealogist: The academic genealogy expert.

    Responsibilities:
    - Building comprehensive researcher profiles
    - Tracing academic lineages
    - Analyzing intellectual evolution
    - Identifying schools of thought
    - Mapping research networks
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(
            agent_id="genealogist",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.GENEALOGY

    async def build_profile(self, person_name: str) -> AgentOutput:
        """Build a comprehensive researcher profile."""
        task = f"""请构建以下研究者的全方位档案：

## 研究者
{person_name}

## 档案内容
1. **基本信息**: 全名、机构、职位
2. **学术背景**: PhD院校、导师、博后经历
3. **核心贡献**: 主要研究成果、代表性论文
4. **思想演进**: 研究方向如何变化
5. **关系网络**: 重要合作者、学生
6. **近期动态**: 最新研究方向

## 输出格式 (YAML)
```yaml
person:
  name: "..."
  affiliation: "..."
  
academic:
  phd:
    institution: "..."
    advisor: "..."
    year: ...
  
contributions:
  - title: "..."
    significance: "..."

relationships:
  students: [...]
  collaborators: [...]
```
"""
        return await self.execute(task)

    async def trace_lineage(
        self,
        person_name: str,
        depth: int = 3,
        direction: str = "both",
    ) -> AgentOutput:
        """Trace academic lineage of a researcher."""
        task = f"""请追溯以下研究者的学术师承：

## 研究者
{person_name}

## 追溯配置
- 深度: {depth} 代
- 方向: {direction} (up=导师, down=学生, both=双向)

## 输出要求
1. 导师谱系 (向上)
2. 学生谱系 (向下)
3. 重要传承关系说明
4. 思想流派标注

## 输出格式
### 谱系图
```
[导师的导师]
    └── [导师]
        └── {person_name}
            ├── [学生1]
            └── [学生2]
```

### 传承分析
[思想如何传承]
"""
        return await self.execute(task)

    async def analyze_school(self, school_or_founder: str) -> AgentOutput:
        """Analyze an academic school of thought."""
        task = f"""请分析以下学派：

## 学派/创始人
{school_or_founder}

## 分析维度
1. 核心理念和方法论
2. 创始人和核心成员
3. 代表性成果
4. 与其他学派的关系
5. 影响力评估

## 输出格式
### 学派概述
[核心理念]

### 成员网络
[关键人物及其关系]

### 思想演进
[学派思想如何发展]
"""
        return await self.execute(task)

    async def track_thought_evolution(
        self,
        person_name: str,
        topic: Optional[str] = None,
    ) -> AgentOutput:
        """Track how a researcher's views evolved over time."""
        topic_text = f"关于 {topic} 的观点" if topic else "核心研究观点"
        task = f"""请追踪以下研究者的{topic_text}演进：

## 研究者
{person_name}

## 追踪要求
1. 按时间线整理观点变化
2. 识别关键转折点
3. 分析变化原因
4. 标注影响来源

## 输出格式
### 思想演进时间线
| 时期 | 核心观点 | 代表作品 | 触发因素 |
|------|---------|---------|---------|
| ... | ... | ... | ... |

### 关键转折分析
[重要观点变化的深入分析]
"""
        return await self.execute(task)
