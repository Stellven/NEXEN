# NEXEN 项目开发规范

> 此文件定义了 NEXEN 项目的特定开发规则，Claude 必须严格遵守

## 项目概述

NEXEN 是一个多 Agent AI 研究助手系统，使用以下技术栈：
- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **后端**: FastAPI + SQLAlchemy + Pydantic
- **数据库**: SQLite
- **容器化**: Docker Compose

## 重要规则

### 1. 数据库保护规则 ⚠️

**绝对禁止**在以下情况下删除或重置数据库：
- Docker 容器重建时
- 代码更新后重启服务时
- 任何常规开发操作中

**只有在以下情况才可以删除数据库**：
- 用户明确要求删除数据库
- 修改了数据库 Schema（models.py 中的表结构变更）
- 添加了不兼容的数据库迁移

**数据库文件位置**：
- Docker: `/app/data/nexen.db`（通过 volume 持久化）
- 本地: `web/backend/data/nexen.db`

### 2. Docker 重建规则

重建 Docker 镜像时：
```bash
# 正确方式 - 只重建不删除数据
docker-compose up -d --build backend
docker-compose up -d --build frontend

# 禁止使用 - 会删除所有数据
docker-compose down -v  # -v 会删除 volumes！
```

### 3. 功能完整性规则

开发任何功能时必须确保：
- 前后端代码同步更新
- API 调用路径正确
- 必要的依赖已添加到 Dockerfile
- 所有必要的环境变量已配置
- 测试功能可正常使用后再提交

### 4. 模型配置

AI 模型列表位于：
- 前端: `web/frontend/app/(main)/ai-ask/page.tsx` 中的 `MODEL_PROVIDERS`
- 后端: `web/backend/app/api/chat.py`

更新模型时需要：
1. 确认模型 API 名称正确（查阅官方文档）
2. 确保后端有相应的 SDK 依赖
3. 前后端模型 ID 格式一致（如 `openai/gpt-5`, `anthropic/claude-opus-4-5-20251124`）

### 5. API Key 存储规则 ⚠️

**API Key 存储位置**：
- 文件: `api_keys.json`（本地）或 `/app/data/api_keys.json`（Docker）
- **绝对禁止**将 API Key 存储到数据库
- **绝对禁止**将 `api_keys.json` 文件提交到 Git

**已在 .gitignore 中配置忽略**：
```
api_keys.json
**/api_keys.json
```

**API Key 相关代码**：
- 存储服务: `web/backend/app/services/api_key_storage.py`
- 设置 API: `web/backend/app/api/user_settings.py`
- 聊天 API: `web/backend/app/api/chat.py`

### 6. 环境配置

**Docker 环境**：
- 前端 API_URL: `http://backend:8000`（docker-compose.yml 中设置）
- 不要在 Docker 构建时包含 `.env.local`

**本地开发环境**：
- 创建 `web/frontend/.env.local` 设置 `API_URL=http://localhost:8000`
- 但不要提交此文件到 Git

## 目录结构

```
NEXEN/
├── CLAUDE.md           # 本文件 - 项目规范
├── docker-compose.yml  # Docker 编排
├── web/
│   ├── backend/        # FastAPI 后端
│   │   ├── Dockerfile
│   │   ├── app/
│   │   │   ├── api/    # API 路由
│   │   │   ├── db/     # 数据库模型
│   │   │   └── auth/   # 认证模块
│   │   └── data/       # SQLite 数据库（本地）
│   └── frontend/       # Next.js 前端
│       ├── Dockerfile
│       └── app/        # 页面和组件
└── docs/               # 设计文档
```

## 常用命令

```bash
# 重建并启动所有服务（保留数据）
docker-compose up -d --build

# 只重建后端
docker-compose up -d --build backend

# 只重建前端
docker-compose up -d --build frontend

# 查看日志
docker logs nexen-backend-1 --tail 50
docker logs nexen-frontend-1 --tail 50

# 进入容器调试
docker exec -it nexen-backend-1 /bin/sh
```
