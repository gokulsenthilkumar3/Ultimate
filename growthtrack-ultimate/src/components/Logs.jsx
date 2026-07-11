import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Search, Filter, ArrowUpDown, Clock, Globe, AlertCircle, CheckCircle2, 
         Trash2, Plus, RefreshCw, Download, X, FileText, Send } from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import PageHeader from './ui/PageHeader';

const ACTION_OPTS  = ['All', 'INSERT', 'UPDATE', 'DELETE', 'NOTE'];
const ACTION_COLOR = {
  INSERT: { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  UPDATE: { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa' },
  DELETE: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  NOTE:   { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
};

// ── Manual Log Entry Modal ──────────────────────────────────────────────────
function AddLogModal({ user, onClose, onSaved }) {
  const [table, setTable]   = useState('manual');
  const [action, setAction] = useState('NOTE');
  const [details, setDetails] = useState('');
  const [saving, setSaving]  = useState(false);

  const handleSave = async () => {
    if (!details.trim()) return;
    setSaving(true);
    const entry = {
      table_name: table || 'manual',
      action,
      details: details.trim(),
      actor_name: user?.name || 'User',
      actor_email: user?.email || '',
      actor_ip: '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    await apiSync('/logs', 'POST', entry);
    setSaving(false);
    onSaved(entry);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} color="var(--accent)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add Manual Log Entry</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '2px' }}>Annotate an event or action</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                Module / Table
              </label>
              <input
                className="form-input"
                placeholder="e.g. training, nutrition…"
                value={table}
                onChange={e => setTable(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                Action Type
              </label>
              <select className="form-input" value={action} onChange={e => setAction(e.target.value)}>
                {['NOTE', 'INSERT', 'UPDATE', 'DELETE'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
              Details / Notes
            </label>
            <textarea
              className="form-input"
              placeholder="Describe the event, change, or observation…"
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={4}
              style={{ resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <button onClick={onClose} className="btn-secondary" style={{ fontSize: '0.82rem' }}>Cancel</button>
            <button onClick={handleSave} disabled={!details.trim() || saving} className="btn-primary" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} />
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export helper ──────────────────────────────────────────────────────────
function exportLogs(logs, format = 'json') {
  let content, mime, ext;
  if (format === 'csv') {
    const headers = ['timestamp', 'actor_name', 'actor_email', 'actor_ip', 'action', 'table_name', 'details'];
    const rows = logs.map(l => headers.map(h => `"${(l[h] || '').toString().replace(/"/g, '""')}"`).join(','));
    content = [headers.join(','), ...rows].join('\n');
    mime = 'text/csv';
    ext = 'csv';
  } else {
    content = JSON.stringify(logs, null, 2);
    mime = 'application/json';
    ext = 'json';
  }
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Logs() {
  const user = useStore(s => s.user);
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [filterTable, setFilterTable]   = useState('All');
  const [filterAction, setFilterAction] = useState('All');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchLogs = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await apiSync('/logs', 'GET');
      setLogs(data || []);
    } catch {
      // keep current logs on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const tables = useMemo(() => ['All', ...new Set((logs || []).map(l => l.table_name))], [logs]);

  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        const matchSearch =
          log.action?.toLowerCase().includes(search.toLowerCase()) ||
          log.table_name?.toLowerCase().includes(search.toLowerCase()) ||
          log.details?.toLowerCase().includes(search.toLowerCase()) ||
          log.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
          log.actor_ip?.toLowerCase().includes(search.toLowerCase());

        const matchTable  = filterTable  === 'All' || log.table_name === filterTable;
        const matchAction = filterAction === 'All' || log.action === filterAction;

        const ts = log.timestamp ? new Date(log.timestamp) : null;
        const matchFrom = !dateFrom || (ts && ts >= new Date(dateFrom));
        const matchTo   = !dateTo   || (ts && ts <= new Date(dateTo + 'T23:59:59'));

        return matchSearch && matchTable && matchAction && matchFrom && matchTo;
      })
      .sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ?  1 : -1;
        return 0;
      });
  }, [logs, search, sortConfig, filterTable, filterAction, dateFrom, dateTo]);

  const requestSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const clearFilters = () => { setFilterTable('All'); setFilterAction('All'); setDateFrom(''); setDateTo(''); setSearch(''); };
  const hasFilters = filterTable !== 'All' || filterAction !== 'All' || dateFrom || dateTo || search;

  const handleLogSaved = (entry) => {
    setLogs(prev => [{ ...entry, id: Date.now().toString() }, ...prev]);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div className="spin-ring" />
        <p style={{ marginTop: '1rem', color: 'var(--text-3)' }}>RETRIEVING AUDIT TRAIL...</p>
      </div>
    );
  }

  return (
    <div className="fade-in module-page">
      {showAddModal && (
        <AddLogModal
          user={user}
          onClose={() => setShowAddModal(false)}
          onSaved={handleLogSaved}
        />
      )}

      <PageHeader
        accent="Security & Audit"
        icon={<Shield size={24} />}
        title="System Logs"
        subtitle="Real-time audit trail of all database mutations and system actions."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              className="btn-icon"
              title="Refresh logs"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem', fontSize: '0.78rem', borderRadius: 'var(--radius-md)' }}
            >
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <div style={{ display: 'flex', gap: '0' }}>
              <button
                onClick={() => exportLogs(filteredLogs, 'csv')}
                className="btn-icon"
                title="Export as CSV"
                style={{ borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', borderRight: '1px solid var(--border)', padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={() => exportLogs(filteredLogs, 'json')}
                className="btn-icon"
                title="Export as JSON"
                style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0', padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
              >
                JSON
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '0.45rem 1rem' }}
            >
              <Plus size={14} /> Add Entry
            </button>
          </div>
        }
      />

      {/* Filter panel */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        {/* Row 1: search + module + action */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input type="text" placeholder="Search action, table, actor, IP…"
              className="form-input" style={{ paddingLeft: '34px' }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Module / table filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={14} style={{ color: 'var(--text-3)' }} />
            <select className="form-input" style={{ width: 'auto' }}
              value={filterTable} onChange={e => setFilterTable(e.target.value)}>
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Action filter buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ACTION_OPTS.map(a => {
              const col = ACTION_COLOR[a];
              const active = filterAction === a;
              return (
                <button key={a} onClick={() => setFilterAction(a)}
                  style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800,
                    cursor: 'pointer', transition: '0.15s',
                    background: active ? (col?.bg || 'rgba(255,255,255,0.12)') : 'rgba(255,255,255,0.04)',
                    color: active ? (col?.color || '#fff') : 'var(--text-3)',
                    border: active ? `1px solid ${col?.color || 'rgba(255,255,255,0.3)'}` : '1px solid rgba(255,255,255,0.08)',
                  }}>{a}</button>
              );
            })}
          </div>
        </div>

        {/* Row 2: date range */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Clock size={14} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 700 }}>DATE RANGE:</span>
          <input type="date" className="form-input" style={{ width: 'auto', fontSize: '0.8rem' }}
            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>to</span>
          <input type="date" className="form-input" style={{ width: 'auto', fontSize: '0.8rem' }}
            value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {hasFilters && (
            <button onClick={clearFilters}
              style={{ fontSize: '0.72rem', padding: '4px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer', fontWeight: 700 }}>
              Clear Filters
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-3)' }}>
            {filteredLogs.length} / {logs.length} entries
          </span>
        </div>
      </div>

      {/* Empty state */}
      {filteredLogs.length === 0 && (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <Shield size={48} color="var(--text-3)" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {logs.length === 0 ? 'No audit logs yet. Server logs will appear here automatically.' : 'No entries match your current filters.'}
          </p>
          {logs.length === 0 && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Manual Entry
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {filteredLogs.length > 0 && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <th onClick={() => requestSort('timestamp')} style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={14} /> Time <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '1rem' }}>Actor</th>
                  <th style={{ padding: '1rem' }}><Globe size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> IP</th>
                  <th onClick={() => requestSort('action')} style={{ padding: '1rem', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Action <ArrowUpDown size={12} /></span>
                  </th>
                  <th onClick={() => requestSort('table_name')} style={{ padding: '1rem', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Module <ArrowUpDown size={12} /></span>
                  </th>
                  <th style={{ padding: '1rem' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => {
                  const ac = ACTION_COLOR[log.action] || { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-2)' };
                  return (
                    <tr key={log.id || idx} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="log-row-hover">
                      <td style={{ padding: '1rem', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)', display: 'block' }}>{log.actor_name || 'Unknown'}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{log.actor_email || '—'}</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {log.actor_ip || '127.0.0.1'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, background: ac.bg, color: ac.color }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-2)' }}>
                        <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{log.table_name}</span>
                      </td>
                      <td style={{ padding: '1rem', maxWidth: '300px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                          {log.details || '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .log-row-hover:hover { background: var(--bg-elevated) !important; }
        th:hover { color: var(--accent); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
