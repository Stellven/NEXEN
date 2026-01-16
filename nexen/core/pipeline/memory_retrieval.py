"""
Module 2: Memory Retrieval

Implements the hierarchical memory retrieval system:
- L2 (insights/): High priority, always loaded
- L1 (digest/): Medium priority, semantic search
- L0 (raw/): Low priority, on-demand reference

Controls token budget and ensures relevant context is retrieved.
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import litellm

from nexen.config.agents import AgentConfig, Module2Config
from nexen.config.settings import get_settings

logger = logging.getLogger(__name__)


@dataclass
class RetrievedDocument:
    """A document retrieved from memory."""

    path: Path
    content: str
    layer: str  # "L0", "L1", "L2"
    relevance_score: float = 1.0
    token_count: int = 0
    metadata: dict = field(default_factory=dict)


@dataclass
class RetrievedContext:
    """Complete retrieved context for an agent."""

    documents: list[RetrievedDocument] = field(default_factory=list)
    formatted_content: str = ""
    total_tokens: int = 0
    sources: list[str] = field(default_factory=list)

    # Layer breakdown
    l2_tokens: int = 0
    l1_tokens: int = 0
    l0_refs: list[str] = field(default_factory=list)


class MemoryRetriever:
    """
    Module 2: Memory Retrieval

    Retrieves relevant context from the hierarchical memory system.
    """

    # Token estimation: ~4 chars per token for English/mixed content
    CHARS_PER_TOKEN = 4

    # Priority weights for ranking
    PRIORITY_WEIGHTS = {
        "L2": 1.0,  # Highest priority - always load
        "L1": 0.7,  # Medium priority - semantic search
        "L0": 0.3,  # Low priority - reference only
    }

    def __init__(
        self,
        agent_config: AgentConfig,
        session_id: Optional[str] = None,
    ):
        self.agent_config = agent_config
        self.module_config: Module2Config = agent_config.module_2
        self.settings = get_settings()
        self.session_id = session_id or "default"

    async def retrieve_context(
        self,
        query: str,
        max_tokens: Optional[int] = None,
    ) -> RetrievedContext:
        """
        Retrieve relevant context for a query.

        Args:
            query: The query to retrieve context for
            max_tokens: Maximum tokens to retrieve (uses config default if None)

        Returns:
            RetrievedContext with all retrieved documents
        """
        token_budget = max_tokens or self.module_config.token_budget
        documents: list[RetrievedDocument] = []

        # Step 1: Load L2 insights (always loaded - highest priority)
        l2_docs, l2_tokens = await self._load_l2_insights(token_budget)
        documents.extend(l2_docs)
        token_budget -= l2_tokens

        # Step 2: Load L1 digests (semantic search)
        if token_budget > 1000:
            l1_docs, l1_tokens = await self._search_l1_digests(query, token_budget)
            documents.extend(l1_docs)
            token_budget -= l1_tokens

        # Step 3: Get L0 references (paths only, not content)
        l0_refs = await self._get_l0_references(query)

        # Format the context
        context = self._format_context(documents, l0_refs)
        context.l2_tokens = l2_tokens
        context.l1_tokens = sum(d.token_count for d in l1_docs) if l1_docs else 0
        context.l0_refs = l0_refs

        return context

    async def _load_l2_insights(
        self,
        token_budget: int,
    ) -> tuple[list[RetrievedDocument], int]:
        """Load L2 insights layer documents."""
        documents = []
        total_tokens = 0
        insights_dir = self.settings.get_session_path(self.session_id, "insights")

        # Files to always load
        required_files = self.module_config.default_insights

        for filename in required_files:
            filepath = insights_dir / filename
            if filepath.exists():
                try:
                    content = filepath.read_text(encoding="utf-8")
                    tokens = self._estimate_tokens(content)

                    if total_tokens + tokens <= token_budget:
                        documents.append(
                            RetrievedDocument(
                                path=filepath,
                                content=content,
                                layer="L2",
                                relevance_score=1.0,
                                token_count=tokens,
                            )
                        )
                        total_tokens += tokens
                except Exception as e:
                    logger.warning(f"Failed to load L2 file {filepath}: {e}")

        logger.debug(f"Loaded {len(documents)} L2 documents ({total_tokens} tokens)")
        return documents, total_tokens

    async def _search_l1_digests(
        self,
        query: str,
        token_budget: int,
    ) -> tuple[list[RetrievedDocument], int]:
        """Search and load L1 digest layer documents."""
        documents = []
        total_tokens = 0
        digest_dir = self.settings.get_session_path(self.session_id, "digest")

        if not digest_dir.exists():
            return documents, total_tokens

        # Get agent-specific digests first
        agent_digests = self.module_config.agent_digests
        if agent_digests == ["all"]:
            # Load all agent digests
            by_agent_dir = digest_dir / "by_agent"
            if by_agent_dir.exists():
                agent_digests = [
                    f.stem.replace("_digest", "")
                    for f in by_agent_dir.glob("*_digest.md")
                ]

        # Load agent digests (excluding self)
        for agent_id in agent_digests:
            if agent_id == self.agent_config.agent_id:
                continue

            filepath = digest_dir / "by_agent" / f"{agent_id}_digest.md"
            if filepath.exists():
                try:
                    content = filepath.read_text(encoding="utf-8")
                    tokens = self._estimate_tokens(content)

                    if total_tokens + tokens <= token_budget:
                        documents.append(
                            RetrievedDocument(
                                path=filepath,
                                content=content,
                                layer="L1",
                                relevance_score=0.8,
                                token_count=tokens,
                                metadata={"agent": agent_id},
                            )
                        )
                        total_tokens += tokens
                except Exception as e:
                    logger.warning(f"Failed to load digest {filepath}: {e}")

        # If semantic search is enabled and we have budget, search by topic
        if (
            self.module_config.semantic_search_enabled
            and token_budget - total_tokens > 500
        ):
            topic_docs = await self._semantic_search_digests(
                query,
                digest_dir / "by_topic",
                token_budget - total_tokens,
                top_k=self.module_config.semantic_top_k,
            )
            documents.extend(topic_docs)
            total_tokens += sum(d.token_count for d in topic_docs)

        logger.debug(f"Loaded {len(documents)} L1 documents ({total_tokens} tokens)")
        return documents, total_tokens

    async def _semantic_search_digests(
        self,
        query: str,
        search_dir: Path,
        token_budget: int,
        top_k: int = 3,
    ) -> list[RetrievedDocument]:
        """Perform semantic search on digest files."""
        if not search_dir.exists():
            return []

        documents = []
        candidates = []

        # Collect all candidate files
        for filepath in search_dir.glob("*.md"):
            try:
                content = filepath.read_text(encoding="utf-8")
                tokens = self._estimate_tokens(content)
                candidates.append((filepath, content, tokens))
            except Exception as e:
                logger.warning(f"Failed to read {filepath}: {e}")

        if not candidates:
            return []

        # Use LLM to rank relevance (simple approach)
        # In production, use a vector database like Qdrant
        try:
            ranked = await self._rank_by_relevance(query, candidates, top_k)

            total_tokens = 0
            for filepath, content, tokens, score in ranked:
                if total_tokens + tokens <= token_budget:
                    documents.append(
                        RetrievedDocument(
                            path=filepath,
                            content=content,
                            layer="L1",
                            relevance_score=score,
                            token_count=tokens,
                        )
                    )
                    total_tokens += tokens

        except Exception as e:
            logger.warning(f"Semantic search failed: {e}")

        return documents

    async def _rank_by_relevance(
        self,
        query: str,
        candidates: list[tuple[Path, str, int]],
        top_k: int,
    ) -> list[tuple[Path, str, int, float]]:
        """Rank candidates by relevance to query using LLM."""
        if not candidates:
            return []

        # Build ranking prompt
        file_summaries = []
        for i, (filepath, content, _) in enumerate(candidates):
            # Use first 200 chars as summary
            summary = content[:200].replace("\n", " ")
            file_summaries.append(f"{i}. {filepath.name}: {summary}...")

        ranking_prompt = f"""Given the query, rank these documents by relevance (most relevant first).

