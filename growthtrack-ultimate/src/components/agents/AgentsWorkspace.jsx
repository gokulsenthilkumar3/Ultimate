import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Bot, User, Trash2, Copy, RefreshCw, Square, ArrowUpRight, MessageSquare, ListChecks, ChartNoAxesCombined, CheckCircle2, Circle, Search } from 'lucide-react';
import useStore from '../../store/useStore';
import { useToast } from '../../hooks/useToast';
import { selectPreferredChatModel } from '../../lib/aiProviders';
import { EMPTY_AI_CONSENT, getAiContextCandidates, buildSelectedAiContext, selectAiContextRecords } from '../../lib/aiContext';
import { AGENT_PRESETS, agentContextScope } from '../../lib/agentActions';
import { AGENT_LIMITS } from '../../lib/agentPolicy';
import { createAgentTextBatcher } from '../../lib/agentTextBatcher';
import { localDateKey } from '../../lib/metricSeries';
import { getAgentsReadiness, requestAgentsPlan, streamAgentsChat } from '../../services/aiClient';
import { createAgentActionRunner } from '../../services/agentActions';
import PageHeader from '../ui/PageHeader';
import Tabs from '../ui/Tabs';
import Button from '../ui/Button';
import AgentPlanCard from './AgentPlanCard';
import GroqSetup from './GroqSetup';
import AgentAnswer from './AgentAnswer';

const VIEWS = [{ value: 'chat', label: 'Chat' }, { value: 'history', label: 'Activity' }, { value: 'context', label: 'Context' }, { value: 'settings', label: 'Settings' }];
const SENSITIVE = [['wellness', 'Allow wellness records'], ['finance', 'Allow financial records'], ['journal', 'Allow journal entries']];
const PROMPT_LABELS = ['Plan my day', 'Goal check-in', 'Build a routine', 'Draft a note'];
const CHAT_STARTERS = [
  { label: 'Ask a question', description: 'Learn, reason, write, or solve a problem.', mode: 'chat', prompt: 'Help me understand a topic. Ask what I want to learn, then explain it with a practical example.' },
  { label: 'Explore the app', description: 'Find the right page and learn how it works.', mode: 'chat', prompt: 'Explain what GrowthTrack can help me with and link to the main areas of the app.' },
  { label: 'Get app insights', description: 'Find patterns in the records you share.', mode: 'insights', prompt: 'Analyze the records or overview summaries I have shared. Explain the data coverage, useful findings, practical next steps, and any gaps. If no data is attached, help me choose sources in Context.' },
  { label: 'Review priorities', description: 'Turn your tasks and goals into next steps.', mode: 'insights', prompt: 'Review my shared tasks and goals. Identify what needs attention, explain why, and suggest a short list of priorities. Do not claim anything has been changed.' },
];

function ConnectionGuide({ readiness, checking, refresh, openSettings }) {
  const missing = readiness.code === 'not_configured' || readiness.configured === false;
  const noModels = readiness.code === 'no_chat_models';
  const groq = readiness.provider === 'groq';
  return <section className="gt-agents__connection" aria-label="Model connection">
    <span className="gt-agents__connection-icon"><Bot size={23} aria-hidden="true" /></span>
    <div><h2>{checking ? 'Checking your model connection' : missing ? groq ? 'Connect Groq' : 'Connect your local AI' : noModels ? groq ? 'Enable a Groq chat model' : 'Add a chat model' : 'Your model connection needs attention'}</h2>
      <p>{checking ? 'Looking for an available chat model. You can draft a message while we check.' : groq ? readiness.reason || 'Check your server API key and Groq model permissions, then refresh models.' : missing ? 'Connect GrowthTrack to Ollama to ask questions and prepare app actions.' : noModels ? 'Ollama is connected, but no permitted chat model is available yet.' : 'Start Ollama on the API computer, then check the connection again.'}</p>
      {!checking && <div className="gt-agents__inline-actions"><Button disabled={checking} variant="secondary" onClick={refresh}><RefreshCw size={15} aria-hidden="true" /> Check connection</Button><Button variant="ghost" onClick={openSettings}>Setup instructions<ArrowUpRight size={14} aria-hidden="true" /></Button></div>}
    </div>
  </section>;
}

