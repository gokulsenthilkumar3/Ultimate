import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { Send, Bot, User, Trash2, Copy, RefreshCw, Square, Database, Settings2, History, X, ArrowUpRight } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { selectPreferredChatModel } from '../lib/aiProviders';
import { EMPTY_AI_CONSENT, getAiContextCandidates, buildSelectedAiContext } from '../lib/aiContext';
import { getAgentsReadiness, streamAgentsChat } from '../services/aiClient';
import Button from './ui/Button';
import './AiDashboard.css';

const PROMPTS = [
  { label: 'Plan my day', prompt: 'Help me prioritise my day using only the records I selected.' },
  { label: 'Goal check-in', prompt: 'Review my selected goals and suggest one practical next step.' },
  { label: 'Weekly plan', prompt: 'Draft a weekly plan. Ask about any information missing from the selected records.' },
];
const SENSITIVE_DOMAINS = [
  ['wellness', 'Allow wellness records'],
  ['finance', 'Allow financial records'],
  ['journal', 'Allow journal entries'],
];

export default function AiDashboard() {
  const state = useStore();
  // New account/session means fresh memory and cancellation of the old request.
  return <AiDashboardChat key={String(state.user?.id || 'signed-out') + ':' + state._sessionVersion} state={state} />;
}

