"""
Agent Workflow API - DAG-based multi-agent orchestration templates.

Endpoints:
- GET /workflows - List user's workflows
- GET /workflows/templates - List system templates
- POST /workflows - Create workflow
- GET /workflows/{id} - Get workflow details
- PUT /workflows/{id} - Update workflow
- DELETE /workflows/{id} - Delete workflow
- POST /workflows/{id}/clone - Clone workflow
"""

import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime
from typing import AsyncGenerator, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.auth import get_current_active_user
from app.db.database import get_db
from app.db.models import AgentWorkflow, Document, User, WorkflowMission

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/workflows", tags=["workflows"])


# =============================================================================
# Pydantic Models
# =============================================================================


class NodePosition(BaseModel):
    x: float
    y: float


class NodeConfig(BaseModel):
    # Model settings
    roleModel: Optional[str] = None
    fallbackModel: Optional[str] = None
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None

    # Persona and traits
    persona: Optional[str] = None
    traits: Optional[dict] = None

    # Responsibilities and data sources
    responsibilities: Optional[List[str]] = None
    dataSources: Optional[List[str]] = None

    # Custom prompt
    customPrompt: Optional[str] = None

    class Config:
        extra = "allow"  # Allow extra fields for forward compatibility


class WorkflowNode(BaseModel):
    id: str
    agentType: str
    agentProfileId: Optional[str] = None
    position: NodePosition
    label: Optional[str] = None
    labelCn: Optional[str] = None
    config: NodeConfig = NodeConfig()

    class Config:
        extra = "allow"


class TransformConfig(BaseModel):
    mode: str = "pass"  # pass, summarize, extract, filter
    maxTokens: Optional[int] = None
    extractFields: Optional[List[str]] = None
    filterCondition: Optional[str] = None


class ConditionConfig(BaseModel):
    enabled: bool = False
    field: Optional[str] = None
    operator: Optional[str] = None  # gt, lt, eq, contains
    value: Optional[str] = None
    fallbackNodeId: Optional[str] = None


class EdgeConfig(BaseModel):
    dataFormat: str = "auto"  # markdown, json, text, auto
    transform: TransformConfig = TransformConfig()
    condition: Optional[ConditionConfig] = None
    priority: int = 5
    blocking: bool = True
    timeout: int = 300


class WorkflowEdge(BaseModel):
    id: str
    sourceNodeId: str
    targetNodeId: str
    edgeType: str = "data_flow"  # data_flow, conditional, storage_read, storage_write
    config: EdgeConfig = EdgeConfig()


class WorkflowCreate(BaseModel):
    name: str
    name_cn: Optional[str] = None
    description: Optional[str] = None
    icon: str = "Workflow"
    nodes: List[WorkflowNode] = []
    edges: List[WorkflowEdge] = []
    default_settings: dict = {}


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    name_cn: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    nodes: Optional[List[WorkflowNode]] = None
    edges: Optional[List[WorkflowEdge]] = None
    default_settings: Optional[dict] = None
    status: Optional[str] = None


# =============================================================================
# 5 Predefined Workflow Templates
# =============================================================================

