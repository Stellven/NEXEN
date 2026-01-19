# NEXEN 工作流系统设计文档

> 版本: 1.0.0
> 更新日期: 2025-01-18
> 作者: Claude AI Assistant

---

## 一、概述

### 1.1 目标

构建基于 DAG (有向无环图) 的多 Agent 工作流编排系统，支持：
- 可视化工作流设计
- 预置研究模板
- 实时执行监控
- 结果归档与导出

### 1.2 核心价值

| 能力 | 描述 |
|------|------|
| 并行执行 | 独立 Agent 可同时运行，提高效率 |
| 数据流转 | Agent 间自动传递中间结果 |
| 模板复用 | 一次设计，多次使用 |
| 可视化 | 直观展示执行进度 |

---

## 二、系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Workflow    │  │ Mission     │  │ Result Viewer           │ │
│  │ Editor      │  │ Monitor     │  │ (Markdown/PDF)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                        Backend API                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ /workflows  │  │ /missions   │  │ /execute (SSE)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     Execution Engine                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ DAG         │  │ Task        │  │ Agent Service           │ │
│  │ Scheduler   │  │ Queue       │  │ (Multi-Model)           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                        Database                                  │
│  AgentWorkflow | WorkflowMission | AgentProfile | ResearchTask  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 组件说明

| 组件 | 职责 |
|------|------|
| Workflow Editor | 可视化编辑 DAG，添加/删除节点和边 |
| Mission Monitor | 实时显示执行进度和 Agent 输出 |
| DAG Scheduler | 拓扑排序，确定执行顺序 |
| Task Queue | 管理待执行、执行中、已完成任务 |
| Agent Service | 调用 AI API，执行具体任务 |

---

## 三、数据模型

### 3.1 AgentWorkflow

```python
class AgentWorkflow(Base):
    """DAG 工作流定义"""
    __tablename__ = "agent_workflows"

    id: str                           # UUID
    user_id: Optional[str]            # None = 系统模板

    # 基本信息
    name: str                         # 英文名称
    name_cn: Optional[str]            # 中文名称
    description: Optional[str]        # 描述
    icon: str = "Workflow"            # 图标名称 (Lucide)

    # 模板属性
    is_template: bool = False         # 是否为系统模板
    template_category: Optional[str]  # 分类: research, analysis

    # DAG 结构
    nodes: List[dict]                 # 节点列表 (JSON)
    edges: List[dict]                 # 边列表 (JSON)

    # 配置
    default_settings: dict = {}       # 默认执行参数

    # 状态
    status: str = "draft"             # draft, active, archived
    version: int = 1                  # 版本号

    # 时间戳
    created_at: datetime
    updated_at: datetime
```

### 3.2 节点结构 (Node)

```typescript
interface WorkflowNode {
  // 唯一标识
  id: string;

  // Agent 类型
  agentType: AgentType;  // meta_coordinator, explorer, historian, etc.

  // 可选: 关联自定义 Agent 配置
  agentProfileId?: string;

  // 可视化位置
  position: {
    x: number;
    y: number;
  };

  // 显示标签
  label?: string;      // 英文
  labelCn?: string;    // 中文

  // 节点配置
  config: {
    // 模型设置
    roleModel?: string;      // 主模型 (如 openai/gpt-4o)
    fallbackModel?: string;  // 备用模型
    temperature?: number;    // 0.0 - 2.0
    maxTokens?: number;      // 最大输出长度

    // 人设和特征
    persona?: string;        // Agent 人设描述
    traits?: {
      analytical?: number;   // 分析性 (0-1)
      creative?: number;     // 创造性 (0-1)
      critical?: number;     // 批判性 (0-1)
      thorough?: number;     // 彻底性 (0-1)
    };

    // 职责和数据源
    responsibilities?: string[];
    dataSources?: string[];

    // 自定义提示词
    customPrompt?: string;
  };
}
```

### 3.3 边结构 (Edge)

