import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Download, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';
import { FixedSizeList as List } from 'react-window';

const ACTIONS   = ['all', 'create', 'update', 'delete', 'login', 'export', 'import', 'error'];
const SENTIMENTS = ['all', 'positive', 'neutral', 'negative'];
const TABLES     = ['all', 'users', 'goals', 'habits', 'tasks', 'finance', 'training', 'nutrition', 'notes', 'projects'];

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

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch { return String(ts); }
}

function renderMarkdown(text = '') {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:4px;font-size:0.85em;font-family:monospace">$1</code>')
    .replace(/\n/g, '<br/>');
}

export default function Logs() {
  const toast = useToast();
  const user  = useStore(s => s.user);

  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [actionF,  setActionF]  = useState('all');
  const [tableF,   setTableF]   = useState('all');
  const [sentimentF, setSentimentF] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [sortKey,  setSortKey]  = useState('timestamp');
  const [sortDir,  setSortDir]  = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualForm, setManualForm] = useState({ action: 'create', table_name: 'users', details: '' });

  const apiSync = useStore(s => s.apiSync);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : (data.logs || []));
    } catch {
      // Fallback to empty or cached
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, []);

  const enriched = useMemo(() => logs.map(l => ({
    ...l,
    _sentiment: getSentiment(l.details || l.description || ''),
    _ts: l.timestamp ? new Date(l.timestamp).getTime() : 0,
  })), [logs]);

  const filtered = useMemo(() => {
    let list = enriched;
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
  }, [enriched, actionF, tableF, sentimentF, dateFrom, dateTo, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const exportLogs = useCallback((format = 'json') => {
    const data = filtered.map(({ _sentiment, _ts, ...l }) => l);
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
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...manualForm, user_id: user?.id, timestamp: new Date().toISOString() }),
      });
      toast.success('Log entry added');
      setShowAddModal(false);
      setManualForm({ action: 'create', table_name: 'users', details: '' });
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
          <button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus size={14} /> Add Entry</button>
        </div>
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
        <select value={actionF}  onChange={e => setActionF(e.target.value)}  className="form-input" style={{ width: 'auto' }}>
          {ACTIONS.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>)}
        </select>
        <select value={tableF}   onChange={e => setTableF(e.target.value)}   className="form-input" style={{ width: 'auto' }}>
          {TABLES.map(t => <option key={t} value={t}>{t === 'all' ? 'All Tables' : t}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input" style={{ width: '140px' }} />
        <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>→</span>
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="form-input" style={{ width: '140px' }} />
        {(search || actionF !== 'all' || tableF !== 'all' || sentimentF !== 'all' || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setActionF('all'); setTableF('all'); setSentimentF('all'); setDateFrom(''); setDateTo(''); }} style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.72rem' }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-3)' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Filter} title="No logs found" description={enriched.length === 0 ? 'No audit logs recorded yet.' : 'No logs match your current filters.'} />
        ) : (<>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[['timestamp', 'Time'], ['action', 'Action'], ['table_name', 'Table'], ['item_id', 'Item ID'], ['', 'Sentiment'], ['', 'Details']].map(([k, h]) => (
                  <th key={h} onClick={() => k && toggleSort(k)} style={{
                    padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700,
                    fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                    cursor: k ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
                  }}>{h} {k && <SortIcon k={k} />}</th>
                ))}
              </tr>
            </thead>
          </table>
          <div style={{ flex: 1, minHeight: '400px' }}>
            <List
              height={400}
              itemCount={filtered.length}
              itemSize={42}
              width="100%"
              itemData={filtered}
            >
              {({ index, style, data }) => {
                const log = data[index];
                const sc = SENTIMENT_COLORS[log._sentiment] || SENTIMENT_COLORS.neutral;
                const ac = ACTION_COLORS[(log.action || '').toLowerCase()] || ACTION_COLORS.other;
                const details = log.details || log.description || '';
                return (
                  <div style={{ ...style, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                    onClick={() => setExpandedId(log.id)}>
                    <div style={{ width: '150px', padding: '0 0.75rem', color: 'var(--text-3)', whiteSpace: 'nowrap', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} /> {formatTimestamp(log.timestamp)}
                    </div>
                    <div style={{ width: '100px', padding: '0 0.75rem' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700, background: `${ac}20`, color: ac, textTransform: 'capitalize' }}>
                        {log.action || '—'}
                      </span>
                    </div>
                    <div style={{ width: '120px', padding: '0 0.75rem', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: '0.72rem' }}>{log.table_name || '—'}</div>
                    <div style={{ width: '120px', padding: '0 0.75rem', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: '0.68rem' }}>{log.item_id || '—'}</div>
                    <div style={{ width: '120px', padding: '0 0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: sc.text, fontSize: '0.68rem', fontWeight: 700, background: sc.bg, padding: '2px 8px', borderRadius: '99px', border: `1px solid ${sc.border}` }}>
                        {sc.icon}{log._sentiment}
                      </span>
                    </div>
                    <div style={{ flex: 1, padding: '0 0.75rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                      <span dangerouslySetInnerHTML={{ __html: renderMarkdown(details.slice(0, 150)) }} />
                    </div>
                  </div>
                );
              }}
            </List>
          </div>
          </>)}
      </div>

      {/* Expanded details modal */}
      {expandedId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setExpandedId(null)}>
          <div className="glass-card" style={{ width: '600px', maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-1)' }}>Log Details</p>
            {(() => {
              const log = logs.find(l => l.id === expandedId);
              if (!log) return null;
              const details = log.details || log.description || '';
              return (
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(details) }} />
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
          <div className="glass-card" style={{ width: '420px', maxWidth: '95vw' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-1)' }}>Add Manual Log Entry</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
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
