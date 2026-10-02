import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.agents.copilot.answer_generator import CopilotGenerationError
from src.agents.copilot.graph import copilot_agent
from src.knowledge.retrieval_service import get_retrieval_service

router = APIRouter(prefix="/copilot", tags=["Copilot"])


class CopilotQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Câu hỏi hoặc băn khoăn của khách hàng/sales")
    target_date: str | None = Field(None, description="Ngày tra cứu hiệu lực (YYYY-MM-DD), mặc định hôm nay")


class CopilotQueryResponse(BaseModel):
    answer: str
    citations: list[dict[str, Any]]
    talking_points: list[str]
    suggested_message: str
    suggested_next_question: str
    is_abstain: bool
    intent: str | None = None
    product_model: str | None = None


class IngestResponse(BaseModel):
    status: str
    chunks_ingested: int
    message: str


@router.post("/query", response_model=CopilotQueryResponse)
async def query_copilot(request: CopilotQueryRequest) -> CopilotQueryResponse:
    """Xử lý câu hỏi của tư vấn viên qua AI Sales Copilot Agent."""
    try:
        result = await copilot_agent.ainvoke(
            {
                "query": request.query,
                "target_date": request.target_date,
            }
        )
        return CopilotQueryResponse(
            answer=result.get("answer", ""),
            citations=result.get("citations", []),
            talking_points=result.get("talking_points", []),
            suggested_message=result.get("suggested_message", ""),
            suggested_next_question=result.get("suggested_next_question", ""),
            is_abstain=result.get("is_abstain", False),
            intent=result.get("intent"),
            product_model=result.get("product_model"),
        )
    except CopilotGenerationError as exc:
        raise HTTPException(status_code=503, detail="Copilot is temporarily unavailable. Please retry.") from exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý Copilot: {str(e)}")


@router.get("/sources/{document_id}")
async def get_source_document(document_id: str) -> dict[str, Any]:
    """Tra cứu chi tiết toàn văn tài liệu gốc theo mã document_id."""
    corpus_path = Path("data/knowledge/corpus.json")
    if not corpus_path.exists():
        raise HTTPException(status_code=404, detail="Corpus data file not found")

    items = json.loads(corpus_path.read_text(encoding="utf-8"))
    for item in items:
        if item.get("document_id") == document_id:
            return item

    raise HTTPException(status_code=404, detail=f"Không tìm thấy tài liệu với ID: {document_id}")


@router.post("/ingest", response_model=IngestResponse)
async def trigger_ingestion() -> IngestResponse:
    """Nạp hoặc đồng bộ toàn bộ dữ liệu từ corpus.json vào Vector Database."""
    try:
        retriever = get_retrieval_service()
        count = retriever.ingest_corpus()
        return IngestResponse(
            status="success",
            chunks_ingested=count,
            message=f"Đã nạp thành công {count} chunks vào Vector Database.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
