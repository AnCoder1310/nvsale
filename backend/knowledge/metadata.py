"""
Data Contract, Metadata Schema & Ingestion Validation Helpers.
Chủ quản: Đạt (Data, Knowledge & Evaluation)
Phối hợp: Chương (Platform/RAG), Duy (Role-play), An (Frontend)
"""
from datetime import date
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, ValidationError, model_validator

# =====================================================================
# 1. ENUMS & SCHEMAS CHO KHO TRI THỨC (KNOWLEDGE BASE)
# =====================================================================

class DocumentType(StrEnum):
    PRODUCT_SPECS = "product_specs"       # Thông số kỹ thuật xe
    BATTLECARD = "battlecard"             # Thẻ so sánh đối kháng với xe đối thủ
    PRICE_LIST = "price_list"             # Bảng giá niêm yết, lăn bánh
    POLICY = "policy"                     # Chính sách bảo hành, pin, cứu hộ
    PROMOTION = "promotion"               # Ưu đãi, lãi suất, quà tặng
    FAQ = "faq"                           # Hỏi đáp thắc mắc thường gặp


class PolicyType(StrEnum):
    BATTERY = "battery"                   # Thuê pin vs Mua đứt pin
    CHARGING = "charging"                 # Mạng lưới V-GREEN, chi phí sạc
    FINANCING = "financing"               # Vay trả góp, hỗ trợ lãi suất
    TRADE_IN = "trade_in"                 # Thu cũ đổi mới
    GENERAL = "general"                   # Quy chế chung


class DocumentStatus(StrEnum):
    ACTIVE = "active"                     # Đang có hiệu lực
    EXPIRED = "expired"                   # Đã hết hiệu lực
    DRAFT = "draft"                       # Bản nháp / Chưa công bố


class SalesScriptPayload(BaseModel):
    """Cấu trúc dữ liệu phản hồi nhanh trong 3 giây cho tư vấn viên online"""
    core_arguments: list[str] = Field(
        ...,
        description="2-3 gạch đầu dòng luận điểm cốt lõi, sales lướt qua trong 3 giây để nắm ý"
    )
    suggested_message: str = Field(
        ...,
        description="Mẫu tin nhắn hoàn chỉnh, văn phong chuẩn sales VinFast, có Call To Action"
    )


class NormalizedDocument(BaseModel):
    """Format tài liệu chuẩn nạp vào Vector Database & Ingestion Pipeline"""
    document_id: str = Field(..., description="ID định danh duy nhất của tài liệu")
    title: str = Field(..., description="Tiêu đề tài liệu")
    document_type: DocumentType
    product_model: str = Field(..., description="Dòng xe: VF 3, VF 5, VF 6, VF 7, VF 8, VF 9 hoặc ALL")
    competitor_model: str | None = Field(None, description="Tên xe đối thủ so sánh (nếu là battlecard)")
    policy_type: PolicyType | None = None
    effective_date: date = Field(..., description="Ngày bắt đầu có hiệu lực (YYYY-MM-DD)")
    expiry_date: date | None = Field(None, description="Ngày hết hiệu lực (nếu có)")
    source: str = Field(..., description="Nguồn trích dẫn / Số công văn nội bộ")
    source_url: str | None = Field(None, description="URL nguồn gốc khi có")
    version: str = Field(default="1.0", description="Phiên bản tài liệu")
    status: DocumentStatus = DocumentStatus.ACTIVE
    content: str = Field(..., description="Nội dung chi tiết dùng để chunking & embedding")
    sales_script: SalesScriptPayload | None = Field(None, description="Script gợi ý trả lời nhanh")


class ChunkMetadata(BaseModel):
    """Metadata lưu kèm từng vector chunk trong pgvector phục vụ metadata filtering"""
    chunk_id: str = Field(..., description="Mã định danh duy nhất của chunk")
    document_id: str = Field(..., description="ID của tài liệu gốc")
    document_type: DocumentType
    product_model: str
    policy_type: PolicyType | None = None
    effective_date: date
    expiry_date: date | None = None
    status: DocumentStatus
    source: str
    version: str = Field(default="1.0", description="Phiên bản tài liệu gốc")
    chunk_index: int = Field(..., description="Thứ tự chunk trong tài liệu")


class IngestedChunk(BaseModel):
    """Cấu trúc chunk hoàn chỉnh bàn giao cho RAG runtime của Chương"""
    chunk_id: str
    document_id: str
    content: str
    metadata: ChunkMetadata


# =====================================================================
# 2. SCHEMAS CHO TÍNH NĂNG ĐÁNH GIÁ KHÁCH HÀNG (LEAD SCORING)
# =====================================================================

