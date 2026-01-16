# NEXEN 提示词工程系统设计

> **核心理念**: 将"李教授"提示词优化专家系统整合为NEXEN的智能提示词生成引擎

---

## 目录

1. [系统概述](#1-系统概述)
2. [4-D方法论集成](#2-4-d方法论集成)
3. [信息源优先级配置](#3-信息源优先级配置)
4. [多元思维模式映射](#4-多元思维模式映射)
5. [Agent提示词模板库](#5-agent提示词模板库)
6. [论文分析方法论集成](#6-论文分析方法论集成)
7. [实现架构](#7-实现架构)

---

## 1. 系统概述

### 1.1 整合目标

将"李教授"提示词优化系统的核心能力整合到NEXEN中，实现：

```
┌─────────────────────────────────────────────────────────────────────┐
│                    提示词工程系统在NEXEN中的角色                     │
└─────────────────────────────────────────────────────────────────────┘

                         用户任务
                            │
                            ▼
                   ┌─────────────────┐
                   │ Meta-Coordinator │
                   │   任务分解       │
                   └────────┬────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │     Prompt Engineer Agent    │  ← 整合李教授系统
              │                             │
              │  ┌───────────────────────┐  │
              │  │   4-D 方法论引擎      │  │
              │  │   ┌─────┬─────┬─────┐│  │
              │  │   │解构 │诊断 │开发 ││  │
              │  │   └─────┴─────┴─────┘│  │
              │  └───────────────────────┘  │
              │                             │
              │  ┌───────────────────────┐  │
              │  │  信息源优先级配置     │  │
              │  │  期刊/实验室/会议     │  │
              │  └───────────────────────┘  │
              │                             │
              │  ┌───────────────────────┐  │
              │  │  多元思维模式库       │  │
              │  │  计算/系统/批判/...   │  │
              │  └───────────────────────┘  │
              └─────────────┬───────────────┘
                            │
                            ▼
                    为其他Agent生成
                    最优化的提示词
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         Explorer      Logician      Genealogist
         (检索)        (推理)        (谱系)
```

### 1.2 核心能力

| 能力 | 来源 | 在NEXEN中的应用 |
|------|------|----------------|
| 4-D方法论 | 李教授系统 | 提示词生成流水线 |
| 信息源优先级 | 李教授系统 | 知识库数据源配置 |
| 多元思维模式 | 李教授系统 | Agent推理策略选择 |
| 论文分析框架 | 李教授系统 | Paper Deep Dive技能 |
| 平台适配 | 李教授系统 | 异构模型提示词优化 |

---

## 2. 4-D方法论集成

### 2.1 方法论映射到提示词流水线

```
┌─────────────────────────────────────────────────────────────────────┐
│                   4-D方法论 → 提示词生成流水线                       │
└─────────────────────────────────────────────────────────────────────┘

Phase 1: DECONSTRUCT (解构)
──────────────────────────────
输入: 用户任务 + Agent类型 + 上下文

提取:
├── 核心意图 (用户真正想要什么)
├── 关键实体 (涉及的人物/技术/论文)
├── 上下文约束 (时间范围/领域限制)
├── 输出要求 (格式/深度/语言)
└── 缺失信息 (需要检索补充的)

示例:
  任务: "帮我分析Mamba架构"
  解构:
  - 核心意图: 理解Mamba的技术原理和价值
  - 关键实体: Mamba, SSM, Albert Gu
  - 上下文: 与Transformer对比
  - 输出要求: 技术深度分析
  - 缺失: 用户的背景知识水平


Phase 2: DIAGNOSE (诊断)
──────────────────────────────
分析任务特征，决定:

├── 复杂度评估
│   ├── 简单: 单一信息检索 → BASIC模式
│   ├── 中等: 需要多源整合 → STANDARD模式
│   └── 复杂: 需要深度推理 → DETAIL模式
│
├── 清晰度检查
│   ├── 模糊点识别
│   ├── 歧义消解
│   └── 假设验证
│
└── 所需能力匹配
    ├── 需要哪些Agent参与
    ├── 需要哪种思维模式
    └── 需要哪些信息源


Phase 3: DEVELOP (开发)
──────────────────────────────
根据诊断结果，选择提示词策略:

技术类任务:
├── 基于约束的提示词
├── 精确性优先
├── 结构化输出要求
└── 代码/公式格式化

复杂推理任务:
├── 思维链 (Chain-of-thought)
├── 系统化框架
├── 多步骤分解
└── 自我验证机制

创意/综合任务:
├── 多视角分析
├── 类比思维引导
├── 发散-收敛结构
└── 少样本示例


Phase 4: DELIVER (交付)
──────────────────────────────
生成最终提示词:

├── 角色设定 (适配目标Agent)
├── 任务描述 (清晰、具体)
├── 上下文注入 (相关知识)
├── 输出格式规范
├── 约束条件
└── 质量检查点
```

### 2.2 实现代码

```python
class FourDPromptEngine:
    """4-D方法论提示词生成引擎"""

    def __init__(self, config: PromptEngineConfig):
        self.config = config
        self.llm = self._init_llm()  # Gemini 3 Pro

    def generate(self, task: Task, agent: Agent, context: Context) -> str:
        """主入口: 生成优化后的提示词"""

        # Phase 1: DECONSTRUCT
        deconstruction = self._deconstruct(task, context)

        # Phase 2: DIAGNOSE
        diagnosis = self._diagnose(deconstruction, agent)

        # Phase 3: DEVELOP
        prompt_strategy = self._develop(diagnosis, agent)

        # Phase 4: DELIVER
        final_prompt = self._deliver(prompt_strategy, agent)

        return final_prompt

    def _deconstruct(self, task: Task, context: Context) -> Deconstruction:
        """Phase 1: 解构任务"""

        prompt = f"""
        作为提示词优化专家，请解构以下任务:

        任务: {task.description}
        上下文: {context.summary}

        请提取:
        1. 核心意图 (用户真正想要什么)
        2. 关键实体 (涉及的人物/技术/论文/概念)
        3. 上下文约束 (时间范围/领域限制/其他限制)
        4. 输出要求 (格式/深度/语言/长度)
        5. 缺失信息 (需要补充检索的信息)
        6. 潜在歧义 (可能的多种理解)

        以JSON格式输出。
        """

        response = self.llm.generate(prompt)
        return Deconstruction.parse(response)

    def _diagnose(self, deconstruction: Deconstruction, agent: Agent) -> Diagnosis:
        """Phase 2: 诊断复杂度和需求"""

        # 复杂度评估
        complexity = self._assess_complexity(deconstruction)

        # 清晰度检查
        clarity_issues = self._check_clarity(deconstruction)

        # 能力匹配
        required_capabilities = self._match_capabilities(deconstruction, agent)

        # 思维模式选择
        thinking_modes = self._select_thinking_modes(deconstruction, agent)

        return Diagnosis(
            complexity=complexity,
            clarity_issues=clarity_issues,
            required_capabilities=required_capabilities,
            thinking_modes=thinking_modes
        )

    def _develop(self, diagnosis: Diagnosis, agent: Agent) -> PromptStrategy:
        """Phase 3: 开发提示词策略"""

        strategies = []

        # 根据任务类型选择基础策略
        if diagnosis.is_technical:
            strategies.append(ConstraintBasedStrategy())
        if diagnosis.is_complex_reasoning:
            strategies.append(ChainOfThoughtStrategy())
        if diagnosis.is_creative:
            strategies.append(MultiPerspectiveStrategy())

        # 根据思维模式增强
        for mode in diagnosis.thinking_modes:
            strategies.append(ThinkingModeEnhancer(mode))

        # 根据目标Agent适配
        strategies.append(AgentAdaptationStrategy(agent))

        return PromptStrategy(strategies=strategies)

    def _deliver(self, strategy: PromptStrategy, agent: Agent) -> str:
        """Phase 4: 生成最终提示词"""

        # 组装提示词各部分
        parts = []

        # 1. 角色设定
        parts.append(self._generate_role_section(agent))

        # 2. 任务描述
        parts.append(self._generate_task_section(strategy))

        # 3. 思维引导
        parts.append(self._generate_thinking_section(strategy))

        # 4. 上下文
        parts.append(self._generate_context_section(strategy))

        # 5. 输出格式
        parts.append(self._generate_output_section(strategy))

        # 6. 约束和检查点
        parts.append(self._generate_constraints_section(strategy))

        return "\n\n".join(parts)

    def _select_thinking_modes(self, deconstruction: Deconstruction, agent: Agent) -> List[str]:
        """根据任务和Agent选择思维模式"""

        modes = []

        # 根据Agent类型的默认思维模式
        agent_default_modes = {
            "Logician": ["computational", "model", "critical"],
            "Critic": ["critical", "reverse", "debate"],
            "Connector": ["analogical", "divergent", "transfer"],
            "Genealogist": ["systems", "analogical"],
            "Historian": ["systems", "model", "convergent"],
            "Explorer": ["data_driven", "computational"],
        }
        modes.extend(agent_default_modes.get(agent.name, []))

        # 根据任务特征追加
        if deconstruction.requires_reasoning:
            modes.append("computational")
        if deconstruction.requires_creativity:
            modes.append("divergent")
        if deconstruction.requires_validation:
            modes.append("critical")
        if deconstruction.involves_multiple_domains:
            modes.append("transfer")

        return list(set(modes))
```

---

## 3. 信息源优先级配置

### 3.1 学术信息源层级

将李教授系统中的信息源列表整合为NEXEN的数据源配置：

```yaml
# config/data_sources.yaml

academic_sources:
  # 顶级期刊 (Tier 1)
  tier1_journals:
    nature_family:
      - Nature
      - Nature Machine Intelligence
      - Nature Electronics
      - Nature Materials
      - Nature Physics
      - Nature Photonics
      - Nature Energy
      - npj Quantum Information
      - npj Digital Medicine

    science_family:
      - Science
      - Science Robotics

    cell_family:
      - Cell

    physics_review:
      - Physical Review Letters
      - Physical Review X
      - Reviews of Modern Physics

    ieee_top:
      - IEEE Transactions on Pattern Analysis and Machine Intelligence
      - IEEE Transactions on Neural Networks and Learning Systems
      - IEEE Transactions on Image Processing
      - IEEE Transactions on Knowledge and Data Engineering
      - IEEE Transactions on Robotics

    acm_top:
      - ACM Computing Surveys
      - Communications of the ACM
      - Journal of the ACM

  # 核心期刊 (Tier 2)
  tier2_journals:
    ai_ml:
      - Journal of Machine Learning Research
      - Artificial Intelligence
      - Machine Learning
      - Neural Networks
      - Neural Computation

    cv_graphics:
      - International Journal of Computer Vision
      - Computer Vision and Image Understanding
      - IEEE Transactions on Visualization and Computer Graphics

    nlp:
      - Computational Linguistics
      - Transactions of the ACL

    systems:
      - ACM Transactions on Computer Systems
      - IEEE Transactions on Parallel and Distributed Systems

  # 预印本 (持续监控)
  preprints:
    - arxiv.org (cs.*, stat.ML, physics.*)
    - biorxiv.org (computational biology)
    - medrxiv.org (medical AI)


# 顶级会议
conferences:
  ai_ml:
    tier1:
      - NeurIPS
      - ICML
      - ICLR
    tier2:
      - AAAI
      - IJCAI
      - AISTATS
      - UAI

  cv:
    tier1:
      - CVPR
      - ICCV
      - ECCV

  nlp:
    tier1:
      - ACL
      - EMNLP
      - NAACL

  systems:
    tier1:
      - OSDI
      - SOSP
      - NSDI
      - SIGCOMM

  architecture:
    tier1:
      - ISCA
      - MICRO
      - ASPLOS
      - HPCA

  hci:
    tier1:
      - CHI
      - UIST
      - CSCW

  security:
    tier1:
      - IEEE S&P
      - USENIX Security
      - CCS
      - NDSS


# 顶级实验室
research_labs:
  industry:
    tier1:
      - Google DeepMind
      - OpenAI
      - Anthropic
      - Meta FAIR
      - Microsoft Research
      - Google Brain
      - NVIDIA Research

    tier2:
      - Amazon Science
      - Apple ML Research
      - Huawei Research
      - Tencent AI Lab
      - Alibaba DAMO Academy
      - ByteDance AI Lab

  academic:
    north_america:
      - Stanford AI Lab (SAIL)
      - MIT CSAIL
      - CMU ML Department
      - UC Berkeley BAIR
      - University of Toronto (Vector Institute)
      - Mila (Quebec AI Institute)
      - University of Washington
      - Princeton NLP
      - Harvard SEAS

    europe:
      - ETH Zurich
      - EPFL
      - University of Oxford
      - University of Cambridge
      - Max Planck Institutes
      - INRIA

    asia:
      - Tsinghua University
      - Peking University
      - CUHK
      - NUS
      - University of Tokyo
      - KAIST


# 工业展会
industry_events:
  tech:
    - CES (Consumer Electronics Show)
    - Mobile World Congress (MWC)
    - Web Summit
    - TechCrunch Disrupt

  ai_specific:
    - NeurIPS Industry Day
    - ICML Industry Track
    - AI & Big Data Expo
    - World Summit AI

  semiconductor:
    - SEMICON
    - Hot Chips
    - ISSCC

  cloud:
    - AWS re:Invent
    - Google Cloud Next
    - Microsoft Build
    - KubeCon
```

### 3.2 数据源优先级策略

```python
class DataSourcePrioritizer:
    """数据源优先级管理器"""

    def __init__(self, config_path: str):
        self.config = yaml.load(open(config_path))

    def get_sources_for_query(self, query: Query) -> List[DataSource]:
        """根据查询类型返回优先级排序的数据源"""

        sources = []

        # 1. 根据领域确定相关期刊/会议
        domain_sources = self._get_domain_sources(query.domain)
        sources.extend(domain_sources)

        # 2. 根据查询类型确定来源
        if query.type == "latest_research":
            # 最新研究优先查预印本
            sources.insert(0, "arxiv")
        elif query.type == "established_work":
            # 成熟工作优先查顶刊
            sources = self._prioritize_journals(sources)
        elif query.type == "person":
            # 人物查询优先查实验室
            sources = self._prioritize_labs(sources)

        # 3. 根据语言偏好调整
        if query.language == "zh":
            sources.extend(self._get_chinese_sources())

        return sources

    def _get_domain_sources(self, domain: str) -> List[DataSource]:
        """获取领域相关的数据源"""

        domain_mapping = {
            "machine_learning": {
                "journals": self.config["academic_sources"]["tier1_journals"]["ieee_top"]
                          + self.config["academic_sources"]["tier2_journals"]["ai_ml"],
                "conferences": self.config["conferences"]["ai_ml"]["tier1"],
                "labs": self.config["research_labs"]["industry"]["tier1"],
            },
            "computer_vision": {
                "journals": ["IJCV", "IEEE TPAMI", "IEEE TIP"],
                "conferences": self.config["conferences"]["cv"]["tier1"],
            },
            "nlp": {
                "journals": ["Computational Linguistics", "TACL"],
                "conferences": self.config["conferences"]["nlp"]["tier1"],
            },
            # ... 其他领域
        }

        return domain_mapping.get(domain, {})
```

---

## 4. 多元思维模式映射

### 4.1 思维模式定义

将李教授系统中的思维模式形式化，并映射到NEXEN Agent：

```python
class ThinkingModes:
    """思维模式定义和提示词增强"""

    MODES = {
        "computational": {
            "name": "计算思维",
            "description": "问题抽象、模式识别、算法设计、分解和评估",
            "prompt_enhancement": """
                请使用计算思维方法:
                1. 将问题分解为可计算的子问题
                2. 识别问题中的模式和规律
                3. 设计解决问题的算法步骤
                4. 评估解决方案的复杂度和效率
            """,
            "suitable_for": ["Logician", "Builder"],
        },

        "systems": {
            "name": "系统思维",
            "description": "将问题视为相互关联的整体，理解组件间的相互作用",
            "prompt_enhancement": """
                请使用系统思维方法:
                1. 识别系统中的所有组件和参与者
                2. 分析组件之间的关系和依赖
                3. 考虑反馈机制和涌现行为
                4. 从整体视角评估系统行为
            """,
            "suitable_for": ["Genealogist", "Historian", "Connector"],
        },

        "model": {
            "name": "模型思维",
            "description": "将现实问题抽象为数学/概念模型",
            "prompt_enhancement": """
                请使用模型思维方法:
                1. 识别问题中的关键变量和参数
                2. 建立变量之间的关系模型
                3. 考虑模型的假设和局限
                4. 验证模型与现实的一致性
            """,
            "suitable_for": ["Logician", "Historian"],
        },

        "data_driven": {
            "name": "数据驱动思维",
            "description": "从数据中发现模式、提取知识",
            "prompt_enhancement": """
                请使用数据驱动思维:
                1. 识别可用的数据源和证据
                2. 分析数据中的模式和趋势
                3. 基于数据得出结论，避免主观臆断
                4. 量化不确定性和置信度
            """,
            "suitable_for": ["Explorer", "Vision_Analyst"],
        },

        "critical": {
            "name": "批判性思维",
            "description": "质疑假设、评估证据、识别偏差",
            "prompt_enhancement": """
                请使用批判性思维:
                1. 质疑论点的基本假设
                2. 评估证据的可靠性和相关性
                3. 识别逻辑谬误和认知偏差
                4. 考虑反面论点和替代解释
            """,
            "suitable_for": ["Critic"],
        },

        "transfer": {
            "name": "迁移学习思维",
            "description": "将一个领域的知识迁移到新领域",
            "prompt_enhancement": """
                请使用迁移思维:
                1. 识别当前问题与已知领域的相似性
                2. 提取可迁移的概念、方法或模式
                3. 调整适配到新的上下文
                4. 验证迁移的有效性
            """,
            "suitable_for": ["Connector"],
        },

        "divergent": {
            "name": "发散性思维",
            "description": "产生多种不同的想法和解决方案",
            "prompt_enhancement": """
                请使用发散性思维:
                1. 尽可能多地生成不同的想法
                2. 暂时搁置判断，接受所有可能性
                3. 探索非常规和创新的方向
                4. 组合和变换现有想法
            """,
            "suitable_for": ["Connector", "Prompt_Engineer"],
        },

        "convergent": {
            "name": "收敛性思维",
            "description": "评估和选择最佳解决方案",
            "prompt_enhancement": """
                请使用收敛性思维:
                1. 定义评估标准
                2. 系统性地评估各个选项
                3. 权衡利弊，做出取舍
                4. 选择最优或最满意的方案
            """,
            "suitable_for": ["Critic", "Meta_Coordinator"],
        },

        "analogical": {
            "name": "类比思维",
            "description": "从不同领域寻找相似性",
            "prompt_enhancement": """
                请使用类比思维:
                1. 寻找与当前问题结构相似的案例
                2. 分析类比案例的解决方案
                3. 映射解决方案到当前问题
                4. 验证类比的适用性
            """,
            "suitable_for": ["Connector", "Genealogist"],
        },

        "reverse": {
            "name": "逆向思维",
            "description": "从相反方向思考问题",
            "prompt_enhancement": """
                请使用逆向思维:
                1. 考虑问题的反面或相反情况
                2. 思考"如果不这样做会怎样"
                3. 从结果反推原因
                4. 挑战常规假设
            """,
            "suitable_for": ["Critic"],
        },

        "debate": {
            "name": "辩论思维",
            "description": "从多个立场进行对抗性思考",
            "prompt_enhancement": """
                请使用辩论思维:
                1. 为命题建立支持论点
                2. 为反命题建立反对论点
                3. 模拟双方的攻防交锋
                4. 综合双方观点得出更全面的结论
            """,
            "suitable_for": ["Critic", "Logician"],
        },
    }

    @classmethod
    def get_enhancement_for_agent(cls, agent_name: str) -> str:
        """获取适合特定Agent的思维模式增强提示词"""
        enhancements = []
        for mode_key, mode_config in cls.MODES.items():
            if agent_name in mode_config["suitable_for"]:
                enhancements.append(mode_config["prompt_enhancement"])
        return "\n\n".join(enhancements)
```

### 4.2 Agent-思维模式映射

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Agent与思维模式映射                               │
└─────────────────────────────────────────────────────────────────────┘

Agent                主要思维模式                    次要思维模式
────────────────────────────────────────────────────────────────────
Meta-Coordinator     收敛性思维, 系统思维           计算思维
Logician             计算思维, 模型思维             批判性思维, 辩论思维
Critic               批判性思维, 逆向思维           辩论思维, 收敛性思维
Connector            迁移学习思维, 类比思维         发散性思维, 系统思维
Genealogist          系统思维, 类比思维             数据驱动思维
Historian            系统思维, 模型思维             数据驱动思维
Explorer             数据驱动思维, 计算思维         -
Social_Scout         数据驱动思维                   -
CN_Specialist        数据驱动思维                   -
Vision_Analyst       数据驱动思维, 模型思维         -
Builder              计算思维                       -
Scribe               收敛性思维                     -
Archivist            系统思维, 数据驱动思维         -
Prompt_Engineer      发散性思维, 收敛性思维         计算思维
```

---

## 5. Agent提示词模板库

### 5.1 模板结构

```python
class AgentPromptTemplate:
    """Agent提示词模板"""

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.base_template = self._load_base_template()

    def generate(self, task: Task, context: Context) -> str:
        """生成完整的Agent提示词"""

        sections = []

        # 1. 角色定义
        sections.append(self._role_section())

        # 2. 思维模式引导
        sections.append(self._thinking_modes_section())

        # 3. 任务描述
        sections.append(self._task_section(task))

        # 4. 上下文信息
        sections.append(self._context_section(context))

        # 5. 信息源指导
        sections.append(self._sources_section(task))

        # 6. 输出格式
        sections.append(self._output_section())

        # 7. 质量检查点
        sections.append(self._checkpoints_section())

        return "\n\n".join(sections)
```

### 5.2 各Agent的基础模板

```yaml
# templates/agent_prompts.yaml

Meta_Coordinator:
  role: |
    你是NEXEN系统的元协调者，负责:
    - 理解用户的研究需求
    - 将复杂任务分解为子任务
    - 决定调用哪些Agent
    - 综合各Agent的输出

  thinking_modes:
    - 系统思维: 将任务视为相互关联的整体
    - 收敛性思维: 评估和选择最佳执行路径

  output_format: |
    请输出:
    1. 任务理解 (1-2句话)
    2. 任务分解 (子任务列表)
    3. Agent调度计划 (并行/串行)
    4. 预期输出格式


Logician:
  role: |
    你是NEXEN的逻辑推理专家，使用OpenAI o3模型。
    你的职责是进行严格的逻辑推理和数学证明。

  thinking_modes:
    - 计算思维: 将问题分解为可计算的步骤
    - 模型思维: 建立问题的形式化模型
    - 批判性思维: 验证推理的每一步

  output_format: |
    请输出:
    1. 问题形式化
    2. 推理步骤 (每步标注依据)
    3. 结论
    4. 置信度评估


Critic:
  role: |
    你是NEXEN的批判性审查专家。
    你的职责是发现论点中的漏洞、偏见和错误。

  thinking_modes:
    - 批判性思维: 质疑假设，评估证据
    - 逆向思维: 从反面思考问题
    - 辩论思维: 建立反对论点

  output_format: |
    请输出:
    1. 主要问题/漏洞
    2. 被忽略的假设
    3. 可能的反例
    4. 改进建议


Genealogist:
  role: |
    你是NEXEN的学术谱系学家。
    你的职责是追踪研究者的师承关系、学术网络和思想传承。

  thinking_modes:
    - 系统思维: 将学术网络视为复杂系统
    - 类比思维: 识别不同学派之间的相似性

  sources_priority:
    - Mathematics Genealogy Project
    - Google Scholar Profiles
    - 个人主页和CV
    - LinkedIn
    - 合作论文网络

  output_format: |
    请输出结构化的人物/谱系信息:
    1. 基本信息 (教育背景、职位)
    2. 师承关系 (导师→学生链)
    3. 核心合作者网络
    4. 学派归属和研究风格
    5. 思想演进时间线


Historian:
  role: |
    你是NEXEN的技术历史学家。
    你的职责是追踪技术的演进历程、关键分叉和未来趋势。

  thinking_modes:
    - 系统思维: 理解技术生态系统
    - 模型思维: 识别技术演进的规律

  output_format: |
    请输出:
    1. 技术起源 (首次提出的论文、背景)
    2. 演进时间线 (关键里程碑)
    3. 分叉分析 (为什么分叉、各分支现状)
    4. 演进轴分析 (沿什么维度演进)
    5. 未来预测


Explorer:
  role: |
    你是NEXEN的文献检索专家。
    你的职责是高效地检索相关论文和技术资料。

  thinking_modes:
    - 数据驱动思维: 基于检索结果进行分析

  sources_priority:
    - arXiv (最新预印本)
    - Semantic Scholar (引用网络)
    - Google Scholar (广覆盖)
    - Papers With Code (代码实现)
    - DBLP (计算机领域)

  output_format: |
    请输出:
    1. 检索到的论文列表 (按相关度排序)
    2. 每篇论文的关键信息摘要
    3. 论文之间的关系
    4. 推荐的进一步阅读


Connector:
  role: |
    你是NEXEN的跨领域连接专家。
    你的职责是发现不同领域之间的隐藏联系。

  thinking_modes:
    - 迁移学习思维: 识别可迁移的知识
    - 类比思维: 寻找结构相似性
    - 发散性思维: 探索非常规联系

  output_format: |
    请输出:
    1. 发现的跨领域联系
    2. 联系的依据和证据
    3. 潜在的研究方向建议
    4. 类比案例分析
```

---

## 6. 论文分析方法论集成

### 6.1 李教授的论文分析框架

将李教授系统中的论文分析方法论整合到`/paper-deep-dive`技能：

```python
class PaperAnalysisMethodology:
    """论文分析方法论 - 基于李教授框架"""

    def analyze(self, paper: Paper) -> PaperAnalysis:
        """执行完整的论文分析"""

        analysis = PaperAnalysis()

        # 1. 概述 (Overview) - 约2000字
        analysis.overview = self._generate_overview(paper)

        # 2. 研究背景 (Background) - 约5000字
        analysis.background = self._generate_background(paper)

        # 3. 技术细节 (Technical Details)
        analysis.technical = self._analyze_technical(paper)

        # 4. 批判性评价 (Critical Evaluation)
        analysis.evaluation = self._critical_evaluation(paper)

        return analysis

    def _generate_overview(self, paper: Paper) -> str:
        """生成论文概述"""

        prompt = f"""
        请为以下论文生成一篇约2000字的概述文章:

        标题: {paper.title}
        摘要: {paper.abstract}
        全文: {paper.full_text[:50000]}  # 前50000字符

        概述应包含:
        1. 研究问题的背景和重要性
        2. 核心贡献和创新点
        3. 方法概述
        4. 主要结果
        5. 研究意义和影响

        使用学术写作风格，面向专业读者。
        """
        return self.llm.generate(prompt)

    def _generate_background(self, paper: Paper) -> BackgroundAnalysis:
        """生成研究背景分析"""

        prompt = f"""
        请对以下论文进行深入的研究背景分析，约5000字:

        论文: {paper.title}

        请围绕以下方面展开:

        1. 研究主题描述
           - 作者研究的主题是什么
           - 要解决的问题及其背景信息

        2. 关键技术挑战
           - 该问题的技术难点
           - 为什么之前的方法无法解决

        3. 应用场景
           - 该技术在哪些领域有应用前景
           - 潜在的实际影响

        4. 现有方案分析
           - 当前主流方案有哪些
           - 各方案的优劣势对比
           - 作者希望在哪些方面改进

        5. 研究方法总结
           a) 研究思路: 动机和背景
           b) 研究目标: 预期效果、技术指标、解决的问题
           c) 技术创新点: 与state-of-art相比的进步
        """
        return self.llm.generate(prompt)

    def _analyze_technical(self, paper: Paper) -> TechnicalAnalysis:
        """分析技术细节"""

        # 方法分析
        method_analysis = self._analyze_method(paper)

        # 实验分析
        experiment_analysis = self._analyze_experiments(paper)

        # 图表解读
        figure_analysis = self._analyze_figures(paper)

        return TechnicalAnalysis(
            method=method_analysis,
            experiments=experiment_analysis,
            figures=figure_analysis
        )

    def _critical_evaluation(self, paper: Paper) -> CriticalEvaluation:
        """批判性评价"""

        prompt = f"""
        请对以下论文进行批判性评价:

        论文: {paper.title}

        请从以下角度评价:

        1. 创新性评估
           - 创新程度 (渐进式/突破式)
           - 与现有工作的区别

        2. 技术严谨性
           - 方法是否合理
           - 实验设计是否充分
           - 结论是否有充分支撑

        3. 局限性分析
           - 作者承认的局限
           - 未提及但存在的局限

        4. 可复现性
           - 是否提供代码
           - 描述是否足够详细

        5. 未来方向
           - 可能的改进方向
           - 开放问题

        使用批判性思维，客观公正地评价。
        """
        return self.llm.generate(prompt)
```

### 6.2 集成到技能系统

```python
# skills/paper_deep_dive.py

class PaperDeepDiveSkill(Skill):
    """论文深度解读技能"""

    name = "/paper-deep-dive"
    description = "对论文进行全方位深度分析"

    involved_agents = [
        "Explorer",      # 检索论文
        "Vision_Analyst", # 分析图表
        "Logician",      # 分析方法
        "Genealogist",   # 分析作者背景
        "Critic",        # 批判性评价
        "Scribe",        # 生成报告
    ]

    def execute(self, paper_identifier: str) -> SkillResult:
        """执行技能"""

        # 1. 获取论文
        paper = self.explorer.fetch_paper(paper_identifier)

        # 2. 使用李教授方法论分析
        methodology = PaperAnalysisMethodology()

        # 3. 多Agent协作分析
        analysis_tasks = [
            ("Vision_Analyst", "分析论文中的所有图表"),
            ("Logician", "验证论文方法的逻辑严谨性"),
            ("Genealogist", "分析作者背景和学术脉络"),
            ("Critic", "进行批判性评价"),
        ]

        results = self.parallel_execute(analysis_tasks)

        # 4. 综合生成报告
        report = self.scribe.generate_report(
            paper=paper,
            methodology_analysis=methodology.analyze(paper),
            agent_results=results
        )

        # 5. 保存到知识库
        self._save_to_knowledge_base(paper, report)

        return SkillResult(
            output_files=[
                f"knowledge_base/papers/{paper.id}/summary.md",
                f"knowledge_base/papers/{paper.id}/background.md",
                f"knowledge_base/papers/{paper.id}/technical_analysis.md",
                f"knowledge_base/papers/{paper.id}/critical_evaluation.md",
                f"knowledge_base/papers/{paper.id}/figures_explained.md",
            ],
            summary=report.executive_summary
        )
```

---

## 7. 实现架构

### 7.1 Prompt Engineer Agent完整设计

```python
# nexen/agents/production/prompt_engineer.py

class PromptEngineerAgent(BaseAgent):
    """
    提示词工程师Agent

    整合"李教授"提示词优化系统的核心能力
    使用Gemini模型执行
    """

    name = "Prompt_Engineer"
    model = "gemini-3-pro"  # 或 gemini-2-flash 用于快速迭代

    def __init__(self, config: AgentConfig):
        super().__init__(config)

        # 4-D方法论引擎
        self.four_d_engine = FourDPromptEngine(config.prompt_engine)

        # 思维模式库
        self.thinking_modes = ThinkingModes()

        # 数据源配置
        self.data_sources = DataSourceConfig.load()

        # 模板库
        self.template_library = AgentPromptTemplateLibrary()

    async def generate_prompt(
        self,
        target_agent: str,
        task: Task,
        context: Context,
        mode: str = "auto"  # auto, basic, detail
    ) -> GeneratedPrompt:
        """
        为目标Agent生成优化的提示词

        Args:
            target_agent: 目标Agent名称
            task: 要执行的任务
            context: 上下文信息
            mode: 生成模式 (auto自动判断, basic快速, detail详细)

        Returns:
            GeneratedPrompt: 包含提示词和元信息
        """

        # 1. 使用4-D方法论生成提示词
        if mode == "auto":
            mode = self._detect_mode(task)

        if mode == "detail":
            prompt = await self._detail_mode_generate(target_agent, task, context)
        else:
            prompt = await self._basic_mode_generate(target_agent, task, context)

        # 2. 添加思维模式增强
        thinking_enhancement = self.thinking_modes.get_enhancement_for_agent(target_agent)
        prompt = self._inject_thinking_modes(prompt, thinking_enhancement)

        # 3. 添加数据源指导 (如果需要检索)
        if task.requires_retrieval:
            source_guidance = self._generate_source_guidance(task)
            prompt = self._inject_source_guidance(prompt, source_guidance)

        # 4. 适配目标模型
        target_model = self._get_agent_model(target_agent)
        prompt = self._adapt_to_model(prompt, target_model)

        return GeneratedPrompt(
            prompt=prompt,
            target_agent=target_agent,
            mode=mode,
            thinking_modes=self.thinking_modes.get_modes_for_agent(target_agent),
            estimated_tokens=self._estimate_tokens(prompt)
        )

    async def _detail_mode_generate(
        self,
        target_agent: str,
        task: Task,
        context: Context
    ) -> str:
        """详细模式: 使用完整4-D流程"""

        # Deconstruct
        deconstruction = await self.four_d_engine.deconstruct(task, context)

        # 如果有模糊点，可以生成澄清问题
        if deconstruction.has_ambiguity:
            clarification_questions = self._generate_clarification_questions(deconstruction)
            # 这里可以选择返回问题或使用默认假设

        # Diagnose
        diagnosis = await self.four_d_engine.diagnose(deconstruction, target_agent)

        # Develop
        strategy = await self.four_d_engine.develop(diagnosis, target_agent)

        # Deliver
        prompt = await self.four_d_engine.deliver(strategy, target_agent)

        return prompt

    async def _basic_mode_generate(
        self,
        target_agent: str,
        task: Task,
        context: Context
    ) -> str:
        """基础模式: 快速生成"""

        # 加载基础模板
        template = self.template_library.get_template(target_agent)

        # 填充任务和上下文
        prompt = template.fill(
            task=task.description,
            context=context.summary,
            constraints=task.constraints
        )

        return prompt

    def _generate_source_guidance(self, task: Task) -> str:
        """生成数据源检索指导"""

        # 根据任务领域获取优先数据源
        prioritized_sources = self.data_sources.get_sources_for_task(task)

        guidance = """
        检索信息时，请优先使用以下来源:

        学术数据源 (按优先级):
        {journals}

        顶级会议:
        {conferences}

        顶级实验室:
        {labs}
        """.format(
            journals="\n".join(f"- {s}" for s in prioritized_sources.journals[:10]),
            conferences="\n".join(f"- {s}" for s in prioritized_sources.conferences[:10]),
            labs="\n".join(f"- {s}" for s in prioritized_sources.labs[:10])
        )

        return guidance

    def _adapt_to_model(self, prompt: str, model: str) -> str:
        """根据目标模型调整提示词"""

        adaptations = {
            "claude-opus": {
                "style": "更长的上下文，推理框架",
                "adjustments": ["增加推理步骤说明", "结构化输出格式"],
            },
            "openai-o3": {
                "style": "简洁精确，逻辑导向",
                "adjustments": ["强调逻辑严谨性", "数学符号规范"],
            },
            "gemini": {
                "style": "创意任务，多视角分析",
                "adjustments": ["鼓励创造性", "比较分析"],
            },
            "grok": {
                "style": "实时信息，社交语境",
                "adjustments": ["强调时效性", "社交媒体术语"],
            },
            "qwen": {
                "style": "中文优化",
                "adjustments": ["中文表达习惯", "本地化术语"],
            },
        }

        # 获取适配规则
        model_family = self._get_model_family(model)
        adaptation = adaptations.get(model_family, {})

        # 应用调整
        for adjustment in adaptation.get("adjustments", []):
            prompt = self._apply_adjustment(prompt, adjustment)

        return prompt


# 注册到Agent Pool
AGENT_REGISTRY.register(PromptEngineerAgent)
```

### 7.2 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEXEN 提示词工程系统架构                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                              用户任务
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │  Meta-Coordinator   │
                      │  (任务理解与分解)   │
                      └──────────┬──────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      Prompt Engineer Agent                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        4-D 方法论引擎                                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ 解构     │→│ 诊断     │→│ 开发     │→│ 交付     │            │  │
│  │  │Deconstruct│ │Diagnose  │ │Develop   │ │Deliver   │            │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │ 思维模式库       │  │ 数据源优先级     │  │ 模板库           │        │
│  │ ├─计算思维       │  │ ├─期刊优先级     │  │ ├─Agent模板      │        │
│  │ ├─系统思维       │  │ ├─会议优先级     │  │ ├─技能模板      │        │
│  │ ├─批判思维       │  │ ├─实验室优先级   │  │ └─任务模板      │        │
│  │ ├─类比思维       │  │ └─工业展优先级   │  │                  │        │
│  │ └─...            │  │                  │  │                  │        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      模型适配层                                       │  │
│  │  Claude Opus │ OpenAI o3 │ Gemini │ Grok │ Qwen │ DeepSeek          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 生成优化后的提示词
                                 ▼
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │ Explorer │      │ Logician │      │Genealogist│
        │ (检索)   │      │ (推理)   │      │ (谱系)   │
        └──────────┘      └──────────┘      └──────────┘
```

---

## 总结

通过整合"李教授"提示词优化系统，NEXEN获得了：

1. **系统化的提示词生成方法** - 4-D方法论保证提示词质量
2. **丰富的领域知识配置** - 期刊/会议/实验室优先级指导检索
3. **多元思维模式支持** - 不同Agent使用适合的思维方式
4. **学术论文分析框架** - 标准化的论文深度解读流程
5. **多模型适配能力** - 针对不同LLM优化提示词

这使得NEXEN的Agent能够获得高质量的、针对性的提示词，从而产生更好的输出。

---

*NEXEN Prompt Engineering System v1.0*
