from datetime import date
from typing import Any

from langgraph.graph import END, StateGraph

from src.agents.copilot.answer_generator import generate_copilot_response
from src.agents.copilot.guardrails import apply_guardrails
from src.agents.copilot.intent_router import classify_intent, extract_models
from src.agents.copilot.state import CopilotState
from src.knowledge.retrieval_service import get_retrieval_service
from src.knowledge.schemas import DocumentType


async def classify_intent_node(state: CopilotState) -> dict[str, Any]:
    """Node 1: Classify intent and extract vehicle model identifiers."""
    query = state.get("query", "")
    intent = classify_intent(query)
    vf_model, comp_model = extract_models(query)

    return {
        "intent": intent,
        "product_model": vf_model,
        "competitor_model": comp_model,
    }


def route_after_intent(state: CopilotState) -> str:
    """Conditional Edge: Skip retrieval for unsupported out-of-scope questions."""
    if state.get("intent") == "unsupported":
        return "guardrails"
    return "retrieve"


async def retrieve_node(state: CopilotState) -> dict[str, Any]:
    """Node 2: Retrieve relevant knowledge chunks matching query and model."""
    query = state.get("query", "")
    product_model = state.get("product_model")
    date_str = state.get("target_date")
    target_d = date.fromisoformat(date_str) if date_str else date.today()

    retriever = get_retrieval_service()
    if state.get("intent") == "promotion" and product_model:
        # Price PDFs also contain many unrelated tables. Search within current
        # price lists, then keep only a chunk that actually mentions the model
        # and the vehicle MSRP rather than charger/paint-option prices.
        price_candidates = retriever.retrieve(
            query=query,
            product_model=product_model,
            document_type=DocumentType.PRICE_LIST.value,
            target_date=target_d,
            top_k=24,
        )
        chunks = [
            chunk
            for chunk in price_candidates
            if product_model.casefold() in chunk.content.casefold() and "Giá bán bán lẻ đề xuất" in chunk.content
        ][:1]
    else:
        chunks = retriever.retrieve(
            query=query,
            product_model=product_model,
            target_date=target_d,
            top_k=4,
        )

    chunks_data = [
        {
            "chunk_id": c.chunk_id,
            "document_id": c.document_id,
            "content": c.content,
            "metadata": c.metadata.model_dump(),
        }
        for c in chunks
    ]

    return {"retrieved_chunks": chunks_data}


async def generate_node(state: CopilotState) -> dict[str, Any]:
    """Node 3: Generate grounded answer, talking points, and customer message."""
    return await generate_copilot_response(state)


async def guardrails_node(state: CopilotState) -> dict[str, Any]:
    """Node 4: Validate citations and enforce controlled abstention."""
    return apply_guardrails(state)


def build_copilot_graph() -> StateGraph:
    """Construct and compile the Copilot LangGraph StateGraph."""
    graph = StateGraph(CopilotState)

    # Add Nodes
    graph.add_node("classify_intent", classify_intent_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_node)
    graph.add_node("guardrails", guardrails_node)

    # Add Edges
    graph.set_entry_point("classify_intent")
    graph.add_conditional_edges(
        "classify_intent",
        route_after_intent,
        {
            "retrieve": "retrieve",
            "guardrails": "guardrails",
        },
    )
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", "guardrails")
    graph.add_edge("guardrails", END)

    return graph.compile()


copilot_agent = build_copilot_graph()
