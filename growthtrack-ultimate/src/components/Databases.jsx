import React, { useEffect, useState, useMemo } from 'react';
import { Database, Download, RefreshCw, Box, Table, Power, Code, LayoutGrid } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import useStore, { selectFetchInitialData, apiSync } from '../store/useStore';

export default function Databases() {
  const [data, setData] = useState({});
  const [dynamicTables, setDynamicTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTable, setActiveTable] = useState('user_profile');
  const [activeTab, setActiveTab] = useState('Explorer'); // 'Explorer' | 'Insert' | 'SQL'
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM user_profile;');
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlError, setSqlError] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'json'
  const [tableSearch, setTableSearch] = useState('');
  
  // Insert form state
  const [insertForm, setInsertForm] = useState({});
  const [inserting, setInserting] = useState(false);
  
  const fetchInitialData = useStore(selectFetchInitialData);
  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      // Load table data and dynamic table list in parallel
      const [json, tablesRes] = await Promise.all([
        apiSync('/all', 'GET'),
        apiSync('/tables', 'GET').catch(() => null),
      ]);
      setData(json);
      // If the server exposes a /tables endpoint, use it; otherwise fall back to Object.keys
      if (tablesRes?.tables) {
        setDynamicTables(tablesRes.tables);
      }
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Effective table list: prefer dynamic list from server (includes tables without rows),
  // fall back to keys from the data object
  const tables = useMemo(() => {
    const base = dynamicTables.length > 0 ? dynamicTables : Object.keys(data);
    if (!tableSearch.trim()) return base;
    return base.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase()));
  }, [dynamicTables, data, tableSearch]);

  const exportDB = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `growthtrack_db_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Database exported successfully.');
  };

  const runQuery = async () => {
    if (!sqlQuery.trim()) return;

    // CLIENT-SIDE GUARD: only allow SELECT statements
    const trimmed = sqlQuery.trim().replace(/\/\*.*?\*\//gs, '').replace(/--[^\n]*/g, '').trim();
    const firstWord = trimmed.split(/\s+/)[0].toUpperCase();
    const FORBIDDEN = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'REPLACE', 'EXEC'];
    if (FORBIDDEN.includes(firstWord)) {
      setSqlError(`⛔ Only SELECT queries are allowed in the SQL console. Use the INSERT tab to add records.`);
      return;
    }

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
    setInsertForm({});
  };

  const getTableColumns = () => {
    if (!data[activeTable] || !Array.isArray(data[activeTable]) || data[activeTable].length === 0) return [];
    return Object.keys(data[activeTable][0]);
  };

  const handleInsert = async (e) => {
    e.preventDefault();
    const columns = Object.keys(insertForm).filter(k => insertForm[k] !== undefined && insertForm[k] !== '');
    if (columns.length === 0) {
      toast.error('Form is empty.');
      return;
    }

    // SECURITY: use dedicated /api/insert endpoint with parameterised row object
    // Never construct raw SQL on the client
    const row = Object.fromEntries(columns.map(c => [c, insertForm[c]]));

    setInserting(true);
    try {
      const result = await apiSync('/insert', 'POST', { table: activeTable, row });
      if (result.success) {
        toast.success(`Record inserted into ${activeTable}`);
        setInsertForm({});
        loadData();
      } else {
        toast.error(`Insert failed: ${result.error}`);
      }
    } catch (err) {
      toast.error(err.message);
    }
    setInserting(false);
  };

  const insertTemplate = () => {
    setSqlQuery(`SELECT * FROM ${activeTable} LIMIT 10;`);
    setActiveTab('SQL');
  };

  const updateTemplate = () => {
    setSqlQuery(`SELECT * FROM ${activeTable} WHERE id = 1;`);
    setActiveTab('SQL');
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
             <button className={`btn-sm ${activeTab === 'Insert' ? 'active' : ''}`} onClick={() => setActiveTab('Insert')} style={{ background: activeTab === 'Insert' ? 'var(--accent)' : 'transparent', color: activeTab === 'Insert' ? '#fff' : 'var(--text-2)' }}>INSERT</button>
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
          <h3 className="label-caps" style={{ color: 'var(--text-2)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={14} /> AVAILABLE TABLES
            <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 400 }}>{tables.length} tables</span>
          </h3>
          <input
            type="text"
            placeholder="Filter tables..."
            value={tableSearch}
            onChange={e => setTableSearch(e.target.value)}
            className="form-input"
            style={{ width: '100%', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '60vh', overflowY: 'auto' }}>
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
        ) : activeTab === 'Insert' ? (
          <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Box size={20} color="var(--accent)" />
                Insert into: {activeTable}
              </h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
              {getTableColumns().length === 0 ? (
                <p style={{ color: 'var(--text-3)' }}>Cannot infer schema: table is empty.</p>
              ) : (
                <form onSubmit={handleInsert} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {getTableColumns().map(col => {
                      if (col.toLowerCase() === 'id') return null; // Skip primary key typically
                      return (
                        <div key={col}>
                          <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>{col}</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={insertForm[col] || ''} 
                            onChange={(e) => setInsertForm({ ...insertForm, [col]: e.target.value })}
                            placeholder={`Enter ${col}...`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <button type="submit" disabled={inserting} className="btn-primary">
                      {inserting ? 'Inserting...' : 'INSERT RECORD'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '70vh' }}>
            <div className="glass-card" style={{ padding: '1.5rem', flexShrink: 0 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                 <h3 className="label-caps" style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   SQL QUERY CONSOLE (SELECT ONLY)
                 </h3>
                 <div style={{ display: 'flex', gap: '8px' }}>
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