```typescript
interface WorkflowEdge {
  // 唯一标识
  id: string;

  // 连接关系
  sourceNodeId: string;  // 源节点
  targetNodeId: string;  // 目标节点

  // 边类型
  edgeType: EdgeType;    // data_flow, conditional, storage_read, storage_write

  // 边配置
  config: {
    // 数据格式
    dataFormat: "markdown" | "json" | "text" | "auto";

    // 数据转换
    transform: {
      mode: "pass" | "summarize" | "extract" | "filter";
      maxTokens?: number;        // summarize 模式下的最大长度
      extractFields?: string[];  // extract 模式下的字段列表
      filterCondition?: string;  // filter 模式下的条件
    };

    // 条件执行 (仅 conditional 类型)
    condition?: {
      enabled: boolean;
      field?: string;           // 检查的字段
      operator?: "gt" | "lt" | "eq" | "contains";
      value?: string;
      fallbackNodeId?: string;  // 条件不满足时的目标
    };

    // 执行控制
    priority: number;      // 优先级 (1-10)
    blocking: boolean;     // 是否阻塞 (等待完成)
    timeout: number;       // 超时秒数
  };
}
```

### 3.4 WorkflowMission

```python
class WorkflowMission(Base):
    """工作流执行实例"""
    __tablename__ = "workflow_missions"

    id: str                           # UUID
    workflow_id: str                  # 关联的工作流
    user_id: str                      # 执行用户

    # 领导 Agent
    leader_type: str                  # Agent 类型
    leader_name: str                  # Agent 名称

    # 任务
    description: str                  # 研究任务描述

    # 执行状态
    status: str = "pending"           # pending, running, completed, failed
    progress_current: int = 0         # 当前进度
    progress_total: int = 0           # 总步骤数

    # 子任务
    sub_tasks: List[dict]             # 每个节点的执行记录

    # 结果
    result: Optional[str]             # 最终综合结果

    # 时间
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    # 通知
    notification_email: Optional[str]  # 完成后通知邮箱
```

### 3.5 子任务结构 (SubTask)

```typescript
interface SubTask {
  id: string;
  title: string;
  agent_type: string;
  agent_name: string;
  status: "pending" | "running" | "completed" | "failed";

  // 输入输出
  input?: string;
  output?: string;

  // 执行信息
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  tokens_used?: number;

  // 错误信息
  error?: string;
}
```

---

## 四、Agent 类型

### 4.1 14 种预定义 Agent

| 类型 | 名称 | 默认模型 | 职责 |
|------|------|----------|------|
| `meta_coordinator` | Meta-Coordinator | Claude Opus | 任务分解、决策、综合 |
| `logician` | Logician | OpenAI o3 | 逻辑推理、证明验证 |
| `critic` | Critic | o3-mini | 审查、找漏洞、质量控制 |
| `connector` | Connector | Claude Sonnet | 跨域关联、信息整合 |
| `genealogist` | Genealogist | Claude Opus | 人物谱系、师承追踪 |
| `historian` | Historian | Claude Opus | 技术演进、历史分析 |
| `explorer` | Explorer | Claude Sonnet | 文献检索、信息收集 |
| `social_scout` | Social Scout | Grok 3 | 社交媒体监控 |
| `cn_specialist` | CN Specialist | Qwen/DeepSeek | 中文资源分析 |
| `vision_analyst` | Vision Analyst | Gemini 2 Pro | 图表分析、视觉内容 |
| `builder` | Builder | Claude Sonnet | 代码实现、原型构建 |
| `scribe` | Scribe | Claude Sonnet | 文档撰写、报告生成 |
| `archivist` | Archivist | Claude Sonnet | 归档整理、知识管理 |
| `prompt_engineer` | Prompt Engineer | Gemini 3 Pro | 提示词优化 |

### 4.2 Agent 任务模板

每种 Agent 执行时会收到专门的任务描述：

```python
def _build_agent_task(
    agent_type: str,
    agent_name: str,
    mission_description: str,
    step_index: int,
    total_steps: int,
    previous_results: str,
    task_title: str,
) -> str:
    """构建 Agent 专属任务描述"""
```

示例 - Explorer 任务：
```markdown
# 任务：信息探索与收集

# 研究任务
[mission_description]

# 当前步骤
第 2 步，共 8 步
角色：Explorer (explorer)

# 之前的研究结果
[previous_results]

## 你的职责
作为探索者，请针对研究任务进行深入的信息收集：

1. **文献检索**：搜索相关学术论文、技术报告
2. **关键概念**：识别和解释核心概念和术语
3. **现有研究**：总结当前领域的研究现状
4. **研究空白**：发现潜在的研究空白和机会

请提供全面、深入的信息收集结果，包括具体的发现和来源。
```

