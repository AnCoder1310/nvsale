# Khung đánh giá năng lực tư vấn bán hàng

*Chủ quản: Đạt (Data/Eval Lead) và Duy (Role-play Lead)*

## 1. Nguyên tắc

Rubric đánh giá hành vi có thể quan sát trong transcript, không đánh giá tính cách
và không yêu cầu advisor lặp lại một “ideal script”. Mỗi điểm phải có turn ID,
exact quote và lý do giải thích quote đó đáp ứng anchor nào.

Năm chiều dùng cùng thang 1–5 nhưng có anchor riêng:

1. Need Discovery.
2. Product Knowledge.
3. Objection Handling.
4. Policy Accuracy.
5. Closing / Next Step.

Mỗi criterion có một trong ba trạng thái:

- `ASSESSED`: có cơ hội hợp lý và đủ evidence; bắt buộc có score 1–5.
- `NOT_OBSERVED`: scenario không tạo cơ hội hợp lý; score phải là `null`.
- `INSUFFICIENT_EVIDENCE`: transcript hoặc nguồn không đủ để kết luận; score phải
  là `null`.

Không dùng `NOT_OBSERVED` để che một missed opportunity. Nếu cơ hội đã xuất hiện mà
advisor không thực hiện hành vi cần thiết, criterion vẫn là `ASSESSED` và nhận điểm
phù hợp.

## 2. Observable checks

LLM chỉ phân loại các hành vi hẹp; code kiểm tra schema, evidence và tính aggregate.
Mỗi check có verdict:

```text
MET | MISSED | NOT_APPLICABLE | UNCLEAR
```

Keyword matching chỉ dùng khi một exact phrase thật sự bắt buộc. Với discovery và
sales behavior thông thường, evaluator phải hiểu paraphrase tiếng Việt.

### Need Discovery checks

- Tìm hiểu mục đích sử dụng liên quan đến scenario.
- Nhận diện ít nhất một constraint hoặc priority có ý nghĩa.
- Hỏi follow-up dựa trên thông tin khách vừa cung cấp.
- Dùng thông tin đã khám phá trong phần tư vấn sau đó.

### Product Knowledge checks

- Chỉ đưa ra claim sản phẩm có thể kiểm tra bằng nguồn được phê duyệt.
- Phân biệt đúng model/variant/context khi thông tin phụ thuộc phiên bản.
- Giải thích tính năng trong quan hệ với nhu cầu đã khám phá.
- Nêu giới hạn hoặc hỏi làm rõ khi evidence chưa đủ.

### Objection Handling checks

- Ghi nhận đúng băn khoăn thay vì phủ nhận hoặc né tránh.
- Làm rõ nguyên nhân thật của objection khi cần.
- Phản hồi trực tiếp bằng reasoning/evidence phù hợp.
- Kiểm tra lại xem băn khoăn đã được xử lý hay cần bước tiếp theo.

### Policy Accuracy checks

- Claim policy/giá/ưu đãi khớp nguồn được phê duyệt.
- Nêu điều kiện quan trọng ảnh hưởng đến eligibility hoặc quyền lợi.
- Không trình bày policy hết hiệu lực hoặc không xác minh như fact hiện hành.
- Thừa nhận cần kiểm tra thêm khi knowledge base chưa đủ evidence.

### Closing / Next Step checks

- Tóm tắt hoặc liên kết next step với nhu cầu/băn khoăn của khách.
- Đề xuất hành động phù hợp với mức sẵn sàng, không ép chốt.
- Làm rõ owner hoặc cách tiếp tục khi phù hợp.
- Làm rõ thời gian/kênh theo dõi khi cuộc hội thoại tạo cơ hội hợp lý.

Các check là evidence units, không phải công thức đếm máy móc dùng giống nhau cho
mọi dimension. Score phải thỏa anchor bên dưới; code có thể dùng check verdict để
kiểm tra tính nhất quán và phát hiện score không hợp lý.

## 3. Anchor 1–5 theo từng chiều

### 3.1. Need Discovery

