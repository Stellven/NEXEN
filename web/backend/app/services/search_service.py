"""
Web search service using Serper API.

Provides real-time web search capability for AI responses.
"""

import logging
import aiohttp
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

SERPER_API_URL = "https://google.serper.dev/search"


async def search_web(
    query: str,
    api_key: str,
    num_results: int = 5,
    search_type: str = "search",  # search, news, images
    country: str = "cn",
    language: str = "zh-cn",
) -> Dict[str, Any]:
    """
    Perform web search using Serper API.

    Args:
        query: Search query string
        api_key: Serper API key
        num_results: Number of results to return (max 10)
        search_type: Type of search (search, news, images)
        country: Country code for localized results
        language: Language code for results

    Returns:
        Dict with search results and metadata
    """
    if not api_key:
        return {"error": "Serper API key not configured", "results": []}

    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json",
    }

    payload = {
        "q": query,
        "num": min(num_results, 10),
        "gl": country,
        "hl": language,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                SERPER_API_URL,
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Serper API error: {response.status} - {error_text}")
                    return {"error": f"Search API error: {response.status}", "results": []}

                data = await response.json()
                return parse_search_results(data)

    except aiohttp.ClientTimeout:
        logger.error("Serper API timeout")
        return {"error": "Search timeout", "results": []}
    except Exception as e:
        logger.error(f"Search error: {e}")
        return {"error": str(e), "results": []}


def parse_search_results(data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse Serper API response into structured format."""
    results = []

    # Parse organic results
    organic = data.get("organic", [])
    for item in organic:
        results.append({
            "type": "organic",
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "snippet": item.get("snippet", ""),
            "position": item.get("position", 0),
            "date": item.get("date"),
        })

    # Parse knowledge graph if available
    knowledge_graph = data.get("knowledgeGraph")
    if knowledge_graph:
        results.insert(0, {
            "type": "knowledge_graph",
            "title": knowledge_graph.get("title", ""),
            "description": knowledge_graph.get("description", ""),
            "link": knowledge_graph.get("website", ""),
            "attributes": knowledge_graph.get("attributes", {}),
        })

    # Parse answer box if available
    answer_box = data.get("answerBox")
    if answer_box:
        results.insert(0, {
            "type": "answer_box",
            "title": answer_box.get("title", ""),
            "answer": answer_box.get("answer", answer_box.get("snippet", "")),
            "link": answer_box.get("link", ""),
        })

    # Parse related searches
    related = data.get("relatedSearches", [])
    related_queries = [r.get("query") for r in related if r.get("query")]

    return {
        "results": results,
        "related_searches": related_queries[:5],
        "total_results": data.get("searchParameters", {}).get("totalResults", len(results)),
    }


def format_search_results_for_prompt(
    search_data: Dict[str, Any],
    max_results: int = 5,
) -> str:
    """
    Format search results into a context string for AI prompt.

    Args:
        search_data: Parsed search results from search_web()
        max_results: Maximum number of results to include

    Returns:
        Formatted string for inclusion in AI prompt
    """
    if search_data.get("error"):
        return f"[搜索失败: {search_data['error']}]"

    results = search_data.get("results", [])
    if not results:
        return "[未找到相关搜索结果]"

    lines = ["## 网络搜索结果\n"]

    for i, result in enumerate(results[:max_results], 1):
        result_type = result.get("type", "organic")

        if result_type == "answer_box":
            lines.append(f"**快速回答**: {result.get('answer', '')}")
            if result.get("link"):
                lines.append(f"来源: {result['link']}\n")

        elif result_type == "knowledge_graph":
            lines.append(f"**{result.get('title', '')}**")
            if result.get("description"):
                lines.append(result["description"])
            attrs = result.get("attributes", {})
            if attrs:
                attr_lines = [f"- {k}: {v}" for k, v in list(attrs.items())[:5]]
                lines.extend(attr_lines)
            lines.append("")

        else:  # organic
            title = result.get("title", "")
            snippet = result.get("snippet", "")
            link = result.get("link", "")
            date = result.get("date", "")

            lines.append(f"### {i}. {title}")
            if date:
                lines.append(f"*{date}*")
            if snippet:
                lines.append(snippet)
            if link:
                lines.append(f"链接: {link}")
            lines.append("")

    # Add related searches
    related = search_data.get("related_searches", [])
    if related:
        lines.append("**相关搜索**: " + ", ".join(related[:3]))

    return "\n".join(lines)


def should_search(
    message: str,
    features: Optional[List[str]] = None,
) -> bool:
    """
    Determine if web search should be performed for this message.

    Args:
        message: User's message content
        features: Enabled features list

    Returns:
        True if search should be performed
    """
    # Check if web_search feature is explicitly enabled
    if features and "web_search" in features:
        return True

    return False


def extract_search_query(message: str) -> str:
    """
    Extract or optimize search query from user message.

    For now, we use the message directly. In the future, this could
    use NLP to extract key terms or rephrase for better search results.
    """
    # Truncate very long messages
    if len(message) > 200:
        # Take first sentence or first 200 chars
        first_sentence = message.split("。")[0].split("？")[0].split("!")[0]
        if len(first_sentence) > 20:
            return first_sentence[:200]
        return message[:200]

    return message
