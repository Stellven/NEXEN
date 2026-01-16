"""
Skill registry for discovering and managing skills.
"""

from typing import Optional
from nexen.skills.base import Skill, SkillCategory


class SkillRegistry:
    """Central registry for all available skills."""
    
    _instance: Optional["SkillRegistry"] = None
    _skills: dict[str, Skill] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._skills = {}
        return cls._instance
    
    @classmethod
    def register(cls, skill_class: type[Skill]) -> type[Skill]:
        """Decorator to register a skill class."""
        instance = skill_class()
        cls._skills[instance.name] = instance
        return skill_class
    
    @classmethod
    def get(cls, name: str) -> Optional[Skill]:
        """Get a skill by name."""
        return cls._skills.get(name)
    
    @classmethod
    def list_all(cls) -> list[Skill]:
        """List all registered skills."""
        return list(cls._skills.values())
    
    @classmethod
    def list_by_category(cls, category: SkillCategory) -> list[Skill]:
        """List skills in a specific category."""
        return [s for s in cls._skills.values() if s.category == category]
    
    @classmethod
    def search(cls, query: str) -> list[Skill]:
        """Search skills by name or description."""
        query_lower = query.lower()
        return [
            s for s in cls._skills.values()
            if query_lower in s.name.lower() 
            or query_lower in s.description.lower()
            or query_lower in s.display_name.lower()
        ]
    
    @classmethod
    def to_dict(cls) -> dict:
        """Export all skills as dictionary."""
        return {
            "total": len(cls._skills),
            "categories": [c.value for c in SkillCategory],
            "skills": [s.to_dict() for s in cls._skills.values()],
        }


# Convenience functions
def get_skill(name: str) -> Optional[Skill]:
    """Get a skill by name."""
    return SkillRegistry.get(name)


def list_skills(category: Optional[SkillCategory] = None) -> list[Skill]:
    """List skills, optionally filtered by category."""
    if category:
        return SkillRegistry.list_by_category(category)
    return SkillRegistry.list_all()


def register_skill(skill_class: type[Skill]) -> type[Skill]:
    """Decorator to register a skill."""
    return SkillRegistry.register(skill_class)
