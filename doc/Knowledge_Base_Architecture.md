# NEXEN 知识库架构设计

> **核心目标**: 不只是存储和检索，而是构建支撑大模型深度推理的结构化知识体系

---

## 目录

1. [设计理念](#1-设计理念)
2. [数据源与采集](#2-数据源与采集)
3. [知识抽取与映射](#3-知识抽取与映射)
4. [知识图谱Schema](#4-知识图谱schema)
5. [推理支撑层设计](#5-推理支撑层设计)
6. [存储架构](#6-存储架构)
7. [查询与检索](#7-查询与检索)
8. [实现路线图](#8-实现路线图)

---

## 1. 设计理念

### 1.1 核心问题

```
传统知识库:
┌─────────────────────────────────────────────────────────┐
│  文档 → 向量化 → 存储 → 语义检索 → 返回片段            │
│                                                         │
│  问题: 只能回答"文档里写了什么"，无法支撑:             │
│  - 跨文档的关联推理                                     │
│  - 时间线上的演进分析                                   │
│  - 人物/机构之间的关系推断                              │
│  - 技术路线的因果分析                                   │
└─────────────────────────────────────────────────────────┘

NEXEN知识库:
┌─────────────────────────────────────────────────────────┐
│  文档 → 知识抽取 → 结构化实体+关系 → 知识图谱          │
│           ↓                              ↓              │
│       原文保留                      推理支撑层          │
│           ↓                              ↓              │
│      向量索引 ←───────────────────→ 图查询引擎          │
│                                                         │
│  能力: 支撑"为什么"、"怎么演进"、"谁影响谁"等深度问题  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 设计原则

| 原则 | 说明 | 实现方式 |
|------|------|---------|
| **双轨存储** | 原文+结构化知识并存 | 向量库 + 图数据库 |
| **关系优先** | 实体关系比实体本身更有价值 | 丰富的边类型定义 |
| **时间敏感** | 所有知识带时间戳 | 时态知识图谱 |
| **溯源可查** | 每条知识可追溯到原文 | 引用链接机制 |
| **推理友好** | 预计算常用推理模式 | 物化视图 + 预聚合 |

---

## 2. 数据源与采集

### 2.1 公开数据源

```
┌─────────────────────────────────────────────────────────────────────┐
│                         数据源层级                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  L1: 学术数据源 (高可信度)                                          │
│  ├── arXiv API (cs.*, stat.ML, etc.)                               │
│  ├── Semantic Scholar API (论文元数据+引用)                         │
│  ├── Google Scholar (补充，需爬虫)                                  │
│  ├── DBLP (计算机领域完整收录)                                      │
│  ├── OpenAlex (开放学术图谱)                                        │
│  └── Papers With Code (论文+代码+基准)                              │
│                                                                     │
│  L2: 人物数据源                                                     │
│  ├── Google Scholar Profiles (h-index, 引用)                        │
│  ├── LinkedIn (职业经历，需授权)                                    │
│  ├── Mathematics Genealogy Project (博士师承)                       │
│  ├── CSRankings (学术排名)                                          │
│  ├── AI2 Author Pages                                               │
│  └── 个人主页/CV (需爬取)                                           │
│                                                                     │
│  L3: 技术/产品数据源                                                │
│  ├── GitHub (代码仓库、stars、contributors)                         │
│  ├── Hugging Face (模型、数据集)                                    │
│  ├── Product Hunt / TechCrunch (产品发布)                           │
│  └── 官方博客 (OpenAI, Anthropic, Google AI, etc.)                 │
│                                                                     │
│  L4: 社交/动态数据源                                                │
│  ├── Twitter/X (研究者动态，Grok API)                               │
│  ├── Reddit (r/MachineLearning)                                     │
│  ├── Hacker News                                                    │
│  └── 微信公众号/知乎 (中文生态)                                     │
│                                                                     │
│  L5: 商业数据源 (可选付费)                                          │
│  ├── Crunchbase (融资数据)                                          │
│  ├── PitchBook (投资数据)                                           │
│  └── 专利数据库 (Google Patents, USPTO)                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 采集策略

```python
class DataIngestionStrategy:
    """数据采集策略"""

    # 优先级1: 核心学术数据 (每日更新)
    DAILY_SOURCES = [
        "arxiv",           # 新论文
        "semantic_scholar", # 引用更新
        "papers_with_code", # 代码/基准更新
    ]

    # 优先级2: 人物动态 (每周更新)
    WEEKLY_SOURCES = [
        "google_scholar_profiles",  # 新论文、引用变化
        "twitter_researchers",      # 研究者推文
        "github_trending",          # 热门项目
    ]

    # 优先级3: 深度数据 (按需抓取)
    ON_DEMAND_SOURCES = [
        "personal_homepages",  # 个人主页CV
        "linkedin_profiles",   # 职业经历
        "company_blogs",       # 技术博客
    ]

    # 触发式采集: 当用户查询涉及时
    TRIGGERED_SOURCES = [
        "full_paper_pdf",     # 下载完整论文
        "github_repo_deep",   # 深度分析代码库
        "citation_network",   # 展开引用网络
    ]
```

### 2.3 数据采集Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                     数据采集Pipeline                                 │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Scheduler  │
                    │  (定时/触发)  │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │ arXiv      │ │ Semantic   │ │ GitHub     │
     │ Collector  │ │ Scholar    │ │ Collector  │
     └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
           │              │              │
           └──────────────┼──────────────┘
                          ▼
                   ┌────────────┐
                   │   Dedup    │  ← 去重、合并
                   │   Layer    │
                   └─────┬──────┘
                         │
                         ▼
                   ┌────────────┐
                   │  Raw Store │  ← 原始数据存储
                   │  (S3/MinIO)│
                   └─────┬──────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Knowledge Extractor │  ← 知识抽取
              │  (LLM-powered)       │
              └──────────┬──────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ Vector DB  │ │ Graph DB   │ │ Search     │
   │ (Qdrant)   │ │ (Neo4j)    │ │ (Elastic)  │
   └────────────┘ └────────────┘ └────────────┘
```

---

## 3. 知识抽取与映射

### 3.1 论文知识抽取

一篇论文需要抽取的结构化知识：

```yaml
Paper:
  # 基础元数据 (从API获取)
  id: "arxiv:2312.00752"
  title: "Mamba: Linear-Time Sequence Modeling..."
  authors: ["Albert Gu", "Tri Dao"]
  date: "2023-12-01"
  venue: "arXiv"
  citations: 1234

  # 深度抽取 (LLM处理)
  core_contribution:
    type: "architecture"  # architecture/method/theory/dataset/benchmark
    novelty: "Selective state space model with input-dependent dynamics"
    key_insight: "Selection mechanism enables content-aware reasoning"

  # 技术要素
  techniques:
    - name: "Selective SSM"
      category: "sequence_modeling"
      predecessors: ["S4", "H3"]
      improvements: ["input-dependent selection", "hardware-aware design"]

    - name: "Hardware-aware Algorithm"
      category: "optimization"
      predecessors: ["Flash Attention"]

  # 实验结论
  experiments:
    benchmarks:
      - name: "Language Modeling"
        dataset: "The Pile"
        metric: "perplexity"
        result: 8.12
        comparison:
          - baseline: "Transformer++"
            result: 8.45
            improvement: "+3.9%"

    claims:
      - "5x faster inference than Transformers at 1M context"
      - "Linear scaling with sequence length"

  # 局限性 (LLM分析)
  limitations:
    - "May underperform on tasks requiring precise retrieval"
    - "Training stability requires careful initialization"

  # 关系抽取
  relations:
    cites: ["S4", "H3", "Flash Attention", ...]
    extends: ["S4"]
    competes_with: ["Transformer", "RWKV"]
    enables: ["Vision Mamba", "Jamba", ...]
```

### 3.2 人物知识抽取

```yaml
Person:
  id: "person:albert_gu"
  name: "Albert Gu"

  # 学术身份
  academic:
    current_affiliation: "Carnegie Mellon University"
    position: "Assistant Professor"
    department: "Machine Learning Department"
    start_date: "2023-08"

    education:
      - degree: "PhD"
        institution: "Stanford University"
        advisor: "Christopher Ré"
        year: 2023
        thesis: "Structured State Spaces for Sequence Modeling"

      - degree: "BS"
        institution: "MIT"
        year: 2017

  # 研究方向
  research:
    primary_areas: ["state space models", "efficient architectures"]
    signature_works:
      - paper: "arxiv:2111.00396"  # S4
        role: "first_author"
        impact: "foundational"
      - paper: "arxiv:2312.00752"  # Mamba
        role: "first_author"
        impact: "breakthrough"

  # 师承关系
  genealogy:
    advisors:
      - name: "Christopher Ré"
        relation: "PhD advisor"
        period: "2018-2023"

    collaborators:
      - name: "Tri Dao"
        papers_together: 5
        relation: "frequent collaborator"

    students: []  # 新教授，暂无

  # 学派归属
  school:
    name: "Stanford Hazy Lab"
    methodology: "Systems + ML co-design"
    key_beliefs: ["efficiency matters", "hardware-aware algorithms"]

  # 影响力指标
  metrics:
    h_index: 15
    total_citations: 5000
    recent_momentum: "rising"  # rising/stable/declining
```

### 3.3 技术演进知识抽取

```yaml
Technology:
  id: "tech:state_space_models"
  name: "State Space Models"
  category: "sequence_modeling"

  # 起源
  origin:
    paper: "arxiv:2111.00396"  # S4
    date: "2021-11"
    authors: ["Albert Gu", "Karan Goel", "Christopher Ré"]
    problem_solved: "Long-range dependencies with subquadratic complexity"
    predecessor_tech: ["RNN", "Linear Attention"]

  # 演进时间线
  timeline:
    - date: "2021-11"
      event: "S4 发布"
      type: "origin"
      significance: 5  # 1-5

    - date: "2022-06"
      event: "S4D - 对角化简化"
      type: "improvement"
      significance: 3

    - date: "2023-01"
      event: "H3 - 加入注意力门控"
      type: "branch"
      significance: 4

    - date: "2023-12"
      event: "Mamba - 选择性SSM"
      type: "paradigm_shift"
      significance: 5

    - date: "2024-03"
      event: "Mamba-2 - SSD框架"
      type: "improvement"
      significance: 4

  # 技术分叉
  branches:
    - name: "Efficient SSM"
      focus: "计算效率"
      representatives: ["S4D", "S5"]

    - name: "Selective SSM"
      focus: "表达能力"
      representatives: ["Mamba", "Mamba-2"]

    - name: "Hybrid"
      focus: "结合Attention"
      representatives: ["H3", "Jamba", "Zamba"]

  # 演进轴
  evolution_axes:
    - axis: "efficiency"
      trajectory: "O(L²) → O(L·log L) → O(L)"

    - axis: "expressiveness"
      trajectory: "fixed dynamics → input-dependent → selective"

    - axis: "modality"
      trajectory: "sequence → language → vision → multimodal"

  # 竞争技术
  competing_techs:
    - name: "Transformer"
      relation: "main competitor"
      comparison: "SSM更高效，Transformer表达力更强"

    - name: "RWKV"
      relation: "parallel development"
      comparison: "类似目标，不同方法"
```

### 3.4 LLM驱动的知识抽取流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                   LLM知识抽取流程                                    │
└─────────────────────────────────────────────────────────────────────┘

输入: 论文PDF/HTML
          │
          ▼
┌─────────────────────┐
│ 1. 结构化解析       │
│    - 标题、摘要     │
│    - 章节划分       │
│    - 图表提取       │
│    - 参考文献解析   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. 核心贡献抽取     │  ← LLM (Claude/GPT-4)
│                     │
│ Prompt:             │
│ "提取这篇论文的:    │
│  - 核心贡献(1句话)  │
│  - 关键创新点       │
│  - 技术类别         │
│  - 解决的问题"      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. 技术要素抽取     │  ← LLM
│                     │
│ "识别论文中的:      │
│  - 提出的新方法     │
│  - 使用的基础技术   │
│  - 改进的已有方法"  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 关系抽取         │  ← LLM + 引用分析
│                     │
│ "分析与引用论文的   │
│  关系类型:          │
│  - extends (扩展)   │
│  - improves (改进)  │
│  - compares (对比)  │
│  - uses (使用)"     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. 实体链接         │  ← 规则 + LLM
│                     │
│ - 作者 → Person实体 │
│ - 引用 → Paper实体  │
│ - 技术 → Tech实体   │
│ - 机构 → Org实体    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. 质量审核         │  ← Critic Agent
│                     │
│ - 一致性检查        │
│ - 置信度评分        │
│ - 冲突检测          │
└──────────┬──────────┘
           │
           ▼
      写入知识库
```

---

## 4. 知识图谱Schema

### 4.1 节点类型

```cypher
// 核心实体类型

// 论文
(:Paper {
  id: String,           // "arxiv:2312.00752"
  title: String,
  abstract: String,
  date: Date,
  venue: String,
  arxiv_id: String,
  doi: String,
  pdf_url: String,
  citations: Integer,

  // 抽取的结构化信息
  contribution_type: String,    // architecture/method/theory/...
  core_contribution: String,    // 一句话总结
  key_insights: [String],
  limitations: [String],

  // 嵌入向量
  embedding: [Float]
})

// 人物
(:Person {
  id: String,           // "person:albert_gu"
  name: String,
  aliases: [String],    // 名字变体

  // 当前状态
  current_affiliation: String,
  current_position: String,

  // 指标
  h_index: Integer,
  total_citations: Integer,

  // 研究方向
  research_areas: [String],

  embedding: [Float]
})

// 机构
(:Organization {
  id: String,
  name: String,
  type: String,         // university/company/lab
  location: String,

  // 对于公司
  founded: Date,
  funding_total: Float,
  valuation: Float
})

// 技术/方法
(:Technology {
  id: String,           // "tech:mamba"
  name: String,
  aliases: [String],
  category: String,     // architecture/algorithm/framework

  description: String,
  origin_date: Date,
  origin_paper: String,

  // 特征
  complexity: String,   // "O(L)"
  modalities: [String], // ["text", "vision"]

  embedding: [Float]
})

// 概念/领域
(:Concept {
  id: String,
  name: String,
  category: String,     // field/task/problem

  description: String,
  parent_concepts: [String],

  embedding: [Float]
})

// 数据集
(:Dataset {
  id: String,
  name: String,
  task: String,
  size: String,
  source_url: String
})

// 基准测试
(:Benchmark {
  id: String,
  name: String,
  task: String,
  metric: String,
  leaderboard_url: String
})

// 代码仓库
(:Repository {
  id: String,
  name: String,
  url: String,
  stars: Integer,
  language: String,
  paper_id: String      // 关联论文
})
```

### 4.2 边类型 (关系)

```cypher
// 论文相关关系
(:Paper)-[:AUTHORED_BY {position: Int, is_corresponding: Bool}]->(:Person)
(:Paper)-[:AFFILIATED_WITH]->(:Organization)
(:Paper)-[:CITES {context: String, citation_type: String}]->(:Paper)
(:Paper)-[:INTRODUCES]->(:Technology)
(:Paper)-[:EVALUATES_ON]->(:Benchmark)
(:Paper)-[:USES_DATASET]->(:Dataset)
(:Paper)-[:ADDRESSES]->(:Concept)
(:Paper)-[:HAS_CODE]->(:Repository)

// 引用关系的细分类型
// citation_type: "extends" | "improves" | "compares" | "uses" | "criticizes"

// 人物关系
(:Person)-[:ADVISED_BY {degree: String, year: Int}]->(:Person)
(:Person)-[:COLLABORATED_WITH {papers_count: Int, first_collab: Date}]->(:Person)
(:Person)-[:WORKS_AT {position: String, start_date: Date, end_date: Date}]->(:Organization)
(:Person)-[:FOUNDED]->(:Organization)
(:Person)-[:RESEARCHES]->(:Concept)
(:Person)-[:INVENTED]->(:Technology)

// 技术关系
(:Technology)-[:EXTENDS]->(:Technology)
(:Technology)-[:COMPETES_WITH]->(:Technology)
(:Technology)-[:COMBINES]->(:Technology)
(:Technology)-[:APPLIES_TO]->(:Concept)
(:Technology)-[:IMPLEMENTED_IN]->(:Repository)

// 机构关系
(:Organization)-[:ACQUIRED]->(:Organization)
(:Organization)-[:INVESTED_IN]->(:Organization)
(:Organization)-[:SPUN_OFF_FROM]->(:Organization)

// 概念层级
(:Concept)-[:SUBFIELD_OF]->(:Concept)
(:Concept)-[:RELATED_TO]->(:Concept)
```

### 4.3 时态属性

所有关系都应该支持时间维度：

```cypher
// 时态关系示例
(:Person)-[:WORKS_AT {
  position: "Assistant Professor",
  start_date: date("2023-08-01"),
  end_date: null,  // null表示当前
  is_current: true
}]->(:Organization)

// 历史快照
(:Person)-[:WORKS_AT {
  position: "PhD Student",
  start_date: date("2018-09-01"),
  end_date: date("2023-05-31"),
  is_current: false
}]->(:Organization)
```

---

## 5. 推理支撑层设计

### 5.1 核心设计理念

```
┌─────────────────────────────────────────────────────────────────────┐
│  传统RAG: 问题 → 检索相似文档 → 生成答案                            │
│  局限: 只能回答"文档说了什么"                                       │
├─────────────────────────────────────────────────────────────────────┤
│  NEXEN推理层: 问题 → 分解推理需求 → 多源查询 → 组装推理上下文       │
│  能力: 回答"为什么"、"怎么演进"、"有什么联系"                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 推理模式定义

```python
class ReasoningPatterns:
    """预定义的推理模式，每种模式对应特定的查询策略"""

    # 模式1: 因果追溯
    CAUSAL_TRACE = {
        "question_type": "为什么X会出现？",
        "query_strategy": [
            "找到X的起源论文",
            "分析起源论文解决的问题",
            "追溯问题的来源(之前的失败尝试)",
            "识别关键的前置技术",
        ],
        "output": "因果链: 问题 → 前置尝试 → 关键洞察 → 解决方案"
    }

    # 模式2: 演进分析
    EVOLUTION_ANALYSIS = {
        "question_type": "X是如何演进的？",
        "query_strategy": [
            "构建X的时间线(所有相关论文按时间排序)",
            "识别关键里程碑(高引用/范式转换)",
            "分析每次重大变化的驱动因素",
            "识别分叉点和不同分支",
        ],
        "output": "演进图谱 + 各阶段分析"
    }

    # 模式3: 人物网络分析
    PERSON_NETWORK = {
        "question_type": "某人的学术影响力/关系网络",
        "query_strategy": [
            "获取人物的所有论文",
            "分析合作者网络",
            "追溯师承关系(导师→学生链)",
            "识别思想传承(引用模式分析)",
        ],
        "output": "人物档案 + 关系网络 + 影响力分析"
    }

    # 模式4: 技术对比
    TECH_COMPARISON = {
        "question_type": "X和Y有什么区别？哪个更好？",
        "query_strategy": [
            "获取X和Y的技术定义",
            "找到直接对比的论文",
            "收集基准测试结果",
            "分析各自的优势场景",
        ],
        "output": "结构化对比表 + 适用场景分析"
    }

    # 模式5: 趋势预测
    TREND_PREDICTION = {
        "question_type": "X领域的未来趋势？",
        "query_strategy": [
            "分析最近6个月的论文趋势",
            "识别新兴主题(新出现的高频词)",
            "追踪顶级研究者的最新动向",
            "分析未解决的问题",
        ],
        "output": "趋势报告 + 预测依据"
    }

    # 模式6: 学派分析
    SCHOOL_ANALYSIS = {
        "question_type": "X学派的核心观点和成员？",
        "query_strategy": [
            "识别学派创始人/核心人物",
            "分析其标志性工作",
            "追踪学生/传承者",
            "提取核心方法论和信念",
        ],
        "output": "学派档案 + 核心观点 + 成员图谱"
    }
```

### 5.3 推理上下文构建

```python
class ReasoningContextBuilder:
    """为LLM构建推理所需的完整上下文"""

    def build_context(self, question: str, pattern: str) -> dict:
        """
        根据问题和推理模式，构建结构化的推理上下文
        """
        context = {
            "question": question,
            "reasoning_pattern": pattern,
            "evidence": [],
            "structured_data": {},
            "relevant_entities": [],
            "timeline": [],
            "relationships": [],
        }

        # 1. 实体识别
        entities = self.extract_entities(question)
        context["relevant_entities"] = entities

        # 2. 根据模式执行查询
        if pattern == "CAUSAL_TRACE":
            context = self._build_causal_context(context, entities)
        elif pattern == "EVOLUTION_ANALYSIS":
            context = self._build_evolution_context(context, entities)
        # ...

        # 3. 添加原文证据
        context["evidence"] = self.retrieve_supporting_passages(
            question,
            context["relevant_entities"]
        )

        return context

    def _build_causal_context(self, context: dict, entities: list) -> dict:
        """构建因果分析的上下文"""

        tech = entities[0]  # 假设第一个实体是要分析的技术

        # 查询起源
        origin = self.graph_query("""
            MATCH (t:Technology {name: $tech})<-[:INTRODUCES]-(p:Paper)
            RETURN p ORDER BY p.date LIMIT 1
        """, tech=tech.name)

        # 查询前置技术
        predecessors = self.graph_query("""
            MATCH (t:Technology {name: $tech})-[:EXTENDS*1..3]->(pre:Technology)
            RETURN pre
        """, tech=tech.name)

        # 查询解决的问题
        problems = self.graph_query("""
            MATCH (t:Technology {name: $tech})<-[:INTRODUCES]-(p:Paper)-[:ADDRESSES]->(c:Concept)
            RETURN c
        """, tech=tech.name)

        context["structured_data"] = {
            "origin_paper": origin,
            "predecessor_technologies": predecessors,
            "problems_addressed": problems,
            "causal_chain": self._construct_causal_chain(origin, predecessors, problems)
        }

        return context
```

### 5.4 预计算的推理物化视图

为了加速常见的推理查询，预计算一些物化视图：

```cypher
// 物化视图1: 人物影响力排名 (每日更新)
CREATE VIEW person_influence AS
MATCH (p:Person)<-[:AUTHORED_BY]-(paper:Paper)
WITH p,
     COUNT(paper) as paper_count,
     SUM(paper.citations) as total_citations,
     MAX(paper.citations) as max_paper_citations
RETURN p.id, p.name, paper_count, total_citations, max_paper_citations,
       total_citations / paper_count as avg_citations
ORDER BY total_citations DESC;

// 物化视图2: 技术热度趋势 (每周更新)
CREATE VIEW tech_trends AS
MATCH (t:Technology)<-[:INTRODUCES]-(p:Paper)
WHERE p.date > date() - duration('P6M')
WITH t,
     COUNT(p) as recent_papers,
     SUM(p.citations) as recent_citations
RETURN t.id, t.name, recent_papers, recent_citations,
       recent_papers * 0.3 + recent_citations * 0.7 as momentum_score
ORDER BY momentum_score DESC;

// 物化视图3: 学术谱系树 (有变更时更新)
CREATE VIEW academic_genealogy AS
MATCH path = (student:Person)-[:ADVISED_BY*1..5]->(ancestor:Person)
RETURN student.id, student.name,
       [node in nodes(path) | node.name] as lineage,
       length(path) as generation_distance;

// 物化视图4: 技术演进链 (有变更时更新)
CREATE VIEW tech_evolution AS
MATCH path = (t:Technology)-[:EXTENDS*1..10]->(ancestor:Technology)
RETURN t.id, t.name,
       [node in nodes(path) | {name: node.name, date: node.origin_date}] as evolution_chain;
```

### 5.5 推理查询示例

```python
# 示例1: "Mamba是怎么来的？"
def answer_tech_origin(tech_name: str) -> str:
    context = reasoning_context_builder.build_context(
        question=f"{tech_name}是怎么来的？",
        pattern="CAUSAL_TRACE"
    )

    # context 包含:
    # - origin_paper: Mamba论文
    # - predecessor_technologies: [S4, H3, Linear Attention, ...]
    # - problems_addressed: ["long-range dependencies", "quadratic complexity"]
    # - causal_chain: 结构化的因果链
    # - evidence: 相关论文的原文片段

    return llm.generate(
        prompt=CAUSAL_ANALYSIS_PROMPT,
        context=context
    )

# 示例2: "Albert Gu的学术影响力如何？"
def answer_person_influence(person_name: str) -> str:
    context = reasoning_context_builder.build_context(
        question=f"{person_name}的学术影响力如何？",
        pattern="PERSON_NETWORK"
    )

    # context 包含:
    # - person_profile: 完整人物档案
    # - papers: 所有论文列表
    # - collaborators: 合作者网络
    # - genealogy: 师承关系
    # - influence_metrics: h-index, 引用等
    # - school_affiliation: 学派归属

    return llm.generate(
        prompt=PERSON_ANALYSIS_PROMPT,
        context=context
    )

# 示例3: "Transformer和Mamba哪个更好？"
def answer_tech_comparison(tech_a: str, tech_b: str) -> str:
    context = reasoning_context_builder.build_context(
        question=f"{tech_a}和{tech_b}哪个更好？",
        pattern="TECH_COMPARISON"
    )

    # context 包含:
    # - tech_a_profile: 技术A的完整信息
    # - tech_b_profile: 技术B的完整信息
    # - direct_comparisons: 直接对比两者的论文
    # - benchmark_results: 各基准上的表现
    # - use_cases: 各自的最佳使用场景

    return llm.generate(
        prompt=COMPARISON_PROMPT,
        context=context
    )
```

---

## 6. 存储架构

### 6.1 混合存储架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        存储架构总览                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         应用层                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Semantic   │  │   Graph     │  │  Full-text  │                 │
│  │   Search    │  │   Query     │  │   Search    │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
└─────────┼────────────────┼────────────────┼─────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        统一查询层                                    │
│                    (Query Router / Fusion)                          │
└─────────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│                 │ │                 │ │                 │
│   Vector DB     │ │    Graph DB     │ │   Search DB     │
│   (Qdrant)      │ │    (Neo4j)      │ │ (Elasticsearch) │
│                 │ │                 │ │                 │
│ - 语义相似度    │ │ - 实体关系      │ │ - 全文检索      │
│ - 近似查询      │ │ - 路径查询      │ │ - 过滤排序      │
│ - 聚类分析      │ │ - 图算法        │ │ - 聚合统计      │
│                 │ │                 │ │                 │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        对象存储层                                    │
│                      (MinIO / S3)                                   │
│                                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│   │  原始PDF    │  │  解析结果   │  │   缓存      │                │
│   │  /papers    │  │  /parsed    │  │  /cache     │                │
│   └─────────────┘  └─────────────┘  └─────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 各存储组件职责

| 组件 | 存储内容 | 主要查询 |
|------|---------|---------|
| **Qdrant** | 文本embedding、实体embedding | 语义相似度搜索、聚类 |
| **Neo4j** | 实体、关系、属性 | 图遍历、路径查询、图算法 |
| **Elasticsearch** | 全文索引、元数据 | 关键词搜索、过滤、聚合 |
| **MinIO/S3** | 原始文件、解析结果 | 文件存取 |
| **Redis** | 缓存、会话状态 | 热数据访问 |
| **PostgreSQL** | 用户数据、系统配置 | 事务性操作 |

### 6.3 数据同步策略

```python
class DataSyncStrategy:
    """多存储之间的数据同步"""

    def on_paper_ingested(self, paper: Paper):
        """论文入库时的同步操作"""

        # 1. 存储原始文件
        self.minio.put_object(f"papers/{paper.id}.pdf", paper.pdf_content)

        # 2. 写入图数据库 (实体+关系)
        self.neo4j.create_paper_node(paper)
        self.neo4j.create_author_relations(paper)
        self.neo4j.create_citation_relations(paper)

        # 3. 写入向量数据库 (embedding)
        self.qdrant.upsert(
            collection="papers",
            points=[{
                "id": paper.id,
                "vector": paper.embedding,
                "payload": {"title": paper.title, "date": paper.date}
            }]
        )

        # 4. 写入搜索引擎 (全文索引)
        self.elasticsearch.index(
            index="papers",
            id=paper.id,
            body={
                "title": paper.title,
                "abstract": paper.abstract,
                "content": paper.full_text,
                "authors": paper.authors,
                "date": paper.date,
            }
        )

        # 5. 更新物化视图 (异步)
        self.task_queue.enqueue("update_materialized_views", paper.id)
```

---

## 7. 查询与检索

### 7.1 统一查询接口

```python
class UnifiedQueryEngine:
    """统一查询引擎，融合多种检索方式"""

    def query(self,
              question: str,
              query_type: str = "auto",
              filters: dict = None) -> QueryResult:
        """
        统一查询接口

        query_type:
        - "semantic": 语义搜索
        - "graph": 图查询
        - "keyword": 关键词搜索
        - "hybrid": 混合查询
        - "auto": 自动选择
        """

        if query_type == "auto":
            query_type = self._detect_query_type(question)

        if query_type == "semantic":
            return self._semantic_search(question, filters)
        elif query_type == "graph":
            return self._graph_query(question, filters)
        elif query_type == "keyword":
            return self._keyword_search(question, filters)
        elif query_type == "hybrid":
            return self._hybrid_search(question, filters)

    def _hybrid_search(self, question: str, filters: dict) -> QueryResult:
        """混合检索: 结合语义、图、关键词"""

        # 1. 语义检索
        semantic_results = self.qdrant.search(
            collection="papers",
            query_vector=self.embed(question),
            limit=20
        )

        # 2. 提取实体，执行图查询
        entities = self.extract_entities(question)
        graph_results = []
        for entity in entities:
            related = self.neo4j.query("""
                MATCH (e {name: $name})-[r*1..2]-(related)
                RETURN related, r
            """, name=entity)
            graph_results.extend(related)

        # 3. 关键词检索 (补充)
        keyword_results = self.elasticsearch.search(
            index="papers",
            body={"query": {"match": {"content": question}}}
        )

        # 4. 结果融合和排序
        fused_results = self._fuse_results(
            semantic_results,
            graph_results,
            keyword_results,
            weights=[0.5, 0.3, 0.2]  # 可调权重
        )

        return QueryResult(
            items=fused_results,
            query_type="hybrid",
            debug_info={
                "semantic_count": len(semantic_results),
                "graph_count": len(graph_results),
                "keyword_count": len(keyword_results),
            }
        )
```

### 7.2 专用查询模式

```python
class SpecializedQueries:
    """针对特定推理需求的专用查询"""

    def get_paper_lineage(self, paper_id: str, depth: int = 3) -> dict:
        """获取论文的引用谱系 (被谁引用，引用了谁)"""
        return self.neo4j.query("""
            // 向前追溯 (引用了谁)
            MATCH (p:Paper {id: $paper_id})-[:CITES*1..$depth]->(cited:Paper)
            WITH collect(DISTINCT cited) as backward

            // 向后追溯 (被谁引用)
            MATCH (citing:Paper)-[:CITES*1..$depth]->(p:Paper {id: $paper_id})
            WITH backward, collect(DISTINCT citing) as forward

            RETURN backward, forward
        """, paper_id=paper_id, depth=depth)

    def get_person_academic_tree(self, person_id: str) -> dict:
        """获取人物的完整学术谱系树"""
        return self.neo4j.query("""
            // 向上追溯导师
            MATCH (p:Person {id: $person_id})-[:ADVISED_BY*1..5]->(advisor:Person)
            WITH collect({person: advisor, relation: 'advisor'}) as upward

            // 向下追溯学生
            MATCH (student:Person)-[:ADVISED_BY*1..5]->(p:Person {id: $person_id})
            WITH upward, collect({person: student, relation: 'student'}) as downward

            // 合作者网络
            MATCH (p:Person {id: $person_id})-[:COLLABORATED_WITH]-(collaborator:Person)
            WITH upward, downward, collect(collaborator) as collaborators

            RETURN upward, downward, collaborators
        """, person_id=person_id)

    def get_tech_evolution_tree(self, tech_id: str) -> dict:
        """获取技术的完整演进树"""
        return self.neo4j.query("""
            // 前置技术
            MATCH (t:Technology {id: $tech_id})-[:EXTENDS*1..5]->(ancestor:Technology)
            WITH collect(DISTINCT ancestor) as ancestors

            // 后继技术
            MATCH (descendant:Technology)-[:EXTENDS*1..5]->(t:Technology {id: $tech_id})
            WITH ancestors, collect(DISTINCT descendant) as descendants

            // 竞争技术
            MATCH (t:Technology {id: $tech_id})-[:COMPETES_WITH]-(competitor:Technology)

            RETURN ancestors, descendants, collect(competitor) as competitors
        """, tech_id=tech_id)

    def find_research_gaps(self, concept_id: str) -> list:
        """识别研究空白: 被提到但未解决的问题"""
        return self.neo4j.query("""
            MATCH (c:Concept {id: $concept_id})<-[:ADDRESSES]-(p:Paper)
            WHERE p.limitations IS NOT NULL
            WITH c, collect(DISTINCT p.limitations) as all_limitations

            // 找出被多次提到的局限性
            UNWIND all_limitations as limitation
            WITH limitation, count(*) as mention_count
            WHERE mention_count > 2

            RETURN limitation, mention_count
            ORDER BY mention_count DESC
        """, concept_id=concept_id)
```

---

## 8. 实现路线图

### 8.1 分阶段实现

```
Phase 1: 基础数据层 (Week 1-2)
───────────────────────────────
目标: 建立基本的数据采集和存储能力

任务:
□ 搭建存储基础设施 (Neo4j, Qdrant, Elasticsearch, MinIO)
□ 实现arXiv采集器 (每日新论文)
□ 实现Semantic Scholar采集器 (元数据+引用)
□ 基础的论文实体创建 (Paper节点)
□ 简单的向量索引 (title+abstract embedding)

交付:
- 可运行的数据采集pipeline
- 1000+篇论文入库
- 基础语义搜索能力


Phase 2: 知识抽取 (Week 3-4)
───────────────────────────────
目标: LLM驱动的深度知识抽取

任务:
□ 实现论文结构化解析 (PDF → sections)
□ 实现核心贡献抽取 (LLM)
□ 实现技术要素抽取 (LLM)
□ 实现关系抽取 (cites → extends/improves/compares)
□ 人物信息采集 (Google Scholar profiles)
□ 实体链接 (author → Person, citation → Paper)

交付:
- 结构化的论文知识
- Paper-Person-Technology关系图
- 知识抽取质量评估


Phase 3: 推理支撑层 (Week 5-6)
───────────────────────────────
目标: 支撑深度推理的查询和上下文构建能力

任务:
□ 实现推理模式定义
□ 实现ReasoningContextBuilder
□ 创建物化视图 (人物影响力、技术趋势等)
□ 实现统一查询引擎
□ 实现专用查询 (谱系、演进树等)

交付:
- 可回答复杂问题的推理能力
- 6种推理模式支持


Phase 4: Agent集成 (Week 7-8)
───────────────────────────────
目标: 将知识库能力集成到NEXEN Agent

任务:
□ Genealogist Agent集成知识库
□ Historian Agent集成知识库
□ Explorer Agent使用混合检索
□ 实现知识库技能 (/who, /lineage, /evolution)
□ 端到端测试

交付:
- 知识库驱动的Agent能力
- 完整的技能实现
```

### 8.2 技术选型总结

| 组件 | 选型 | 原因 |
|------|------|------|
| 图数据库 | Neo4j | 成熟、Cypher强大、支持图算法 |
| 向量数据库 | Qdrant | 性能好、支持过滤、Rust实现 |
| 搜索引擎 | Elasticsearch | 全文检索成熟、聚合强大 |
| 对象存储 | MinIO | S3兼容、自托管 |
| 缓存 | Redis | 标准选择 |
| 消息队列 | Redis Streams | 简化架构、够用 |
| LLM (抽取) | Claude Sonnet | 性价比、结构化输出好 |
| Embedding | text-embedding-3-large | 质量好、维度合适 |

---

## 总结

本知识库架构的核心创新点：

1. **双轨存储**: 原文保留 + 结构化知识并存
2. **推理优先**: 为LLM推理设计，而非简单RAG
3. **关系丰富**: 详细定义实体间关系类型
4. **时态感知**: 所有知识带时间维度
5. **预计算加速**: 物化视图支撑常见推理模式
6. **多源融合**: 语义+图+关键词混合检索

这个设计使得NEXEN能够回答传统RAG无法回答的问题，如"某技术为什么出现"、"某人的学术影响力网络"、"某领域的演进历程"等深度问题。

---

*NEXEN Knowledge Base Architecture v1.0*
