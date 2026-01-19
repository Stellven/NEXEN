"""
AI Store API - Tool Plugin Marketplace.
"""

from datetime import datetime
from typing import Optional, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, InstalledTool
from app.api.auth import get_current_active_user

router = APIRouter()

# =============================================================================
# Tool Catalog (Hardcoded)
# =============================================================================

TOOL_CATALOG = [
    {
        "tool_id": "pubmed_search",
        "name": "PubMed Search",
        "name_cn": "PubMed 搜索",
        "description": "Search and retrieve biomedical literature from PubMed database",
        "description_cn": "从 PubMed 数据库搜索和检索生物医学文献",
        "category": "databases",
        "version": "1.0.0",
        "author": "NEXEN",
        "icon": "🔬",
        "config_schema": {
            "max_results": {"type": "number", "default": 50, "min": 1, "max": 200},
            "date_range": {"type": "string", "default": "5y", "options": ["1y", "5y", "10y", "all"]}
        },
        "features": ["Literature search", "Abstract extraction", "Citation export"],
        "tags": ["biology", "medicine", "research"]
    },
    {
        "tool_id": "uniprot_query",
        "name": "UniProt Query",
        "name_cn": "UniProt 查询",
        "description": "Query protein sequence and functional information from UniProt",
        "description_cn": "从 UniProt 查询蛋白质序列和功能信息",
        "category": "bioinformatics",
        "version": "1.0.0",
        "author": "NEXEN",
        "icon": "🧬",
        "config_schema": {
            "format": {"type": "string", "default": "json", "options": ["json", "fasta", "xml"]}
        },
        "features": ["Protein search", "Sequence retrieval", "Annotation"],
        "tags": ["protein", "sequence", "biology"]
    },
    {
        "tool_id": "chembl_search",
        "name": "ChEMBL Search",
        "name_cn": "ChEMBL 搜索",
        "description": "Search chemical and bioactivity data from ChEMBL database",
        "description_cn": "从 ChEMBL 数据库搜索化学和生物活性数据",
        "category": "cheminformatics",
        "version": "1.0.0",
        "author": "NEXEN",
        "icon": "⚗️",
        "config_schema": {},
        "features": ["Compound search", "Bioactivity data", "Target information"],
        "tags": ["chemistry", "drug", "compound"]
    },
    {
        "tool_id": "data_visualizer",
        "name": "Data Visualizer",
        "name_cn": "数据可视化",
        "description": "Generate interactive charts and visualizations from data",
        "description_cn": "从数据生成交互式图表和可视化",
        "category": "visualization",
        "version": "1.0.0",
        "author": "NEXEN",
        "icon": "📊",
        "config_schema": {
            "default_chart_type": {"type": "string", "default": "bar", "options": ["bar", "line", "pie", "scatter"]}
        },
        "features": ["Chart generation", "Data analysis", "Export to PNG/SVG"],
        "tags": ["charts", "graphs", "data"]
    },
    {
        "tool_id": "ml_predictor",
        "name": "ML Predictor",
        "name_cn": "机器学习预测器",
        "description": "Machine learning model inference for classification and regression",
        "description_cn": "用于分类和回归的机器学习模型推理",
        "category": "machine_learning",
        "version": "1.0.0",
        "author": "NEXEN",
        "icon": "🤖",
        "config_schema": {
            "model_type": {"type": "string", "default": "classifier", "options": ["classifier", "regressor"]}
        },
        "features": ["Model inference", "Batch prediction", "Feature importance"],
        "tags": ["ml", "prediction", "classification"]
    },
    {
        "tool_id": "pdf_parser",
        "name": "PDF Parser",
        "name_cn": "PDF 解析器",
        "description": "Advanced PDF document parsing and content extraction",
        "description_cn": "高级 PDF 文档解析和内容提取",
        "category": "data_analysis",
        "version": "1.0.0",
        "author": "NEXEN",
        "icon": "📄",
        "config_schema": {
            "extract_images": {"type": "boolean", "default": False},
            "extract_tables": {"type": "boolean", "default": True}
        },
        "features": ["Text extraction", "Table extraction", "Image extraction"],
        "tags": ["document", "parsing", "text"]
    },
    {
        "tool_id": "clinical_trials",
        "name": "Clinical Trials Search",
        "name_cn": "临床试验搜索",
        "description": "Search ClinicalTrials.gov for clinical study information",
        "description_cn": "搜索 ClinicalTrials.gov 获取临床研究信息",
        "category": "clinical",
        "version": "1.0.0",
        "author": "NEXEN",
        "icon": "🏥",
        "config_schema": {
            "study_status": {"type": "string", "default": "all", "options": ["all", "recruiting", "completed"]}
        },
        "features": ["Trial search", "Study details", "Status tracking"],
        "tags": ["clinical", "trials", "medicine"]
    },
    {
        "tool_id": "methodology_advisor",
        "name": "Research Methodology Advisor",
        "name_cn": "研究方法顾问",
        "description": "AI-powered advice on research methodology and study design",
        "description_cn": "AI 驱动的研究方法和研究设计建议",
        "category": "methodology",
        "version": "1.0.0",
        "author": "NEXEN",
        "icon": "📐",
        "config_schema": {},
        "features": ["Study design", "Statistical advice", "Protocol review"],
        "tags": ["methodology", "research", "design"]
    }
]

