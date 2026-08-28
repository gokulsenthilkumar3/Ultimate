import React, { useState, useMemo, useCallback } from 'react';
import { ShoppingCart, Plus, Trash2, Check, Tag, Star, AlertTriangle, ArrowDown, Search, Filter } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';

const CATEGORIES = ['Groceries', 'Electronics', 'Clothing', 'Health', 'Books', 'Home', 'Fitness', 'Food', 'Other'];
const PRIORITIES = ['high', 'medium', 'low'];

const PRIORITY_COLORS = {
  high:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   text: '#f87171' },
  medium: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  text: '#fbbf24' },
  low:    { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)',  text: '#9ca3af' },
};

const CAT_EMOJIS = { Groceries: '🛒', Electronics: '📱', Clothing: '👕', Health: '💊', Books: '📚', Home: '🏠', Fitness: '💪', Food: '🍕', Other: '✨' };

export default function Shopping() {
  const toast = useToast();
  const shoppingList  = useStore(s => s.shoppingList)  || [];
  const setShoppingList = useStore(s => s.setShoppingList);
  const addShoppingItem    = useStore(s => s.addShoppingItem);
  const updateShoppingItem = useStore(s => s.updateShoppingItem);
  const deleteShoppingItem = useStore(s => s.deleteShoppingItem);
  const toggleShoppingItem = useStore(s => s.toggleShoppingItem);

  const [form, setForm] = useState({ name: '', category: 'Other', priority: 'medium', estimatedCost: '', notes: '', url: '', targetPrice: '' });
  const [showAdd,   setShowAdd]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [priFilter, setPriFilter] = useState('all');
  const [showDone,  setShowDone]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [priceInput, setPriceInput] = useState({});

  const helpers = { addShoppingItem, updateShoppingItem, deleteShoppingItem, toggleShoppingItem, setShoppingList };

  const doAdd = (item) => {
    if (typeof helpers.addShoppingItem === 'function') helpers.addShoppingItem(item);
    else if (typeof helpers.setShoppingList === 'function') helpers.setShoppingList([...shoppingList, item]);
  };
  const doUpdate = (id, updates) => {
    if (typeof helpers.updateShoppingItem === 'function') helpers.updateShoppingItem(id, updates);
    else if (typeof helpers.setShoppingList === 'function') helpers.setShoppingList(shoppingList.map(x => x.id === id ? { ...x, ...updates } : x));
  };
  const doDelete = (id) => {
    if (typeof helpers.deleteShoppingItem === 'function') helpers.deleteShoppingItem(id);
    else if (typeof helpers.setShoppingList === 'function') helpers.setShoppingList(shoppingList.filter(x => x.id !== id));
  };
  const doToggle = (id) => {
    if (typeof helpers.toggleShoppingItem === 'function') helpers.toggleShoppingItem(id);
    else if (typeof helpers.setShoppingList === 'function') helpers.setShoppingList(shoppingList.map(x => x.id === id ? { ...x, purchased: !x.purchased } : x));
  };

  const handleAdd = () => {
    if (!form.name.trim()) { toast.error('Item name is required.'); return; }
    const item = {
      ...form,
      id: Date.now(),
      purchased: false,
      createdAt: new Date().toISOString().slice(0, 10),
      estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
      targetPrice:   form.targetPrice   ? Number(form.targetPrice)   : null,
      priceHistory:  [],
    };
    doAdd(item);
    setForm({ name: '', category: 'Other', priority: 'medium', estimatedCost: '', notes: '', url: '', targetPrice: '' });
    setShowAdd(false);
    toast.success(`${item.name} added to list`);
  };

  const logPrice = (id, price) => {
    const p = Number(price);
    if (!p) return;
    const item = shoppingList.find(x => x.id === id);
    const history = [...(item?.priceHistory || []), { date: new Date().toISOString().slice(0, 10), price: p }];
    doUpdate(id, { estimatedCost: p, priceHistory: history });
    setPriceInput(pp => { const n = { ...pp }; delete n[id]; return n; });
    if (item?.targetPrice && p <= item.targetPrice) {
      toast.success(`🎯 Price target hit! ${item.name} is now ₹${p} (target: ₹${item.targetPrice})`);
    } else {
      toast.success(`Price updated: ₹${p}`);
    }
  };

  const filtered = useMemo(() => {
    let list = shoppingList;
    if (!showDone)        list = list.filter(x => !x.purchased);
    if (catFilter !== 'all') list = list.filter(x => x.category === catFilter);
    if (priFilter !== 'all') list = list.filter(x => x.priority === priFilter);
    if (search.trim())   list = list.filter(x => x.name.toLowerCase().includes(search.toLowerCase()) || (x.notes || '').toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => {
      const pi = ['high', 'medium', 'low'];
      return pi.indexOf(a.priority) - pi.indexOf(b.priority);
    });
  }, [shoppingList, showDone, catFilter, priFilter, search]);

  const stats = useMemo(() => ({
    total:     shoppingList.length,
    pending:   shoppingList.filter(x => !x.purchased).length,
    purchased: shoppingList.filter(x => x.purchased).length,
    totalCost: shoppingList.filter(x => !x.purchased).reduce((s, x) => s + (Number(x.estimatedCost) || 0), 0),
    highPri:   shoppingList.filter(x => x.priority === 'high' && !x.purchased).length,
    priceDrop: shoppingList.filter(x => {
      const h = x.priceHistory || [];
      if (h.length < 2) return false;
      return h[h.length - 1].price < h[h.length - 2].price;
    }).length,
  }), [shoppingList]);

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
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Shopping</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Shopping List</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{stats.pending} pending · ₹{stats.totalCost.toLocaleString()} estimated</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="btn-primary"><Plus size={14} /> Add Item</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Pending',    val: stats.pending,   color: 'var(--accent)' },
          { label: 'Purchased',  val: stats.purchased, color: '#10b981' },
          { label: '🔴 High Pri', val: stats.highPri,   color: '#f87171' },
          { label: '📉 Price Drops', val: stats.priceDrop, color: '#fbbf24' },
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
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>New Item</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <input placeholder="Item name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} className="form-input" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="form-input">
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} Priority</option>)}
            </select>
            <input type="number" placeholder="Estimated cost (₹)" value={form.estimatedCost} onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))} className="form-input" />
            <input type="number" placeholder="Target price (₹) — alert when hit" value={form.targetPrice} onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))} className="form-input" />
            <input placeholder="URL / Link" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="form-input" />
            <input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="form-input" style={{ gridColumn: 'span 2' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
            <button onClick={handleAdd} className="btn-primary">Add</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="form-input" style={{ paddingLeft: '28px' }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="form-input" style={{ width: 'auto' }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>)}
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
            const catEmoji = CAT_EMOJIS[item.category] || '✨';

            return (
              <div key={item.id} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${pc.border}`, overflow: 'hidden', opacity: item.purchased ? 0.55 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1rem' }}>
                  {/* Checkbox */}
                  <button onClick={() => doToggle(item.id)} style={{
                    width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0, cursor: 'pointer', marginTop: '1px',
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
                          <input type="number" value={editForm.estimatedCost || ''} onChange={e => setEditForm(f => ({ ...f, estimatedCost: e.target.value }))} placeholder="Cost" className="form-input" style={{ width: '100px' }} />
                          <input type="number" value={editForm.targetPrice || ''} onChange={e => setEditForm(f => ({ ...f, targetPrice: e.target.value }))} placeholder="Target ₹" className="form-input" style={{ width: '100px' }} />
                          <select value={editForm.priority || 'medium'} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className="form-input">
                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input value={editForm.url || ''} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} placeholder="URL" className="form-input" />
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => { doUpdate(item.id, editForm); setEditId(null); toast.success('Updated.'); }} className="btn-primary" style={{ padding: '3px 10px', fontSize: '0.72rem' }}><Check size={11} /> Save</button>
                          <button onClick={() => setEditId(null)} style={{ padding: '3px 10px', fontSize: '0.72rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                          <span style={{ fontSize: '1rem' }}>{catEmoji}</span>
                          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: item.purchased ? 'var(--text-3)' : 'var(--text-1)', textDecoration: item.purchased ? 'line-through' : 'none' }}>{item.name}</p>
                          <span style={{ padding: '1px 7px', borderRadius: '99px', fontSize: '0.62rem', fontWeight: 800, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.priority}</span>
                          {item.category && <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{item.category}</span>}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                          {item.estimatedCost && <span style={{ fontWeight: 700, color: 'var(--text-2)', fontFamily: 'monospace' }}>₹{Number(item.estimatedCost).toLocaleString()}</span>}
                          {item.targetPrice && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}><Star size={10} /> Target: ₹{Number(item.targetPrice).toLocaleString()}</span>}
                          {pdi && pdi.dropped && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}><ArrowDown size={10} /> {pdi.pct}% price drop!</span>}
                          {item.targetPrice && item.estimatedCost && Number(item.estimatedCost) <= Number(item.targetPrice) && <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}><AlertTriangle size={10} /> Target hit!</span>}
                          {item.notes && <span style={{ color: 'var(--text-3)' }}>— {item.notes}</span>}
                          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: '0.65rem' }}>View link</a>}
                        </div>

                        {/* Price drop log */}
                        {!item.purchased && (
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem' }}>
                            <input type="number" placeholder="Log new price ₹" value={priceInput[item.id] || ''}
                              onChange={e => setPriceInput(pp => ({ ...pp, [item.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && logPrice(item.id, priceInput[item.id])}
                              style={{ width: '130px', padding: '3px 8px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-1)', outline: 'none' }}
                            />
                            {priceInput[item.id] && <button onClick={() => logPrice(item.id, priceInput[item.id])} style={{ padding: '3px 8px', fontSize: '0.65rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '6px', cursor: 'pointer', color: '#34d399', fontWeight: 700 }}><Check size={10} /> Log</button>}
                          </div>
                        )}

                        {/* Price history mini chart */}
                        {(item.priceHistory || []).length >= 2 && (
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            📊 History: {item.priceHistory.slice(-4).map(p => `₹${p.price}@${p.date.slice(5)}`).join(' → ')}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button onClick={() => { setEditId(item.id); setEditForm({ ...item }); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '3px' }}>✏️</button>
                      <button onClick={() => { doDelete(item.id); toast.info(`${item.name} removed`); }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '3px' }}><Trash2 size={13} /></button>
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
        <div style={{ marginTop: '1rem', padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
            <Tag size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle', color: 'var(--accent)' }} />
            {stats.pending} pending items
          </p>
          <p style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--accent)', fontFamily: 'monospace' }}>
            Est. Total: ₹{stats.totalCost.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
