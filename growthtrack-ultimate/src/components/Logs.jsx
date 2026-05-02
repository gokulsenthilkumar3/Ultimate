import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Search, Filter, ArrowUpDown, Clock, Globe, User, Info, Terminal } from 'lucide-react';
import PageHeader from './ui/PageHeader';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [filterTable, setFilterTable] = useState('All');

  useEffect(() => {
    fetch('http://localhost:3001/api/logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch logs:', err);
        setLoading(false);
      });
  }, []);

  const tables = useMemo(() => {
    const t = ['All', ...new Set(logs.map(l => l.table_name))];
    return t;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        const matchesSearch = 
          log.action?.toLowerCase().includes(search.toLowerCase()) ||
          log.table_name?.toLowerCase().includes(search.toLowerCase()) ||
          log.details?.toLowerCase().includes(search.toLowerCase()) ||
          log.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
          log.actor_ip?.toLowerCase().includes(search.toLowerCase());
        
        const matchesTable = filterTable === 'All' || log.table_name === filterTable;
        
        return matchesSearch && matchesTable;
      })
      .sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [logs, search, sortConfig, filterTable]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
      <PageHeader
        accent="Security & Audit"
        icon={<Shield size={24} />}
        title="System Logs"
        subtitle="Real-time audit trail of all database mutations and system actions."
      />

      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input 
              type="text" 
              placeholder="Search by action, table, IP or actor..." 
              className="form-input" 
              style={{ paddingLeft: '36px' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-3)' }} />
            <select 
              className="form-input" 
              style={{ width: 'auto' }}
              value={filterTable}
              onChange={e => setFilterTable(e.target.value)}
            >
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                <th onClick={() => requestSort('timestamp')} style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} /> Time <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '1rem' }}>Actor</th>
                <th style={{ padding: '1rem' }}><Globe size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> IP</th>
                <th style={{ padding: '1rem' }}>Action</th>
                <th style={{ padding: '1rem' }}>Target Table</th>
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
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="log-row-hover">
                    <td style={{ padding: '1rem', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{log.actor_name || 'Unknown'}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{log.actor_email || 'no-email'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                      {log.actor_ip || '127.0.0.1'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800,
                        background: log.action === 'INSERT' ? 'rgba(52,211,153,0.1)' : log.action === 'DELETE' ? 'rgba(248,113,113,0.1)' : 'rgba(96,165,250,0.1)',
                        color: log.action === 'INSERT' ? 'var(--success)' : log.action === 'DELETE' ? 'var(--danger)' : 'var(--info)'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-2)' }}>
                      <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{log.table_name}</span>
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '300px' }}>
                      <div style={{ 
                        fontSize: '0.75rem', color: 'var(--text-3)', 
                        background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }} title={log.details}>
                        {log.details || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .log-row-hover:hover { background: var(--bg-elevated) !important; }
        th:hover { color: var(--accent); }
      `}} />
    </div>
  );
}