# =============================================================================
# Pydantic Models
# =============================================================================

class ToolConfigOption(BaseModel):
    type: str
    default: Optional[Any] = None
    min: Optional[int] = None
    max: Optional[int] = None
    options: Optional[list[str]] = None


class CatalogTool(BaseModel):
    tool_id: str
    name: str
    name_cn: str
    description: str
    description_cn: str
    category: str
    version: str
    author: str
    icon: str
    config_schema: dict
    features: list[str]
    tags: list[str]


class CatalogToolWithStatus(CatalogTool):
    """Tool with user-specific installation status."""
    is_installed: bool = False
    is_enabled: bool = False
    user_config: Optional[dict] = None
    usage_count: int = 0
    installed_at: Optional[str] = None


class CatalogListResponse(BaseModel):
    tools: list[CatalogToolWithStatus]
    total: int
    categories: list[str]


class InstalledToolResponse(BaseModel):
    id: str
    tool_id: str
    tool_name: str
    tool_version: str
    is_enabled: bool
    config: dict
    usage_count: int
    last_used_at: Optional[str]
    installed_at: str
    # Merged from catalog
    description: str
    description_cn: str
    category: str
    icon: str
    config_schema: dict


class InstalledToolListResponse(BaseModel):
    tools: list[InstalledToolResponse]
    total: int


class InstallToolRequest(BaseModel):
    tool_id: str
    config: Optional[dict] = None


class UpdateToolConfigRequest(BaseModel):
    config: Optional[dict] = None
    is_enabled: Optional[bool] = None


class ToolCategory(BaseModel):
    id: str
    name: str
    name_cn: str
    icon: str


# =============================================================================
# Catalog Endpoints
# =============================================================================

