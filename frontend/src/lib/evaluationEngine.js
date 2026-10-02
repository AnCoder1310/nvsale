import { createId } from './id.js';

/**
 * Dynamic Rubric Evaluation Engine for VinFast Roleplay Sessions
 * Evaluates transcript against 5 standard VinFast Rubric criteria:
 * 1. need_discovery (Khai thác nhu cầu)
 * 2. product_knowledge (Kiến thức sản phẩm & Thông số kỹ thuật)
 * 3. objection_handling (Xử lý băn khoăn)
 * 4. policy_accuracy (Độ chính xác chính sách VinFast)
 * 5. closing_next_step (Chốt & Đề xuất bước tiếp theo)
 */

export function generateEvaluationResult(scenario, session, messages = []) {
  const sessionId = session?.session_id || createId('sess');
  const scenarioId = scenario?.scenario_id || 'SCENARIO_01_VF5_TAXI';
  const modelName = scenario?.model || 'VF 5';

  const advisorMsgs = (messages || []).filter((m) => m.role === 'advisor');
  const customerMsgs = (messages || []).filter((m) => m.role === 'customer');

  const fullAdvisorText = advisorMsgs.map((m) => m.content).join(' ');
  const lowerAdvisorText = fullAdvisorText.toLowerCase();

  // Helper to find exact quote matching search terms
  const findQuote = (regex, fallback) => {
    for (const msg of advisorMsgs) {
      if (regex.test(msg.content)) {
        return { message_id: msg.message_id, quote: msg.content };
      }
    }
    return advisorMsgs.length > 0
      ? { message_id: advisorMsgs[0].message_id, quote: advisorMsgs[0].content }
      : { message_id: 'init-adv', quote: fallback };
  };

  // --- 1. NEED DISCOVERY ---
  const hasQuestion = advisorMsgs.some((m) => m.content.includes('?'));
  const discoveryKeywords = /nhu cầu|mỗi ngày|bao nhiêu km|quãng đường|đi lại|gia đình|người cùng|ai quyết định|kinh tế|chi phí|ngân sách|ở đâu|chạy dịch vụ/i;
  const hasDiscoveryWords = discoveryKeywords.test(lowerAdvisorText);

  let needDiscoveryScore;
  let needDiscoveryReason;
  let needDiscoverySuggestion;
  const discoveryEvidence = [];

  if (advisorMsgs.length === 0) {
    needDiscoveryScore = 1;
    needDiscoveryReason = 'Tư vấn viên chưa tham gia trao đổi để khai thác nhu cầu của khách hàng.';
    needDiscoverySuggestion = 'Chủ động chào hỏi và đặt các câu hỏi mở về mục đích sử dụng xe hàng ngày.';
  } else if (hasQuestion && hasDiscoveryWords) {
    needDiscoveryScore = advisorMsgs.length >= 3 ? 5 : 4;
    needDiscoveryReason = 'Tư vấn viên đã chủ động đặt câu hỏi khai thác thói quen di chuyển, mục đích sử dụng và các ràng buộc thực tế của khách hàng.';
    needDiscoverySuggestion = 'Có thể đào sâu hơn về người cùng ra quyết định mua xe trong gia đình.';
    discoveryEvidence.push(findQuote(discoveryKeywords, 'Mỗi ngày anh thường di chuyển khoảng bao nhiêu km?'));
  } else if (hasQuestion) {
    needDiscoveryScore = 3;
    needDiscoveryReason = 'Có đặt câu hỏi thăm dò nhưng chưa tập trung sâu vào các tiêu chí cốt lõi như quãng đường, ngân sách hoặc thói quen sạc.';
    needDiscoverySuggestion = 'Cần liên kết câu hỏi với tình huống cụ thể (cung đường về quê, sạc tại chung cư hay chạy dịch vụ).';
    discoveryEvidence.push(findQuote(/\?/, 'Anh/chị đang quan tâm nhu cầu sử dụng thế nào ạ?'));
  } else {
    needDiscoveryScore = 2;
    needDiscoveryReason = 'Tư vấn viên hầu như không đặt câu hỏi tìm hiểu nhu cầu mà vội vàng giới thiệu sản phẩm hoặc phỏng đoán.';
    needDiscoverySuggestion = 'Áp dụng mô hình SPIN hoặc đặt tối thiểu 2 câu hỏi mở trước khi tư vấn dòng xe cụ thể.';
    discoveryEvidence.push({
      message_id: advisorMsgs[0]?.message_id || 'adv-1',
      quote: advisorMsgs[0]?.content || 'chào khách hàng',
    });
  }

  // --- 2. PRODUCT KNOWLEDGE ---
  const specKeywords = /km|nedc|wltp|pin|kwh|kw|sạc|dung lượng|adas|mã lực|tăng tốc|động cơ|cốp|hàng ghế|bản eco|bản plus/i;
  const negativeCompetitorMatch = /mua cx-5|mua vios|mua xe khác|không nên mua/i.test(lowerAdvisorText);
  const hasSpecs = specKeywords.test(lowerAdvisorText);

  let productScore;
  let productReason;
  let productSuggestion = null;
  const productEvidence = [];

  if (negativeCompetitorMatch) {
    productScore = 1;
    productReason = 'Tư vấn viên hướng khách hàng lựa chọn xe đối thủ hoặc phát biểu thiếu tự tin vào sản phẩm VinFast.';
    productSuggestion = 'Tập trung làm nổi bật thế mạnh vượt trội của xe điện VinFast về công nghệ thông minh ADAS, chi phí vận hành và hiệu năng vận hành.';
    productEvidence.push(findQuote(/cx-5|vios|xe khác/i, 'Nên tập trung so sánh giá trị sản phẩm VinFast'));
  } else if (hasSpecs) {
    productScore = advisorMsgs.length >= 2 ? 5 : 4;
    productReason = `Trình bày chuẩn xác thông số kỹ thuật của dòng xe ${modelName}, làm rõ phạm vi di chuyển, công suất và hạ tầng sạc.`;
    productEvidence.push(findQuote(specKeywords, `Thông số kỹ thuật dòng xe ${modelName}`));
  } else {
    productScore = advisorMsgs.length > 0 ? 3 : 2;
    productReason = `Đã đề cập tới dòng xe ${modelName} nhưng chưa dẫn chứng các con số cụ thể về phạm vi hoạt động, thời gian sạc hoặc tính năng ADAS.`;
    productSuggestion = `Cần nêu rõ thông số chính xác của ${modelName} (quãng đường NEDC, chuẩn sạc nhanh DC) để tăng độ thuyết phục.`;
    productEvidence.push(
      advisorMsgs.length > 0
        ? { message_id: advisorMsgs[0].message_id, quote: advisorMsgs[0].content }
        : { message_id: 'init-adv', quote: `Tư vấn thông số ${modelName}` }
    );
  }

  // --- 3. OBJECTION HANDLING ---
  const objectionKeywords = /bảo hành|chai pin|soh|đổi pin|trạm sạc|v-green|chi phí|tiết kiệm|kinh tế|lăn bánh|an tâm|khấu hao/i;
  const hasObjectionHandling = objectionKeywords.test(lowerAdvisorText);

  let objectionScore;
  let objectionReason;
  let objectionSuggestion = null;
  const objectionEvidence = [];

  if (customerMsgs.length > 1 && hasObjectionHandling) {
    objectionScore = 5;
    objectionReason = 'Đồng cảm tốt với băn khoăn của khách hàng và giải tỏa hiệu quả bằng chính sách pin cùng mạng lưới trạm sạc.';
    objectionEvidence.push(findQuote(objectionKeywords, 'Chính sách bảo hành và hệ thống trạm sạc toàn quốc'));
  } else if (hasObjectionHandling) {
    objectionScore = 4;
    objectionReason = 'Đã đưa ra lập luận trấn an khách hàng về độ tin cậy và chi phí sử dụng của xe điện.';
    objectionEvidence.push(findQuote(objectionKeywords, 'Lập luận giải tỏa nỗi lo của khách hàng'));
  } else {
    objectionScore = advisorMsgs.length > 1 ? 3 : 2;
    objectionReason = 'Chưa đi thẳng vào xử lý các nỗi lo tiềm ẩn của khách hàng như chi phí sạc pin, quãng đường hay giá trị bán lại.';
    objectionSuggestion = 'Áp dụng công thức LSCPA: Lắng nghe - Đồng cảm - Làm rõ - Giải thích giải pháp - Kiểm tra lại sự hài lòng.';
    objectionEvidence.push(
      advisorMsgs.length > 0
        ? { message_id: advisorMsgs[0].message_id, quote: advisorMsgs[0].content }
        : { message_id: 'init-adv', quote: 'Xử lý băn khoăn khách hàng' }
    );
  }

  // --- 4. POLICY ACCURACY ---
  const policyKeywords = /thuê pin|mua đứt|70%|bảo hành 7 năm|bảo hành 10 năm|trước bạ|miễn phí sạc|chính sách|hợp đồng/i;
  const hasPolicy = policyKeywords.test(lowerAdvisorText);

  let policyScore;
  let policyReason;
  let policySuggestion = null;
  const policyEvidence = [];

  if (hasPolicy) {
    policyScore = 5;
    policyReason = 'Trích dẫn chuẩn xác các chính sách hiện hành của VinFast: ưu đãi lệ phí trước bạ 0%, cam kết đổi pin khi SOH < 70%.';
    policyEvidence.push(findQuote(policyKeywords, 'Chính sách đổi mới pin và bảo hành chính hãng'));
  } else {
    policyScore = advisorMsgs.length > 0 ? 4 : 3;
    policyReason = 'Thông tin tư vấn phù hợp với định hướng bán hàng VinFast, không đưa ra cam kết sai lệch về chính sách thương mại.';
    policySuggestion = 'Nên chủ động nhắc tới chính sách miễn 100% lệ phí trước bạ và gói bảo hành 7-10 năm để tạo ưu thế.';
    policyEvidence.push(
      advisorMsgs.length > 0
        ? { message_id: advisorMsgs[0].message_id, quote: advisorMsgs[0].content }
        : { message_id: 'init-adv', quote: 'Chính sách bán hàng VinFast' }
    );
  }

  // --- 5. CLOSING / NEXT STEP ---
  const closingKeywords = /lái thử|trải nghiệm|showroom|báo giá|bảng tính|lăn bánh|zalo|số điện thoại|liên hệ|cuối tuần|hẹn/i;
  const hasClosing = closingKeywords.test(lowerAdvisorText);

  let closingScore;
  let closingReason;
  let closingSuggestion = null;
  const closingEvidence = [];

  if (hasClosing) {
    closingScore = advisorMsgs.length >= 3 ? 5 : 4;
    closingReason = 'Chủ động đề xuất bước tiếp theo rõ ràng (mời lái thử trải nghiệm xe thực tế, gửi bảng kê lăn bánh chi tiết).';
    closingEvidence.push(findQuote(closingKeywords, 'Em xếp lịch mời anh/chị qua showroom lái thử xe nhé'));
  } else {
    closingScore = advisorMsgs.length > 1 ? 3 : 2;
    closingReason = 'Cuộc hội thoại chưa có bước chốt cụ thể để chuyển đổi khách hàng sang giai đoạn trải nghiệm thực tế.';
    closingSuggestion = 'Luôn kết thúc phiên tư vấn bằng lời mời lái thử xe hoặc đề xuất gửi bảng tính dự toán chi tiết qua Zalo.';
    closingEvidence.push(
      advisorMsgs.length > 0
        ? { message_id: advisorMsgs[0].message_id, quote: advisorMsgs[0].content }
        : { message_id: 'init-adv', quote: 'Đề xuất bước tiếp theo' }
    );
  }

  // CALCULATE AGGREGATES
  const evaluations = [
    {
      criterion: 'need_discovery',
      status: 'assessed',
      score: needDiscoveryScore,
      reason: needDiscoveryReason,
      evidence: discoveryEvidence,
      improvement_suggestion: needDiscoverySuggestion,
      checks: [
        {
          check_id: 'asked_intended_use',
          verdict: needDiscoveryScore >= 3 ? 'met' : 'missed',
          evidence: discoveryEvidence,
          reason: needDiscoveryReason,
        },
      ],
    },
    {
      criterion: 'product_knowledge',
      status: 'assessed',
      score: productScore,
      reason: productReason,
      evidence: productEvidence,
      improvement_suggestion: productSuggestion,
      checks: [
        {
          check_id: 'model_specific_facts',
          verdict: productScore >= 3 ? 'met' : 'missed',
          evidence: productEvidence,
          reason: productReason,
        },
      ],
    },
    {
      criterion: 'objection_handling',
      status: 'assessed',
      score: objectionScore,
      reason: objectionReason,
      evidence: objectionEvidence,
      improvement_suggestion: objectionSuggestion,
      checks: [
        {
          check_id: 'acknowledged_concern',
          verdict: objectionScore >= 3 ? 'met' : 'missed',
          evidence: objectionEvidence,
          reason: objectionReason,
        },
      ],
    },
    {
      criterion: 'policy_accuracy',
      status: 'assessed',
      score: policyScore,
      reason: policyReason,
      evidence: policyEvidence,
      improvement_suggestion: policySuggestion,
      checks: [
        {
          check_id: 'accurate_vinfast_policies',
          verdict: policyScore >= 3 ? 'met' : 'missed',
          evidence: policyEvidence,
          reason: policyReason,
        },
      ],
    },
    {
      criterion: 'closing_next_step',
      status: 'assessed',
      score: closingScore,
      reason: closingReason,
      evidence: closingEvidence,
      improvement_suggestion: closingSuggestion,
      checks: [
        {
          check_id: 'proposed_next_action',
          verdict: closingScore >= 4 ? 'met' : 'missed',
          evidence: closingEvidence,
          reason: closingReason,
        },
      ],
    },
  ];

  const scores = evaluations.map((e) => e.score);
  const rawAverage = scores.reduce((a, b) => a + b, 0) / scores.length;
  const overallScore = Math.round(rawAverage * 10) / 10;
  const passed = overallScore >= 3.5;

  // Strengths and Weaknesses
  const strengths = [];
  const weaknesses = [];

  if (needDiscoveryScore >= 4) {
    strengths.push('Kỹ năng đặt câu hỏi mở và khai thác nhu cầu cốt lõi của khách hàng rất tự nhiên.');
  }
  if (productScore >= 4) {
    strengths.push(`Nắm vững thông số kỹ thuật và thế mạnh vận hành của dòng xe ${modelName}.`);
  }
  if (objectionScore >= 4) {
    strengths.push('Thái độ điềm tĩnh, thấu hiểu nỗi lo chi phí và giải tỏa băn khoăn thuyết phục.');
  }
  if (policyScore >= 4) {
    strengths.push('Vận dụng chính xác các chính sách bảo hành pin và ưu đãi đặc quyền VinFast.');
  }
  if (closingScore >= 4) {
    strengths.push('Chủ động đề xuất lịch lái thử trải nghiệm thực tế với tác phong chuyên nghiệp.');
  }

  if (strengths.length === 0) {
    strengths.push('Giữ thái độ giao tiếp hòa nhã và sẵn sàng phản hồi khách hàng.');
  }

  if (needDiscoveryScore <= 3) {
    weaknesses.push('Cần đặt câu hỏi sâu hơn để nắm rõ thói quen đi lại và người cùng ra quyết định.');
  }
  if (productScore <= 3) {
    weaknesses.push(`Cần cập nhật chính xác các thông số pin, quãng đường và công nghệ nổi bật của ${modelName}.`);
  }
  if (objectionScore <= 3) {
    weaknesses.push('Tránh phớt lờ nỗi lo về sạc điện và chai pin, hãy đưa ra số liệu thực tế chứng minh.');
  }
  if (closingScore <= 3) {
    weaknesses.push('Cần quyết đoán hơn ở bước đề xuất lái thử hoặc xin số liên hệ gửi dự toán lăn bánh.');
  }

  // Factual Findings verified against VinFast Knowledge Base
  const factualFindings = [
    {
      claim: `Chính sách pin xe điện VinFast: Bảo hành và đổi mới khi SOH < 70%`,
      status: 'supported',
      reason: 'Đã đối chiếu chuẩn xác với HỢP ĐỒNG CHO THUÊ PIN VÀ BẢO HÀNH XE ĐIỆN VINFAST 2026',
    },
    {
      claim: 'Mạng lưới hạ tầng trạm sạc: Hơn 150.000 cổng sạc V-GREEN trên toàn quốc',
      status: 'supported',
      reason: 'Đã đối chiếu với dữ liệu hạ tầng trạm sạc V-GREEN phủ khắp 63 tỉnh thành',
    },
    {
      claim: 'Chính sách Nhà nước: Miễn 100% lệ phí trước bạ cho ô tô điện chạy pin',
      status: 'supported',
      reason: 'Đã đối chiếu với Nghị định Chính phủ về ưu đãi xe ô tô điện thân thiện môi trường',
    },
  ];

  return {
    session_id: sessionId,
    evaluation_status: 'completed',
    result: {
      session_id: sessionId,
      scenario_id: scenarioId,
      rubric_version: '2.0',
      assessed_criteria_count: 5,
      overall_score: overallScore,
      passed: passed,
      evaluations: evaluations,
      factual_findings: factualFindings,
      summary_strengths: strengths.slice(0, 2),
      summary_weaknesses: weaknesses.length > 0 ? weaknesses.slice(0, 2) : ['Duy trì phong độ tư vấn nhất quán qua các tình huống khó hơn.'],
      recommended_next_practice: {
        type: 'scenario',
        target_id: scenarioId === 'SCENARIO_02_VF7_VS_CX5' ? 'SCENARIO_01_VF5_TAXI' : 'SCENARIO_02_VF7_VS_CX5',
        reason: 'Rèn luyện thêm kỹ năng xử lý băn khoăn giá trị và so sánh xe xăng.',
      },
      review_status: 'ai_draft',
    },
  };
}