Query: {query}

Documents:
{chr(10).join(file_summaries)}

Return only the document numbers in order of relevance, comma-separated.
Example: 2,0,3,1
"""

        try:
            response = await litellm.acompletion(
                model=self.module_config.analyzer_model,
                messages=[{"role": "user", "content": ranking_prompt}],
                temperature=0.1,
                max_tokens=100,
            )

            content = response.choices[0].message.content or ""
            # Parse ranking
            indices = []
            for part in content.strip().split(","):
                try:
                    idx = int(part.strip())
                    if 0 <= idx < len(candidates):
                        indices.append(idx)
                except ValueError:
                    pass

            # Build ranked list
            ranked = []
            for rank, idx in enumerate(indices[:top_k]):
                filepath, content, tokens = candidates[idx]
                score = 1.0 - (rank * 0.1)  # Higher rank = higher score
                ranked.append((filepath, content, tokens, score))

            return ranked

        except Exception as e:
            logger.warning(f"LLM ranking failed: {e}")
            # Fallback: return first top_k
            return [
                (filepath, content, tokens, 0.5)
                for filepath, content, tokens in candidates[:top_k]
            ]

    async def _get_l0_references(self, query: str) -> list[str]:
        """Get L0 raw file references (paths only)."""
        references = []
        raw_dir = self.settings.get_session_path(self.session_id, "raw")

        if not raw_dir.exists():
            return references

        # Get recent files from each agent
        for agent_dir in raw_dir.iterdir():
            if agent_dir.is_dir():
                files = sorted(agent_dir.glob("*.md"), reverse=True)[:3]
                for f in files:
                    references.append(str(f.relative_to(raw_dir.parent)))

        return references[:10]  # Limit to 10 references

    def _format_context(
        self,
        documents: list[RetrievedDocument],
        l0_refs: list[str],
    ) -> RetrievedContext:
        """Format retrieved documents into a context string."""
        sections = []

        # L2 Section
        l2_docs = [d for d in documents if d.layer == "L2"]
        if l2_docs:
            sections.append("## 📚 关键洞察 [必读 - L2]\n")
            for doc in l2_docs:
                sections.append(f"### {doc.path.name}\n{doc.content}\n")

        # L1 Section
        l1_docs = [d for d in documents if d.layer == "L1"]
        if l1_docs:
            sections.append("\n## 📋 相关摘要 [推荐 - L1]\n")
            for doc in l1_docs:
                agent = doc.metadata.get("agent", "unknown")
                sections.append(f"### {doc.path.name} (来源: {agent})\n{doc.content}\n")

        # L0 References
        if l0_refs:
            sections.append("\n## 📎 原始记录索引 [按需查阅 - L0]\n")
            sections.append("以下文件可通过 `/raw` 命令查阅:\n")
            for ref in l0_refs:
                sections.append(f"- `{ref}`\n")

        # Warning section
        sections.append("""
---
⚠️ **注意**:
1. 优先基于「关键洞察」中的已有结论
2. 避免重复已完成的工作
3. 如发现矛盾，请明确标注
---
""")

        formatted = "".join(sections)

        return RetrievedContext(
            documents=documents,
            formatted_content=formatted,
            total_tokens=sum(d.token_count for d in documents),
            sources=[str(d.path) for d in documents],
        )

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count for text."""
        return len(text) // self.CHARS_PER_TOKEN
