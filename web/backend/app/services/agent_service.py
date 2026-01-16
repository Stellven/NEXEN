"""
Agent Service - Direct agent execution.
"""

from dataclasses import dataclass
from typing import Optional

from nexen.core.base_agent import AgentOutput


@dataclass
class AgentResult:
    """Result from agent execution."""
    
    result: str
    tokens_used: int
    duration_ms: int
    key_findings: list[str]


class AgentService:
    """Service for executing individual agents."""

    async def execute_agent(
        self,
        agent_id: str,
        task: str,
        session_id: Optional[str] = None,
        context: Optional[str] = None,
    ) -> AgentResult:
        """
        Execute a single agent.
        
        Args:
            agent_id: Agent ID to execute
            task: Task for the agent
            session_id: Session ID
            context: Additional context
            
        Returns:
            AgentResult with output
        """
        # Dynamically get agent class
        agent = self._get_agent(agent_id, session_id)
        
        # Execute
        output: AgentOutput = await agent.execute(task, context=context)
        
        return AgentResult(
            result=output.result,
            tokens_used=output.tokens_used,
            duration_ms=output.duration_ms,
            key_findings=output.key_findings,
        )

    def _get_agent(self, agent_id: str, session_id: Optional[str]):
        """Get an agent instance by ID."""
        # Import agent classes dynamically
        agent_map = {
            "explorer": "nexen.agents.information.explorer.ExplorerAgent",
            "critic": "nexen.agents.reasoning.critic.CriticAgent",
            "scribe": "nexen.agents.production.scribe.ScribeAgent",
            "logician": "nexen.agents.reasoning.logician.LogicianAgent",
            "connector": "nexen.agents.reasoning.connector.ConnectorAgent",
            "genealogist": "nexen.agents.reasoning.genealogist.GenealogistAgent",
            "historian": "nexen.agents.reasoning.historian.HistorianAgent",
            "social_scout": "nexen.agents.information.social_scout.SocialScoutAgent",
            "cn_specialist": "nexen.agents.information.cn_specialist.CNSpecialistAgent",
            "vision_analyst": "nexen.agents.information.vision_analyst.VisionAnalystAgent",
            "builder": "nexen.agents.production.builder.BuilderAgent",
            "archivist": "nexen.agents.production.archivist.ArchivistAgent",
            "prompt_engineer": "nexen.agents.production.prompt_engineer.PromptEngineerAgent",
        }
        
        if agent_id not in agent_map:
            raise ValueError(f"Unknown agent: {agent_id}")
        
        module_path, class_name = agent_map[agent_id].rsplit(".", 1)
        
        import importlib
        module = importlib.import_module(module_path)
        agent_class = getattr(module, class_name)
        
        return agent_class(session_id=session_id)
