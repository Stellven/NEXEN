"""Agent implementations for NEXEN."""

# Reasoning cluster
from nexen.agents.reasoning import (
    LogicianAgent,
    CriticAgent,
    ConnectorAgent,
    GenealogistAgent,
    HistorianAgent,
)

# Information cluster
from nexen.agents.information import (
    ExplorerAgent,
    SocialScoutAgent,
    CNSpecialistAgent,
    VisionAnalystAgent,
)

# Production cluster
from nexen.agents.production import (
    BuilderAgent,
    ScribeAgent,
    ArchivistAgent,
    PromptEngineerAgent,
)

__all__ = [
    # Reasoning
    "LogicianAgent",
    "CriticAgent",
    "ConnectorAgent",
    "GenealogistAgent",
    "HistorianAgent",
    # Information
    "ExplorerAgent",
    "SocialScoutAgent",
    "CNSpecialistAgent",
    "VisionAnalystAgent",
    # Production
    "BuilderAgent",
    "ScribeAgent",
    "ArchivistAgent",
    "PromptEngineerAgent",
]
