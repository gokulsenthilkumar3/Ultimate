import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Download, Plus, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, Clock, Shield, Database, Activity, Cpu, User, Hash, Server } from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDateTime } from '../utils/userFormatters';
import '../styles/logs.css';

const ACTIONS   = ['all', 'create', 'update', 'delete', 'login', 'export', 'import', 'error', 'login_success', 'login_failed', 'signup', 'logout', 'session_start', 'session_end', 'page_view'];
const SENTIMENTS = ['all', 'positive', 'neutral', 'negative'];
const CATEGORIES = ['all', 'auth', 'session', 'audit', 'system'];
const TABLES     = ['all', 'users', 'goals', 'habits', 'tasks', 'finance', 'training', 'nutrition', 'notes', 'projects', 'sessions', 'navigation'];

const SENTIMENT_COLORS = {
  positive: { text: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  icon: <CheckCircle size={12} /> },
  neutral:  { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)',  icon: <Info size={12} /> },
  negative: { text: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', icon: <AlertTriangle size={12} /> },
};

const ACTION_COLORS = {
  create: '#10b981', update: '#0ea5e9', delete: '#f87171', login: '#8b5cf6',
  export: '#f59e0b', import: '#6366f1', error: '#ef4444', other: '#6b7280',
};

function getSentiment(text = '') {
  const t = (text || '').toLowerCase();
  const pos = ['success', 'created', 'completed', 'done', 'added', 'achieved', 'won', 'ok', 'saved', 'activated'];
  const neg = ['error', 'failed', 'deleted', 'removed', 'denied', 'expired', 'invalid', 'crash', 'exception'];
  if (pos.some(w => t.includes(w))) return 'positive';
  if (neg.some(w => t.includes(w))) return 'negative';
  return 'neutral';
}

function formatTimestamp(ts, user) {
  if (!ts) return '—';
  try {
    return formatDateTime(ts, user);
  } catch { return String(ts); }
}

function titleCase(value = '') {
  return String(value || 'Event').replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function categoryIcon(category) {
  if (category === 'auth') return <Shield size={16} />;
  if (category === 'session') return <Activity size={16} />;
  if (category === 'system') return <Cpu size={16} />;
  return <Database size={16} />;
}

export default function Logs() {
  const toast = useToast();
  const user  = useStore(s => s.user);

  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [loadError, setLoadError] = useState('');
  const [diagnostics, setDiagnostics] = useState(null);
  const [selfTesting, setSelfTesting] = useState(false);
  const [search,   setSearch]   = useState('');
  const [actionF,  setActionF]  = useState('all');
  const [tableF,   setTableF]   = useState('all');
  const [categoryF, setCategoryF] = useState('all');
  const [sentimentF, setSentimentF] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [sortKey,  setSortKey]  = useState('timestamp');
  const [sortDir,  setSortDir]  = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualForm, setManualForm] = useState({ action: 'create', table_name: 'users', details: '', category: 'audit' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const qs = new URLSearchParams();
      if (categoryF !== 'all') qs.append('category', categoryF);
      if (actionF !== 'all') qs.append('action', actionF);
      if (search.trim()) qs.append('q', search.trim());
      if (dateFrom) qs.append('from', new Date(dateFrom).toISOString());
      if (dateTo) qs.append('to', new Date(dateTo + 'T23:59:59').toISOString());

      const data = await apiSync(`/logs?${qs.toString()}`, 'GET');
      if (!data) throw new Error();
      setLogs(Array.isArray(data) ? data : (data.logs || []));
      try {
        setDiagnostics(await apiSync('/logs/diagnostics', 'GET'));
      } catch (error) {
        setDiagnostics({ status: 'unavailable', error: error?.message || 'Diagnostics unavailable.' });
      }
    } catch (error) {
      setLoadError(error?.message || 'Logs service is unavailable.');
      setDiagnostics({ status: 'unavailable', error: error?.message || 'Logs service is unavailable.' });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [categoryF, actionF, search, dateFrom, dateTo]);

  const runSelfTest = useCallback(async () => {
    setSelfTesting(true);
    try { const result = await apiSync('/logs/diagnostics/self-test', 'POST', {}); toast.success(`Logging verified (${result.eventId})`); await fetchLogs(); }
    catch (error) { toast.error(error?.message || 'Logging self-test failed.'); }
    finally { setSelfTesting(false); }
  }, [fetchLogs, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const enriched = useMemo(() => logs.map(l => ({
    ...l,
    _sentiment: getSentiment(l.details || l.description || ''),
    _ts: l.timestamp ? new Date(l.timestamp).getTime() : 0,
    _severity: String(l.severity || (getSentiment(l.details || l.description || '') === 'negative' ? 'error' : 'info')).toLowerCase(),
    _actor: l.user_name || l.actor_name || l.user_email || l.email || 'System',
    _source: l.source || 'ultimate-api',
    _details: l.details || l.description || l.failure_reason || 'No additional details recorded.',
  })), [logs]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (categoryF !== 'all') list = list.filter(l => (l.category || '') === categoryF);
    if (actionF   !== 'all') list = list.filter(l => (l.action || '').toLowerCase().includes(actionF));
    if (tableF    !== 'all') list = list.filter(l => (l.table_name || '') === tableF);
    if (sentimentF !== 'all') list = list.filter(l => l._sentiment === sentimentF);
    if (dateFrom)            list = list.filter(l => l._ts >= new Date(dateFrom).getTime());
    if (dateTo)              list = list.filter(l => l._ts <= new Date(dateTo + 'T23:59:59').getTime());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        (l.details || '').toLowerCase().includes(q) ||
        (l.action  || '').toLowerCase().includes(q) ||
        (l.table_name || '').toLowerCase().includes(q) ||
        (l._actor || '').toLowerCase().includes(q) ||
        (l._source || '').toLowerCase().includes(q) ||
        (l.request_id || '').toLowerCase().includes(q) ||
        String(l.item_id || '').includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'timestamp') { va = a._ts; vb = b._ts; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [enriched, categoryF, actionF, tableF, sentimentF, dateFrom, dateTo, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const exportLogs = useCallback((format = 'json') => {
    const data = filtered.map(({ _sentiment, _ts, _severity, _actor, _source, _details, ...l }) => l);
    let content, type, ext;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      type = 'application/json';
      ext = 'json';
    } else {
      const headers = Object.keys(data[0] || {});
      const rows = [headers.join(','), ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))];
      content = rows.join('\n');
      type = 'text/csv';
      ext = 'csv';
    }
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `logs-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} logs as ${ext.toUpperCase()}`);
  }, [filtered, toast]);

  const handleAddLog = async () => {
    if (!manualForm.details) { toast.error('Details required.'); return; }
    try {
      const res = await apiSync('/logs', 'POST', {
        ...manualForm,
        user_id: user?.id,
        timestamp: new Date().toISOString(),
      });
      if (!res) throw new Error();
      toast.success('Log entry added');
      setShowAddModal(false);
      setManualForm({ action: 'create', table_name: 'users', details: '', category: 'audit' });
      fetchLogs();
    } catch { toast.error('Failed to add log entry.'); }
  };

  const SortIcon = ({ k }) => sortKey !== k ? null : sortDir === 'asc' ? <ChevronUp size={11} style={{ display: 'inline' }} /> : <ChevronDown size={11} style={{ display: 'inline' }} />;

  const sentimentStats = useMemo(() => ({
    positive: enriched.filter(l => l._sentiment === 'positive').length,
    neutral:  enriched.filter(l => l._sentiment === 'neutral').length,
    negative: enriched.filter(l => l._sentiment === 'negative').length,
  }), [enriched]);

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>System</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Audit Logs</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{enriched.length} total · {filtered.length} shown</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button onClick={() => exportLogs('csv')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            <Download size={12} /> CSV
          </button>
          <button onClick={() => exportLogs('json')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            <Download size={12} /> JSON
          </button>
          <button onClick={runSelfTest} className="btn-primary" disabled={selfTesting}><CheckCircle size={14} /> {selfTesting ? 'Testing…' : 'Test logging'}</button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus size={14} /> Add Entry</button>
        </div>
      </div>
      {diagnostics && <div className="gt-surface gt-glass" role="status" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.75rem', fontSize: '0.75rem' }}>
        <span><strong>Logging:</strong> {diagnostics.status}</span>
        {diagnostics.counts && <span>DB events: {diagnostics.counts.total}</span>}
        {diagnostics.diagnostics?.lastSuccessfulEvent && <span>Last event: {diagnostics.diagnostics.lastSuccessfulEvent.action}</span>}
        {diagnostics.databasePath && <span style={{ color: 'var(--text-3)' }}>SQLite connected</span>}
        {diagnostics.error && <span style={{ color: 'var(--danger)' }}>{diagnostics.error}</span>}
      </div>}

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const isActive = categoryF === cat;
          const icon = cat === 'auth' ? <Shield size={12} /> : 
                     cat === 'audit' ? <Database size={12} /> :
                     cat === 'session' ? <Activity size={12} /> :
                     cat === 'system' ? <Cpu size={12} /> : null;
          const count = cat === 'all' ? enriched.length : enriched.filter(l => (l.category || '') === cat).length;
          const color = cat === 'auth' ? '#8b5cf6' :
                      cat === 'audit' ? '#10b981' :
                      cat === 'session' ? '#0ea5e9' :
                      cat === 'system' ? '#f59e0b' : '#6b7280';
          return (
            <button key={cat} onClick={() => setCategoryF(cat)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px',
              background: isActive ? `${color}20` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.08)'}`,
              color: isActive ? color : 'var(--text-2)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
              transition: 'all 0.2s',
            }}>
              {icon} {cat === 'all' ? 'All Logs' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              <span style={{ background: `${color}30`, padding: '2px 8px', borderRadius: '99px', fontSize: '0.65rem', color }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Sentiment summary */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {Object.entries(sentimentStats).map(([s, count]) => {
          const sc = SENTIMENT_COLORS[s];
          return (
            <button key={s} onClick={() => setSentimentF(sentimentF === s ? 'all' : s)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '99px',
              background: sentimentF === s ? sc.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${sentimentF === s ? sc.border : 'rgba(255,255,255,0.08)'}`,
              color: sc.text, cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
            }}>
              {sc.icon} {s.charAt(0).toUpperCase() + s.slice(1)}
              <span style={{ background: sc.bg, padding: '0px 6px', borderRadius: '99px', fontSize: '0.65rem' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs…" className="form-input" style={{ paddingLeft: '30px' }} />
        </div>
        <select value={categoryF} onChange={e => setCategoryF(e.target.value)} className="form-input" style={{ width: 'auto' }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <select value={actionF}  onChange={e => setActionF(e.target.value)}  className="form-input" style={{ width: 'auto' }}>
          {ACTIONS.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>)}
        </select>
        <select value={tableF}   onChange={e => setTableF(e.target.value)}   className="form-input" style={{ width: 'auto' }}>
          {TABLES.map(t => <option key={t} value={t}>{t === 'all' ? 'All Tables' : t}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input" style={{ width: '140px' }} />
        <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>→</span>
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="form-input" style={{ width: '140px' }} />
        {(search || categoryF !== 'all' || actionF !== 'all' || tableF !== 'all' || sentimentF !== 'all' || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setCategoryF('all'); setActionF('all'); setTableF('all'); setSentimentF('all'); setDateFrom(''); setDateTo(''); }} style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.72rem' }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Unified event stream */}
      <div className="gt-surface gt-glass log-stream">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-3)' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : loadError ? (
          <EmptyState icon={AlertTriangle} title="Logs unavailable" description={loadError} actionLabel="Retry" onAction={fetchLogs} />
        ) : diagnostics?.status === 'unavailable' && enriched.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Logging diagnostics unavailable" description={diagnostics.error || 'The logging service could not be verified.'} actionLabel="Retry" onAction={fetchLogs} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Filter} title="No logs found" description={enriched.length === 0 ? 'No audit logs recorded yet.' : 'No logs match your current filters.'} />
        ) : (<>
          <div className="log-stream__toolbar">
            <div><strong>Event stream</strong><span>{filtered.length} records in the current view</span></div>
            <button type="button" onClick={() => toggleSort('timestamp')} className="log-sort-button">
              <Clock size={13} /> {sortDir === 'desc' ? 'Newest first' : 'Oldest first'} <SortIcon k="timestamp" />
            </button>
          </div>
          <div className="log-event-list" role="list">
            {filtered.map((log) => {
              const actionColor = ACTION_COLORS[(log.action || '').toLowerCase()] || ACTION_COLORS.other;
              return (
                <button type="button" role="listitem" className="log-event" key={`${log.category}-${log.id}`} onClick={() => setExpandedId(`${log.category || 'audit'}:${log.id}`)}>
                  <span className={`log-event__icon log-event__icon--${log.category || 'audit'}`}>{categoryIcon(log.category)}</span>
                  <span className="log-event__content">
                    <span className="log-event__heading">
                      <strong>{titleCase(log.action)}</strong>
                      <span className={`log-severity log-severity--${log._severity}`}>{log._severity}</span>
                      <span className="log-category">{titleCase(log.category || 'audit')}</span>
                    </span>
                    <span className="log-event__details">{log._details}</span>
                    <span className="log-event__metadata">
                      <span><Clock size={12} />{formatTimestamp(log.timestamp, user)}</span>
                      <span><User size={12} />{log._actor}</span>
                      <span><Server size={12} />{log._source}</span>
                      {(log.table_name || log.item_id) && <span><Database size={12} />{log.table_name || 'record'}{log.item_id ? ` · ${log.item_id}` : ''}</span>}
                      {log.request_id && <span className="log-request-id"><Hash size={12} />{log.request_id}</span>}
                    </span>
                  </span>
                  <span className="log-event__action" style={{ color: actionColor }}>View</span>
                </button>
              );
            })}
          </div>
        </>)}
      </div>

      {/* Expanded details modal */}
      {expandedId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setExpandedId(null)}>
          <div className="gt-surface gt-glass log-detail" onClick={e => e.stopPropagation()}>
            {(() => {
              const log = enriched.find(l => `${l.category || 'audit'}:${l.id}` === expandedId);
              if (!log) return null;
              const normalized = log;
              const details = normalized._details || log.details || log.description || '';
              return (
                <div>
                  <div className="log-detail__header">
                    <span className={`log-event__icon log-event__icon--${normalized.category || 'audit'}`}>{categoryIcon(normalized.category)}</span>
                    <div><span>{titleCase(normalized.category || 'audit')} event</span><h3>{titleCase(normalized.action)}</h3></div>
                    <span className={`log-severity log-severity--${normalized._severity || 'info'}`}>{normalized._severity || 'info'}</span>
                  </div>
                  <dl className="log-detail__facts">
                    <div><dt>Time</dt><dd>{formatTimestamp(normalized.timestamp, user)}</dd></div>
                    <div><dt>Actor</dt><dd>{normalized._actor || 'System'}</dd></div>
                    <div><dt>Source</dt><dd>{normalized._source || 'ultimate-api'}</dd></div>
                    <div><dt>Target</dt><dd>{normalized.table_name || '—'}{normalized.item_id ? ` · ${normalized.item_id}` : ''}</dd></div>
                    <div className="log-detail__wide"><dt>Request ID</dt><dd>{normalized.request_id || 'Not recorded'}</dd></div>
                  </dl>
                  <div className="log-detail__message">
                    <span>Event details</span>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>{details}</ReactMarkdown>
                  </div>
                </div>
              );
            })()}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setExpandedId(null)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add manual log modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="gt-surface gt-glass" style={{ width: '420px', maxWidth: '95vw' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-1)' }}>Add Manual Log Entry</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
              <select value={manualForm.category} onChange={e => setManualForm(f => ({ ...f, category: e.target.value }))} className="form-input">
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={manualForm.action} onChange={e => setManualForm(f => ({ ...f, action: e.target.value }))} className="form-input">
                {ACTIONS.filter(a => a !== 'all').map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={manualForm.table_name} onChange={e => setManualForm(f => ({ ...f, table_name: e.target.value }))} className="form-input">
                {TABLES.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea value={manualForm.details} onChange={e => setManualForm(f => ({ ...f, details: e.target.value }))}
                placeholder="Log details (markdown supported)…" rows={4} className="form-input" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
              <button onClick={handleAddLog} className="btn-primary">Save Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
