"""
Base Agent for NEXEN.

Provides the foundation for all agents with:
- Three-module pipeline execution
- Automatic memory management
- Structured output handling
- Error recovery
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from enum import Enum

import litellm

from nexen.config.agents import AgentConfig, get_agent_config
from nexen.config.settings import get_settings
from nexen.core.model_router import ModelRouter, Task, TaskType
from nexen.core.pipeline.prompt_pipeline import PromptPipeline, GeneratedPrompt
from nexen.core.pipeline.memory_retrieval import MemoryRetriever, RetrievedContext
from nexen.core.pipeline.context_preprocessor import ContextPreprocessor, PreprocessingResult

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    """Agent execution status."""

    IDLE = "idle"
    INITIALIZING = "initializing"
    RETRIEVING_MEMORY = "retrieving_memory"
    PREPROCESSING = "preprocessing"
    GENERATING_PROMPT = "generating_prompt"
    EXECUTING = "executing"
    WRITING_OUTPUT = "writing_output"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class AgentState:
    """State of an agent during execution."""

    agent_id: str
    status: AgentStatus = AgentStatus.IDLE
    current_task: Optional[str] = None
    session_id: Optional[str] = None

    # Pipeline states
    prompt: Optional[GeneratedPrompt] = None
    context: Optional[RetrievedContext] = None
    preprocessing: Optional[PreprocessingResult] = None

    # Execution tracking
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    tokens_used: int = 0
    model_used: Optional[str] = None

    # Error tracking
    error: Optional[str] = None
    retry_count: int = 0


@dataclass
class AgentOutput:
    """Output from an agent execution."""

    agent_id: str
    task: str
    result: str
    structured_data: dict = field(default_factory=dict)

    # Metadata
    model: str = ""
    tokens_used: int = 0
    duration_ms: int = 0
    confidence: float = 0.0

    # For other agents
    key_findings: list[str] = field(default_factory=list)
    uncertainties: list[str] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)
    cross_references: list[str] = field(default_factory=list)

    # Raw file path
    raw_output_path: Optional[Path] = None


class BaseAgent(ABC):
    """
    Base class for all NEXEN agents.

    Implements the three-module pipeline:
    1. Prompt Pipeline - Generate optimized prompts
    2. Memory Retrieval - Get relevant context
    3. Context Preprocessing - Clean and organize context
    """

    def __init__(
        self,
        agent_id: str,
        session_id: Optional[str] = None,
        use_pipeline: bool = True,
    ):
        """
        Initialize an agent.

        Args:
            agent_id: The agent's ID (must match config)
            session_id: Current research session ID
            use_pipeline: Whether to use the full 3-module pipeline
        """
        self.agent_id = agent_id
        self.config = get_agent_config(agent_id)
        self.settings = get_settings()
        self.session_id = session_id or "default"
        self.use_pipeline = use_pipeline

        # Initialize components
        self.router = ModelRouter()
        self.prompt_pipeline = PromptPipeline(self.config)
        self.memory_retriever = MemoryRetriever(self.config, self.session_id)
        self.context_preprocessor = ContextPreprocessor(self.config)

        # State tracking
        self.state = AgentState(agent_id=agent_id, session_id=session_id)

    async def execute(
        self,
        task: str,
        context: Optional[str] = None,
        skip_memory: bool = False,
        skip_preprocessing: bool = False,
    ) -> AgentOutput:
        """
        Execute a task with the full pipeline.

        Args:
            task: Task description
            context: Optional additional context
            skip_memory: Skip memory retrieval
            skip_preprocessing: Skip context preprocessing

        Returns:
            AgentOutput with results
        """
        self.state.status = AgentStatus.INITIALIZING
        self.state.current_task = task
        self.state.start_time = datetime.now()

        try:
            # Module 2: Memory Retrieval (first for context)
            if self.use_pipeline and not skip_memory:
                self.state.status = AgentStatus.RETRIEVING_MEMORY
                retrieved = await self.memory_retriever.retrieve_context(task)
                self.state.context = retrieved
                memory_context = retrieved.formatted_content
            else:
                memory_context = ""

            # Combine contexts
            combined_context = self._combine_contexts(context, memory_context)

            # Module 3: Context Preprocessing
            if self.use_pipeline and not skip_preprocessing and combined_context:
                self.state.status = AgentStatus.PREPROCESSING
                preprocessing = await self.context_preprocessor.preprocess(
                    combined_context, task
                )
                self.state.preprocessing = preprocessing
                final_context = preprocessing.processed_context
            else:
                final_context = combined_context

            # Module 1: Prompt Pipeline
            if self.use_pipeline:
                self.state.status = AgentStatus.GENERATING_PROMPT
                generated = await self.prompt_pipeline.generate_prompt(
                    task, final_context
                )
                self.state.prompt = generated
                system_prompt = generated.system_prompt
                user_prompt = generated.user_prompt
            else:
                system_prompt = self.prompt_pipeline.get_static_system_prompt()
                user_prompt = self._build_user_prompt(task, final_context)

            # Main execution
            self.state.status = AgentStatus.EXECUTING
            output = await self._execute_with_model(
                system_prompt, user_prompt, task
            )

            # Write output to raw storage
            if self.config.output.write_to_raw:
                self.state.status = AgentStatus.WRITING_OUTPUT
                output.raw_output_path = await self._write_raw_output(output)

            self.state.status = AgentStatus.COMPLETED
            self.state.end_time = datetime.now()

            return output

        except Exception as e:
            self.state.status = AgentStatus.FAILED
            self.state.error = str(e)
            self.state.end_time = datetime.now()
            logger.error(f"Agent {self.agent_id} failed: {e}")
            raise

    async def execute_simple(self, task: str) -> str:
        """Execute a simple task without the full pipeline."""
        output = await self.execute(
            task,
            skip_memory=True,
            skip_preprocessing=True,
        )
        return output.result

    async def _execute_with_model(
        self,
        system_prompt: str,
        user_prompt: str,
        task: str,
    ) -> AgentOutput:
        """Execute the main LLM call."""
        # Get model from router
        routing = self.router.get_model_for_agent(self.agent_id)
        model = routing.model_id
        self.state.model_used = model

        # Build messages
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # Call LLM
        start_time = datetime.now()
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            temperature=self.config.module_3.temperature,
            max_tokens=self.config.module_3.max_tokens,
        )
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        # Extract result
        result = response.choices[0].message.content or ""
        tokens_used = response.usage.total_tokens if response.usage else 0
        self.state.tokens_used = tokens_used

        # Parse structured output
        structured = self._parse_structured_output(result)

        return AgentOutput(
            agent_id=self.agent_id,
            task=task,
            result=result,
            structured_data=structured,
            model=model,
            tokens_used=tokens_used,
            duration_ms=duration_ms,
            key_findings=structured.get("key_findings", []),
            uncertainties=structured.get("uncertainties", []),
            suggestions=structured.get("suggestions", []),
            cross_references=structured.get("cross_references", []),
        )

    def _build_user_prompt(self, task: str, context: Optional[str]) -> str:
        """Build a user prompt for simple execution."""
        parts = [f"## 任务\n{task}"]
        if context:
            parts.append(f"\n## 上下文\n{context}")
        parts.append("""
