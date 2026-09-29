import React, { useState, useMemo, useRef } from 'react';
import { ShoppingCart, Plus, Trash2, Check, Tag, Star, AlertTriangle, ArrowDown, Search, Pencil, PackageCheck, Truck, Clock3, Upload, Link2, TrendingUp, Info } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';
import { formatCurrency, formatDate, getCurrencySymbol } from '../utils/userFormatters';
import { financeToday } from '../utils/financeModel';
import { shoppingEstimate } from '../store/libraryActions';
import { previewShoppingCsv } from '../utils/shoppingImport';

const CATEGORIES = ['Groceries', 'Electronics', 'Clothing', 'Health', 'Books', 'Home', 'Fitness', 'Food', 'Other'];
const PRIORITIES = ['high', 'medium', 'low'];
const EMPTY_SHOPPING = Object.freeze([]);

const PRIORITY_COLORS = {
  high:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   text: '#f87171' },
  medium: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  text: '#fbbf24' },
  low:    { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)',  text: '#9ca3af' },
};

const PURCHASE_STAGES = ['future', 'ordered', 'arriving', 'purchased'];
const DELIVERY_SPEEDS = ['fast', 'standard', 'slow'];
const STORE_GUIDES = [
  { name: 'Amazon', note: 'Amazon Business offers downloadable order, shipment, refund and savings reports. Personal accounts may only expose order pages or invoices; availability varies.', steps: ['Open Your Orders or Amazon Business Analytics.', 'Choose an order report and date range if the download option is available.', 'Download CSV, or use the GrowthTrack template for a manual export.'] },
  { name: 'Flipkart', note: 'Consumer accounts commonly provide invoices per order rather than one universal CSV. Seller APIs are not consumer-order sync.', steps: ['Open My Orders and select the required order.', 'Download the official invoice/order details where available.', 'Enter manually or copy rows into the GrowthTrack CSV template.'] },
  { name: 'Tata Neu / BigBasket', note: 'Export availability depends on account and app version.', steps: ['Open Orders or My Orders.', 'Look for invoice, receipt, or download options.', 'If no CSV exists, use manual entry or the GrowthTrack template.'] },
  { name: 'Zepto / Blinkit / Instamart', note: 'Quick-commerce apps generally expose order history and invoices, not a documented bulk CSV export.', steps: ['Open order history and the relevant receipt/invoice.', 'Record item, amount, order date and delivery status.', 'Use manual entry or combine records in the GrowthTrack CSV template.'] },
];

