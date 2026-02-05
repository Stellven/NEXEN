"""
Agent Service - Direct agent execution.
"""

from dataclasses import dataclass
from typing import Optional

import os
import litellm
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
        model_override: Optional[str] = None,
    ) -> AgentResult:
        """
        Execute a single agent.

        Args:
            agent_id: Agent ID to execute
            task: Task for the agent
            session_id: Session ID
            context: Additional context
            model_override: Optional model ID to override default configuration

        Returns:
            AgentResult with output
        """
        # Dynamically get agent class
        agent = self._get_agent(agent_id, session_id)

        # Apply model override if provided
        if model_override:
            # Normalize model provider prefixes for litellm
            # litellm expects 'gemini/' but frontend/config might use 'google/'
            normalized_model = model_override
            if normalized_model.startswith("google/"):
                normalized_model = "gemini/" + normalized_model[7:]
            elif normalized_model.startswith("local/"):
                # Handle local models (e.g. LM Studio)
                # Default to host.docker.internal for Docker; can be overridden via env
                api_base = os.getenv("LOCAL_LLM_API_BASE", "http://host.docker.internal:1234/v1")

                # Register model configuration in litellm's model_list
                # This maps the local model ID to OpenAI-compatible endpoint settings
                if not hasattr(litellm, "model_list") or litellm.model_list is None:
                    litellm.model_list = []

                # Register if not already present
                if not any(m.get("model_name") == normalized_model for m in litellm.model_list):
                    litellm.model_list.append({
                        "model_name": normalized_model,
                        "litellm_params": {
                            "model": "openai/local-model",
                            "api_base": api_base,
                            "api_key": "lm-studio",
                        }
                    })

            # Update main role model
            agent.config.role_model = normalized_model

            # Module 1: Prompt Pipeline
            agent.config.module_1.generator_model = normalized_model
            agent.config.module_1.reviewer_model = normalized_model
            agent.config.module_1.refiner_model = normalized_model

            # Module 2: Memory Retrieval (Analyzer)
            agent.config.module_2.analyzer_model = normalized_model

            # Module 3: Context Preprocessing
            # Force override even if originally None/Empty to prevent fallback to OpenAI
            agent.config.module_3.preprocessor_model = normalized_model

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
            "meta_coordinator": "nexen.agents.generic.MetaCoordinatorAgent",
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
            # Use GenericAgent for unknown agents
            from nexen.agents.generic import GenericAgent
            return GenericAgent(agent_id=agent_id, session_id=session_id)

        module_path, class_name = agent_map[agent_id].rsplit(".", 1)

        import importlib
        module = importlib.import_module(module_path)
        agent_class = getattr(module, class_name)

        return agent_class(agent_id=agent_id, session_id=session_id)