## 输出要求
1. 使用结构化的Markdown格式
2. 明确标注置信度和不确定点
3. 列出关键发现和建议
""")
        return "\n".join(parts)

    def _combine_contexts(
        self,
        provided: Optional[str],
        retrieved: str,
    ) -> str:
        """Combine provided and retrieved contexts."""
        parts = []
        if provided:
            parts.append(f"## 用户提供的上下文\n{provided}")
        if retrieved:
            parts.append(f"## 检索到的记忆\n{retrieved}")
        return "\n\n".join(parts)

    def _parse_structured_output(self, result: str) -> dict[str, Any]:
        """Parse structured data from agent output."""
        structured: dict[str, Any] = {}

        # Extract key findings
        findings = []
        uncertainties = []
        suggestions = []
        cross_refs = []

        current_section = None
        for line in result.split("\n"):
            line_lower = line.lower().strip()

            # Detect sections
            if "关键发现" in line or "key finding" in line_lower:
                current_section = "findings"
            elif "不确定" in line or "uncertaint" in line_lower:
                current_section = "uncertainties"
            elif "建议" in line or "suggest" in line_lower:
                current_section = "suggestions"
            elif "参考" in line or "reference" in line_lower or "相关agent" in line_lower:
                current_section = "cross_refs"

            # Extract list items
            elif line.strip().startswith(("-", "•", "*", "1", "2", "3")):
                item = line.strip().lstrip("-•*0123456789.").strip()
                if item:
                    if current_section == "findings":
                        findings.append(item)
                    elif current_section == "uncertainties":
                        uncertainties.append(item)
                    elif current_section == "suggestions":
                        suggestions.append(item)
                    elif current_section == "cross_refs":
                        cross_refs.append(item)

        structured["key_findings"] = findings
        structured["uncertainties"] = uncertainties
        structured["suggestions"] = suggestions
        structured["cross_references"] = cross_refs

        return structured

    async def _write_raw_output(self, output: AgentOutput) -> Path:
        """Write raw output to file system."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_output.md"
        raw_path = self.settings.get_session_path(
            self.session_id,
            "raw",
            self.agent_id,
            filename,
        )

        # Build content
        content = f"""---
agent: {self.agent_id}
model: {output.model}
task: "{output.task[:100]}..."
timestamp: {datetime.now().isoformat()}
tokens_used: {output.tokens_used}
duration_ms: {output.duration_ms}
---

## 任务
{output.task}

## 输出
{output.result}

## 关键发现
{chr(10).join('- ' + f for f in output.key_findings) if output.key_findings else '无'}

## 不确定点
{chr(10).join('- ' + u for u in output.uncertainties) if output.uncertainties else '无'}

## 后续建议
{chr(10).join('- ' + s for s in output.suggestions) if output.suggestions else '无'}
"""

        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_text(content, encoding="utf-8")

        logger.info(f"Wrote raw output to {raw_path}")
        return raw_path

    @abstractmethod
    def get_task_type(self) -> TaskType:
        """Return the primary task type for this agent."""
        pass

    @property
    def display_name(self) -> str:
        """Get agent display name."""
        return self.config.display_name

    @property
    def display_name_cn(self) -> str:
        """Get agent Chinese display name."""
        return self.config.display_name_cn

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}({self.agent_id})>"