export default function Shopping() {
  const toast = useToast();
  const user           = useStore(s => s.user);
  const shoppingList  = useStore(s => s.shopping?.items) ?? EMPTY_SHOPPING;
  const addShoppingItem    = useStore(s => s.addShoppingItem);
  const updateShoppingItem = useStore(s => s.updateShoppingItem);
  const deleteShoppingItem = useStore(s => s.deleteShoppingItem);
  const convertShoppingToExpense = useStore(s => s.convertShoppingToExpense);
  const toggleShoppingItem = useStore(s => s.toggleShoppingItem || s.toggleShoppingPurchased);
  const currencySymbol = getCurrencySymbol(user);
  const money = value => formatCurrency(value, user);

  const emptyForm = { name: '', category: 'Other', priority: 'medium', quantity: 1, estimatedCost: '', notes: '', url: '', targetPrice: '', stage: 'future', deliverySpeed: 'standard', neededBy: '', source: 'Manual', orderedAt: '', expectedDelivery: '' };
  const [form, setForm] = useState(emptyForm);
  const [showAdd,   setShowAdd]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [priFilter, setPriFilter] = useState('all');
  const [showDone,  setShowDone]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [priceInput, setPriceInput] = useState({});
  const [expenseForm, setExpenseForm] = useState(null);
  const [stageFilter, setStageFilter] = useState('future');
  const [monthlySaving, setMonthlySaving] = useState('');
  const [showConnectors, setShowConnectors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const draftId = useRef(null);
  const savingRef = useRef(false);

  const runSave = async (operation) => {
    if (savingRef.current) return null;
    savingRef.current = true;
    setSaving(true);
    try { return await operation(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Save failed. Your changes are still here.'); return null; }
    finally { savingRef.current = false; setSaving(false); }
  };

  const doToggle = async (id) => {
    const item = shoppingList.find(entry => entry.id === id);
    if (!item) return;
    const purchased = !item.purchased;
    const saved = await runSave(() => typeof updateShoppingItem === 'function'
      ? updateShoppingItem(id, { purchased, stage: purchased ? 'purchased' : 'future' })
      : toggleShoppingItem(id));
    if (saved) toast.success(purchased ? 'Marked purchased.' : 'Returned to planned purchases.');
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Item name is required.'); return; }
    const item = {
      ...form,
      id: draftId.current ??= crypto.randomUUID(),
      createdAt: financeToday(user),
      estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
      targetPrice:   form.targetPrice   ? Number(form.targetPrice)   : null,
      quantity: Number(form.quantity),
      priceHistory:  [],
      stage: form.stage,
      purchased: form.stage === 'purchased',
    };
    const saved = await runSave(() => addShoppingItem(item));
    if (!saved) return;
    draftId.current = null;
    setForm(emptyForm);
    setShowAdd(false);
    toast.success(`${item.name} added to list`);
  };

  const logPrice = async (id, price) => {
    if (price === '' || price == null) { toast.error('Enter a price.'); return; }
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) { toast.error('Enter a valid non-negative price.'); return; }
    const item = shoppingList.find(x => x.id === id);
    const history = [...(item?.priceHistory || []), { date: financeToday(user), price: p }];
    const saved = await runSave(() => updateShoppingItem(id, { estimatedCost: p, priceHistory: history }));
    if (!saved) return;
    setPriceInput(pp => { const n = { ...pp }; delete n[id]; return n; });
    if (item?.targetPrice && p <= item.targetPrice) {
      toast.success(`🎯 Price target hit! ${item.name} is now ${money(p)} (target: ${money(item.targetPrice)})`);
    } else {
      toast.success(`Price updated: ${money(p)}`);
    }
  };

  const filtered = useMemo(() => {
    let list = shoppingList;
    if (!showDone)        list = list.filter(x => (x.stage || (x.purchased ? 'purchased' : 'future')) !== 'purchased');
    if (stageFilter !== 'all') list = list.filter(x => (x.stage || (x.purchased ? 'purchased' : 'future')) === stageFilter);
    if (catFilter !== 'all') list = list.filter(x => x.category === catFilter);
    if (priFilter !== 'all') list = list.filter(x => x.priority === priFilter);
    if (search.trim())   list = list.filter(x => x.name.toLowerCase().includes(search.toLowerCase()) || (x.notes || '').toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => {
      const pi = ['high', 'medium', 'low'];
      return pi.indexOf(a.priority) - pi.indexOf(b.priority);
    });
  }, [shoppingList, showDone, stageFilter, catFilter, priFilter, search]);

  const stats = useMemo(() => ({
    total:     shoppingList.length,
    pending:   shoppingList.filter(x => !x.purchased).length,
    purchased: shoppingList.filter(x => x.purchased).length,
    totalCost: shoppingList.filter(x => !x.purchased).reduce((s, x) => s + (shoppingEstimate(x) || 0), 0),
    highPri:   shoppingList.filter(x => x.priority === 'high' && !x.purchased).length,
    priceDrop: shoppingList.filter(x => {
      const h = x.priceHistory || [];
      if (h.length < 2) return false;
      return h[h.length - 1].price < h[h.length - 2].price;
    }).length,
    arriving: shoppingList.filter(x => ['ordered', 'arriving'].includes(x.stage)).length,
    futureCost: shoppingList.filter(x => (x.stage || 'future') === 'future').reduce((sum, item) => sum + (shoppingEstimate(item) || 0), 0),
  }), [shoppingList]);

  const savingMonths = Number(monthlySaving) > 0 ? Math.ceil(stats.futureCost / Number(monthlySaving)) : null;
  const priceTrend = useMemo(() => {
    const changes = shoppingList.flatMap(item => {
      const history = item.priceHistory || [];
      if (history.length < 2 || !Number(history[0].price)) return [];
      return [((Number(history[history.length - 1].price) - Number(history[0].price)) / Number(history[0].price)) * 100];
    });
    if (!changes.length) return null;
    return changes.reduce((sum, value) => sum + value, 0) / changes.length;
  }, [shoppingList]);
  const projectedFutureCost = priceTrend == null ? null : stats.futureCost * (1 + Math.max(-50, Math.min(100, priceTrend)) / 100);

  const importOrders = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImportPreview(previewShoppingCsv(await file.text(), shoppingList));
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not read this order CSV.'); }
    event.target.value = '';
  };

  const commitImport = async () => {
    if (!importPreview?.items.length || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    let imported = 0;
    try {
      for (const item of importPreview.items) {
        await addShoppingItem(item);
        imported += 1;
      }
      setImportPreview(null);
      toast.success(`Imported ${imported} order${imported === 1 ? '' : 's'}.`);
    } catch (error) {
      setImportPreview(preview => preview && { ...preview, items: preview.items.slice(imported) });
      toast.error(`${imported} saved; remaining rows were not imported. ${error instanceof Error ? error.message : 'Retry the remaining rows.'}`);
    } finally { savingRef.current = false; setSaving(false); }
  };

  const getPriceDropInfo = (item) => {
    const h = item.priceHistory || [];
    if (h.length < 2) return null;
    const last  = h[h.length - 1].price;
    const prev  = h[h.length - 2].price;
    const delta = last - prev;
    const pct   = prev > 0 ? Math.abs((delta / prev) * 100).toFixed(1) : 0;
    return { dropped: delta < 0, delta, pct };
  };

  return (
    <div className="shopping-workspace">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Shopping</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Shopping List</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{stats.pending} pending · {money(stats.totalCost)} estimated</p>
        </div>
        <div className="shopping-header-actions"><button onClick={() => setShowConnectors(s => !s)} className="btn-ghost"><Link2 size={15} /> Import orders</button><button onClick={() => setShowAdd(s => !s)} className="btn-primary"><Plus size={15} /> Plan purchase</button></div>
      </div>

      {showConnectors && <section className="shopping-connectors" aria-label="Shopping imports">
        <div><Upload size={20}/><span><strong>Import order history</strong><small>Export orders from Amazon, Flipkart, or another store as CSV, then import them locally.</small></span><label className="btn-primary">Choose CSV<input type="file" accept=".csv,text/csv" onChange={importOrders}/></label></div>
        {importPreview && <div role="region" aria-label="Order import preview"><strong>Review before import</strong><p>{importPreview.total} rows · {importPreview.items.length} ready · {importPreview.duplicates} duplicates skipped · {importPreview.errors.length} invalid</p>
          {importPreview.errors.length > 0 && <ul>{importPreview.errors.slice(0, 10).map(error => <li key={error}>{error}</li>)}</ul>}
          {importPreview.items.length > 0 && <ul>{importPreview.items.slice(0, 10).map(item => <li key={item.id}>{item.name} · {item.quantity} × {item.estimatedCost == null ? 'price unknown' : money(item.estimatedCost)}</li>)}</ul>}
          {importPreview.items.length > 10 && <p>And {importPreview.items.length - 10} more rows.</p>}
          <button type="button" className="btn-primary" disabled={saving || !importPreview.items.length} onClick={commitImport}>{saving ? 'Importing…' : `Confirm import of ${importPreview.items.length}`}</button>
          <button type="button" className="btn-ghost" disabled={saving} onClick={() => setImportPreview(null)}>Cancel</button>
          <small>Each confirmed row saves separately. If a save fails, the remaining rows stay here for retry.</small>
        </div>}
        {STORE_GUIDES.map(provider => <details key={provider.name}><summary><Info size={15}/><span><strong>{provider.name}</strong><small>How to import</small></span></summary><p>{provider.note}</p><ol>{provider.steps.map(step => <li key={step}>{step}</li>)}</ol></details>)}
        <p>Direct account sync needs an official provider API and your explicit authorization. GrowthTrack never asks for a retailer password.</p>
      </section>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Future', val: shoppingList.filter(x => (x.stage || 'future') === 'future').length, color: 'var(--accent)' },
          { label: 'Ordered / arriving', val: stats.arriving, color: '#60a5fa' },
          { label: 'Purchased', val: stats.purchased, color: '#10b981' },
          { label: 'High priority', val: stats.highPri, color: '#f87171' },
          { label: 'Price drops', val: stats.priceDrop, color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ textAlign: 'center', padding: '0.85rem' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: '3px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass-card mb-lg">
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>Plan a purchase</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <input placeholder="Item name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} className="form-input" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="form-input">
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} Priority</option>)}
            </select>
            <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} className="form-input" aria-label="Purchase stage">
              {PURCHASE_STAGES.map(stage => <option key={stage} value={stage}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</option>)}
            </select>
            <select value={form.deliverySpeed} onChange={e => setForm(f => ({ ...f, deliverySpeed: e.target.value }))} className="form-input" aria-label="Delivery urgency">
              {DELIVERY_SPEEDS.map(speed => <option key={speed} value={speed}>{speed.charAt(0).toUpperCase() + speed.slice(1)} delivery</option>)}
            </select>
            <label>Quantity<input type="number" min="1" step="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="form-input" /></label>
            <input type="number" min="0" step="any" aria-label={`Estimated unit cost (${currencySymbol})`} placeholder={`Estimated unit cost (${currencySymbol})`} value={form.estimatedCost} onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))} className="form-input" />
            <input type="number" min="0" step="any" aria-label={`Target unit price (${currencySymbol})`} placeholder={`Target unit price (${currencySymbol}) — alert when hit`} value={form.targetPrice} onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))} className="form-input" />
            <input placeholder="URL / Link" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="form-input" />
            <label className="shopping-date-field"><span>Needed by</span><input type="date" value={form.neededBy} onChange={e => setForm(f => ({ ...f, neededBy: e.target.value }))} className="form-input" /></label>
            <input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="form-input" style={{ gridColumn: 'span 2' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button disabled={saving} onClick={() => setShowAdd(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
            <button disabled={saving} onClick={handleAdd} className="btn-primary">{saving ? 'Saving…' : 'Add'}</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="shopping-stage-tabs" role="tablist" aria-label="Purchase timeline">{['future','ordered','arriving','purchased','all'].map(stage => <button key={stage} role="tab" aria-selected={stageFilter === stage} className={stageFilter === stage ? 'active' : ''} onClick={() => { setStageFilter(stage); if (stage === 'purchased') setShowDone(true); }}>{stage === 'future' ? 'Need later' : stage.charAt(0).toUpperCase() + stage.slice(1)}</button>)}</div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="form-input" style={{ paddingLeft: '28px' }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="form-input" style={{ width: 'auto' }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priFilter} onChange={e => setPriFilter(e.target.value)} className="form-input" style={{ width: 'auto' }}>
          <option value="all">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <button onClick={() => setShowDone(s => !s)} style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: showDone ? 'rgba(255,255,255,0.08)' : 'var(--bg-elevated)', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
          {showDone ? 'Hide Done' : 'Show Done'}
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Nothing here" description={shoppingList.length === 0 ? 'Start your shopping list.' : 'No items match your filter.'} ctaLabel={shoppingList.length === 0 ? 'Add Item' : null} onAction={shoppingList.length === 0 ? () => setShowAdd(true) : null} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(item => {
            const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.low;
            const pdi = getPriceDropInfo(item);
            const isEditing = editId === item.id;
            const itemStage = item.stage || (item.purchased ? 'purchased' : 'future');

            return (
              <div key={item.id} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${pc.border}`, overflow: 'hidden', opacity: item.purchased ? 0.55 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1rem' }}>
                  {/* Checkbox */}
                  <button type="button" disabled={saving} aria-label={`${item.purchased ? 'Return' : 'Mark'} ${item.name} ${item.purchased ? 'to planned purchases' : 'purchased'}`} aria-pressed={Boolean(item.purchased)} onClick={() => doToggle(item.id)} style={{
                    minWidth: '44px', minHeight: '44px', borderRadius: '6px', flexShrink: 0, cursor: 'pointer', marginTop: '1px',
                    border: `2px solid ${item.purchased ? '#10b981' : pc.text}`,
                    background: item.purchased ? '#10b981' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                  }}>
                    {item.purchased && <Check size={12} color="#fff" />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="form-input" style={{ fontSize: '0.85rem' }} />
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <input type="number" min="1" step="1" aria-label="Quantity" value={editForm.quantity ?? 1} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Quantity" className="form-input" style={{ width: '100px' }} />
                          <input type="number" min="0" step="any" aria-label="Estimated unit cost" value={editForm.estimatedCost ?? ''} onChange={e => setEditForm(f => ({ ...f, estimatedCost: e.target.value }))} placeholder="Unit cost" className="form-input" style={{ width: '100px' }} />
                          <input type="number" min="0" step="any" aria-label="Target unit price" value={editForm.targetPrice ?? ''} onChange={e => setEditForm(f => ({ ...f, targetPrice: e.target.value }))} placeholder={`Target ${currencySymbol}`} className="form-input" style={{ width: '100px' }} />
                          <select value={editForm.priority || 'medium'} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className="form-input">
                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <select value={editForm.stage || 'future'} onChange={e => setEditForm(f => ({ ...f, stage: e.target.value, purchased: e.target.value === 'purchased' }))} className="form-input">
                            {PURCHASE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                          </select>
                          <select value={editForm.deliverySpeed || 'standard'} onChange={e => setEditForm(f => ({ ...f, deliverySpeed: e.target.value }))} className="form-input">
                            {DELIVERY_SPEEDS.map(speed => <option key={speed} value={speed}>{speed} delivery</option>)}
                          </select>
                          <input value={editForm.url || ''} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} placeholder="URL" className="form-input" />
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button disabled={saving} onClick={async () => { const saved = await runSave(() => updateShoppingItem(item.id, editForm)); if (saved) { setEditId(null); toast.success('Updated.'); } }} className="btn-primary" style={{ padding: '3px 10px', fontSize: '0.72rem' }}><Check size={11} /> {saving ? 'Saving…' : 'Save'}</button>
                          <button disabled={saving} onClick={() => setEditId(null)} style={{ padding: '3px 10px', fontSize: '0.72rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: item.purchased ? 'var(--text-3)' : 'var(--text-1)', textDecoration: item.purchased ? 'line-through' : 'none' }}>{item.name}</p>
                          <span style={{ padding: '1px 7px', borderRadius: '99px', fontSize: '0.62rem', fontWeight: 800, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.priority}</span>
                          <span className={`shopping-stage shopping-stage--${itemStage}`}>{itemStage}</span>
                          {item.category && <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{item.category}</span>}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                          {item.estimatedCost != null && <span style={{ fontWeight: 700, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{item.quantity ?? 1} × {money(item.estimatedCost)} = {money(shoppingEstimate(item) ?? 0)}</span>}
                          {item.targetPrice && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}><Star size={10} /> Target: {money(item.targetPrice)}</span>}
                          {pdi && pdi.dropped && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}><ArrowDown size={10} /> {pdi.pct}% price drop!</span>}
                          {item.targetPrice && item.estimatedCost && Number(item.estimatedCost) <= Number(item.targetPrice) && <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}><AlertTriangle size={10} /> Target hit!</span>}
                          {item.deliverySpeed && <span className="shopping-delivery">{item.deliverySpeed === 'fast' ? <Truck size={11}/> : <Clock3 size={11}/>} {item.deliverySpeed} delivery</span>}
                          {item.expectedDelivery && <span>Arrives {formatDate(item.expectedDelivery, user)}</span>}
                          {item.source && item.source !== 'Manual' && <span>Imported from {item.source}</span>}
                          {item.notes && <span style={{ color: 'var(--text-3)' }}>— {item.notes}</span>}
                          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: '0.65rem' }}>View link</a>}
                        </div>

                        {/* Price drop log */}
                        {!item.purchased && (
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem' }}>
                            <input type="number" min="0" step="any" aria-label={`Log new unit price for ${item.name}`} placeholder={`Log new price ${currencySymbol}`} value={priceInput[item.id] ?? ''}
                              onChange={e => setPriceInput(pp => ({ ...pp, [item.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && logPrice(item.id, priceInput[item.id])}
                              style={{ width: '130px', padding: '3px 8px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-1)', outline: 'none' }}
                            />
                            {priceInput[item.id] !== undefined && priceInput[item.id] !== '' && <button disabled={saving} onClick={() => logPrice(item.id, priceInput[item.id])} style={{ padding: '3px 8px', fontSize: '0.65rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '6px', cursor: 'pointer', color: '#34d399', fontWeight: 700 }}><Check size={10} /> Log</button>}
                          </div>
                        )}

                        {item.purchased && !item.expenseId && (
                          expenseForm?.id === item.id ? <div className="shopping-expense-form" role="group" aria-label={`Record expense for ${item.name}`}>
                            <p>Confirm the actual total paid. This creates an expense in Finance.</p>
                            <label>Actual total ({currencySymbol})<input className="form-input" type="number" min="0.01" step="any" value={expenseForm.amount} onChange={event => setExpenseForm(form => ({ ...form, amount: event.target.value }))} /></label>
                            <label>Paid on<input className="form-input" type="date" value={expenseForm.date} onChange={event => setExpenseForm(form => ({ ...form, date: event.target.value }))} /></label>
                            <label>Payment method<input className="form-input" value={expenseForm.method} onChange={event => setExpenseForm(form => ({ ...form, method: event.target.value }))} /></label>
                            <button className="btn-primary" disabled={saving} onClick={async () => {
                              const saved = await runSave(() => convertShoppingToExpense(item.id, expenseForm, true));
                              if (saved) { setExpenseForm(null); toast.success('Expense recorded in Finance.'); }
                            }}>{saving ? 'Recording…' : 'Confirm expense'}</button>
                            <button className="btn-ghost" disabled={saving} onClick={() => setExpenseForm(null)}>Cancel</button>
                          </div> : <button className="btn-ghost" disabled={saving} onClick={() => setExpenseForm({ id: item.id, amount: shoppingEstimate(item) ?? '', date: financeToday(user), method: 'Other' })}>Record actual expense</button>
                        )}
                        {item.expenseId && <span>Linked to a Finance expense</span>}

                        {/* Price history mini chart */}
                        {(item.priceHistory || []).length >= 2 && (
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <TrendingUp size={11}/> History: {item.priceHistory.slice(-4).map(p => `${money(p.price)}@${formatDate(p.date, user)}`).join(' → ')}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button disabled={saving} aria-label={`Edit ${item.name}`} onClick={() => { setEditId(item.id); setEditForm({ ...item }); }} className="shopping-icon-button"><Pencil size={14}/></button>
                      <button disabled={saving} aria-label={`Delete ${item.name}`} onClick={async () => { if (!window.confirm(`Delete ${item.name} from your shopping list?`)) return; const removed = await runSave(() => deleteShoppingItem(item.id)); if (removed) toast.info(`${item.name} removed`); }} className="shopping-icon-button" style={{ color: 'var(--danger, #b42318)' }}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>

                {/* Priority indicator strip */}
                <div style={{ height: '2px', background: pc.text, opacity: item.priority === 'high' ? 0.8 : item.priority === 'medium' ? 0.4 : 0.2 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Budget summary */}
      {stats.pending > 0 && (
        <div className="shopping-savings-planner">
          <p>
            <Tag size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle', color: 'var(--accent)' }} />
            Future purchase plan
          </p>
          <div><span>Need to save<strong>{money(stats.futureCost)}</strong></span><label>Monthly saving<input type="number" min="0" value={monthlySaving} onChange={event => setMonthlySaving(event.target.value)} placeholder={`${currencySymbol} 0`} /></label><span>Estimated time<strong>{savingMonths ? `${savingMonths} month${savingMonths === 1 ? '' : 's'}` : 'Add a monthly amount'}</strong></span><span>Observed price trend<strong>{priceTrend == null ? 'Add price history' : `${priceTrend >= 0 ? '+' : ''}${priceTrend.toFixed(1)}%`}</strong>{projectedFutureCost != null && <small>Projected basket: {money(projectedFutureCost)}</small>}</span></div>
          <small>Price history is observational. Inflation and chip-related price changes are estimates until a real price source is connected.</small>
        </div>
      )}
    </div>
  );
}
