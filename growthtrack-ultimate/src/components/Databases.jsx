import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit3, Check, X, Download, Upload, Search, ChevronUp, ChevronDown, Database, ArrowUpDown, Filter, Copy } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';

// ── Types ──────────────────────────────────────────────────────────────────
const FIELD_TYPES = ['text', 'number', 'date', 'boolean', 'select', 'email', 'url'];

const defaultTable = (name) => ({
  id: Date.now(),
  name,
  fields: [
    { id: 'f1', name: 'Name',   type: 'text',   required: true  },
    { id: 'f2', name: 'Notes',  type: 'text',   required: false },
    { id: 'f3', name: 'Status', type: 'select', options: ['Active', 'Done', 'Archived'], required: false },
    { id: 'f4', name: 'Date',   type: 'date',   required: false },
  ],
  rows: [],
  createdAt: new Date().toISOString(),
});

// ── CSV utilities ─────────────────────────────────────────────────────────
function toCSV(fields, rows) {
  const header = fields.map(f => JSON.stringify(f.name)).join(',');
  const lines  = rows.map(row =>
    fields.map(f => {
      const v = row[f.id] ?? '';
      return typeof v === 'string' ? JSON.stringify(v) : String(v);
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { fields: [], rows: [] };

  // Simple CSV parse (handles quoted commas)
  const parseRow = (line) => {
    const out = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim().replace(/^"|"$/g, ''));
  };

  const headers = parseRow(lines[0]);
  const fields  = headers.map((h, i) => ({ id: `f${i + 1}`, name: h, type: 'text', required: false }));
  const rows    = lines.slice(1).filter(Boolean).map(line => {
    const vals = parseRow(line);
    const row  = { id: Date.now() + Math.random() };
    fields.forEach((f, i) => { row[f.id] = vals[i] || ''; });
    return row;
  });

  return { fields, rows };
}

// ── Cell renderer ─────────────────────────────────────────────────────────
function CellView({ field, value }) {
  if (field.type === 'boolean') {
    return <span style={{ color: value ? '#10b981' : 'var(--text-3)', fontSize: '1rem' }}>{value ? '✓' : '—'}</span>;
  }
  if (field.type === 'url') {
    return value ? <a href={value} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '0.72rem', textDecoration: 'none' }}>🔗 {(value || '').replace(/^https?:\/\//, '').slice(0, 30)}</a> : <span style={{ color: 'var(--text-3)' }}>—</span>;
  }
  if (field.type === 'select') {
    return value ? <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>{value}</span> : <span style={{ color: 'var(--text-3)' }}>—</span>;
  }
  return <span style={{ fontSize: '0.78rem', color: 'var(--text-1)' }}>{value ?? '—'}</span>;
}

function CellEditor({ field, value, onChange, onCommit }) {
  if (field.type === 'boolean') {
    return <input type="checkbox" checked={!!value} onChange={e => { onChange(e.target.checked); onCommit(); }} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />;
  }
  if (field.type === 'select') {
    return (
      <select value={value || ''} onChange={e => { onChange(e.target.value); onCommit(); }} autoFocus style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderRadius: '4px', color: 'var(--text-1)', padding: '2px 4px', fontSize: '0.72rem', outline: 'none' }}>
        <option value="">—</option>
        {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text';
  return (
    <input type={inputType} value={value || ''} onChange={e => onChange(e.target.value)}
      onBlur={onCommit} onKeyDown={e => { if (e.key === 'Enter') onCommit(); }}
      autoFocus style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderRadius: '4px', color: 'var(--text-1)', padding: '2px 4px', fontSize: '0.72rem', width: '100%', outline: 'none', minWidth: '80px' }} />
  );
}

// ── Schema editor modal ────────────────────────────────────────────────────
function SchemaEditor({ table, onSave, onClose }) {
  const [fields, setFields] = useState(table.fields.map(f => ({ ...f })));
  const [tableName, setTableName] = useState(table.name);

  const addField = () => setFields(fs => [...fs, { id: `f${Date.now()}`, name: 'New Field', type: 'text', required: false }]);
  const remove   = (id) => setFields(fs => fs.filter(f => f.id !== id));
  const update   = (id, key, val) => setFields(fs => fs.map(f => f.id === id ? { ...f, [key]: val } : f));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', width: 'min(560px, 96vw)', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <p style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-1)' }}>Edit Schema</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '4px', fontWeight: 700 }}>TABLE NAME</label>
          <input value={tableName} onChange={e => setTableName(e.target.value)} className="form-input" />
        </div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Fields</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {fields.map((f, idx) => (
            <div key={f.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input value={f.name} onChange={e => update(f.id, 'name', e.target.value)} className="form-input" style={{ flex: '1 1 120px' }} placeholder="Field name" />
              <select value={f.type} onChange={e => update(f.id, 'type', e.target.value)} className="form-input" style={{ flex: '0 0 90px', fontSize: '0.72rem' }}>
                {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              {f.type === 'select' && (
                <input placeholder="Options (comma)" value={(f.options || []).join(', ')} onChange={e => update(f.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="form-input" style={{ flex: '1 1 120px', fontSize: '0.68rem' }} />
              )}
              <button onClick={() => update(f.id, 'required', !f.required)} style={{ padding: '3px 6px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 700, background: f.required ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (f.required ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'), color: f.required ? '#f87171' : 'var(--text-3)', cursor: 'pointer' }}>REQ</button>
              <button onClick={() => remove(f.id)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.6)', cursor: 'pointer', padding: '2px' }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <button onClick={addField} style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={12} /> Add Field
        </button>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={onClose} style={{ padding: '6px 14px', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
          <button onClick={() => onSave(tableName, fields)} className="btn-primary" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>Save Schema</button>
        </div>
      </div>
    </div>
  );
}

// ── Main DataTable component ────────────────────────────────────────────────
function DataTable({ table, onUpdate, onDelete }) {
  const toast = useToast();
  const fileRef = useRef();

  const [search,     setSearch]     = useState('');
  const [sortField,  setSortField]  = useState(null);
  const [sortDir,    setSortDir]    = useState('asc');
  const [filterField, setFilterField] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [editCell,   setEditCell]   = useState(null); // { rowId, fieldId }
  const [editVal,    setEditVal]    = useState('');
  const [showSchema, setShowSchema] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRow,     setNewRow]     = useState({});

  const filteredRows = useMemo(() => {
    let rows = [...table.rows];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        Object.values(r).some(v => String(v || '').toLowerCase().includes(q))
      );
    }
    if (filterField !== 'all' && filterValue) {
      rows = rows.filter(r => String(r[filterField] || '').toLowerCase().includes(filterValue.toLowerCase()));
    }
    if (sortField) {
      rows.sort((a, b) => {
        const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [table.rows, search, filterField, filterValue, sortField, sortDir]);

  const toggleSort = (fieldId) => {
    if (sortField === fieldId) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(fieldId); setSortDir('asc'); }
  };

  const commitEdit = useCallback(() => {
    if (!editCell) return;
    const updated = table.rows.map(r => r.id === editCell.rowId ? { ...r, [editCell.fieldId]: editVal } : r);
    onUpdate({ ...table, rows: updated });
    setEditCell(null);
  }, [editCell, editVal, table, onUpdate]);

  const addRow = () => {
    const row = { id: Date.now(), ...newRow };
    const required = table.fields.filter(f => f.required);
    for (const f of required) {
      if (!row[f.id]) { toast.error(`"${f.name}" is required`); return; }
    }
    onUpdate({ ...table, rows: [...table.rows, row] });
    setNewRow({});
    setShowAddRow(false);
    toast.success('Row added');
  };

  const deleteRow = (id) => {
    onUpdate({ ...table, rows: table.rows.filter(r => r.id !== id) });
    toast.info('Row deleted');
  };

  const exportCSV = () => {
    const csv = toCSV(table.fields, table.rows);
    const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `${table.name}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${table.rows.length} rows`);
  };

  const importCSV = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { fields, rows } = parseCSV(ev.target.result);
      if (!fields.length) { toast.error('Empty or invalid CSV'); return; }
      onUpdate({ ...table, fields, rows });
      toast.success(`Imported ${rows.length} rows, ${fields.length} fields`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const copyRow = (row) => {
    const copy = { ...row, id: Date.now() };
    onUpdate({ ...table, rows: [...table.rows, copy] });
    toast.success('Row duplicated');
  };

  const saveSchema = (name, fields) => {
    onUpdate({ ...table, name, fields });
    setShowSchema(false);
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {showSchema && <SchemaEditor table={table} onSave={saveSchema} onClose={() => setShowSchema(false)} />}

      {/* Table header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={15} color="var(--accent)" />
          <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-1)' }}>{table.name}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: '99px' }}>{table.rows.length} rows</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowSchema(true)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: 'var(--accent)', cursor: 'pointer' }}>⚙️ Schema</button>
          <button onClick={exportCSV} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}><Download size={11} /> CSV</button>
          <label style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Upload size={11} /> Import <input type="file" accept=".csv" onChange={importCSV} style={{ display: 'none' }} ref={fileRef} />
          </label>
          <button onClick={() => setShowAddRow(s => !s)} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.68rem' }}><Plus size={11} /> Row</button>
          <button onClick={() => onDelete(table.id)} style={{ padding: '4px 8px', borderRadius: '6px', background: 'none', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', cursor: 'pointer' }}><Trash2 size={11} /></button>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ paddingLeft: '30px', width: '100%' }} className="form-input" />
        </div>
        <select value={filterField} onChange={e => setFilterField(e.target.value)} className="form-input" style={{ flex: '0 0 120px', fontSize: '0.72rem' }}>
          <option value="all">All fields</option>
          {table.fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        {filterField !== 'all' && (
          <input value={filterValue} onChange={e => setFilterValue(e.target.value)} placeholder="Filter value…" className="form-input" style={{ flex: '1 1 150px', fontSize: '0.72rem' }} />
        )}
      </div>

      {/* Add row form */}
      {showAddRow && (
        <div style={{ padding: '0.75rem', marginBottom: '0.5rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '0.5rem' }}>New Row</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {table.fields.map(f => (
              <div key={f.id} style={{ flex: '1 1 140px' }}>
                <label style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '3px', fontWeight: 700 }}>
                  {f.name}{f.required ? ' *' : ''}
                </label>
                {f.type === 'boolean' ? (
                  <input type="checkbox" checked={!!newRow[f.id]} onChange={e => setNewRow(r => ({ ...r, [f.id]: e.target.checked }))} />
                ) : f.type === 'select' ? (
                  <select value={newRow[f.id] || ''} onChange={e => setNewRow(r => ({ ...r, [f.id]: e.target.value }))} className="form-input" style={{ fontSize: '0.72rem' }}>
                    <option value="">—</option>
                    {(f.options || []).map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'}
                    value={newRow[f.id] || ''} onChange={e => setNewRow(r => ({ ...r, [f.id]: e.target.value }))} className="form-input" style={{ fontSize: '0.72rem' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={addRow} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.72rem' }}><Check size={11} /> Add</button>
            <button onClick={() => setShowAddRow(false)} style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
        {table.rows.length === 0 && !showAddRow ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <EmptyState icon={Database} title="No rows yet" description="Click '+ Row' to add your first entry." ctaLabel="Add Row" onAction={() => setShowAddRow(true)} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                {table.fields.map(f => (
                  <th key={f.id} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(f.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {f.name}
                      {sortField === f.id ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ArrowUpDown size={9} style={{ opacity: 0.35 }} />}
                      <span style={{ fontSize: '0.55rem', color: 'var(--text-3)', fontWeight: 500 }}>({f.type})</span>
                      {f.required && <span style={{ color: '#f87171', fontSize: '0.6rem' }}>*</span>}
                    </div>
                  </th>
                ))}
                <th style={{ padding: '0.55rem 0.5rem', width: '56px', color: 'var(--text-3)', fontSize: '0.6rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {table.fields.map(f => (
                    <td key={f.id} style={{ padding: '0.45rem 0.75rem', verticalAlign: 'middle' }} onDoubleClick={() => { setEditCell({ rowId: row.id, fieldId: f.id }); setEditVal(row[f.id] ?? ''); }}>
                      {editCell?.rowId === row.id && editCell?.fieldId === f.id
                        ? <CellEditor field={f} value={editVal} onChange={setEditVal} onCommit={commitEdit} />
                        : <CellView field={f} value={row[f.id]} />
                      }
                    </td>
                  ))}
                  <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => copyRow(row)} title="Duplicate" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px' }}><Copy size={11} /></button>
                    <button onClick={() => deleteRow(row.id)} title="Delete" style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.5)', cursor: 'pointer', padding: '2px' }}><Trash2 size={11} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredRows.length !== table.rows.length && (
        <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px', textAlign: 'right' }}>Showing {filteredRows.length} of {table.rows.length} rows</p>
      )}
    </div>
  );
}

// ── Root Databases component ───────────────────────────────────────────────
export default function Databases() {
  const toast = useToast();
  const tables    = useStore(s => s.databases) || [];
  const setTables = useStore(s => s.setDatabases);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const saveTable = (updated) => {
    const next = tables.map(t => t.id === updated.id ? updated : t);
    if (typeof setTables === 'function') setTables(next);
  };

  const addTable = () => {
    const name = newName.trim() || 'New Table';
    const t = defaultTable(name);
    if (typeof setTables === 'function') setTables([...tables, t]);
    setNewName(''); setShowNew(false);
    toast.success(`📋 "${name}" created`);
  };

  const deleteTable = (id) => {
    if (typeof setTables === 'function') setTables(tables.filter(t => t.id !== id));
    toast.info('Table deleted');
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Data</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Databases</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{tables.length} table{tables.length !== 1 ? 's' : ''} · Sortable, filterable, CSV import/export · Double-click cells to edit</p>
        </div>
        <button onClick={() => setShowNew(s => !s)} className="btn-primary"><Plus size={14} /> New Table</button>
      </div>

      {showNew && (
        <div className="glass-card mb-lg" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Table name…" className="form-input" onKeyDown={e => e.key === 'Enter' && addTable()} />
          <button onClick={addTable} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}><Check size={13} /> Create</button>
          <button onClick={() => setShowNew(false)} style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}><X size={13} /></button>
        </div>
      )}

      {tables.length === 0 ? (
        <EmptyState icon={Database} title="No tables yet" description="Create your first table to start tracking custom data." ctaLabel="New Table" onAction={() => setShowNew(true)} />
      ) : (
        tables.map(table => (
          <DataTable key={table.id} table={table} onUpdate={saveTable} onDelete={deleteTable} />
        ))
      )}
    </div>
  );
}
