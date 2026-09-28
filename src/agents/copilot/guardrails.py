from typing import Any

from src.agents.copilot.state import CopilotState


def apply_guardrails(state: CopilotState) -> dict[str, Any]:
    """Validate citations and enforce controlled abstention for out-of-scope queries."""
    intent = state.get("intent", "")
    is_abstain = state.get("is_abstain", False)

    # 1. Out-of-scope query guardrail
    if intent == "unsupported":
        return {
            "answer": (
                "Xin lỗi anh/chị, câu hỏi này nằm ngoài phạm vi tư vấn xe ô tô điện VinFast. "
                "Em là trợ lý AI chuyên hỗ trợ thông số kỹ thuật, bảng giá, chính sách pin/sạc "
                "và so sánh các dòng xe VinFast (VF 3 đến VF 9). Anh/chị cần tra cứu thông tin gì về xe VinFast không ạ?"
            ),
            "talking_points": ["Câu hỏi ngoài phạm vi nghiệp vụ tư vấn xe VinFast."],
            "suggested_message": "Dạ hiện tại em chỉ hỗ trợ tư vấn các thông tin chính hãng về xe điện VinFast thôi ạ.",
            "suggested_next_question": "Anh/chị có muốn tìm hiểu thêm về dòng xe nào của VinFast không ạ?",
            "citations": [],
            "is_abstain": True,
            "abstain_reason": "Out of scope query.",
        }

    # 2. Missing evidence / unretrieved chunks guardrail
    if is_abstain or not state.get("retrieved_chunks"):
        return {
            "answer": (
                "Hiện chưa có tài liệu hoặc thông báo chính thức về nội dung này trong hệ thống dữ liệu VinFast. "
                "Để đảm bảo tính chính xác, tư vấn viên vui lòng kiểm tra lại công văn nội bộ hoặc liên hệ phòng kinh doanh."
            ),
            "talking_points": ["Chưa có dữ liệu chính thức — không tự phỏng đoán thông số hoặc chính sách."],
            "suggested_message": (
                "Dạ vấn đề này hiện VinFast chưa có thông báo chính thức, em sẽ kiểm tra lại với quản lý "
                "và phản hồi anh/chị sớm nhất nhé ạ!"
            ),
            "suggested_next_question": "Ngoài ra anh/chị có băn khoăn thêm điểm nào về xe không ạ?",
            "citations": [],
            "is_abstain": True,
            "abstain_reason": state.get("abstain_reason") or "Insufficient knowledge evidence.",
        }

    return {"is_abstain": False}
