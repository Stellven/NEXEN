# My Library 模块设计文档

> 版本: 1.0.0
> 更新日期: 2025-01-16
> 状态: ✅ 已实现

---

## 一、模块概述

My Library 是 NEXEN 的文档管理模块，提供文档上传、URL导入、文件夹管理和向量化搜索集成功能。

### 1.1 核心功能

| 功能 | 描述 | 状态 |
|------|------|------|
| 文件夹管理 | 创建、编辑、删除文件夹，支持嵌套结构 | ✅ |
| 文档上传 | 支持 PDF, DOCX, MD, TXT 格式 | ✅ |
| URL 导入 | 从网页提取内容并保存 | ✅ |
| 文档解析 | 自动提取文本内容 | ✅ |
| 向量化 | 文档分块并生成 embeddings | ✅ |
| 标签管理 | 为文档添加标签分类 | ✅ |
| 搜索集成 | 与 AI Explore 模块集成 | ✅ |

---

## 二、技术架构

### 2.1 后端架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Library API Router                       │
│                   /api/library/*                             │
├─────────────────────────────────────────────────────────────┤
│  Folder Endpoints    │  Document Endpoints  │  Tag Endpoints │
│  - GET/POST /folders │  - GET /documents    │  - GET /tags   │
│  - PUT/DEL /{id}     │  - POST /upload      │                │
│                      │  - POST /import-url  │                │
│                      │  - PUT/DEL /{id}     │                │
├─────────────────────────────────────────────────────────────┤
│                    Background Tasks                          │
│           ParsingService → EmbeddingService                  │
├─────────────────────────────────────────────────────────────┤
│                    Data Storage                              │
│  SQLite (metadata) │ FileSystem (files) │ Qdrant (vectors)  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 处理流程

```
Upload File/URL
      │
      ▼
┌─────────────┐
│ Save File   │ → /app/uploads/{user_id}/{filename}
└─────────────┘
      │
      ▼
┌─────────────┐
│ Parse Text  │ → ParsingService (PDF/DOCX/MD/URL)
└─────────────┘
      │
      ▼
┌─────────────┐
│ Chunk Text  │ → 500 tokens, 50 overlap
└─────────────┘
      │
      ▼
┌─────────────┐
│ Embed Chunks│ → OpenAI text-embedding-3-small
└─────────────┘
      │
      ▼
┌─────────────┐
│ Store Qdrant│ → Collection: nexen_documents
└─────────────┘
```

---

## 三、API 设计

### 3.1 端点列表

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/folders` | 获取文件夹列表（树形结构） |
| POST | `/folders` | 创建文件夹 |
| PUT | `/folders/{id}` | 更新文件夹 |
| DELETE | `/folders/{id}` | 删除文件夹（含子文件夹和文档） |
| GET | `/documents` | 获取文档列表（支持筛选） |
| POST | `/documents/upload` | 上传文件 |
| POST | `/documents/import-url` | 导入 URL |
| GET | `/documents/{id}` | 获取文档详情 |
| PUT | `/documents/{id}` | 更新文档（名称、标签） |
| DELETE | `/documents/{id}` | 删除文档 |
| POST | `/documents/{id}/move` | 移动到文件夹 |
| GET | `/documents/{id}/status` | 获取解析/向量化状态 |
| GET | `/documents/{id}/content` | 获取文档内容 |
| GET | `/tags` | 获取所有标签 |

### 3.2 请求/响应模型

```python
# 文件夹
class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None

class FolderResponse(BaseModel):
    id: str
    name: str
    parent_id: Optional[str]
    document_count: int
    children: List["FolderResponse"]

# 文档
class DocumentResponse(BaseModel):
    id: str
    title: str
    file_type: str
    file_size: int
    source_url: Optional[str]
    parsing_status: str      # pending, parsing, completed, failed
    embedding_status: str    # pending, processing, completed, failed
    tags: List[str]
    created_at: datetime
    folder_id: Optional[str]

class DocumentUploadResponse(BaseModel):
    id: str
    title: str
    status: str
    message: str

class ImportUrlRequest(BaseModel):
    url: str
    folder_id: Optional[str] = None
    tags: List[str] = []
```

---

## 四、数据库模型

### 4.1 Folder 模型

```python
class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("folders.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, onupdate=datetime.utcnow)

    # Relationships
    documents: Mapped[List["Document"]] = relationship(back_populates="folder")
    children: Mapped[List["Folder"]] = relationship()
```

### 4.2 Document 模型

```python
class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    folder_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("folders.id"))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(1000))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    source_url: Mapped[Optional[str]] = mapped_column(String(2000))
    content: Mapped[Optional[str]] = mapped_column(Text)
    doc_metadata: Mapped[Optional[dict]] = mapped_column(JSON)
    parsing_status: Mapped[str] = mapped_column(String(20), default="pending")
    embedding_status: Mapped[str] = mapped_column(String(20), default="pending")
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)
```

### 4.3 DocumentChunk 模型

```python
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id"))
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_metadata: Mapped[Optional[dict]] = mapped_column(JSON)
    embedding_id: Mapped[Optional[str]] = mapped_column(String(100))
```

---

## 五、服务实现

### 5.1 ParsingService

文件: `web/backend/app/services/parsing_service.py`

支持的文件类型:

| 类型 | 库 | 实现 |
|------|-----|------|
| PDF | PyMuPDF | 逐页提取文本 |
| DOCX | python-docx | 段落拼接 |
| MD/TXT | 内置 | 直接读取 |
| URL | trafilatura | 网页内容提取 |

```python
class ParsingService:
    async def parse_file(self, file_path: str, file_type: str) -> str:
        """根据文件类型调用相应解析方法"""

    async def parse_pdf(self, file_path: str) -> str:
        """使用 PyMuPDF 提取 PDF 文本"""

    async def parse_docx(self, file_path: str) -> str:
        """使用 python-docx 提取 Word 文本"""

    async def parse_url(self, url: str) -> str:
        """使用 trafilatura 提取网页内容"""
```

### 5.2 EmbeddingService

复用 `explore.py` 中的实现:

```python
class EmbeddingService:
    def __init__(self):
        self.client = openai.AsyncOpenAI()
        self.qdrant = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        self.collection_name = "nexen_documents"

    async def embed_document(self, document_id: str, content: str):
        """文档分块并生成 embeddings"""
        chunks = self.chunk_text(content, chunk_size=500, overlap=50)
        embeddings = await self.get_embeddings([c.content for c in chunks])
        self.qdrant.upsert(collection=self.collection_name, points=points)
```

---

## 六、前端实现

### 6.1 页面结构

文件: `web/frontend/app/(main)/library/page.tsx`

```
┌────────────────────────────────────────────────────────────┐
│  Header: 搜索框 | 视图切换 | 上传按钮 | URL导入            │
├────────────┬───────────────────────────────────────────────┤
│            │                                               │
│  Folder    │            Document Grid/List                 │
│  Tree      │                                               │
│            │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│  📁 Root   │  │ Doc │ │ Doc │ │ Doc │ │ Doc │            │
│  📁 Work   │  └─────┘ └─────┘ └─────┘ └─────┘            │
│    📁 Sub  │                                               │
│  📁 Personal│                                              │
│            │                                               │
├────────────┴───────────────────────────────────────────────┤
│              Document Detail Panel (可选)                   │
└────────────────────────────────────────────────────────────┘
```

### 6.2 状态管理

文件: `web/frontend/lib/libraryStore.ts`

```typescript
interface LibraryState {
    // Folders
    folders: Folder[];
    currentFolderId: string | null;

    // Documents
    documents: Document[];
    selectedDocumentId: string | null;

    // UI State
    viewMode: 'grid' | 'list';
    searchQuery: string;
    tagFilter: string[];

    // Upload
    uploadingFiles: UploadingFile[];

    // Actions
    fetchFolders: () => Promise<void>;
    fetchDocuments: (folderId?: string) => Promise<void>;
    uploadFile: (file: File, folderId?: string) => Promise<void>;
    importUrl: (url: string, folderId?: string) => Promise<void>;
    // ...
}
```

### 6.3 组件列表

| 组件 | 描述 |
|------|------|
| `FolderTree` | 文件夹树形导航 |
| `DocumentCard` | 文档卡片（网格视图） |
| `DocumentRow` | 文档行（列表视图） |
| `UploadDropzone` | 拖拽上传区域 |
| `ImportUrlDialog` | URL 导入对话框 |
| `ProcessingStatus` | 解析/向量化状态指示器 |
| `DocumentDetailPanel` | 文档详情面板 |
| `TagInput` | 标签输入组件 |

---

## 七、依赖项

### 7.1 后端依赖

```toml
# pyproject.toml
PyMuPDF>=1.23.0      # PDF 解析
python-docx>=1.1.0   # DOCX 解析
trafilatura>=1.6.0   # URL 内容提取
tiktoken>=0.5.0      # Token 计数
aiofiles>=23.0.0     # 异步文件操作
python-multipart>=0.0.6  # 文件上传
```

### 7.2 前端依赖

```json
{
  "react-dropzone": "^14.2.3"
}
```

---

## 八、测试验证

### 8.1 API 测试

使用 Swagger UI (`http://localhost:8000/docs`):

1. 创建文件夹
2. 上传 PDF 文件
3. 检查解析状态
4. 验证向量化完成
5. 在 Explore 模块搜索

### 8.2 前端测试

1. 访问 `http://localhost:3000/library`
2. 创建文件夹结构
3. 拖拽上传文件
4. 观察处理状态变化
5. 导入 URL 并验证

---

## 九、未来改进

- [ ] 支持更多文件格式 (PPTX, XLSX, EPUB)
- [ ] 批量上传和进度显示
- [ ] 文档预览功能
- [ ] 全文搜索（非向量）
- [ ] 文件夹共享和权限
- [ ] 文档版本历史
- [ ] OCR 图片文字识别
