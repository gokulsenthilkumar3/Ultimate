import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Edit3, DollarSign } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';
import { handleTabKeyDown } from '../hooks/useHashTab';
import { formatCurrency } from '../utils/userFormatters';
import { localDateKey } from '../lib/metricSeries';
import { finiteObservation, observationDate } from '../utils/projectGoal';
import storage from '../utils/safeLocalStorage';
import { portfolioSnapshotKey, readPortfolioSnapshots, holdingSnapshot, summarizePortfolio } from './PortfolioData';

const ASSET_TYPES = ['Stock', 'ETF', 'Mutual Fund', 'Crypto', 'Gold', 'Real Estate', 'Bond', 'FD', 'Cash', 'Other'];
const ASSET_COLORS = { Stock: '#6366f1', ETF: '#0ea5e9', 'Mutual Fund': '#10b981', Crypto: '#f59e0b', Gold: '#fbbf24', 'Real Estate': '#ec4899', Bond: '#8b5cf6', FD: '#34d399', Cash: '#6b7280', Other: '#94a3b8' };
const EMPTY_PORTFOLIO = Object.freeze([]);
const PORTFOLIO_TABS = ['holdings', 'allocation', 'performance'].map(id => ({ id }));
const EMPTY_FORM = { name: '', symbol: '', type: 'Stock', units: '', buyPrice: '', currentPrice: '', buyDate: '', priceDate: '' };

