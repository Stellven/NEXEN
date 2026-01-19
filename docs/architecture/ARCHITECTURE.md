# NEXEN 系统架构设计文档

> 版本: 1.4.0
> 更新日期: 2025-01-18
> 作者: Claude AI Assistant

---

## 一、项目概述

NEXEN (Next-generation EXpert ENgine) 是一个多智能体 AI 研究助手平台，提供 10+ 功能模块，支持异构多模型协作、DAG 工作流编排和外化记忆系统。

### 1.1 核心功能模块

| 模块 | 路由 | 状态 | 描述 |
|------|------|------|------|
| AI Ask | `/ai-ask` | ✅ 已完成 | 多模型聊天、会话管理、流式响应、联网搜索、知识库集成 |
| AI Explore | `/explore` | ✅ 已完成 | 语义搜索、文档预览、标签分类 |
| My Library | `/library` | ✅ 已完成 | 文档上传、URL导入、文件夹管理、向量化 |
| AI Writing | `/ai-writing` | ✅ 已完成 | TipTap 富文本编辑器、AI辅助写作 |
| AI Image | `/ai-image` | 🚧 开发中 | DALL-E 图像生成、Vision 分析 |
| AI Office | `/ai-office` | 🚧 开发中 | DAG 工作流编排、多 Agent 协作、报告生成 |
| AI Simulation | `/ai-simulation` | 🚧 开发中 | 决策矩阵、场景模拟 |
| AI Teams | `/ai-teams` | 🚧 开发中 | 团队管理、任务协作 |
| AI Store | `/ai-store` | 🚧 开发中 | 工具商店、Anthropic Skills 集成 |
| Settings | `/settings` | ✅ 已完成 | API Key 管理、用户偏好设置 |

### 1.2 v1.4.0 核心变更

1. **DAG 工作流系统** - 支持可视化多 Agent 编排
2. **API Key 文件存储** - 从数据库迁移到本地文件系统
3. **多模型提供商扩展** - 新增 DeepSeek、千问、Serper 搜索
4. **Anthropic Skills 集成** - 支持技能市场和自定义技能
5. **使用量统计系统** - API 调用追踪和成本估算

---

## 二、技术架构

