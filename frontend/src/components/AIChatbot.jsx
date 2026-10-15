import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, User, RefreshCw, ChevronDown, Mic, MicOff, Download, Activity, AlertTriangle, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useTheme } from '../context/useTheme';

// ── Detect urgency in user message ────────────────────────────────────────
function detectUrgency(text) {
  const t = text.toLowerCase();
  const critical = ['chest pain', 'heart attack', 'can\'t breathe', 'stroke', 'unconscious', 'bleeding', 'emergency', 'dying', '911', 'ambulance', 'severe pain', 'collapsed'];
  const warning  = ['dizzy', 'nausea', 'vomiting', 'high fever', 'can\'t sleep', 'severe headache', 'blurry vision', 'fainting'];
  if (critical.some((w) => t.includes(w))) return 'critical';
  if (warning.some((w) => t.includes(w)))  return 'warning';
  return 'normal';
}

// ── Symptom Checker steps ─────────────────────────────────────────────────
const SYMPTOM_STEPS = [
  { id: 'main',     q: 'What is your main symptom?',             options: ['Chest pain', 'Headache', 'Fever', 'Fatigue', 'Breathlessness', 'Abdominal pain', 'Dizziness', 'Other'] },
  { id: 'duration', q: 'How long have you had this symptom?',    options: ['< 1 hour', '1–24 hours', '1–3 days', '4–7 days', '> 1 week'] },
  { id: 'severity', q: 'How severe is it? (1 = mild, 5 = severe)', options: ['1 – Mild', '2 – Uncomfortable', '3 – Moderate', '4 – Severe', '5 – Unbearable'] },
  { id: 'other',    q: 'Any other symptoms alongside it?',       options: ['Nausea / Vomiting', 'Sweating', 'Palpitations', 'None of the above'] },
];

// ── Format markdown-like content ──────────────────────────────────────────
function renderContent(content, isLight) {
  return content.split('\n').filter((l) => l.trim() !== '').map((line, i) => {
    if (/^\*\*(.+)\*\*$/.test(line)) return <p key={i} className="fw-bold m-0 mb-1" style={{ color: 'var(--brand-blue)' }}>{line.slice(2, -2)}</p>;
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="m-0 mb-1" style={{ paddingLeft: '10px', color: 'var(--text-secondary)' }}>{line}</p>;
    if (/^\d+\./.test(line)) return <p key={i} className="m-0 mb-1" style={{ paddingLeft: '10px', color: 'var(--text-secondary)' }}>{line}</p>;
    return <p key={i} className="m-0 mb-1" style={{ color: 'var(--text-primary)' }}>{line}</p>;
  });
}