| Điểm | Anchor quan sát được |
|---:|---|
| 1 | Có cơ hội rõ ràng nhưng không hỏi nhu cầu liên quan, hoặc tư vấn dựa trên giả định gây sai hướng. |
| 2 | Có một câu hỏi rộng/đóng nhưng không tìm được priority hay constraint sử dụng được. |
| 3 | Xác định được ít nhất một nhu cầu quan trọng và có follow-up hợp lý. |
| 4 | Khám phá nhiều yếu tố liên quan và dùng chúng để điều chỉnh tư vấn. |
| 5 | Discovery có trọng tâm, tự nhiên, xác định được yếu tố quyết định và liên kết nhất quán xuyên suốt hội thoại. |

### 3.2. Product Knowledge

| Điểm | Anchor quan sát được |
|---:|---|
| 1 | Đưa claim sản phẩm bị nguồn mâu thuẫn hoặc nhầm model/variant gây ảnh hưởng tư vấn. |
| 2 | Có thông tin đúng một phần nhưng còn claim không được hỗ trợ hoặc không trả lời đúng nhu cầu. |
| 3 | Các claim chính được hỗ trợ và giải thích đúng ở mức cơ bản. |
| 4 | Thông tin chính xác, có điều kiện cần thiết và được liên hệ rõ với nhu cầu khách. |
| 5 | Chọn lọc evidence rất tốt, giải thích trade-off/giới hạn minh bạch và không phóng đại. |

Không bắt buộc phải nêu nhiều con số. Một câu trả lời ngắn, đúng và phù hợp có thể
được điểm cao hơn một feature dump dài.

### 3.3. Objection Handling

| Điểm | Anchor quan sát được |
|---:|---|
| 1 | Tranh cãi, phủ nhận băn khoăn, né tránh hoàn toàn hoặc dùng claim nguy hiểm để ép khách. |
| 2 | Có ghi nhận nhưng phản hồi chung chung, không xử lý nguyên nhân chính. |
| 3 | Hiểu đúng objection và đưa phản hồi hợp lý nhưng follow-up/kiểm tra còn hạn chế. |
| 4 | Ghi nhận, làm rõ và xử lý objection bằng reasoning/evidence phù hợp; kiểm tra lại phản ứng khách. |
| 5 | Xử lý linh hoạt, minh bạch trade-off, giữ được niềm tin và chọn next step phù hợp ngay cả khi chưa thể giải quyết hoàn toàn. |

Objection không cần “biến mất” để advisor được điểm tốt. Giữ nguyên băn khoăn và
hẹn xác minh có thể là hành vi đúng khi evidence chưa đủ.

### 3.4. Policy Accuracy

| Điểm | Anchor quan sát được |
|---:|---|
| 1 | Có claim bị nguồn hiện hành mâu thuẫn hoặc hứa điều kiện/quyền lợi không có căn cứ. |
| 2 | Có claim unverifiable được nói như chắc chắn, hoặc bỏ sót điều kiện trọng yếu làm thay đổi ý nghĩa. |
| 3 | Claim chính được hỗ trợ nhưng thiếu một số điều kiện/giới hạn không mang tính quyết định. |
| 4 | Claim và điều kiện quan trọng đều được hỗ trợ; advisor phân biệt rõ fact với điều cần xác minh. |
| 5 | Chính xác, đầy đủ trong phạm vi câu hỏi, giải thích eligibility/trade-off minh bạch và xử lý tốt trường hợp nguồn thiếu hoặc xung đột. |

Rubric không hard-code giá, ưu đãi, bảo hành, lãi suất hoặc mốc dung lượng pin.
Những fact thay đổi theo thời gian phải đến từ tài liệu được phê duyệt; factual
finding phải lưu source ID và version đã dùng để kiểm tra claim.

### 3.5. Closing / Next Step

| Điểm | Anchor quan sát được |
|---:|---|
| 1 | Không có hướng tiếp tục dù có cơ hội rõ ràng, hoặc ép cọc/chốt không phù hợp. |
| 2 | Đề xuất chung chung, không liên quan rõ tới điều khách cần. |
| 3 | Có next step phù hợp và khả thi nhưng chưa làm rõ cách/thời điểm tiếp tục. |
| 4 | Next step cụ thể, thuận tiện, liên kết với nhu cầu và mức sẵn sàng của khách. |
| 5 | Đồng thuận được next step rõ ràng mà không gây áp lực; xử lý hợp lý cả trường hợp khách chưa phù hợp hoặc cần xác minh thêm. |