### 2.1 技术栈

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│  Next.js 14 (App Router) + TypeScript + Tailwind CSS            │
│  Zustand (状态管理) + Lucide Icons + React Flow (DAG可视化)     │
├─────────────────────────────────────────────────────────────────┤
│                          Backend                                 │
│  FastAPI + SQLAlchemy + Pydantic                                │
│  JWT Authentication + CORS + SSE (Server-Sent Events)           │
├─────────────────────────────────────────────────────────────────┤
│                         Database                                 │
│  SQLite (主数据库) + Qdrant (向量数据库) + JSON (API Keys)      │
├─────────────────────────────────────────────────────────────────┤
│                        AI Services                               │
│  OpenAI + Anthropic + Google AI + DeepSeek + 千问 + Serper     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
NEXEN/
├── CLAUDE.md                      # 项目开发规范
├── docs/                          # 文档目录
│   ├── architecture/              # 架构文档
│   │   └── ARCHITECTURE.md        # 主架构文档 (本文件)
│   ├── modules/                   # 模块设计文档
│   └── versions/                  # 版本存档
│
├── nexen/                         # Python 核心库 (NEW)
│   ├── agents/
│   │   └── generic.py             # 通用 Agent 实现
│   └── skills/
│       ├── anthropic/             # Anthropic 技能定义
│       └── anthropic_loader.py    # 技能加载器
│
├── anthropic-skills/              # Anthropic Skills 资源 (NEW)
│   ├── skills/                    # 技能定义文件
│   ├── spec/                      # 规范文件
│   └── template/                  # 模板文件
│
├── web/
│   ├── backend/                   # FastAPI 后端
│   │   ├── Dockerfile
│   │   ├── api_keys.json          # API Key 存储 (gitignore)
│   │   └── app/
│   │       ├── api/               # API 路由
│   │       │   ├── auth.py        # 认证 API
│   │       │   ├── chat.py        # AI Ask API (增强)
│   │       │   ├── library.py     # My Library API
│   │       │   ├── workflows.py   # 工作流 API (NEW)
│   │       │   ├── usage.py       # 使用量 API (NEW)
│   │       │   ├── reports.py     # 报告 API (NEW)
│   │       │   ├── teams.py       # 团队 API (NEW)
│   │       │   ├── store.py       # 工具商店 API (NEW)
│   │       │   ├── decisions.py   # 决策分析 API (NEW)
│   │       │   └── image.py       # 图像生成 API (NEW)
│   │       ├── db/
│   │       │   ├── models.py      # 数据库模型 (扩展)
│   │       │   └── migrations/    # 数据库迁移 (NEW)
│   │       ├── services/          # 业务服务 (NEW)
│   │       │   ├── api_key_storage.py   # API Key 存储服务
│   │       │   ├── agent_service.py     # Agent 执行服务
│   │       │   ├── search_service.py    # 联网搜索服务
│   │       │   ├── usage_service.py     # 使用量统计服务
│   │       │   ├── task_scheduler.py    # 任务调度器
│   │       │   └── workspace_service.py # 工作区服务
│   │       ├── websocket/         # WebSocket 处理 (增强)
│   │       └── main.py            # 应用入口
│   │
│   └── frontend/                  # Next.js 前端
│       ├── app/
│       │   └── (main)/            # 主应用路由组
│       │       ├── ai-ask/        # AI Ask 模块 (增强)
│       │       ├── ai-image/      # AI Image 模块 (增强)
│       │       ├── ai-office/     # AI Office 模块 (增强)
│       │       │   └── [id]/      # 动态工作流页面 (NEW)
│       │       ├── ai-simulation/ # AI Simulation (增强)
│       │       ├── ai-store/      # AI Store (增强)
│       │       ├── ai-teams/      # AI Teams (增强)
│       │       ├── library/
│       │       │   └── workflows/ # 工作流库 (NEW)
│       │       └── settings/      # 设置页面 (增强)
│       ├── components/
│       │   ├── AgentConfigModal.tsx       # Agent 配置弹窗 (NEW)
│       │   ├── AgentNetworkGraph.tsx      # Agent 网络图 (NEW)
│       │   ├── HierarchicalAgentGraph.tsx # 层级 Agent 图 (NEW)
│       │   ├── reports/                   # 报告组件 (NEW)
│       │   └── workflows/                 # 工作流组件 (NEW)
│       └── lib/
│           ├── api.ts             # API 客户端 (增强)
│           ├── websocket.ts       # WebSocket 客户端 (增强)
│           ├── workflowStore.ts   # 工作流状态 (NEW)
│           ├── reportsStore.ts    # 报告状态 (NEW)
│           ├── aiAskStore.ts      # AI Ask 状态 (NEW)
│           ├── agentGraphStore.ts # Agent 图状态 (NEW)
│           └── modelConfig.ts     # 模型配置 (NEW)
│
└── docker-compose.yml             # Docker 编排
```

---

## 三、数据库模型

### 3.1 模型概览

```python
# ==================== 用户相关 ====================
User                  # 用户账户
UserSettings          # 用户设置 (主题、语言、默认模型)
APIUsageStats         # API 使用量统计 (NEW)

# ==================== AI Ask ====================
Conversation          # 聊天会话
Message               # 聊天消息

# ==================== My Library ====================
Document              # 文档
Folder                # 文件夹
DocumentChunk         # 文档分块 (向量搜索)

# ==================== AI Image ====================
ImageGeneration       # 图像生成记录

# ==================== AI Writing ====================
WritingProject        # 写作项目

# ==================== AI Reports ====================
Report                # 报告

# ==================== AI Decision ====================
DecisionAnalysis      # 决策分析

