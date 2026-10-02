from datetime import date
from types import SimpleNamespace

import pytest

from src.agents.copilot.graph import retrieve_node
from src.agents.copilot.intent_router import classify_intent
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
