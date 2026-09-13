import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import useStore from '../store/useStore';
import { Send, Bot, User, Trash2, Copy, Zap, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { askLocalGrowthcast } from '../lib/growthcast';
import { formatCurrency } from '../utils/userFormatters';
import Button from './ui/Button';
import Card from './ui/Card';

// ── Typing simulation component ────────────────────────────────────────────
function TypedMessage({ text, speed = 12, onDone }) {
  const [displayed, setDisplayed] = useState('');
  const onDoneRef = useRef(onDone);

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    let index = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      index += 1;
      if (index <= text.length) {
        setDisplayed(text.slice(0, index));
      } else {
        clearInterval(interval);
        onDoneRef.current?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{displayed}<span style={{ opacity: displayed.length < text.length ? 1 : 0, marginLeft: '1px', animation: 'blink 1s step-end infinite' }}>▌</span></span>;
}

const QUICK_PROMPTS = [
  { label: 'Today’s summary', prompt: 'Give me a quick summary of my progress today across health, habits, and tasks.' },
  { label: 'Workout advice', prompt: 'Based on my training history and PRs, what should I focus on in my next workout?' },
  { label: 'Goal check-in', prompt: 'How am I progressing toward my current goals? What should I prioritise?' },
  { label: 'Sleep analysis', prompt: 'Analyse my recent sleep patterns and give me actionable advice to improve sleep quality.' },
  { label: 'Finance tip', prompt: 'Give me a personalised finance tip based on my current income, expenses, and saving rate.' },
  { label: 'Habit coaching', prompt: 'Which of my habits has the lowest completion rate? How can I improve it?' },
  { label: 'Nutrition guide', prompt: 'Based on my nutrition goals, what macro adjustments would help me most right now?' },
  { label: 'Weekly plan', prompt: 'Create a prioritised weekly action plan for me based on all my current data.' },
];

const CACHE_KEY = 'gt_ai_cache_v2';
function getCache() { try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; } }
function setCache(msgs) { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* storage may be unavailable in private mode */ } }