# ==================== My Teams ====================
Team                  # 团队
TeamMember            # 团队成员
TeamTask              # 团队任务

# ==================== AI Tools ====================
InstalledTool         # 已安装工具

# ==================== Multi-Agent Research ====================
AgentProfile          # Agent 配置档案
AgentExecution        # Agent 执行记录
ResearchTask          # 研究任务 (增强)

# ==================== Workflow System (NEW) ====================
AgentWorkflow         # DAG 工作流模板
WorkflowMission       # 工作流执行任务
```

### 3.2 新增/变更模型详情

#### 3.2.1 UserSettings (变更)

```python
class UserSettings(Base):
    __tablename__ = "user_settings"

    id: str
    user_id: str

    # API Keys - 已迁移到文件存储，此处保留兼容性
    openai_api_key: Optional[str]      # 废弃，使用文件存储
    anthropic_api_key: Optional[str]   # 废弃，使用文件存储
    google_api_key: Optional[str]      # 废弃，使用文件存储
    deepseek_api_key: Optional[str]    # NEW - DeepSeek API
    dashscope_api_key: Optional[str]   # NEW - 阿里云/千问 API
    serper_api_key: Optional[str]      # NEW - Serper 搜索 API

    # 偏好设置
    default_model: str = "openai/gpt-4o"
    theme: str = "dark"
    language: str = "zh"
```

#### 3.2.2 APIUsageStats (新增)

```python
class APIUsageStats(Base):
    """API 使用量统计 - 追踪成本和配额"""
    __tablename__ = "api_usage_stats"

    id: str
    user_id: str

    # 提供商标识
    provider: str          # openai, anthropic, google, deepseek, dashscope
    date: datetime         # 日期 (天粒度)

    # 使用指标
    request_count: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    # 成本估算 (USD)
    estimated_cost: float = 0.0

    # 模型级别细分 (JSON)
    model_usage: dict      # {"gpt-4o": {"requests": 5, "tokens": 1000, "cost": 0.05}}
```

#### 3.2.3 AgentWorkflow (新增)

```python
class AgentWorkflow(Base):
    """DAG 工作流模板"""
    __tablename__ = "agent_workflows"

    id: str
    user_id: Optional[str]        # None 表示系统模板

    # 基本信息
    name: str
    name_cn: Optional[str]
    description: Optional[str]
    icon: str = "Workflow"

    # 模板属性
    is_template: bool = False
    template_category: Optional[str]  # research, analysis

    # DAG 结构 (JSON)
    nodes: list[dict]             # 节点列表
    edges: list[dict]             # 边列表

    # 默认设置
    default_settings: dict = {}

    # 状态
    status: str = "draft"         # draft, active, archived
    version: int = 1
```

#### 3.2.4 WorkflowMission (新增)

```python
class WorkflowMission(Base):
    """工作流执行任务"""
    __tablename__ = "workflow_missions"

    id: str
    workflow_id: str
    user_id: str

    # 领导 Agent
    leader_type: str
    leader_name: str

    # 任务描述
    description: str

    # 执行状态
    status: str = "pending"       # pending, running, completed, failed
    progress_current: int = 0
    progress_total: int = 0

    # 子任务 (JSON)
    sub_tasks: list[dict]

    # 结果
    result: Optional[str]

    # 时间戳
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    # 通知
    notification_email: Optional[str]
```

#### 3.2.5 ResearchTask (增强)

```python
class ResearchTask(Base):
    """研究任务 - 增强版"""
    __tablename__ = "research_tasks"

    # ... 原有字段 ...

    # 任务认领 (NEW)
    created_by: str = "meta_coordinator"
    claimed_at: Optional[datetime]
    claimed_by: Optional[str]     # 认领的 agent_type

    # 文件传递 (NEW)
    input_file: Optional[str]     # 输入文件路径
    output_file: Optional[str]    # 输出文件路径