---

## 五、预置模板

### 5.1 Deep Literature Survey (深度文献调研)

**用途**: 全面的文献综述，适合学术研究

**DAG 结构**:
```
                    Meta-Coordinator
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
        Explorer      Historian    Genealogist
            │             │             │
            └─────────────┼─────────────┘
                          ▼
                      Connector
                          │
                          ▼
                        Critic
                          │
                          ▼
                        Scribe
                          │
                          ▼
                      Archivist
```

**特点**: 三路并行搜索 → 汇聚整合 → 审查 → 撰写 → 归档

### 5.2 Technical Deep-Dive (技术深度分析)

**用途**: 深入分析特定技术

**DAG 结构**:
```
                    Meta-Coordinator
                          │
                          ▼
                       Explorer
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
          Logician             Vision Analyst
              │                       │
              └───────────┬───────────┘
                          ▼
                        Builder
                          │
                          ▼
                        Critic
                          │
                          ▼
                        Scribe
```

**特点**: 探索 → 逻辑+视觉并行分析 → 构建方案 → 审查

### 5.3 Person/Institution Profile (人物/机构画像)

**用途**: 建立研究者或机构的全面画像

**DAG 结构**:
```
                    Meta-Coordinator
                          │
                          ▼
                     Genealogist
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
        Explorer     Social Scout  CN Specialist
            │             │             │
            └─────────────┼─────────────┘
                          ▼
                        Scribe
```

**特点**: 谱系分析 → 多源并行收集 → 综合撰写

### 5.4 Trend Analysis (趋势分析与预测)

**用途**: 分析趋势并预测未来方向

**DAG 结构**:
```
                    Meta-Coordinator
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
          Explorer               Social Scout
              │                       │
              └───────────┬───────────┘
                          ▼
                       Historian
                          │
                          ▼
                       Logician
                          │
                          ▼
                       Connector
                          │
                          ▼
                        Scribe
```

**特点**: 并行收集 → 历史分析 → 逻辑推理 → 综合连接

### 5.5 Multi-Source Intelligence (多源情报汇总)

**用途**: 从多个来源收集和综合信息

**DAG 结构**:
```
                         Meta-Coordinator
                               │
     ┌───────────┬─────────────┼─────────────┬───────────┐
     ▼           ▼             ▼             ▼           ▼
 Explorer   Social Scout  CN Specialist  Vision    Historian
     │           │             │          Analyst       │
     │           │             │             │           │
     └───────────┴─────────────┼─────────────┴───────────┘
                               ▼
                           Archivist
                               │
                               ▼
                           Connector
                               │
                               ▼
                             Critic
                               │
                               ▼
                             Scribe
```

**特点**: 最大并行扇出 → 归档 → 综合 → 审查 → 撰写

---

## 六、执行引擎

### 6.1 DAG 验证

```python
def validate_dag(nodes: List[dict], edges: List[dict]) -> tuple[bool, str]:
    """
    验证工作流是否为有效 DAG (无环)
    使用 Kahn 算法进行拓扑排序
    """
    # 构建邻接表和入度统计
    # 执行拓扑排序
    # 如果访问节点数 != 总节点数，则存在环
```

### 6.2 执行流程

```python
async def execute_mission(mission_id: str):
    """执行工作流任务"""

    # 1. 加载任务和工作流
    mission = load_mission(mission_id)
    workflow = load_workflow(mission.workflow_id)

    # 2. 初始化上下文
    context = build_initial_context(mission.description)
    accumulated_results = ""

    # 3. 按顺序执行子任务
    for i, task in enumerate(mission.sub_tasks):
        # 发送开始事件
        yield sse_event("step_start", task)

        # 构建 Agent 任务
        agent_task = build_agent_task(
            agent_type=task.agent_type,
            mission_description=mission.description,
            previous_results=accumulated_results,
            step_index=i,
            total_steps=len(mission.sub_tasks),
        )

        # 执行 Agent
        result = await agent_service.execute_agent(
            agent_id=task.agent_type,
            task=agent_task,
            session_id=mission_id,
        )

        # 累积结果
        accumulated_results += f"\n\n## {task.agent_name} 的输出:\n{result}"

        # 发送完成事件
        yield sse_event("step_complete", task, result)

    # 4. 生成最终综合报告
    final_result = await synthesize_results(mission, accumulated_results)

    # 5. 更新任务状态
    mission.status = "completed"
    mission.result = final_result

    yield sse_event("complete", final_result)
```

