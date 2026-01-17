# AI Explore 模块设计文档

> 版本: 1.0.0
> 更新日期: 2025-01-16
> 状态: ✅ 已完成

---

## 一、功能概述

AI Explore 是 NEXEN 的语义搜索模块，允许用户在知识库中进行智能检索。

### 1.1 核心功能

- **语义搜索**: 基于 Qdrant 向量数据库的相似度搜索
- **文档预览**: 搜索结果的快速预览
- **标签过滤**: 按标签/分类筛选结果
- **搜索历史**: 记录用户的搜索历史

### 1.2 数据来源

- My Library 中的文档 (PDF, Word, Markdown)
- 导入的 URL 内容
- AI Ask 对话历史 (可选)

---

## 二、技术架构

### 2.1 搜索流程

```
用户输入查询
     │
     ▼
┌─────────────────┐
│  文本向量化     │  OpenAI Embeddings API
│  (Embedding)    │  text-embedding-3-small
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  向量搜索       │  Qdrant Vector DB
│  (Similarity)   │  Cosine Similarity
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  结果排序       │  按相似度 + 时间
│  & 过滤         │  按标签/来源过滤
└────────┬────────┘
         │
         ▼
    返回结果
```

### 2.2 向量数据库设计

**Collection: `documents`**

```json
{
  "id": "chunk_uuid",
  "vector": [0.1, 0.2, ...],  // 1536 维
  "payload": {
    "document_id": "doc_uuid",
    "user_id": "user_uuid",
    "title": "文档标题",
    "content": "文本内容片段",
    "chunk_index": 0,
    "source": "library|url|conversation",
    "tags": ["tag1", "tag2"],
    "created_at": "2025-01-16T12:00:00Z"
  }
}
```

---

## 三、数据库模型

### 3.1 搜索历史 (新增)

```python
class SearchHistory(Base):
    __tablename__ = "search_histories"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    query = Column(String, nullable=False)
    results_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 3.2 关联模型 (已存在)

```python
class DocumentChunk(Base):
    # 文档分块，用于向量搜索
    id: str
    document_id: str
    content: str
    chunk_index: int
    embedding_id: str  # Qdrant 中的向量 ID
    created_at: datetime
```

---

## 四、API 设计

### 4.1 端点列表

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/explore/search` | 语义搜索 |
| GET | `/api/explore/history` | 搜索历史 |
| DELETE | `/api/explore/history/{id}` | 删除历史记录 |
| GET | `/api/explore/tags` | 获取所有标签 |
| GET | `/api/explore/preview/{document_id}` | 文档预览 |

### 4.2 搜索 API 详情

**请求:**
```
POST /api/explore/search
```

```json
{
  "query": "人工智能在医疗领域的应用",
  "limit": 20,
  "offset": 0,
  "filters": {
    "source": ["library", "url"],  // 可选
    "tags": ["AI", "医疗"],        // 可选
    "date_from": "2025-01-01",     // 可选
    "date_to": "2025-01-16"        // 可选
  }
}
```

**响应:**
```json
{
  "results": [
    {
      "id": "chunk_uuid",
      "document_id": "doc_uuid",
      "title": "AI 医疗应用研究报告",
      "snippet": "...人工智能技术在医疗诊断中的应用...",
      "score": 0.95,
      "source": "library",
      "tags": ["AI", "医疗"],
      "created_at": "2025-01-15T10:00:00Z",
      "highlight": {
        "content": "...<<人工智能>>技术在<<医疗>>诊断中..."
      }
    }
  ],
  "total": 42,
  "query_time_ms": 125
}
```

---

## 五、前端组件

### 5.1 页面结构

```
explore/page.tsx
├── 搜索头部
│   ├── 搜索输入框 (带图标)
│   └── 搜索按钮
│
├── 过滤器栏 (可折叠)
│   ├── 来源过滤 (Library/URL/All)
│   ├── 标签选择器
│   └── 日期范围
│
├── 搜索结果列表
│   ├── 结果数量统计
│   └── 结果卡片 (可点击预览)
│       ├── 标题
│       ├── 摘要 (高亮关键词)
│       ├── 相似度分数
│       ├── 来源标签
│       └── 日期
│
└── 文档预览侧边栏 (可关闭)
    ├── 文档标题
    ├── 完整内容
    └── 操作按钮 (打开原文/下载)
```

### 5.2 状态管理

```typescript
interface ExploreState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  filters: SearchFilters;
  selectedResult: SearchResult | null;
  showPreview: boolean;
  history: SearchHistory[];
  tags: string[];
}
```

---

## 六、实现计划

### 6.1 后端任务

1. [ ] 创建 `explore.py` API 路由
2. [ ] 实现 Qdrant 客户端封装
3. [ ] 实现 Embedding 服务
4. [ ] 添加 SearchHistory 模型
5. [ ] 实现搜索端点
6. [ ] 实现文档预览端点

### 6.2 前端任务

1. [ ] 更新 explore/page.tsx 页面
2. [ ] 实现搜索输入组件
3. [ ] 实现过滤器组件
4. [ ] 实现结果列表组件
5. [ ] 实现预览侧边栏组件

---

## 七、依赖项

### 7.1 Python 包

```
qdrant-client>=1.7.0
openai>=1.0.0  # 已安装
```

### 7.2 环境变量

```
QDRANT_URL=http://qdrant:6333
OPENAI_API_KEY=sk-xxx  # 用户设置中配置
```

---

## 八、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-16 | 初始设计文档 |
