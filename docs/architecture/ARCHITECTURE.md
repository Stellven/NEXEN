# NEXEN 系统架构设计文档

> 版本: 1.2.0
> 更新日期: 2025-01-16
> 作者: Claude AI Assistant

---

## 一、项目概述

NEXEN 是一个多智能体 AI 研究助手平台，参考 AI Teams Engine 设计，提供 10+ 功能模块。

### 1.1 核心功能模块

| 模块 | 路由 | 状态 | 描述 |
|------|------|------|------|
| AI Ask | `/ai-ask` | ✅ 已完成 | 多模型聊天、会话管理、流式响应 |
| AI Explore | `/explore` | ✅ 已完成 | 语义搜索、文档预览、标签分类 |
| My Library | `/library` | ✅ 已完成 | 文档上传、URL导入、文件夹管理 |
| AI Image | `/ai-image` | 📝 UI占位 | DALL-E 图像生成、Vision 分析 |
| AI Writing | `/ai-writing` | 📝 UI占位 | 富文本编辑器、AI辅助写作 |
| AI Research | `/ai-research` | 📝 UI占位 | 多智能体研究系统（重构） |
| AI Reports | `/ai-office` | 📝 UI占位 | 报告生成、图表、导出 |
| AI Decision | `/ai-simulation` | 📝 UI占位 | 决策矩阵、场景模拟 |
| My Teams | `/ai-teams` | 📝 UI占位 | 团队管理、任务协作 |
| AI Tools | `/ai-store` | 📝 UI占位 | 工具商店、安装配置 |

---

## 二、技术架构

### 2.1 技术栈

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Next.js 14 (App Router) + TypeScript + Tailwind CSS        │
│  Zustand (状态管理) + Lucide Icons                           │
├─────────────────────────────────────────────────────────────┤
│                        Backend                               │
│  FastAPI + SQLAlchemy + Pydantic                            │
│  JWT Authentication + CORS                                   │
├─────────────────────────────────────────────────────────────┤
│                       Database                               │
│  SQLite (主数据库) + Qdrant (向量数据库) + Redis (缓存)      │
├─────────────────────────────────────────────────────────────┤
│                      AI Services                             │
│  OpenAI API + Anthropic API + Google AI API                 │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
NEXEN/
├── docs/                          # 文档目录
│   ├── architecture/              # 架构文档
│   │   └── ARCHITECTURE.md        # 主架构文档
│   └── versions/                  # 版本存档
│
├── web/
│   ├── backend/                   # FastAPI 后端
│   │   └── app/
│   │       ├── api/               # API 路由
│   │       │   ├── docs/          # API 设计文档
│   │       │   ├── auth.py
│   │       │   ├── chat.py        # AI Ask API
│   │       │   ├── explore.py     # AI Explore API
│   │       │   ├── library.py     # My Library API
│   │       │   └── ...
│   │       ├── db/
│   │       │   └── models.py      # 数据库模型
│   │       └── main.py            # 应用入口
│   │
│   └── frontend/                  # Next.js 前端
│       └── app/
│           └── (main)/            # 主应用路由组
│               ├── layout.tsx     # 布局 (侧边栏)
│               ├── ai-ask/        # AI Ask 模块
│               │   ├── page.tsx
│               │   └── docs/      # 模块设计文档
│               ├── explore/       # AI Explore 模块
│               ├── library/       # My Library 模块
│               └── ...
│
└── docker-compose.yml             # Docker 编排
```

---

## 三、数据库模型

### 3.1 核心模型 (Phase 1 已完成)

```python
# 用户相关
User              # 用户账户
UserSettings      # 用户设置 (API Keys)

# AI Ask
Conversation      # 聊天会话
Message           # 聊天消息

# My Library
Document          # 文档
Folder            # 文件夹
DocumentChunk     # 文档分块 (向量搜索)

# AI Image
ImageGeneration   # 图像生成记录

# AI Writing
WritingProject    # 写作项目

# AI Reports
Report            # 报告

# AI Decision
DecisionAnalysis  # 决策分析

# My Teams
Team              # 团队
TeamMember        # 团队成员
TeamTask          # 团队任务

# AI Tools
InstalledTool     # 已安装工具
```

### 3.2 模型关系图

```
User
 ├── UserSettings (1:1)
 ├── Conversation (1:N) ──► Message (1:N)
 ├── Folder (1:N) ──► Document (1:N) ──► DocumentChunk (1:N)
 ├── ImageGeneration (1:N)
 ├── WritingProject (1:N)
 ├── Report (1:N)
 ├── DecisionAnalysis (1:N)
 ├── Team (1:N) ──► TeamMember (1:N)
 │              └──► TeamTask (1:N)
 └── InstalledTool (1:N)
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

### 4.2 Chat API (AI Ask)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/chat/conversations` | 获取会话列表 |
| POST | `/api/chat/conversations` | 创建会话 |
| GET | `/api/chat/conversations/{id}` | 获取会话详情 |
| DELETE | `/api/chat/conversations/{id}` | 删除会话 |
| PUT | `/api/chat/conversations/{id}/title` | 更新标题 |
| POST | `/api/chat/conversations/{id}/messages` | 发送消息 (SSE) |

### 4.3 Explore API (AI Explore)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/explore/search` | 语义搜索 |
| GET | `/api/explore/history` | 搜索历史 |
| DELETE | `/api/explore/history/{id}` | 删除历史 |
| GET | `/api/explore/tags` | 获取标签 |
| GET | `/api/explore/preview/{document_id}` | 文档预览 |

### 4.4 Library API (My Library)

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
| GET | `/api/library/documents/{id}/status` | 获取解析状态 |
| GET | `/api/library/documents/{id}/content` | 获取文档内容 |
| GET | `/api/library/tags` | 获取所有标签 |

> 详见: [My Library 设计文档](../modules/MY_LIBRARY.md)

### 4.5 其他 API (待实现)

- `/api/image` - 图像生成
- `/api/writing` - 写作项目
- `/api/reports` - 报告管理
- `/api/decision` - 决策分析
- `/api/teams` - 团队管理
- `/api/tools` - 工具管理

---

## 五、实施进度

### 5.1 已完成

- [x] Phase 1: 数据库模型扩展
- [x] Phase 1: Docker Compose 更新
- [x] Phase 1: 前端布局重构
- [x] Phase 2: AI Ask API 和前端
- [x] Phase 2: AI Explore (语义搜索)
- [x] Phase 3: My Library (文档管理)

### 5.2 待完成

- [ ] Phase 4: AI Writing (富文本编辑)
- [ ] Phase 5: AI Research (重构)
- [ ] Phase 6: AI Image (DALL-E)
- [ ] Phase 7: AI Reports
- [ ] Phase 8: AI Decision
- [ ] Phase 9: My Teams
- [ ] Phase 10: AI Tools

---

## 六、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-16 | 初始架构文档，完成 Phase 1, AI Ask |
| 1.1.0 | 2025-01-16 | 完成 AI Explore 模块 |
| 1.2.0 | 2025-01-16 | 完成 My Library 模块（文档上传、URL导入、文件夹管理、向量化） |

---

## 七、参考资料

- AI Teams Engine: deepdive-engine.up.railway.app
- FastAPI: https://fastapi.tiangolo.com/
- Next.js: https://nextjs.org/docs
- Qdrant: https://qdrant.tech/documentation/