// ── Message Bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, onFollowUp }) {
  const isUser = msg.role === 'user';
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const urgency = isUser ? detectUrgency(msg.content) : 'normal';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`d-flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} align-items-end`}
      style={{ marginBottom: '14px' }}
    >
      <div className="flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle"
        style={{ width: '28px', height: '28px', flexShrink: 0,
          background: isUser ? 'rgba(0,245,212,0.15)' : 'rgba(223,64,255,0.15)',
          border: isUser ? '1px solid rgba(0,245,212,0.3)' : '1px solid rgba(223,64,255,0.3)',
        }}>
        {isUser ? <User size={13} className="text-info" /> : <Bot size={13} style={{ color: 'var(--accent-purple)' }} />}
      </div>

      <div style={{ maxWidth: '82%' }}>
        {/* Urgency banner */}
        {urgency === 'critical' && (
          <div className="d-flex align-items-center gap-1 mb-1 px-2 py-1 rounded" style={{ background: 'rgba(255,0,85,0.15)', border: '1px solid rgba(255,0,85,0.4)', fontSize: '0.62rem', color: '#ff3366' }}>
            <AlertTriangle size={11} /> URGENT — Consider calling emergency services
          </div>
        )}
        {urgency === 'warning' && (
          <div className="d-flex align-items-center gap-1 mb-1 px-2 py-1 rounded" style={{ background: 'rgba(255,143,0,0.12)', border: '1px solid rgba(255,143,0,0.35)', fontSize: '0.62rem', color: 'var(--accent-orange)' }}>
            <AlertTriangle size={11} /> Monitor closely — consult a doctor if it worsens
          </div>
        )}

        <div style={{
          background: isUser
            ? (isLight ? 'var(--bg-card-tinted)' : 'rgba(44,111,181,0.15)')
            : 'var(--bg-surface)',
          border: isUser
            ? `1px solid ${urgency === 'critical' ? 'rgba(255,0,85,0.5)' : 'var(--border-card)'}`
            : `1px solid var(--border)`,
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding: '10px 14px', fontSize: '0.82rem', lineHeight: '1.55',
          color: 'var(--text-primary)',
        }}>
          {renderContent(msg.content, isLight)}
          <span className="d-block mt-1" style={{ fontSize: '0.58rem', opacity: 0.4 }}>{msg.time}</span>
        </div>

        {/* Follow-up suggestions (AI messages only) */}
        {!isUser && msg.followUps && msg.followUps.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mt-2">
            {msg.followUps.map((f, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(f)}
                style={{
                  background: isLight ? 'rgba(100,40,200,0.07)' : 'rgba(120,40,200,0.1)',
                  border: `1px solid ${isLight ? 'rgba(100,40,200,0.18)' : 'rgba(180,130,255,0.2)'}`,
                  borderRadius: '16px',
                  color: isLight ? 'rgba(60,20,140,0.85)' : 'rgba(210,190,255,0.75)',
                  fontSize: '0.65rem',
                  padding: '3px 10px', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Symptom Checker UI ─────────────────────────────────────────────────────
function SymptomChecker({ onComplete, onCancel }) {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const pick = (val) => {
    const newAnswers = { ...answers, [SYMPTOM_STEPS[step].id]: val };
    setAnswers(newAnswers);
    if (step + 1 < SYMPTOM_STEPS.length) {
      setStep(step + 1);
    } else {
      const summary = `Symptom Check:\n• Main symptom: ${newAnswers.main}\n• Duration: ${newAnswers.duration}\n• Severity: ${newAnswers.severity}\n• Other symptoms: ${newAnswers.other}`;
      onComplete(summary);
    }
  };

  const s = SYMPTOM_STEPS[step];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-3 pb-3" style={{ flexShrink: 0 }}>
      <div className="p-3 rounded" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-card)'
      }}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="font-monospace" style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--brand-blue)' }}>
            SYMPTOM CHECK • STEP {step + 1}/{SYMPTOM_STEPS.length}
          </span>
          <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} aria-label="Cancel symptom check">
            <X size={14} />
          </button>
        </div>
        <p className="fw-bold mb-3" style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{s.q}</p>
        <div className="d-flex flex-wrap gap-2">
          {s.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(opt)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                padding: '6px 12px', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-tinted)'; e.currentTarget.style.borderColor = 'var(--brand-orange)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Chatbot ───────────────────────────────────────────────────────────
export default function AIChatbot({ user }) {
  const isPatient = !!user;
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Theme-aware colour palette — Token-based system
  const C = {
    panelBg:      'var(--bg-card)',
    panelBorder:  'var(--border-card)',
    panelShadow:  'var(--shadow-md)',
    headerBg:     'var(--bg-surface)',
    headerBorder: 'var(--border)',
    inputBg:      'var(--bg-input)',
    inputBorder:  'var(--border)',
    inputColor:   'var(--text-primary)',
    divider:      'var(--border)',
    btnColor:     'var(--text-secondary)',
    dotsBg:       'var(--bg-card-tinted)',
    quickBg:      'var(--bg-card-tinted)',
    quickBorder:  'var(--border)',
    quickColor:   'var(--brand-blue)',
  };
  const [isOpen, setIsOpen]   = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: isPatient
      ? `Hello ${user?.full_name?.split(' ')[0] || 'there'}! I'm your MedFusion AI health assistant. Ask me anything about your health, medications, or risk assessments. Use the symptom check button for a guided symptom assessment.`
      : `Hello! I'm MedFusion AI. Ask me general health questions, or use the Symptom Checker button for a guided assessment. Sign in for personalized guidance.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    followUps: isPatient
      ? ['What does my risk score mean?', 'What foods should I avoid?', 'Am I at heart disease risk?']
      : ['What are signs of diabetes?', 'How to lower blood pressure?', 'When to see a doctor?'],
  }]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [unread, setUnread]           = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);
  const [voiceSupported]              = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 120); }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showSymptomChecker]);

  // ── Voice input ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ── Export chat ───────────────────────────────────────────────────────
  const exportChat = () => {
    const lines = [
      '==============================================',
      '  MEDFUSION AI — HEALTH CHAT TRANSCRIPT',
      '==============================================',
      `Exported: ${new Date().toLocaleString()}`,
      `User: ${user?.full_name || 'Guest'}`,
      '',
      ...messages.map((m) => `[${m.time}] ${m.role === 'user' ? 'You' : 'MedFusion AI'}:\n${m.content}`),
      '',
      '==============================================',
      'DISCLAIMER: This is not medical advice.',
      'Always consult a licensed healthcare provider.',
      '==============================================',
    ];
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `MedFusion_Chat_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Send message ──────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');
    setShowSymptomChecker(false);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...messages, { role: 'user', content: userText, time }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await api.post('/chat/', {
        message: userText,
        history: newMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        is_patient: isPatient,
        patient_name: user?.full_name || null,
        include_followups: true,
      });

      const reply    = res.data.reply || "I couldn't process that. Please try again.";
      const followUps = res.data.follow_ups || [];

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), followUps },
      ]);
      if (!isOpen) setUnread((n) => n + 1);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm having trouble connecting right now.\n• For emergencies call 112 / 911 immediately\n• The AI Health Check tool can assess your disease risk\n• Try again in a moment`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          followUps: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, isPatient, user, isOpen]);

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: isPatient ? `Chat cleared. How can I help, ${user?.full_name?.split(' ')[0] || 'there'}?` : 'Chat cleared. Ask me anything!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      followUps: [],
    }]);
  };

  const QUICK = isPatient
    ? ['Explain my risk score', 'What to eat for my condition?', 'Are my vitals normal?', 'What supplements help?']
    : ['Signs of diabetes?', 'How to lower BP?', 'Healthy BMI range?', 'When to see a doctor?'];

  return (
    <>
      {/* ── Toggle Button ── */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close health assistant' : 'Open health assistant'}
        className="d-flex align-items-center justify-content-center"
        style={{
          position: 'fixed', bottom: '28px', right: '28px',
          width: '54px', height: '54px', borderRadius: '50%',
          background: 'var(--brand-orange)',
          border: 'none',
          boxShadow: 'var(--shadow-md)',
          cursor: 'pointer', zIndex: 9999,
        }}
      >
        {isOpen ? <ChevronDown size={20} color="#FFFFFF" /> : <MessageSquare size={20} color="#FFFFFF" />}
        {!isOpen && unread > 0 && (
          <span className="position-absolute d-flex align-items-center justify-content-center"
            style={{ top: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-red)', fontSize: '0.62rem', fontWeight: 700, color: '#fff' }}>
            {unread}
          </span>
        )}
      </motion.button>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', bottom: '94px', right: '28px',
              width: '390px', maxWidth: 'calc(100vw - 36px)', maxHeight: '600px',
              display: 'flex', flexDirection: 'column',
              background: C.panelBg,
              border: `1px solid ${C.panelBorder}`,
              borderRadius: '12px',
              boxShadow: C.panelShadow,
              zIndex: 9998, overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background: C.headerBg, borderBottom: `1px solid ${C.headerBorder}`, flexShrink: 0 }}>
              <div className="d-flex align-items-center gap-2">
                <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '32px', height: '32px', background: isLight ? 'rgba(44,111,181,0.12)' : 'rgba(91,159,224,0.12)', border: `1px solid ${isLight ? 'rgba(44,111,181,0.3)' : 'rgba(91,159,224,0.3)'}` }}>
                  <Bot size={15} style={{ color: isLight ? 'var(--brand-blue)' : 'var(--brand-blue)' }} />
                </div>
                <div>
                  <p className="fw-bold m-0" style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>MedFusion AI</p>
                  <div className="d-flex align-items-center gap-1">
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-success)', display: 'inline-block' }} />
                    <p className="m-0" style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
                      {isPatient ? `${user?.full_name?.split(' ')[0]}'s Health Assistant` : 'General Health Assistant'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center gap-1">
                {/* Symptom Checker toggle */}
                <button
                  onClick={() => setShowSymptomChecker((v) => !v)}
                  title="Symptom Checker"
                  style={{ background: showSymptomChecker ? 'rgba(244,149,74,0.12)' : 'transparent', border: showSymptomChecker ? '1px solid var(--brand-orange)' : 'none', borderRadius: '6px', color: showSymptomChecker ? 'var(--brand-orange)' : 'var(--text-secondary)', cursor: 'pointer', padding: '5px 7px', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}
                >
                  <Stethoscope size={14} />
                </button>
                {/* Export */}
                {messages.length > 1 && (
                  <button onClick={exportChat} title="Export chat" style={{ background: 'transparent', border: 'none', color: C.btnColor, cursor: 'pointer', padding: '5px' }}>
                    <Download size={14} />
                  </button>
                )}
                <button onClick={clearChat} title="Clear chat" style={{ background: 'transparent', border: 'none', color: C.btnColor, cursor: 'pointer', padding: '5px' }}>
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: C.btnColor, cursor: 'pointer', padding: '5px' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} onFollowUp={sendMessage} />
              ))}
              {loading && (
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{ width: '28px', height: '28px', background: 'rgba(223,64,255,0.15)', border: '1px solid rgba(223,64,255,0.3)' }}>
                    <Bot size={13} style={{ color: 'var(--accent-purple)' }} />
                  </div>
                  <div style={{ background: C.dotsBg, border: `1px solid ${C.msgBorder}`, borderRadius: '14px 14px 14px 4px', padding: '10px 14px' }}>
                    <div className="d-flex gap-1 align-items-center">
                      {[0, 1, 2].map((i) => (
                        <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-purple)', animation: `dotBounce 1.2s ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Symptom Checker */}
            <AnimatePresence>
              {showSymptomChecker && (
                <SymptomChecker
                  onComplete={(summary) => { setShowSymptomChecker(false); sendMessage(summary); }}
                  onCancel={() => setShowSymptomChecker(false)}
                />
              )}
            </AnimatePresence>

            {/* Quick prompts */}
            {!showSymptomChecker && messages.length <= 2 && (
              <div className="px-3 pb-2 d-flex gap-1 flex-wrap" style={{ flexShrink: 0, borderTop: `1px solid ${C.divider}`, paddingTop: '10px' }}>
                {QUICK.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    style={{ background: C.quickBg, border: `1px solid ${C.quickBorder}`, borderRadius: '20px', color: C.quickColor, fontSize: '0.65rem', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input row */}
            {!showSymptomChecker && (
              <div className="d-flex align-items-center gap-2 px-3 py-3" style={{ borderTop: `1px solid ${C.divider}`, flexShrink: 0 }}>
                {/* Voice button */}
                {voiceSupported && (
                  <button
                    onClick={isListening ? stopListening : startListening}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      background: isListening ? 'rgba(255,0,85,0.2)' : 'rgba(255,255,255,0.04)',
                      border: isListening ? '1px solid rgba(255,0,85,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: isListening ? 'pulse 1s infinite' : 'none',
                    }}
                  >
                    {isListening ? <MicOff size={15} color="#ff3366" /> : <Mic size={15} color="rgba(255,255,255,0.45)" />}
                  </button>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  placeholder={isListening ? 'Listening...' : isPatient ? 'Ask about your health...' : 'Ask a health question...'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  disabled={loading || isListening}
                  aria-label="Type your health question"
                  style={{ flex: 1, background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: '12px', color: C.inputColor, padding: '10px 14px', fontSize: '0.82rem', outline: 'none', marginBottom: 0 }}
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  style={{
                    width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0,
                    background: input.trim() && !loading ? 'var(--brand-orange)' : 'var(--bg-card-tinted)',
                    border: `1px solid var(--border)`,
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Send size={15} color={input.trim() && !loading ? '#fff' : 'var(--text-muted)'} />
                </button>
              </div>
            )}

            <p className="text-center m-0 pb-2" style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.02em', flexShrink: 0 }}>
              Not a substitute for professional medical advice
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:.5} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,0,85,0.4)} 50%{box-shadow:0 0 0 6px rgba(255,0,85,0)} }
      `}</style>
    </>
  );
}
