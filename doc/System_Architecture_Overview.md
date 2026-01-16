# NEXEN 系统架构全景图与模块分析

> **文档目的**: 展示NEXEN完整架构，对每个模块进行深度分析，识别改进点
> **版本**: v1.0
> **日期**: 2026-01-16

---

## 目录

1. [架构全景图](#1-架构全景图)
2. [模块详解与分析](#2-模块详解与分析)
3. [数据流分析](#3-数据流分析)
4. [改进点汇总](#4-改进点汇总)
5. [优化后的目标架构](#5-优化后的目标架构)

---

## 1. 架构全景图

### 1.1 系统层级架构

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              NEXEN System Architecture                               │
│                         Next-generation EXpert ENgine                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Layer 0: User Interface Layer (用户交互层)                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   CLI       │  │  Web UI     │  │   API       │  │  IDE Plugin │               │
│  │  (Typer)    │  │ (Next.js)   │  │ (FastAPI)   │  │  (VSCode)   │               │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │
│         └─────────────────┴─────────────────┴─────────────────┘                     │
│                                    │                                                │
│                          ┌─────────▼─────────┐                                      │
│                          │   Skill Engine    │  ← 技能触发入口 (/survey, /who...)   │
│                          └─────────┬─────────┘                                      │
└────────────────────────────────────┼────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 1: Orchestration Layer (编排层)                                               │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                          ┌─────────▼─────────┐                                      │
│                          │ Meta-Coordinator  │  ← 任务分解、Agent调度、决策         │
│                          │   (Claude Opus)   │                                      │
│                          └─────────┬─────────┘                                      │
│                                    │                                                │
│         ┌──────────────────────────┼──────────────────────────┐                     │
│         │                          │                          │                     │
│         ▼                          ▼                          ▼                     │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐                 │
│  │Task Planner │          │Agent Router │          │Result Merger│                 │
│  │(任务规划)   │          │(Agent选择)  │          │(结果合并)   │                 │
│  └─────────────┘          └─────────────┘          └─────────────┘                 │
└────────────────────────────────────┼────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 2: Agent Execution Layer (Agent执行层)                                        │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                                    │                                                │
│  ┌──────────────────── 三模块执行流水线 ────────────────────┐                       │
│  │                                                          │                       │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │                       │
│  │  │ Module 1     │   │ Module 2     │   │ Module 3     │ │                       │
│  │  │ 提示词流水线 │ → │ 记忆检索     │ → │ 上下文预处理 │ │                       │
│  │  │ (4-D方法论)  │   │ (分层检索)   │   │ (去噪/冲突)  │ │                       │
│  │  └──────────────┘   └──────────────┘   └──────────────┘ │                       │
│  │         │                  │                  │          │                       │
│  │         ▼                  ▼                  ▼          │                       │
│  │  ┌─────────────────────────────────────────────────────┐│                       │
│  │  │              Agent Execution Engine                 ││                       │
│  │  └─────────────────────────────────────────────────────┘│                       │
│  └──────────────────────────────────────────────────────────┘                       │
│                                    │                                                │
│  ┌─────────────────────────────────┼─────────────────────────────────┐             │
│  │                                 │                                 │             │
│  │  ┌──────────── 推理与分析集群 ────────────┐                      │             │
│  │  │                                        │                      │             │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │             │
│  │  │  │Logician  │  │ Critic   │  │Connector │  │Genealogist│     │             │
│  │  │  │(o3)      │  │(o3-mini) │  │(Sonnet)  │  │(Opus)     │     │             │
│  │  │  │逻辑推理  │  │批判审查  │  │跨域关联  │  │人物谱系   │     │             │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │             │
│  │  │                                                              │             │
│  │  │  ┌──────────┐                                               │             │
│  │  │  │Historian │                                               │             │
│  │  │  │(Opus)    │                                               │             │
│  │  │  │技术历史  │                                               │             │
│  │  │  └──────────┘                                               │             │
│  │  └────────────────────────────────────────────────────────────┘             │
│  │                                                                              │
│  │  ┌──────────── 信息获取集群 ────────────┐                                   │
│  │  │                                      │                                   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │  │  │Explorer  │  │Social    │  │CN        │  │Vision    │                │
│  │  │  │(Sonnet)  │  │Scout     │  │Specialist│  │Analyst   │                │
│  │  │  │文献检索  │  │(Grok)    │  │(Qwen)    │  │(Gemini)  │                │
│  │  │  │          │  │社交监控  │  │中文资源  │  │图表分析  │                │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                │
│  │  └────────────────────────────────────────────────────────────────────────┘│
│  │                                                                              │
│  │  ┌──────────── 生产与管理集群 ────────────┐                                 │
│  │  │                                        │                                 │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │  │  │Builder   │  │ Scribe   │  │Archivist │  │Prompt    │                │
│  │  │  │(Sonnet)  │  │(Sonnet)  │  │(Sonnet)  │  │Engineer  │                │
│  │  │  │代码实现  │  │文档撰写  │  │记忆管理  │  │(Gemini)  │                │
│  │  │  │          │  │          │  │          │  │提示词优化│                │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                │
│  │  └────────────────────────────────────────────────────────────────────────┘│
│  └─────────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────┼────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 3: Model Gateway Layer (模型网关层)                                           │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                          ┌─────────▼─────────┐                                      │
│                          │   Model Router    │  ← 任务-模型最优匹配                 │
│                          │   (LiteLLM)       │                                      │
│                          └─────────┬─────────┘                                      │
│                                    │                                                │
│    ┌───────────┬───────────┬───────┼───────┬───────────┬───────────┐               │
│    ▼           ▼           ▼       ▼       ▼           ▼           ▼               │
│ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐             │
│ │Claude│  │OpenAI│  │Gemini│  │ Grok │  │ Qwen │  │Deep  │  │Local │             │
│ │Opus/ │  │o3/   │  │2/3   │  │  3   │  │ Max  │  │Seek  │  │Models│             │
│ │Sonnet│  │o3-mini│ │Pro   │  │      │  │      │  │      │  │      │             │
│ └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘             │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 4: Knowledge & Memory Layer (知识与记忆层)                                    │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                                    │                                                │
│  ┌──────────────── 三层外化记忆系统 ────────────────┐                              │
│  │                                                  │                              │
│  │          ┌───────────────────────┐              │                              │
│  │          │        L2层           │  ← 精华层     │                              │
│  │          │   insights/ (~2K)     │    (必读)     │                              │
│  │          │   关键发现、待解决问题 │              │                              │
│  │       ┌──┴───────────────────────┴──┐           │                              │
│  │       │          L1层               │  ← 摘要层  │                              │
│  │       │     digest/ (~4K)           │   (语义检索)│                              │
│  │       │    Agent摘要、主题摘要      │           │                              │
│  │    ┌──┴─────────────────────────────┴──┐        │                              │
│  │    │            L0层                   │  ← 原始层│                              │
│  │    │       raw/ (不限)                 │   (按需) │                              │
│  │    │      思维链、工具输出、原文       │        │                              │
│  │    └───────────────────────────────────┘        │                              │
│  │                                                  │                              │
│  └──────────────────────────────────────────────────┘                              │
│                                    │                                                │
│  ┌──────────────── 知识图谱系统 ────────────────┐                                  │
│  │                                              │                                  │
│  │  ┌────────────────────────────────────────┐ │                                  │
│  │  │            推理支撑层                   │ │                                  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │ │                                  │
│  │  │  │因果追溯 │ │演进分析 │ │人物网络 │  │ │                                  │
│  │  │  │Pattern  │ │Pattern  │ │Pattern  │  │ │                                  │
│  │  │  └─────────┘ └─────────┘ └─────────┘  │ │                                  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │ │                                  │
│  │  │  │技术对比 │ │趋势预测 │ │学派分析 │  │ │                                  │
│  │  │  │Pattern  │ │Pattern  │ │Pattern  │  │ │                                  │
│  │  │  └─────────┘ └─────────┘ └─────────┘  │ │                                  │
│  │  └────────────────────────────────────────┘ │                                  │
│  │                       │                     │                                  │
│  │  ┌────────────────────┼────────────────────┐│                                  │
│  │  │                    │                    ││                                  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐  ││                                  │
│  │  │  │ Neo4j   │ │ Qdrant  │ │Elastic  │  ││                                  │
│  │  │  │图数据库 │ │向量数据库│ │搜索引擎 │  ││                                  │
│  │  │  │实体关系 │ │语义相似 │ │全文检索 │  ││                                  │
│  │  │  └─────────┘ └─────────┘ └─────────┘  ││                                  │
│  │  └────────────────────────────────────────┘│                                  │
│  │                                             │                                  │
│  └─────────────────────────────────────────────┘                                  │
│                                                                                    │
│  ┌──────────────── 知识抽取流水线 ────────────────┐                               │
│  │                                                │                               │
│  │  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   │                               │
│  │  │结构化│ → │核心  │ → │关系  │ → │质量  │   │                               │
│  │  │解析  │   │贡献  │   │抽取  │   │审核  │   │                               │
│  │  │      │   │抽取  │   │(LLM) │   │(Critic)│   │                               │
│  │  └──────┘   └──────┘   └──────┘   └──────┘   │                               │
│  │                                                │                               │
│  └────────────────────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 5: Data Source Layer (数据源层)                                               │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                                    │                                                │
│  ┌────────────── 学术数据源 ──────────────┐                                        │
│  │  arXiv │ Semantic Scholar │ DBLP │     │                                        │
│  │  OpenAlex │ Papers With Code │ Google Scholar                                   │
│  └────────────────────────────────────────┘                                        │
│                                                                                     │
│  ┌────────────── 人物数据源 ──────────────┐                                        │
│  │  Google Scholar Profiles │ LinkedIn │  │                                        │
│  │  Mathematics Genealogy │ Personal CVs  │                                        │
│  └────────────────────────────────────────┘                                        │
│                                                                                     │
│  ┌────────────── 技术/产品数据源 ─────────┐                                        │
│  │  GitHub │ Hugging Face │ Official Blogs│                                        │
│  └────────────────────────────────────────┘                                        │
│                                                                                     │
│  ┌────────────── 社交/动态数据源 ─────────┐                                        │
│  │  Twitter/X │ Reddit │ 知乎 │ 微信公众号│                                        │
│  └────────────────────────────────────────┘                                        │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            模块依赖关系                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                User Request
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  Skill Engine   │
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │Meta-Coordinator │
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
            │   Prompt    │  │   Memory    │  │   Agent     │
            │  Engineer   │  │  Retriever  │  │   Pool      │
            └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
                   │                │                │
                   └────────────────┼────────────────┘
                                    │
                                    ▼
                            ┌─────────────────┐
                            │  Model Router   │
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
            │ Knowledge   │  │   Vector    │  │   Search    │
            │   Graph     │  │    DB       │  │   Engine    │
            └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
                   │                │                │
                   └────────────────┼────────────────┘
                                    │
                                    ▼
                            ┌─────────────────┐
                            │  Data Sources   │
                            └─────────────────┘
```

---

## 2. 模块详解与分析

### 2.1 用户交互层 (Layer 0)

#### 当前设计

```yaml
组件:
  CLI:
    框架: Typer
    功能: 命令行交互、技能触发

  Web UI:
    前端: Next.js 14 + TailwindCSS
    后端: FastAPI + WebSocket
    功能: 可视化界面、实时交互

  API:
    框架: FastAPI
    功能: RESTful API、第三方集成

  Skill Engine:
    功能: 解析技能命令、触发工作流
    技能数: 40+
```

#### 问题分析

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题1: 缺乏统一的会话管理                                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: CLI/Web/API各自维护会话状态                                                    │
│ 问题: 跨平台会话不同步，用户体验割裂                                                 │
│ 影响: 用户在CLI开始的研究无法在Web继续                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题2: 技能系统缺乏组合能力                                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 每个技能是独立的，需要预定义                                                   │
│ 问题: 无法动态组合技能，扩展性受限                                                   │
│ 影响: 用户复杂需求需要多次手动调用                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题3: 缺乏进度反馈机制                                                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 技能执行是黑盒，用户只能等待最终结果                                           │
│ 问题: 长时间任务用户体验差                                                          │
│ 影响: 用户焦虑，可能中断有价值的任务                                                │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### 改进建议

```python
# 改进1: 统一会话管理服务
class SessionManager:
    """跨平台统一会话管理"""

    def __init__(self):
        self.session_store = Redis()  # 集中存储

    def create_session(self, user_id: str, platform: str) -> Session:
        """创建会话，支持跨平台恢复"""
        session = Session(
            id=generate_session_id(),
            user_id=user_id,
            platform=platform,
            created_at=datetime.now(),
            context=ResearchContext(),
        )
        self.session_store.set(session.id, session)
        return session

    def resume_session(self, session_id: str, new_platform: str) -> Session:
        """在新平台恢复会话"""
        session = self.session_store.get(session_id)
        session.platform = new_platform
        return session


# 改进2: 技能组合引擎
class SkillComposer:
    """动态技能组合"""

    def compose(self, user_intent: str) -> SkillChain:
        """根据用户意图动态组合技能"""
        # 使用LLM理解意图
        intent_analysis = self.analyze_intent(user_intent)

        # 选择相关技能
        relevant_skills = self.select_skills(intent_analysis)

        # 确定执行顺序和依赖
        skill_chain = self.build_chain(relevant_skills)

        return skill_chain


# 改进3: 实时进度反馈
class ProgressTracker:
    """任务进度追踪"""

    async def track(self, task_id: str):
        """追踪并广播任务进度"""
        while not self.is_complete(task_id):
            progress = self.get_progress(task_id)
            await self.broadcast(task_id, {
                "stage": progress.current_stage,
                "percent": progress.percent,
                "current_agent": progress.agent,
                "message": progress.message,
                "estimated_remaining": progress.eta,
            })
            await asyncio.sleep(1)
```

---

### 2.2 编排层 (Layer 1)

#### 当前设计

```yaml
Meta-Coordinator:
  模型: Claude Opus
  职责:
    - 理解用户意图
    - 任务分解
    - Agent调度决策
    - 结果综合

  调度策略:
    - 串行: 有依赖的任务
    - 并行: 独立任务
```

#### 问题分析

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题1: 调度决策缺乏历史学习                                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 每次调度都是独立决策，不学习历史                                               │
│ 问题: 相同类型任务无法复用成功模式                                                   │
│ 影响: 效率低，可能重复失败                                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题2: 缺乏动态调整能力                                                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 任务计划一旦制定就固定执行                                                     │
│ 问题: 执行过程中发现问题无法动态调整                                                 │
│ 影响: 浪费资源在注定失败的路径上                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题3: 缺乏成本感知                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 调度时不考虑API成本                                                           │
│ 问题: 可能过度使用昂贵的模型(如o3)                                                  │
│ 影响: 成本不可控                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### 改进建议

```python
# 改进1: 调度模式学习
class SchedulingPatternLearner:
    """学习成功的调度模式"""

    def record_execution(self, task_type: str, plan: ExecutionPlan, result: Result):
        """记录执行结果"""
        pattern = SchedulingPattern(
            task_type=task_type,
            agent_sequence=plan.agents,
            success=result.success,
            quality_score=result.quality,
            time_cost=result.duration,
            token_cost=result.tokens,
        )
        self.pattern_store.add(pattern)

    def suggest_plan(self, task_type: str) -> Optional[ExecutionPlan]:
        """基于历史成功模式建议计划"""
        similar_patterns = self.pattern_store.find_similar(task_type)
        best_pattern = max(similar_patterns, key=lambda p: p.quality_score)
        return self.pattern_to_plan(best_pattern)


# 改进2: 动态重规划
class DynamicReplanner:
    """执行过程中动态调整计划"""

    async def monitor_and_replan(self, execution: Execution):
        """监控执行并在需要时重新规划"""
        while not execution.is_complete():
            checkpoint = await execution.next_checkpoint()

            if self.needs_replanning(checkpoint):
                # 分析当前状态
                current_state = execution.get_state()
                issues = self.identify_issues(checkpoint)

                # 生成新计划
                new_plan = await self.coordinator.replan(
                    original_goal=execution.goal,
                    current_state=current_state,
                    issues=issues,
                )

                # 应用新计划
                execution.update_plan(new_plan)


# 改进3: 成本感知调度
class CostAwareScheduler:
    """考虑成本的调度策略"""

    MODEL_COSTS = {
        "claude-opus": 15.0,    # $/1M tokens
        "claude-sonnet": 3.0,
        "openai-o3": 60.0,      # 估计
        "openai-o3-mini": 10.0,
        "gemini-pro": 1.25,
        "grok-3": 5.0,
        "qwen-max": 2.0,
    }

    def schedule_with_budget(
        self,
        task: Task,
        budget: float,
        quality_requirement: str = "high"
    ) -> ExecutionPlan:
        """在预算约束下调度"""

        # 估算各方案成本
        options = self.generate_options(task)

        for option in options:
            option.estimated_cost = self.estimate_cost(option)
            option.expected_quality = self.estimate_quality(option)

        # 选择满足质量要求且成本最低的方案
        valid_options = [
            o for o in options
            if o.expected_quality >= quality_requirement
            and o.estimated_cost <= budget
        ]

        return min(valid_options, key=lambda o: o.estimated_cost)
```

---

### 2.3 Agent执行层 (Layer 2)

#### 当前设计

```yaml
三模块流水线:
  Module1_提示词流水线:
    引擎: 4-D方法论
    模型: Gemini

  Module2_记忆检索:
    策略: L2必读 + L1语义检索 + L0按需

  Module3_上下文预处理:
    功能: 去重、去噪、冲突检测

Agent集群:
  推理分析: Logician, Critic, Connector, Genealogist, Historian
  信息获取: Explorer, Social_Scout, CN_Specialist, Vision_Analyst
  生产管理: Builder, Scribe, Archivist, Prompt_Engineer
```

#### 问题分析

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题1: Agent之间缺乏协作协议                                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: Agent之间通过Meta-Coordinator间接通信                                          │
│ 问题: 无法进行实时协作，如Critic在Logician推理过程中介入                            │
│ 影响: 协作模式受限，只能串行                                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题2: 三模块流水线开销大                                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 每次Agent执行都经过完整三模块                                                  │
│ 问题: 简单任务也有高开销                                                            │
│ 影响: 延迟高，成本高                                                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题3: Agent能力边界不清晰                                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: Agent职责有重叠(如Explorer和CN_Specialist都能检索)                            │
│ 问题: 选择哪个Agent不明确                                                           │
│ 影响: 可能选错Agent，效果不佳                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题4: 缺乏Agent自我评估                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: Agent输出后不自我评估                                                          │
│ 问题: 无法知道输出质量是否达标                                                       │
│ 影响: 可能传递低质量结果                                                            │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### 改进建议

```python
# 改进1: Agent协作协议
class AgentCollaborationProtocol:
    """Agent间直接协作协议"""

    # 定义协作模式
    COLLABORATION_MODES = {
        "critique_during_reasoning": {
            "initiator": "Logician",
            "collaborator": "Critic",
            "trigger": "checkpoint",
            "description": "推理过程中Critic实时审查",
        },
        "cross_domain_enrichment": {
            "initiator": "Explorer",
            "collaborator": "Connector",
            "trigger": "result_ready",
            "description": "检索结果由Connector补充跨域关联",
        },
        "debate_reasoning": {
            "participants": ["Logician", "Critic", "Connector"],
            "mode": "round_robin",
            "description": "多Agent辩论得出结论",
        },
    }

    async def execute_collaboration(
        self,
        mode: str,
        context: CollaborationContext
    ) -> CollaborationResult:
        """执行协作"""
        config = self.COLLABORATION_MODES[mode]

        if "debate" in mode:
            return await self._execute_debate(config, context)
        else:
            return await self._execute_sequential_collab(config, context)


# 改进2: 自适应流水线
class AdaptivePipeline:
    """根据任务复杂度自适应调整流水线"""

    def execute(self, agent: Agent, task: Task, context: Context) -> Result:
        complexity = self.assess_complexity(task)

        if complexity == "simple":
            # 简单任务: 跳过提示词优化，使用模板
            prompt = self.template_library.get(agent, task.type)
            return agent.execute(prompt, context)

        elif complexity == "medium":
            # 中等任务: 轻量级提示词优化 + 记忆检索
            prompt = self.lightweight_optimize(agent, task)
            relevant_memory = self.memory.retrieve_simple(task)
            return agent.execute(prompt, context + relevant_memory)

        else:  # complex
            # 复杂任务: 完整三模块流水线
            return self.full_pipeline.execute(agent, task, context)


# 改进3: Agent能力矩阵
class AgentCapabilityMatrix:
    """清晰定义Agent能力边界"""

    CAPABILITY_MATRIX = {
        "Explorer": {
            "primary": ["paper_search", "citation_network", "dataset_find"],
            "secondary": ["code_search"],
            "languages": ["en"],
            "data_sources": ["arxiv", "semantic_scholar", "dblp"],
        },
        "CN_Specialist": {
            "primary": ["paper_search", "social_discussion"],
            "secondary": [],
            "languages": ["zh"],
            "data_sources": ["cnki", "zhihu", "wechat"],
        },
        "Genealogist": {
            "primary": ["person_profile", "academic_lineage", "school_analysis"],
            "secondary": ["collaboration_network"],
            "languages": ["en", "zh"],
            "data_sources": ["google_scholar", "math_genealogy", "linkedin"],
        },
        # ...
    }

    def select_agent(self, capability: str, language: str) -> str:
        """根据能力需求选择最佳Agent"""
        candidates = []
        for agent, caps in self.CAPABILITY_MATRIX.items():
            if capability in caps["primary"]:
                score = 1.0
            elif capability in caps["secondary"]:
                score = 0.5
            else:
                continue

            if language in caps["languages"]:
                candidates.append((agent, score))

        return max(candidates, key=lambda x: x[1])[0]


# 改进4: Agent自我评估
class AgentSelfEvaluator:
    """Agent输出自我评估"""

    async def evaluate_output(
        self,
        agent: Agent,
        task: Task,
        output: str
    ) -> Evaluation:
        """Agent自我评估输出质量"""

        evaluation_prompt = f"""
        你刚刚完成了以下任务:
        任务: {task.description}

        你的输出:
        {output}

        请评估你的输出:
        1. 完整性 (0-10): 是否完整回答了任务要求
        2. 准确性 (0-10): 信息是否准确可靠
        3. 深度 (0-10): 分析是否有深度
        4. 不确定项: 列出你不确定的部分
        5. 需要补充: 建议后续获取什么信息

        如果任何维度低于6分，建议重新执行或请求帮助。
        """

        evaluation = await agent.evaluate(evaluation_prompt)

        if evaluation.needs_retry:
            return Evaluation(
                quality="insufficient",
                suggestion="retry_with_more_context",
                details=evaluation.details
            )

        return evaluation
```

---

### 2.4 模型网关层 (Layer 3)

#### 当前设计

```yaml
Model Router:
  框架: LiteLLM
  路由策略:
    - 语言路由: 中文→Qwen
    - 模态路由: 有图→Gemini
    - 任务路由: 数学→o3, 代码→Sonnet

支持模型:
  - Claude (Opus, Sonnet)
  - OpenAI (o3, o3-mini)
  - Gemini (2, 3 Pro)
  - Grok 3
  - Qwen Max
  - DeepSeek
```

#### 问题分析

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题1: 缺乏模型性能监控                                                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 不追踪各模型的实际表现                                                         │
│ 问题: 无法知道路由策略是否最优                                                       │
│ 影响: 可能持续使用次优模型                                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题2: 缺乏降级机制                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: API失败直接报错                                                               │
│ 问题: 单点故障导致任务中断                                                          │
│ 影响: 可用性低                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题3: 缺乏缓存机制                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 相同请求每次都调用API                                                          │
│ 问题: 重复请求浪费成本                                                              │
│ 影响: 成本高，延迟高                                                                │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### 改进建议

```python
# 改进1: 模型性能监控
class ModelPerformanceMonitor:
    """模型性能监控"""

    def record(self, request: ModelRequest, response: ModelResponse):
        """记录请求响应"""
        metrics = {
            "model": request.model,
            "task_type": request.task_type,
            "latency_ms": response.latency,
            "tokens_in": response.tokens_in,
            "tokens_out": response.tokens_out,
            "quality_score": response.quality_score,  # 后续评估
            "cost": self.calculate_cost(request.model, response),
        }
        self.metrics_store.add(metrics)

    def get_model_stats(self, model: str, task_type: str) -> ModelStats:
        """获取模型在特定任务上的统计"""
        records = self.metrics_store.query(model=model, task_type=task_type)
        return ModelStats(
            avg_latency=np.mean([r["latency_ms"] for r in records]),
            avg_quality=np.mean([r["quality_score"] for r in records]),
            avg_cost=np.mean([r["cost"] for r in records]),
            sample_count=len(records),
        )


# 改进2: 智能降级
class FallbackRouter:
    """智能降级路由"""

    FALLBACK_CHAINS = {
        "claude-opus": ["claude-sonnet", "gpt-4-turbo"],
        "openai-o3": ["openai-o3-mini", "claude-opus"],
        "gemini-3-pro": ["gemini-2-pro", "claude-sonnet"],
        "grok-3": ["claude-sonnet"],  # Grok无替代
        "qwen-max": ["deepseek", "claude-sonnet"],
    }

    async def call_with_fallback(
        self,
        model: str,
        request: ModelRequest
    ) -> ModelResponse:
        """带降级的模型调用"""

        fallback_chain = [model] + self.FALLBACK_CHAINS.get(model, [])

        for fallback_model in fallback_chain:
            try:
                response = await self.call_model(fallback_model, request)
                if response.success:
                    if fallback_model != model:
                        logger.warning(f"Fallback from {model} to {fallback_model}")
                    return response
            except (RateLimitError, APIError) as e:
                logger.warning(f"{fallback_model} failed: {e}")
                continue

        raise AllModelsFailed(f"All fallbacks failed for {model}")


# 改进3: 语义缓存
class SemanticCache:
    """语义相似度缓存"""

    def __init__(self, similarity_threshold: float = 0.95):
        self.cache = {}
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        self.threshold = similarity_threshold

    def get(self, prompt: str) -> Optional[str]:
        """查找语义相似的缓存"""
        prompt_embedding = self.embedder.encode(prompt)

        for cached_prompt, (embedding, response) in self.cache.items():
            similarity = cosine_similarity(prompt_embedding, embedding)
            if similarity >= self.threshold:
                logger.info(f"Cache hit with similarity {similarity:.3f}")
                return response

        return None

    def set(self, prompt: str, response: str):
        """缓存响应"""
        embedding = self.embedder.encode(prompt)
        self.cache[prompt] = (embedding, response)
```

---

### 2.5 知识与记忆层 (Layer 4)

#### 当前设计

```yaml
三层记忆:
  L2_insights: 精华层，必读，~2K tokens
  L1_digest: 摘要层，语义检索，~4K tokens
  L0_raw: 原始层，按需引用

知识图谱:
  图数据库: Neo4j
  向量数据库: Qdrant
  搜索引擎: Elasticsearch

  节点类型: Paper, Person, Organization, Technology, Concept
  边类型: CITES, AUTHORED_BY, ADVISED_BY, EXTENDS, etc.

推理支撑层:
  模式: 因果追溯, 演进分析, 人物网络, 技术对比, 趋势预测, 学派分析
```

#### 问题分析

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题1: 知识图谱冷启动问题                                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 新系统知识图谱为空                                                            │
│ 问题: 需要大量时间积累知识                                                          │
│ 影响: 初期推理能力有限                                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题2: 知识更新滞后                                                                  │
├─────────────────────────────────────────────────��───────────────────────────────────┤
│ 现状: 知识抽取是批量的，不是实时的                                                   │
│ 问题: 可能使用过时的知识                                                            │
│ 影响: 推理结果可能不准确                                                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题3: 记忆层级边界模糊                                                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 什么内容进L2/L1/L0没有明确标准                                                │
│ 问题: 可能重要信息被放到L0而不被检索                                                │
│ 影响: 推理上下文不完整                                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题4: 知识置信度缺失                                                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 所有知识同等对待                                                              │
│ 问题: 不确定的知识和确定的知识无法区分                                              │
│ 影响: 推理可能基于不可靠的知识                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### 改进建议

```python
# 改进1: 知识图谱预热策略
class KnowledgeGraphBootstrap:
    """知识图谱冷启动预热"""

    SEED_DATASETS = [
        "semantic_scholar_ai_papers_top10000",  # 顶级AI论文
        "math_genealogy_cs",                     # 计算机学者谱系
        "github_ml_repos_top1000",              # 热门ML项目
    ]

    async def bootstrap(self):
        """执行预热"""
        for dataset in self.SEED_DATASETS:
            data = await self.load_seed_dataset(dataset)
            await self.ingest_batch(data)

        # 构建核心关系
        await self.build_citation_network()
        await self.build_author_network()
        await self.build_tech_evolution_tree()

        logger.info(f"Bootstrapped with {self.graph.node_count} nodes")


# 改进2: 增量知识更新
class IncrementalKnowledgeUpdater:
    """增量知识更新"""

    async def watch_and_update(self):
        """监听数据源变化并增量更新"""

        # 订阅arXiv新论文
        async for paper in self.arxiv_stream.subscribe():
            await self.process_new_paper(paper)

    async def process_new_paper(self, paper: Paper):
        """处理新论文"""
        # 快速抽取基础信息
        basic_info = self.quick_extract(paper)
        self.graph.add_paper(basic_info)

        # 队列深度分析（异步）
        self.deep_analysis_queue.enqueue(paper.id)

        # 更新相关实体
        for author in paper.authors:
            self.graph.update_person_stats(author)
        for cited in paper.citations:
            self.graph.update_citation_count(cited)


# 改进3: 记忆分层标准
class MemoryTieringPolicy:
    """记忆分层策略"""

    L2_CRITERIA = {
        "key_insight": True,          # 关键发现
        "unresolved_question": True,  # 待解决问题
        "decision_point": True,       # 决策点
        "user_marked_important": True,# 用户标记
    }

    L1_CRITERIA = {
        "agent_summary": True,        # Agent输出摘要
        "topic_summary": True,        # 主题摘要
        "intermediate_conclusion": True,  # 中间结论
    }

    # 其他默认进L0

    def classify(self, content: Content) -> str:
        """分类内容到层级"""
        for criterion, _ in self.L2_CRITERIA.items():
            if self.matches_criterion(content, criterion):
                return "L2"

        for criterion, _ in self.L1_CRITERIA.items():
            if self.matches_criterion(content, criterion):
                return "L1"

        return "L0"

    def matches_criterion(self, content: Content, criterion: str) -> bool:
        """检查内容是否匹配标准"""
        # 使用LLM判断
        prompt = f"""
        判断以下内容是否属于"{criterion}":

        {content.text}

        回答 是/否
        """
        return self.llm.classify(prompt) == "是"


# 改进4: 知识置信度
class KnowledgeConfidence:
    """知识置信度管理"""

    def calculate_confidence(self, knowledge: Knowledge) -> float:
        """计算知识置信度"""

        factors = {
            "source_reliability": self.assess_source(knowledge.source),
            "extraction_confidence": knowledge.extraction_confidence,
            "corroboration": self.count_corroborating_evidence(knowledge),
            "recency": self.assess_recency(knowledge.date),
            "expert_validation": knowledge.expert_validated,
        }

        weights = {
            "source_reliability": 0.3,
            "extraction_confidence": 0.25,
            "corroboration": 0.2,
            "recency": 0.15,
            "expert_validation": 0.1,
        }

        confidence = sum(
            factors[k] * weights[k] for k in factors
        )

        return confidence

    def annotate_knowledge(self, knowledge: Knowledge) -> Knowledge:
        """为知识添加置信度标注"""
        knowledge.confidence = self.calculate_confidence(knowledge)
        knowledge.confidence_explanation = self.explain_confidence(knowledge)
        return knowledge
```

---

### 2.6 数据源层 (Layer 5)

#### 当前设计

```yaml
学术数据源:
  - arXiv (API)
  - Semantic Scholar (API)
  - Google Scholar (爬虫)
  - DBLP
  - OpenAlex
  - Papers With Code

人物数据源:
  - Google Scholar Profiles
  - Mathematics Genealogy Project
  - LinkedIn (需授权)

社交数据源:
  - Twitter/X (Grok API)
  - Reddit
  - 知乎
  - 微信公众号 (爬虫)
```

#### 问题分析

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题1: API限制和可靠性                                                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 依赖第三方API，有速率限制                                                      │
│ 问题: 高并发时可能被限流，部分API不稳定                                             │
│ 影响: 数据获取不及时                                                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题2: 数据质量不一致                                                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 不同数据源格式和质量各异                                                       │
│ 问题: 需要大量清洗和标准化工作                                                       │
│ 影响: 数据集成复杂                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 问题3: 版权和法律风险                                                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 现状: 部分数据源需要爬虫获取                                                         │
│ 问题: 可能违反ToS，有法律风险                                                       │
│ 影响: 可持续性存疑                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### 改进建议

```python
# 改进1: 数据源抽象层
class DataSourceAbstraction:
    """数据源统一抽象"""

    class Paper(BaseModel):
        """统一的论文数据模型"""
        id: str
        title: str
        abstract: str
        authors: List[Author]
        date: datetime
        venue: Optional[str]
        citations: int
        pdf_url: Optional[str]
        source: str  # 来源标识

    async def search_papers(
        self,
        query: str,
        sources: List[str] = None
    ) -> List[Paper]:
        """从多个数据源搜索论文"""

        sources = sources or self.default_sources
        results = []

        for source in sources:
            try:
                source_results = await self.sources[source].search(query)
                # 标准化格式
                normalized = [
                    self.normalize(r, source) for r in source_results
                ]
                results.extend(normalized)
            except Exception as e:
                logger.warning(f"Source {source} failed: {e}")

        # 去重合并
        return self.dedupe_and_merge(results)


# 改进2: 智能速率控制
class AdaptiveRateLimiter:
    """自适应速率控制"""

    def __init__(self, source: str):
        self.source = source
        self.base_rate = self.get_base_rate(source)
        self.current_rate = self.base_rate
        self.backoff_factor = 1.0

    async def acquire(self):
        """获取请求许可"""
        async with self.semaphore:
            await asyncio.sleep(1.0 / self.current_rate)

    def on_success(self):
        """成功后恢复速率"""
        self.backoff_factor = max(1.0, self.backoff_factor * 0.9)
        self.current_rate = self.base_rate / self.backoff_factor

    def on_rate_limit(self):
        """被限流后降低速率"""
        self.backoff_factor *= 2
        self.current_rate = self.base_rate / self.backoff_factor
        logger.warning(f"Rate limited, backing off to {self.current_rate}/s")


# 改进3: 合规数据获取
class CompliantDataFetcher:
    """合规的数据获取"""

    # 明确各数据源的使用条款
    SOURCE_COMPLIANCE = {
        "arxiv": {
            "api_ok": True,
            "scraping_ok": False,
            "rate_limit": "3/second",
            "attribution_required": True,
        },
        "semantic_scholar": {
            "api_ok": True,
            "scraping_ok": False,
            "rate_limit": "100/5min",
            "api_key_required": True,
        },
        "google_scholar": {
            "api_ok": False,
            "scraping_ok": False,  # 违反ToS
            "alternative": "semantic_scholar",
        },
    }

    async def fetch(self, source: str, query: str) -> List[Any]:
        """合规地获取数据"""

        compliance = self.SOURCE_COMPLIANCE.get(source, {})

        if compliance.get("scraping_ok") == False and not compliance.get("api_ok"):
            # 使用替代数据源
            alternative = compliance.get("alternative")
            if alternative:
                logger.info(f"Using alternative source {alternative} instead of {source}")
                return await self.fetch(alternative, query)
            else:
                raise ComplianceError(f"No compliant way to access {source}")

        # 使用API
        return await self.api_fetch(source, query)
```

---

## 3. 数据流分析

### 3.1 典型任务数据流

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    示例: /survey "Mamba架构" 数据流                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

用户输入: /survey "Mamba架构"
    │
    ▼
┌─────────────────┐
│ Skill Engine    │  解析技能: survey
│                 │  参数: topic="Mamba架构"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Meta-Coordinator │
│                 │  1. 理解任务: 生成Mamba架构的文献综述
│                 │  2. 分解任务:
│                 │     - 检索英文论文 (Explorer)
│                 │     - 检索中文资源 (CN_Specialist)
│                 │     - 跨域关联 (Connector)
│                 │     - 人物识别 (Genealogist)
│                 │     - 质量筛选 (Critic)
│                 │     - 生成报告 (Scribe)
│                 │  3. 调度: 并行检索→串行分析→生成
└────────┬────────┘
         │
         ├─────────────────────────┬─────────────────────────┐
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Explorer      │       │  CN_Specialist  │       │   Connector     │
│   (Claude)      │       │   (Qwen)        │       │   (Claude)      │
│                 │       │                 │       │                 │
│ arXiv搜索      │       │ 知网/知乎搜索   │       │ 等待检索结果    │
│ Semantic Scholar│       │                 │       │                 │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   Connector     │  识别跨域关联:
                          │   (Claude)      │  - SSM与RNN的关系
                          │                 │  - Mamba与Flash Attention
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  Genealogist    │  识别关键人物:
                          │  (Claude Opus)  │  - Albert Gu (第一作者)
                          │                 │  - Christopher Ré (导师)
                          │                 │  - Tri Dao (合作者)
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │    Critic       │  质量筛选:
                          │  (o3-mini)      │  - 保留高引用论文
                          │                 │  - 剔除低质量来源
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │    Scribe       │  生成报告:
                          │  (Claude)       │  - 背景介绍
                          │                 │  - 关键方法
                          │                 │  - 对比表格
                          │                 │  - 研究空白
                          │                 │  - 参考文献
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  Archivist      │  保存到记忆:
                          │  (Claude)       │  - L2: 关键发现
                          │                 │  - L1: 报告摘要
                          │                 │  - L0: 原始数据
                          └────────┬────────┘
                                   │
                                   ▼
                          输出: digest/surveys/mamba_survey.md
```

### 3.2 数据流瓶颈分析

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         数据流瓶颈识别                                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

瓶颈1: API调用延迟
───────────────────
位置: Explorer → 外部API (arXiv, Semantic Scholar)
原因: 外部API响应慢，有速率限制
影响: 整体任务时间主要消耗在这里
优化:
  - 本地缓存
  - 预取热门数据
  - 并行多数据源


瓶颈2: LLM推理串行
───────────────────
位置: Agent执行链 (Connector → Genealogist → Critic → Scribe)
原因: 必须等前一个Agent完成
影响: 累积延迟
优化:
  - 流式输出，边生成边处理
  - 识别可并行的部分


瓶颈3: 知识图谱写入
───────────────────
位置: 知识抽取 → Neo4j写入
原因: 复杂关系需要多次事务
影响: 批量入库慢
优化:
  - 批量写入
  - 异步入库队列


瓶颈4: 记忆检索
───────────────────
位置: Module2 (记忆检索)
原因: 向量搜索 + 图查询 + 全文检索
影响: 每次Agent执行都有开销
优化:
  - 缓存热点查询
  - 预计算物化视图
```

---

## 4. 改进点汇总

### 4.1 改进优先级矩阵

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         改进优先级矩阵                                               │
│                    (Impact: 影响力, Effort: 实现难度)                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

                          Impact
                High ▲
                     │  ┌─────────────────┐    ┌─────────────────┐
                     │  │ P1: 语义缓存    │    │ P2: 知识图谱预热 │
                     │  │ (立即见效)      │    │ (需要数据准备)   │
                     │  └─────────────────┘    └─────────────────┘
                     │
                     │  ┌─────────────────┐    ┌─────────────────┐
                     │  │ P3: 模型降级    │    │ P4: Agent协作   │
                     │  │ (提高可用性)    │    │ (架构改动大)    │
                     │  └─────────────────┘    └─────────────────┘
                     │
                     │  ┌─────────────────┐    ┌─────────────────┐
                     │  │ P5: 进度反馈    │    │ P6: 成本感知调度│
                 Low │  │ (用户体验)     │    │ (需要监控基础)  │
                     │  └─────────────────┘    └─────────────────┘
                     │
                     └─────────────────────────────────────────────► Effort
                                             Low                 High
```

### 4.2 改进清单

```yaml
# 高优先级 (P1) - 立即实施
immediate:
  - name: "语义缓存"
    module: "Model Gateway"
    effort: "low"
    impact: "high"
    description: "缓存相似请求的响应，减少API调用"

  - name: "模型降级机制"
    module: "Model Gateway"
    effort: "low"
    impact: "high"
    description: "API失败时自动切换备用模型"

  - name: "进度反馈WebSocket"
    module: "User Interface"
    effort: "low"
    impact: "medium"
    description: "实时推送任务执行进度"

# 中优先级 (P2) - 短期实施
short_term:
  - name: "知识图谱预热"
    module: "Knowledge Layer"
    effort: "medium"
    impact: "high"
    description: "使用种子数据集预填充知识图谱"

  - name: "自适应流水线"
    module: "Agent Execution"
    effort: "medium"
    impact: "medium"
    description: "根据任务复杂度选择性执行流水线模块"

  - name: "统一会话管理"
    module: "User Interface"
    effort: "medium"
    impact: "medium"
    description: "跨平台会话同步"

# 低优先级 (P3) - 中期实施
medium_term:
  - name: "Agent协作协议"
    module: "Agent Execution"
    effort: "high"
    impact: "high"
    description: "支持Agent间实时协作(如辩论)"

  - name: "成本感知调度"
    module: "Orchestration"
    effort: "medium"
    impact: "medium"
    description: "在预算约束下优化模型选择"

  - name: "调度模式学习"
    module: "Orchestration"
    effort: "high"
    impact: "medium"
    description: "学习成功的调度模式"
```

---

## 5. 优化后的目标架构

### 5.1 目标架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         NEXEN v2.0 目标架构                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Layer 0: Unified Interface Layer                                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                      Session Manager (跨平台统一)                            │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│       │              │              │              │              │                │
│  ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐            │
│  │  CLI    │   │ Web UI  │   │  API    │   │  IDE    │   │ Mobile  │ [NEW]      │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘            │
│                                    │                                             │
│  ┌─────────────────────────────────▼─────────────────────────────────────────┐   │
│  │              Skill Composer (动态技能组合) [NEW]                          │   │
│  └─────────────────────────────────┬─────────────────────────────────────────┘   │
│                                    │                                             │
│  ┌─────────────────────────────────▼─────────────────────────────────────────┐   │
│  │              Progress Tracker (实时进度) [NEW]                            │   │
│  └─────────────────────────────────┬─────────────────────────────────────────┘   │
└────────────────────────────────────┼────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 1: Intelligent Orchestration Layer                                            │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                          ┌─────────▼─────────┐                                      │
│                          │ Meta-Coordinator  │                                      │
│                          │   + Pattern DB    │ [NEW: 调度模式学习]                  │
│                          └─────────┬─────────┘                                      │
│                                    │                                                │
│  ┌─────────────────────────────────┼─────────────────────────────────┐             │
│  │                                 │                                 │             │
│  │  ┌─────────────────┐  ┌────────▼────────┐  ┌─────────────────┐  │             │
│  │  │ Cost-Aware      │  │Dynamic Replanner│  │  Result Merger  │  │             │
│  │  │ Scheduler [NEW] │  │     [NEW]       │  │                 │  │             │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │             │
│  └─────────────────────────────────────────────────────────────────┘             │
└────────────────────────────────────┼────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 2: Adaptive Agent Execution Layer                                             │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                                    │                                                │
│  ┌────────────── Adaptive Pipeline (自适应流水线) [NEW] ────────────┐              │
│  │                                                                  │              │
│  │  ┌──────────────────────────────────────────────────────────┐   │              │
│  │  │ Complexity Assessor → Pipeline Selector → Execution      │   │              │
│  │  │                                                          │   │              │
│  │  │ Simple:  Template → Execute                              │   │              │
│  │  │ Medium:  Light Optimize → Memory → Execute               │   │              │
│  │  │ Complex: Full 4-D → Full Memory → Preprocess → Execute   │   │              │
│  │  └──────────────────────────────────────────────────────────┘   │              │
│  └──────────────────────────────────────────────────────────────────┘              │
│                                    │                                                │
│  ┌────────────── Agent Collaboration Layer [NEW] ───────────────┐                  │
│  │                                                              │                  │
│  │  Collaboration Modes:                                        │                  │
│  │  ├─ Critique-During-Reasoning (Logician ↔ Critic)           │                  │
│  │  ├─ Cross-Domain-Enrichment (Explorer → Connector)          │                  │
│  │  └─ Debate-Reasoning (Logician ↔ Critic ↔ Connector)        │                  │
│  │                                                              │                  │
│  └──────────────────────────────────────────────────────────────┘                  │
│                                    │                                                │
│  ┌────────────── Agent Pool (with Self-Evaluation) [NEW] ───────┐                  │
│  │                                                              │                  │
│  │  每个Agent输出后自我评估质量，低于阈值自动重试或请求帮助     │                  │
│  │                                                              │                  │
│  └──────────────────────────────────────────────────────────────┘                  │
└────────────────────────────────────┼────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 3: Resilient Model Gateway Layer                                              │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                                    │                                                │
│  ┌─────────────────────────────────▼─────────────────────────────────────────────┐ │
│  │                        Semantic Cache [NEW]                                   │ │
│  │                     (语义相似度缓存，95%相似命中)                             │ │
│  └─────────────────────────────────┬─────────────────────────────────────────────┘ │
│                                    │                                                │
│  ┌─────────────────────────────────▼─────────────────────────────────────────────┐ │
│  │                     Fallback Router [NEW]                                     │ │
│  │              (智能降级: Opus→Sonnet→GPT-4, o3→o3-mini→Opus)                   │ │
│  └─────────────────────────────────┬─────────────────────────────────────────────┘ │
│                                    │                                                │
│  ┌─────────────────────────────────▼─────────────────────────────────────────────┐ │
│  │                   Performance Monitor [NEW]                                   │ │
│  │           (追踪各模型在各任务上的latency/quality/cost)                        │ │
│  └─────────────────────────────────┬─────────────────────────────────────────────┘ │
│                                    │                                                │
│                          [Model Pool 同前]                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 4: Smart Knowledge Layer                                                      │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                                    │                                                │
│  ┌────────────── Memory System (with Tiering Policy) [NEW] ─────┐                  │
│  │                                                              │                  │
│  │  自动分类: 关键发现→L2, 摘要→L1, 原始数据→L0                  │                  │
│  │  置信度标注: 每条知识带置信度分数                             │                  │
│  │                                                              │                  │
│  └──────────────────────────────────────────────────────────────┘                  │
│                                    │                                                │
│  ┌────────────── Knowledge Graph (with Bootstrap) [NEW] ────────┐                  │
│  │                                                              │                  │
│  │  预热: 10K顶级论文 + CS学者谱系 + 1K热门项目                  │                  │
│  │  增量更新: 实时监听arXiv新论文                                │                  │
│  │  置信度: 每条知识带可靠性评分                                 │                  │
│  │                                                              │                  │
│  └──────────────────────────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────────┐
│ Layer 5: Compliant Data Source Layer                                                │
├────────────────────────────────────┼────────────────────────────────────────────────┤
│                                    │                                                │
│  ┌────────────── Unified Data Abstraction [NEW] ────────────────┐                  │
│  │                                                              │                  │
│  │  统一数据模型: Paper, Person, Tech 跨数据源标准化             │                  │
│  │  智能去重: 基于DOI/标题/作者的跨源去重                        │                  │
│  │                                                              │                  │
│  └──────────────────────────────────────────────────────────────┘                  │
│                                    │                                                │
│  ┌────────────── Adaptive Rate Limiter [NEW] ───────────────────┐                  │
│  │                                                              │                  │
│  │  自适应速率: 被限流后自动退避，恢复后逐渐提速                 │                  │
│  │  合规检查: 只使用API/授权爬虫，拒绝违规获取                   │                  │
│  │                                                              │                  │
│  └──────────────────────────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 改进效果预估

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         改进效果预估                                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

指标                      当前        目标        提升
───────────────────────────────────────────────────────────────
平均任务延迟              45s         25s         -44%
API调用成本/任务          $0.50       $0.30       -40%
缓存命中率                0%          30%         +30%
系统可用性                95%         99.5%       +4.5%
知识图谱初始规模          0           100K节点    +100K
跨平台会话一致性          无          100%        新增
任务进度可见性            无          实时        新增
Agent协作模式             1种(串行)   4种         +3种
```

---

## 总结

本文档完整展示了NEXEN的六层架构设计，并对每个模块进行了深入分析：

**核心问题识别**:
1. 用户交互层缺乏会话统一和进度反馈
2. 编排层缺乏学习能力和动态调整
3. Agent层缺乏协作协议和自我评估
4. 模型网关层缺乏缓存和降级机制
5. 知识层存在冷启动和置信度问题
6. 数据源层需要更好的抽象和合规控制

**改进方向**:
- 短期: 语义缓存、模型降级、进度反馈
- 中期: 知识预热、自适应流水线、会话统一
- 长期: Agent协作、成本感知、模式学习

通过这些改进，NEXEN将成为更可靠、更高效、更智能的AI研究助手系统。

---

*NEXEN System Architecture Overview v1.0*
*Last Updated: 2026-01-16*
