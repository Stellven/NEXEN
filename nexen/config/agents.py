"""
Agent configurations for all 14 NEXEN agents.

Optimized for three providers: OpenAI, Anthropic (Claude), and Google (Gemini).
Default model: OpenAI GPT-4o (fallback when other providers not available)
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class AgentCluster(str, Enum):
    """Agent cluster classification."""
    REASONING = "reasoning"
    INFORMATION = "information"
    PRODUCTION = "production"
    COORDINATION = "coordination"


class CharacterTrait(str, Enum):
    """Character trait levels."""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass
class Module1Config:
    """Prompt Pipeline configuration."""
    generator_model: str = "openai/gpt-4o"
    reviewer_model: str = "openai/gpt-4o"
    refiner_model: str = "openai/gpt-4o"
    template_type: str = "general"
    pass_threshold: int = 40
    max_iterations: int = 3
    special_instructions: str = ""


@dataclass
class Module2Config:
    """Memory Retrieval configuration."""
    analyzer_model: str = "openai/gpt-4o-mini"
    default_insights: list[str] = field(default_factory=lambda: ["key_findings.md", "open_questions.md"])
    agent_digests: list[str] = field(default_factory=list)
    semantic_search_enabled: bool = True
    semantic_top_k: int = 3
    token_budget: int = 8000
    focus_topics: list[str] = field(default_factory=list)


@dataclass
class Module3Config:
    """Context Preprocessing configuration."""
    preprocessor_model: str = ""
    tasks: list[str] = field(default_factory=lambda: ["deduplication", "noise_reduction", "importance_ranking"])
    temperature: float = 0.3
    max_tokens: int = 4000


@dataclass
class OutputConfig:
    """Output configuration for an agent."""
    write_to_raw: bool = True
    raw_path_template: str = "raw/{agent_id}/"
    trigger_archivist: bool = True
    output_formats: list[str] = field(default_factory=lambda: ["markdown"])


@dataclass
class AgentConfig:
    """Complete configuration for a NEXEN agent."""
    agent_id: str
    display_name: str
    display_name_cn: str
    cluster: AgentCluster
    role_model: str
    fallback_model: Optional[str] = None
    persona: str = ""
    responsibilities: list[str] = field(default_factory=list)
    traits: dict[str, CharacterTrait] = field(default_factory=dict)
    data_sources: list[str] = field(default_factory=list)
    module_1: Module1Config = field(default_factory=Module1Config)
    module_2: Module2Config = field(default_factory=Module2Config)
    module_3: Module3Config = field(default_factory=Module3Config)
    output: OutputConfig = field(default_factory=OutputConfig)


# =============================================================================
# Agent Configurations - 默认使用 OpenAI GPT-4o
# =============================================================================

AGENT_CONFIGS: dict[str, AgentConfig] = {
    "meta_coordinator": AgentConfig(
        agent_id="meta_coordinator",
        display_name="Meta-Coordinator",
        display_name_cn="元协调者",
        cluster=AgentCluster.COORDINATION,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一位资深的AI研究PI，负责分解任务、协调Agent并整合输出。",
        responsibilities=["分解复杂研究任务", "分配任务给合适的Agent", "整合各Agent输出", "做出最终决策"],
    ),
    "logician": AgentConfig(
        agent_id="logician",
        display_name="Logician",
        display_name_cn="逻辑推理者",
        cluster=AgentCluster.REASONING,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一个严格的逻辑推理专家，擅长数学证明和形式化验证。",
        responsibilities=["逻辑推理和数学证明", "形式化验证", "复杂度分析", "理论正确性审查"],
    ),
    "critic": AgentConfig(
        agent_id="critic",
        display_name="Critic",
        display_name_cn="批判者",
        cluster=AgentCluster.REASONING,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一个严格的学术批判者，善于发现方法缺陷和提供建设性意见。",
        responsibilities=["方法审查和批判", "假设质疑", "反例构建", "实验设计审查"],
    ),
    "connector": AgentConfig(
        agent_id="connector",
        display_name="Connector",
        display_name_cn="连接者",
        cluster=AgentCluster.REASONING,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一个跨领域的知识连接者，擅长发现不同领域间的深层联系。",
        responsibilities=["跨领域关联发现", "类比推理", "思想融合", "创新点识别"],
    ),
    "genealogist": AgentConfig(
        agent_id="genealogist",
        display_name="Genealogist",
        display_name_cn="谱系学家",
        cluster=AgentCluster.REASONING,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一位学术谱系学家，专注于构建人物档案和追溯学术师承关系。",
        responsibilities=["人物档案构建", "学术师承追溯", "思想演进分析", "学派识别"],
    ),
    "historian": AgentConfig(
        agent_id="historian",
        display_name="Historian",
        display_name_cn="技术历史学家",
        cluster=AgentCluster.REASONING,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一位技术史学家，专注于梳理技术演进历程和识别里程碑。",
        responsibilities=["技术起源追溯", "里程碑识别", "演进轴识别", "趋势预测"],
    ),
    "explorer": AgentConfig(
        agent_id="explorer",
        display_name="Explorer",
        display_name_cn="探索者",
        cluster=AgentCluster.INFORMATION,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一个充满好奇心的研究探索者，擅长文献检索和趋势发现。",
        responsibilities=["文献检索和筛选", "新方向发现", "假设提出", "研究趋势追踪"],
    ),
    "social_scout": AgentConfig(
        agent_id="social_scout",
        display_name="Social Scout",
        display_name_cn="社交侦察",
        cluster=AgentCluster.INFORMATION,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是AI研究社区的情报专家，擅长追踪社交媒体上的研究动态。",
        responsibilities=["社交媒体监控", "热点追踪", "舆情分析", "非正式信息获取"],
    ),
    "cn_specialist": AgentConfig(
        agent_id="cn_specialist",
        display_name="CN Specialist",
        display_name_cn="中文专家",
        cluster=AgentCluster.INFORMATION,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是中文学术资源专家，擅长中文文献检索和术语翻译。",
        responsibilities=["中文文献检索", "中文社区分析", "术语翻译", "国内生态理解"],
    ),
    "vision_analyst": AgentConfig(
        agent_id="vision_analyst",
        display_name="Vision Analyst",
        display_name_cn="视觉分析师",
        cluster=AgentCluster.INFORMATION,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一个多模态研究分析师，擅长解读论文图表和架构图。",
        responsibilities=["图表分析", "架构图解读", "可视化比较", "多模态理解"],
    ),
    "builder": AgentConfig(
        agent_id="builder",
        display_name="Builder",
        display_name_cn="构建者",
        cluster=AgentCluster.PRODUCTION,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一个资深的ML工程研究员，擅长将想法转化为可执行代码。",
        responsibilities=["代码实现", "实验设计", "原型构建", "性能优化"],
    ),
    "scribe": AgentConfig(
        agent_id="scribe",
        display_name="Scribe",
        display_name_cn="记录者",
        cluster=AgentCluster.PRODUCTION,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一个优秀的学术写作者，擅长将复杂讨论提炼为清晰结构。",
        responsibilities=["论文撰写", "文档整理", "报告生成", "知识结构化"],
    ),
    "archivist": AgentConfig(
        agent_id="archivist",
        display_name="Archivist",
        display_name_cn="档案管理员",
        cluster=AgentCluster.PRODUCTION,
        role_model="openai/gpt-4o-mini",
        fallback_model="google/gemini-2.0-flash",
        persona="你是研究档案管理员，负责整理和提炼研究过程中产生的信息。",
        responsibilities=["记忆管理", "摘要生成", "知识索引", "矛盾检测"],
    ),
    "prompt_engineer": AgentConfig(
        agent_id="prompt_engineer",
        display_name="Prompt Engineer",
        display_name_cn="提示词工程师",
        cluster=AgentCluster.PRODUCTION,
        role_model="openai/gpt-4o",
        fallback_model="google/gemini-2.0-pro",
        persona="你是一位专业的AI提示词工程师，擅长设计高质量的系统提示词。",
        responsibilities=["系统提示词设计", "Agent性格优化", "任务提示词生成", "提示词评审"],
    ),
}


def get_agent_config(agent_id: str) -> AgentConfig:
    """Get configuration for a specific agent."""
    if agent_id not in AGENT_CONFIGS:
        raise ValueError(f"Unknown agent: {agent_id}")
    return AGENT_CONFIGS[agent_id]


def get_agents_by_cluster(cluster: AgentCluster) -> list[AgentConfig]:
    """Get all agents in a specific cluster."""
    return [cfg for cfg in AGENT_CONFIGS.values() if cfg.cluster == cluster]
