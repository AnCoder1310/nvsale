import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from src.agents.copilot.state import CopilotCitation, CopilotState
from src.config import get_settings
from src.services.llm import get_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Bạn là AI Sales Copilot chuyên nghiệp hỗ trợ tư vấn viên bán xe ô tô điện VinFast (VinFast Auto).

NHIỆM VỤ:
1. Dựa DUY NHẤT vào các tài liệu trích xuất (Context) được cung cấp bên dưới để trả lời câu hỏi của tư vấn viên.
2. Trích dẫn chính xác nguồn thông tin và mã tài liệu (source, document_id).
3. Đưa ra 2-3 gạch đầu dòng luận điểm bán hàng cốt lõi (talking points) để tư vấn viên lướt qua trong 3 giây.
4. Viết một mẫu tin nhắn hoàn chỉnh (suggested message), văn phong chuẩn sales VinFast, lịch sự, thân thiện và có lời kêu gọi hành động (Call To Action - CTA).
5. Gợi ý 1 câu hỏi đào sâu nhu cầu (suggested next question) để sales tiếp tục dẫn dắt cuộc trò chuyện.
6. TUYỆT ĐỐI không bịa đặt thông số, giá bán, chính sách pin hoặc ưu đãi nếu không có trong Context.

ĐỊNH DẠNG TRẢ VỀ:
Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ theo cấu trúc sau:
{
    "answer": "Câu trả lời chi tiết và chính xác...",
    "talking_points": ["Luận điểm 1", "Luận điểm 2"],
    "suggested_message": "Dạ em chào anh/chị, về xe...",
    "suggested_next_question": "Anh/chị dự định..."
}
"""


def _fallback_extract_from_chunks(chunks: list[dict[str, Any]], query: str) -> dict[str, Any]:
    """Fallback generator extracting answers directly from ingested chunk metadata/sales_script."""
    if not chunks:
        return {
            "answer": "Không tìm thấy tài liệu phù hợp trong kho kiến thức để trả lời câu hỏi này.",
            "talking_points": [],
            "suggested_message": "",
            "suggested_next_question": "",
        }

    first_chunk = chunks[0]
    content = first_chunk.get("content", "")

    # Split content and sales script if appended
    parts = content.split("\n[Gợi ý bán hàng]:")
    main_fact = parts[0].strip()

    talking_points = []
    suggested_message = ""
    if len(parts) > 1:
        script_part = parts[1]
        msg_parts = script_part.split("\n[Mẫu tin nhắn]:")
        bullets_text = msg_parts[0].strip()
        talking_points = [b.strip("- ") for b in bullets_text.split("- ") if b.strip()]
        if len(msg_parts) > 1:
            suggested_message = msg_parts[1].strip()

    if not talking_points:
        talking_points = [main_fact[:150] + "..."]

    if not suggested_message:
        suggested_message = (
            f"Dạ em gửi anh/chị thông tin chính hãng từ VinFast: {main_fact[:200]}... "
            "Anh/chị cần em hỗ trợ thêm chi tiết nào không ạ?"
        )

    return {
        "answer": main_fact,
        "talking_points": talking_points[:3],
        "suggested_message": suggested_message,
        "suggested_next_question": "Anh/chị đang quan tâm mua xe để phục vụ gia đình hay chạy dịch vụ ạ?",
    }


async def generate_copilot_response(state: CopilotState) -> dict[str, Any]:
    """Generate grounded answer, talking points, and customer message from retrieved context."""
    chunks = state.get("retrieved_chunks", [])
    query = state.get("query", "")

    if not chunks:
        return {
            "answer": "Hiện chưa có thông tin hoặc tài liệu chính thức về vấn đề này trong cơ sở dữ liệu VinFast.",
            "talking_points": [],
            "suggested_message": "",
            "suggested_next_question": "",
            "is_abstain": True,
            "abstain_reason": "No relevant documents found in knowledge base.",
        }

    # Format context and citations
    context_blocks = []
    citations: list[CopilotCitation] = []

    for c in chunks:
        meta = c.get("metadata", {})
        doc_id = meta.get("document_id", "")
        source = meta.get("source", "")
        model = meta.get("product_model", "")
        eff_date = str(meta.get("effective_date", ""))
        content = c.get("content", "")

        context_blocks.append(f"--- TÀI LIỆU: {doc_id} ({source}, Dòng xe: {model}) ---\n{content}")
        citations.append(
            CopilotCitation(
                document_id=doc_id,
                source=source,
                product_model=model,
                effective_date=eff_date,
            )
        )

    context_str = "\n\n".join(context_blocks)

    settings = get_settings()
    has_valid_key = bool(
        (settings.openai_api_key and settings.openai_api_key.startswith("sk-") and len(settings.openai_api_key) > 20)
        or (settings.openrouter_api_key and len(settings.openrouter_api_key) > 10)
        or (settings.gemini_api_key and len(settings.gemini_api_key) > 10)
        or (settings.grok_api_key and len(settings.grok_api_key) > 10)
    )

    if not has_valid_key or settings.app_env == "test":
        fallback = _fallback_extract_from_chunks(chunks, query)
        fallback["context_text"] = context_str
        fallback["citations"] = citations
        fallback["is_abstain"] = False
        return fallback

    try:
        llm = get_llm()
        user_prompt = (
            f"CÂU HỎI TƯ VẤN VIÊN: {query}\n\nCONTEXT:\n{context_str}\n\nHãy trả về JSON đúng định dạng yêu cầu:"
        )
        response = await llm.ainvoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )
        content_text = response.content
        if isinstance(content_text, list):
            content_text = " ".join([str(x) for x in content_text])

        # Clean markdown backticks if present
        cleaned = content_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        parsed = json.loads(cleaned.strip())

        return {
            "context_text": context_str,
            "answer": parsed.get("answer", ""),
            "citations": citations,
            "talking_points": parsed.get("talking_points", []),
            "suggested_message": parsed.get("suggested_message", ""),
            "suggested_next_question": parsed.get("suggested_next_question", ""),
            "is_abstain": False,
        }
    except Exception as e:
        logger.info("LLM invoke failed or unconfigured, using deterministic chunk extraction: %s", e)
        fallback = _fallback_extract_from_chunks(chunks, query)
        fallback["context_text"] = context_str
        fallback["citations"] = citations
        fallback["is_abstain"] = False
        return fallback