class LeadTier(StrEnum):
    HOT = "hot"       # Rất tiềm năng: có ngân sách rõ ràng, cần xe gấp, băn khoăn đã giải tỏa
    WARM = "warm"     # Khá tiềm năng: đang so sánh xe khác hoặc cần bàn thêm với gia đình
    COLD = "cold"     # Tiềm năng thấp: hỏi tham khảo giá, chưa có kế hoạch mua cụ thể


class CustomerAssessment(BaseModel):
    """Kết quả phân tích chân dung khách hàng sau phiên tư vấn online"""
    lead_tier: LeadTier = Field(..., description="Phân loại mức độ tiềm năng")
    interest_level: int = Field(..., ge=1, le=5, description="Mức độ hứng thú (1-5)")
    budget_readiness: str = Field(..., description="Khả năng tài chính (đủ tiền mặt/cần vay góp)")
    core_objections: list[str] = Field(default_factory=list, description="Các băn khoăn chính khách còn vướng")
    recommended_next_action: str = Field(..., description="Hành động tiếp theo sales nên làm")


# =====================================================================
# 3. SCHEMAS CHO CHẤM ĐIỂM & ĐÁNH GIÁ ĐÀO TẠO (EVALUATION CONTRACT)
# =====================================================================

class CriterionType(StrEnum):
    NEED_DISCOVERY = "need_discovery"
    PRODUCT_KNOWLEDGE = "product_knowledge"
    OBJECTION_HANDLING = "objection_handling"
    POLICY_ACCURACY = "policy_accuracy"
    CLOSING_NEXT_STEP = "closing_next_step"


class CriterionStatus(StrEnum):
    ASSESSED = "assessed"
    NOT_OBSERVED = "not_observed"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class CheckVerdict(StrEnum):
    MET = "met"
    MISSED = "missed"
    NOT_APPLICABLE = "not_applicable"
    UNCLEAR = "unclear"


class FactualClaimStatus(StrEnum):
    SUPPORTED = "supported"
    CONTRADICTED = "contradicted"
    UNVERIFIABLE = "unverifiable"


class ReviewStatus(StrEnum):
    AI_DRAFT = "ai_draft"
    PENDING_MANAGER_REVIEW = "pending_manager_review"
    MANAGER_APPROVED = "manager_approved"


class TranscriptEvidence(BaseModel):
    message_id: str = Field(..., min_length=1)
    quote: str = Field(..., min_length=1)


class ObservableCheckResult(BaseModel):
    check_id: str = Field(..., min_length=1)
    verdict: CheckVerdict
    evidence: list[TranscriptEvidence] = Field(default_factory=list)
    reason: str = Field(..., min_length=1)


class CriterionEvaluation(BaseModel):
    """Kết quả đánh giá từng tiêu chí trong Rubric"""
    criterion: CriterionType
    status: CriterionStatus
    score: int | None = Field(None, ge=1, le=5, description="Điểm 1-5 khi status=assessed")
    checks: list[ObservableCheckResult] = Field(default_factory=list)
    evidence: list[TranscriptEvidence] = Field(default_factory=list)
    reason: str = Field(..., min_length=1, description="Lý do cho score/status")
    improvement_suggestion: str | None = Field(None, description="Một hành động cải thiện cụ thể")

    @model_validator(mode="after")
    def validate_status_and_score(self) -> "CriterionEvaluation":
        if self.status == CriterionStatus.ASSESSED:
            if self.score is None:
                raise ValueError("assessed criterion requires a score")
            if not self.evidence:
                raise ValueError("assessed criterion requires transcript evidence")
        elif self.score is not None:
            raise ValueError("unassessed criterion must not contain a score")
        return self


class FactualFinding(BaseModel):
    claim: str = Field(..., min_length=1)
    message_id: str = Field(..., min_length=1)
    status: FactualClaimStatus
    source_ids: list[str] = Field(default_factory=list)
    severity: str = Field(default="info", pattern="^(info|warning|critical)$")
    reason: str = Field(..., min_length=1)


class RecommendedNextPractice(BaseModel):
    type: str = Field(..., pattern="^(scenario|document)$")
    target_id: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)


