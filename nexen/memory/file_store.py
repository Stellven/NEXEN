"""
File-based storage for the memory system.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Any

import yaml

from nexen.config.settings import get_settings
from nexen.memory.schemas import RawRecord, Digest, Insight, SessionManifest

logger = logging.getLogger(__name__)


class FileStore:
    """
    File-based storage for NEXEN memory system.

    Manages the three-layer memory structure:
    - L0: raw/ - Original agent outputs
    - L1: digest/ - Summarized information
    - L2: insights/ - Key insights
    """

    def __init__(self, session_id: Optional[str] = None):
        self.settings = get_settings()
        self.session_id = session_id or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    @property
    def session_path(self) -> Path:
        """Get the session directory path."""
        return self.settings.get_session_path(self.session_id)

    @property
    def raw_path(self) -> Path:
        """Get the L0 raw directory path."""
        return self.session_path / "raw"

    @property
    def digest_path(self) -> Path:
        """Get the L1 digest directory path."""
        return self.session_path / "digest"

    @property
    def insights_path(self) -> Path:
        """Get the L2 insights directory path."""
        return self.session_path / "insights"

    @property
    def knowledge_base_path(self) -> Path:
        """Get the knowledge base path."""
        return self.settings.workspace_dir / "knowledge_base"

    # =========================================================================
    # Session Management
    # =========================================================================

    def initialize_session(self, topic: str = "") -> SessionManifest:
        """Initialize a new research session."""
        # Create directory structure
        (self.session_path / "raw").mkdir(parents=True, exist_ok=True)
        (self.session_path / "digest" / "by_agent").mkdir(parents=True, exist_ok=True)
        (self.session_path / "digest" / "by_topic").mkdir(parents=True, exist_ok=True)
        (self.session_path / "digest" / "by_person").mkdir(parents=True, exist_ok=True)
        (self.session_path / "insights").mkdir(parents=True, exist_ok=True)
        (self.session_path / "artifacts").mkdir(parents=True, exist_ok=True)

        # Create manifest
        manifest = SessionManifest(
            session_id=self.session_id,
            topic=topic,
        )
        self._save_manifest(manifest)

        logger.info(f"Initialized session: {self.session_id}")
        return manifest

    def _save_manifest(self, manifest: SessionManifest) -> None:
        """Save session manifest."""
        manifest_path = self.session_path / "manifest.yaml"
        with open(manifest_path, "w", encoding="utf-8") as f:
            yaml.dump({
                "session_id": manifest.session_id,
                "topic": manifest.topic,
                "created_at": manifest.created_at.isoformat(),
                "status": manifest.status,
                "agent_calls": manifest.agent_calls,
                "total_tokens": manifest.total_tokens,
            }, f, allow_unicode=True)

    def load_manifest(self) -> Optional[SessionManifest]:
        """Load session manifest."""
        manifest_path = self.session_path / "manifest.yaml"
        if not manifest_path.exists():
            return None

        with open(manifest_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        return SessionManifest(
            session_id=data.get("session_id", self.session_id),
            topic=data.get("topic", ""),
            created_at=datetime.fromisoformat(data.get("created_at", datetime.now().isoformat())),
            status=data.get("status", "active"),
            agent_calls=data.get("agent_calls", {}),
            total_tokens=data.get("total_tokens", 0),
        )

    # =========================================================================
    # L0: Raw Storage
    # =========================================================================

    def save_raw(self, record: RawRecord) -> Path:
        """Save a raw record to L0."""
        agent_dir = self.raw_path / record.agent_id
        agent_dir.mkdir(parents=True, exist_ok=True)

        timestamp = record.timestamp.strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{record.record_id}.md"
        filepath = agent_dir / filename

        # Build markdown content
        content = f"""---
record_id: "{record.record_id}"
agent: "{record.agent_id}"
model: "{record.model}"
timestamp: "{record.timestamp.isoformat()}"
tokens_used: {record.tokens_used}
duration_ms: {record.duration_ms}
---

## 任务
{record.task}

## 输出
{record.content}

## 关键发现
{self._format_list(record.key_findings)}

## 不确定点
{self._format_list(record.uncertainties)}

## 建议
{self._format_list(record.suggestions)}