Không mặc định “đồng ý mua” hoặc “đồng ý lái thử” là success. Kết thúc bằng một
bước xác minh, follow-up hoặc thừa nhận sản phẩm chưa phù hợp vẫn có thể đúng.

## 4. Factual findings

Factual claim được đánh giá tách khỏi sales behavior:

- `SUPPORTED`: nguồn được phê duyệt hỗ trợ claim trong đúng context.
- `CONTRADICTED`: nguồn được phê duyệt mâu thuẫn với claim.
- `UNVERIFIABLE`: knowledge base chưa đủ evidence để kết luận.

Mỗi finding lưu claim text, transcript turn ID, source/version/span khi có và mức
độ nghiêm trọng. `UNVERIFIABLE` không tự động có nghĩa advisor sai; tuy nhiên một
lời cam kết chắc chắn không có căn cứ có thể ảnh hưởng Policy Accuracy.

Runtime lưu evidence có nguồn trong `source_references`, mỗi phần tử gồm
`source_id`, `version` và exact `quote` từ tài liệu được duyệt. `source_ids` được
giữ làm trường tương thích/tìm kiếm nhanh nhưng phải khớp các reference này.

Critical factual finding luôn hiển thị riêng, không bị che bởi overall score.

## 5. Tính điểm và coverage

- Backend tính overall score trên các criterion `ASSESSED`; LLM không tự cung cấp
  một số tổng độc lập.
- Kết quả phải hiển thị `assessed_criteria_count / 5`.
- Không hiển thị phần trăm năng lực nếu chưa có định nghĩa đã hiệu chuẩn.
- `passed` để `null` cho tới khi team định nghĩa ngưỡng và quy tắc critical error.
- AI result luôn là provisional. Chỉ attempt được submit và Manager approve mới là
  kết quả chính thức.

## 6. Evaluator output

```json
{
  "session_id": "SES_TEST_001",
  "scenario_id": "SCENARIO_01",
  "rubric_version": "v2",
  "assessed_criteria_count": 4,
  "overall_score": 3.75,
  "passed": null,
  "evaluations": [
    {
      "criterion": "need_discovery",
      "status": "assessed",
      "score": 4,
      "checks": [
        {
          "check_id": "identified_intended_use",
          "verdict": "met",
          "evidence": [{"message_id": "turn-4", "quote": "Anh thường dùng xe để đi làm hay chạy dịch vụ?"}],
          "reason": "Advisor asked directly about intended use."
        }
      ],
      "evidence": [{"message_id": "turn-4", "quote": "Anh thường dùng xe để đi làm hay chạy dịch vụ?"}],
      "reason": "Advisor identified intended use and followed up on the answer.",
      "improvement_suggestion": "Ask about charging access before recommending a configuration."
    },
    {
      "criterion": "closing_next_step",
      "status": "not_observed",
      "score": null,
      "checks": [],
      "evidence": [],
      "reason": "The session ended before a fair closing opportunity occurred.",
      "improvement_suggestion": null
    }
  ],
  "factual_findings": [
    {
      "claim": "...",
      "message_id": "turn-7",
      "status": "unverifiable",
      "source_ids": [],
      "severity": "warning",
      "reason": "No approved source supports or contradicts the claim."
    }
  ],
  "summary_strengths": ["..."],
  "summary_weaknesses": ["..."],
  "recommended_next_practice": {
    "type": "scenario",
    "target_id": "price_objection_v2",
    "reason": "Objection Handling is the main assessed weakness."
  },
  "review_status": "ai_draft"
}
```

## 7. Validation và hiệu chuẩn

1. Chạy trên calibration set riêng gồm weak, adequate, strong, factual-error và
   partial/not-observed cases.
2. Giữ held-out transcripts tách khỏi prompt/rubric tuning.
3. Reviewer chấm độc lập mà không thấy AI score; lưu label gốc và adjudication.
4. Báo cáo MAE, exact agreement, within-one agreement, applicability agreement,
   evidence correctness, critical factual miss rate và repeat stability.
5. Không tính năm criterion trong một transcript thành năm ca độc lập.
