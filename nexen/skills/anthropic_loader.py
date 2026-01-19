"""
Anthropic Skills Loader - Load skills from SKILL.md format.

This module provides functionality to load and execute skills in the
Anthropic Agent Skills format (https://agentskills.io).
"""

import os
import re
import yaml
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Dict, List, Any
from enum import Enum


class AnthropicSkillCategory(str, Enum):
    """Anthropic skill categories."""
    DOCUMENT = "document"           # PDF, DOCX, PPTX, XLSX
    DEVELOPMENT = "development"     # MCP builder, webapp testing
    CREATIVE = "creative"           # Algorithmic art, canvas design
    COMMUNICATION = "communication" # Internal comms, Slack
    PRODUCTIVITY = "productivity"   # Brand guidelines, theme factory
    OTHER = "other"


@dataclass
class AnthropicSkill:
    """Represents an Anthropic-format skill loaded from SKILL.md."""

    name: str
    description: str
    license: str = "Unknown"
    category: AnthropicSkillCategory = AnthropicSkillCategory.OTHER

    # Content from SKILL.md
    instructions: str = ""

    # Additional resource files
    resources: Dict[str, str] = field(default_factory=dict)

    # Script files
    scripts: List[str] = field(default_factory=list)

    # Source path
    path: str = ""

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "name": self.name,
            "display_name": self.name.replace("-", " ").title(),
            "description": self.description,
            "category": self.category.value,
            "license": self.license,
            "has_scripts": len(self.scripts) > 0,
            "resources": list(self.resources.keys()),
        }

    def get_full_instructions(self) -> str:
        """Get full instructions including all resources."""
        full = f"# {self.name.replace('-', ' ').title()} Skill\n\n"
        full += f"{self.description}\n\n"
        full += self.instructions

        # Append resource files
        for name, content in self.resources.items():
            full += f"\n\n---\n\n## {name}\n\n{content}"

        return full


class AnthropicSkillLoader:
    """Loader for Anthropic-format skills from SKILL.md files."""

    # Mapping skill names to categories
    CATEGORY_MAP = {
        "pdf": AnthropicSkillCategory.DOCUMENT,
        "docx": AnthropicSkillCategory.DOCUMENT,
        "pptx": AnthropicSkillCategory.DOCUMENT,
        "xlsx": AnthropicSkillCategory.DOCUMENT,
        "mcp-builder": AnthropicSkillCategory.DEVELOPMENT,
        "webapp-testing": AnthropicSkillCategory.DEVELOPMENT,
        "frontend-design": AnthropicSkillCategory.DEVELOPMENT,
        "web-artifacts-builder": AnthropicSkillCategory.DEVELOPMENT,
        "algorithmic-art": AnthropicSkillCategory.CREATIVE,
        "canvas-design": AnthropicSkillCategory.CREATIVE,
        "theme-factory": AnthropicSkillCategory.CREATIVE,
        "internal-comms": AnthropicSkillCategory.COMMUNICATION,
        "slack-gif-creator": AnthropicSkillCategory.COMMUNICATION,
        "brand-guidelines": AnthropicSkillCategory.PRODUCTIVITY,
        "doc-coauthoring": AnthropicSkillCategory.PRODUCTIVITY,
        "skill-creator": AnthropicSkillCategory.PRODUCTIVITY,
    }

    def __init__(self, skills_dir: str = None):
        """Initialize loader with skills directory path."""
        if skills_dir is None:
            # Default to anthropic skills directory
            skills_dir = Path(__file__).parent / "anthropic"
        self.skills_dir = Path(skills_dir)
        self._skills_cache: Dict[str, AnthropicSkill] = {}

    def _parse_frontmatter(self, content: str) -> tuple[dict, str]:
        """Parse YAML frontmatter from markdown content."""
        if not content.startswith("---"):
            return {}, content

        # Find the closing ---
        end_match = re.search(r'\n---\n', content[3:])
        if not end_match:
            return {}, content

        frontmatter_end = end_match.end() + 3
        frontmatter_text = content[3:frontmatter_end - 4]
        body = content[frontmatter_end:]

        try:
            frontmatter = yaml.safe_load(frontmatter_text)
            return frontmatter or {}, body
        except yaml.YAMLError:
            return {}, content

    def load_skill(self, skill_name: str) -> Optional[AnthropicSkill]:
        """Load a single skill by name."""
        if skill_name in self._skills_cache:
            return self._skills_cache[skill_name]

        skill_path = self.skills_dir / skill_name
        skill_md_path = skill_path / "SKILL.md"

        if not skill_md_path.exists():
            return None

        # Read SKILL.md
        with open(skill_md_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Parse frontmatter
        frontmatter, body = self._parse_frontmatter(content)

        # Create skill object
        skill = AnthropicSkill(
            name=frontmatter.get("name", skill_name),
            description=frontmatter.get("description", ""),
            license=frontmatter.get("license", "Unknown"),
            category=self.CATEGORY_MAP.get(skill_name, AnthropicSkillCategory.OTHER),
            instructions=body.strip(),
            path=str(skill_path),
        )

        # Load additional resource files (*.md, excluding SKILL.md)
        for md_file in skill_path.glob("*.md"):
            if md_file.name != "SKILL.md":
                with open(md_file, "r", encoding="utf-8") as f:
                    skill.resources[md_file.stem] = f.read()

        # List script files
        scripts_dir = skill_path / "scripts"
        if scripts_dir.exists():
            skill.scripts = [f.name for f in scripts_dir.iterdir() if f.is_file()]

        self._skills_cache[skill_name] = skill
        return skill

    def list_skills(self) -> List[AnthropicSkill]:
        """List all available Anthropic skills."""
        skills = []

        if not self.skills_dir.exists():
            return skills

        for item in self.skills_dir.iterdir():
            if item.is_dir() and (item / "SKILL.md").exists():
                skill = self.load_skill(item.name)
                if skill:
                    skills.append(skill)

        return skills

    def get_skill_instructions(self, skill_name: str, include_resources: bool = True) -> Optional[str]:
        """Get skill instructions for injection into LLM context."""
        skill = self.load_skill(skill_name)
        if not skill:
            return None

        if include_resources:
            return skill.get_full_instructions()
        return skill.instructions

    def get_skill_script(self, skill_name: str, script_name: str) -> Optional[str]:
        """Get content of a skill script file."""
        skill_path = self.skills_dir / skill_name / "scripts" / script_name
        if skill_path.exists():
            with open(skill_path, "r", encoding="utf-8") as f:
                return f.read()
        return None


# Global loader instance
_loader: Optional[AnthropicSkillLoader] = None


def get_loader() -> AnthropicSkillLoader:
    """Get or create the global skill loader."""
    global _loader
    if _loader is None:
        _loader = AnthropicSkillLoader()
    return _loader


def list_anthropic_skills() -> List[dict]:
    """List all Anthropic skills as dictionaries."""
    loader = get_loader()
    return [skill.to_dict() for skill in loader.list_skills()]


def get_anthropic_skill(name: str) -> Optional[AnthropicSkill]:
    """Get an Anthropic skill by name."""
    return get_loader().load_skill(name)


def get_skill_context(name: str) -> Optional[str]:
    """Get skill instructions for LLM context injection."""
    return get_loader().get_skill_instructions(name)
