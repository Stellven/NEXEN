"""
Base classes for NEXEN skills.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional
import json


class SkillCategory(str, Enum):
    """Skill categories."""
    DATABASES = "databases"           # 科学数据库
    BIOINFORMATICS = "bioinformatics" # 生物信息学
    CHEMINFORMATICS = "cheminformatics" # 化学信息学
    CLINICAL = "clinical"             # 临床研究
    MACHINE_LEARNING = "machine_learning" # 机器学习
    DATA_ANALYSIS = "data_analysis"   # 数据分析
    COMMUNICATION = "communication"   # 科学沟通
    METHODOLOGY = "methodology"       # 研究方法
    LITERATURE = "literature"         # 文献检索
    VISUALIZATION = "visualization"   # 可视化


@dataclass
class SkillParameter:
    """Definition of a skill parameter."""
    name: str
    description: str
    type: str = "string"  # string, number, boolean, array, object
    required: bool = True
    default: Any = None
    enum: Optional[list] = None


@dataclass
class SkillResult:
    """Result from skill execution."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "metadata": self.metadata,
        }
    
    def to_markdown(self) -> str:
        """Convert result to markdown for display."""
        if not self.success:
            return f"**Error:** {self.error}"
        
        if isinstance(self.data, str):
            return self.data
        elif isinstance(self.data, dict):
            return json.dumps(self.data, indent=2, ensure_ascii=False)
        elif isinstance(self.data, list):
            return "\n".join([f"- {item}" for item in self.data])
        else:
            return str(self.data)


class Skill(ABC):
    """Base class for all NEXEN skills."""
    
    # Subclasses should override these
    name: str = "base_skill"
    display_name: str = "Base Skill"
    description: str = "A base skill"
    category: SkillCategory = SkillCategory.METHODOLOGY
    parameters: list[SkillParameter] = []
    
    def __init__(self, model: str = "openai/gpt-4o"):
        """Initialize skill with an LLM model."""
        self.model = model
    
    @abstractmethod
    async def execute(self, params: dict, context: Optional[dict] = None) -> SkillResult:
        """
        Execute the skill with given parameters.
        
        Args:
            params: Dictionary of parameter values
            context: Optional context (session info, memory, etc.)
            
        Returns:
            SkillResult with execution results
        """
        pass
    
    def validate_params(self, params: dict) -> tuple[bool, Optional[str]]:
        """Validate parameters against schema."""
        for param in self.parameters:
            if param.required and param.name not in params:
                return False, f"Missing required parameter: {param.name}"
            
            if param.enum and param.name in params:
                if params[param.name] not in param.enum:
                    return False, f"Invalid value for {param.name}: must be one of {param.enum}"
        
        return True, None
    
    def get_system_prompt(self) -> str:
        """Get system prompt for LLM-based skills."""
        return f"""You are executing the "{self.display_name}" skill.

Description: {self.description}

Provide accurate, well-structured results. Format output as markdown when appropriate."""
    
    def to_dict(self) -> dict:
        """Convert skill info to dictionary."""
        return {
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "category": self.category.value,
            "parameters": [
                {
                    "name": p.name,
                    "description": p.description,
                    "type": p.type,
                    "required": p.required,
                    "default": p.default,
                    "enum": p.enum,
                }
                for p in self.parameters
            ],
        }


class LLMSkill(Skill):
    """Base class for LLM-powered skills."""
    
    async def call_llm(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Call LLM with the given prompt."""
        import litellm
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = await litellm.acompletion(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=4096,
        )
        
        return response.choices[0].message.content
