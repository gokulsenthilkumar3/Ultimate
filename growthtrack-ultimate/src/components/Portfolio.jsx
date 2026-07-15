import React, { useState, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Plus, Trash2, Edit3, Check, X, DollarSign, BarChart2, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';

const ASSET_TYPES = ['Stock', 'ETF', 'Mutual Fund', 'Crypto', 'Gold', 'Real Estate', 'Bond', 'FD', 'Cash', 'Other'];
const ASSET_COLORS = { Stock: '#6366f1', ETF: '#0ea5e9', 'Mutual Fund': '#10b981', Crypto: '#f59e0b', Gold: '#fbbf24', 'Real Estate': '#ec4899', Bond: '#8b5cf6', FD: '#34d399', Cash: '#6b7280', Other: '#94a3b8' };
const CURRENCY = '₹';

const TOOLTIP_STYLE = { background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-1)', backdropFilter: 'blur(12px)', fontSize: '0.8rem' };

function fmt(v, decimals = 0) {
  if (!v || isNaN(v)) return `${CURRENCY}0`;
  if (v >= 10000000) return `${CURRENCY}${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000)   return `${CURRENCY}${(v / 100000).toFixed(2)}L`;
  return `${CURRENCY}${v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// Mini sparkline
function Sparkline({ data, color = '#10b981', width = 80, height = 32 }) {
  if (!data || data.length < 2) return <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '0.65rem' }}>—</div>;
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data.map((v, i) => ({ v, i }))} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Generate simulated price history for an asset (seed-based)
function generateHistory(asset) {
  const seed  = (asset.id || 0) % 100;
  const base  = Number(asset.buyPrice) || 100;
  const pts   = 30;
  const hist  = [base];
  for (let i = 1; i < pts; i++) {
    const rand  = Math.sin(i * seed * 0.7 + seed) * 0.04 + Math.cos(i * 0.3) * 0.02;
    hist.push(Math.max(0.01, hist[i - 1] * (1 + rand)));
  }
  const current = Number(asset.currentPrice) || hist[hist.length - 1];
  hist[pts - 1] = current;
  return hist;
}

function ROIBadge({ roi }) {
  const pos   = roi >= 0;
  const color = pos ? '#10b981' : '#f87171';
  const bg    = pos ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '99px', background: bg, color, fontWeight: 800, fontSize: '0.72rem' }}>
      {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(roi).toFixed(2)}%
    </span>
  );
}

