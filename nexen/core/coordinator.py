"""
Meta-Coordinator for NEXEN.

The central orchestrator that:
- Decomposes complex research tasks
- Assigns tasks to appropriate agents
- Coordinates multi-agent workflows
- Synthesizes final outputs
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional

import litellm

from nexen.config.agents import get_agent_config, AgentCluster, AGENT_CONFIGS
from nexen.config.models import TaskType
from nexen.config.settings import get_settings
from nexen.core.base_agent import BaseAgent, AgentOutput, AgentState
from nexen.core.model_router import ModelRouter

logger = logging.getLogger(__name__)


class TaskPriority(str, Enum):
    """Task priority levels."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class SubTask:
    """A subtask assigned to an agent."""

    task_id: str
    description: str
    assigned_agent: str
    priority: TaskPriority = TaskPriority.MEDIUM
    dependencies: list[str] = field(default_factory=list)

    # Execution state
    status: str = "pending"  # pending, running, completed, failed
    output: Optional[AgentOutput] = None
    error: Optional[str] = None


@dataclass
class TaskDecomposition:
    """Result of task decomposition."""

    original_task: str
    subtasks: list[SubTask] = field(default_factory=list)
    execution_order: list[list[str]] = field(default_factory=list)  # Parallel groups
    estimated_time_minutes: int = 0


@dataclass
class CoordinationResult:
    """Result of coordinated multi-agent execution."""

    task: str
    subtasks: list[SubTask]
    final_synthesis: str
    total_tokens: int = 0
    total_duration_ms: int = 0

    # Agent outputs by ID
    agent_outputs: dict[str, AgentOutput] = field(default_factory=dict)


