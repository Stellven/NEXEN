"""
Literature search and retrieval skills.
"""

from nexen.skills.base import Skill, LLMSkill, SkillResult, SkillParameter, SkillCategory
from nexen.skills.registry import register_skill


@register_skill
class PubMedSearchSkill(LLMSkill):
    """Search PubMed for scientific literature."""
    
    name = "pubmed_search"
    display_name = "PubMed Search"
    description = "Search PubMed for scientific publications using keywords, authors, or MeSH terms"
    category = SkillCategory.LITERATURE
    parameters = [
        SkillParameter(name="query", description="Search query (keywords, authors, MeSH terms)", required=True),
        SkillParameter(name="max_results", description="Maximum number of results", type="number", required=False, default=10),
        SkillParameter(name="sort", description="Sort order", required=False, default="relevance", enum=["relevance", "date"]),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        query = params["query"]
        max_results = params.get("max_results", 10)
        
        prompt = f"""Search PubMed for: "{query}"

Provide {max_results} relevant papers with:
1. Title
2. Authors (first author et al.)
3. Journal and year
4. PMID
5. Brief summary of key findings (1-2 sentences)

Format as a numbered list. Focus on high-impact, recent publications when possible."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"query": query, "source": "pubmed"})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class OpenAlexSearchSkill(LLMSkill):
    """Search OpenAlex for academic publications."""
    
    name = "openalex_search"
    display_name = "OpenAlex Search"
    description = "Search OpenAlex for academic publications, citations, and author information"
    category = SkillCategory.LITERATURE
    parameters = [
        SkillParameter(name="query", description="Search query", required=True),
        SkillParameter(name="type", description="Search type", required=False, default="works", 
                      enum=["works", "authors", "concepts", "venues"]),
        SkillParameter(name="max_results", description="Maximum results", type="number", required=False, default=10),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        query = params["query"]
        search_type = params.get("type", "works")
        max_results = params.get("max_results", 10)
        
        prompt = f"""Search OpenAlex for {search_type}: "{query}"

Provide {max_results} results with relevant metadata:
- For works: title, authors, year, citations, DOI
- For authors: name, institution, h-index, top works
- For concepts: description, related fields, key papers
- For venues: name, impact, scope

Format clearly with key metrics highlighted."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"query": query, "type": search_type})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class BioRxivSearchSkill(LLMSkill):
    """Search bioRxiv for preprints."""
    
    name = "biorxiv_search"
    display_name = "bioRxiv Search"
    description = "Search bioRxiv for preprints in biology and life sciences"
    category = SkillCategory.LITERATURE
    parameters = [
        SkillParameter(name="query", description="Search query", required=True),
        SkillParameter(name="category", description="Subject category", required=False, 
                      enum=["all", "bioinformatics", "genomics", "neuroscience", "cell-biology", "immunology"]),
        SkillParameter(name="max_results", description="Maximum results", type="number", required=False, default=10),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        query = params["query"]
        category = params.get("category", "all")
        max_results = params.get("max_results", 10)
        
        prompt = f"""Search bioRxiv preprints for: "{query}"
Category filter: {category}

Provide {max_results} recent preprints with:
1. Title
2. Authors
3. Posted date
4. DOI
5. Abstract summary (2-3 sentences)
6. Key methods/findings

Focus on recent, high-impact preprints. Note if any have been peer-reviewed/published."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"query": query, "source": "biorxiv"})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class LiteratureReviewSkill(LLMSkill):
    """Generate a literature review on a topic."""
    
    name = "literature_review"
    display_name = "Literature Review"
    description = "Generate a comprehensive literature review on a scientific topic"
    category = SkillCategory.LITERATURE
    parameters = [
        SkillParameter(name="topic", description="Research topic for review", required=True),
        SkillParameter(name="scope", description="Scope of review", required=False, default="comprehensive",
                      enum=["brief", "comprehensive", "systematic"]),
        SkillParameter(name="years", description="Time range (e.g., '2020-2024')", required=False),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        topic = params["topic"]
        scope = params.get("scope", "comprehensive")
        years = params.get("years", "recent 5 years")
        
        prompt = f"""Generate a {scope} literature review on: "{topic}"
Time scope: {years}

Structure:
1. **Introduction**: Define the topic and its significance
2. **Background**: Historical context and foundational work
3. **Current State**: Major findings, methodologies, and debates
4. **Key Papers**: Cite and discuss seminal works
5. **Gaps & Future Directions**: Identify open questions
6. **Summary**: Synthesize main conclusions

Include inline citations [Author, Year] throughout. Be scholarly and precise."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"topic": topic, "scope": scope})
        except Exception as e:
            return SkillResult(success=False, error=str(e))