## 跨Agent引用
{self._format_list(record.cross_references)}
"""
        filepath.write_text(content, encoding="utf-8")
        record.file_path = filepath
        logger.debug(f"Saved raw record to {filepath}")
        return filepath

    def list_raw_files(self, agent_id: Optional[str] = None) -> list[Path]:
        """List raw files, optionally filtered by agent."""
        if agent_id:
            agent_dir = self.raw_path / agent_id
            if agent_dir.exists():
                return sorted(agent_dir.glob("*.md"), reverse=True)
            return []

        files = []
        if self.raw_path.exists():
            for agent_dir in self.raw_path.iterdir():
                if agent_dir.is_dir():
                    files.extend(agent_dir.glob("*.md"))
        return sorted(files, reverse=True)

    # =========================================================================
    # L1: Digest Storage
    # =========================================================================

    def save_digest(self, digest: Digest) -> Path:
        """Save a digest to L1."""
        if digest.digest_type == "by_agent":
            subdir = self.digest_path / "by_agent"
            filename = f"{digest.source_agent}_digest.md"
        elif digest.digest_type == "by_topic":
            subdir = self.digest_path / "by_topic"
            filename = f"{digest.topic.replace(' ', '_')}.md"
        elif digest.digest_type == "by_person":
            subdir = self.digest_path / "by_person"
            filename = f"{digest.topic.replace(' ', '_')}.md"
        else:
            subdir = self.digest_path
            filename = f"{digest.digest_id}.md"

        subdir.mkdir(parents=True, exist_ok=True)
        filepath = subdir / filename

        content = f"""---
digest_id: "{digest.digest_id}"
type: "{digest.digest_type}"
source_agent: "{digest.source_agent or ''}"
topic: "{digest.topic or ''}"
last_updated: "{digest.last_updated.isoformat()}"
confidence: {digest.confidence}
raw_sources:
{self._format_yaml_list(digest.raw_sources)}
---

## 摘要
{digest.summary}

## 关键点
{self._format_list(digest.key_points)}
"""
        filepath.write_text(content, encoding="utf-8")
        digest.file_path = filepath
        logger.debug(f"Saved digest to {filepath}")
        return filepath

    def load_digest(self, filepath: Path) -> Optional[Digest]:
        """Load a digest from file."""
        if not filepath.exists():
            return None

        content = filepath.read_text(encoding="utf-8")
        # Parse frontmatter and content
        # Simplified parsing
        return Digest(
            digest_id=filepath.stem,
            digest_type="by_agent",
            summary=content,
            file_path=filepath,
        )

    # =========================================================================
    # L2: Insights Storage
    # =========================================================================

    def save_insight(self, insight: Insight) -> Path:
        """Save an insight to L2."""
        self.insights_path.mkdir(parents=True, exist_ok=True)
        filepath = self.insights_path / f"{insight.insight_type}.md"

        # Append or update
        existing = ""
        if filepath.exists():
            existing = filepath.read_text(encoding="utf-8")

        content = f"""---
last_updated: "{datetime.now().isoformat()}"
---

{existing}

### {insight.title}
**置信度**: {insight.confidence:.0%}
**重要性**: {'⭐' * insight.importance}

{insight.description}

**证据**:
{self._format_list(insight.evidence)}

---
"""
        filepath.write_text(content, encoding="utf-8")
        logger.debug(f"Saved insight to {filepath}")
        return filepath

    def load_insights(self) -> dict[str, str]:
        """Load all insights from L2."""
        insights = {}
        if self.insights_path.exists():
            for filepath in self.insights_path.glob("*.md"):
                insights[filepath.stem] = filepath.read_text(encoding="utf-8")
        return insights

    # =========================================================================
    # Knowledge Base
    # =========================================================================

    def save_person_profile(self, person_id: str, data: dict[str, Any]) -> Path:
        """Save a person profile to knowledge base."""
        person_dir = self.knowledge_base_path / "people" / person_id
        person_dir.mkdir(parents=True, exist_ok=True)

        filepath = person_dir / "profile.yaml"
        with open(filepath, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)

        return filepath

    def save_tech_evolution(self, tech_id: str, data: dict[str, Any]) -> Path:
        """Save technology evolution to knowledge base."""
        tech_dir = self.knowledge_base_path / "tech_history" / tech_id
        tech_dir.mkdir(parents=True, exist_ok=True)

        filepath = tech_dir / "evolution.yaml"
        with open(filepath, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)

        return filepath

    # =========================================================================
    # Utilities
    # =========================================================================

    def _format_list(self, items: list[str]) -> str:
        """Format a list as markdown."""
        if not items:
            return "无"
        return "\n".join(f"- {item}" for item in items)

    def _format_yaml_list(self, items: list[str]) -> str:
        """Format a list for YAML."""
        if not items:
            return "  []"
        return "\n".join(f"  - \"{item}\"" for item in items)
