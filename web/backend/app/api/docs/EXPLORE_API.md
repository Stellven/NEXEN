# Explore API 设计文档

> 版本: 1.0.0
> 更新日期: 2025-01-16
> 文件: `web/backend/app/api/explore.py` (待创建)

---

## 一、概述

Explore API 提供基于 Qdrant 向量数据库的语义搜索功能。

---

## 二、端点详情

### 2.1 语义搜索

```
POST /api/explore/search
```

**请求头:**
```
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "query": "搜索关键词或问题",
  "limit": 20,
  "offset": 0,
  "filters": {
    "source": ["library", "url"],
    "tags": ["tag1", "tag2"],
    "date_from": "2025-01-01",
    "date_to": "2025-01-16"
  }
}
```

**响应:**
```json
{
  "results": [
    {
      "id": "chunk_id",
      "document_id": "doc_id",
      "title": "文档标题",
      "snippet": "...相关内容片段...",
      "score": 0.95,
      "source": "library",
      "tags": ["tag1"],
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 42,
  "query_time_ms": 125
}
```

---

### 2.2 获取搜索历史

```
GET /api/explore/history
```

**查询参数:**
- `limit`: int (默认 20)

**响应:**
```json
{
  "history": [
    {
      "id": "history_id",
      "query": "之前的搜索",
      "results_count": 15,
      "created_at": "2025-01-16T10:00:00Z"
    }
  ]
}
```

---

### 2.3 删除搜索历史

```
DELETE /api/explore/history/{history_id}
```

**响应:** `204 No Content`

---

### 2.4 获取所有标签

```
GET /api/explore/tags
```

**响应:**
```json
{
  "tags": [
    {"name": "AI", "count": 25},
    {"name": "医疗", "count": 12},
    {"name": "研究", "count": 8}
  ]
}
```

---

### 2.5 文档预览

```
GET /api/explore/preview/{document_id}
```

**响应:**
```json
{
  "id": "doc_id",
  "title": "文档标题",
  "content": "完整文档内容...",
  "source": "library",
  "file_type": "pdf",
  "tags": ["tag1", "tag2"],
  "created_at": "2025-01-15T10:00:00Z",
  "chunks_count": 5
}
```

---

## 三、实现细节

### 3.1 Qdrant 客户端

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

class VectorService:
    def __init__(self):
        self.client = QdrantClient(url=settings.qdrant_url)
        self.collection_name = "documents"

    async def search(
        self,
        query_vector: List[float],
        user_id: str,
        limit: int = 20,
        filters: dict = None
    ) -> List[dict]:
        # 构建过滤条件
        filter_conditions = [
            {"key": "user_id", "match": {"value": user_id}}
        ]
        if filters:
            if filters.get("source"):
                filter_conditions.append(...)
            if filters.get("tags"):
                filter_conditions.append(...)

        # 执行搜索
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit,
            query_filter=Filter(must=filter_conditions)
        )
        return results
```

### 3.2 Embedding 服务

```python
import openai

class EmbeddingService:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "text-embedding-3-small"

    async def get_embedding(self, text: str) -> List[float]:
        response = self.client.embeddings.create(
            model=self.model,
            input=text
        )
        return response.data[0].embedding
```

### 3.3 搜索流程

```python
@router.post("/search")
async def search(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # 1. 获取用户的 OpenAI API Key
    settings = get_user_settings(db, current_user.id)
    if not settings.openai_api_key:
        raise HTTPException(400, "请先配置 OpenAI API Key")

    # 2. 生成查询向量
    embedding_service = EmbeddingService(settings.openai_api_key)
    query_vector = await embedding_service.get_embedding(request.query)

    # 3. 执行向量搜索
    vector_service = VectorService()
    results = await vector_service.search(
        query_vector=query_vector,
        user_id=current_user.id,
        limit=request.limit,
        filters=request.filters
    )

    # 4. 记录搜索历史
    history = SearchHistory(
        user_id=current_user.id,
        query=request.query,
        results_count=len(results)
    )
    db.add(history)
    db.commit()

    # 5. 返回结果
    return SearchResponse(results=results, total=len(results))
```

---

## 四、Qdrant Collection 设置

### 4.1 创建 Collection

```python
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(
        size=1536,  # text-embedding-3-small 维度
        distance=Distance.COSINE
    )
)
```

### 4.2 Payload 索引

```python
client.create_payload_index(
    collection_name="documents",
    field_name="user_id",
    field_schema="keyword"
)
client.create_payload_index(
    collection_name="documents",
    field_name="source",
    field_schema="keyword"
)
client.create_payload_index(
    collection_name="documents",
    field_name="tags",
    field_schema="keyword"
)
```

---

## 五、错误码

| 状态码 | 描述 |
|--------|------|
| 400 | 缺少 OpenAI API Key |
| 401 | 未授权 |
| 404 | 文档不存在 |
| 500 | 搜索服务错误 |

---

## 六、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-16 | 初始设计文档 |
