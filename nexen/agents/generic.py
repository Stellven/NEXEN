"""
Generic Agent - 通用 Agent

A concrete implementation of BaseAgent that can be used for any agent type.
This is used for meta_coordinator and other agents that don't have specialized implementations.
"""

from typing import Optional

from nexen.config.models import TaskType
from nexen.core.base_agent import BaseAgent


class GenericAgent(BaseAgent):
    """
    Generic agent that can be used for any task type.

    This is a concrete implementation of BaseAgent that can be instantiated
    directly with any agent_id. Used for:
    - meta_coordinator
    - Unknown/custom agent types
    - Testing and development
    """

    def __init__(
        self,
        agent_id: str = "generic",
        session_id: Optional[str] = None,
        task_type: TaskType = TaskType.GENERAL,
        **kwargs,
    ):
        # Remove agent_id from kwargs if present to avoid duplicate
        kwargs.pop('agent_id', None)
        self._task_type = task_type
        super().__init__(
            agent_id=agent_id,
            session_id=session_id,
            **kwargs,
        )

    def get_task_type(self) -> TaskType:
        return self._task_type


class MetaCoordinatorAgent(GenericAgent):
    """
    Meta-Coordinator Agent - The orchestrator that coordinates other agents.

    Responsibilities:
    - Task analysis and decomposition
    - Agent assignment and coordination
    - Result synthesis
    - Quality oversight
    """

    def __init__(self, agent_id: str = "meta_coordinator", session_id: Optional[str] = None, **kwargs):
        # Accept agent_id but use hardcoded value
        super().__init__(
            agent_id="meta_coordinator",
            session_id=session_id,
            task_type=TaskType.COMPLEX_PLANNING,
            **kwargs,
        )