class MetaCoordinator:
    """
    Meta-Coordinator: The brain of NEXEN.

    Orchestrates multi-agent collaboration for complex research tasks.
    """

    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.settings = get_settings()
        self.router = ModelRouter()
        self.config = get_agent_config("meta_coordinator")

        # Agent registry
        self._agents: dict[str, BaseAgent] = {}

    async def coordinate(
        self,
        task: str,
        context: Optional[str] = None,
        max_agents: int = 5,
    ) -> CoordinationResult:
        """
        Coordinate agents to complete a complex task.

        Args:
            task: The research task to complete
            context: Optional additional context
            max_agents: Maximum number of agents to involve

        Returns:
            CoordinationResult with all outputs and synthesis
        """
        logger.info(f"Coordinating task: {task[:100]}...")

        # Step 1: Decompose task
        decomposition = await self.decompose_task(task, context, max_agents)
        logger.info(
            f"Decomposed into {len(decomposition.subtasks)} subtasks"
        )

        # Step 2: Execute subtasks in order
        agent_outputs: dict[str, AgentOutput] = {}
        total_tokens = 0
        total_duration = 0

        for parallel_group in decomposition.execution_order:
            # Execute group in parallel
            tasks = []
            for task_id in parallel_group:
                subtask = next(
                    (st for st in decomposition.subtasks if st.task_id == task_id),
                    None,
                )
                if subtask:
                    tasks.append(self._execute_subtask(subtask, agent_outputs))

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            for i, result in enumerate(results):
                task_id = parallel_group[i]
                subtask = next(
                    st for st in decomposition.subtasks if st.task_id == task_id
                )

                if isinstance(result, Exception):
                    subtask.status = "failed"
                    subtask.error = str(result)
                    logger.error(f"Subtask {task_id} failed: {result}")
                else:
                    subtask.status = "completed"
                    subtask.output = result
                    agent_outputs[task_id] = result
                    total_tokens += result.tokens_used
                    total_duration += result.duration_ms

        # Step 3: Synthesize results
        synthesis = await self._synthesize_results(task, decomposition, agent_outputs)

        return CoordinationResult(
            task=task,
            subtasks=decomposition.subtasks,
            final_synthesis=synthesis,
            total_tokens=total_tokens,
            total_duration_ms=total_duration,
            agent_outputs=agent_outputs,
        )

    async def decompose_task(
        self,
        task: str,
        context: Optional[str],
        max_agents: int,
    ) -> TaskDecomposition:
        """Decompose a complex task into subtasks."""
        # Build agent list for prompt
        agent_list = "\n".join(
            f"- **{cfg.agent_id}** ({cfg.display_name_cn}): {', '.join(cfg.responsibilities[:2])}"
            for cfg in AGENT_CONFIGS.values()
            if cfg.cluster != AgentCluster.COORDINATION
        )

        decomposition_prompt = f"""你是NEXEN研究系统的元协调者。请分解以下研究任务。

## 可用Agent
{agent_list}

## 研究任务
{task}

## 上下文
{context if context else "无额外上下文"}

## 要求
1. 将任务分解为3-{max_agents}个子任务
2. 为每个子任务选择最合适的Agent
3. 考虑任务之间的依赖关系
4. 标注优先级

请以JSON格式输出：
```json
{{
  "subtasks": [
    {{
      "task_id": "task_1",
      "description": "子任务描述",
      "assigned_agent": "agent_id",
      "priority": "high|medium|low",
      "dependencies": []
    }}
  ],
  "execution_order": [["task_1"], ["task_2", "task_3"]],
  "estimated_time_minutes": 10
}}
```
"""

        response = await litellm.acompletion(
            model=self.config.role_model,
            messages=[{"role": "user", "content": decomposition_prompt}],
            temperature=0.3,
            max_tokens=2000,
        )

        content = response.choices[0].message.content or ""

        # Parse JSON from response
        decomposition = self._parse_decomposition(content, task)

        return decomposition

    async def _execute_subtask(
        self,
        subtask: SubTask,
        previous_outputs: dict[str, AgentOutput],
    ) -> AgentOutput:
        """Execute a single subtask."""
        subtask.status = "running"

        # Build context from dependencies
        dep_context = ""
        for dep_id in subtask.dependencies:
            if dep_id in previous_outputs:
                dep_output = previous_outputs[dep_id]
                dep_context += f"\n## {dep_id}的结果\n{dep_output.result[:2000]}...\n"

        # Get or create agent
        agent = self._get_agent(subtask.assigned_agent)

        # Execute
        output = await agent.execute(
            subtask.description,
            context=dep_context if dep_context else None,
        )

        return output

    async def _synthesize_results(
        self,
        original_task: str,
        decomposition: TaskDecomposition,
        outputs: dict[str, AgentOutput],
    ) -> str:
        """Synthesize all agent outputs into a final result."""
        # Build summary of all outputs
        outputs_summary = []
        for subtask in decomposition.subtasks:
            if subtask.task_id in outputs:
                output = outputs[subtask.task_id]
                outputs_summary.append(f"""
### {subtask.assigned_agent}: {subtask.description}
**关键发现**: {', '.join(output.key_findings[:3]) if output.key_findings else '无'}
**不确定点**: {', '.join(output.uncertainties[:2]) if output.uncertainties else '无'}
**结果摘要**: {output.result[:500]}...
""")

        synthesis_prompt = f"""作为元协调者，请综合以下Agent的输出，生成最终研究报告。

## 原始任务
{original_task}

## Agent输出
{''.join(outputs_summary)}

## 要求
1. 整合所有关键发现
2. 标注矛盾或需要进一步验证的点
3. 提供结构化的最终报告
4. 列出后续行动建议

生成综合报告：
"""

        response = await litellm.acompletion(
            model=self.config.role_model,
            messages=[{"role": "user", "content": synthesis_prompt}],
            temperature=0.3,
            max_tokens=4000,
        )

        return response.choices[0].message.content or ""

    def _get_agent(self, agent_id: str) -> BaseAgent:
        """Get or create an agent instance."""
        if agent_id not in self._agents:
            # Dynamically import agent class
            agent_class = self._get_agent_class(agent_id)
            self._agents[agent_id] = agent_class(
                agent_id=agent_id,
                session_id=self.session_id,
            )
        return self._agents[agent_id]

    def _get_agent_class(self, agent_id: str) -> type:
        """Get the agent class for an agent ID."""
        # For now, return a generic implementation
        # In full implementation, import from nexen.agents.*
        from nexen.core.base_agent import BaseAgent

        class GenericAgent(BaseAgent):
            def get_task_type(self) -> TaskType:
                return TaskType.GENERAL

        return GenericAgent

    def _parse_decomposition(
        self,
        content: str,
        original_task: str,
    ) -> TaskDecomposition:
        """Parse decomposition from LLM response."""
        import json

        # Extract JSON from response
        try:
            # Find JSON block
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = content[start:end]
                data = json.loads(json_str)

                subtasks = []
                for st in data.get("subtasks", []):
                    subtasks.append(
                        SubTask(
                            task_id=st.get("task_id", f"task_{len(subtasks)}"),
                            description=st.get("description", ""),
                            assigned_agent=st.get("assigned_agent", "explorer"),
                            priority=TaskPriority(st.get("priority", "medium")),
                            dependencies=st.get("dependencies", []),
                        )
                    )

                return TaskDecomposition(
                    original_task=original_task,
                    subtasks=subtasks,
                    execution_order=data.get("execution_order", [[st.task_id for st in subtasks]]),
                    estimated_time_minutes=data.get("estimated_time_minutes", 5),
                )

        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse decomposition: {e}")

        # Fallback: single task to explorer
        return TaskDecomposition(
            original_task=original_task,
            subtasks=[
                SubTask(
                    task_id="task_1",
                    description=original_task,
                    assigned_agent="explorer",
                    priority=TaskPriority.HIGH,
                )
            ],
            execution_order=[["task_1"]],
        )

    async def quick_ask(self, question: str) -> str:
        """Quick question to the coordinator without full decomposition."""
        response = await litellm.acompletion(
            model=self.config.role_model,
            messages=[
                {
                    "role": "system",
                    "content": self.config.persona,
                },
                {"role": "user", "content": question},
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        return response.choices[0].message.content or ""

    def list_available_agents(self) -> list[str]:
        """List all available agent IDs."""
        return [
            cfg.agent_id
            for cfg in AGENT_CONFIGS.values()
            if cfg.cluster != AgentCluster.COORDINATION
        ]
