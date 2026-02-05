"""
Connector Agent - 连接者

The cross-domain knowledge connector who finds hidden relationships.
Part of the Reasoning cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class ConnectorAgent(BaseAgent):
    """
    Connector: The cross-domain knowledge connector.

    Responsibilities:
    - Cross-domain connection discovery
    - Analogical reasoning
    - Idea fusion
    - Novel connection identification
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        kwargs.pop('agent_id', None)
        super().__init__(
            agent_id="connector",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.GENERAL

    async def find_connections(self, concept: str, domains: Optional[list[str]] = None) -> AgentOutput:
        """Find cross-domain connections for a concept."""
        domains_text = ", ".join(domains) if domains else "神经科学, 物理学, 认知科学, 数学, 生物学"
        task = f"""请发现以下概念在其他领域的类似模式：

## 核心概念
{concept}

## 探索领域
{domains_text}

## 分析要求
1. 在每个领域寻找功能相似的概念/机制
2. 分析相似性和差异
3. 评估知识迁移的可能性
4. 提出创新想法

## 输出格式
### 跨域发现
| 领域 | 类似概念 | 相似机制 | 迁移可能性 |
|------|---------|---------|----------|
| ... | ... | ... | ... |

### 创新想法
[基于跨域连接的新想法]
"""
        return await self.execute(task)

    async def analogical_reasoning(self, source: str, target: str) -> AgentOutput:
        """Perform analogical reasoning between domains."""
        task = f"""请进行类比推理：

## 源领域
{source}

## 目标领域
{target}

## 分析要求
1. 识别源领域的核心概念和关系
2. 在目标领域寻找对应
3. 映射关系并验证有效性
4. 生成创新假设

## 输出格式
### 概念映射表
| 源概念 | 目标概念 | 映射可靠性 |
|-------|---------|----------|
| ... | ... | 高/中/低 |

### 创新假设
[基于类比的新假设]
"""
        return await self.execute(task)
