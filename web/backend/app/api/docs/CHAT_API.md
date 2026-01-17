# Chat API 设计文档

> 版本: 1.0.0
> 更新日期: 2025-01-16
> 文件: `web/backend/app/api/chat.py`

---

## 一、概述

Chat API 提供 AI Ask 模块的后端服务，支持会话管理和流式消息响应。

---

## 二、端点详情

### 2.1 获取会话列表

```
GET /api/chat/conversations
```

**请求头:**
```
Authorization: Bearer <token>
```

**查询参数:**
- `skip`: int (默认 0)
- `limit`: int (默认 50)

**响应:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "新对话",
      "model": "openai/gpt-4o",
      "created_at": "2025-01-16T12:00:00Z",
      "updated_at": "2025-01-16T12:00:00Z"
    }
  ],
  "total": 1
}
```

---

### 2.2 创建会话

```
POST /api/chat/conversations
```

**请求体:**
```json
{
  "title": "新对话"  // 可选
}
```

**响应:** `201 Created`
```json
{
  "id": "uuid",
  "title": "新对话",
  "model": null,
  "created_at": "2025-01-16T12:00:00Z",
  "updated_at": "2025-01-16T12:00:00Z"
}
```

---

### 2.3 获取会话详情

```
GET /api/chat/conversations/{conversation_id}
```

**响应:**
```json
{
  "conversation": {
    "id": "uuid",
    "title": "新对话",
    "model": "openai/gpt-4o",
    "created_at": "2025-01-16T12:00:00Z",
    "updated_at": "2025-01-16T12:00:00Z"
  },
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "role": "user",
      "content": "Hello",
      "model": null,
      "created_at": "2025-01-16T12:00:00Z"
    },
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "role": "assistant",
      "content": "Hi there!",
      "model": "openai/gpt-4o",
      "created_at": "2025-01-16T12:00:01Z"
    }
  ]
}
```

---

### 2.4 删除会话

```
DELETE /api/chat/conversations/{conversation_id}
```

**响应:** `204 No Content`

---

### 2.5 更新会话标题

```
PUT /api/chat/conversations/{conversation_id}/title
```

**请求体:**
```json
{
  "title": "新标题"
}
```

**响应:**
```json
{
  "id": "uuid",
  "title": "新标题",
  ...
}
```

---

### 2.6 发送消息 (流式)

```
POST /api/chat/conversations/{conversation_id}/messages
```

**请求体:**
```json
{
  "content": "你好",
  "model": "openai/gpt-4o"  // 可选
}
```

**响应:** `text/event-stream`

```
data: {"content": "你"}
data: {"content": "好"}
data: {"content": "！"}
data: {"done": true, "message_id": "uuid"}
```

**错误响应:**
```
data: {"error": "请先在设置中配置相应的 API 密钥"}
```

---

## 三、错误码

| 状态码 | 描述 |
|--------|------|
| 401 | 未授权 (无效 token) |
| 404 | 会话不存在 |
| 500 | 服务器错误 |

---

## 四、实现细节

### 4.1 流式响应生成

```python
async def generate_response():
    # 1. 获取用户 API 密钥
    settings = db.query(UserSettings).filter(...).first()

    # 2. 根据模型选择 API
    if model.startswith("openai/"):
        # OpenAI streaming
        stream = client.chat.completions.create(stream=True)
        for chunk in stream:
            yield f"data: {json.dumps({'content': chunk})}\n\n"

    elif model.startswith("anthropic/"):
        # Anthropic streaming
        with client.messages.stream() as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'content': text})}\n\n"

    # 3. 保存助手消息
    db.add(Message(role="assistant", content=full_response))
    db.commit()

    yield f"data: {json.dumps({'done': True})}\n\n"
```

---

## 五、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-16 | 初始实现 |