### 6.3 SSE 事件格式

```typescript
// 开始
{ type: "start", total: 8 }

// 步骤开始
{
  type: "step_start",
  step: 0,
  agent_type: "meta_coordinator",
  agent_name: "Meta-Coordinator",
  title: "任务规划"
}

// 步骤完成
{
  type: "step_complete",
  step: 0,
  agent_type: "meta_coordinator",
  output: "分析结果...",
  duration_ms: 5234,
  tokens_used: 1500
}

// 步骤错误
{
  type: "step_error",
  step: 2,
  agent_type: "explorer",
  error: "API rate limit exceeded"
}

// 完成
{
  type: "complete",
  result: "# 综合研究报告\n\n..."
}
```

---

## 七、API 接口

### 7.1 工作流管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/workflows` | 获取用户工作流 |
| GET | `/api/workflows/templates` | 获取系统模板 |
| POST | `/api/workflows` | 创建工作流 |
| GET | `/api/workflows/{id}` | 获取工作流详情 |
| PUT | `/api/workflows/{id}` | 更新工作流 |
| DELETE | `/api/workflows/{id}` | 删除工作流 |
| POST | `/api/workflows/{id}/clone` | 克隆工作流 |

### 7.2 节点/边管理

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/workflows/{id}/nodes` | 添加节点 |
| PUT | `/api/workflows/{id}/nodes/{node_id}` | 更新节点 |
| DELETE | `/api/workflows/{id}/nodes/{node_id}` | 删除节点 |
| POST | `/api/workflows/{id}/edges` | 添加边 |
| PUT | `/api/workflows/{id}/edges/{edge_id}` | 更新边 |
| DELETE | `/api/workflows/{id}/edges/{edge_id}` | 删除边 |

### 7.3 任务执行

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/workflows/{id}/missions` | 获取任务列表 |
| POST | `/api/workflows/{id}/missions` | 创建任务 |
| GET | `/api/workflows/{id}/missions/{mission_id}` | 获取任务详情 |
| PUT | `/api/workflows/{id}/missions/{mission_id}` | 更新任务 |
| DELETE | `/api/workflows/{id}/missions/{mission_id}` | 删除任务 |
| POST | `/api/workflows/{id}/missions/{mission_id}/execute` | 执行任务 (SSE) |
| POST | `/api/workflows/{id}/missions/{mission_id}/save-to-library` | 保存到库 |

---

## 八、前端组件

### 8.1 WorkflowEditor

基于 React Flow 的可视化编辑器：
- 拖拽添加节点
- 连线创建边
- 节点配置面板
- DAG 验证提示

### 8.2 MissionMonitor

实时执行监控：
- 进度条显示
- 当前执行 Agent 高亮
- 实时输出展示
- 错误处理和重试

### 8.3 ResultViewer

结果查看和导出：
- Markdown 渲染
- 代码高亮
- 一键保存到 Library
- 导出为 PDF/Word

---

## 九、使用流程

```
1. 用户进入 AI Office 页面
2. 选择预置模板或创建自定义工作流
3. (可选) 编辑工作流结构
4. 输入研究任务描述
5. 点击"开始研究"
6. 实时查看执行进度
7. 各 Agent 依次执行，输出实时显示
8. 最终 Agent 综合所有结果
9. 查看完整研究报告
10. (可选) 保存到 Library 或导出
```

---

## 十、扩展计划

### 10.1 短期
- [ ] 工作流编辑器 UI
- [ ] 执行历史记录
- [ ] 结果导出 (PDF)

### 10.2 中期
- [ ] 条件分支执行
- [ ] 循环迭代支持
- [ ] 人工介入节点

### 10.3 长期
- [ ] 分布式执行
- [ ] 自定义 Agent 市场
- [ ] 团队协作工作流

---

## 十一、参考

- React Flow: https://reactflow.dev/
- DAG 调度算法: Kahn's Algorithm
- SSE 规范: https://html.spec.whatwg.org/multipage/server-sent-events.html