class SessionEvaluationResult(BaseModel):
    """Kết quả đánh giá hoàn chỉnh của một phiên luyện tập Role-play"""
    session_id: str
    scenario_id: str
    rubric_version: str = Field(..., min_length=1)
    assessed_criteria_count: int = Field(..., ge=0, le=5)
    overall_score: float | None = Field(None, ge=1.0, le=5.0)
    passed: bool | None = None
    evaluations: list[CriterionEvaluation] = Field(min_length=5, max_length=5)
    factual_findings: list[FactualFinding] = Field(default_factory=list)
    summary_strengths: list[str] = Field(default_factory=list)
    summary_weaknesses: list[str] = Field(default_factory=list)
    recommended_next_practice: RecommendedNextPractice | None = None
    review_status: ReviewStatus = ReviewStatus.AI_DRAFT

    @model_validator(mode="after")
    def validate_criteria_and_aggregate(self) -> "SessionEvaluationResult":
        criteria = [item.criterion for item in self.evaluations]
        if len(criteria) != len(set(criteria)):
            raise ValueError("criterion evaluations must be unique")

        assessed_scores = [
            item.score
            for item in self.evaluations
            if item.status == CriterionStatus.ASSESSED and item.score is not None
        ]
        if self.assessed_criteria_count != len(assessed_scores):
            raise ValueError("assessed_criteria_count does not match evaluations")
        if assessed_scores and self.overall_score is None:
            raise ValueError("overall_score is required when criteria are assessed")
        if assessed_scores and self.overall_score is not None:
            expected_score = sum(assessed_scores) / len(assessed_scores)
            if abs(self.overall_score - expected_score) > 1e-6:
                raise ValueError("overall_score must equal the mean of assessed criteria")
        if not assessed_scores and self.overall_score is not None:
            raise ValueError("overall_score must be null when no criteria are assessed")
        return self


# =====================================================================
# 4. HELPER FUNCTIONS CHO METADATA VALIDATION & INGESTION (Checkpoint Đ2)
# =====================================================================

REQUIRED_METADATA_FIELDS = [
    "document_id", "title", "document_type", "product_model",
    "effective_date", "source", "version", "status", "content"
]


def detect_missing_metadata(raw_data: dict[str, Any]) -> list[str]:
    """Phát hiện các trường bắt buộc bị thiếu hoặc rỗng"""
    missing = []
    for field in REQUIRED_METADATA_FIELDS:
        if field not in raw_data or raw_data[field] is None:
            missing.append(field)
        elif isinstance(raw_data[field], str) and raw_data[field].strip() == "":
            missing.append(field)
    return missing


def validate_policy_dates(effective_date: date, expiry_date: date | None) -> bool:
    """Kiểm tra tính hợp lệ của ngày: expiry_date không được diễn ra trước effective_date"""
    if expiry_date is not None and expiry_date < effective_date:
        return False
    return True


def is_active_policy(doc: NormalizedDocument, target_date: date | None = None) -> bool:
    """Kiểm tra chính sách có đang còn hiệu lực tại thời điểm truy vấn hay không"""
    check_date = target_date or date.today()
    if doc.status != DocumentStatus.ACTIVE:
        return False
    if doc.effective_date > check_date:
        return False
    if doc.expiry_date and doc.expiry_date < check_date:
        return False
    return True


def detect_duplicate_version(existing_docs: list[dict[str, Any]], new_doc: dict[str, Any]) -> bool:
    """Kiểm tra tài liệu đã tồn tại phiên bản trùng lặp trong cơ sở dữ liệu chưa"""
    for doc in existing_docs:
        if doc.get("document_id") == new_doc.get("document_id") and str(doc.get("version")) == str(new_doc.get("version")):
            return True
    return False


def validate_metadata(raw_data: dict[str, Any]) -> dict[str, Any]:
    """
    Hàm tổng hợp validate toàn bộ record trước khi nạp vào vector store.
    Trả về dict dạng: {"is_valid": bool, "errors": List[str], "validated_doc": Optional[NormalizedDocument]}
    """
    errors = []

    # 1. Kiểm tra trường rỗng
    missing_fields = detect_missing_metadata(raw_data)
    if missing_fields:
        errors.append(f"Missing required fields: {', '.join(missing_fields)}")

    # 2. Kiểm tra logic ngày tháng nếu có đủ trường
    if "effective_date" in raw_data and raw_data.get("effective_date"):
        try:
            eff_date = raw_data["effective_date"]
            if isinstance(eff_date, str):
                eff_date = date.fromisoformat(eff_date)
            exp_date = raw_data.get("expiry_date")
            if exp_date and isinstance(exp_date, str):
                exp_date = date.fromisoformat(exp_date)
            if not validate_policy_dates(eff_date, exp_date):
                errors.append(f"Invalid date range: expiry_date ({exp_date}) precedes effective_date ({eff_date})")
        except ValueError as e:
            errors.append(f"Date format error: {str(e)}")

    # 3. Pydantic Type Validation
    validated_doc = None
    if not errors:
        try:
            validated_doc = NormalizedDocument(**raw_data)
        except ValidationError as e:
            errors.extend([f"Field '{err['loc'][0]}': {err['msg']}" for err in e.errors()])

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "validated_doc": validated_doc
    }
