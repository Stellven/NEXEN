"""
Archivist Agent - 档案管理员

The memory manager who organizes and distills research information.
Part of the Production cluster.
"""

from typing import Optional
from pathlib import Path
from datetime import datetime

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput
from nexen.config.settings import get_settings


class ArchivistAgent(BaseAgent):
    """
    Archivist: The memory management expert.

    Responsibilities:
    - Memory management
    - Summary generation
    - Knowledge indexing
    - Contradiction detection
    - Information compression
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        super().__init__(
            agent_id="archivist",
            session_id=session_id,
            **kwargs,
        )
        self.settings = get_settings()

    def get_task_type(self) -> TaskType:
        return TaskType.SUMMARIZATION

    async def process_raw(self, raw_content: str, source_agent: str) -> AgentOutput:
        """Process raw agent output and generate digest."""
        task = f"""请处理以下原始Agent输出，生成摘要：

## 来源Agent
{source_agent}

## 原始内容
{raw_content}

## 处理要求
1. 提取关键发现
2. 标注不确定点
3. 识别跨Agent关联
4. 标记需要后续action的项目

## 输出格式
### 关键发现
[列表]

### 不确定点
[列表]

### 跨Agent关联
[与其他Agent的关系]

### Action Items
[后续行动]
"""
        return await self.execute(task)

    async def generate_insights(self, session_id: Optional[str] = None) -> AgentOutput:
        """Generate L2 insights from all digests."""
        sid = session_id or self.session_id
        task = f"""请综合当前研究会话的所有摘要，生成洞察精华。

## 会话ID
{sid}

## 生成要求
1. 最重要的3-5个发现
2. 待解决的问题
3. 行动建议
4. 需要关注的矛盾

## 输出格式
### 关键发现
[高置信度发现]

### 待解决问题
[开放问题]

### 行动建议
[下一步建议]

### 矛盾与分歧
[需要解决的冲突]
"""
        return await self.execute(task)

    async def detect_contradictions(self, content: str) -> AgentOutput:
        """Detect contradictions in research content."""
        task = f"""请检测以下内容中的矛盾和冲突：

## 内容
{content}

## 检测要求
1. 事实性矛盾
2. 观点分歧
3. 数据不一致
4. 方法冲突

## 输出格式
### 发现的矛盾
| 来源1 | 观点1 | 来源2 | 观点2 | 严重程度 |
|-------|-------|-------|-------|---------|

### 建议处理方式
[如何解决这些矛盾]
"""
        return await self.execute(task)

    async def compress_context(self, context: str, target_ratio: float = 0.5) -> AgentOutput:
        """Compress context while preserving key information."""
        task = f"""请压缩以下上下文，保留关键信息：

## 原始上下文
{context}

## 压缩目标
压缩到原文的 {target_ratio*100:.0f}%

## 压缩原则
1. 保留所有关键发现
2. 保留重要数据和结论
3. 移除冗余描述
4. 合并重复信息

## 输出
[压缩后的上下文]
"""
        return await self.execute(task)