@router.get("/catalog", response_model=CatalogListResponse)
async def get_catalog(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search tools by name/description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get available tools from the catalog with user's installation status."""
    # Get user's installed tools
    installed = db.query(InstalledTool).filter(
        InstalledTool.user_id == current_user.id
    ).all()
    installed_map = {t.tool_id: t for t in installed}

    # Filter catalog
    tools = TOOL_CATALOG
    if category:
        tools = [t for t in tools if t["category"] == category]
    if search:
        search_lower = search.lower()
        tools = [t for t in tools if
                 search_lower in t["name"].lower() or
                 search_lower in t["description"].lower() or
                 any(search_lower in tag for tag in t["tags"])]

    # Merge with installation status
    result = []
    for tool in tools:
        installed_tool = installed_map.get(tool["tool_id"])
        result.append(CatalogToolWithStatus(
            **tool,
            is_installed=installed_tool is not None,
            is_enabled=installed_tool.is_enabled if installed_tool else False,
            user_config=installed_tool.config if installed_tool else None,
            usage_count=installed_tool.usage_count if installed_tool else 0,
            installed_at=installed_tool.installed_at.isoformat() if installed_tool else None,
        ))

    # Get unique categories
    categories = list(set(t["category"] for t in TOOL_CATALOG))

    return CatalogListResponse(
        tools=result,
        total=len(result),
        categories=categories,
    )


@router.get("/catalog/{tool_id}", response_model=CatalogToolWithStatus)
async def get_catalog_tool(
    tool_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get details of a specific tool from the catalog."""
    tool = next((t for t in TOOL_CATALOG if t["tool_id"] == tool_id), None)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found in catalog")

    installed = db.query(InstalledTool).filter(
        InstalledTool.user_id == current_user.id,
        InstalledTool.tool_id == tool_id,
    ).first()

    return CatalogToolWithStatus(
        **tool,
        is_installed=installed is not None,
        is_enabled=installed.is_enabled if installed else False,
        user_config=installed.config if installed else None,
        usage_count=installed.usage_count if installed else 0,
        installed_at=installed.installed_at.isoformat() if installed else None,
    )


@router.get("/categories", response_model=dict)
async def get_categories():
    """Get all available tool categories."""
    categories = [
        {"id": "databases", "name": "Databases", "name_cn": "数据库", "icon": "🗄️"},
        {"id": "bioinformatics", "name": "Bioinformatics", "name_cn": "生物信息学", "icon": "🧬"},
        {"id": "cheminformatics", "name": "Cheminformatics", "name_cn": "化学信息学", "icon": "⚗️"},
        {"id": "clinical", "name": "Clinical", "name_cn": "临床研究", "icon": "🏥"},
        {"id": "machine_learning", "name": "Machine Learning", "name_cn": "机器学习", "icon": "🤖"},
        {"id": "data_analysis", "name": "Data Analysis", "name_cn": "数据分析", "icon": "📈"},
        {"id": "visualization", "name": "Visualization", "name_cn": "可视化", "icon": "📊"},
        {"id": "methodology", "name": "Methodology", "name_cn": "研究方法", "icon": "📐"},
        {"id": "literature", "name": "Literature", "name_cn": "文献检索", "icon": "📚"},
        {"id": "communication", "name": "Communication", "name_cn": "科学沟通", "icon": "💬"},
    ]
    return {"categories": categories}


# =============================================================================
# Installation Endpoints
# =============================================================================

@router.post("/install", response_model=InstalledToolResponse, status_code=status.HTTP_201_CREATED)
async def install_tool(
    request: InstallToolRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Install a tool from the catalog."""
    # Verify tool exists in catalog
    catalog_tool = next((t for t in TOOL_CATALOG if t["tool_id"] == request.tool_id), None)
    if not catalog_tool:
        raise HTTPException(status_code=404, detail="Tool not found in catalog")

    # Check if already installed
    existing = db.query(InstalledTool).filter(
        InstalledTool.user_id == current_user.id,
        InstalledTool.tool_id == request.tool_id,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Tool already installed")

    # Merge default config with user config
    default_config = {k: v.get("default") for k, v in catalog_tool["config_schema"].items()}
    config = {**default_config, **(request.config or {})}

    # Create installation record
    installed_tool = InstalledTool(
        id=str(uuid4()),
        user_id=current_user.id,
        tool_id=request.tool_id,
        tool_name=catalog_tool["name"],
        tool_version=catalog_tool["version"],
        is_enabled=True,
        config=config,
    )
    db.add(installed_tool)
    db.commit()
    db.refresh(installed_tool)

    return InstalledToolResponse(
        id=installed_tool.id,
        tool_id=installed_tool.tool_id,
        tool_name=installed_tool.tool_name,
        tool_version=installed_tool.tool_version,
        is_enabled=installed_tool.is_enabled,
        config=installed_tool.config or {},
        usage_count=installed_tool.usage_count,
        last_used_at=installed_tool.last_used_at.isoformat() if installed_tool.last_used_at else None,
        installed_at=installed_tool.installed_at.isoformat(),
        description=catalog_tool["description"],
        description_cn=catalog_tool["description_cn"],
        category=catalog_tool["category"],
        icon=catalog_tool["icon"],
        config_schema=catalog_tool["config_schema"],
    )


@router.delete("/installed/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def uninstall_tool(
    tool_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Uninstall a tool."""
    installed = db.query(InstalledTool).filter(
        InstalledTool.user_id == current_user.id,
        InstalledTool.tool_id == tool_id,
    ).first()

    if not installed:
        raise HTTPException(status_code=404, detail="Tool not installed")

    db.delete(installed)
    db.commit()


# =============================================================================
# Installed Tools Management
# =============================================================================

@router.get("/installed", response_model=InstalledToolListResponse)
async def list_installed_tools(
    enabled_only: bool = Query(False, description="Filter to enabled tools only"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List user's installed tools."""
    query = db.query(InstalledTool).filter(InstalledTool.user_id == current_user.id)

    if enabled_only:
        query = query.filter(InstalledTool.is_enabled == True)

    installed = query.order_by(InstalledTool.installed_at.desc()).all()

    # Merge with catalog data
    catalog_map = {t["tool_id"]: t for t in TOOL_CATALOG}

    result = []
    for tool in installed:
        catalog_tool = catalog_map.get(tool.tool_id, {})
        result.append(InstalledToolResponse(
            id=tool.id,
            tool_id=tool.tool_id,
            tool_name=tool.tool_name,
            tool_version=tool.tool_version,
            is_enabled=tool.is_enabled,
            config=tool.config or {},
            usage_count=tool.usage_count,
            last_used_at=tool.last_used_at.isoformat() if tool.last_used_at else None,
            installed_at=tool.installed_at.isoformat(),
            description=catalog_tool.get("description", ""),
            description_cn=catalog_tool.get("description_cn", ""),
            category=catalog_tool.get("category", ""),
            icon=catalog_tool.get("icon", "📦"),
            config_schema=catalog_tool.get("config_schema", {}),
        ))

    return InstalledToolListResponse(tools=result, total=len(result))


@router.get("/installed/{tool_id}", response_model=InstalledToolResponse)
async def get_installed_tool(
    tool_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get details of an installed tool."""
    installed = db.query(InstalledTool).filter(
        InstalledTool.user_id == current_user.id,
        InstalledTool.tool_id == tool_id,
    ).first()

    if not installed:
        raise HTTPException(status_code=404, detail="Tool not installed")

    catalog_tool = next((t for t in TOOL_CATALOG if t["tool_id"] == tool_id), {})

    return InstalledToolResponse(
        id=installed.id,
        tool_id=installed.tool_id,
        tool_name=installed.tool_name,
        tool_version=installed.tool_version,
        is_enabled=installed.is_enabled,
        config=installed.config or {},
        usage_count=installed.usage_count,
        last_used_at=installed.last_used_at.isoformat() if installed.last_used_at else None,
        installed_at=installed.installed_at.isoformat(),
        description=catalog_tool.get("description", ""),
        description_cn=catalog_tool.get("description_cn", ""),
        category=catalog_tool.get("category", ""),
        icon=catalog_tool.get("icon", "📦"),
        config_schema=catalog_tool.get("config_schema", {}),
    )


@router.put("/installed/{tool_id}", response_model=InstalledToolResponse)
async def update_installed_tool(
    tool_id: str,
    request: UpdateToolConfigRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update tool configuration or enable/disable state."""
    installed = db.query(InstalledTool).filter(
        InstalledTool.user_id == current_user.id,
        InstalledTool.tool_id == tool_id,
    ).first()

    if not installed:
        raise HTTPException(status_code=404, detail="Tool not installed")

    if request.config is not None:
        installed.config = {**(installed.config or {}), **request.config}

    if request.is_enabled is not None:
        installed.is_enabled = request.is_enabled

    db.commit()
    db.refresh(installed)

    catalog_tool = next((t for t in TOOL_CATALOG if t["tool_id"] == tool_id), {})

    return InstalledToolResponse(
        id=installed.id,
        tool_id=installed.tool_id,
        tool_name=installed.tool_name,
        tool_version=installed.tool_version,
        is_enabled=installed.is_enabled,
        config=installed.config or {},
        usage_count=installed.usage_count,
        last_used_at=installed.last_used_at.isoformat() if installed.last_used_at else None,
        installed_at=installed.installed_at.isoformat(),
        description=catalog_tool.get("description", ""),
        description_cn=catalog_tool.get("description_cn", ""),
        category=catalog_tool.get("category", ""),
        icon=catalog_tool.get("icon", "📦"),
        config_schema=catalog_tool.get("config_schema", {}),
    )


@router.post("/installed/{tool_id}/toggle", response_model=InstalledToolResponse)
async def toggle_tool(
    tool_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Toggle tool enabled/disabled state."""
    installed = db.query(InstalledTool).filter(
        InstalledTool.user_id == current_user.id,
        InstalledTool.tool_id == tool_id,
    ).first()

    if not installed:
        raise HTTPException(status_code=404, detail="Tool not installed")

    installed.is_enabled = not installed.is_enabled
    db.commit()
    db.refresh(installed)

    catalog_tool = next((t for t in TOOL_CATALOG if t["tool_id"] == tool_id), {})

    return InstalledToolResponse(
        id=installed.id,
        tool_id=installed.tool_id,
        tool_name=installed.tool_name,
        tool_version=installed.tool_version,
        is_enabled=installed.is_enabled,
        config=installed.config or {},
        usage_count=installed.usage_count,
        last_used_at=installed.last_used_at.isoformat() if installed.last_used_at else None,
        installed_at=installed.installed_at.isoformat(),
        description=catalog_tool.get("description", ""),
        description_cn=catalog_tool.get("description_cn", ""),
        category=catalog_tool.get("category", ""),
        icon=catalog_tool.get("icon", "📦"),
        config_schema=catalog_tool.get("config_schema", {}),
    )


@router.post("/installed/{tool_id}/usage")
async def record_tool_usage(
    tool_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Record tool usage (increment usage count)."""
    installed = db.query(InstalledTool).filter(
        InstalledTool.user_id == current_user.id,
        InstalledTool.tool_id == tool_id,
    ).first()

    if not installed:
        raise HTTPException(status_code=404, detail="Tool not installed")

    installed.usage_count += 1
    installed.last_used_at = datetime.utcnow()
    db.commit()

    return {"message": "Usage recorded", "usage_count": installed.usage_count}