```

### 3.3 模型关系图 (更新)

```
User
 ├── UserSettings (1:1)
 ├── APIUsageStats (1:N)                    # NEW
 ├── Conversation (1:N) ──► Message (1:N)
 ├── Folder (1:N) ──► Document (1:N) ──► DocumentChunk (1:N)
 ├── ImageGeneration (1:N)
 ├── WritingProject (1:N)
 ├── Report (1:N)
 ├── DecisionAnalysis (1:N)
 ├── Team (1:N) ──► TeamMember (1:N)
 │              └──► TeamTask (1:N)
 ├── InstalledTool (1:N)
 ├── AgentProfile (1:N) ──► AgentExecution (1:N)
 │                     └──► ResearchTask (1:N)
 └── AgentWorkflow (1:N) ──► WorkflowMission (1:N)    # NEW
```

---

## 四、API 设计

### 4.1 认证 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户 |
| POST | `/api/auth/logout` | 退出登录 |

### 4.2 Chat API (AI Ask) - 增强

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/chat/conversations` | 获取会话列表 |
| POST | `/api/chat/conversations` | 创建会话 |
| GET | `/api/chat/conversations/{id}` | 获取会话详情 |
| DELETE | `/api/chat/conversations/{id}` | 删除会话 |
| PUT | `/api/chat/conversations/{id}/title` | 更新标题 |
| POST | `/api/chat/conversations/{id}/messages` | 发送消息 (SSE) |

**消息请求扩展字段 (NEW)**:
```typescript
interface SendMessageRequest {
  content: string;
  model?: string;
  features?: string[];       // ['web_search', 'deep_research']
  knowledge_bases?: string[]; // ['folder:id', 'doc:id']
  skills?: string[];         // Anthropic skill names
}
```

### 4.3 Library API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/library/folders` | 获取文件夹列表 |
| POST | `/api/library/folders` | 创建文件夹 |
| PUT | `/api/library/folders/{id}` | 更新文件夹 |
| DELETE | `/api/library/folders/{id}` | 删除文件夹 |
| GET | `/api/library/documents` | 获取文档列表 |
| POST | `/api/library/documents/upload` | 上传文件 |
| POST | `/api/library/documents/import-url` | 导入 URL |
| GET | `/api/library/documents/{id}` | 获取文档详情 |
| PUT | `/api/library/documents/{id}` | 更新文档 |
| DELETE | `/api/library/documents/{id}` | 删除文档 |
| POST | `/api/library/documents/{id}/move` | 移动到文件夹 |

### 4.4 Workflows API (NEW)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/workflows` | 获取用户工作流列表 |
| GET | `/api/workflows/templates` | 获取系统模板列表 |
| POST | `/api/workflows` | 创建工作流 |
| GET | `/api/workflows/{id}` | 获取工作流详情 |
| PUT | `/api/workflows/{id}` | 更新工作流 |
| DELETE | `/api/workflows/{id}` | 删除工作流 |
| POST | `/api/workflows/{id}/clone` | 克隆工作流 |
| POST | `/api/workflows/{id}/nodes` | 添加节点 |
| PUT | `/api/workflows/{id}/nodes/{node_id}` | 更新节点 |
| DELETE | `/api/workflows/{id}/nodes/{node_id}` | 删除节点 |
| POST | `/api/workflows/{id}/edges` | 添加边 |
| PUT | `/api/workflows/{id}/edges/{edge_id}` | 更新边 |
| DELETE | `/api/workflows/{id}/edges/{edge_id}` | 删除边 |
| GET | `/api/workflows/{id}/missions` | 获取任务列表 |
| POST | `/api/workflows/{id}/missions` | 创建任务 |
| GET | `/api/workflows/{id}/missions/{mission_id}` | 获取任务详情 |
| PUT | `/api/workflows/{id}/missions/{mission_id}` | 更新任务 |
| DELETE | `/api/workflows/{id}/missions/{mission_id}` | 删除任务 |
| POST | `/api/workflows/{id}/missions/{mission_id}/execute` | 执行任务 (SSE) |
| POST | `/api/workflows/{id}/missions/{mission_id}/save-to-library` | 保存结果到库 |

