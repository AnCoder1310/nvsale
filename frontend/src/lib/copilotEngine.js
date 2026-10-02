import { VEHICLES } from '../data/vehicleData.js';
import { POLICIES } from '../data/policyData.js';
import { CHARGING_STATIONS } from '../data/stationData.js';
import { FAQ_QUESTIONS } from '../data/faqData.js';

/**
 * Intelligent VinFast Sales Copilot Engine
 * Answers grounded directly in data/knowledge/corpus.json and official 2026 VinFast documents.
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

  // Check matching FAQ
  const matchedFaq = FAQ_QUESTIONS.find(
    (f) =>
      query.includes(f.question.toLowerCase().slice(0, 15)) ||
      f.question.toLowerCase().includes(query.slice(0, 15))
  );

  // 2. Identify Intent
  const isPriceQuery = /giá|bao nhiêu tiền|lăn bánh|chi phí mua|bảng kê|ngân sách|msrp/i.test(query);
  const isBatteryQuery = /thuê pin|mua đứt|chai pin|soh|70%|đổi pin|bảo hành pin/i.test(query);
  const isChargingQuery = /sạc ở đâu|trạm sạc|v-green|thời gian sạc|sạc nhanh|chung cư|sạc tại nhà|trụ sạc/i.test(query);
  const isCompetitorQuery = /so sánh|honda|cx-5|cx5|vios|creta|seltos|cr-v|crv|xe xăng/i.test(query);
  const isPolicyQuery = /trước bạ|ưu đãi|bảo hành|trả góp|lãi suất|vay|chính sách/i.test(query);

  // CASE 1: VF 3 PRICE & SPECS
  if (detectedVehicle?.id === 'vf3') {
    if (isPriceQuery) {
      return {
        answer: `Giá bán bán lẻ đề xuất kèm pin (MSRP) theo Thông báo Chính sách giá bán VinFast:\n\n` +
          `• **VF 3 Eco:** từ **270.750.000 VNĐ** (MSRP: 285.000.000 VNĐ).\n` +
          `• **VF 3 Plus:** từ **281.200.000 VNĐ** (MSRP: 296.000.000 VNĐ).\n` +
          `• **Phương án thuê pin:** chỉ từ **240.000.000 VNĐ**.\n` +
          `• **Lệ phí trước bạ:** **0%** theo chính sách ưu đãi Nhà nước.\n` +
          `• **Bảo hành xe:** 7 năm hoặc 160.000 km.`,
        talking_points: [
          'Mức giá tiếp cận dễ dàng nhất trong dải xe điện VinFast chỉ từ 240 triệu',
          'Miễn 100% lệ phí trước bạ giúp chi phí lăn bánh tương đương giá niêm yết',
          'Chi phí năng lượng cực thấp chỉ khoảng ~300đ/km',
        ],
        citations: [
          { document_id: 'PRODUCT_VF3_20260922', title: 'VinFast VF 3: Thông số, Giá bán & Ưu đãi mới nhất' },
          { document_id: 'PRICE_LIST_VINFAST_20260921', title: 'Chính sách giá bán và trang bị tùy chọn xe ô tô điện VinFast' },
        ],
        suggested_message: `Dạ em gửi anh/chị giá bán chính thức của VinFast VF 3: bản Eco từ 270,75 triệu và bản Plus từ 281,2 triệu (nếu chọn thuê pin chỉ từ 240 triệu). Xe được miễn 100% lệ phí trước bạ nên lăn bánh cực kỳ tiết kiệm ạ!`,
        suggested_next_question: `Anh/chị đang quan tâm bản Eco hay bản Plus để em tư vấn màu sắc và trang bị chi tiết ạ?`,
      };
    }
    return {
      answer: `Thông số kỹ thuật chính hãng **VinFast VF 3**:\n\n` +
        `• **Công suất tối đa:** **30 kW (40.2 HP)** | **Mô-men xoắn:** **110 Nm**.\n` +
        `• **Quãng đường di chuyển (NEDC):** **215 km/lần sạc đầy**.\n` +
        `• **Dung lượng pin:** 18,64 kWh.\n` +
        `• **Thời gian sạc nhanh DC:** **10% – 70% trong 36 phút**.\n` +
        `• **Kích thước (D x R x C):** 3.190 x 1.679 x 1.652 mm | Khoảng sáng gầm: 175 mm.\n` +
        `• **Dẫn động:** Cầu sau (RWD) linh hoạt phố thị.`,
      talking_points: [
        'Công suất 30 kW và mô-men xoắn 110 Nm tăng tốc mượt mà, nhỏ gọn dễ luồn lách',
        'Quãng đường 215 km đáp ứng 3-5 ngày di chuyển trong thành phố',
        'Sạc nhanh DC 10-70% chỉ 36 phút',
      ],
      citations: [
        { document_id: 'PRODUCT_VF3_20260922', title: 'VinFast VF 3: Thông số, Giá bán & Ưu đãi mới nhất' },
      ],
      suggested_message: `Dạ VF 3 có công suất 30 kW (110 Nm) và quãng đường di chuyển 215 km chuẩn NEDC. Xe sạc nhanh từ 10% đến 70% chỉ mất 36 phút tại các trạm sạc công cộng V-GREEN ạ!`,
      suggested_next_question: `Anh/chị dự định dùng xe đi làm hàng ngày hay đưa đón gia đình trong đô thị ạ?`,
    };
  }

  // CASE 2: VF 5 PRICE & SPECS
  if (detectedVehicle?.id === 'vf5') {
    if (isPriceQuery) {
      return {
        answer: `Giá bán bán lẻ đề xuất kèm pin (MSRP) **VinFast VF 5 Plus**:\n\n` +
          `• **Giá kèm pin (MSRP):** **496.000.000 VNĐ** (chưa bao gồm các khuyến mãi kích cầu).\n` +
          `• **Phương án thuê pin:** từ **468.000.000 VNĐ**.\n` +
          `• **Ưu đãi lệ phí trước bạ:** **0%**.\n` +
          `• **Bảo hành xe:** 7 năm hoặc 160.000 km.\n` +
          `• **Bảo hành pin mua:** 8 năm không giới hạn km / Pin thuê đổi mới khi SOH < 70%.`,
        talking_points: [
          'Mẫu A-SUV kinh tế số 1 cho cá nhân và tài xế chạy dịch vụ đô thị',
          'Giá kèm pin niêm yết 496 triệu, miễn 100% lệ phí trước bạ',
          'Chi phí nhiên liệu rẻ hơn xe xăng 60-70%',
        ],
        citations: [
          { document_id: 'PRODUCT_VF5_20260922', title: 'VinFast VF 5: Thông số & Giá bán' },
          { document_id: 'PRICE_LIST_VINFAST_20260921', title: 'Chính sách giá bán các dòng xe ô tô điện VinFast' },
        ],
        suggested_message: `Dạ VF 5 Plus có giá bán lẻ đề xuất kèm pin là 496.000.000 VNĐ (thuê pin từ 468.000.000 VNĐ). Xe được hưởng 100% ưu đãi trước bạ 0% từ Nhà nước ạ!`,
        suggested_next_question: `Anh/chị đang cân nhắc mua xe chạy dịch vụ hay phục vụ gia đình để em gửi bảng tính chi phí lăn bánh ạ?`,
      };
    }
    return {
      answer: `Thông số kỹ thuật chính thức **VinFast VF 5 Plus**:\n\n` +
        `• **Quãng đường di chuyển (NEDC):** **326,4 km/lần sạc đầy**.\n` +
        `• **Dung lượng pin:** **37,23 kWh**.\n` +
        `• **Công suất tối đa:** **100 kW (134 HP)** | **Mô-men xoắn:** 135 Nm.\n` +
        `• **Thời gian sạc nhanh DC:** 10% – 70% trong **30–33 phút**.\n` +
        `• **Bảo hành:** 7 năm hoặc 160.000 km.`,
      talking_points: [
        'Quãng đường 326,4 km NEDC vượt trội trong phân khúc A-SUV',
        'Công suất 134 mã lực mạnh mẽ tương đương xe xăng 1.6L',
        'Thời gian sạc nhanh DC chỉ ~30-33 phút',
      ],
      citations: [
        { document_id: 'PRODUCT_VF5_20260922', title: 'VinFast VF 5 Giá tốt - Bạn đồng hành thông minh và hiệu quả' },
      ],
      suggested_message: `Dạ VF 5 Plus sở hữu pin dung lượng 37,23 kWh cho quãng đường di chuyển 326,4 km NEDC. Tại trạm sạc nhanh DC, xe chỉ mất khoảng 30-33 phút để nạp từ 10% lên 70% pin ạ!`,
      suggested_next_question: `Mỗi ngày anh/chị chạy khoảng bao nhiêu km để em tính toán chi phí sạc điện thực tế ạ?`,
    };
  }

  // CASE 3: VF 6 PRICE & SPECS
  if (detectedVehicle?.id === 'vf6') {
    if (isPriceQuery) {
      return {
        answer: `Giá bán bán lẻ đề xuất kèm pin (MSRP) **VinFast VF 6**:\n\n` +
          `• **VF 6 Eco:** **646.000.000 VNĐ** (Ưu đãi từ 613.700.000 VNĐ*).\n` +
          `• **VF 6 Plus:** **699.000.000 VNĐ** (Ưu đãi từ 664.050.000 VNĐ*).\n` +
          `• **Lệ phí trước bạ:** **0%**.\n` +
          `• **Bảo hành:** 7 năm hoặc 160.000 km.`,
        talking_points: [
          'Dòng B-SUV hiện đại trang bị ADAS Cấp độ 2',
          'Giá niêm yết từ 646 triệu (Eco) và 699 triệu (Plus)',
          'Không gian nội thất rộng rãi nhất phân khúc B',
        ],
        citations: [
          { document_id: 'PRODUCT_VF6_20260922', title: 'Xe điện VinFast VF 6 - Thông số, giá bán và ưu đãi' },
          { document_id: 'PRICE_LIST_VINFAST_20260921', title: 'Chính sách giá bán các dòng xe ô tô điện VinFast' },
        ],
        suggested_message: `Dạ em gửi anh/chị giá bán niêm yết kèm pin của VF 6: bản Eco là 646 triệu và bản Plus là 699 triệu đồng. Xe đang được hỗ trợ trước bạ 0% ạ!`,
        suggested_next_question: `Anh/chị có nhu cầu lái thử bản Plus để trải nghiệm gói tính năng ADAS thông minh không ạ?`,
      };
    }
    return {
      answer: `Thông số kỹ thuật **VinFast VF 6**:\n\n` +
        `• **Quãng đường di chuyển (NEDC):** **485 km/lần sạc** (bản Eco) | ~381 km (bản Plus).\n` +
        `• **Dung lượng pin:** **59,6 kWh**.\n` +
        `• **Công suất tối đa:** Eco: 130 kW (174 HP) | Plus: **150 kW (201 HP)**, mô-men xoắn **310 Nm**.\n` +
        `• **Thời gian sạc nhanh DC:** 10% – 70% trong ~25 phút.`,
      talking_points: [
        'Dung lượng pin 59,6 kWh, quãng đường lên tới 485 km NEDC',
        'Bản Plus công suất vượt trội 201 mã lực, mô-men xoắn 310 Nm',
        'Trang bị an toàn ADAS Cấp độ 2 toàn diện',
      ],
      citations: [
        { document_id: 'PRODUCT_VF6_20260922', title: 'Xe điện VinFast VF 6 - Thông số, giá bán và ưu đãi mới nhất' },
      ],
      suggested_message: `Dạ VF 6 trang bị pin 59,6 kWh cho tầm di chuyển tới 485 km (Eco). Phiên bản Plus có công suất mạnh mẽ 201 mã lực và mô-men xoắn 310 Nm ạ!`,
      suggested_next_question: `Anh/chị đang quan tâm bản Eco tối ưu quãng đường hay bản Plus mạnh mẽ hơn ạ?`,
    };
  }

  // CASE 4: VF 7 PRICE & SPECS
  if (detectedVehicle?.id === 'vf7') {
    if (isPriceQuery) {
      return {
        answer: `Giá bán bán lẻ đề xuất kèm pin (MSRP) **VinFast VF 7**:\n\n` +
          `• **VF 7 Eco:** MSRP **740.000.000 VNĐ** (Ưu đãi niêm yết từ **703.000.000 VNĐ**).\n` +
          `• **VF 7 Plus (Trần thép):** MSRP **830.000.000 VNĐ** (Ưu đãi niêm yết từ **788.500.000 VNĐ**).\n` +
          `• **VF 7 Plus (Trần kính toàn cảnh):** MSRP **850.000.000 VNĐ**.\n` +
          `• **Lệ phí trước bạ:** **0%**.\n` +
          `• **Bảo hành chính hãng:** 7 năm hoặc 160.000 km.`,
        talking_points: [
          'C-SUV thiết kế phi cơ chiến đấu thể thao nổi bật nhất thị trường',
          'Giá niêm yết kèm pin ưu đãi từ 703 triệu (Eco) và 788,5 triệu (Plus AWD)',
          'Tiết kiệm 80 - 100 triệu tiền trước bạ so với Mazda CX-5 hay Honda CR-V',
        ],
        citations: [
          { document_id: 'PRODUCT_VF7_20260922', title: 'Xe VF 7 chính hãng - Giá bán, Ưu đãi mới nhất' },
          { document_id: 'PRICE_LIST_VINFAST_20260921', title: 'Thông báo Chính sách giá bán xe ô tô điện VinFast' },
        ],
        suggested_message: `Dạ giá bán kèm pin của VF 7 đang áp dụng rất hấp dẫn: bản Eco từ 703 triệu (MSRP 740 triệu) và bản Plus 2 cầu AWD từ 788,5 triệu (MSRP 830-850 triệu). Toàn bộ xe được miễn 100% lệ phí trước bạ ạ!`,
        suggested_next_question: `Anh/chị thích bản trần thép tiêu chuẩn hay bản trần kính Panorama sang trọng ạ?`,
      };
    }
    return {
      answer: `Thông số kỹ thuật đẳng cấp **VinFast VF 7**:\n\n` +
        `• **Quãng đường di chuyển (NEDC):** **440 km** (Eco) | **500,5 km** (Plus AWD).\n` +
        `• **Công suất & Mô-men xoắn:**\n` +
        `  - Eco (FWD): 130 kW (174 HP) | 250 Nm.\n` +
        `  - Plus (AWD 2 cầu): **260 kW (349 HP)** | **500 Nm**, tăng tốc 0–100 km/h chỉ **5,8 giây**.\n` +
        `• **Dung lượng pin:** 75,3 kWh.\n` +
        `• **Hệ thống ADAS:** Hỗ trợ giữ làn khẩn cấp, phanh tự động AEB, kiểm soát hành trình thích ứng Stop & Go toàn dải tốc độ.\n` +
        `• **Bảo hành:** 7 năm hoặc 160.000 km.`,
      talking_points: [
        'Bản Plus AWD mạnh mẽ tới 349 mã lực và 500 Nm, tăng tốc 0-100 km/h trong 5,8 giây',
        'Quãng đường lên tới 500,5 km NEDC sẵn sàng cho các chuyến liên tỉnh',
        'Hệ thống ADAS thông minh vượt xa các đối thủ SUV máy xăng cùng tầm giá',
      ],
      citations: [
        { document_id: 'PRODUCT_VF7_20260922', title: 'Xe VF 7 chính hãng - Giá bán, Ưu đãi mới nhất' },
      ],
      suggested_message: `Dạ VF 7 bản Plus 2 cầu AWD có công suất tới 349 mã lực, mô-men xoắn 500 Nm và tăng tốc 0-100 km/h chỉ 5,8 giây. Quãng đường đạt 500,5 km NEDC cho mỗi lần sạc đầy ạ!`,
      suggested_next_question: `Em mời anh/chị ghé showroom để lái thử cảm nhận độ bốc của khối động cơ 349 HP này nhé?`,
    };
  }

  // CASE 5: VF 8 & VF 9 SPECS & PRICES
  if (detectedVehicle?.id === 'vf8' || detectedVehicle?.id === 'vf9') {
    const isVf8 = detectedVehicle.id === 'vf8';
    if (isVf8) {
      return {
        answer: `Thông số & Giá bán **VinFast VF 8**:\n\n` +
          `• **Giá bán MSRP kèm pin:** Eco: **898.000.000 VNĐ** | Plus: **1.079.000.000 VNĐ** (VF 8 Thế hệ mới: từ 899 triệu).\n` +
          `• **Quãng đường di chuyển (NEDC):** **457 – 471 km** (bản pin CATL đạt tới 480-500 km).\n` +
          `• **Công suất tối đa:** 260 kW – 300 kW (349 – 402 HP) | Mô-men xoắn: 500 – 620 Nm.\n` +
          `• **Dẫn động:** AWD 2 cầu toàn thời gian.\n` +
          `• **Bảo hành xe:** 10 năm hoặc 200.000 km | Bảo hành pin: 10 năm không giới hạn km.`,
        talking_points: [
          'SUV điện D-SUV chuẩn toàn cầu xuất khẩu Mỹ & Châu Âu',
          'Bảo hành chính hãng 10 năm hoặc 200.000 km dài nhất thị trường',
          'Giá bán niêm yết từ 898 triệu kèm pin, miễn phí 100% trước bạ',
        ],
        citations: [
          { document_id: 'PRODUCT_VF8_20260922', title: 'VinFast VF 8 Thế Hệ Mới: Trang Thông Tin Chính Thức' },
          { document_id: 'PRICE_LIST_VINFAST_20260921', title: 'Chính sách giá bán các dòng xe ô tô điện VinFast' },
        ],
        suggested_message: `Dạ VF 8 có giá bán lẻ đề xuất kèm pin từ 898 triệu (Eco) và 1.079 triệu (Plus). Xe được bảo hành tới 10 năm hoặc 200.000 km và trang bị hệ dẫn động 4 bánh toàn thời gian AWD ạ!`,
        suggested_next_question: `Anh/chị đang quan tâm bản Eco hay bản Plus cao cấp có cửa sổ trời và ghế da cao cấp ạ?`,
      };
    } else {
      return {
        answer: `Thông số & Giá bán **VinFast VF 9 (E-SUV VIP)**:\n\n` +
          `• **Giá bán MSRP kèm pin:** Eco: từ **1.499.000.000 VNĐ** | Plus 7 chỗ: **1.699.000.000 VNĐ** | Plus 6 chỗ VIP Ghế Cơ trưởng: **1.710.000.000 VNĐ**.\n` +
          `• **Quãng đường di chuyển (NEDC):** lên tới **626 km/lần sạc đầy**.\n` +
          `• **Công suất:** **300 kW (402 HP)** | **Mô-men xoắn:** **620 Nm**.\n` +
          `• **Tiện nghi:** Ghế cơ trưởng hàng 2 chỉnh điện 8 hướng, massage, sưởi và thông gió.\n` +
          `• **Bảo hành:** 10 năm hoặc 200.000 km.`,
        talking_points: [
          'Đỉnh cao SUV điện cỡ lớn dành cho doanh nhân và lãnh đạo',
          'Tùy chọn Ghế Cơ trưởng VIP đẳng cấp khoang thương gia',
          'Tầm di chuyển vượt trội lên tới 626 km mỗi lần sạc',
        ],
        citations: [
          { document_id: 'PRODUCT_VF9_20260922', title: 'Xe điện VinFast VF 9 - Giá bán và chương trình ưu đãi' },
          { document_id: 'PRICE_LIST_VINFAST_20260921', title: 'Chính sách giá bán các dòng xe ô tô điện VinFast' },
        ],
        suggested_message: `Dạ VF 9 là dòng SUV điện full-size cao cấp nhất của VinFast với tầm hoạt động 626 km và tùy chọn hàng ghế Cơ trưởng VIP massage sưởi/làm mát. Giá bán kèm pin từ 1.499 triệu (Eco) và 1.699 triệu (Plus) ạ!`,
        suggested_next_question: `Anh/chị muốn tìm hiểu bản 7 chỗ đa dụng hay bản 6 chỗ ghế thương gia cơ trưởng ạ?`,
      };
    }
  }

  // CASE 6: BATTERY RENTAL VS BUYING & SOH < 70%
  if (isBatteryQuery || matchedFaq?.id === 'faq-1' || matchedFaq?.id === 'faq-2') {
    const batteryPolicy = POLICIES.find((p) => p.id === 'battery-rental') || POLICIES[0];
    return {
      answer: `Chính sách Pin Xe điện VinFast theo Hợp đồng và Văn bản chính thức:\n\n` +
        `1. **Chính sách Thuê pin (Bảo hiểm rủi ro pin):**\n` +
        `• Pin thuộc sở hữu của VinFast, khách hàng **không phải chịu rủi ro hao mòn tài sản**.\n` +
        `• **Cam kết đổi mới miễn phí:** Khi dung lượng pin khả dụng tối đa (SOH) xuống dưới **70%**, khách hàng được thay thế cụm pin mới hoàn toàn miễn phí tại xưởng dịch vụ ủy quyền.\n` +
        `• Giúp tiết kiệm chi phí mua xe ban đầu từ 80 đến gần 500 triệu đồng.\n\n` +
        `2. **Chính sách Mua đứt pin:**\n` +
        `• Khách hàng sở hữu trọn vẹn cả xe và pin, không tốn chi phí thuê pin hàng tháng.\n` +
        `• Bảo hành chính hãng từ **8 đến 10 năm không giới hạn km**.\n\n` +
        `*Khuyên dùng:* Khách chạy dịch vụ hoặc muốn tối ưu vốn ban đầu nên chọn thuê pin; khách mua xe gia đình đi ít hoặc doanh nghiệp nên chọn mua pin.`,
      talking_points: [
        'Hợp đồng thuê pin đóng vai trò như cam kết bảo hiểm chai pin trọn đời',
        'Quy chuẩn đổi pin miễn phí khi SOH < 70% minh bạch bằng văn bản pháp lý',
        'Bảo hành pin mua đứt 8-10 năm không giới hạn số km cao nhất thị trường',
      ],
      citations: [
        { document_id: batteryPolicy.document_id, title: batteryPolicy.title },
        { document_id: 'POLICY_CHARGING_VINFAST_20260919', title: 'Thông báo Chính sách ưu đãi sạc pin VinFast' },
      ],
      suggested_message: `Dạ nếu anh/chị chọn thuê pin thì VinFast chịu toàn bộ trách nhiệm bảo dưỡng, khi dung lượng pin chai dưới 70% SOH sẽ được đổi cụm pin mới hoàn toàn miễn phí. Còn nếu mua đứt pin thì được bảo hành tới 8-10 năm không giới hạn số km ạ!`,
      suggested_next_question: `Trung bình một tháng anh/chị di chuyển khoảng bao nhiêu km để em tính toán gói cước kinh tế nhất ạ?`,
    };
  }

  // CASE 7: CHARGING IN APARTMENTS & INFRASTRUCTURE
  if (isChargingQuery || matchedFaq?.id === 'faq-5') {
    const naStation = CHARGING_STATIONS[0];
    return {
      answer: `Giải pháp Sạc Xe điện VinFast cho cư dân Chung cư & Đô thị:\n\n` +
        `• **Hạ tầng trạm sạc V-GREEN:** Hơn **150.000 cổng sạc** đã phủ sóng 63 tỉnh thành, các tuyến cao tốc, quốc lộ và trung tâm thương mại.\n` +
        `• **Phương án cho cư dân chung cư:**\n` +
        `  1. **Sạc kết hợp sinh hoạt:** Tranh thủ 25 – 35 phút đi siêu thị VinMart/WinMart, mua sắm hoặc uống cà phê tại Vincom, cây xăng PVOIL/Petrolimex để sạc nhanh DC 10-70% (đủ đi 3 - 5 ngày).\n` +
        `  2. **Trạm sạc công cộng dày đặc:** Bán kính di chuyển tới trạm sạc tại các đô thị chỉ từ 1 – 3 km.\n` +
        `  3. **Biểu phí tiêu chuẩn:** 3.858 VNĐ/kWh (đã gồm VAT), thanh toán tự động qua App VinFast.\n` +
        `• **Ví dụ tiêu biểu:** ${naStation.name} (${naStation.ports_total} cổng sạc, hỗ trợ ${naStation.power_types.join(', ')} phục vụ 24/7).`,
      talking_points: [
        'Mạng lưới 150.000+ cổng sạc toàn quốc, khoảng cách 30-50km/trạm trên các tuyến quốc lộ',
        'Thời gian sạc DC siêu nhanh chỉ 24-35 phút tương đương thời gian uống ly cafe',
        'Ứng dụng VinFast hiển thị trạm sạc và số lượng trụ trống chính xác theo thời gian thực',
      ],
      citations: [
        { document_id: 'POLICY_CHARGING_VINFAST_20260919', title: 'Thông báo Chính sách ưu đãi sạc pin VinFast tại Việt Nam' },
        { document_id: 'POLICY_CHARGING_VINFAST_20260424', title: 'Chính sách Mạng lưới Trạm sạc V-GREEN' },
      ],
      suggested_message: `Dạ anh/chị hoàn toàn yên tâm ạ. Mạng lưới V-GREEN hiện có hơn 150.000 cổng sạc khắp 63 tỉnh thành. Quanh khu vực chung cư đều có các trụ sạc nhanh DC, mình chỉ cần ghé sạc 25-30 phút lúc đi mua sắm là pin đã đủ dùng cả tuần rồi ạ!`,
      suggested_next_question: `Anh/chị đang sống ở khu vực quận/huyện nào để em kiểm tra trạm sạc V-GREEN gần nhà mình nhất ạ?`,
    };
  }

  // CASE 8: COMPETITOR COMPARISON (ADAS, CX-5, HONDA SENSING, PETROL CARS)
  if (isCompetitorQuery || matchedFaq?.id === 'faq-3') {
    return {
      answer: `So sánh Trực diện Xe điện VinFast vs Xe xăng Cùng Phân khúc:\n\n` +
        `1. **Công nghệ an toàn & Hỗ trợ lái ADAS:**\n` +
        `• VinFast trang bị **ADAS Cấp độ 2** với tính năng **Hỗ trợ lái khi ùn tắc (Traffic Jam Assist)** và **Kiểm soát hành trình thích ứng Stop & Go toàn dải tốc độ (0 - 130 km/h)**.\n` +
        `• Các hệ thống xe xăng đối thủ (như Honda Sensing hay Mazda i-Activesense ở các bản tiêu chuẩn) thường chỉ kích hoạt khi xe chạy trên dải tốc độ 30–65 km/h.\n\n` +
        `2. **Chi phí năng lượng & Vận hành:**\n` +
        `• Chi phí sạc điện: Khoảng **300 – 500 VNĐ/km** (tiết kiệm 60% – 70% so với xe xăng trung bình 1.500 – 2.000 VNĐ/km).\n` +
        `• Bảo dưỡng: Giảm 60% do không phải thay dầu nhớt, bugi, lọc gió động cơ, hộp số phức tạp.\n\n` +
        `3. **Lợi thế lăn bánh:** Miễn 100% lệ phí trước bạ giúp giá lăn bánh rẻ hơn từ 30 đến hơn 100 triệu đồng.`,
      talking_points: [
        'Hệ thống ADAS cấp độ cao hỗ trợ lái an toàn ngay cả khi kẹt xe từ 0 km/h',
        'Chi phí vận hành tiết kiệm hàng chục triệu đồng mỗi năm',
        'Tăng tốc tức thì không độ trễ, không rung lắc và không mùi xăng độc hại',
      ],
      citations: [
        { document_id: 'PRODUCT_VF7_20260922', title: 'Tài liệu Kỹ thuật & ADAS VinFast VF 7' },
        { document_id: 'PROMOTION_SALES_VINFAST_20260921', title: 'Chính sách thúc đẩy bán hàng Ô tô điện VinFast' },
      ],
      suggested_message: `Dạ so với xe xăng cùng phân khúc, xe điện VinFast vượt trội ở hệ thống ADAS Cấp độ 2 hoạt động mượt mà từ 0 km/h. Chi phí nuôi xe hàng tháng chỉ bằng 1/3 xe xăng và được miễn toàn bộ lệ phí trước bạ khi đăng ký xe ạ!`,
      suggested_next_question: `Em mời anh/chị ghé showroom trải nghiệm lái thử xe để cảm nhận sự khác biệt về độ êm và tính năng ADAS nhé?`,
    };
  }

  // CASE 9: PROMOTIONS, TAX 0%, REGISTRATION, BANK LOANS
  if (isPolicyQuery || matchedFaq?.id === 'faq-4') {
    const taxPolicy = POLICIES.find((p) => p.id === 'tax-incentives') || POLICIES[2];
    return {
      answer: `Chính sách Ưu đãi & Quyền lợi Đặc quyền VinFast 2026:\n\n` +
        `• **Miễn 100% Lệ phí trước bạ:** Áp dụng cho toàn bộ xe ô tô điện VinFast (tiết kiệm từ 30 triệu đến hơn 200 triệu đồng chi phí lăn bánh).\n` +
        `• **Chính sách sạc V-GREEN:** Miễn phí hoặc ưu đãi giá sạc theo các chương trình thúc đẩy chuyển đổi xanh toàn quốc.\n` +
        `• **Gói hỗ trợ tài chính trả góp:** Liên kết hệ thống ngân hàng lớn, hỗ trợ vay **70% - 80% giá trị xe** với thời hạn tối đa 8 năm, lãi suất ưu đãi cố định.\n` +
        `• **Chính sách Hậu mãi:** Cứu hộ 24/7 miễn phí toàn quốc trong suốt thời gian bảo hành xe.`,
      talking_points: [
        'Ưu đãi trước bạ 0% là lợi thế kinh tế lớn nhất của ô tô điện thời điểm hiện tại',
        'Hỗ trợ vay trả góp linh hoạt lên tới 80% giá trị xe',
        'Bảo hành chính hãng dài nhất thị trường từ 7 - 10 năm',
      ],
      citations: [
        { document_id: taxPolicy.document_id, title: taxPolicy.title },
        { document_id: 'PROMOTION_SALES_VINFAST_20260921', title: 'Thông báo Chính sách thúc đẩy bán hàng Ô tô điện VinFast' },
      ],
      suggested_message: `Dạ hiện tại xe điện VinFast đang được miễn 100% lệ phí trước bạ nên chi phí lăn bánh cực kỳ tốt so với xe xăng. Bên em có gói trả góp vay tới 80% giá trị xe trong 8 năm giúp anh/chị nhận xe với số tiền ban đầu rất nhẹ nhàng ạ!`,
      suggested_next_question: `Anh/chị dự kiến thanh toán trả thẳng hay muốn tham khảo phương án trả góp để em gửi bảng dự toán chi tiết ạ?`,
    };
  }

  // CASE 10: GENERAL VINFAST LINEUP OVERVIEW
  return {
    answer: `Tổng quan Dải Sản phẩm Ô tô điện Thông minh VinFast 2026:\n\n` +
      `• **VF 3 (Mini SUV):** Giá từ 240 triệu | Quãng đường 215 km | Linh hoạt phố thị.\n` +
      `• **VF 5 Plus (A-SUV):** Giá từ 468 triệu | Quãng đường 326,4 km | Lựa chọn kinh tế số 1.\n` +
      `• **VF 6 (B-SUV):** Giá từ 646 triệu | Quãng đường 485 km | SUV gia đình, ADAS Cấp độ 2.\n` +
      `• **VF 7 (C-SUV):** Giá từ 703 triệu (MSRP 740 triệu) | Quãng đường 440–500,5 km | Bản AWD 349 HP.\n` +
      `• **VF 8 (D-SUV):** Giá từ 898 triệu | Quãng đường 457–471 km | SUV toàn cầu, bảo hành 10 năm.\n` +
      `• **VF 9 (E-SUV VIP):** Giá từ 1.499 triệu | Quãng đường tới 626 km | Ghế cơ trưởng thương gia VIP.\n\n` +
      `*Toàn bộ các dòng xe đều được hưởng ưu đãi miễn 100% lệ phí trước bạ và có sẵn hạ tầng 150.000+ cổng sạc V-GREEN trên toàn quốc.*`,
    talking_points: [
      'Dải sản phẩm đa dạng từ Mini SUV đô thị đến E-SUV hạng sang',
      'Hạ tầng 150.000+ cổng sạc phủ kín 63 tỉnh thành',
      'Chính sách bảo hành 7-10 năm cao nhất thị trường',
    ],
    citations: [
      { document_id: 'PRICE_LIST_VINFAST_20260921', title: 'Thông báo Chính sách giá bán xe ô tô điện VinFast Việt Nam' },
      { document_id: 'POLICY_BATTERY_RENTAL_CONTRACT_20260801', title: 'HỢP ĐỒNG CHO THUÊ PIN XE ĐIỆN' },
    ],
    suggested_message: `Dạ VinFast có đầy đủ các phân khúc từ VF 3, VF 5 cho đô thị tới VF 6, VF 7, VF 8, VF 9 cho gia đình và doanh nhân. Tất cả các dòng xe đều được miễn 100% lệ phí trước bạ và bảo hành chính hãng từ 7 đến 10 năm ạ!`,
    suggested_next_question: `Anh/chị đang tìm xe phục vụ nhu cầu cá nhân hay gia đình với tầm ngân sách khoảng bao nhiêu ạ?`,
  };
}