export default function Portfolio() {
  const toast = useToast();
  const portfolio     = useStore(s => s.portfolio) || [];
  const setPortfolio  = useStore(s => s.setPortfolio);
  const updateHolding = useStore(s => s.updateHolding);
  const deleteHolding = useStore(s => s.deleteHolding);
  const addHolding    = useStore(s => s.addHolding);

  const [tab,      setTab]      = useState('holdings');
  const [showAdd,  setShowAdd]  = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [editForm, setEditForm] = useState({});
  const [form,     setForm]     = useState({ name: '', symbol: '', type: 'Stock', units: '', buyPrice: '', currentPrice: '', buyDate: '' });
  const [refreshing, setRefreshing] = useState(false);

  // Derived metrics
  const holdings = useMemo(() => (portfolio || []).map(h => {
    const invested = Number(h.units) * Number(h.buyPrice);
    const current  = Number(h.units) * Number(h.currentPrice || h.buyPrice);
    const gain     = current - invested;
    const roi      = invested > 0 ? (gain / invested) * 100 : 0;
    const history  = generateHistory(h);
    return { ...h, invested, current, gain, roi, history };
  }), [portfolio]);

  const totalInvested = useMemo(() => holdings.reduce((s, h) => s + h.invested, 0), [holdings]);
  const totalCurrent  = useMemo(() => holdings.reduce((s, h) => s + h.current, 0), [holdings]);
  const totalGain     = totalCurrent - totalInvested;
  const totalROI      = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const byType = useMemo(() => {
    const map = {};
    holdings.forEach(h => {
      if (!map[h.type]) map[h.type] = 0;
      map[h.type] += h.current;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [holdings]);

  const portfolioHistory = useMemo(() => {
    if (holdings.length === 0) return [];
    const len = 30;
    return Array.from({ length: len }, (_, idx) => {
      const total = holdings.reduce((sum, h) => sum + (h.history[Math.floor((idx / len) * h.history.length)] || 0) * Number(h.units), 0);
      return { day: idx + 1, total: Math.round(total) };
    });
  }, [holdings]);

  const handleAdd = () => {
    if (!form.name || !form.units || !form.buyPrice) { toast.error('Name, units, and buy price are required.'); return; }
    const newHolding = { ...form, id: Date.now(), units: Number(form.units), buyPrice: Number(form.buyPrice), currentPrice: Number(form.currentPrice || form.buyPrice) };
    if (typeof addHolding === 'function') addHolding(newHolding);
    else if (typeof setPortfolio === 'function') setPortfolio([...(portfolio || []), newHolding]);
    setForm({ name: '', symbol: '', type: 'Stock', units: '', buyPrice: '', currentPrice: '', buyDate: '' });
    setShowAdd(false);
    toast.success(`${newHolding.name} added to portfolio`);
  };

  const handleDelete = (id) => {
    const h = holdings.find(x => x.id === id);
    if (typeof deleteHolding === 'function') deleteHolding(id);
    else if (typeof setPortfolio === 'function') setPortfolio((portfolio || []).filter(x => x.id !== id));
    if (h) toast.info(`${h.name} removed`, 5000, { action: { label: 'Undo', onClick: () => { if (typeof addHolding === 'function') addHolding(h); } } });
  };

  const saveEdit = () => {
    if (typeof updateHolding === 'function') updateHolding(editId, editForm);
    else if (typeof setPortfolio === 'function') setPortfolio((portfolio || []).map(h => h.id === editId ? { ...h, ...editForm } : h));
    setEditId(null); toast.success('Holding updated');
  };

  const simulateRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      // Slightly randomize current prices to simulate market update
      if (typeof setPortfolio === 'function') {
        setPortfolio((portfolio || []).map(h => ({
          ...h,
          currentPrice: +(Number(h.currentPrice || h.buyPrice) * (1 + (Math.random() - 0.48) * 0.04)).toFixed(2)
        })));
      }
      setRefreshing(false);
      toast.success('Prices refreshed (simulated)');
    }, 800);
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Investments</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Portfolio</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{holdings.length} holdings tracked</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={simulateRefresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button onClick={() => setShowAdd(s => !s)} className="btn-primary"><Plus size={14} /> Add Holding</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Invested', val: fmt(totalInvested), color: 'var(--text-1)' },
          { label: 'Current Value',  val: fmt(totalCurrent),  color: 'var(--accent)' },
          { label: 'Total Gain',     val: fmt(Math.abs(totalGain)), color: totalGain >= 0 ? '#10b981' : '#f87171' },
          { label: 'Overall ROI',    val: `${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(2)}%`, color: totalROI >= 0 ? '#10b981' : '#f87171' },
        ].map(m => (
          <div key={m.label} className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: m.color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>{m.val}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {['holdings', 'allocation', 'performance'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: tab === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: tab === t ? '#000' : 'var(--text-3)', border: 'none', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass-card mb-lg">
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>New Holding</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            {[
              { key: 'name',         placeholder: 'Asset name *' },
              { key: 'symbol',       placeholder: 'Ticker (e.g. RELIANCE)' },
              { key: 'units',        placeholder: 'Units / Qty *', type: 'number' },
              { key: 'buyPrice',     placeholder: 'Buy price *', type: 'number' },
              { key: 'currentPrice', placeholder: 'Current price', type: 'number' },
            ].map(f => (
              <input key={f.key} type={f.type || 'text'} placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm(ff => ({ ...ff, [f.key]: e.target.value }))}
                className="form-input" />
            ))}
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="form-input">
              {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <div>
              <label style={{ fontSize: '0.62rem', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Buy Date</label>
              <input type="date" value={form.buyDate} onChange={e => setForm(f => ({ ...f, buyDate: e.target.value }))} className="form-input" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
            <button onClick={handleAdd} className="btn-primary">Add</button>
          </div>
        </div>
      )}

      {/* Holdings tab */}
      {tab === 'holdings' && (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          {holdings.length === 0 ? (
            <EmptyState icon={DollarSign} title="No Holdings" description="Add your first investment to start tracking your portfolio." ctaLabel="Add Holding" onAction={() => setShowAdd(true)} />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Asset', 'Type', 'Units', 'Buy Price', 'Current', 'Invested', 'Value', 'Gain', 'ROI', 'Trend', ''].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: h === 'Asset' || h === 'Type' ? 'left' : 'center', color: 'var(--text-3)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {editId === h.id ? (
                      <td colSpan={11} style={{ padding: '0.75rem 0.6rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" className="form-input" style={{ width: '140px' }} />
                          <input value={editForm.units || ''} onChange={e => setEditForm(f => ({ ...f, units: e.target.value }))} placeholder="Units" type="number" className="form-input" style={{ width: '80px' }} />
                          <input value={editForm.buyPrice || ''} onChange={e => setEditForm(f => ({ ...f, buyPrice: e.target.value }))} placeholder="Buy price" type="number" className="form-input" style={{ width: '100px' }} />
                          <input value={editForm.currentPrice || ''} onChange={e => setEditForm(f => ({ ...f, currentPrice: e.target.value }))} placeholder="Current" type="number" className="form-input" style={{ width: '100px' }} />
                          <select value={editForm.type || 'Stock'} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className="form-input">
                            {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <button onClick={saveEdit} className="btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}><Check size={12} /></button>
                          <button onClick={() => setEditId(null)} style={{ padding: '0.4rem 0.75rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}><X size={12} /></button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td style={{ padding: '0.6rem 0.6rem', fontWeight: 700 }}>
                          <div>{h.name}</div>
                          {h.symbol && <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>{h.symbol}</div>}
                        </td>
                        <td style={{ padding: '0.6rem 0.6rem' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700, background: `${ASSET_COLORS[h.type] || '#6366f1'}20`, color: ASSET_COLORS[h.type] || '#6366f1' }}>{h.type}</span>
                        </td>
                        <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center', fontFamily: 'monospace' }}>{h.units}</td>
                        <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center', fontFamily: 'monospace' }}>{fmt(h.buyPrice, 2)}</td>
                        <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(h.currentPrice || h.buyPrice, 2)}</td>
                        <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center', fontFamily: 'monospace' }}>{fmt(h.invested)}</td>
                        <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>{fmt(h.current)}</td>
                        <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center', fontFamily: 'monospace', color: h.gain >= 0 ? '#10b981' : '#f87171' }}>
                          {h.gain >= 0 ? '+' : ''}{fmt(Math.abs(h.gain))}
                        </td>
                        <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center' }}>
                          <ROIBadge roi={h.roi} />
                        </td>
                        <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center' }}>
                          <Sparkline data={h.history} color={h.roi >= 0 ? '#10b981' : '#f87171'} />
                        </td>
                        <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button onClick={() => { setEditId(h.id); setEditForm({ ...h }); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '3px' }}><Edit3 size={12} /></button>
                            <button onClick={() => handleDelete(h.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '3px' }}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', fontWeight: 900 }}>
                  <td colSpan={5} style={{ padding: '0.65rem 0.6rem', color: 'var(--text-2)', fontSize: '0.75rem' }}>TOTAL ({holdings.length} holdings)</td>
                  <td style={{ padding: '0.65rem 0.6rem', textAlign: 'center', fontFamily: 'monospace' }}>{fmt(totalInvested)}</td>
                  <td style={{ padding: '0.65rem 0.6rem', textAlign: 'center', fontFamily: 'monospace', color: 'var(--accent)' }}>{fmt(totalCurrent)}</td>
                  <td style={{ padding: '0.65rem 0.6rem', textAlign: 'center', color: totalGain >= 0 ? '#10b981' : '#f87171', fontFamily: 'monospace' }}>
                    {totalGain >= 0 ? '+' : ''}{fmt(Math.abs(totalGain))}
                  </td>
                  <td style={{ padding: '0.65rem 0.6rem', textAlign: 'center' }}><ROIBadge roi={totalROI} /></td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Allocation tab */}
      {tab === 'allocation' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div className="glass-card">
            <span className="card-title">Allocation by Type</span>
            {byType.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: '1rem' }}>No holdings yet.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {byType.map((entry, idx) => <Cell key={idx} fill={ASSET_COLORS[entry.name] || '#6366f1'} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="glass-card">
            <span className="card-title">By Asset</span>
            {holdings.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: '1rem' }}>No holdings yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {[...holdings].sort((a, b) => b.current - a.current).map(h => (
                  <div key={h.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{h.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>{totalCurrent > 0 ? ((h.current / totalCurrent) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                      <div style={{ height: '100%', width: `${totalCurrent > 0 ? (h.current / totalCurrent) * 100 : 0}%`, background: ASSET_COLORS[h.type] || '#6366f1', borderRadius: '99px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance tab */}
      {tab === 'performance' && (
        <div className="glass-card">
          <span className="card-title">Estimated Portfolio Value — Last 30 Days</span>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Simulated based on buy prices and current values.</p>
          {portfolioHistory.length < 2 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', padding: '2rem 0', textAlign: 'center' }}>Add at least one holding to see performance.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={portfolioHistory} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="gPort" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} label={{ value: 'Day', position: 'insideBottom', offset: -4, fontSize: 10, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} width={72} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmt(v), 'Portfolio Value']} />
                <Area type="monotone" dataKey="total" stroke="var(--accent)" fill="url(#gPort)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
