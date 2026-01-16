"""
Research Service - Orchestrates multi-agent research tasks.
"""

from dataclasses import dataclass
from typing import Optional, Callable, Any

from nexen.core.coordinator import MetaCoordinator


@dataclass
class ResearchResult:
    """Result of a research task."""
    
    synthesis: str
    subtasks: list[dict]
    total_tokens: int
    total_duration_ms: int


class ResearchService:
    """Service for executing research tasks."""

    def __init__(self):
        self._coordinator: Optional[MetaCoordinator] = None

    async def execute(
        self,
        task: str,
        session_id: Optional[str] = None,
        max_agents: int = 5,
        context: Optional[str] = None,
        on_progress: Optional[Callable] = None,
    ) -> ResearchResult:
        """
        Execute a multi-agent research task.
        
        Args:
            task: Research task description
            session_id: Session ID to use
            max_agents: Maximum agents to involve
            context: Additional context
            on_progress: Callback for progress updates
            
        Returns:
            ResearchResult with synthesis and subtask info
        """
        # Create coordinator for this session
        coordinator = MetaCoordinator(session_id)
        
        # Notify starting
        if on_progress:
            await on_progress("decomposing", "Decomposing task...", [])
        
        # Execute coordination
        result = await coordinator.coordinate(
            task=task,
            context=context,
            max_agents=max_agents,
        )
        
        # Format subtasks
        subtasks = []
        for st in result.subtasks:
            subtasks.append({
                "task_id": st.task_id,
                "description": st.description,
                "assigned_agent": st.assigned_agent,
                "status": st.status,
                "tokens_used": st.output.tokens_used if st.output else 0,
            })
        
        # Notify completion
        if on_progress:
            await on_progress("completed", "Research completed", subtasks)
        
        return ResearchResult(
            synthesis=result.final_synthesis,
            subtasks=subtasks,
            total_tokens=result.total_tokens,
            total_duration_ms=result.total_duration_ms,
        )
