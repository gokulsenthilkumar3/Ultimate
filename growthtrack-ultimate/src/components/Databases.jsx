import React, { useEffect, useState } from 'react';
import { Database, Download, RefreshCw, Box, Table, Power, Code, LayoutGrid } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import useStore, { selectFetchInitialData, apiSync } from '../store/useStore';

export default function Databases() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTable, setActiveTable] = useState('user_profile');
  const [activeTab, setActiveTab] = useState('Explorer'); // 'Explorer' | 'SQL'
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM user_profile;');
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlError, setSqlError] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'json'
  const fetchInitialData = useStore(selectFetchInitialData);
  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const json = await apiSync('/all', 'GET');
      setData(json);
      if (!Object.keys(json).includes(activeTable) && Object.keys(json).length > 0) {
         setActiveTable(Object.keys(json)[0]);
      }
    } catch (err) {
      toast.error('Failed to connect to database nodes.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const exportDB = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `growthtrack_db_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Database exported successfully.');
  };

  const tables = Object.keys(data);

  const runQuery = async () => {
    if (!sqlQuery.trim()) return;
    setIsQuerying(true);
    setSqlError(null);
    setSqlResult(null);
    try {
      const result = await apiSync('/query', 'POST', { query: sqlQuery });
      if (result.success) {
        setSqlResult(result.data);
      } else {
        setSqlError(result.error);
      }
    } catch (err) {
      setSqlError(err.message);
    }
    setIsQuerying(false);
  };

  const handleTableClick = (table) => {
    setActiveTable(table);
    if (activeTab === 'SQL') {
      setSqlQuery(`SELECT * FROM ${table};`);
      setSqlResult(null);
      setSqlError(null);
    }
  };

  const insertTemplate = () => {
    setSqlQuery(`INSERT INTO ${activeTable} (column1, column2) VALUES ('value1', 'value2');`);
  };

  const updateTemplate = () => {
    setSqlQuery(`UPDATE ${activeTable} SET column1 = 'new_value' WHERE id = 1;`);
  };

  const renderResultTable = () => {
    if (!sqlResult) return null;
    if (!Array.isArray(sqlResult) || sqlResult.length === 0) {
      return <p style={{ color: 'var(--text-2)' }}>No rows returned or non-tabular result.</p>;
    }
    
    // For scalar results from RUN (like UPDATE/INSERT)
    if (sqlResult && typeof sqlResult === 'object' && !Array.isArray(sqlResult) && sqlResult.changes !== undefined) {
      return (
         <div style={{ color: 'var(--success)', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
            <p style={{ fontWeight: 800 }}>Query Executed Successfully</p>
            <p>Changes: {sqlResult.changes} | Last Insert Row ID: {sqlResult.lastInsertRowid}</p>
         </div>
      );
    }

    const columns = Object.keys(sqlResult[0]);

    return (
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              {columns.map(col => (
                <th key={col} style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--accent)', fontWeight: 800 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sqlResult.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {columns.map(col => (
                  <td key={col} style={{ padding: '0.75rem', color: 'var(--text-1)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(row[col])}>
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>System Architecture</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Database Explorer</h2>
          <p className="text-secondary">Direct read-only access to all underlying SQLite data nodes and raw compilation.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '8px', padding: '4px' }}>
             <button className={`btn-sm ${activeTab === 'Explorer' ? 'active' : ''}`} onClick={() => setActiveTab('Explorer')} style={{ background: activeTab === 'Explorer' ? 'var(--accent)' : 'transparent', color: activeTab === 'Explorer' ? '#fff' : 'var(--text-2)' }}>EXPLORER</button>
             <button className={`btn-sm ${activeTab === 'SQL' ? 'active' : ''}`} onClick={() => setActiveTab('SQL')} style={{ background: activeTab === 'SQL' ? 'var(--accent)' : 'transparent', color: activeTab === 'SQL' ? '#fff' : 'var(--text-2)' }}>COMPILER</button>
          </div>
          <button onClick={loadData} className="btn-ghost" disabled={loading} title="Refresh Table List">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button 
            onClick={async () => {
              await fetchInitialData();
              toast.success('App state synchronized with DB.');
            }} 
            className="btn-ghost" 
            style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Power size={16} /> SYNC APP
          </button>
          <button onClick={exportDB} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> EXPORT
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }}>
        {/* Left Sidebar - Table List */}
        <div className="glass-card" style={{ padding: '1rem', height: 'fit-content' }}>
          <h3 className="label-caps" style={{ color: 'var(--text-2)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={14} /> AVAILABLE TABLES
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tables.map(table => (
              <button
                key={table}
                onClick={() => handleTableClick(table)}
                style={{
                  padding: '0.75rem 1rem',
                  background: activeTable === table ? 'var(--accent-gradient)' : 'transparent',
                  color: activeTable === table ? 'white' : 'var(--text-1)',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: activeTable === table ? 800 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: '0.2s'
                }}
              >
                <Table size={16} />
                {table}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        {activeTab === 'Explorer' ? (
          <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Box size={20} color="var(--accent)" />
                Table: {activeTable}
              </h3>
              <span className="label-caps" style={{ color: 'var(--text-3)' }}>
                {Array.isArray(data[activeTable]) ? `${data[activeTable].length} records` : 'Singleton Document'}
              </span>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-dark)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spin-ring" /></div>
              ) : (
                <pre style={{ 
                  margin: 0, 
                  color: '#10b981', 
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {JSON.stringify(data[activeTable], null, 2)}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '70vh' }}>
            <div className="glass-card" style={{ padding: '1.5rem', flexShrink: 0 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                 <h3 className="label-caps" style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   SQL QUERY CONSOLE
                 </h3>
                 <div style={{ display: 'flex', gap: '8px' }}>
                   <button onClick={insertTemplate} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>+ INSERT</button>
                   <button onClick={updateTemplate} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>~ UPDATE</button>
                 </div>
               </div>
               <textarea 
                 value={sqlQuery}
                 onChange={(e) => setSqlQuery(e.target.value)}
                 className="form-input"
                 style={{ width: '100%', height: '120px', fontFamily: '"JetBrains Mono", monospace', fontSize: '1rem', padding: '1rem' }}
                 placeholder="SELECT * FROM user_profile..."
               />
               <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                 <button onClick={runQuery} disabled={isQuerying} className="btn-primary">
                   {isQuerying ? 'EXECUTING...' : 'RUN QUERY'}
                 </button>
               </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                 <h3 className="label-caps" style={{ color: 'var(--text-2)' }}>
                   OUTPUT {Array.isArray(sqlResult) && `(${sqlResult.length} items)`}
                 </h3>
                 {sqlResult && (
                   <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '6px', padding: '2px' }}>
                      <button onClick={() => setViewMode('table')} className="btn-ghost" style={{ padding: '4px 8px', background: viewMode === 'table' ? 'var(--accent)' : 'transparent', color: viewMode === 'table' ? '#fff' : 'var(--text-2)' }}>
                        <LayoutGrid size={14} />
                      </button>
                      <button onClick={() => setViewMode('json')} className="btn-ghost" style={{ padding: '4px 8px', background: viewMode === 'json' ? 'var(--accent)' : 'transparent', color: viewMode === 'json' ? '#fff' : 'var(--text-2)' }}>
                        <Code size={14} />
                      </button>
                   </div>
                 )}
               </div>
               <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-dark)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' }}>
                 {sqlError ? (
                   <pre style={{ color: '#ef4444', margin: 0, fontFamily: '"JetBrains Mono", monospace' }}>[ERROR] {sqlError}</pre>
                 ) : sqlResult ? (
                   viewMode === 'table' ? renderResultTable() : (
                     <pre style={{ color: '#10b981', margin: 0, fontFamily: '"JetBrains Mono", monospace', fontSize: '0.85rem' }}>
                       {JSON.stringify(sqlResult, null, 2)}
                     </pre>
                   )
                 ) : (
                   <p style={{ color: 'var(--text-3)', fontStyle: 'italic', margin: 0 }}>Awaiting execution...</p>
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
