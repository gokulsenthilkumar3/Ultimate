import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Search, Filter, ArrowUpDown, Clock, Globe, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import PageHeader from './ui/PageHeader';

const ACTION_OPTS  = ['All', 'INSERT', 'UPDATE', 'DELETE'];
const ACTION_COLOR = {
  INSERT: { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  UPDATE: { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa' },
  DELETE: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
};

export default function Logs() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [filterTable, setFilterTable]   = useState('All');
  const [filterAction, setFilterAction] = useState('All');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');

  useEffect(() => {
    apiSync('/logs', 'GET')
      .then(data => { setLogs(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
      <PageHeader
        accent="Security & Audit"
        icon={<Shield size={24} />}
        title="System Logs"
        subtitle="Real-time audit trail of all database mutations and system actions."
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

      {/* Table */}
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
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
                    No audit logs matching your criteria.
                  </td>
                </tr>
              ) : filteredLogs.map(log => {
                const ac = ACTION_COLOR[log.action] || { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-2)' };
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="log-row-hover">
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

      <style dangerouslySetInnerHTML={{ __html: '.log-row-hover:hover { background: var(--bg-elevated) !important; } th:hover { color: var(--accent); }' }} />
    </div>
  );
}
