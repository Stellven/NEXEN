# AI Ask 模块设计文档

> 版本: 1.0.0
> 更新日期: 2025-01-16
> 状态: ✅ 已完成

---

## 一、功能概述

AI Ask 是 NEXEN 的核心聊天模块，提供多模型对话能力。

### 1.1 核心功能

- 多模型切换 (OpenAI, Anthropic, Google)
- 会话管理 (创建、删除、重命名)
- 流式响应 (SSE)
- 消息历史记录

### 1.2 支持的模型

| 提供商 | 模型 | 模型 ID |
|--------|------|---------|
| OpenAI | GPT-4o | `openai/gpt-4o` |
| OpenAI | GPT-4o Mini | `openai/gpt-4o-mini` |
| Anthropic | Claude 3.5 Sonnet | `anthropic/claude-3-5-sonnet-20241022` |
| Anthropic | Claude 3 Opus | `anthropic/claude-3-opus-20240229` |
| Google | Gemini 2 Pro | `google/gemini-2.0-pro` |
| Google | Gemini 2 Flash | `google/gemini-2.0-flash` |

---

## 二、技术实现

### 2.1 数据库模型

```python
class Conversation(Base):
    id: str (UUID)
    user_id: str (FK -> User)
    title: str
    model: str (nullable)
    created_at: datetime
    updated_at: datetime

class Message(Base):
    id: str (UUID)
    conversation_id: str (FK -> Conversation)
    role: str (user/assistant/system)
    content: str
    model: str (nullable)
    tokens_used: int (nullable)
    created_at: datetime
```

### 2.2 API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/chat/conversations` | 获取会话列表 |
| POST | `/api/chat/conversations` | 创建会话 |
| GET | `/api/chat/conversations/{id}` | 获取会话详情和消息 |
| DELETE | `/api/chat/conversations/{id}` | 删除会话 |
| PUT | `/api/chat/conversations/{id}/title` | 更新标题 |
| POST | `/api/chat/conversations/{id}/messages` | 发送消息 (SSE 流式响应) |

### 2.3 流式响应格式

```
data: {"content": "Hello"}
data: {"content": " World"}
data: {"done": true, "message_id": "xxx"}
```

错误响应:
```
data: {"error": "请先在设置中配置相应的 API 密钥"}
```

---

## 三、前端组件

### 3.1 页面结构

```
ai-ask/page.tsx
├── 会话列表侧边栏 (w-64)
│   ├── 新建会话按钮
│   └── 会话列表 (可删除)
│
└── 聊天区域 (flex-1)
    ├── 模型选择器
    ├── 消息列表
    │   ├── 用户消息 (蓝色气泡, 右对齐)
    │   ├── AI消息 (灰色气泡, 左对齐)
    │   └── 流式内容显示
    └── 输入框
```

### 3.2 状态管理

```typescript
// 组件内部状态
const [conversations, setConversations] = useState<Conversation[]>([]);
const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [streamingContent, setStreamingContent] = useState('');
const [selectedModel, setSelectedModel] = useState('openai/gpt-4o');
```

---

## 四、文件清单

| 文件 | 描述 |
|------|------|
| `web/backend/app/api/chat.py` | 聊天 API 路由 |
| `web/backend/app/db/models.py` | Conversation, Message 模型 |
| `web/frontend/app/(main)/ai-ask/page.tsx` | 聊天页面组件 |

---

## 五、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-16 | 初始实现 |
