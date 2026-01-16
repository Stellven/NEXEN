"""
NEXEN - Next-generation EXpert ENgine

A multi-agent AI research assistant system with:
- Heterogeneous multi-model architecture
- Externalized memory system
- Three-module execution pipeline
- 14 specialized agents
- 40+ research skills
"""

__version__ = "0.1.0"
__author__ = "NEXEN Team"

from nexen.core.coordinator import MetaCoordinator
from nexen.core.model_router import ModelRouter

__all__ = ["MetaCoordinator", "ModelRouter", "__version__"]