export default function AgentsWorkspace({ state }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const rawView = params.get('view');
  const view = VIEWS.some(item => item.value === rawView) ? rawView : 'chat';
  const id = useId();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [mode, setMode] = useState('chat');
  const [agent, setAgent] = useState('custom');
  const [model, setModel] = useState('');
  const [models, setModels] = useState([]);
  const [readiness, setReadiness] = useState({ ready: false, reason: 'Checking model readiness…' });
  const [checking, setChecking] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [responseStyle, setResponseStyle] = useState('standard');
  const [consent, setConsent] = useState({ ...EMPTY_AI_CONSENT });
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const activeRequest = useRef(null), batch = useRef(null), bottom = useRef(null), thread = useRef(null), composer = useRef(null), follow = useRef(true), jump = useRef(null);
  const selectionRef = useRef({ selected, consent });
  selectionRef.current = { selected, consent };
  const runner = useMemo(() => createAgentActionRunner({ getState: () => useStore.getState() }), []);
  const preferredModel = state.appConfig?.aiAgent?.model;
  const busy = loading || applying;
  const needsCandidates = view === 'context' || selected.length > 0;
  const candidates = useMemo(() => needsCandidates ? getAiContextCandidates(state, consent, { includeOverviews: true }) : [], [state, consent, needsCandidates]);
  const context = useMemo(() => selectAiContextRecords(candidates, selected), [candidates, selected]);
  const scope = useMemo(() => agentContextScope(context, consent), [context, consent]);
  const matching = useMemo(() => {
    const query = search.toLowerCase();
    return candidates.filter(record => `${record.group} ${record.label} ${record.text}`.toLowerCase().includes(query));
  }, [candidates, search]);
  const filtered = matching.slice(0, 100);
  const planReady = Boolean(readiness.capabilities?.reviewedActions?.length);
  const canSend = readiness.ready && Boolean(model && state.user?.id) && !checking && !busy && (mode !== 'plan' || planReady);
  const inputBytes = useMemo(() => new TextEncoder().encode(JSON.stringify({ context, messages: [{ role: 'user', content: input }] })).length, [context, input]);
  const tooLarge = inputBytes > 60 * 1024;
  const questions = messages.filter(message => message.role === 'user');
  const starters = mode === 'plan' ? AGENT_PRESETS.map((preset, index) => ({ ...preset, label: PROMPT_LABELS[index], mode: 'plan' })) : CHAT_STARTERS;
  const appliedCount = messages.reduce((count, message) => count + (message.plan?.actions.filter(entry => entry.status === 'applied').length || 0), 0);
  const statusText = !state.user?.id ? 'Sign in to use GrowthTrack AI.' : checking ? 'Checking model readiness…' : readiness.ready ? `${models.length} ${readiness.provider === 'groq' ? 'available' : 'installed'} chat model${models.length === 1 ? '' : 's'}${readiness.provider === 'groq' ? ' · Groq' : ''}` : readiness.code === 'not_configured' ? readiness.provider === 'groq' ? 'Groq setup needed' : 'Local AI setup needed' : readiness.reason || 'No chat model available.';

  function changeView(next) {
    const query = new URLSearchParams(params);
    if (next === 'chat') query.delete('view'); else query.set('view', next);
    setParams(query);
  }

  useEffect(() => {
    try { sessionStorage.removeItem('gt_ai_cache_v2'); } catch { /* storage may be unavailable */ }
    return () => { activeRequest.current?.abort(); runner.clear(); if (batch.current) batch.current.cancelled = true; };
  }, [runner]);

  useEffect(() => {
    if (!state.user?.id) { setChecking(false); setReadiness({ ready: false, code: 'unauthorized' }); return undefined; }
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    setChecking(true);
    getAgentsReadiness({ signal: controller.signal }).then(status => {
      if (!active) return;
      setModels(status.models); setReadiness(status);
      setModel(current => status.models.some(item => item.id === current) ? current : selectPreferredChatModel(status.models, preferredModel || status.defaultModel)?.id || '');
    }).catch(error => {
      if (!active) return;
      setModels([]); setModel(''); setReadiness({ ready: false, code: error.code, configured: error.configured, provider: error.provider,
        reason: controller.signal.aborted ? 'The connection check timed out. Try again.' : error.message || 'Agents is unavailable.' });
    }).finally(() => { clearTimeout(timer); if (active) setChecking(false); });
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [preferredModel, refresh, state.user?.id]);

  useEffect(() => {
    if (view !== 'chat') return;
    if (jump.current) { document.getElementById(`gt-ai-message-${jump.current}`)?.focus(); jump.current = null; }
    else if (!messages.length) { if (thread.current) thread.current.scrollTop = 0; }
    else if (follow.current) bottom.current?.scrollIntoView?.({ block: 'nearest' });
  }, [messages, view]);

  useEffect(() => {
    if (view === 'chat') return undefined;
    const escape = event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      const query = new URLSearchParams(params); query.delete('view'); setParams(query);
      document.getElementById(`${id}-chat`)?.focus();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [view, params, setParams, id]);

  function changeConsent(domain, checked) {
    if (!checked) setSelected(keys => keys.filter(key => !candidates.some(record => record.key === key && record.domain === domain)));
    setConsent(current => ({ ...current, [domain]: checked }));
  }
  function clearChat() {
    activeRequest.current?.abort(); activeRequest.current = null;
    runner.clear();
    setLoading(false); setMessages([]); setInput(''); setSelected([]); setConsent({ ...EMPTY_AI_CONSENT });
  }
  function updateAction(messageId, entryId, patch) {
    setMessages(current => current.map(message => message.id !== messageId ? message : { ...message, plan: { ...message.plan, actions: message.plan.actions.map(entry => entry.id === entryId ? { ...entry, ...patch } : entry) } }));
  }
  async function applyActions(messageId, plan, entries) {
    if (batch.current || activeRequest.current) return;
    const selection = selectionRef.current;
    const currentContext = buildSelectedAiContext(useStore.getState(), selection.selected, selection.consent);
    const currentScope = agentContextScope(currentContext, selection.consent);
    const selectionKey = JSON.stringify(selection);
    // Approved earlier writes may update their own context records. Validate the
    // batch's starting snapshot, then recheck selection/consent and each target.
    const reviewedScope = () => JSON.stringify(selectionRef.current) === selectionKey ? currentScope : null;
    const operation = { cancelled: false }; batch.current = operation; setApplying(true);
    try {
      for (const entry of entries) {
        if (operation.cancelled) break;
        if (JSON.stringify(selectionRef.current) !== selectionKey) { updateAction(messageId, entry.id, { status: 'failed', error: 'Your selected context changed. Generate a fresh plan.' }); break; }
        updateAction(messageId, entry.id, { status: 'applying' });
        try {
          const result = await runner.apply(plan, entry, reviewedScope);
          if (!operation.cancelled) updateAction(messageId, entry.id, { status: 'applied', result });
        } catch (error) {
          if (!operation.cancelled) updateAction(messageId, entry.id, { status: 'failed', error: error.message || 'This change could not be saved.' });
          break;
        }
      }
    } finally { if (batch.current === operation) { batch.current = null; if (!operation.cancelled) setApplying(false); } }
  }

  async function sendMessage(value = input) {
    const prompt = value.trim();
    if (!prompt || prompt.length > 8000 || !canSend || tooLarge || activeRequest.current || batch.current) return;
    const controller = new AbortController(); activeRequest.current = controller;
    const requestId = crypto.randomUUID(), scopeKey = JSON.stringify({ context: scope, provider: readiness.provider || 'ollama-local' });
    const completed = new Set(messages.filter(message => message.role === 'assistant' && message.status === 'complete' && !message.plan).map(message => message.turnId));
    let history = messages.filter(message => completed.has(message.turnId) && message.scopeKey === scopeKey && message.content).slice(-14).map(({ role, content }) => ({ role, content: content.slice(0, 8000) }));
    while (history.length && new TextEncoder().encode(JSON.stringify({ context, messages: [...history, { role: 'user', content: prompt }] })).length > 60 * 1024) history = history.slice(2);
    setMessages(current => [...current.slice(-(AGENT_LIMITS.transcriptTurns - 1) * 2), { id: `${requestId}-user`, turnId: requestId, role: 'user', content: prompt, scopeKey, sources: context.map(({ id, type, label }) => ({ id, type, label })), status: 'complete' },
      { id: requestId, turnId: requestId, role: 'assistant', content: '', scopeKey, status: 'streaming', planning: mode === 'plan' }]);
    setInput(''); setLoading(true); follow.current = true;
    const update = patch => { if (activeRequest.current === controller) setMessages(current => current.map(message => message.id === requestId ? { ...message, ...patch } : message)); };
    const deltas = createAgentTextBatcher(delta => {
      if (activeRequest.current === controller && !controller.signal.aborted) setMessages(current => current.map(message => message.id === requestId ? { ...message, content: message.content + delta } : message));
    }, { signal: controller.signal });
    try {
      if (mode === 'plan') {
        const result = await requestAgentsPlan({ model, prompt, context, consent, today: localDateKey(), agent, signal: controller.signal });
        if (activeRequest.current === controller && !controller.signal.aborted) update({ plan: runner.prepare(result, context, consent), content: result.summary });
      } else await streamAgentsChat({ model, messages: [...history, { role: 'user', content: prompt }], context, consent, responseStyle, intent: mode === 'insights' ? 'insights' : 'general', today: localDateKey(), signal: controller.signal,
        onDelta: deltas.push });
      deltas.flush();
      update({ status: controller.signal.aborted ? 'stopped' : 'complete' });
    } catch (error) {
      deltas.flush();
      if (controller.signal.aborted) update({ status: 'stopped' });
      else { update({ status: 'error', error: error.message || 'The response could not be completed.' }); if (activeRequest.current === controller) setInput(prompt); }
    } finally { deltas.dispose(); if (activeRequest.current === controller) { activeRequest.current = null; setLoading(false); } }
  }

  const check = () => setRefresh(value => value + 1);
  return <section className="gt-agents" aria-label="Agents workspace">
    <PageHeader title="Agents" subtitle="Ask questions, explore insights, and review actions." actions={<Button variant="secondary" aria-label="Check connection" disabled={busy || checking || !state.user?.id} onClick={check}><RefreshCw size={15} aria-hidden="true" /><span className="gt-agents__refresh-label">Check connection</span></Button>} />
    <div className="gt-agents__navigation"><Tabs label="Agents views" idPrefix={id} tabs={VIEWS.map(item => ({ ...item, panelId: `${id}-${item.value}-panel` }))} value={view} onChange={changeView} />
      <div className="gt-agents__status" role="status"><span data-ready={readiness.ready && Boolean(state.user?.id)} aria-hidden="true" />{statusText}</div></div>
    <section id={`${id}-${view}-panel`} role="tabpanel" aria-labelledby={`${id}-${view}`} className="gt-agents__content">
      {view === 'chat' && <div className="gt-agents__chat">
        <div className="gt-agents__chat-tools"><div className="gt-agents__mode" role="group" aria-label="Assistant mode">
          <button type="button" aria-pressed={mode === 'chat'} disabled={busy} onClick={() => setMode('chat')}><MessageSquare size={16} aria-hidden="true" /> Ask</button>
          <button type="button" aria-pressed={mode === 'insights'} disabled={busy} onClick={() => setMode('insights')}><ChartNoAxesCombined size={16} aria-hidden="true" /> Insights</button>
          <button type="button" aria-pressed={mode === 'plan'} disabled={busy || !planReady} onClick={() => setMode('plan')}><ListChecks size={16} aria-hidden="true" /> Plan & act</button></div>
          <div className="gt-agents__chat-options"><label className="gt-agents__model"><span>Model</span><select aria-label="Chat model" value={model} disabled={busy || !readiness.ready} onChange={event => setModel(event.target.value)}>{!models.length && <option value="">No model available</option>}{models.map(item => <option key={item.id} value={item.id}>{item.label || item.id}</option>)}</select></label><button className="gt-agents__context-link" type="button" onClick={() => changeView('context')}>{context.length ? `${context.length} record${context.length === 1 ? '' : 's'} selected` : 'Add context'}<ArrowUpRight size={14} aria-hidden="true" /></button></div></div>
        <div ref={thread} className="gt-agents__thread" role="log" aria-label="Conversation" aria-live="polite" aria-busy={loading} onScroll={event => { const node = event.currentTarget; follow.current = node.scrollHeight - node.clientHeight - node.scrollTop < 90; }}>
          {!messages.length && <div className="gt-agents__welcome">
            {!readiness.ready && state.user?.id ? <ConnectionGuide readiness={readiness} checking={checking} refresh={check} openSettings={() => changeView('settings')} /> : <div className="gt-agents__welcome-copy"><h2>What would you like to work on?</h2><p>{!state.user?.id ? 'Sign in to ask a question. You can still draft a message below.' : 'Ask a question or start with a plan. You review every change before saving.'}</p></div>}
            {readiness.ready && <div className="gt-agents__presets" aria-label="Suggested questions">{starters.map(preset => <button key={preset.label} type="button" disabled={!canSend} onClick={() => { setAgent(preset.id || 'custom'); setMode(preset.mode); setInput(preset.prompt); composer.current?.focus(); }}><strong>{preset.label}<ArrowUpRight size={15} aria-hidden="true" /></strong><span>{preset.description}</span></button>)}</div>}
          </div>}
          {messages.map(message => <article id={`gt-ai-message-${message.id}`} tabIndex={-1} className={`gt-agents__message gt-agents__message--${message.role}`} key={message.id} aria-label={message.role === 'user' ? 'Your message' : 'Assistant response'}>
            <div className="gt-agents__message-label">{message.role === 'user' ? <User size={15} aria-hidden="true" /> : <Bot size={15} aria-hidden="true" />}<strong>{message.role === 'user' ? 'You' : 'GrowthTrack AI'}</strong>{message.role === 'assistant' && <small>{message.status === 'streaming' ? message.planning ? 'Preparing a plan…' : 'Responding…' : message.status === 'stopped' ? 'Stopped' : message.status === 'error' ? 'Could not finish' : message.plan ? 'Action plan' : 'Answer'}</small>}</div>
            {message.plan ? <AgentPlanCard plan={message.plan} busy={busy} stale={message.plan.scope !== scope} onApply={entries => applyActions(message.id, message.plan, entries)} /> : message.role === 'assistant' && message.content ? <AgentAnswer>{message.content}</AgentAnswer> : <p className="gt-agents__message-text">{message.content || (message.status === 'streaming' ? message.planning ? 'Preparing changes for your review…' : 'Waiting for the model…' : '')}</p>}
            {message.sources?.length > 0 && <small className="gt-agents__sources">Shared records: {message.sources.map(source => source.label).join(', ')}</small>}
            {message.status === 'stopped' && <small className="gt-agents__sources">Response stopped. This answer is incomplete.</small>}
            {message.error && <p className="gt-agents__error" role="alert">{message.error}</p>}
            {message.role === 'assistant' && message.content && <Button size="sm" variant="ghost" aria-label="Copy response" onClick={() => navigator.clipboard.writeText(message.content).then(() => toast.success('Copied.')).catch(() => toast.error('Could not copy the response.'))}><Copy size={14} aria-hidden="true" /> Copy</Button>}
          </article>)}<div ref={bottom} />
        </div>
        <div className="gt-agents__composer-area">{tooLarge && <p className="gt-agents__error" role="alert">The message and selected records are too large. Choose fewer records or shorten your message.</p>}
          <form className="gt-agents__composer" onSubmit={event => { event.preventDefault(); void sendMessage(); }}><textarea ref={composer} aria-label="Message" value={input} maxLength={8000} rows={2} disabled={busy} placeholder={mode === 'plan' ? 'Describe the changes you want to prepare…' : 'Ask a question or work through an idea…'} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage(); } }} />
            {loading ? <Button variant="secondary" onClick={() => activeRequest.current?.abort()}><Square size={15} aria-hidden="true" /> Stop response</Button> : <Button type="submit" disabled={!canSend || !input.trim() || tooLarge}><Send size={15} aria-hidden="true" />{applying ? 'Saving changes…' : mode === 'plan' ? 'Prepare plan' : 'Send message'}</Button>}</form>
          <div className="gt-agents__composer-foot"><span>{mode === 'plan' ? 'Actions wait for your review.' : 'Enter to send · Shift + Enter for a new line'}</span><span>{readiness.provider === 'groq' ? 'Your messages and selected records are sent to Groq.' : 'Only your message and selected records go to the model server.'}</span></div>
        </div>
      </div>}

      {view === 'context' && <div className="gt-agents__view" role="region" aria-label="Context selection"><div className="gt-agents__view-heading"><div><h2>Choose your sources</h2><p>Choose an app overview for insights across loaded records, or select individual records. Updates require individual sources.</p></div><Button variant="secondary" onClick={() => changeView('chat')}>Back to chat</Button></div>
        <div className="gt-agents__context-layout"><section><div className="gt-agents__record-heading"><h3>Select records ({context.length}/20 selected)</h3><Button variant="ghost" disabled={busy || !selected.length} onClick={() => setSelected([])}>Clear selection</Button></div><label className="gt-agents__search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Search context records" placeholder="Find an overview, record, or category…" value={search} onChange={event => setSearch(event.target.value)} /></label>
          {matching.length > filtered.length && <p className="gt-agents__memory-note">Showing {filtered.length} of {matching.length} sources. Refine your search to find more; overviews still cover all eligible loaded records.</p>}
          {state.isLoading ? <p role="status">Loading your workspace records…</p> : state.initialLoadError ? <p role="alert">Your workspace records could not be loaded. Refresh your workspace before selecting context.</p> : !filtered.length ? <p className="gt-agents__empty-records">{search ? 'No records match your search.' : 'No records available. Create a task, goal, or habit, or enable a sensitive category to review it.'}</p> : <div className="gt-agents__records">{filtered.map(record => <label key={record.key}><input type="checkbox" checked={selected.includes(record.key)} disabled={busy || (context.length >= 20 && !selected.includes(record.key))} onChange={event => setSelected(keys => event.target.checked ? [...keys, record.key] : keys.filter(key => key !== record.key))} /><span><strong>{record.group}: {record.label}</strong><small>{record.preview || record.text}</small></span></label>)}</div>}
        </section><aside className="gt-agents__context-aside"><fieldset disabled={busy}><legend>Optional sensitive context</legend><p>Enable a category to see its records, then choose individual records to attach.</p>{SENSITIVE.map(([domain, label]) => <label key={domain}><input type="checkbox" checked={consent[domain]} onChange={event => changeConsent(domain, event.target.checked)} /><span>{label}</span></label>)}</fieldset>
          <section><h3>Attached to the next question</h3>{context.length ? <ul aria-label="Selected source records">{context.map(record => <li key={`${record.type}:${record.id}`}>{record.label}</li>)}</ul> : <p>No records attached. You can ask questions or create new records without attaching account data.</p>}</section></aside></div>
      </div>}

      {view === 'history' && <div className="gt-agents__view" role="region" aria-label="Session history"><div className="gt-agents__view-heading"><div><h2>This session</h2><p>{questions.length} {questions.length === 1 ? 'question' : 'questions'} · {appliedCount} {appliedCount === 1 ? 'change' : 'changes'} saved</p></div><Button variant="secondary" disabled={applying} onClick={clearChat}><Trash2 size={15} aria-hidden="true" /> Clear conversation</Button></div>
        <p className="gt-agents__memory-note">The latest {AGENT_LIMITS.transcriptTurns} questions and plans stay in memory and clear when you leave this page or change accounts. Plans expire after 10 minutes. Applied changes remain in their app pages.</p>
        {!questions.length ? <div className="gt-agents__empty"><MessageSquare size={28} aria-hidden="true" /><h3>No activity yet</h3><p>Your questions, plans, and action results will appear here.</p><Button variant="secondary" onClick={() => changeView('chat')}>Start a conversation</Button></div> : <ol className="gt-agents__activity" aria-label="Questions in this session">{questions.map((message, index) => {
          const reply = messages.find(item => item.role === 'assistant' && item.turnId === message.turnId);
          return <li key={message.id}><button type="button" onClick={() => { jump.current = message.id; changeView('chat'); }}><span>{String(index + 1).padStart(2, '0')}</span><strong>{message.content}</strong><small>{reply?.status === 'streaming' ? 'In progress' : reply?.status === 'error' ? 'Needs attention' : reply?.plan ? `${reply.plan.actions.filter(entry => entry.status === 'applied').length}/${reply.plan.actions.length} changes saved` : reply?.status === 'stopped' ? 'Stopped' : 'Answered'}</small><ArrowUpRight size={16} aria-hidden="true" /></button></li>;
        })}</ol>}
      </div>}

      {view === 'settings' && <div className="gt-agents__view" role="region" aria-label="Model settings"><div className="gt-agents__view-heading"><div><h2>Model & connection</h2><p>Choose an available model for your next message or plan.</p></div><Button variant="secondary" onClick={() => changeView('chat')}>Back to chat</Button></div>
        <div className="gt-agents__settings-grid"><section className="gt-agents__settings-form"><label>Model<select value={model} disabled={busy || !readiness.ready} onChange={event => setModel(event.target.value)}>{!models.length && <option value="">No chat model available</option>}{models.map(item => <option key={item.id} value={item.id}>{item.label || item.id}</option>)}</select></label><label>Answer style<select value={responseStyle} disabled={busy} onChange={event => setResponseStyle(event.target.value)}><option value="standard">Standard</option><option value="multiple-choice">Multiple-choice coaching</option></select></label><Button variant="secondary" disabled={busy || checking || !state.user?.id} onClick={check}><RefreshCw size={15} aria-hidden="true" /> Refresh models</Button>
          <div className="gt-agents__capabilities"><h3>What agents can help with</h3><ul><li>General questions, explanations, writing, math, and coding</li><li>App guidance with links to the relevant pages</li><li>Insights from selected records and app overviews</li><li>Create, update, and complete tasks</li><li>Create goals and update recorded progress</li><li>Create habits and adjust their weekly targets</li><li>Draft and save workspace notes</li></ul><p>Overviews cover currently loaded owner records. Live web search and unshared connected-app data are unavailable. You review actions before saving.</p></div>
        </section>{readiness.provider === 'groq' ? <GroqSetup ready={readiness.ready} checking={checking} /> : <section className="gt-agents__setup" aria-label="Local model setup"><h3>Set up your local model</h3><ol><li><strong>Install and open Ollama</strong><p>Run it on the computer hosting the GrowthTrack API.</p><a href="https://ollama.com/download" target="_blank" rel="noreferrer">Get Ollama<ArrowUpRight size={14} aria-hidden="true" /></a></li><li><strong>Add a chat model</strong><p>Choose a model that fits your computer. A small example:</p><code>ollama pull gemma3:1b</code></li><li><strong>Connect the GrowthTrack API</strong><p>Set this in the API environment, then restart the API:</p><code>OLLAMA_BASE_URL=http://127.0.0.1:11434</code></li><li><strong>Refresh models</strong><p>The model selector becomes available once the connection succeeds.</p></li></ol><p className="gt-agents__setup-status">{readiness.ready ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}{readiness.ready ? 'Connected and ready' : checking ? 'Checking connection…' : 'Setup is not complete'}</p><a href="https://docs.ollama.com/quickstart" target="_blank" rel="noreferrer">Ollama setup guide<ArrowUpRight size={14} aria-hidden="true" /></a></section>}</div>
      </div>}
    </section>
  </section>;
}