export default function AiDashboard() {
  const toast = useToast();
  const state = useStore();
  const aiConfig = state.appConfig?.aiAgent || {};

  const [messages,    setMessages]    = useState(getCache);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [typing,      setTyping]      = useState(false);
  const [model,       setModel]       = useState(() => `ollama-${aiConfig.model || 'unconfigured'}`);
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
    const notes     = (state.notes       || []).slice(0, 5);
    const subs      = (state.subscriptions || []).slice(0, 5);
    const shopItems = (state.shopping?.items || []).slice(0, 5);
    const meds      = (state.medications || []).slice(0, 5);
    const timesheet = (state.timesheetEntries || []).slice(0, 5);

    const formatGoal = g => `${g.title} (${Math.min(100, Math.round((Number(g.current_value || 0) / Number(g.target_value || 1)) * 100))}% done, status: ${g.status})`;
    const formatHabit = h => `${h.name} (category: ${h.category})`;
    const formatTask  = t => `${t.title} (priority: ${t.priority || 'normal'}, due: ${t.due_date || 'no date'})`;
    const formatMetric = m => `${m.type}: ${m.value} ${m.unit || ''} on ${m.date}`;
    const formatSleep  = s => `${s.date}: ${s.duration}h, quality ${s.quality}/10`;
    const formatFin    = () => finance.accounts ? `balance: ${formatCurrency(Object.values(finance.accounts).reduce((s, a) => s + (a.balance || 0), 0), u)}` : '';
    const formatNote   = n => n.title || 'Untitled Note';
    const formatSub    = s => `${s.name} (${formatCurrency(s.cost, u)})`;
    const formatShop   = i => i.name;
    const formatMed    = m => `${m.name} (${m.dosage})`;
    const formatTime   = t => `${t.task} (${t.hours}h)`;

    return [
      `User: ${u.name || 'User'}, age ${u.age || '?'}, gender ${u.gender || '?'}`,
      goals.length     ? `Goals: ${goals.map(formatGoal).join('; ')}`        : '',
      habits.length    ? `Habits: ${habits.map(formatHabit).join(', ')}`     : '',
      tasks.length     ? `Open tasks: ${tasks.map(formatTask).join('; ')}`   : '',
      metrics.length   ? `Recent metrics: ${metrics.map(formatMetric).join('; ')}` : '',
      sleep.length     ? `Sleep (last 7d): ${sleep.map(formatSleep).join('; ')}` : '',
      formatFin()      ? `Finance — ${formatFin()}`                          : '',
      notes.length     ? `Notes: ${notes.map(formatNote).join(', ')}`         : '',
      subs.length      ? `Subscriptions: ${subs.map(formatSub).join(', ')}`  : '',
      shopItems.length ? `Shopping: ${shopItems.map(formatShop).join(', ')}` : '',
      meds.length      ? `Medications: ${meds.map(formatMed).join(', ')}`    : '',
      timesheet.length ? `Timesheet: ${timesheet.map(formatTime).join(', ')}` : '',
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
        const ollamaModel = model.replace(/^ollama-/, '');
        response = await askLocalGrowthcast(fullPrompt, { ...aiConfig, model: ollamaModel });
      } catch (fbErr) {
        // Fallback or error handling
        console.warn('[AiDashboard] AI Model unavailable:', fbErr.message);
        response = null;
      }

      if (!response) {
        response = 'Your assistant is taking a moment to reconnect. Please try again shortly.';
      }

      const aiMsg = { role: 'assistant', content: response, id: Date.now() + 1, typing: true };
      setMessages(prev => [...prev, aiMsg]);
      setTyping(true);
    } catch (err) {
      const errMsg = 'We couldn’t finish that response. Your conversation is still here—please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, id: Date.now() + 1, error: true }]);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, userContext, model, state, toast, aiConfig]);

  const handleTypingDone = useCallback((msgId) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, typing: false } : m));
    setTyping(false);
  }, []);

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content).then(() => toast.success('Copied to your clipboard.')).catch(() => toast.error('We couldn’t copy that. Please try again.'));
  };

  const clearChat = () => {
    setMessages([]);
    setShowPrompts(true);
    sessionStorage.removeItem(CACHE_KEY);
    toast.info('This conversation has been cleared.');
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
    <div className="agent-workspace">
      {/* Header */}
      <Card className="agent-workspace__header">
        <div>
          <p className="eyebrow">Your assistant</p>
          <h2><Bot size={22} aria-hidden="true" /> GrowthTrack AI</h2>
          <p>Ask for a clear next step, a thoughtful review, or a plan for the week.</p>
        </div>
        <div className="agent-workspace__actions">
          <label className="agent-workspace__model"><span>Model</span><select value={model} onChange={e => setModel(e.target.value)}>
            <optgroup label="Local (Ollama)">
              <option value={`ollama-${aiConfig.model || 'unconfigured'}`}>{aiConfig.model || 'Not configured'}</option>
            </optgroup>
          </select></label>
          <Button variant="secondary" onClick={clearChat} title="Clear conversation"><Trash2 size={15} /> Clear</Button>
        </div>
      </Card>

      {/* Context chip */}
      <div className="agent-workspace__privacy">
        <div>
          <Sparkles size={10} />
          Uses the relevant workspace context to make answers more useful. Your message stays in this private workspace.
        </div>
      </div>

      {/* Chat messages */}
      <div className="agent-workspace__messages" aria-live="polite">
        {/* Quick prompts */}
        {showPrompts && (
          <div className="agent-workspace__prompts">
            <p><Zap size={14} aria-hidden="true" /> A good place to start</p>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {QUICK_PROMPTS.map(p => (
                <Card as="button" interactive type="button" key={p.label} onClick={() => sendMessage(p.prompt)} disabled={loading} className="agent-workspace__prompt">{p.label}</Card>
              ))}
            </div>
          </div>
        )}

        {messages.length === 0 && !showPrompts && (
          <div className="agent-workspace__empty">
            <Bot size={40} aria-hidden="true" />
            <p>Ask about your health, goals, finances, or focus—and we’ll work through it together.</p>
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
