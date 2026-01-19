"""
Workspace service for file-based data passing between agents.

Manages the research workspace directory structure where agents
write their outputs and read inputs from other agents.
"""

import json
import hashlib
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class WorkspaceService:
    """Research workspace file management service."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.base_path = Path(settings.nexen_workspace) / session_id

    async def initialize_workspace(self) -> Dict[str, Any]:
        """
        Initialize the workspace directory structure for a new session.

        Creates:
        - /agents/{agent_type}/  for each agent
        - /shared/  for cross-agent data
        - /memory/L0_raw/, L1_digest/, L2_insights/
        """
        # Create base directories
        directories = [
            self.base_path / "agents",
            self.base_path / "shared",
            self.base_path / "memory" / "L0_raw",
            self.base_path / "memory" / "L1_digest",
            self.base_path / "memory" / "L2_insights",
        ]

        for dir_path in directories:
            dir_path.mkdir(parents=True, exist_ok=True)

        # Create manifest file
        manifest = {
            "session_id": self.session_id,
            "created_at": datetime.utcnow().isoformat(),
            "version": "1.0",
            "agents": [],
            "status": "active",
        }

        manifest_path = self.base_path / "manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        # Initialize shared data files
        shared_files = {
            "findings.json": [],
            "references.json": [],
            "uncertainties.json": [],
        }

        for filename, default_content in shared_files.items():
            filepath = self.base_path / "shared" / filename
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(default_content, f, indent=2, ensure_ascii=False)

        logger.info(f"Initialized workspace for session {self.session_id}")
        return manifest

    async def write_agent_output(
        self,
        agent_type: str,
        content: str,
        output_type: str = "markdown",
        task_id: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Write agent output to the workspace.

        Args:
            agent_type: The type of agent (e.g., 'explorer', 'logician')
            content: The output content
            output_type: File type ('markdown', 'json', 'yaml')
            task_id: Optional task ID for reference
            metadata: Optional metadata to include

        Returns:
            Dict with file_path, file_size, checksum
        """
        # Ensure agent directory exists
        agent_dir = self.base_path / "agents" / agent_type
        agent_dir.mkdir(parents=True, exist_ok=True)

        # Generate filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        extension = {
            "markdown": "md",
            "json": "json",
            "yaml": "yaml",
        }.get(output_type, "txt")

        filename = f"{timestamp}_{task_id or 'output'}.{extension}"
        filepath = agent_dir / filename

        # Write content
        with open(filepath, "w", encoding="utf-8") as f:
            if output_type == "json" and isinstance(content, (dict, list)):
                json.dump(content, f, indent=2, ensure_ascii=False)
            else:
                f.write(content)

        # Calculate checksum
        file_content = filepath.read_bytes()
        checksum = hashlib.sha256(file_content).hexdigest()
        file_size = len(file_content)

        # Update manifest
        await self._update_manifest_agent(agent_type)

        result = {
            "file_path": str(filepath.relative_to(self.base_path)),
            "absolute_path": str(filepath),
            "file_size": file_size,
            "checksum": checksum,
            "output_type": output_type,
            "agent_type": agent_type,
            "created_at": datetime.utcnow().isoformat(),
        }

        logger.info(f"Agent {agent_type} wrote output to {filepath}")
        return result

    async def read_agent_outputs(
        self,
        agent_type: str,
        limit: int = 10,
        output_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Read output files from a specific agent.

        Args:
            agent_type: The agent type to read from
            limit: Maximum number of files to return
            output_type: Filter by output type

        Returns:
            List of file info dicts with content
        """
        agent_dir = self.base_path / "agents" / agent_type
        if not agent_dir.exists():
            return []

        outputs = []
        files = sorted(agent_dir.iterdir(), key=lambda f: f.stat().st_mtime, reverse=True)

        for filepath in files[:limit]:
            if filepath.is_file():
                ext = filepath.suffix.lower()
                file_type = {
                    ".md": "markdown",
                    ".json": "json",
                    ".yaml": "yaml",
                    ".yml": "yaml",
                }.get(ext, "text")

                if output_type and file_type != output_type:
                    continue

                content = filepath.read_text(encoding="utf-8")

                outputs.append({
                    "file_path": str(filepath.relative_to(self.base_path)),
                    "filename": filepath.name,
                    "output_type": file_type,
                    "content": content,
                    "file_size": filepath.stat().st_size,
                    "modified_at": datetime.fromtimestamp(filepath.stat().st_mtime).isoformat(),
                })

        return outputs

    async def get_shared_context(self) -> Dict[str, Any]:
        """
        Get all shared context data (findings, references, uncertainties).

        Returns:
            Dict with findings, references, uncertainties lists
        """
        shared_dir = self.base_path / "shared"
        context = {}

        for filename in ["findings.json", "references.json", "uncertainties.json"]:
            filepath = shared_dir / filename
            if filepath.exists():
                with open(filepath, "r", encoding="utf-8") as f:
                    key = filename.replace(".json", "")
                    context[key] = json.load(f)
            else:
                context[filename.replace(".json", "")] = []

        return context

    async def update_shared_findings(self, findings: List[str], agent_type: str) -> None:
        """
        Append new findings to the shared findings file.

        Args:
            findings: List of finding strings to add
            agent_type: The agent that produced these findings
        """
        filepath = self.base_path / "shared" / "findings.json"

        existing = []
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                existing = json.load(f)

        timestamp = datetime.utcnow().isoformat()
        for finding in findings:
            existing.append({
                "content": finding,
                "agent": agent_type,
                "timestamp": timestamp,
            })

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)

    async def update_shared_references(self, references: List[Dict], agent_type: str) -> None:
        """
        Append new references to the shared references file.

        Args:
            references: List of reference dicts (title, url, etc.)
            agent_type: The agent that found these references
        """
        filepath = self.base_path / "shared" / "references.json"

        existing = []
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                existing = json.load(f)

        timestamp = datetime.utcnow().isoformat()
        for ref in references:
            ref["added_by"] = agent_type
            ref["added_at"] = timestamp
            existing.append(ref)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)

    async def get_dependent_outputs(
        self,
        task_input_files: List[str],
    ) -> List[Dict[str, Any]]:
        """
        Read outputs from dependent tasks.

        Args:
            task_input_files: List of relative file paths from dependent tasks

        Returns:
            List of file contents with metadata
        """
        outputs = []
        for file_path in task_input_files:
            full_path = self.base_path / file_path
            if full_path.exists():
                content = full_path.read_text(encoding="utf-8")
                outputs.append({
                    "file_path": file_path,
                    "content": content,
                    "file_size": full_path.stat().st_size,
                })
        return outputs

    async def get_workspace_structure(self) -> Dict[str, Any]:
        """
        Get the workspace directory structure.

        Returns:
            Dict representing the directory tree
        """
        def build_tree(path: Path, depth: int = 0) -> Dict:
            if depth > 3:  # Limit depth
                return {"name": path.name, "type": "directory", "truncated": True}

            result = {
                "name": path.name,
                "type": "directory" if path.is_dir() else "file",
            }

            if path.is_dir():
                result["children"] = [
                    build_tree(child, depth + 1)
                    for child in sorted(path.iterdir())
                    if not child.name.startswith(".")
                ]
            else:
                result["size"] = path.stat().st_size

            return result

        if not self.base_path.exists():
            return {"error": "Workspace not initialized"}

        return build_tree(self.base_path)

    async def _update_manifest_agent(self, agent_type: str) -> None:
        """Update manifest with agent activity."""
        manifest_path = self.base_path / "manifest.json"
        if manifest_path.exists():
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)

            if agent_type not in manifest.get("agents", []):
                manifest.setdefault("agents", []).append(agent_type)
                manifest["updated_at"] = datetime.utcnow().isoformat()

                with open(manifest_path, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)

    async def cleanup_workspace(self) -> None:
        """
        Clean up the workspace (mark as archived, optionally compress).
        """
        manifest_path = self.base_path / "manifest.json"
        if manifest_path.exists():
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)

            manifest["status"] = "archived"
            manifest["archived_at"] = datetime.utcnow().isoformat()

            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)

        logger.info(f"Archived workspace for session {self.session_id}")
