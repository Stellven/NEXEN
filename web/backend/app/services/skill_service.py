"""
Skill Service - Quick access to common research operations.
"""

from dataclasses import dataclass
from typing import Optional

from nexen.core.base_agent import AgentOutput


@dataclass
class SkillResult:
    """Result from skill execution."""
    
    result: str
    tokens_used: int
    duration_ms: int


class SkillService:
    """Service for executing research skills."""

    async def survey(
        self,
        topic: str,
        max_papers: int = 15,
        session_id: Optional[str] = None,
    ) -> SkillResult:
        """Execute /survey skill."""
        from nexen.agents.information.explorer import ExplorerAgent
        
        agent = ExplorerAgent(session_id=session_id)
        output = await agent.search_papers(topic, max_results=max_papers)
        
        return SkillResult(
            result=output.result,
            tokens_used=output.tokens_used,
            duration_ms=output.duration_ms,
        )

    async def who(
        self,
        person: str,
        session_id: Optional[str] = None,
    ) -> SkillResult:
        """Execute /who skill."""
        from nexen.agents.reasoning.genealogist import GenealogistAgent
        
        agent = GenealogistAgent(session_id=session_id)
        output = await agent.build_profile(person)
        
        return SkillResult(
            result=output.result,
            tokens_used=output.tokens_used,
            duration_ms=output.duration_ms,
        )

    async def evolution(
        self,
        technology: str,
        session_id: Optional[str] = None,
    ) -> SkillResult:
        """Execute /evolution skill."""
        from nexen.agents.reasoning.historian import HistorianAgent
        
        agent = HistorianAgent(session_id=session_id)
        output = await agent.analyze_evolution(technology)
        
        return SkillResult(
            result=output.result,
            tokens_used=output.tokens_used,
            duration_ms=output.duration_ms,
        )

    async def critique(
        self,
        content: str,
        session_id: Optional[str] = None,
    ) -> SkillResult:
        """Execute /critique skill."""
        from nexen.agents.reasoning.critic import CriticAgent
        
        agent = CriticAgent(session_id=session_id)
        output = await agent.critique_method(content)
        
        return SkillResult(
            result=output.result,
            tokens_used=output.tokens_used,
            duration_ms=output.duration_ms,
        )