WORKFLOW_TEMPLATES = [
    {
        "name": "Deep Literature Survey",
        "name_cn": "深度文献调研",
        "description": "Comprehensive literature review with parallel search, convergence, and sequential refinement",
        "icon": "BookOpen",
        "template_category": "research",
        "nodes": [
            {
                "id": "mc",
                "agentType": "meta_coordinator",
                "position": {"x": 400, "y": 50},
                "label": "Meta-Coordinator",
            },
            {
                "id": "explorer",
                "agentType": "explorer",
                "position": {"x": 200, "y": 180},
                "label": "Explorer",
            },
            {
                "id": "historian",
                "agentType": "historian",
                "position": {"x": 400, "y": 180},
                "label": "Historian",
            },
            {
                "id": "genealogist",
                "agentType": "genealogist",
                "position": {"x": 600, "y": 180},
                "label": "Genealogist",
            },
            {
                "id": "connector",
                "agentType": "connector",
                "position": {"x": 400, "y": 310},
                "label": "Connector",
            },
            {
                "id": "critic",
                "agentType": "critic",
                "position": {"x": 400, "y": 440},
                "label": "Critic",
            },
            {
                "id": "scribe",
                "agentType": "scribe",
                "position": {"x": 400, "y": 570},
                "label": "Scribe",
            },
            {
                "id": "archivist",
                "agentType": "archivist",
                "position": {"x": 400, "y": 700},
                "label": "Archivist",
            },
        ],
        "edges": [
            {"id": "e1", "sourceNodeId": "mc", "targetNodeId": "explorer", "edgeType": "data_flow"},
            {
                "id": "e2",
                "sourceNodeId": "mc",
                "targetNodeId": "historian",
                "edgeType": "data_flow",
            },
            {
                "id": "e3",
                "sourceNodeId": "mc",
                "targetNodeId": "genealogist",
                "edgeType": "data_flow",
            },
            {
                "id": "e4",
                "sourceNodeId": "explorer",
                "targetNodeId": "connector",
                "edgeType": "data_flow",
            },
            {
                "id": "e5",
                "sourceNodeId": "historian",
                "targetNodeId": "connector",
                "edgeType": "data_flow",
            },
            {
                "id": "e6",
                "sourceNodeId": "genealogist",
                "targetNodeId": "connector",
                "edgeType": "data_flow",
            },
            {
                "id": "e7",
                "sourceNodeId": "connector",
                "targetNodeId": "critic",
                "edgeType": "data_flow",
            },
            {
                "id": "e8",
                "sourceNodeId": "critic",
                "targetNodeId": "scribe",
                "edgeType": "data_flow",
            },
            {
                "id": "e9",
                "sourceNodeId": "scribe",
                "targetNodeId": "archivist",
                "edgeType": "data_flow",
            },
        ],
    },
    {
        "name": "Technical Deep-Dive",
        "name_cn": "技术深度分析",
        "description": "In-depth analysis of specific technology with parallel analysis, implementation, and verification",
        "icon": "Microscope",
        "template_category": "analysis",
        "nodes": [
            {
                "id": "mc",
                "agentType": "meta_coordinator",
                "position": {"x": 400, "y": 50},
                "label": "Meta-Coordinator",
            },
            {
                "id": "explorer",
                "agentType": "explorer",
                "position": {"x": 400, "y": 180},
                "label": "Explorer",
            },
            {
                "id": "logician",
                "agentType": "logician",
                "position": {"x": 250, "y": 310},
                "label": "Logician",
            },
            {
                "id": "vision",
                "agentType": "vision_analyst",
                "position": {"x": 550, "y": 310},
                "label": "Vision Analyst",
            },
            {
                "id": "builder",
                "agentType": "builder",
                "position": {"x": 400, "y": 440},
                "label": "Builder",
            },
            {
                "id": "critic",
                "agentType": "critic",
                "position": {"x": 400, "y": 570},
                "label": "Critic",
            },
            {
                "id": "scribe",
                "agentType": "scribe",
                "position": {"x": 400, "y": 700},
                "label": "Scribe",
            },
        ],
        "edges": [
            {"id": "e1", "sourceNodeId": "mc", "targetNodeId": "explorer", "edgeType": "data_flow"},
            {
                "id": "e2",
                "sourceNodeId": "explorer",
                "targetNodeId": "logician",
                "edgeType": "data_flow",
            },
            {
                "id": "e3",
                "sourceNodeId": "explorer",
                "targetNodeId": "vision",
                "edgeType": "data_flow",
            },
            {
                "id": "e4",
                "sourceNodeId": "logician",
                "targetNodeId": "builder",
                "edgeType": "data_flow",
            },
            {
                "id": "e5",
                "sourceNodeId": "vision",
                "targetNodeId": "builder",
                "edgeType": "data_flow",
            },
            {
                "id": "e6",
                "sourceNodeId": "builder",
                "targetNodeId": "critic",
                "edgeType": "data_flow",
            },
            {
                "id": "e7",
                "sourceNodeId": "critic",
                "targetNodeId": "scribe",
                "edgeType": "data_flow",
            },
        ],
    },
    {
        "name": "Person/Institution Profile",
        "name_cn": "人物/机构画像",
        "description": "Build comprehensive profile of a researcher or institution with deep genealogy and wide parallel gathering",
        "icon": "User",
        "template_category": "research",
        "nodes": [
            {
                "id": "mc",
                "agentType": "meta_coordinator",
                "position": {"x": 400, "y": 50},
                "label": "Meta-Coordinator",
            },
            {
                "id": "genealogist",
                "agentType": "genealogist",
                "position": {"x": 400, "y": 180},
                "label": "Genealogist",
            },
            {
                "id": "explorer",
                "agentType": "explorer",
                "position": {"x": 200, "y": 310},
                "label": "Explorer",
            },
            {
                "id": "scout",
                "agentType": "social_scout",
                "position": {"x": 400, "y": 310},
                "label": "Social Scout",
            },
            {
                "id": "cn_spec",
                "agentType": "cn_specialist",
                "position": {"x": 600, "y": 310},
                "label": "CN Specialist",
            },
            {
                "id": "scribe",
                "agentType": "scribe",
                "position": {"x": 400, "y": 440},
                "label": "Scribe",
            },
        ],
        "edges": [
            {
                "id": "e1",
                "sourceNodeId": "mc",
                "targetNodeId": "genealogist",
                "edgeType": "data_flow",
            },
            {
                "id": "e2",
                "sourceNodeId": "genealogist",
                "targetNodeId": "explorer",
                "edgeType": "data_flow",
            },
            {
                "id": "e3",
                "sourceNodeId": "genealogist",
                "targetNodeId": "scout",
                "edgeType": "data_flow",
            },
            {
                "id": "e4",
                "sourceNodeId": "genealogist",
                "targetNodeId": "cn_spec",
                "edgeType": "data_flow",
            },
            {
                "id": "e5",
                "sourceNodeId": "explorer",
                "targetNodeId": "scribe",
                "edgeType": "data_flow",
            },
            {
                "id": "e6",
                "sourceNodeId": "scout",
                "targetNodeId": "scribe",
                "edgeType": "data_flow",
            },
            {
                "id": "e7",
                "sourceNodeId": "cn_spec",
                "targetNodeId": "scribe",
                "edgeType": "data_flow",
            },
        ],
    },
    {
        "name": "Trend Analysis",
        "name_cn": "趋势分析与预测",
        "description": "Analyze trends and predict future directions with parallel data gathering and sequential reasoning chain",
        "icon": "TrendingUp",
        "template_category": "analysis",
        "nodes": [
            {
                "id": "mc",
                "agentType": "meta_coordinator",
                "position": {"x": 400, "y": 50},
                "label": "Meta-Coordinator",
            },
            {
                "id": "explorer",
                "agentType": "explorer",
                "position": {"x": 250, "y": 180},
                "label": "Explorer",
            },
            {
                "id": "scout",
                "agentType": "social_scout",
                "position": {"x": 550, "y": 180},
                "label": "Social Scout",
            },
            {
                "id": "historian",
                "agentType": "historian",
                "position": {"x": 400, "y": 310},
                "label": "Historian",
            },
            {
                "id": "logician",
                "agentType": "logician",
                "position": {"x": 400, "y": 440},
                "label": "Logician",
            },
            {
                "id": "connector",
                "agentType": "connector",
                "position": {"x": 400, "y": 570},
                "label": "Connector",
            },
            {
                "id": "scribe",
                "agentType": "scribe",
                "position": {"x": 400, "y": 700},
                "label": "Scribe",
            },
        ],
        "edges": [
            {"id": "e1", "sourceNodeId": "mc", "targetNodeId": "explorer", "edgeType": "data_flow"},
            {"id": "e2", "sourceNodeId": "mc", "targetNodeId": "scout", "edgeType": "data_flow"},
            {
                "id": "e3",
                "sourceNodeId": "explorer",
                "targetNodeId": "historian",
                "edgeType": "data_flow",
            },
            {
                "id": "e4",
                "sourceNodeId": "scout",
                "targetNodeId": "historian",
                "edgeType": "data_flow",
            },
            {
                "id": "e5",
                "sourceNodeId": "historian",
                "targetNodeId": "logician",
                "edgeType": "data_flow",
            },
            {
                "id": "e6",
                "sourceNodeId": "logician",
                "targetNodeId": "connector",
                "edgeType": "data_flow",
            },
            {
                "id": "e7",
                "sourceNodeId": "connector",
                "targetNodeId": "scribe",
                "edgeType": "data_flow",
            },
        ],
    },
    {
        "name": "Multi-Source Intelligence",
        "name_cn": "多源情报汇总",
        "description": "Gather and synthesize information from diverse sources with maximum parallel fan-out",
        "icon": "Globe",
        "template_category": "research",
        "nodes": [
            {
                "id": "mc",
                "agentType": "meta_coordinator",
                "position": {"x": 400, "y": 50},
                "label": "Meta-Coordinator",
            },
            {
                "id": "explorer",
                "agentType": "explorer",
                "position": {"x": 100, "y": 180},
                "label": "Explorer",
            },
            {
                "id": "scout",
                "agentType": "social_scout",
                "position": {"x": 250, "y": 180},
                "label": "Social Scout",
            },
            {
                "id": "cn_spec",
                "agentType": "cn_specialist",
                "position": {"x": 400, "y": 180},
                "label": "CN Specialist",
            },
            {
                "id": "vision",
                "agentType": "vision_analyst",
                "position": {"x": 550, "y": 180},
                "label": "Vision Analyst",
            },
            {
                "id": "historian",
                "agentType": "historian",
                "position": {"x": 700, "y": 180},
                "label": "Historian",
            },
            {
                "id": "archivist",
                "agentType": "archivist",
                "position": {"x": 400, "y": 310},
                "label": "Archivist",
            },
            {
                "id": "connector",
                "agentType": "connector",
                "position": {"x": 400, "y": 440},
                "label": "Connector",
            },
            {
                "id": "critic",
                "agentType": "critic",
                "position": {"x": 400, "y": 570},
                "label": "Critic",
            },
            {
                "id": "scribe",
                "agentType": "scribe",
                "position": {"x": 400, "y": 700},
                "label": "Scribe",
            },
        ],
        "edges": [
            {"id": "e1", "sourceNodeId": "mc", "targetNodeId": "explorer", "edgeType": "data_flow"},
            {"id": "e2", "sourceNodeId": "mc", "targetNodeId": "scout", "edgeType": "data_flow"},
            {"id": "e3", "sourceNodeId": "mc", "targetNodeId": "cn_spec", "edgeType": "data_flow"},
            {"id": "e4", "sourceNodeId": "mc", "targetNodeId": "vision", "edgeType": "data_flow"},
            {
                "id": "e5",
                "sourceNodeId": "mc",
                "targetNodeId": "historian",
                "edgeType": "data_flow",
            },
            {
                "id": "e6",
                "sourceNodeId": "explorer",
                "targetNodeId": "archivist",
                "edgeType": "data_flow",
            },
            {
                "id": "e7",
                "sourceNodeId": "scout",
                "targetNodeId": "archivist",
                "edgeType": "data_flow",
            },
            {
                "id": "e8",
                "sourceNodeId": "cn_spec",
                "targetNodeId": "archivist",
                "edgeType": "data_flow",
            },
            {
                "id": "e9",
                "sourceNodeId": "vision",
                "targetNodeId": "archivist",
                "edgeType": "data_flow",
            },
            {
                "id": "e10",
                "sourceNodeId": "historian",
                "targetNodeId": "archivist",
                "edgeType": "data_flow",
            },
            {
                "id": "e11",
                "sourceNodeId": "archivist",
                "targetNodeId": "connector",
                "edgeType": "data_flow",
            },
            {
                "id": "e12",
                "sourceNodeId": "connector",
                "targetNodeId": "critic",
                "edgeType": "data_flow",
            },
            {
                "id": "e13",
                "sourceNodeId": "critic",
                "targetNodeId": "scribe",
                "edgeType": "data_flow",
            },
        ],
    },
]