### 4.5 Usage API (NEW)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/usage/stats` | 获取使用量统计 |
| GET | `/api/usage/daily` | 获取每日使用量 |
| GET | `/api/usage/by-provider` | 按提供商统计 |
| GET | `/api/usage/by-model` | 按模型统计 |

### 4.6 Settings API (增强)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/settings` | 获取用户设置 |
| PUT | `/api/settings` | 更新用户设置 |
| PUT | `/api/settings/api-keys` | 更新 API Keys |
| GET | `/api/settings/api-keys/status` | 获取 API Key 状态 |

### 4.7 Skills API (NEW)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/skills` | 获取可用技能列表 |
| GET | `/api/skills/{name}` | 获取技能详情 |
| GET | `/api/skills/{name}/context` | 获取技能上下文 |

---

## 五、工作流系统设计

### 5.1 概述

工作流系统基于 DAG (有向无环图) 设计，支持多 Agent 协作执行复杂研究任务。

### 5.2 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow System                           │
├─────────────────────────────────────────────────────────────┤
│  Template (模板)     → 可复用的工作流定义                    │
│  Workflow (工作流)   → 用户的工作流实例                      │
│  Mission (任务)      → 工作流的一次执行                      │
│  Node (节点)         → DAG 中的 Agent                        │
│  Edge (边)           → Agent 间的数据流                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 预置工作流模板

| 模板名称 | 中文名 | 类别 | Agent 数量 | 描述 |
|----------|--------|------|------------|------|
| Deep Literature Survey | 深度文献调研 | research | 8 | 并行搜索 → 汇聚 → 审查 → 归档 |
| Technical Deep-Dive | 技术深度分析 | analysis | 7 | 探索 → 逻辑+视觉分析 → 构建 → 审查 |
| Person/Institution Profile | 人物/机构画像 | research | 6 | 谱系 → 并行信息收集 → 撰写 |
| Trend Analysis | 趋势分析与预测 | analysis | 7 | 并行收集 → 历史分析 → 推理 → 综合 |
| Multi-Source Intelligence | 多源情报汇总 | research | 10 | 最大并行扇出 → 归档 → 综合审查 |

### 5.4 DAG 节点结构

```typescript
interface WorkflowNode {
  id: string;
  agentType: string;           // meta_coordinator, explorer, etc.
  agentProfileId?: string;     // 自定义 Agent 配置
  position: { x: number, y: number };
  label?: string;
  labelCn?: string;
  config: {
    roleModel?: string;        // 使用的 AI 模型
    fallbackModel?: string;    // 备用模型
    temperature?: number;
    maxTokens?: number;
    persona?: string;          // Agent 人设
    traits?: object;           // 性格特征
    responsibilities?: string[];
    dataSources?: string[];
    customPrompt?: string;
  };
}
```

### 5.5 DAG 边结构

```typescript
interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;            // data_flow, conditional, storage_read, storage_write
  config: {
    dataFormat: string;        // markdown, json, text, auto
    transform: {
      mode: string;            // pass, summarize, extract, filter
      maxTokens?: number;
      extractFields?: string[];
      filterCondition?: string;
    };
    condition?: {
      enabled: boolean;
      field?: string;
      operator?: string;       // gt, lt, eq, contains
      value?: string;
      fallbackNodeId?: string;
    };
    priority: number;
    blocking: boolean;
    timeout: number;
  };
}
```

### 5.6 执行流程

```
1. 用户选择/创建工作流
2. 用户输入研究任务描述
3. 系统创建 Mission
4. 执行引擎按 DAG 拓扑排序执行:
   a. 根节点 (通常是 Meta-Coordinator) 首先执行
   b. 并行执行所有入度为 0 的节点
   c. 节点完成后，检查下游节点是否可执行
   d. 重复直到所有节点完成
5. 最终 Agent (通常是 Scribe) 综合所有结果
6. 结果可保存到 Library
```

