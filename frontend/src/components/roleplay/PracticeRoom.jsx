import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, SendIcon, SparkleIcon, CheckCircleIcon } from '../common/Icons';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { practiceApi } from '../../api/practiceApi';
import { generateEvaluationResult } from '../../lib/evaluationEngine.js';
import { createId } from '../../lib/id.js';

export function PracticeRoom({
  scenario,
  session,
  onFinish,
  onExit,
}) {
  const [messages, setMessages] = useState(
    session?.messages && session.messages.length > 0
      ? session.messages
      : [
          {
            message_id: 'init-1',
            role: 'customer',
            content:
              scenario?.visible_context ||
              'Xin chào em, anh đang phân vân dòng xe này mà không biết chính sách và chi phí thực tế thế nào.',
            timestamp: new Date().toISOString(),
          },
        ]
  );

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(session?.turn_count || 1);
  const [stage, setStage] = useState(session?.conversation_stage || 'opening');
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const chatEndRef = useRef(null);

  const stageLabels = {
    opening: 'Giai đoạn: Chào hỏi & Mở đầu',
    discovery: 'Giai đoạn: Khai thác nhu cầu',
    presentation: 'Giai đoạn: Giới thiệu giải pháp',
    objection_handling: 'Giai đoạn: Xử lý băn khoăn',
    closing: 'Giai đoạn: Chốt & Hướng dẫn',
    completed: 'Giai đoạn: Hoàn thành',
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    if (!text || loading) return;

    const advisorMsg = {
      message_id: createId('adv'),
      role: 'advisor',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, advisorMsg];
    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);
    const newTurn = turnCount + 1;
    setTurnCount(newTurn);

    try {
      if (
        session?.session_id &&
        !session.session_id.startsWith('sess-local') &&
        scenario?.is_backend
      ) {
        const updated = await practiceApi.sendMessage(session.session_id, text);
        if (updated?.messages && updated.messages.length > 0) {
          setMessages(updated.messages);
        }
        if (updated?.conversation_stage) {
          setStage(updated.conversation_stage);
        }
        if (updated?.turn_count !== undefined) {
          setTurnCount(updated.turn_count);
        }
        setLoading(false);
        return;
      }
      throw new Error('Local simulation');
    } catch {
      // Intelligent fallback customer simulator
      await new Promise((r) => setTimeout(r, 900));

      let reply;
      if (newTurn <= 2) {
        reply = `Anh cũng đang tính toán chi phí vận hành hàng tháng. Xe điện chạy nhiều có thực sự tiết kiệm hơn xe xăng không em? Pin sau 3-5 năm thì độ bền ra sao và sạc ở đâu tiện nhất?`;
        setStage('objection_handling');
      } else if (newTurn === 3) {
        reply = `Ừ, nếu thuê pin mà được đổi mới miễn phí khi chai dưới 70% thì anh cũng yên tâm phần nào. Thế còn chính sách hỗ trợ trả góp và ưu đãi thuế trước bạ hiện tại thế nào em?`;
        setStage('presentation');
      } else {
        reply = `Nghe tư vấn rất rõ ràng và thuyết phục đấy. Em gửi anh bảng kê chi tiết giá lăn bánh và xếp lịch cho anh qua showroom lái thử xe vào cuối tuần này nhé!`;
        setStage('closing');
      }

      const customerMsg = {
        message_id: createId('cust'),
        role: 'customer',
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, customerMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSession = async () => {
    setFinishing(true);
    try {
      let resultView = null;

      // 1. Try real backend finish endpoint if backend session is active
      if (
        session?.session_id &&
        !session.session_id.startsWith('sess-local') &&
        scenario?.is_backend
      ) {
        try {
          const res = await practiceApi.finishSession(session.session_id);
          if (res && res.result && res.evaluation_status === 'completed') {
            resultView = res;
          } else if (res && res.evaluation_status === 'pending') {
            await new Promise((r) => setTimeout(r, 1200));
            const polled = await practiceApi.getResult(session.session_id);
            if (polled && polled.result) {
              resultView = polled;
            }
          }
        } catch (apiErr) {
          console.warn('Backend finishSession unavailable, activating Rubric 2.0 Engine:', apiErr);
        }
      }

      // 2. Guarantee evaluation via dynamic Rubric 2.0 Engine if backend did not yield final result
      if (!resultView || !resultView.result) {
        await new Promise((r) => setTimeout(r, 600));
        resultView = generateEvaluationResult(scenario, session, messages);
      }

      onFinish(resultView);
    } catch (err) {
      console.error('Finish fallback execution:', err);
      const failsafeResult = generateEvaluationResult(scenario, session, messages);
      onFinish(failsafeResult);
    } finally {
      setFinishing(false);
      setShowFinishConfirm(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 650, backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E5E5', overflow: 'hidden' }}>
      {/* ROOM HEADER */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onExit}
            className="btn-ghost"
            style={{ padding: '6px 10px', fontSize: '0.85rem' }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            <span>Rời phòng</span>
          </button>

          <div style={{ height: 20, width: 1, backgroundColor: '#E5E5E5' }} />

          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#111111' }}>
              {scenario?.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Badge variant="highlight">{scenario?.model_badge || scenario?.model}</Badge>
              <span style={{ fontSize: '0.75rem', color: '#666666' }}>
                {stageLabels[stage] || stage}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#888888' }}>
                • Lượt trao đổi: {turnCount}
              </span>
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ backgroundColor: '#111111', fontSize: '0.85rem', padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowFinishConfirm(true)}
          disabled={finishing}
        >
          <span>🏁 Kết thúc & Chấm điểm</span>
        </button>
      </div>

      {/* CUSTOMER CONTEXT BANNER */}
      <div style={{ padding: '12px 20px', backgroundColor: '#F8F8F6', borderBottom: '1px solid #EDEDEA', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={scenario?.persona?.avatar}
            alt={scenario?.persona?.name}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111111' }}>
              {scenario?.persona?.name} ({scenario?.persona?.role})
            </div>
            <div style={{ fontSize: '0.75rem', color: '#737373' }}>
              Phong cách: {scenario?.persona?.communication_style}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#555555' }}>
          🎯 <strong>Mục tiêu:</strong> {scenario?.training_objective}
        </div>
      </div>

      {/* CHAT THREAD */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 18, backgroundColor: '#FFFFFF' }}>
        {messages.map((m, idx) => (
          <div
            key={m.message_id || idx}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              alignSelf: m.role === 'advisor' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            {m.role === 'customer' && (
              <img
                src={scenario?.persona?.avatar}
                alt="Khách hàng"
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            )}

            <div
              style={{
                padding: '14px 18px',
                borderRadius: 14,
                backgroundColor: m.role === 'advisor' ? '#111111' : '#F4F4F2',
                color: m.role === 'advisor' ? '#FFFFFF' : '#111111',
                fontSize: '0.92rem',
                lineHeight: 1.5,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: 4, opacity: 0.7 }}>
                {m.role === 'advisor' ? 'Bạn (Tư vấn viên)' : scenario?.persona?.name || 'Khách hàng'}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
            </div>

            {m.role === 'advisor' && (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: '#111111',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                An
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <img
              src={scenario?.persona?.avatar}
              alt="Khách hàng"
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ padding: '12px 18px', borderRadius: 14, backgroundColor: '#F4F4F2', fontSize: '0.85rem', color: '#666666' }}>
              Khách hàng đang suy nghĩ và phản hồi...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* INPUT BAR */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E5E5', backgroundColor: '#FAFAFA' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Nhập nội dung tư vấn khách hàng... (Nhấn Enter để gửi, Shift+Enter xuống dòng)"
            rows={2}
            style={{
              flex: 1,
              minWidth: 260,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #D1D1CE',
              outline: 'none',
              resize: 'none',
              fontSize: '0.9rem',
              lineHeight: 1.4,
              backgroundColor: '#FFFFFF',
            }}
            disabled={loading}
          />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || loading}
              className="btn-primary"
              style={{ height: 46, padding: '0 20px' }}
            >
              <SendIcon style={{ width: 16, height: 16 }} />
              <span>Gửi</span>
            </button>

            <button
              onClick={() => setShowFinishConfirm(true)}
              className="btn-outline"
              style={{ height: 46, padding: '0 16px', fontWeight: 600, fontSize: '0.82rem', borderColor: '#CFCFCB' }}
              title="Kết thúc và chấm điểm phiên thực chiến"
            >
              <span>🏁 Chấm điểm</span>
            </button>
          </div>
        </div>
      </div>

      {/* FINISH CONFIRM MODAL */}
      <Modal
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        title="Xác nhận hoàn tất phiên thực chiến"
        maxWidth={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.95rem', color: '#111111', lineHeight: 1.5 }}>
            Bạn muốn đóng băng hội thoại và yêu cầu Hệ thống Chấm điểm AI đánh giá phiên thực chiến này?
          </p>

          <div style={{ backgroundColor: '#F7F7F5', border: '1px solid #E5E5E5', padding: '14px 16px', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111111', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircleIcon style={{ width: 14, height: 14, color: '#166534' }} />
              Hệ thống sẽ chấm điểm 5 tiêu chí Rubric chuẩn:
            </div>
            <ul style={{ listStyle: 'none', paddingLeft: 0, fontSize: '0.78rem', color: '#555555', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <li>1. Need Discovery (Khai thác nhu cầu)</li>
              <li>2. Product Knowledge (Kiến thức sản phẩm & Thông số)</li>
              <li>3. Objection Handling (Xử lý băn khoăn về pin & trạm sạc)</li>
              <li>4. Policy Accuracy (Độ chính xác chính sách VinFast)</li>
              <li>5. Closing / Next Step (Chốt lịch hẹn & bước tiếp theo)</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="outline" onClick={() => setShowFinishConfirm(false)}>
              Tiếp tục trao đổi
            </Button>
            <Button variant="primary" loading={finishing} onClick={handleFinishSession}>
              <SparkleIcon style={{ width: 14, height: 14 }} />
              <span>Chấm điểm ngay</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
