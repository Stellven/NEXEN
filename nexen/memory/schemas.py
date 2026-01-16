"""
Data schemas for the memory system.
"""

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, Any


@dataclass
class RawRecord:
    """A raw record stored in L0 (raw/) layer."""

    record_id: str
    agent_id: str
    task: str
    content: str
    timestamp: datetime = field(default_factory=datetime.now)

    # Metadata
    model: str = ""
    tokens_used: int = 0
    duration_ms: int = 0

    # File info
    file_path: Optional[Path] = None

    # Extracted data
    key_findings: list[str] = field(default_factory=list)
    uncertainties: list[str] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)
    cross_references: list[str] = field(default_factory=list)


@dataclass
class Digest:
    """A digest stored in L1 (digest/) layer."""

    digest_id: str
    digest_type: str  # "by_agent", "by_topic", "by_person"
    source_agent: Optional[str] = None
    topic: Optional[str] = None

    # Content
    summary: str = ""
    key_points: list[str] = field(default_factory=list)

    # Source tracking
    raw_sources: list[str] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.now)

    # Quality metrics
    confidence: float = 0.0
    freshness_score: float = 1.0

    # File info
    file_path: Optional[Path] = None


@dataclass
class Insight:
    """An insight stored in L2 (insights/) layer."""

    insight_id: str
    insight_type: str  # "key_finding", "open_question", "action_item", etc.

    # Content
    title: str = ""
    description: str = ""
    evidence: list[str] = field(default_factory=list)

    # Quality
    confidence: float = 0.0
    importance: int = 1  # 1-5

    # Source tracking
    source_agents: list[str] = field(default_factory=list)
    source_digests: list[str] = field(default_factory=list)

    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    tags: list[str] = field(default_factory=list)


@dataclass
class SessionManifest:
    """Manifest for a research session."""

    session_id: str
    topic: str
    created_at: datetime = field(default_factory=datetime.now)
    status: str = "active"  # active, completed, archived

    # Stats
    agent_calls: dict[str, int] = field(default_factory=dict)
    total_tokens: int = 0

    # Files
    raw_count: int = 0
    digest_count: int = 0
    insight_count: int = 0


@dataclass
class PersonProfile:
    """Profile for a researcher (stored in knowledge_base/people/)."""

    person_id: str
    name: dict[str, str] = field(default_factory=dict)  # full, display, chinese

    # Bio
    birth_year: Optional[int] = None
    current_affiliation: str = ""

    # Academic
    phd_institution: str = ""
    phd_year: Optional[int] = None
    phd_advisor: str = ""

    # Relationships
    mentors: list[str] = field(default_factory=list)
    students: list[str] = field(default_factory=list)
    collaborators: list[str] = field(default_factory=list)

    # Contributions
    core_contributions: list[dict[str, Any]] = field(default_factory=list)
    schools_of_thought: list[str] = field(default_factory=list)


@dataclass
class TechEvolution:
    """Evolution record for a technology (stored in knowledge_base/tech_history/)."""

    tech_id: str
    name: str

    # Origin
    origin_year: int = 0
    origin_paper: str = ""
    origin_authors: list[str] = field(default_factory=list)

    # Evolution
    milestones: list[dict[str, Any]] = field(default_factory=list)
    branches: list[dict[str, Any]] = field(default_factory=list)
    evolution_axes: list[dict[str, str]] = field(default_factory=list)

    # Tree visualization
    evolution_tree: str = ""
