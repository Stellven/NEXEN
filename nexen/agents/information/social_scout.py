"""
Social Scout Agent - 社交侦察

The social media intelligence expert tracking AI research community dynamics.
Part of the Information cluster.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent, AgentOutput


class SocialScoutAgent(BaseAgent):
    """
    Social Scout: The social media intelligence expert.

    Uses Grok 3 for real-time X/Twitter access.

    Responsibilities:
    - Social media monitoring
    - Trend tracking
    - Sentiment analysis
    - Informal information gathering
    """

    def __init__(self, session_id: Optional[str] = None, **kwargs):
        kwargs.pop('agent_id', None)
        super().__init__(
            agent_id="social_scout",
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return TaskType.SOCIAL_MEDIA

    async def track_topic(self, topic: str) -> AgentOutput:
        """Track a topic on social media."""
        task = f"""请追踪以下主题在社交媒体上的讨论：

## 主题
{topic}

## 追踪平台
- X/Twitter
- Reddit (r/MachineLearning)
- Hacker News

## 追踪要求
1. 热门讨论和帖子
2. 研究者的观点
3. 争议和辩论
4. 新闻和公告

## 输出格式
### 热门讨论
[关键讨论摘要]

### 研究者观点
| 人物 | 观点 | 来源 |
|------|------|------|

### 社区情绪
[整体态度分析]
"""
        return await self.execute(task)

    async def monitor_researcher(self, name: str) -> AgentOutput:
        """Monitor a researcher's social media activity."""
        task = f"""请监控以下研究者的社交媒体动态：

## 研究者
{name}

## 监控内容
1. 最近发布的内容
2. 表达的观点
3. 互动和讨论
4. 分享的资源

## 输出格式
### 最近动态
[时间线]

### 关键观点
[重要表态]
"""
        return await self.execute(task)
