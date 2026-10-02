import { VEHICLES } from '../data/vehicleData.js';
import { POLICIES } from '../data/policyData.js';
import { CHARGING_STATIONS } from '../data/stationData.js';
import { FAQ_QUESTIONS } from '../data/faqData.js';

/**
 * Intelligent VinFast Sales Copilot Engine
 * Answers questions grounded in official 2026 specs, policies, charging data, and sales scripts.
 */
export function generateCopilotAnswer(queryText) {
  const query = (queryText || '').toLowerCase().trim();

  // 1. Detect Vehicle Model
  let detectedVehicle = null;
  if (/vf\s*3\b/i.test(query)) detectedVehicle = VEHICLES.find((v) => v.id === 'vf3');
  else if (/vf\s*5\b/i.test(query)) detectedVehicle = VEHICLES.find((v) => v.id === 'vf5');
  else if (/vf\s*6\b/i.test(query)) detectedVehicle = VEHICLES.find((v) => v.id === 'vf6');
  else if (/vf\s*7\b/i.test(query)) detectedVehicle = VEHICLES.find((v) => v.id === 'vf7');
  else if (/vf\s*8\b/i.test(query)) detectedVehicle = VEHICLES.find((v) => v.id === 'vf8');
  else if (/vf\s*9\b/i.test(query)) detectedVehicle = VEHICLES.find((v) => v.id === 'vf9');

  // Check matching FAQ first
  const matchedFaq = FAQ_QUESTIONS.find(
    (f) =>
      query.includes(f.question.toLowerCase().slice(0, 15)) ||
      f.question.toLowerCase().includes(query.slice(0, 15))
  );

  // 2. Identify Intent
  const isPriceQuery = /giá|bao nhiêu tiền|lăn bánh|chi phí mua|bảng kê|ngân sách/i.test(query);
  const isRangeQuery = /bao nhiêu km|quãng đường|đi được|pin đi|phạm vi|nedc|wltp/i.test(query);
  const isBatteryQuery = /thuê pin|mua đứt|chai pin|soh|70%|đổi pin|bảo hành pin/i.test(query);
  const isChargingQuery = /sạc ở đâu|trạm sạc|v-green|thời gian sạc|sạc nhanh|chung cư|sạc tại nhà|trụ sạc/i.test(query);
  const isCompetitorQuery = /so sánh|honda|cx-5|cx5|vios|creta|seltos|cr-v|crv|xe xăng/i.test(query);
  const isPolicyQuery = /trước bạ|ưu đãi|bảo hành|trả góp|lãi suất|vay|chính sách/i.test(query);

  // CASE A: SPECIFIC VEHICLE PRICE
  if (detectedVehicle && isPriceQuery) {
    return {
      answer: `### 🏷️ Giá bán và Chi phí lăn bánh **${detectedVehicle.name}** (Niêm yết 2026)\n\n` +
        `• **Phương án Thuê Pin:** **${detectedVehicle.price_battery_rental}**\n` +
        `• **Phương án Mua Đứt Pin:** **${detectedVehicle.price_battery_included}**\n` +
        `• **Lệ phí trước bạ:** **0%** (Tiết kiệm trực tiếp từ 10% - 12% so với xe xăng cùng phân khúc).\n` +
        `• **Bảo hành xe:** ${detectedVehicle.warranty_car}.\n` +
        `• **Bảo hành pin:** ${detectedVehicle.warranty_battery}.\n\n` +
        `*Ghi chú:* Giá lăn bánh thực tế chỉ gồm phí ra biển số, đăng kiểm, phí đường bộ và bảo hiểm TNDS (khoảng 3 - 25 triệu tùy tỉnh/thành phố).`,
      talking_points: [
        `Nhấn mạnh ưu đãi lệ phí trước bạ 0% giúp tiết kiệm chi phí ban đầu rất lớn`,
        `Tư vấn phương án thuê pin giúp hạ giá thành mua xe chỉ từ ${detectedVehicle.price_battery_rental}`,
        `Bảo hành chính hãng vượt trội ${detectedVehicle.warranty_car}`,
      ],
      citations: [
        { document_id: detectedVehicle.document_id, title: `Thông số & Giá bán ${detectedVehicle.name}` },
        { document_id: 'PROMOTION_SALES_VINFAST_20260921', title: 'Ưu đãi Lệ phí trước bạ 0% & Chính sách bán hàng 2026' },
      ],
      suggested_message: `Dạ em gửi anh/chị giá bán chính thức của dòng xe ${detectedVehicle.name}. Xe có 2 lựa chọn: thuê pin (${detectedVehicle.price_battery_rental}) hoặc mua đứt pin (${detectedVehicle.price_battery_included}). Hiện tại xe điện được miễn 100% lệ phí trước bạ nên chi phí lăn bánh cực kỳ tiết kiệm ạ!`,
      suggested_next_question: `Anh/chị đang cân nhắc phương án thuê pin để tối ưu chi phí ban đầu hay mua đứt pin để sở hữu trọn gói ạ?`,
    };
  }

  // CASE B: SPECIFIC VEHICLE RANGE & SPECS
  if (detectedVehicle && (isRangeQuery || isChargingQuery)) {
    return {
      answer: `### ⚡ Thông số Pin & Quãng đường **${detectedVehicle.name}**\n\n` +
        `• **Phạm vi hoạt động:** **${detectedVehicle.range}** cho mỗi lần sạc đầy.\n` +
        `• **Dung lượng pin:** ${detectedVehicle.battery_capacity}.\n` +
        `• **Thời gian sạc nhanh DC:** **${detectedVehicle.charging_time}** tại hệ thống trạm V-GREEN.\n` +
        `• **Công suất động cơ:** ${detectedVehicle.power} | Mô-men xoắn: ${detectedVehicle.torque}.\n` +
        `• **Hệ dẫn động:** ${detectedVehicle.drivetrain}.\n` +
        `• **Tính năng nổi bật:** ${detectedVehicle.highlights.join('; ')}.`,
      talking_points: [
        `Phạm vi ${detectedVehicle.range} đáp ứng thoải mái nhu cầu di chuyển trong tuần hoặc đi liên tỉnh`,
        `Khả năng sạc siêu nhanh DC đạt 70% pin chỉ trong khoảng 25-36 phút`,
        `Động cơ điện vận hành êm ái, bốc tức thì không độ trễ chân ga`,
      ],
      citations: [
        { document_id: detectedVehicle.document_id, title: `Tài liệu Kỹ thuật ${detectedVehicle.name}` },
        { document_id: 'POLICY_CHARGING_VINFAST_20260919', title: 'Quy chuẩn Trạm sạc V-GREEN toàn quốc' },
      ],
      suggested_message: `Dạ ${detectedVehicle.name} có quãng đường di chuyển đạt ${detectedVehicle.range} cho 1 lần sạc đầy. Tại các trạm sạc nhanh DC của VinFast, xe chỉ mất ${detectedVehicle.charging_time} là có thể tiếp tục hành trình ạ!`,
      suggested_next_question: `Mỗi ngày anh/chị thường di chuyển cung đường khoảng bao nhiêu km để em tư vấn phương án sạc tiện nhất ạ?`,
    };
  }

  // CASE C: BATTERY RENTAL VS BUYING / SOH DEGRADATION
  if (isBatteryQuery || matchedFaq?.id === 'faq-1' || matchedFaq?.id === 'faq-2') {
    const batteryPolicy = POLICIES.find((p) => p.id === 'battery-rental');
    return {
      answer: `### 🔋 Phân tích Chính sách Pin Xe điện VinFast 2026\n\n` +
        `#### 1. Chính sách Thuê pin (Bảo hiểm rủi ro pin):\n` +
        `• Khách hàng **không chịu rủi ro hao mòn tài sản** của pin.\n` +
        `• **Cam kết đổi mới miễn phí:** Khi dung lượng pin khả dụng (SOH) xuống dưới **70%**, VinFast sẽ thay thế cụm pin mới hoàn toàn miễn phí.\n` +
        `• Tiết kiệm số tiền lớn lúc mua xe (từ 80 đến gần 500 triệu đồng tùy dòng xe).\n\n` +
        `#### 2. Chính sách Mua đứt pin:\n` +
        `• Khách hàng sở hữu trọn vẹn cả xe và pin, không phải trả phí thuê pin hàng tháng.\n` +
        `• Được bảo hành chính hãng từ **8 đến 10 năm không giới hạn số km**.\n\n` +
        `*Khuyến nghị tư vấn:* Khách hàng chạy dịch vụ hoặc muốn tối ưu vốn ban đầu nên chọn thuê pin; khách hàng gia đình đi ít hoặc doanh nghiệp mua tài sản trọn gói nên chọn mua pin.`,
      talking_points: [
        `Gói thuê pin đóng vai trò như "Hợp đồng bảo hiểm pin" trọn đời cho chủ xe`,
        `Cam kết đổi mới pin miễn phí khi SOH < 70% được quy định bằng văn bản pháp lý`,
        `Thời hạn bảo hành pin mua đứt 8-10 năm dài nhất trên thị trường`,
      ],
      citations: [
        { document_id: batteryPolicy.document_id, title: batteryPolicy.title },
        { document_id: 'POLICY_CHARGING_VINFAST_20260919', title: 'Chính sách Hậu mãi & Bảo dưỡng Pin VinFast' },
      ],
      suggested_message: `Dạ nếu anh/chị muốn tối ưu tài chính lúc mua thì phương án thuê pin rất an tâm vì VinFast chịu toàn bộ trách nhiệm bảo hành, nếu pin chai dưới 70% SOH sẽ được đổi cụm pin mới miễn phí. Còn nếu anh/chị muốn sở hữu trọn gói một lần thì pin mua đứt được bảo hành tới 8-10 năm không giới hạn km ạ!`,
      suggested_next_question: `Nhu cầu di chuyển trung bình một tháng của anh/chị rơi vào khoảng bao nhiêu km ạ?`,
    };
  }

  // CASE D: CHARGING IN APARTMENTS & INFRASTRUCTURE
  if (isChargingQuery || matchedFaq?.id === 'faq-5') {
    const naStation = CHARGING_STATIONS[0];
    return {
      answer: `### 🔌 Giải pháp Sạc Xe điện VinFast tại Chung cư & Đô thị\n\n` +
        `• **Mạng lưới trạm sạc V-GREEN:** Hơn **150.000 cổng sạc** đã phủ khắp 63 tỉnh thành, các tuyến cao tốc, quốc lộ và trung tâm thương mại.\n` +
        `• **Giải pháp cho cư dân chung cư:**\n` +
        `  1. **Sạc nhanh tiện ích:** Tận dụng 20 - 30 phút đi siêu thị, mua sắm hoặc uống cafe tại Vincom, bãi đỗ xe đối tác để sạc nhanh DC (đủ đi 3 - 5 ngày).\n` +
        `  2. **Trạm sạc gần nhà & công sở:** Hệ thống trạm sạc V-GREEN hiện diện tại các trạm xăng dầu PVOIL, Petrolimex và điểm sạc công cộng dày đặc với bán kính chỉ 1 - 3 km.\n` +
        `  3. **Biểu phí sạc:** Tiêu chuẩn 3.858 VNĐ/kWh minh bạch, thanh toán tự động qua App VinFast.\n` +
        `• **Ví dụ hạ tầng tiêu biểu:** ${naStation.name} (${naStation.ports_total} cổng sạc, hỗ trợ ${naStation.power_types.join(', ')} hoạt động 24/7).`,
      talking_points: [
        `Hơn 150.000 cổng sạc trên 63 tỉnh thành — hạ tầng trạm sạc số 1 Việt Nam`,
        `Thời gian sạc nhanh 10-70% chỉ từ 24-30 phút, thuận tiện kết hợp công việc hàng ngày`,
        `Ứng dụng VinFast dẫn đường và hiển thị chính xác số cổng sạc còn trống theo thời gian thực`,
      ],
      citations: [
        { document_id: 'POLICY_CHARGING_VINFAST_20260919', title: 'Chính sách Ưu đãi & Biểu phí Mạng lưới Trạm sạc V-GREEN' },
        { document_id: 'INFRASTRUCTURE_VGREEN_2026', title: 'Báo cáo Hạ tầng Trạm sạc Toàn quốc V-GREEN' },
      ],
      suggested_message: `Dạ anh/chị hoàn toàn yên tâm ạ. Với mạng lưới hơn 150.000 cổng sạc V-GREEN trên toàn quốc, quanh khu vực chung cư của mình đều có các trạm sạc nhanh DC. Mình chỉ cần ghé sạc 25-30 phút khi đi mua sắm hoặc uống cà phê là pin đã đủ dùng cả tuần rồi ạ!`,
      suggested_next_question: `Anh/chị đang ở khu vực quận/huyện nào để em gửi vị trí các trạm sạc gần nhà mình nhất ạ?`,
    };
  }

  // CASE E: COMPETITOR COMPARISON (ADAS, CX-5, HONDA SENSING, PETROL CARS)
  if (isCompetitorQuery || matchedFaq?.id === 'faq-3') {
    return {
      answer: `### ⚖️ So sánh Trực diện Xe điện VinFast vs Xe xăng Cùng Phân khúc\n\n` +
        `1. **Hệ thống ADAS thông minh:**\n` +
        `   • VinFast (VF 6, VF 7, VF 8, VF 9) trang bị **ADAS Cấp độ 2** với tính năng **Hỗ trợ lái khi ùn tắc (Traffic Jam Assist)** và **Hỗ trợ lái trên cao tốc (Highway Assist)** với Stop & Go toàn dải tốc độ (0 - 130 km/h).\n` +
        `   • Nhiều gói hỗ trợ lái xe xăng đối thủ (như Honda Sensing hay Mazda i-Activesense ở bản tiêu chuẩn) chỉ hoạt động ở dải tốc độ trên 30 - 65 km/h.\n\n` +
        `2. **Bài toán chi phí vận hành:**\n` +
        `   • Chi phí năng lượng xe điện: Chỉ khoảng **300 - 500 VNĐ/km** (tiết kiệm 60% - 75% so với xe xăng trung bình 1.500 - 2.200 VNĐ/km).\n` +
        `   • Chi phí bảo dưỡng: Giảm 60% do không có dầu máy, bugi, lọc xăng, hộp số phức tạp.\n\n` +
        `3. **Lợi thế lăn bánh:** Miễn 100% lệ phí trước bạ giúp giá lăn bánh cạnh tranh vượt trội.`,
      talking_points: [
        `Công nghệ ADAS cấp độ cao hơn hoạt động mượt mà từ dải tốc độ 0 km/h`,
        `Chi phí vận hành tiết kiệm hàng chục triệu đồng mỗi năm`,
        `Cảm giác lái đầm chắc, tăng tốc tức thời và không rung lắc mùi xăng`,
      ],
      citations: [
        { document_id: 'PRODUCT_VF7_20260922', title: 'Tài liệu Kỹ thuật & ADAS VinFast VF 7' },
        { document_id: 'COMPARISON_EV_ICE_2026', title: 'Báo cáo So sánh Chi phí Sở hữu EV vs ICE 2026' },
      ],
      suggested_message: `Dạ so với xe xăng cùng phân khúc, xe điện VinFast vượt trội ở hệ thống ADAS Cấp độ 2 hỗ trợ cả khi tắc đường từ dải tốc độ 0 km/h. Đặc biệt chi phí đi lại hàng tháng chỉ bằng 1/3 xe xăng và mình tiết kiệm được toàn bộ tiền lệ phí trước bạ khi đăng ký xe ạ!`,
      suggested_next_question: `Em mời anh/chị ghé showroom lái thử để cảm nhận trực tiếp khả năng tăng tốc và hệ thống ADAS của xe nhé?`,
    };
  }

  // CASE F: POLICY, TAX 0%, REGISTRATION, PROMOTIONS
  if (isPolicyQuery || matchedFaq?.id === 'faq-4') {
    const taxPolicy = POLICIES.find((p) => p.id === 'tax-incentives') || POLICIES[2];
    return {
      answer: `### 🎁 Chính sách Ưu đãi & Quyền lợi Đặc quyền VinFast 2026\n\n` +
        `• **Miễn 100% Lệ phí trước bạ:** Áp dụng cho toàn bộ xe ô tô điện VinFast (tiết kiệm từ 30 đến hơn 200 triệu đồng tiền lăn bánh).\n` +
        `• **Chính sách sạc V-GREEN:** Miễn phí hoặc ưu đãi giá sạc theo các chương trình thúc đẩy chuyển đổi xanh toàn quốc.\n` +
        `• **Chính sách Hỗ trợ Tài chính:** Hợp tác ngân hàng hỗ trợ vay từ **70% - 80% giá trị xe**, thời hạn vay lên tới 8 năm với lãi suất ưu đãi cố định.\n` +
        `• **Dịch vụ Hậu mãi vượt trội:** Cứu hộ 24/7 miễn phí toàn quốc, xưởng dịch vụ lưu động (Mobile Service) và chính sách cam kết giá trị mua lại xe.`,
      talking_points: [
        `Ưu đãi trước bạ 0% là lợi thế độc quyền lớn nhất của xe điện thời điểm hiện tại`,
        `Hệ thống xưởng dịch vụ phủ khắp 63 tỉnh thành sẵn sàng hỗ trợ 24/7`,
        `Gói trả góp linh hoạt giúp khách hàng nhận xe chỉ từ vài chục đến hơn 100 triệu trả trước`,
      ],
      citations: [
        { document_id: taxPolicy.document_id, title: taxPolicy.title },
        { document_id: 'POLICY_BATTERY_RENTAL_CONTRACT_20260801', title: 'Hợp đồng Cho thuê Pin & Quyền lợi Khách hàng' },
      ],
      suggested_message: `Dạ hiện tại xe điện VinFast đang được Nhà nước hỗ trợ miễn 100% lệ phí trước bạ nên anh/chị tiết kiệm ngay được hàng chục triệu đồng khi lăn bánh. Bên em cũng có chương trình trả góp hỗ trợ vay tới 80% giá trị xe trong 8 năm ạ!`,
      suggested_next_question: `Anh/chị dự định trả thẳng hay sử dụng gói hỗ trợ trả góp lãi suất ưu đãi để em làm bảng dự toán chi tiết ạ?`,
    };
  }

  // CASE G: GENERAL VINFAST PRODUCT LINE OVERVIEW
  return {
    answer: `### 🚗 Tổng quan Dải Sản phẩm Ô tô điện Thông minh VinFast 2026\n\n` +
      `VinFast hiện đang phân phối đầy đủ các phân khúc xe điện đáp ứng mọi nhu cầu:\n` +
      `• **VF 3 (Mini SUV):** Giá từ 240 triệu | Quãng đường 215 km | Đô thị linh hoạt cá tính.\n` +
      `• **VF 5 Plus (A-SUV):** Giá từ 468 triệu | Quãng đường 326 km | Lựa chọn số 1 chạy phố & dịch vụ.\n` +
      `• **VF 6 (B-SUV):** Giá từ 675 triệu | Quãng đường 381 - 399 km | Xe gia đình trẻ, ADAS Cấp độ 2.\n` +
      `• **VF 7 (C-SUV):** Giá từ 850 triệu | Quãng đường 440 - 500,5 km | Đột phá thiết kế, công suất 349 HP (AWD).\n` +
      `• **VF 8 (D-SUV):** Giá từ 1.079 triệu | Quãng đường 457 - 471 km | SUV toàn cầu, tiện nghi đẳng cấp.\n` +
      `• **VF 9 (E-SUV VIP):** Giá từ 1.566 triệu | Quãng đường tới 626 km | Ghế cơ trưởng thương gia VIP.\n\n` +
      `*Mọi dòng xe đều được hưởng ưu đãi lệ phí trước bạ 0% và bảo hành 7 - 10 năm chính hãng.*`,
    talking_points: [
      `Dải sản phẩm đa dạng từ mini SUV đến SUV full-size hạng sang`,
      `Chính sách bảo hành và hệ thống trạm sạc số 1 tại Việt Nam`,
      `Công nghệ thông minh và an toàn vượt trội các dòng xe xăng cùng tầm tiền`,
    ],
    citations: [
      { document_id: 'PRICE_LIST_VINFAST_20260921', title: 'Bảng giá & Danh mục Dòng xe VinFast 2026' },
      { document_id: 'POLICY_BATTERY_RENTAL_CONTRACT_20260801', title: 'Chính sách Thuê & Mua Pin Xe điện VinFast' },
    ],
    suggested_message: `Dạ VinFast có đầy đủ các dòng xe từ VF 3, VF 5 cho đô thị tới VF 6, VF 7, VF 8, VF 9 cho gia đình và doanh nhân. Tất cả các xe đều được miễn 100% lệ phí trước bạ và có sẵn hạ tầng hơn 150.000 cổng sạc trên toàn quốc ạ!`,
    suggested_next_question: `Anh/chị đang quan tâm dòng xe trong tầm ngân sách khoảng bao nhiêu để em tư vấn phiên bản phù hợp nhất ạ?`,
  };
}
