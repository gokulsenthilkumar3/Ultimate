import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, Sparkles, BrainCircuit, Loader2, Copy, Check, Trash2, Zap, User } from 'lucide-react';
import { askGemini, trackEvent, getConfig, initRemoteConfig } from '../lib/firebase';
import useStore from '../store/useStore';

const QUICK_PROMPTS = [
  { label: 'Workout Plan', prompt: 'Create a 7-day workout split for muscle gain based on progressive overload.' },
  { label: 'Meal Ideas', prompt: 'Give me 5 high-protein meal ideas under 600 calories each with macros.' },
  { label: 'Sleep Tips', prompt: 'What are science-backed strategies to improve deep sleep quality?' },
  { label: 'Habit Science', prompt: 'Explain the habit loop and how to build a consistent morning routine.' },
  { label: 'Recovery', prompt: 'How do I optimise muscle recovery between training sessions?' },
  { label: 'Finance Tips', prompt: 'Give me 5 practical money-saving habits I can start today.' },
];

// Build a rich user context string for injecting into the AI system prompt
function buildUserContext(user, goals, habits, tasks, metricLogs) {
  if (!user) return '';
  const lines = [];
  if (user.name) lines.push(`Name: ${user.name}`);
  if (user.age)  lines.push(`Age: ${user.age}`);
  const weight = metricLogs?.slice(-1)[0]?.weight || user.weight;
  const height = user.height;
  if (weight) lines.push(`Weight: ${weight} kg`);
  if (height) lines.push(`Height: ${height} cm`);
  if (weight && height) {
    const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
    lines.push(`BMI: ${bmi}`);
  }
  if (user.bodyFat) lines.push(`Body Fat: ${user.bodyFat}%`);
  // Active goals
  const activeGoals = (goals || []).filter(g => g.status === 'active').slice(0, 4);
  if (activeGoals.length) {
    lines.push(`Active goals: ${activeGoals.map(g => `${g.title} (${g.current_value || 0}/${g.target_value || '?'} ${g.unit || ''})`).join(', ')}`);
  }
  // Today's habits
  const today = new Date().toISOString().slice(0, 10);
  const pendingHabits = (habits || []).filter(h => !h.last_log || h.last_log < today).slice(0, 5);
  if (pendingHabits.length) {
    lines.push(`Pending habits today: ${pendingHabits.map(h => h.name || h.title).join(', ')}`);
  }
  // Overdue/urgent tasks
  const overdueTasks = (tasks || []).filter(t => !t.done && t.due_date && t.due_date < today).slice(0, 3);
  if (overdueTasks.length) {
    lines.push(`Overdue tasks: ${overdueTasks.map(t => t.title).join(', ')}`);
  }
  return lines.length ? `\n\nUser profile:\n${lines.join('\n')}` : '';
}

export default function AiDashboard() {
  const user      = useStore(s => s.user);
  const goals     = useStore(s => s.goals);
  const habits    = useStore(s => s.habits);
  const tasks     = useStore(s => s.tasks);
  const metricLogs = useStore(s => s.metric_logs);

  const firstName = user?.name?.split(' ')[0] || user?.username?.split(' ')[0] || '';

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hey${firstName ? ' ' + firstName : ''}! I'm your GrowthTrack AI powered by Gemini. Ask me anything about fitness, nutrition, habits, finance, or your goals — I have access to your profile data to give personalised advice.`,
      ts: Date.now(),
    }
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [model, setModel]       = useState('gemini-2.0-flash');
  const bottomRef               = useRef(null);

  // Build context string once per render (memoised)
  const userContext = useMemo(
    () => buildUserContext(user, goals, habits, tasks, metricLogs),
    [user, goals, habits, tasks, metricLogs]
  );

  useEffect(() => {
    initRemoteConfig().then(() => {
      const enabled = getConfig('ai_enabled').asBoolean();
      const m       = getConfig('gemini_model').asString();
      setAiEnabled(enabled);
      if (m) setModel(m);
    });
    trackEvent('ai_dashboard_opened');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (promptText) => {
    const text = (promptText || input).trim();
    if (!text || loading || !aiEnabled) return;
    setInput('');
    const userMsg = { role: 'user', text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      // Build context-aware system prompt with full user data
      const baseContext = `You are GrowthTrack AI, a personal coach embedded in GrowthTrack Ultimate — a health, fitness, and productivity tracking app. Be concise (max 250 words), actionable, encouraging, and specific to the user's data. Never mention you are an AI model by Google; just be GrowthTrack AI.${userContext}`;
      const systemContext = `${baseContext}\n\nUser question: `;
      const response = await askGemini(systemContext + text, model);
      setMessages(prev => [...prev, { role: 'assistant', text: response, ts: Date.now() }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, I ran into an error. Please try again in a moment.',
        ts: Date.now(),
        error: true,
      }]);
      trackEvent('ai_error', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', text: 'Chat cleared. What can I help you with?', ts: Date.now() }]);
    trackEvent('ai_chat_cleared');
  };

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Cognitive Expansion</p>
          <h2 className="text-display" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BrainCircuit size={32} color="var(--accent)" style={{ filter: 'drop-shadow(0 0 10px var(--accent-glow))' }} />
            GrowthTrack AI
          </h2>
          <p className="text-secondary">Powered by <strong style={{ color: 'var(--accent)' }}>Gemini {model}</strong> via Firebase AI Logic</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="glass-card" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: aiEnabled ? 'var(--success)' : 'var(--danger)' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{aiEnabled ? 'AI ONLINE' : 'AI OFFLINE'}</span>
          </div>
          <button onClick={clearChat} className="btn-ghost" style={{ padding: '6px 10px' }} title="Clear chat">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Quick prompts */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {QUICK_PROMPTS.map(qp => (
          <button key={qp.label} onClick={() => sendMessage(qp.prompt)} className="btn-ghost"
            style={{ fontSize: '0.72rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            disabled={loading}>
            <Zap size={11} />{qp.label}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="glass-card" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', marginBottom: '1rem', minHeight: '300px', maxHeight: '55vh' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '1rem',
          }}>
            <div style={{
              maxWidth: '82%',
              padding: '0.85rem 1.1rem',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, var(--accent), var(--accent-glow))'
                : msg.error ? 'rgba(239,68,68,0.15)' : 'var(--bg-elevated)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              color: 'var(--text-1)',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              position: 'relative',
            }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Sparkles size={13} color="var(--accent)" />
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700 }}>GEMINI</span>
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
              {msg.role === 'assistant' && !msg.error && (
                <button onClick={() => copyMessage(msg.text, idx)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px' }}>
                  {copied === idx ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '3px' }}>
              {new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-3)', fontSize: '0.85rem' }}>
            <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            Gemini is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={aiEnabled ? 'Ask Gemini anything…' : 'AI is currently disabled via Remote Config'}
          disabled={loading || !aiEnabled}
          style={{
            flex: 1, padding: '0.9rem 1.2rem', fontSize: '1rem',
            borderRadius: '14px', border: '1px solid var(--border-strong)',
            background: 'var(--bg-elevated)', color: 'var(--text-1)', outline: 'none',
          }}
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim() || !aiEnabled}
          className="btn-primary" style={{ padding: '0.9rem 1.4rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          {loading ? 'Sending' : 'Send'}
        </button>
      </div>

    </div>
  );
}