def generate_uuid():
    import uuid

    return str(uuid.uuid4())


# =============================================================================
# DAG Validation
# =============================================================================


def validate_dag(nodes: List[dict], edges: List[dict]) -> tuple[bool, str]:
    """
    Validate that the workflow forms a valid DAG (no cycles).
    Returns (is_valid, error_message)
    """
    if not nodes:
        return True, ""

    # Build adjacency list and in-degree count
    node_ids = {n.get("id") for n in nodes}
    graph = defaultdict(list)
    in_degree = {nid: 0 for nid in node_ids}

    for edge in edges:
        source = edge.get("sourceNodeId")
        target = edge.get("targetNodeId")

        if source not in node_ids or target not in node_ids:
            return False, f"Edge references unknown node: {source} -> {target}"

        graph[source].append(target)
        in_degree[target] += 1

    # Kahn's algorithm for topological sort
    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    visited = 0

    while queue:
        node = queue.pop(0)
        visited += 1
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if visited != len(nodes):
        return False, "Workflow contains a cycle - not a valid DAG"

    return True, ""


# =============================================================================
# API Endpoints
# =============================================================================


@router.get("")
async def list_workflows(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """List all workflows for the current user."""
    workflows = (
        db.query(AgentWorkflow)
        .filter(AgentWorkflow.user_id == current_user.id)
        .order_by(AgentWorkflow.updated_at.desc())
        .all()
    )

    return {"workflows": [w.to_dict(include_dag=False) for w in workflows]}


@router.get("/templates")
async def list_templates(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """List all system workflow templates."""
    # Sync templates from code to DB to ensure latest definitions (including models)
    for tpl in WORKFLOW_TEMPLATES:
        existing = (
            db.query(AgentWorkflow)
            .filter(AgentWorkflow.is_template == True, AgentWorkflow.name == tpl["name"])
            .first()
        )

        if existing:
            # Update existing template
            existing.name_cn = tpl["name_cn"]
            existing.description = tpl["description"]
            existing.icon = tpl["icon"]
            existing.template_category = tpl["template_category"]
            existing.nodes = tpl["nodes"]
            existing.edges = tpl["edges"]
        else:
            # Create new template
            workflow = AgentWorkflow(
                id=generate_uuid(),
                user_id=None,  # System template
                name=tpl["name"],
                name_cn=tpl["name_cn"],
                description=tpl["description"],
                icon=tpl["icon"],
                is_template=True,
                template_category=tpl["template_category"],
                nodes=tpl["nodes"],
                edges=tpl["edges"],
                status="active",
            )
            db.add(workflow)

    db.commit()

    # Get all templates
    templates = db.query(AgentWorkflow).filter(AgentWorkflow.is_template == True).all()

    return {"templates": [t.to_dict() for t in templates]}


@router.post("")
async def create_workflow(
    data: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new workflow."""
    # Convert Pydantic models to dicts
    nodes = [n.dict() for n in data.nodes]
    edges = [e.dict() for e in data.edges]

    # Validate DAG
    is_valid, error = validate_dag(nodes, edges)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    workflow = AgentWorkflow(
        id=generate_uuid(),
        user_id=current_user.id,
        name=data.name,
        name_cn=data.name_cn,
        description=data.description,
        icon=data.icon,
        nodes=nodes,
        edges=edges,
        default_settings=data.default_settings,
        status="draft",
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    return workflow.to_dict()


@router.get("/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific workflow."""
    workflow = db.query(AgentWorkflow).filter(AgentWorkflow.id == workflow_id).first()

    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    # Check access - user owns it or it's a template
    if workflow.user_id and workflow.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return workflow.to_dict()


@router.put("/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a workflow."""
    workflow = (
        db.query(AgentWorkflow)
        .filter(AgentWorkflow.id == workflow_id, AgentWorkflow.user_id == current_user.id)
        .first()
    )

    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    # Update fields
    if data.name is not None:
        workflow.name = data.name
    if data.name_cn is not None:
        workflow.name_cn = data.name_cn
    if data.description is not None:
        workflow.description = data.description
    if data.icon is not None:
        workflow.icon = data.icon
    if data.status is not None:
        workflow.status = data.status
    if data.default_settings is not None:
        workflow.default_settings = data.default_settings

    # Update DAG if provided
    if data.nodes is not None or data.edges is not None:
        nodes = [n.dict() for n in data.nodes] if data.nodes else workflow.nodes
        edges = [e.dict() for e in data.edges] if data.edges else workflow.edges

        # Validate DAG
        is_valid, error = validate_dag(nodes, edges)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

        workflow.nodes = nodes
        workflow.edges = edges
        workflow.version += 1

    workflow.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(workflow)

    return workflow.to_dict()


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a workflow."""
    workflow = (
        db.query(AgentWorkflow)
        .filter(AgentWorkflow.id == workflow_id, AgentWorkflow.user_id == current_user.id)
        .first()
    )

    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    db.delete(workflow)
    db.commit()

    return {"message": "Workflow deleted"}


@router.post("/{workflow_id}/clone")
async def clone_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Clone a workflow (template or user's own)."""
    source = db.query(AgentWorkflow).filter(AgentWorkflow.id == workflow_id).first()

    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    # Check access
    if source.user_id and source.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Create clone
    clone = AgentWorkflow(
        id=generate_uuid(),
        user_id=current_user.id,
        name=f"{source.name} (Copy)" if source.user_id else source.name,
        name_cn=f"{source.name_cn} (副本)" if source.name_cn and source.user_id else source.name_cn,
        description=source.description,
        icon=source.icon,
        is_template=False,  # Clones are never templates
        template_category=source.template_category,
        nodes=source.nodes,
        edges=source.edges,
        default_settings=source.default_settings,
        status="draft",
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)

    return clone.to_dict()


# =============================================================================
# Node and Edge Management
# =============================================================================


@router.post("/{workflow_id}/nodes")
async def add_node(
    workflow_id: str,
    node: WorkflowNode,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a node to a workflow."""
    workflow = (
        db.query(AgentWorkflow)
        .filter(AgentWorkflow.id == workflow_id, AgentWorkflow.user_id == current_user.id)
        .first()
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    nodes = list(workflow.nodes or [])
    nodes.append(node.dict())
    workflow.nodes = nodes
    workflow.version += 1
    workflow.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(workflow)

    return workflow.to_dict()


@router.put("/{workflow_id}/nodes/{node_id}")
async def update_node(
    workflow_id: str,
    node_id: str,
    node: WorkflowNode,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a node in a workflow."""
    workflow = (
        db.query(AgentWorkflow)
        .filter(AgentWorkflow.id == workflow_id, AgentWorkflow.user_id == current_user.id)
        .first()
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    nodes = list(workflow.nodes or [])
    updated = False
    for i, n in enumerate(nodes):
        if n.get("id") == node_id:
            nodes[i] = node.dict()
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Node not found")

    workflow.nodes = nodes
    workflow.version += 1
    workflow.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(workflow)

    return workflow.to_dict()


@router.delete("/{workflow_id}/nodes/{node_id}")
async def delete_node(
    workflow_id: str,
    node_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a node and its connected edges from a workflow."""
    workflow = (
        db.query(AgentWorkflow)
        .filter(AgentWorkflow.id == workflow_id, AgentWorkflow.user_id == current_user.id)
        .first()
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Remove node
    nodes = [n for n in (workflow.nodes or []) if n.get("id") != node_id]

    # Remove connected edges
    edges = [
        e
        for e in (workflow.edges or [])
        if e.get("sourceNodeId") != node_id and e.get("targetNodeId") != node_id
    ]

    workflow.nodes = nodes
    workflow.edges = edges
    workflow.version += 1
    workflow.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(workflow)

    return workflow.to_dict()


@router.post("/{workflow_id}/edges")
async def add_edge(
    workflow_id: str,
    edge: WorkflowEdge,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add an edge to a workflow."""
    workflow = (
        db.query(AgentWorkflow)
        .filter(AgentWorkflow.id == workflow_id, AgentWorkflow.user_id == current_user.id)
        .first()
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    edges = list(workflow.edges or [])
    edges.append(edge.dict())

    # Validate DAG
    is_valid, error = validate_dag(workflow.nodes or [], edges)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    workflow.edges = edges
    workflow.version += 1
    workflow.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(workflow)

    return workflow.to_dict()


@router.put("/{workflow_id}/edges/{edge_id}")
async def update_edge(
    workflow_id: str,
    edge_id: str,
    edge: WorkflowEdge,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an edge in a workflow."""
    workflow = (
        db.query(AgentWorkflow)
        .filter(AgentWorkflow.id == workflow_id, AgentWorkflow.user_id == current_user.id)
        .first()
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    edges = list(workflow.edges or [])
    updated = False
    for i, e in enumerate(edges):
        if e.get("id") == edge_id:
            edges[i] = edge.dict()
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Edge not found")

    # Validate DAG
    is_valid, error = validate_dag(workflow.nodes or [], edges)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    workflow.edges = edges
    workflow.version += 1
    workflow.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(workflow)

    return workflow.to_dict()


@router.delete("/{workflow_id}/edges/{edge_id}")
async def delete_edge(
    workflow_id: str,
    edge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an edge from a workflow."""
    workflow = (
        db.query(AgentWorkflow)
        .filter(AgentWorkflow.id == workflow_id, AgentWorkflow.user_id == current_user.id)
        .first()
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    edges = [e for e in (workflow.edges or []) if e.get("id") != edge_id]

    workflow.edges = edges
    workflow.version += 1
    workflow.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(workflow)

    return workflow.to_dict()


# =============================================================================
# Mission Pydantic Models
# =============================================================================


class SubTaskCreate(BaseModel):
    id: str
    title: str
    agent_type: str
    agent_name: str
    status: str = "pending"
    input: Optional[str] = None
    output: Optional[str] = None


class MissionCreate(BaseModel):
    leader_type: str
    leader_name: str
    description: str
    email: Optional[str] = None
    sub_tasks: List[SubTaskCreate] = []


class MissionUpdate(BaseModel):
    status: Optional[str] = None
    progress_current: Optional[int] = None
    progress_total: Optional[int] = None
    sub_tasks: Optional[List[dict]] = None
    result: Optional[str] = None


class SaveToLibraryRequest(BaseModel):
    folder_id: Optional[str] = None
    tags: Optional[List[str]] = None


# =============================================================================
# Mission API Endpoints
# =============================================================================


@router.get("/{workflow_id}/missions")
async def list_missions(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all missions for a workflow."""
    # Verify workflow access
    workflow = db.query(AgentWorkflow).filter(AgentWorkflow.id == workflow_id).first()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Allow access to templates or user's own workflows
    if workflow.user_id and workflow.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    missions = (
        db.query(WorkflowMission)
        .filter(
            WorkflowMission.workflow_id == workflow_id, WorkflowMission.user_id == current_user.id
        )
        .order_by(WorkflowMission.created_at.desc())
        .all()
    )

    return {"missions": [m.to_dict() for m in missions]}


@router.post("/{workflow_id}/missions")
async def create_mission(
    workflow_id: str,
    data: MissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new mission for a workflow."""
    # Verify workflow access
    workflow = db.query(AgentWorkflow).filter(AgentWorkflow.id == workflow_id).first()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow.user_id and workflow.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Create mission
    mission = WorkflowMission(
        id=str(uuid4()),
        workflow_id=workflow_id,
        user_id=current_user.id,
        leader_type=data.leader_type,
        leader_name=data.leader_name,
        description=data.description,
        status="running",
        progress_current=0,
        progress_total=len(data.sub_tasks),
        sub_tasks=[st.dict() for st in data.sub_tasks],
        notification_email=data.email,
        started_at=datetime.utcnow(),
    )

    db.add(mission)
    db.commit()
    db.refresh(mission)

    return mission.to_dict()


@router.get("/{workflow_id}/missions/{mission_id}")
async def get_mission(
    workflow_id: str,
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific mission."""
    mission = (
        db.query(WorkflowMission)
        .filter(
            WorkflowMission.id == mission_id,
            WorkflowMission.workflow_id == workflow_id,
            WorkflowMission.user_id == current_user.id,
        )
        .first()
    )

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    return mission.to_dict()


@router.put("/{workflow_id}/missions/{mission_id}")
async def update_mission(
    workflow_id: str,
    mission_id: str,
    data: MissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a mission (status, progress, sub_tasks, result)."""
    mission = (
        db.query(WorkflowMission)
        .filter(
            WorkflowMission.id == mission_id,
            WorkflowMission.workflow_id == workflow_id,
            WorkflowMission.user_id == current_user.id,
        )
        .first()
    )

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    if data.status is not None:
        mission.status = data.status
        if data.status == "completed":
            mission.completed_at = datetime.utcnow()

    if data.progress_current is not None:
        mission.progress_current = data.progress_current

    if data.progress_total is not None:
        mission.progress_total = data.progress_total

    if data.sub_tasks is not None:
        mission.sub_tasks = data.sub_tasks

    if data.result is not None:
        mission.result = data.result

    mission.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(mission)

    return mission.to_dict()


@router.delete("/{workflow_id}/missions/{mission_id}")
async def delete_mission(
    workflow_id: str,
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a mission."""
    mission = (
        db.query(WorkflowMission)
        .filter(
            WorkflowMission.id == mission_id,
            WorkflowMission.workflow_id == workflow_id,
            WorkflowMission.user_id == current_user.id,
        )
        .first()
    )

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    db.delete(mission)
    db.commit()

    return {"message": "Mission deleted"}


@router.post("/{workflow_id}/missions/{mission_id}/save-to-library")
async def save_mission_to_library(
    workflow_id: str,
    mission_id: str,
    data: SaveToLibraryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Save mission result to Library as a document."""
    mission = (
        db.query(WorkflowMission)
        .filter(
            WorkflowMission.id == mission_id,
            WorkflowMission.workflow_id == workflow_id,
            WorkflowMission.user_id == current_user.id,
        )
        .first()
    )

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    if mission.status != "completed":
        raise HTTPException(status_code=400, detail="Mission is not completed")

    # Generate document content from mission
    content = generate_mission_document(mission)

    # Create document in library
    doc_name = (
        f"Mission: {mission.description[:50]}..."
        if len(mission.description) > 50
        else f"Mission: {mission.description}"
    )

    document = Document(
        id=str(uuid4()),
        user_id=current_user.id,
        folder_id=data.folder_id,
        name=doc_name,
        file_type="md",
        file_size=len(content.encode("utf-8")),
        parsed_content=content,
        parse_status="completed",
        embedding_status="pending",
        tags=data.tags or ["mission-result", "workflow"],
        doc_metadata={
            "source": "workflow_mission",
            "mission_id": mission.id,
            "workflow_id": workflow_id,
            "leader_type": mission.leader_type,
        },
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return {"document_id": document.id, "message": "Mission saved to library successfully"}


def generate_mission_document(mission: WorkflowMission) -> str:
    """Generate markdown document from mission data."""
    lines = [
        f"# {mission.description}",
        "",
        f"**执行时间**: {mission.created_at.strftime('%Y-%m-%d %H:%M:%S') if mission.created_at else 'N/A'}",
        f"**领导 Agent**: {mission.leader_name} ({mission.leader_type})",
        f"**状态**: {'已完成' if mission.status == 'completed' else mission.status}",
        f"**进度**: {mission.progress_current}/{mission.progress_total}",
        "",
        "---",
        "",
        "## 执行步骤",
        "",
    ]

    if mission.sub_tasks:
        for i, task in enumerate(mission.sub_tasks, 1):
            status_emoji = (
                "✅"
                if task.get("status") == "completed"
                else "❌"
                if task.get("status") == "failed"
                else "⏳"
            )
            lines.append(f"### {i}. {task.get('title', 'Unknown Task')} {status_emoji}")
            lines.append("")
            lines.append(
                f"**Agent**: {task.get('agent_name', 'Unknown')} (`{task.get('agent_type', 'unknown')}`)"
            )

            if task.get("duration_ms"):
                lines.append(f"**耗时**: {task['duration_ms'] / 1000:.1f}s")

            if task.get("input"):
                lines.append("")
                lines.append("**输入**:")
                lines.append("```")
                lines.append(task["input"])
                lines.append("```")

            if task.get("output"):
                lines.append("")
                lines.append("**输出**:")
                lines.append("```")
                lines.append(task["output"])
                lines.append("```")

            lines.append("")

    if mission.result:
        lines.extend(
            [
                "---",
                "",
                "## 最终结果",
                "",
                mission.result,
            ]
        )

    return "\n".join(lines)


# =============================================================================
# Agent Task Builder
# =============================================================================


def _build_agent_task(
    agent_type: str,
    agent_name: str,
    mission_description: str,
    step_index: int,
    total_steps: int,
    previous_results: str,
    task_title: str,
) -> str:
    """
    Build a comprehensive task description for each agent type.
    This ensures each agent gets clear, specific instructions.
    """
    # Base context that all agents receive
    base_context = f"""# 研究任务
{mission_description}

# 当前步骤
第 {step_index + 1} 步，共 {total_steps} 步
角色：{agent_name} ({agent_type})
"""

    # Add previous results if available
    if previous_results:
        base_context += f"""
# 之前的研究结果
{previous_results}
"""

    # Agent-specific task descriptions
    agent_tasks = {
        "meta_coordinator": f"""
# 任务：任务分析与规划

{base_context}

## 你的职责
作为元协调者，请分析上述研究任务，制定执行计划：

1. **任务分解**：将主任务分解为具体的子任务
2. **关键问题**：识别需要解决的核心问题
3. **研究方向**：确定主要的研究方向
4. **预期产出**：描述期望的研究成果

请提供详细的分析和规划，为后续 Agent 提供清晰的指导。
""",
        "explorer": f"""
# 任务：信息探索与收集

{base_context}

## 你的职责
作为探索者，请针对研究任务进行深入的信息收集：

1. **文献检索**：搜索相关学术论文、技术报告
2. **关键概念**：识别和解释核心概念和术语
3. **现有研究**：总结当前领域的研究现状
4. **研究空白**：发现潜在的研究空白和机会

请提供全面、深入的信息收集结果，包括具体的发现和来源。
""",
        "historian": f"""
# 任务：历史研究与时间线分析

{base_context}

## 你的职责
作为历史学家，请分析该领域的发展历史：

1. **发展历程**：梳理关键技术/概念的演进过程
2. **里程碑事件**：标注重要的突破和转折点
3. **趋势分析**：识别长期发展趋势
4. **历史教训**：从历史中提取有价值的洞察

请构建清晰的时间线，展示该领域的发展脉络。
""",
        "genealogist": f"""
# 任务：谱系研究与关系网络分析

{base_context}

## 你的职责
作为谱系学家，请分析相关实体之间的关系：

1. **关系网络**：绘制关键人物/机构/技术之间的关系
2. **影响追溯**：追踪思想和技术的传承脉络
3. **核心节点**：识别网络中的关键节点
4. **隐藏联系**：发现不易察觉的关联

请构建详细的关系图谱，揭示内在联系。
""",
        "connector": f"""
# 任务：知识关联与整合

{base_context}

## 你的职责
作为连接者，请整合之前的研究结果：

1. **信息整合**：汇总各来源的关键信息
2. **关联发现**：找出不同信息之间的联系
3. **模式识别**：识别数据中的规律和模式
4. **矛盾处理**：处理和解决信息冲突

请提供结构化的整合分析，形成连贯的知识体系。
""",
        "logician": f"""
# 任务：逻辑分析与推理

{base_context}

## 你的职责
作为逻辑学家，请对收集的信息进行严格的逻辑分析：

1. **论证评估**：评估现有论点的逻辑有效性
2. **推理链条**：构建清晰的推理链
3. **假设检验**：识别和验证隐含假设
4. **结论推导**：基于证据得出合理结论

请提供严谨的逻辑分析，确保结论有据可依。
""",
        "critic": f"""
# 任务：批判性审查与质量评估

{base_context}

## 你的职责
作为批评者，请对之前的研究进行批判性审查：

1. **方法论评估**：评估研究方法的合理性
2. **证据质量**：评估数据和证据的可靠性
3. **逻辑缺陷**：识别推理中的潜在问题
4. **改进建议**：提出具体的改进方向

请提供建设性的批评，帮助提高研究质量。
""",
        "scribe": f"""
# 任务：报告撰写与文档生成

{base_context}

## 你的职责
作为记录者，请根据所有研究结果撰写完整报告：

1. **结构组织**：设计清晰的报告结构
2. **内容撰写**：撰写各部分的详细内容
3. **要点提炼**：提取关键发现和结论
4. **格式优化**：确保报告格式专业、易读

请生成一份完整、专业的研究报告，包含所有重要发现。
""",
        "archivist": f"""
# 任务：归档整理与知识管理

{base_context}

## 你的职责
作为档案管理员，请整理和归档研究成果：

1. **分类整理**：对研究资料进行系统分类
2. **索引创建**：建立便于检索的索引
3. **元数据标注**：添加必要的元数据信息
4. **存储建议**：提供长期保存建议

请确保研究成果得到妥善保存和组织。
""",
        "social_scout": f"""
# 任务：社交情报收集

{base_context}

## 你的职责
作为社交侦察员，请收集社交媒体和公开渠道的相关信息：

1. **舆情分析**：分析公众对该主题的讨论和观点
2. **意见领袖**：识别该领域的关键意见领袖
3. **趋势追踪**：追踪社交媒体上的相关趋势
4. **情感分析**：评估整体舆论倾向

请提供全面的社交情报分析。
""",
        "cn_specialist": f"""
# 任务：中文资料分析

{base_context}

## 你的职责
作为中文专家，请分析中文来源的相关资料：

1. **中文文献**：搜索和分析中文学术资源
2. **政策文件**：解读相关政策和法规
3. **新闻报道**：整理重要新闻报道
4. **本土视角**：提供中国特色的分析视角

请提供详细的中文资料分析。
""",
        "vision_analyst": f"""
# 任务：视觉内容分析

{base_context}

## 你的职责
作为视觉分析师，请分析相关的视觉材料：

1. **图像分析**：分析相关图片和图表
2. **数据可视化**：解读数据可视化内容
3. **视觉趋势**：识别视觉呈现的趋势
4. **设计洞察**：提供视觉设计建议

请提供全面的视觉内容分析。
""",
        "builder": f"""
# 任务：方案构建与原型设计

{base_context}

## 你的职责
作为构建者，请基于研究结果设计解决方案：

1. **方案设计**：提出具体的实施方案
2. **架构设计**：设计系统或流程架构
3. **原型概念**：描述原型的关键特性
4. **实施路径**：规划实施步骤

请提供可操作的方案设计。
""",
        "prompt_engineer": f"""
# 任务：提示词工程

{base_context}

## 你的职责
作为提示词工程师，请优化相关的AI提示词：

1. **提示词设计**：设计高效的提示词模板
2. **优化建议**：提供提示词优化建议
3. **最佳实践**：分享提示词工程最佳实践
4. **测试验证**：设计提示词测试方案

请提供专业的提示词工程建议。
""",
    }

    # Return agent-specific task or default task
    if agent_type in agent_tasks:
        return agent_tasks[agent_type]
    else:
        # Generic task for unknown agent types
        return f"""
# 任务：{task_title}

{base_context}

## 你的职责
作为 {agent_name}，请完成以下工作：

1. 分析上述研究任务
2. 根据你的专业能力提供见解
3. 生成有价值的输出
4. 为后续步骤提供支持

请提供详细、有价值的分析结果。
"""


# =============================================================================
# Mission Execution API (SSE)
# =============================================================================


@router.post("/{workflow_id}/missions/{mission_id}/execute")
async def execute_mission(
    workflow_id: str,
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Execute a workflow mission using real AI agents.
    Returns Server-Sent Events (SSE) for real-time progress updates.
    """
    logger.info(
        f"Starting mission execution: workflow={workflow_id}, mission={mission_id}, user={current_user.id}"
    )

    # Verify mission exists
    mission = (
        db.query(WorkflowMission)
        .filter(
            WorkflowMission.id == mission_id,
            WorkflowMission.workflow_id == workflow_id,
            WorkflowMission.user_id == current_user.id,
        )
        .first()
    )

    if not mission:
        logger.warning(f"Mission not found: {mission_id}")
        raise HTTPException(status_code=404, detail="Mission not found")

    # Get workflow for context
    workflow = db.query(AgentWorkflow).filter(AgentWorkflow.id == workflow_id).first()

    async def generate_events() -> AsyncGenerator[str, None]:
        """Generate SSE events for mission execution."""
        from app.services.agent_service import AgentService

        logger.info(f"Executing mission: {mission.description[:100]}...")

        agent_service = AgentService()
        sub_tasks = mission.sub_tasks or []
        total_steps = len(sub_tasks)
        logger.info(f"Total steps: {total_steps}")

        # Update mission status to running
        mission.status = "running"
        mission.started_at = datetime.utcnow()
        db.commit()

        yield f"data: {json.dumps({'type': 'start', 'total': total_steps})}\n\n"

        # Build initial context with mission details
        mission_context = f"""# 研究任务
{mission.description}

# 工作流程
共有 {total_steps} 个步骤，每个步骤由专门的 Agent 负责。
"""
        accumulated_results = ""

        for i, task in enumerate(sub_tasks):
            # Add pacing delay to mitigate rate limits
            if i > 0:
                await asyncio.sleep(2)

            task_id = task.get("id", f"task_{i}")
            agent_type = task.get("agent_type", "explorer")
            agent_name = task.get("agent_name", agent_type)
            task_title = task.get("title", f"Step {i + 1}")

            # Send running status
            yield f"data: {json.dumps({'type': 'step_start', 'step': i, 'agent_type': agent_type, 'agent_name': agent_name, 'title': task_title})}\n\n"

            try:
                start_time = datetime.utcnow()
                logger.info(f"Step {i + 1}/{total_steps}: Executing {agent_type} ({agent_name})")

                # Build comprehensive task description based on agent type
                agent_task = _build_agent_task(
                    agent_type=agent_type,
                    agent_name=agent_name,
                    mission_description=mission.description,
                    step_index=i,
                    total_steps=total_steps,
                    previous_results=accumulated_results,
                    task_title=task_title,
                )

                logger.debug(f"Agent task length: {len(agent_task)} chars")

                # Get node config for this agent
                # Node structure varies: check both root level and data property
                logger.info(f"Looking for config for agent_type: {agent_type}")

                # DEBUG: Dump first 3 nodes to understand structure (only on first iteration)
                if i == 0 and workflow.nodes:
                    for idx, n in enumerate(workflow.nodes[:3]):
                        import json as json_mod

                        logger.info(f"DEBUG Node {idx}: {json_mod.dumps(n, default=str)[:500]}")

                # Find the node for this agent type - check both root and data.agentType
                node_config = {}
                for n in workflow.nodes or []:
                    node_agent_type = n.get("agentType") or n.get("data", {}).get("agentType")
                    if node_agent_type == agent_type:
                        # Config can be at root, in data, or in data.config
                        node_config = n.get("config") or n.get("data", {}).get("config") or {}
                        break

                # Use node config roleModel if available, otherwise fall back to user's default_model
                model_override = node_config.get("roleModel")
                if not model_override:
                    # Get user's default model from settings
                    from app.db.models import UserSettings

                    user_settings = (
                        db.query(UserSettings)
                        .filter(UserSettings.user_id == current_user.id)
                        .first()
                    )
                    if user_settings and user_settings.default_model:
                        model_override = user_settings.default_model
                        logger.info(f"Using user's default_model as fallback: {model_override}")
                logger.info(f"Found model_override: {model_override}")

                # Execute agent with full context
                result = await agent_service.execute_agent(
                    agent_id=agent_type,
                    task=agent_task,
                    session_id=mission_id,
                    context=mission_context
                    if i == 0
                    else f"{mission_context}\n\n# 之前的研究结果\n{accumulated_results}",
                    model_override=model_override,
                )

                end_time = datetime.utcnow()
                duration_ms = int((end_time - start_time).total_seconds() * 1000)

                logger.info(
                    f"Step {i + 1}/{total_steps}: Completed in {duration_ms}ms, {result.tokens_used} tokens, output length: {len(result.result)} chars"
                )

                # Update task in sub_tasks
                task["status"] = "completed"
                task["input"] = agent_task[:1000]  # Truncate for storage
                task["output"] = result.result[:2000]  # Truncate for storage
                task["started_at"] = start_time.isoformat()
                task["completed_at"] = end_time.isoformat()
                task["duration_ms"] = duration_ms

                # Add to accumulated results for next agent
                accumulated_results += (
                    f"\n\n## {agent_name} ({agent_type}) 的输出:\n{result.result}"
                )

                # Send completion event
                yield f"data: {json.dumps({'type': 'step_complete', 'step': i, 'agent_type': agent_type, 'output': result.result, 'duration_ms': duration_ms, 'tokens_used': result.tokens_used})}\n\n"

            except Exception as e:
                logger.error(f"Agent execution failed for {agent_type}: {e}", exc_info=True)
                task["status"] = "failed"
                task["output"] = f"执行失败: {str(e)}"

                yield f"data: {json.dumps({'type': 'step_error', 'step': i, 'agent_type': agent_type, 'error': str(e)})}\n\n"

            # Update mission progress in database
            mission.progress_current = i + 1
            mission.sub_tasks = sub_tasks
            mission.updated_at = datetime.utcnow()
            db.commit()

        # Generate final synthesis
        try:
            synthesis_task = f"""# 任务：综合研究报告

## 原始研究问题
{mission.description}

## 各 Agent 的研究结果
{accumulated_results}

## 要求
请综合以上所有研究结果，生成一份完整的研究报告。报告应包含：
1. 执行摘要
2. 关键发现
3. 详细分析
4. 结论与建议
5. 后续研究方向

请确保报告逻辑清晰、内容完整、结论有据可依。
"""
            # Get Meta-Coordinator config for synthesis
            # Check both root level and data property for config
            mc_node_config = {}
            for n in workflow.nodes or []:
                node_agent_type = n.get("agentType") or n.get("data", {}).get("agentType")
                if node_agent_type == "meta_coordinator":
                    mc_node_config = n.get("config") or n.get("data", {}).get("config") or {}
                    break
            mc_model_override = mc_node_config.get("roleModel")
            # Fall back to user's default model if no node config
            if not mc_model_override:
                from app.db.models import UserSettings

                user_settings = (
                    db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
                )
                if user_settings and user_settings.default_model:
                    mc_model_override = user_settings.default_model
            logger.info(f"Meta-Coordinator model_override: {mc_model_override}")

            synthesis_result = await agent_service.execute_agent(
                agent_id="meta_coordinator",
                task=synthesis_task,
                session_id=mission_id,
                model_override=mc_model_override,
            )
            final_result = synthesis_result.result
        except Exception as e:
            logger.error(f"Synthesis failed: {e}")
            final_result = f"任务已完成。\n\n执行摘要：\n- 共完成 {total_steps} 个子任务\n\n详细结果请查看各步骤输出。"

        # Update mission as completed
        mission.status = "completed"
        mission.result = final_result
        mission.completed_at = datetime.utcnow()
        db.commit()

        yield f"data: {json.dumps({'type': 'complete', 'result': final_result})}\n\n"

    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