### 5.7 SSE 事件格式

```typescript
// 开始事件
{ type: 'start', total: number }

// 步骤开始
{ type: 'step_start', step: number, agent_type: string, agent_name: string, title: string }

// 步骤完成
{ type: 'step_complete', step: number, agent_type: string, output: string, duration_ms: number, tokens_used: number }

// 步骤错误
{ type: 'step_error', step: number, agent_type: string, error: string }

// 完成事件
{ type: 'complete', result: string }
```

---

## 六、API Key 存储架构

### 6.1 设计决策

**从数据库迁移到文件存储的原因**:
1. 安全性：API Key 不应存储在可能被备份/共享的数据库中
2. 简单性：单用户本地部署场景下，文件存储更直接
3. 隔离性：API Key 与业务数据分离

### 6.2 存储位置

```
Docker 环境: /app/data/api_keys.json (volume 持久化)
本地开发:   web/backend/api_keys.json
```

### 6.3 文件格式

```json
{
  "user-uuid-1": {
    "openai": "sk-xxx",
    "anthropic": "sk-ant-xxx",
    "google": "AIza-xxx",
    "deepseek": "sk-xxx",
    "dashscope": "sk-xxx",
    "serper": "xxx"
  },
  "default": {
    "openai": "sk-xxx"
  }
}
```

### 6.4 服务接口

```python
# web/backend/app/services/api_key_storage.py

def get_user_api_keys(user_id: str) -> Dict[str, Optional[str]]:
    """获取用户 API Keys，支持 fallback 到 default"""

def set_user_api_key(user_id: str, provider: str, api_key: Optional[str]) -> bool:
    """设置单个 API Key"""

def set_user_api_keys(user_id: str, keys: Dict[str, Optional[str]]) -> bool:
    """批量设置 API Keys"""

def delete_user_api_keys(user_id: str) -> bool:
    """删除用户所有 API Keys"""

def has_api_key(user_id: str, provider: str) -> bool:
    """检查是否有某提供商的 Key"""
```

### 6.5 安全措施

1. 文件权限设置为 600 (仅所有者读写)
2. 已添加到 `.gitignore`
3. Docker volume 持久化，不随容器重建丢失

---

## 七、前端组件架构

### 7.1 新增组件

| 组件 | 路径 | 功能 |
|------|------|------|
| AgentConfigModal | `components/AgentConfigModal.tsx` | Agent 配置弹窗，设置模型、人设、特征 |
| AgentNetworkGraph | `components/AgentNetworkGraph.tsx` | Agent 网络可视化，展示协作关系 |
| HierarchicalAgentGraph | `components/HierarchicalAgentGraph.tsx` | 层级 Agent 图，展示任务分解 |
| WorkflowEditor | `components/workflows/` | DAG 工作流编辑器 |
| ReportViewer | `components/reports/` | 报告查看器 |

### 7.2 状态管理 (Zustand Stores)

| Store | 路径 | 状态内容 |
|-------|------|----------|
| workflowStore | `lib/workflowStore.ts` | 工作流列表、当前工作流、编辑状态 |
| reportsStore | `lib/reportsStore.ts` | 报告列表、生成状态 |
| aiAskStore | `lib/aiAskStore.ts` | 会话列表、当前会话、消息历史 |
| agentGraphStore | `lib/agentGraphStore.ts` | Agent 图数据、选中节点 |
| modelConfig | `lib/modelConfig.ts` | 模型列表、提供商配置 |

### 7.3 AI Ask 页面增强

```typescript
// 新增功能面板
interface FeaturePanel {
  webSearch: boolean;      // 联网搜索
  deepResearch: boolean;   // 深度研究
  knowledgeBases: string[]; // 选中的知识库
  skills: string[];        // 选中的技能
}
```

---

## 八、Anthropic Skills 集成

### 8.1 概述

