import React, { useState, useMemo, useCallback } from 'react';
import { ShoppingCart, Plus, Trash2, IndianRupee, Check, XCircle, ExternalLink } from 'lucide-react';
import useStore, {
  selectShopping,
  selectAddShoppingItem,
  selectDeleteShoppingItem,
  selectToggleShoppingPurchased,
} from '../store/useStore';
import { useToast } from '../hooks/useToast';
import StatCard from './ui/StatCard';
import PageHeader from './ui/PageHeader';

const fmtINR = (n) => '₹' + Number(n).toLocaleString('en-IN');
const CATEGORIES = ['Supplements', 'Equipment', 'Apparel', 'Food', 'Medical', 'Other'];
const PRIORITIES  = ['Urgent', 'High', 'Medium', 'Low'];
const PRIORITY_COLOR  = { Urgent: 'var(--danger)', High: '#e5a50a', Medium: 'var(--success)', Low: 'var(--text-3)' };
const PRIORITY_ORDER  = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
const EMPTY_FORM = { name: '', category: '', priority: 'Medium', estimatedCost: '', quantity: 1 };

// Cart deeplink helpers
const STORES = [
  { key: 'flipkart', label: 'Flipkart', color: '#2874f0', emoji: '📘',
    url: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
  { key: 'amazon',   label: 'Amazon',   color: '#ff9900', emoji: '🟠',
    url: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
];

export default function Shopping() {
  const { items }       = useStore(selectShopping);
  const addItem         = useStore(selectAddShoppingItem);
  const deleteItem      = useStore(selectDeleteShoppingItem);
  const togglePurchased = useStore(selectToggleShoppingPurchased);
  const toast = useToast();

  const [form, setForm]           = useState(EMPTY_FORM);
  const [activeStore, setActiveStore] = useState('flipkart'); // default deeplink store

  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
    return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
  }), [items]);

  const { totalCost, purchasedCount, pendingCount } = useMemo(() => ({
    totalCost:      items.reduce((s, i) => s + (i.purchased ? 0 : (i.estimatedCost || 0) * (i.quantity || 1)), 0),
    purchasedCount: items.filter(i =>  i.purchased).length,
    pendingCount:   items.filter(i => !i.purchased).length,
  }), [items]);

  const handleAdd = useCallback(() => {
    if (!form.name.trim()) { toast.error('Item name cannot be empty.'); return; }
    const cost = parseFloat(form.estimatedCost);
    const qty  = parseInt(form.quantity) || 1;
    addItem({ ...form, estimatedCost: isNaN(cost) ? 0 : cost, quantity: qty });
    setForm(EMPTY_FORM);
    toast.success(`"​${form.name}" added to shopping list.`);
  }, [form, addItem, toast]);

  const handleDelete = useCallback((id, name) => {
    deleteItem(id);
    toast.info(`"​${name}" removed.`);
  }, [deleteItem, toast]);

  const clearPurchased = useCallback(() => {
    const purchased = items.filter(i => i.purchased);
    purchased.forEach(i => deleteItem(i.id));
    toast.success(`${purchased.length} purchased item${purchased.length !== 1 ? 's' : ''} cleared.`);
  }, [items, deleteItem, toast]);

  const openDeeplink = useCallback((itemName) => {
    const store = STORES.find(s => s.key === activeStore) || STORES[0];
    window.open(store.url(itemName), '_blank', 'noopener,noreferrer');
  }, [activeStore]);

  const statCards = useMemo(() => [
    { label: 'Total Items',  value: items.length,      icon: ShoppingCart, color: 'var(--accent)'   },
    { label: 'Pending',      value: pendingCount,       icon: ShoppingCart, color: 'var(--warning)'  },
    { label: 'Purchased',    value: purchasedCount,     icon: Check,        color: 'var(--success)'  },
    { label: 'Pending Cost', value: fmtINR(totalCost),  icon: IndianRupee,  color: 'var(--info)'     },
  ], [items.length, pendingCount, purchasedCount, totalCost]);

  return (
    <div className="fade-in module-page">
      <PageHeader
        accent="Shopping"
        icon={<ShoppingCart size={24} />}
        title="Shopping List"
        subtitle="Track items you need for your fitness journey"
      />

      {/* Stats */}
      <div className="stats-grid mb-lg">
        {statCards.map(c => <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />)}
      </div>

      {/* Store selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 700 }}>CART LINKS:</span>
        {STORES.map(s => (
          <button key={s.key} onClick={() => setActiveStore(s.key)}
            style={{
              padding: '4px 14px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800,
              cursor: 'pointer', transition: '0.15s',
              background: activeStore === s.key ? s.color : 'rgba(255,255,255,0.05)',
              color:      activeStore === s.key ? '#fff'   : 'var(--text-3)',
              border:     activeStore === s.key ? 'none'   : '1px solid rgba(255,255,255,0.1)',
            }}>{s.emoji} {s.label}</button>
        ))}
      </div>

      {/* Add New Item */}
      <div className="glass-card mb-lg">
        <span className="card-title">Add New Item</span>
        <div className="form-grid-4 mt-sm mb-sm">
          <input type="text" placeholder="Item name"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="form-input col-span-2" />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="form-input">
            <option value="">Category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="form-input">
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="number" placeholder="Cost (₹)" value={form.estimatedCost}
            onChange={e => setForm({ ...form, estimatedCost: e.target.value })}
            className="form-input" min="0" />
          <input type="number" placeholder="Qty" value={form.quantity}
            onChange={e => setForm({ ...form, quantity: e.target.value })}
            className="form-input" min="1" />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={handleAdd} className="btn-primary"><Plus size={16} /> Add Item</button>
          {purchasedCount > 0 && (
            <button onClick={clearPurchased} className="btn-ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.8rem' }}>
              <XCircle size={14} /> Clear {purchasedCount} Purchased
            </button>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="item-list">
        {sortedItems.map(item => (
          <div key={item.id} className="glass-card list-card"
            style={{ opacity: item.purchased ? 0.6 : 1, borderColor: item.purchased ? 'rgba(52,211,153,0.3)' : 'var(--border)' }}>
            <div className="list-card__left">
              <button onClick={() => togglePurchased(item.id)}
                className={`check-box${item.purchased ? ' check-box--checked' : ''}`}
                aria-label={item.purchased ? 'Mark unpurchased' : 'Mark purchased'}>
                {item.purchased && <Check size={14} color="#fff" />}
              </button>
              <div>
                <div className="tag-row">
                  <p className="list-row__title" style={{ textDecoration: item.purchased ? 'line-through' : 'none' }}>{item.name}</p>
                  <span className="priority-badge" style={{ background: PRIORITY_COLOR[item.priority] }}>{item.priority}</span>
                  {item.category && <span className="category-badge">{item.category}</span>}
                </div>
                <p className="list-row__amount" style={{ color: 'var(--accent)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {fmtINR(item.estimatedCost)}
                  {item.quantity > 1 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 400 }}>
                      × {item.quantity} = {fmtINR(item.estimatedCost * item.quantity)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
              {/* Cart deeplink button */}
              {!item.purchased && (
                <button
                  onClick={() => openDeeplink(item.name)}
                  title={`Search on ${STORES.find(s => s.key === activeStore)?.label}`}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: '0.15s',
                    background: STORES.find(s => s.key === activeStore)?.color + '22',
                    color:      STORES.find(s => s.key === activeStore)?.color,
                    border:    `1px solid ${STORES.find(s => s.key === activeStore)?.color}44`,
                  }}
                >
                  <ExternalLink size={12} />
                  {STORES.find(s => s.key === activeStore)?.emoji}
                </button>
              )}
              <button onClick={() => handleDelete(item.id, item.name)} className="btn-icon btn-icon--danger" aria-label="Delete item">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="empty-state">
            <ShoppingCart size={56} className="empty-state__icon" />
            <p className="empty-state__text">No items in your shopping list</p>
          </div>
        )}
      </div>
    </div>
  );
}
