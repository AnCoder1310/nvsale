import re

VF_MODELS = ["VF 3", "VF 5", "VF 6", "VF 7", "VF 8", "VF 9"]
COMPETITOR_MODELS = [
    "Mazda CX-5",
    "CX-5",
    "Grand i10",
    "i10",
    "Vios",
    "Accent",
    "Creta",
    "Seltos",
    "Yaris Cross",
    "Corolla Cross",
    "CR-V",
    "Tucson",
    "Santa Fe",
]


def extract_models(query: str) -> tuple[str | None, str | None]:
    """Extract VinFast model and competitor model from the query string."""
    q_norm = (
        query.replace("VF3", "VF 3")
        .replace("VF5", "VF 5")
        .replace("VF6", "VF 6")
        .replace("VF7", "VF 7")
        .replace("VF8", "VF 8")
        .replace("VF9", "VF 9")
    )

    found_vf = None
    for m in VF_MODELS:
        if re.search(rf"\b{re.escape(m)}\b", q_norm, re.IGNORECASE):
            found_vf = m
            break

    found_comp = None
    for c in COMPETITOR_MODELS:
        if re.search(rf"\b{re.escape(c)}\b", query, re.IGNORECASE):
            found_comp = c
            break

    return found_vf, found_comp


def classify_intent(query: str) -> str:
    """Classify the sales advisory query intent."""
    q = query.lower()

    # Out-of-scope / Unsupported queries
    unsupported_keywords = [
        "thời tiết",
        "máy giặt",
        "nấu ăn",
        "bài thơ",
        "tổng thống",
        "bóng đá",
        "bitcoin",
        "chứng khoán",
        "xổ số",
        "du lịch đà nẵng",
    ]
    if any(k in q for k in unsupported_keywords):
        return "unsupported"

    # Battlecard comparison
    if any(k in q for k in ["so sánh", "đối thủ", "hơn gì", "khác gì", "nên mua xe nào", "chọn xe nào"]) or any(
        c.lower() in q for c in COMPETITOR_MODELS
    ):
        return "battlecard"

    # Policy: battery, charging, warranty
    if any(k in q for k in ["thuê pin", "mua đứt", "chính sách", "bảo hành", "trạm sạc", "v-green", "cứu hộ"]):
        return "policy"

    # Pricing & Promotion
    if any(
        k in q
        for k in ["giá", "lăn bánh", "khuyến mãi", "ưu đãi", "trả góp", "lãi suất", "trước bạ", "bao nhiêu tiền"]
    ):
        return "promotion"

    # Specifications & Features
    if any(
        k in q
        for k in [
            "thông số",
            "pin",
            "bao nhiêu km",
            "đi được",
            "sạc",
            "mã lực",
            "công suất",
            "khoảng sáng gầm",
            "kích thước",
            "chỗ ngồi",
            "vận hành",
        ]
    ):
        return "product_specs"

    # Default to general vinfast product query
    return "general"
