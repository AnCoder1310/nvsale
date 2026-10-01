from typing import Any, TypedDict


class CopilotCitation(TypedDict, total=False):
    document_id: str
    source: str
    product_model: str
    effective_date: str


class CopilotState(TypedDict, total=False):
    """LangGraph state schema for AI Sales Copilot Agent."""

    query: str
    target_date: str | None
    intent: str
    product_model: str | None
    competitor_model: str | None
    retrieved_chunks: list[dict[str, Any]]
    context_text: str
    answer: str
    citations: list[CopilotCitation]
    talking_points: list[str]
    suggested_message: str
    suggested_next_question: str
    is_abstain: bool
    abstain_reason: str | None
    error: str | None