集成 Anthropic Skills 市场，允许用户在对话中使用预定义技能增强 AI 能力。

### 8.2 目录结构

```
anthropic-skills/
├── skills/           # 技能定义 (JSON/YAML)
├── spec/             # 技能规范
└── template/         # 技能模板

nexen/skills/
├── anthropic/        # 本地技能定义
└── anthropic_loader.py  # 技能加载器
```

### 8.3 技能加载器

```python
# nexen/skills/anthropic_loader.py

def list_skills() -> List[dict]:
    """列出所有可用技能"""

def get_skill(name: str) -> Optional[dict]:
    """获取技能定义"""

def get_skill_context(name: str) -> Optional[str]:
    """获取技能的系统提示上下文"""
```

### 8.4 技能使用流程

```
1. 用户在 AI Ask 界面选择技能
2. 前端发送消息时包含 skills 参数
3. 后端加载技能上下文
4. 技能上下文注入系统提示
5. AI 根据技能指导生成响应
```

---

## 九、AI 模型提供商

### 9.1 支持的提供商

| 提供商 | 模型示例 | 用途 |
|--------|----------|------|
| OpenAI | gpt-4o, gpt-4o-mini, o1, o3-mini | 通用对话、推理 |
| Anthropic | claude-opus-4-5, claude-sonnet-4, claude-haiku | 长文本、编程 |
| Google | gemini-2.0-flash, gemini-2.0-pro | 多模态、视觉 |
| DeepSeek | deepseek-chat, deepseek-reasoner | 中文、推理 |
| 千问 (DashScope) | qwen-max, qwen-plus | 中文对话 |
| Serper | - | 联网搜索 |

### 9.2 模型路由格式

```
{provider}/{model}

示例:
- openai/gpt-4o
- anthropic/claude-opus-4-5-20251124
- google/gemini-2.0-flash
- deepseek/deepseek-chat
- dashscope/qwen-max
```

---

## 十、实施进度

### 10.1 已完成

- [x] Phase 1: 基础架构 (数据库、认证、Docker)
- [x] Phase 2: AI Ask (多模型聊天)
- [x] Phase 3: AI Explore (语义搜索)
- [x] Phase 4: My Library (文档管理)
- [x] Phase 5: AI Writing (TipTap 编辑器)
- [x] Phase 6: API Key 文件存储迁移
- [x] Phase 7: 多模型提供商扩展 (DeepSeek, 千问, Serper)
- [x] Phase 8: 工作流系统核心 (DAG 模型、API、预置模板)
- [x] Phase 9: Anthropic Skills 集成框架

### 10.2 进行中

- [ ] AI Office (工作流执行 UI、报告生成)
- [ ] AI Image (DALL-E 集成)
- [ ] AI Simulation (决策矩阵)
- [ ] AI Teams (团队协作)
- [ ] AI Store (工具商店 UI)

### 10.3 待完成

- [ ] 使用量统计仪表盘
- [ ] WebSocket 实时协作
- [ ] 向量数据库集成 (Qdrant)
- [ ] 导出功能 (PDF, Word)

---

## 十一、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-16 | 初始架构，AI Ask 基础功能 |
| 1.1.0 | 2025-01-16 | AI Explore 语义搜索 |
| 1.2.0 | 2025-01-16 | My Library 文档管理 |
| 1.3.0 | 2025-01-16 | AI Writing TipTap 编辑器 |
| 1.4.0 | 2025-01-18 | **重大更新**: DAG 工作流系统、API Key 文件存储、多模型扩展、Anthropic Skills、使用量统计 |

---

## 十二、参考资料

- AI Teams Engine: deepdive-engine.up.railway.app
- FastAPI: https://fastapi.tiangolo.com/
- Next.js: https://nextjs.org/docs
- React Flow: https://reactflow.dev/
- Anthropic Skills: https://github.com/anthropics/anthropic-cookbook
- Qdrant: https://qdrant.tech/documentation/