function AiDashboardChat({ state }) {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('');
  const [models, setModels] = useState([]);
  const [readiness, setReadiness] = useState({ ready: false, reason: 'Checking model readiness…' });
  const [refresh, setRefresh] = useState(0);
  const [responseStyle, setResponseStyle] = useState('standard');
  const [consent, setConsent] = useState({ ...EMPTY_AI_CONSENT });
  const [selected, setSelected] = useState([]);
  const [openPanel, setOpenPanel] = useState(null);
  const activeRequest = useRef(null);
  const bottom = useRef(null);
  const panelRef = useRef(null);
  const triggerRefs = useRef({});
  const panelIds = useId();
  const preferredModel = state.appConfig?.aiAgent?.model;
  const candidates = useMemo(() => getAiContextCandidates(state, consent), [state, consent]);
  const context = useMemo(() => buildSelectedAiContext(state, selected, consent), [state, selected, consent]);

  useEffect(() => {
    try { sessionStorage.removeItem('gt_ai_cache_v2'); } catch { /* storage may be unavailable */ }
    return () => { activeRequest.current?.abort(); };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    setReadiness({ ready: false, reason: 'Checking model readiness…' });
    getAgentsReadiness({ signal: controller.signal }).then(status => {
      if (!active) return;
      setModels(status.models);
      setReadiness(status);
      setModel(current => status.models.some(item => item.id === current) ? current : selectPreferredChatModel(status.models, preferredModel)?.id || '');
    }).catch(error => {
      if (!active) return;
      setModels([]);
      setModel('');
      setReadiness({ ready: false, reason: controller.signal.aborted ? 'Checking model readiness timed out. Try refreshing models.' : error.message || 'Agents is unavailable.' });
    }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [preferredModel, refresh]);

  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'nearest' }); }, [messages]);

  useEffect(() => {
    if (!openPanel) return undefined;
    panelRef.current?.querySelector('button')?.focus();
    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpenPanel(null);
      triggerRefs.current[openPanel]?.focus();
    }
    function onPointerDown(event) {
      if (!panelRef.current?.contains(event.target) && !triggerRefs.current[openPanel]?.contains(event.target)) setOpenPanel(null);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [openPanel]);

  function closePanel() {
    triggerRefs.current[openPanel]?.focus();
    setOpenPanel(null);
  }

  function changeConsent(domain, checked) {
    if (!checked) setSelected(keys => keys.filter(key => !candidates.some(record => record.key === key && record.domain === domain)));
    setConsent(current => ({ ...current, [domain]: checked }));
  }

  function clearChat() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setLoading(false);
    setMessages([]);
    setInput('');
    setSelected([]);
    setConsent({ ...EMPTY_AI_CONSENT });
  }

  async function sendMessage(value = input) {
    const prompt = value.trim();
    if (!prompt || prompt.length > 8000 || activeRequest.current || !readiness.ready || !state.user?.id || !model) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const requestId = crypto.randomUUID();
    const scopeKey = JSON.stringify({ context, consent });
    // Changed or revoked context must not leak back through conversation history.
    const completedTurns = new Set(messages.filter(message => message.role === 'assistant' && message.status === 'complete').map(message => message.turnId));
    const history = messages.filter(message => completedTurns.has(message.turnId) && message.scopeKey === scopeKey && message.content)
      .slice(-15).map(({ role, content }) => ({ role, content: content.slice(0, 8000) }));
    const sources = context.map(({ id, type, label }) => ({ id, type, label }));
    setMessages(current => [...current,
      { id: requestId + '-user', turnId: requestId, role: 'user', content: prompt, scopeKey, sources, status: 'complete' },
      { id: requestId, turnId: requestId, role: 'assistant', content: '', scopeKey, status: 'streaming' },
    ]);
    setInput('');
    setLoading(true);
    const update = patch => {
      if (activeRequest.current === controller) setMessages(current => current.map(message => message.id === requestId ? { ...message, ...patch } : message));
    };
    try {
      await streamAgentsChat({
        model, messages: [...history, { role: 'user', content: prompt }],
        context, consent, responseStyle, signal: controller.signal,
        onDelta: delta => {
          if (activeRequest.current !== controller || controller.signal.aborted) return;
          setMessages(current => current.map(message => message.id === requestId ? { ...message, content: message.content + delta } : message));
        },
      });
      update({ status: controller.signal.aborted ? 'stopped' : 'complete' });
    } catch (error) {
      if (controller.signal.aborted) update({ status: 'stopped' });
      else {
        update({ status: 'error', error: error.message || 'The response could not be completed.' });
        if (activeRequest.current === controller) setInput(prompt);
      }
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }

  const canSend = readiness.ready && Boolean(model && state.user?.id) && !loading;
  const turnCount = messages.filter(message => message.role === 'user').length;
  const selectedModel = models.find(item => item.id === model);
  const readinessText = !state.user?.id ? 'Sign in to use GrowthTrack AI.'
    : readiness.ready ? models.length + ' installed chat model' + (models.length === 1 ? '' : 's') : readiness.reason;
  const panels = [
    { id: 'context', label: 'Context', detail: `${context.length} selected`, icon: <Database size={16} aria-hidden="true" /> },
    { id: 'settings', label: 'Model', detail: selectedModel?.label || selectedModel?.id || 'Unavailable', icon: <Settings2 size={16} aria-hidden="true" /> },
    { id: 'history', label: 'Session', detail: `${turnCount} ${turnCount === 1 ? 'question' : 'questions'}`, icon: <History size={16} aria-hidden="true" /> },
  ];

  return <section className="gt-ai" aria-label="GrowthTrack AI chat">
    <header className="gt-ai__masthead">
      <div className="gt-ai__heading">
        <p className="gt-ai__eyebrow"><span>01</span> / THE INTELLIGENCE DESK</p>
        <h2>GrowthTrack <em>AI</em></h2>
        <p>Make sense of what matters, one question at a time.</p>
      </div>
      <div className="gt-ai__readiness" role="status">
        <span className={`gt-ai__signal${readiness.ready && state.user?.id ? ' gt-ai__signal--ready' : ''}`} aria-hidden="true" />
        <span>{readinessText}</span>
      </div>
    </header>

    <div className="gt-ai__toolbar">
      <div className="gt-ai__controls" role="group" aria-label="Chat controls">
        {panels.map(({ id, label, detail, icon }) => <button key={id} ref={node => { triggerRefs.current[id] = node; }} type="button"
          className={`gt-ai__control${openPanel === id ? ' gt-ai__control--active' : ''}`}
          aria-label={`${label}, ${detail}`}
          aria-expanded={openPanel === id} aria-controls={openPanel === id ? `${panelIds}-${id}` : undefined}
          onClick={() => setOpenPanel(current => current === id ? null : id)}>
          {icon}<span className="gt-ai__control-label">{label}<small>{detail}</small></span>
        </button>)}
      </div>
      <p className="gt-ai__scope">{context.length ? `${context.length} records selected` : 'No records attached'} <span aria-hidden="true">·</span> Messages go to the model server</p>

      {openPanel && <section id={`${panelIds}-${openPanel}`} ref={panelRef} className={`gt-ai__panel gt-ai__panel--${openPanel}`} aria-label={`${openPanel === 'history' ? 'Session history' : openPanel === 'settings' ? 'Model settings' : 'Context selection'}`}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !triggerRefs.current[openPanel]?.contains(event.relatedTarget)) setOpenPanel(null); }}>
        <div className="gt-ai__panel-head">
          <div><p className="gt-ai__eyebrow">CHAT CONTROL / {openPanel === 'context' ? '01' : openPanel === 'settings' ? '02' : '03'}</p>
            <h3>{openPanel === 'context' ? 'Choose your sources' : openPanel === 'settings' ? 'Model & response' : 'This session'}</h3></div>
          <button type="button" className="gt-ai__close" aria-label={`Close ${openPanel} panel`} onClick={closePanel}><X size={18} aria-hidden="true" /></button>
        </div>

        {openPanel === 'context' && <div className="gt-ai__panel-body">
          <p className="gt-ai__panel-intro">Only checked records are sent to the deployment’s model server. Your typed messages are also sent. Chat stays in memory and clears when you leave this page or change accounts.</p>
          <fieldset className="gt-ai__consent" disabled={loading}>
            <legend>Optional sensitive context</legend>
            {SENSITIVE_DOMAINS.map(([domain, label]) => <label key={domain}>
              <input type="checkbox" checked={consent[domain]} onChange={event => changeConsent(domain, event.target.checked)} /><span>{label}</span>
            </label>)}
          </fieldset>
          <div className="gt-ai__record-head"><h4>Select records ({context.length}/20 selected)</h4><span>EXPLICIT SELECTION</span></div>
          {!candidates.length && <p className="gt-ai__empty-records">No records available. Load your workspace or enable a sensitive category to review it.</p>}
          <div className="gt-ai__records">
            {candidates.map(record => <label key={record.key}>
              <input type="checkbox" checked={selected.includes(record.key)} disabled={loading || (context.length >= 20 && !selected.includes(record.key))}
                onChange={event => setSelected(keys => event.target.checked ? [...keys, record.key] : keys.filter(key => key !== record.key))} />
              <span><strong>{record.group}: {record.label}</strong><small>{record.text}</small></span>
            </label>)}
          </div>
          {context.length > 0 && <div className="gt-ai__selected"><h4>Attached to the next question</h4><ul aria-label="Selected source records">{context.map(record => <li key={record.type + record.id}>{record.label} <small>({record.type} · {record.id})</small></li>)}</ul></div>}
        </div>}

        {openPanel === 'settings' && <div className="gt-ai__panel-body gt-ai__settings">
          <p className="gt-ai__panel-intro">Use an installed chat-capable model. Changing settings affects your next message.</p>
          <label>Model
            <select value={model} disabled={loading || !readiness.ready} onChange={event => setModel(event.target.value)}>
              {!models.length && <option value="">No chat model available</option>}
              {models.map(item => <option key={item.id} value={item.id}>{item.label || item.id}</option>)}
            </select>
          </label>
          <label>Answer style
            <select value={responseStyle} disabled={loading} onChange={event => setResponseStyle(event.target.value)}>
              <option value="standard">Standard</option><option value="multiple-choice">Multiple-choice coaching</option>
            </select>
          </label>
          <Button variant="secondary" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={15} aria-hidden="true" /> Refresh models</Button>
        </div>}

        {openPanel === 'history' && <div className="gt-ai__panel-body">
          <p className="gt-ai__panel-intro">This conversation stays in memory for this page and account session. It is cleared when you leave the page or change accounts.</p>
          <div className="gt-ai__history-count"><strong>{String(turnCount).padStart(2, '0')}</strong><span>{turnCount === 1 ? 'question in this session' : 'questions in this session'}</span></div>
          {turnCount > 0 && <ol className="gt-ai__history-list" aria-label="Questions in this session">
            {messages.filter(message => message.role === 'user').map((message, index) => <li key={message.id}><button type="button" onClick={() => {
              setOpenPanel(null);
              document.getElementById(`gt-ai-message-${message.id}`)?.focus();
            }}><span>{String(index + 1).padStart(2, '0')}</span>{message.content}<ArrowUpRight size={15} aria-hidden="true" /></button></li>)}
          </ol>}
          <Button variant="secondary" onClick={() => { clearChat(); closePanel(); }}><Trash2 size={15} aria-hidden="true" /> Clear conversation</Button>
          <div className="gt-ai__draft-note"><strong>Drafts only</strong><p>Suggestions are drafts. Review and save changes manually in the relevant page.</p>
            <Button disabled title="Agents action execution is not supported">Confirm proposed actions</Button></div>
        </div>}
      </section>}
    </div>

    <div className="gt-ai__thread" role="log" aria-label="Conversation" aria-live="polite" aria-busy={loading}>
      {!messages.length && <div className="gt-ai__welcome">
        <p className="gt-ai__eyebrow">A SPACE TO THINK CLEARLY</p>
        <h3>Start with a question.<br /><em>Find your next move.</em></h3>
        <p>{!state.user?.id ? 'Sign in to ask a question. You can still draft a message below.' : readiness.ready ? 'Choose records in Context for a personal answer, or ask without attaching any data.' : 'The assistant is unavailable until a chat model is ready. You can still draft a message below.'}</p>
        <div className="gt-ai__prompts" aria-label="Suggested questions">{PROMPTS.map(prompt => <Button key={prompt.label} variant="secondary" disabled={!canSend} onClick={() => sendMessage(prompt.prompt)}>{prompt.label}<ArrowUpRight size={14} aria-hidden="true" /></Button>)}</div>
      </div>}
      {messages.map((message, index) => <article id={`gt-ai-message-${message.id}`} tabIndex={-1} className={`gt-ai__message gt-ai__message--${message.role}`} key={message.id} aria-label={message.role === 'user' ? 'Your message' : 'Assistant response'}>
        <div className="gt-ai__message-meta"><span>{message.role === 'user' ? <User size={15} aria-hidden="true" /> : <Bot size={15} aria-hidden="true" />}{message.role === 'user' ? 'YOU' : 'GROWTHTRACK AI'}</span><span>{String(Math.floor(index / 2) + 1).padStart(2, '0')}{message.role === 'assistant' && ` · ${message.status === 'streaming' ? 'WRITING' : message.status === 'stopped' ? 'STOPPED' : message.status === 'error' ? 'UNAVAILABLE' : 'DRAFT'}`}</span></div>
        <div className="gt-ai__message-content">
          <p>{message.content || (message.status === 'streaming' ? 'Waiting for the model…' : '')}</p>
          {message.sources?.length > 0 && <small>Shared records: {message.sources.map(source => source.label).join(', ')}</small>}
          {message.status === 'stopped' && <small>Response stopped. This answer is incomplete.</small>}
          {message.error && <p className="gt-ai__message-error" role="alert">{message.error}</p>}
          {message.role === 'assistant' && message.content && <Button size="sm" variant="ghost" aria-label="Copy response" onClick={() => navigator.clipboard.writeText(message.content).then(() => toast.success('Copied.')).catch(() => toast.error('Could not copy the response.'))}><Copy size={13} aria-hidden="true" /> Copy</Button>}
        </div>
      </article>)}
      <div ref={bottom} />
    </div>

    <div className="gt-ai__composer-area">
      <form className="gt-ai__composer" onSubmit={event => { event.preventDefault(); sendMessage(); }}>
        <textarea aria-label="Message" value={input} maxLength={8000} rows={2} disabled={loading}
          placeholder="Ask what you want to understand…"
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); } }} />
        {loading ? <Button variant="secondary" onClick={() => activeRequest.current?.abort()}><Square size={15} aria-hidden="true" /> Stop response</Button>
          : <Button type="submit" disabled={!canSend || !input.trim()}><Send size={15} aria-hidden="true" /> Send message</Button>}
      </form>
      <div className="gt-ai__composer-foot"><span>Enter to send · Shift + Enter for a new line</span><span>AI suggestions are drafts; review before saving.</span></div>
    </div>
  </section>;
}
