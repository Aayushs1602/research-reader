import os
import urllib.parse
from fastapi import APIRouter
from app.schemas.schemas import AIDeepDiveRequest, AIDeepDiveResponse

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/deep-dive", response_model=AIDeepDiveResponse)
def deep_dive(payload: AIDeepDiveRequest):
    query_text = payload.selected_text.strip()
    encoded_query = urllib.parse.quote_plus(query_text)
    google_url = f"https://www.google.com/search?q={encoded_query}"

    # Generate helpful prompts, breakdown, and suggested follow-ups
    # If GEMINI_API_KEY or OPENAI_API_KEY is configured in the environment,
    # this can call the LLM directly. For now, we provide a clean, rich structured response.
    mode_label = {
        "explain": "Explanation & Concept Breakdown",
        "summarize": "Executive Summary",
        "search_queries": "Recommended Search Keywords",
        "critique": "Critical Analysis & Methodology Review",
    }.get(payload.mode, "Deep Dive")

    explanation = (
        f"**{mode_label} for:**\n> \"{query_text}\"\n\n"
        f"This topic can be explored directly in academic literature or web search. "
        f"Key angles to consider:\n"
        f"1. Core underlying mechanisms or definitions.\n"
        f"2. Contextual usage in the paper's domain.\n"
        f"3. Practical implications and related work."
    )

    words = [w for w in query_text.split() if len(w) > 3]
    top_keywords = " ".join(words[:4]) if words else query_text

    followups = [
        f"What are the primary criticisms of {top_keywords}?",
        f"How does {top_keywords} compare with modern alternatives?",
        f"Real-world benchmark results for {top_keywords}",
    ]

    return AIDeepDiveResponse(
        query=query_text,
        explanation=explanation,
        google_search_url=google_url,
        suggested_followups=followups,
    )
