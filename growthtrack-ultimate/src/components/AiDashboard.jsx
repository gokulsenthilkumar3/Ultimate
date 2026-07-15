import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import useStore from '../store/useStore';
import { Send, Bot, User, Trash2, Copy, Zap, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { askGemini as firebaseAskGemini } from '../lib/firebase';

// ── Typing simulation component ────────────────────────────────────────────
function TypedMessage({ text, speed = 12, onDone }) {
  const [displayed, setDisplayed] = useState('');
  const idxRef = useRef(0);

  useEffect(() => {
    idxRef.current = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      idxRef.current++;
      if (idxRef.current <= text.length) {
        setDisplayed(text.slice(0, idxRef.current));
      } else {
        clearInterval(interval);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{displayed}<span style={{ opacity: idxRef.current < text.length ? 1 : 0, marginLeft: '1px', animation: 'blink 1s step-end infinite' }}>▌</span></span>;
}

const QUICK_PROMPTS = [
  { label: '📊 Today summary',   prompt: 'Give me a quick summary of my progress today across health, habits, and tasks.' },
  { label: '💪 Workout advice',  prompt: 'Based on my training history and PRs, what should I focus on in my next workout?' },
  { label: '🎯 Goal check',      prompt: 'How am I progressing toward my current goals? What should I prioritise?' },
  { label: '😴 Sleep analysis',  prompt: 'Analyse my recent sleep patterns and give me actionable advice to improve sleep quality.' },
  { label: '💰 Finance tip',     prompt: 'Give me a personalised finance tip based on my current income, expenses, and saving rate.' },
  { label: '🔥 Habit coaching',  prompt: 'Which of my habits has the lowest completion rate? How can I improve it?' },
  { label: '🥗 Nutrition guide', prompt: 'Based on my nutrition goals, what macro adjustments would help me most right now?' },
  { label: '🧠 Weekly plan',     prompt: 'Create a prioritised weekly action plan for me based on all my current data.' },
];

const CACHE_KEY = 'gt_ai_cache_v2';
function getCache() { try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; } }
function setCache(msgs) { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(msgs.slice(-40))); } catch {} }

export default function AiDashboard() {
  const toast = useToast();
  const state = useStore();

  const [messages,    setMessages]    = useState(getCache);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [typing,      setTyping]      = useState(false);
  const [model,       setModel]       = useState('gemini-1.5-flash');
  const [showPrompts, setShowPrompts] = useState(messages.length === 0);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => { setCache(messages); }, [messages]);

  // Build rich user context string
  const userContext = useMemo(() => {
    const u = state.user || {};
    const goals     = (state.goals      || []).slice(0, 5);
    const habits    = (state.habits     || []).slice(0, 8);
    const tasks     = (state.tasks      || []).filter(t => !t.completed).slice(0, 5);
    const metrics   = (state.metric_logs || []).slice(-10);
    const sleep     = (state.sleep_logs  || []).slice(-7);
    const finance   = state.finance || {};

    const formatGoal = g => `${g.title} (${Math.min(100, Math.round((Number(g.current_value || 0) / Number(g.target_value || 1)) * 100))}% done, status: ${g.status})`;
    const formatHabit = h => `${h.name} (category: ${h.category})`;
    const formatTask  = t => `${t.title} (priority: ${t.priority || 'normal'}, due: ${t.due_date || 'no date'})`;
    const formatMetric = m => `${m.type}: ${m.value} ${m.unit || ''} on ${m.date}`;
    const formatSleep  = s => `${s.date}: ${s.duration}h, quality ${s.quality}/10`;
    const formatFin    = () => finance.accounts ? `balance: ₹${Object.values(finance.accounts).reduce((s, a) => s + (a.balance || 0), 0).toLocaleString()}` : '';

    return [
      `User: ${u.name || 'User'}, age ${u.age || '?'}, gender ${u.gender || '?'}`,
      goals.length     ? `Goals: ${goals.map(formatGoal).join('; ')}`        : '',
      habits.length    ? `Habits: ${habits.map(formatHabit).join(', ')}`     : '',
      tasks.length     ? `Open tasks: ${tasks.map(formatTask).join('; ')}`   : '',
      metrics.length   ? `Recent metrics: ${metrics.map(formatMetric).join('; ')}` : '',
      sleep.length     ? `Sleep (last 7d): ${sleep.map(formatSleep).join('; ')}` : '',
      formatFin()      ? `Finance — ${formatFin()}`                          : '',
    ].filter(Boolean).join('\n');
  }, [state]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setShowPrompts(false);

    const userMsg = { role: 'user', content: msg, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build a single prompt from system context + conversation history + new message
      const historyText = messages.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');

      const fullPrompt = [
        'You are GrowthTrack AI — a personal growth assistant with access to the user\'s real data.',
        'Be concise, encouraging, and data-driven. Use Markdown for structure when helpful.',
        '',
        '=== User Context ===',
        userContext,
        '',
        historyText ? `=== Conversation so far ===\n${historyText}\n` : '',
        `User: ${msg}`,
        'Assistant:',
      ].filter(v => v !== undefined).join('\n');

      let response;
      try {
        response = await firebaseAskGemini(fullPrompt, model);
      } catch (fbErr) {
        // Firebase/Gemini not configured — show a helpful offline message
        console.warn('[AiDashboard] Gemini unavailable:', fbErr.message);
        response = null;
      }

      if (!response) {
        response = `⚠️ AI is unavailable — Firebase/Gemini credentials are not configured in this environment.\n\nTo enable AI features, add your Firebase project credentials as Replit Secrets:\n- \`VITE_FIREBASE_PROJECT_ID\`\n- \`VITE_FIREBASE_API_KEY\`\n- \`VITE_FIREBASE_APP_ID\``;
      }

      const aiMsg = { role: 'assistant', content: response, id: Date.now() + 1, typing: true };
      setMessages(prev => [...prev, aiMsg]);
      setTyping(true);
    } catch (err) {
      const errMsg = err?.message?.includes('API error')
        ? 'Could not reach AI backend. Please check your API key configuration.'
        : 'AI request failed. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, id: Date.now() + 1, error: true }]);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, userContext, model, state, toast]);

  const handleTypingDone = useCallback((msgId) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, typing: false } : m));
    setTyping(false);
  }, []);

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content).then(() => toast.success('Copied!')).catch(() => toast.error('Failed to copy'));
  };

  const clearChat = () => {
    setMessages([]);
    setShowPrompts(true);
    sessionStorage.removeItem(CACHE_KEY);
    toast.info('Chat cleared');
  };

  // Safe React-based markdown renderer — no dangerouslySetInnerHTML, no XSS risk.
  // Parses lines and inline tokens into React elements only.
  const SafeMarkdown = ({ text }) => {
    if (!text) return null;

    const parseInline = (str, key) => {
      // Split on **bold** and `code` tokens, return React nodes
      const parts = [];
      const re = /(\*\*(.*?)\*\*|`([^`]+)`)/g;
      let last = 0, m, i = 0;
      while ((m = re.exec(str)) !== null) {
        if (m.index > last) parts.push(<React.Fragment key={`t${key}-${i++}`}>{str.slice(last, m.index)}</React.Fragment>);
        if (m[0].startsWith('**')) {
          parts.push(<strong key={`b${key}-${i++}`} style={{ color: 'var(--text-1)' }}>{m[2]}</strong>);
        } else {
          parts.push(<code key={`c${key}-${i++}`} style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.88em' }}>{m[3]}</code>);
        }
        last = m.index + m[0].length;
      }
      if (last < str.length) parts.push(<React.Fragment key={`t${key}-${i}`}>{str.slice(last)}</React.Fragment>);
      return parts;
    };

    const lines = text.split('\n');
    const nodes = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      // Code block
      if (line.startsWith('```')) {
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
        nodes.push(
          <pre key={`pre${i}`} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem 1rem', overflowX: 'auto', fontSize: '0.82rem', fontFamily: 'monospace', margin: '0.5rem 0', whiteSpace: 'pre' }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
      } else if (/^#{1,3} /.test(line)) {
        const level = line.match(/^(#+)/)[1].length;
        const content = line.replace(/^#+\s/, '');
        const Tag = `h${Math.min(level + 2, 6)}`;
        nodes.push(<Tag key={`h${i}`} style={{ fontSize: level === 1 ? '1rem' : '0.9rem', fontWeight: 800, color: 'var(--text-1)', margin: '0.6rem 0 0.25rem' }}>{parseInline(content, `h${i}`)}</Tag>);
      } else if (/^[-*] /.test(line)) {
        nodes.push(<li key={`li${i}`} style={{ marginLeft: '1.25rem', listStyle: 'disc', marginBottom: '2px', fontSize: '0.85rem' }}>{parseInline(line.slice(2), `li${i}`)}</li>);
      } else if (line.trim() === '') {
        nodes.push(<br key={`br${i}`} />);
      } else {
        nodes.push(<p key={`p${i}`} style={{ margin: '0.15rem 0', fontSize: '0.85rem', lineHeight: 1.65 }}>{parseInline(line, `p${i}`)}</p>);
      }
      i++;
    }

    return <div style={{ wordBreak: 'break-word' }}>{nodes}</div>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: '500px', padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0, flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.2rem' }}>AI Assistant</p>
          <h2 className="text-display" style={{ fontSize: '1.6rem', marginBottom: 0 }}>
            <Bot size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: 'var(--accent)' }} />
            GrowthTrack AI
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={model} onChange={e => setModel(e.target.value)} className="form-input" style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          </select>
          <button onClick={clearChat} title="Clear chat" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Context chip */}
      <div style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '99px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', fontSize: '0.65rem', color: '#818cf8' }}>
          <Sparkles size={10} />
          AI has access to your goals, habits, tasks, metrics, sleep, and finance data
        </div>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '4px', marginBottom: '0.75rem' }}>
        {/* Quick prompts */}
        {showPrompts && (
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 700, marginBottom: '0.75rem' }}>
              <Zap size={13} style={{ display: 'inline', marginRight: '5px', color: '#f59e0b' }} />
              Quick prompts
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {QUICK_PROMPTS.map(p => (
                <button key={p.label} onClick={() => sendMessage(p.prompt)} disabled={loading} style={{
                  padding: '0.65rem 0.85rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'var(--text-2)',
                  fontSize: '0.78rem', fontWeight: 600, textAlign: 'left', transition: 'background 0.15s',
                }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length === 0 && !showPrompts && (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-3)' }}>
            <Bot size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.88rem' }}>Ask me anything about your health, goals, finances, or productivity.</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser   = msg.role === 'user';
          const isLast   = idx === messages.length - 1;
          const isTyping = msg.typing && isLast;

          return (
            <div key={msg.id} style={{
              display: 'flex', gap: '0.75rem', flexDirection: isUser ? 'row-reverse' : 'row',
              alignItems: 'flex-start', animation: 'fadeIn 0.3s ease',
            }}>
              {/* Avatar */}
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isUser ? 'var(--accent)' : 'rgba(99,102,241,0.2)', border: `1.5px solid ${isUser ? 'var(--accent)' : 'rgba(99,102,241,0.4)'}` }}>
                {isUser ? <User size={15} color="#000" /> : <Bot size={15} color="#818cf8" />}
              </div>

              {/* Bubble */}
              <div style={{ maxWidth: '78%', position: 'relative' }}>
                <div style={{
                  padding: '0.85rem 1rem', borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: isUser ? 'var(--accent)' : msg.error ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
                  border: isUser ? 'none' : `1px solid ${msg.error ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  color: isUser ? '#000' : 'var(--text-1)', fontSize: '0.85rem', lineHeight: 1.65,
                }}>
                  {isUser ? (
                    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>
                  ) : isTyping ? (
                    <TypedMessage text={msg.content} speed={10} onDone={() => handleTypingDone(msg.id)} />
                  ) : (
                    <SafeMarkdown text={msg.content} />
                  )}
                </div>
                {!isUser && !isTyping && !msg.error && (
                  <button onClick={() => copyMessage(msg.content)} title="Copy response"
                    style={{ position: 'absolute', bottom: '-20px', right: '0', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Copy size={10} /> copy
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading dots */}
        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.2)', border: '1.5px solid rgba(99,102,241,0.4)', flexShrink: 0 }}>
              <Bot size={15} color="#818cf8" />
            </div>
            <div style={{ padding: '0.85rem 1.2rem', borderRadius: '4px 16px 16px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '5px', alignItems: 'center' }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', animation: `bounce 1s ease ${delay}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ flexShrink: 0, display: 'flex', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask about your health, goals, habits, or finances… (Shift+Enter for newline)"
          rows={1}
          disabled={loading || typing}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)',
            fontSize: '0.85rem', resize: 'none', lineHeight: 1.5, fontFamily: 'inherit',
            maxHeight: '120px', overflowY: 'auto',
          }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
        />
        <button onClick={() => sendMessage()} disabled={loading || typing || !input.trim()} style={{
          width: '38px', height: '38px', borderRadius: '10px', border: 'none',
          background: loading || !input.trim() ? 'rgba(255,255,255,0.1)' : 'var(--accent)',
          color: loading || !input.trim() ? 'var(--text-3)' : '#000',
          cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transition: 'background 0.2s',
        }}>
          {loading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}
