from datetime import date
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from src.agents.copilot.answer_generator import CopilotGenerationError, generate_copilot_response
from src.agents.copilot.graph import retrieve_node
from src.agents.copilot.intent_router import classify_intent
from src.api.copilot import CopilotQueryRequest, query_copilot
from src.knowledge.schemas import ChunkMetadata, KnowledgeChunk


def _price_chunk(chunk_id: str, content: str) -> KnowledgeChunk:
    return KnowledgeChunk(
        chunk_id=chunk_id,
        document_id="PRICE_LIST_CURRENT",
        content=content,
        metadata=ChunkMetadata(
            chunk_id=chunk_id,
            document_id="PRICE_LIST_CURRENT",
            title="Price list",
            document_type="price_list",
            product_model="ALL",
            effective_date=date(2026, 9, 19),
            source="Official price list",
        ),
    )


@pytest.mark.asyncio
async def test_price_retrieval_keeps_vehicle_msrp_chunk(monkeypatch):
    seen = {}

    def retrieve(**kwargs):
        seen.update(kwargs)
        return [
            _price_chunk("charger", "VF 5 charger | 11.000.000 VNĐ"),
            _price_chunk("other", "Giá bán bán lẻ đề xuất\nVF 6 | Plus | 699.000.000 VNĐ"),
            _price_chunk("vehicle", "Giá bán bán lẻ đề xuất\nVF 5 | Plus | 496.000.000 VNĐ"),
        ]

    monkeypatch.setattr("src.agents.copilot.graph.get_retrieval_service", lambda: SimpleNamespace(retrieve=retrieve))
    result = await retrieve_node({"query": "Giá niêm yết VF 5 Plus?", "intent": "promotion", "product_model": "VF 5"})

    assert seen["document_type"] == "price_list"
    assert [chunk["chunk_id"] for chunk in result["retrieved_chunks"]] == ["vehicle"]


@pytest.mark.asyncio
async def test_price_retrieval_abstains_when_msrp_not_found(monkeypatch):
    monkeypatch.setattr(
        "src.agents.copilot.graph.get_retrieval_service",
        lambda: SimpleNamespace(retrieve=lambda **kwargs: [_price_chunk("charger", "VF 5 charger | 11.000.000 VNĐ")]),
    )
    result = await retrieve_node({"query": "Giá niêm yết VF 5 Plus?", "intent": "promotion", "product_model": "VF 5"})
    assert result["retrieved_chunks"] == []


def test_unknown_vf_model_is_out_of_scope():
    assert classify_intent("Giá VF 10 mẫu 2029 là bao nhiêu?") == "unsupported"
    assert classify_intent("Giá VF5 Plus là bao nhiêu?") == "promotion"


@pytest.mark.asyncio
async def test_provider_failure_is_not_disguised_as_grounded_answer(monkeypatch):
    settings = SimpleNamespace(
        app_env="development",
        openai_api_key="",
        openrouter_api_key="configured-placeholder-key",
        gemini_api_key="",
        grok_api_key="",
    )
    monkeypatch.setattr("src.agents.copilot.answer_generator.get_settings", lambda: settings)
    monkeypatch.setattr("src.agents.copilot.answer_generator.get_llm", lambda: (_ for _ in ()).throw(TimeoutError()))
    state = {
        "query": "Giá VF 5?",
        "retrieved_chunks": [
            {
                "content": "VF 5 | Plus | 496.000.000 VNĐ",
                "metadata": {
                    "document_id": "PRICE_LIST_CURRENT",
                    "source": "Official price list",
                    "product_model": "ALL",
                    "effective_date": "2026-09-19",
                },
            }
        ],
    }

    with pytest.raises(CopilotGenerationError):
        await generate_copilot_response(state)


@pytest.mark.asyncio
async def test_copilot_api_exposes_retryable_provider_failure(monkeypatch):
    async def fail(_state):
        raise CopilotGenerationError("internal provider detail")

    monkeypatch.setattr("src.api.copilot.copilot_agent.ainvoke", fail)
    with pytest.raises(HTTPException) as error:
        await query_copilot(CopilotQueryRequest(query="Giá VF 5?"))

    assert error.value.status_code == 503
    assert "internal provider detail" not in error.value.detail
