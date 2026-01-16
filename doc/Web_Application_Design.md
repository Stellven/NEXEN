# NEXEN Web Application 系统设计文档

## 项目概述

NEXEN 是一个多 Agent 研究助手系统，本文档记录 Web 应用的完整架构设计。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  - React 18 + TypeScript                                    │
│  - Tailwind CSS (暗色主题)                                   │
│  - Zustand 状态管理                                          │
│  - 多页面: 登录/注册/设置/主研究界面                            │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  - Python 3.11+                                              │
│  - JWT 认证                                                  │
│  - SQLite 数据库                                             │
│  - LiteLLM 多模型集成                                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     NEXEN Core                               │
│  - 14 个专业化 Agent                                         │
│  - 16+ 科学技能                                              │
│  - 三层外化记忆系统                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Next.js 14 | React 框架 |
| 样式 | Tailwind CSS | 暗色主题 |
| 状态 | Zustand | 轻量级状态管理 |
| 后端 | FastAPI | Python Web 框架 |
| 数据库 | SQLite | 轻量级，适合小规模用户 |
| 认证 | JWT | 无状态令牌认证 |
| LLM | LiteLLM | 多模型路由 (OpenAI/Anthropic/Google) |
| 部署 | Docker Compose | 容器化部署 |

---

## 核心模块

### 1. 用户认证系统

```
app/auth/
├── security.py   # 密码哈希 (SHA256+salt)、JWT 生成/验证
└── deps.py       # FastAPI 依赖注入

app/api/
├── auth.py       # POST /register, /login, /logout, GET /me
└── user_settings.py  # GET/PUT /settings (API Keys 管理)
```

**功能:**
- 用户注册/登录 (邮箱+密码)
- JWT 令牌认证 (24小时有效)
- API Keys 加密存储 (Base64)
- 用户偏好设置

### 2. 数据库模型

```
app/db/
├── database.py   # SQLite 连接配置
└── models.py     # ORM 模型
```

**表结构:**

| 表 | 字段 | 说明 |
|---|------|------|
| users | id, email, password_hash, display_name, is_active | 用户账户 |
| user_settings | user_id, openai_api_key, anthropic_api_key, google_api_key | API 配置 |
| research_sessions | user_id, name, messages, research_results | 研究会话 |

### 3. 科学技能系统

```
nexen/skills/
├── base.py       # Skill/LLMSkill 基类
├── registry.py   # 技能注册表
└── scientific/
    ├── literature.py    # PubMed, OpenAlex, bioRxiv
    ├── databases.py     # UniProt, PDB, ChEMBL, AlphaFold
    ├── analysis.py      # 统计分析, EDA, 可视化
    └── methodology.py   # 假设生成, 批判性思维, 实验设计
```

**技能分类 (16个):**
- 文献检索: PubMed, OpenAlex, bioRxiv, Literature Review
- 科学数据库: UniProt, PDB, ChEMBL, AlphaFold, DrugBank
- 数据分析: Statistical Analysis, EDA, Visualization
- 研究方法: Hypothesis, Critical Thinking, Experiment Design, Scientific Writing

### 4. 前端页面

| 路径 | 组件 | 功能 |
|------|------|------|
| /login | LoginPage | 用户登录 |
| /register | RegisterPage | 用户注册 |
| /settings | SettingsPage | API Keys 配置 |
| / | MainPage | 主研究界面 |

---

## API 端点

### 认证 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册新用户 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户信息 |
| POST | /api/auth/logout | 退出登录 |

### 设置 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/settings | 获取用户设置 |
| PUT | /api/settings | 更新设置 (API Keys) |
| POST | /api/settings/test-key | 测试 API Key 有效性 |

### 技能 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/skills | 列出所有技能 |
| POST | /api/skills/execute | 执行指定技能 |

### 研究 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/research | 发起研究任务 |
| GET | /api/research/{id} | 获取任务状态 |
| DELETE | /api/research/{id} | 取消任务 |

---

## Docker 部署

```yaml
# docker-compose.yml
services:
  backend:
    build: ./web/backend
    ports: ["8000:8000"]
    volumes:
      - ./research_workspace:/app/research_workspace
      - sqlite_data:/app/data
    
  frontend:
    build: ./web/frontend
    ports: ["3000:3000"]
    environment:
      - API_URL=http://backend:8000
```

**启动命令:**
```bash
docker compose build --no-cache
docker compose up -d
```

---

## LLM 模型配置

系统支持三个主要提供商，使用 LiteLLM 格式:

| 提供商 | 模型示例 | 用途 |
|--------|----------|------|
| OpenAI | openai/gpt-4o | 默认模型 |
| Anthropic | anthropic/claude-3-5-sonnet-20241022 | 复杂推理 |
| Google | google/gemini-2.0-pro | 多模态 |

用户可在设置页面配置自己的 API Keys。

---

## 安全设计

1. **密码存储**: SHA256 + 随机盐值
2. **API Keys**: Base64 编码存储 (生产环境建议使用 AES 加密)
3. **认证**: JWT 无状态令牌，24小时过期
4. **CORS**: 配置允许的来源
5. **HTTPS**: 生产环境必须启用

---

## 目录结构

```
NEXEN/
├── nexen/                    # 核心库
│   ├── agents/               # 14 个 Agent
│   ├── skills/               # 科学技能
│   │   └── scientific/       # 16+ 技能实现
│   ├── memory/               # 三层记忆系统
│   └── config/               # 模型和Agent配置
├── web/
│   ├── backend/              # FastAPI 后端
│   │   └── app/
│   │       ├── api/          # API 端点
│   │       ├── auth/         # 认证模块
│   │       ├── db/           # 数据库
│   │       └── services/     # 业务逻辑
│   └── frontend/             # Next.js 前端
│       ├── app/              # 页面
│       ├── components/       # 组件
│       └── lib/              # 工具库
├── docker-compose.yml        # Docker 配置
└── doc/                      # 设计文档
```

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 0.1.0 | 2026-01-16 | 初始 Web 应用 |
| 0.2.0 | 2026-01-16 | 多用户支持、科学技能集成 |