export default function Portfolio() {
  const toast = useToast();
  const user = useStore(s => s.user);
  const portfolio = useStore(s => s.portfolio) ?? EMPTY_PORTFOLIO;
  const setPortfolio = useStore(s => s.setPortfolio);
  const addHolding = useStore(s => s.addHolding);
  const updateHolding = useStore(s => s.updateHolding);
  const deleteHolding = useStore(s => s.deleteHolding);
  const snapshotKey = portfolioSnapshotKey(user);
  const [snapshotRevision, setSnapshotRevision] = useState(0);
  const snapshots = useMemo(() => {
    // Revision changes only after a confirmed user save.
    void snapshotRevision;
    return readPortfolioSnapshots(storage, snapshotKey);
  }, [snapshotKey, snapshotRevision]);
  const { holdings, totalCost, totalValue, totalDifference } = useMemo(() => summarizePortfolio(portfolio, snapshots), [portfolio, snapshots]);
  const [tab, setTab] = useState('holdings');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const addIdRef = useRef(null);
  const addNameRef = useRef(null);
  const money = value => value === null ? 'Unavailable' : formatCurrency(value, user, { maximumFractionDigits: 2 });
  const allocation = useMemo(() => {
    const grouped = {};
    for (const holding of holdings) {
      if (holding.value !== null && holding.value > 0) grouped[holding.type] = (grouped[holding.type] || 0) + holding.value;
    }
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [holdings]);

  useEffect(() => {
    if (!showAdd) return;
    const timer = globalThis.setTimeout(() => addNameRef.current?.focus(), 0);
    return () => globalThis.clearTimeout(timer);
  }, [showAdd]);

  function normalizeForm(input, previous) {
    const name = String(input.name || '').trim();
    const units = finiteObservation(input.units);
    const buyPrice = finiteObservation(input.buyPrice);
    const currentPrice = input.currentPrice === '' ? buyPrice : finiteObservation(input.currentPrice);
    if (!name || units === null || units <= 0 || units > 1e9 || buyPrice === null || buyPrice <= 0 || buyPrice > 1e12 || currentPrice === null || currentPrice <= 0 || currentPrice > 1e12) {
      toast.error('Enter a name, positive units, and positive prices.');
      return null;
    }
    const priceDate = observationDate(input.priceDate);
    const unchangedUndatedPrice = previous && !holdingSnapshot(previous, snapshots).date
      && currentPrice === finiteObservation(previous.currentPrice) && !input.priceDate;
    if (input.currentPrice !== '' && !unchangedUndatedPrice && (!priceDate || priceDate > localDateKey())) {
      toast.error('Enter the snapshot date for the manual price, no later than today.');
      return null;
    }
    if (input.currentPrice === '' && input.priceDate) {
      toast.error('Enter a manual price for the snapshot date.');
      return null;
    }
    if (input.buyDate && !observationDate(input.buyDate)) {
      toast.error('Enter a valid buy date.');
      return null;
    }
    return {
      name: name.slice(0, 120), symbol: String(input.symbol || '').trim().slice(0, 32).toUpperCase(),
      type: ASSET_TYPES.includes(input.type) ? input.type : 'Other', units, buyPrice, currentPrice,
      buyDate: input.buyDate || '', priceDate,
    };
  }

  function recordSnapshot(holding, date) {
    const next = readPortfolioSnapshots(storage, snapshotKey);
    if (date) next[String(holding.id)] = { price: holding.currentPrice, date, name: holding.name, symbol: holding.symbol || '' };
    else delete next[String(holding.id)];
    try { storage.setItem(snapshotKey, JSON.stringify(next)); }
    catch { toast.error('Holding saved, but its snapshot date could not be retained locally.'); }
    setSnapshotRevision(revision => revision + 1);
  }

  async function persist(action, onSuccess) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await action();
      onSuccess();
    } catch (error) {
      toast.error('Could not save portfolio. ' + (error?.message || 'Try again.'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleAdd() {
    const normalized = normalizeForm(form);
    if (!normalized) return;
    const { priceDate, ...fields } = normalized;
    addIdRef.current ||= Date.now().toString();
    const holding = { ...fields, id: addIdRef.current };
    return persist(() => {
      // A rejected optimistic store save can leave this id in local state.
      if (portfolio.some(entry => String(entry.id) === holding.id)) {
        if (typeof updateHolding === 'function') return updateHolding(holding.id, fields);
        if (typeof setPortfolio === 'function') return setPortfolio(previous => previous.map(entry => String(entry.id) === holding.id ? holding : entry));
        throw new Error('Portfolio saving is unavailable.');
      }
      if (typeof addHolding === 'function') return addHolding(holding);
      if (typeof setPortfolio === 'function') return setPortfolio(previous => [...previous, holding]);
      throw new Error('Portfolio saving is unavailable.');
    }, () => {
      recordSnapshot(holding, priceDate);
      setForm(EMPTY_FORM);
      addIdRef.current = null;
      setShowAdd(false);
      toast.success(holding.name + ' added to portfolio');
    });
  }

  function saveEdit() {
    const normalized = normalizeForm(editForm, portfolio.find(entry => String(entry.id) === String(editId)));
    if (!normalized) return;
    const { priceDate, ...fields } = normalized;
    return persist(() => {
      if (typeof updateHolding === 'function') return updateHolding(editId, fields);
      if (typeof setPortfolio === 'function') return setPortfolio(previous => previous.map(holding => String(holding.id) === String(editId) ? { ...holding, ...fields } : holding));
      throw new Error('Portfolio saving is unavailable.');
    }, () => {
      recordSnapshot({ ...fields, id: editId }, priceDate);
      setEditId(null);
      toast.success('Holding updated');
    });
  }

  function handleDelete(holding) {
    const snapshot = holdingSnapshot(holding, snapshots);
    const original = portfolio.find(entry => String(entry.id) === String(holding.id));
    return persist(() => {
      if (typeof deleteHolding === 'function') return deleteHolding(holding.id);
      if (typeof setPortfolio === 'function') return setPortfolio(previous => previous.filter(entry => String(entry.id) !== String(holding.id)));
      throw new Error('Portfolio saving is unavailable.');
    }, () => {
      recordSnapshot(holding, null);
      toast.info(holding.name + ' removed', 5000, { action: { label: 'Undo', onClick: () => persist(() => {
        if (typeof addHolding === 'function') return addHolding(original);
        if (typeof setPortfolio === 'function') return setPortfolio(previous => [...previous, original]);
        throw new Error('Portfolio saving is unavailable.');
      }, () => { recordSnapshot(original, snapshot.date); toast.success('Holding restored'); }) } });
    });
  }

  function fields(input, change, editing = false) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
      {[
        ['name', 'Asset name', 'text'], ['symbol', 'Ticker', 'text'], ['units', 'Units', 'number'],
        ['buyPrice', 'Buy price', 'number'], ['currentPrice', 'Manual snapshot price', 'number'],
        ['buyDate', 'Buy date', 'date'], ['priceDate', 'Snapshot date', 'date'],
      ].map(([key, label, type]) => <label key={key}>
        {label}
        <input ref={key === 'name' && !editing ? addNameRef : undefined} aria-label={(editing ? 'Holding ' : '') + label.toLowerCase()} type={type} step={type === 'number' ? 'any' : undefined} min={type === 'number' ? '0' : undefined} max={key === 'priceDate' ? localDateKey() : undefined} className="form-input" value={input[key] ?? ''} onChange={event => change(previous => ({ ...previous, [key]: event.target.value }))} disabled={saving} />
      </label>)}
      <label>Asset type<select className="form-input" aria-label={editing ? 'Holding asset type' : 'Asset type'} value={input.type} onChange={event => change(previous => ({ ...previous, type: event.target.value }))} disabled={saving}>
        {ASSET_TYPES.map(type => <option key={type}>{type}</option>)}
      </select></label>
    </div>;
  }

  return <div className="module-page" style={{ padding: '0.5rem 0' }}>
    <div className="section-head">
      <div><p className="label-caps">Investments</p><h2 className="text-display">Portfolio</h2>
        <p className="text-secondary">Prices are manual dated snapshots. Totals combine those snapshots; they are not live market valuations.</p>
        <p className="text-secondary">Snapshot dates are retained on this device only. Undated prices cannot establish gains or returns.</p>
      </div>
      <button className="btn-primary" onClick={() => setShowAdd(open => !open)} aria-expanded={showAdd} aria-controls="portfolio-add-form" disabled={saving}><Plus size={14} /> Add Holding</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', margin: '1rem 0' }}>
      {[['Recorded cost', totalCost], ['Manual snapshot value', totalValue], ['Unrealized difference', totalDifference]].map(([label, value]) => <div key={label} className="glass-card"><p>{label}</p><strong>{money(value)}</strong></div>)}
    </div>
    {totalValue === null && <p className="text-secondary">Snapshot totals are unavailable until every holding has a valid dated manual price.</p>}
    <div role="tablist" aria-label="Portfolio views" onKeyDown={event => handleTabKeyDown(event, { tabs: PORTFOLIO_TABS, activeTab: tab, selectTab: setTab, idPrefix: 'portfolio-tab' })} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
      {PORTFOLIO_TABS.map(({ id }) => <button key={id} id={'portfolio-tab-' + id} role="tab" type="button" aria-selected={tab === id} aria-controls={'portfolio-' + id + '-panel'} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} className="btn-secondary">{id[0].toUpperCase() + id.slice(1)}</button>)}
    </div>
    {showAdd && <form id="portfolio-add-form" className="glass-card" onSubmit={event => { event.preventDefault(); handleAdd(); }}>
      <h3>New Holding</h3>{fields(form, setForm)}
      <p className="text-secondary">Leave manual price and snapshot date blank if you only know the purchase cost.</p>
      <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</button>
      <button type="submit" className="btn-primary" disabled={saving} aria-busy={saving}>{saving ? 'Saving…' : 'Add'}</button>
    </form>}
    {tab === 'holdings' && <div id="portfolio-holdings-panel" role="tabpanel" aria-labelledby="portfolio-tab-holdings" className="glass-card" style={{ overflowX: 'auto' }}>
      {!holdings.length ? <EmptyState icon={DollarSign} title="No Holdings" description="Add your first investment to start tracking your portfolio." ctaLabel="Add Holding" onAction={() => setShowAdd(true)} /> : <table aria-label="Investment holdings" style={{ width: '100%' }}>
        <thead><tr>{['Asset', 'Type', 'Units', 'Buy price', 'Manual price snapshot', 'Recorded cost', 'Snapshot value', 'Unrealized difference', 'Actions'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{holdings.map(holding => <tr key={holding.id}>
          {String(editId) === String(holding.id) ? <td colSpan={9}>
            <form onSubmit={event => { event.preventDefault(); saveEdit(); }}>{fields(editForm, setEditForm, true)}
              <button className="btn-primary" type="submit" disabled={saving} aria-busy={saving}>Save holding</button>
              <button className="btn-secondary" type="button" disabled={saving} onClick={() => setEditId(null)}>Cancel editing</button>
            </form>
          </td> : <>
            <td>{holding.name}<small style={{ display: 'block' }}>{holding.symbol}</small></td><td>{holding.type}</td><td>{holding.units}</td><td>{money(finiteObservation(holding.buyPrice))}</td>
            <td>{money(holding.snapshot.price)}<small style={{ display: 'block' }}>{holding.snapshot.date ? 'As of ' + holding.snapshot.date : 'Undated; verify manually'}</small></td>
            <td>{money(holding.cost)}</td><td>{money(holding.value)}</td><td>{money(holding.difference)}</td>
            <td><button disabled={saving} onClick={() => { setEditId(holding.id); setEditForm({ ...EMPTY_FORM, ...portfolio.find(entry => String(entry.id) === String(holding.id)), priceDate: holding.snapshot.date || '' }); }} aria-label={'Edit ' + holding.name}><Edit3 size={14} /></button>
              <button disabled={saving} onClick={() => handleDelete(holding)} aria-label={'Delete ' + holding.name}><Trash2 size={14} /></button></td>
          </>}
        </tr>)}</tbody>
      </table>}
    </div>}
    {tab === 'allocation' && <div id="portfolio-allocation-panel" role="tabpanel" aria-labelledby="portfolio-tab-allocation" className="glass-card">
      <h3>Allocation by manual snapshot value</h3>
      {totalValue === null || !allocation.length ? <p>Enter dated manual prices for every holding to see allocation.</p> : <ResponsiveContainer width="100%" height={260}>
        <PieChart><Pie data={allocation} dataKey="value" nameKey="name" outerRadius={90} label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}>
          {allocation.map(entry => <Cell key={entry.name} fill={ASSET_COLORS[entry.name] || '#6366f1'} />)}
        </Pie><Tooltip formatter={money} /></PieChart>
      </ResponsiveContainer>}
    </div>}
    {tab === 'performance' && <div id="portfolio-performance-panel" role="tabpanel" aria-labelledby="portfolio-tab-performance" className="glass-card">
      <h3>Performance history unavailable</h3>
      <p>Only the latest manual price snapshot is recorded for each holding. There is no dated valuation and cash-flow history from which to calculate historical returns.</p>
    </div>}
  </div>;
}

