import React, { useState } from 'react';
import { ShoppingCart, Plus, Trash2, IndianRupee, Check } from 'lucide-react';

const fmtINR = (n) => '₹' + n.toLocaleString('en-IN');

const Shopping = () => {
  const [items, setItems] = useState([
    { id: 1, name: 'Whey Protein (2kg)', category: 'Supplements', priority: 'High', estimatedCost: 3500, purchased: false },
    { id: 2, name: 'Resistance Bands Set', category: 'Equipment', priority: 'Medium', estimatedCost: 850, purchased: false },
    { id: 3, name: 'Running Shoes', category: 'Apparel', priority: 'High', estimatedCost: 6500, purchased: false },
    { id: 4, name: 'Creatine Monohydrate', category: 'Supplements', priority: 'High', estimatedCost: 900, purchased: false },
  ]);
  const [newItem, setNewItem] = useState({ name: '', category: '', priority: 'Medium', estimatedCost: 0 });

  const categories = ['Supplements', 'Equipment', 'Apparel', 'Food', 'Medical', 'Other'];
  const priorities = ['Urgent', 'High', 'Medium', 'Low'];

  const addItem = () => {
    if (newItem.name.trim()) {
      setItems([...items, { ...newItem, id: Date.now(), purchased: false }]);
      setNewItem({ name: '', category: '', priority: 'Medium', estimatedCost: 0 });
    }
  };

  const deleteItem = (id) => setItems(items.filter(item => item.id !== id));
  const togglePurchased = (id) => setItems(items.map(item => item.id === id ? { ...item, purchased: !item.purchased } : item));

  const getPriorityColor = (p) => ({ Urgent: 'var(--danger)', High: '#e5a50a', Medium: 'var(--success)', Low: 'var(--text-3)' }[p] || 'var(--text-3)');

  const totalCost = items.reduce((sum, item) => sum + (item.purchased ? 0 : item.estimatedCost), 0);
  const purchasedCount = items.filter(i => i.purchased).length;
  const pendingCount = items.filter(i => !i.purchased).length;

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Shopping</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
          <ShoppingCart size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
          Shopping List
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Track items you need for your fitness journey</p>
      </div>

      {/* Add New Item */}
      <div className="glass-card" style={{ marginBottom: '1.25rem' }}>
        <span className="card-title">Add New Item</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
          <input type="text" placeholder="Item name" value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="form-input" style={{ gridColumn: 'span 2' }} />
          <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="form-input">
            <option value="">Category</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={newItem.priority} onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })} className="form-input">
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="number" placeholder="Cost (₹)" value={newItem.estimatedCost || ''}
            onChange={(e) => setNewItem({ ...newItem, estimatedCost: parseFloat(e.target.value) || 0 })}
            className="form-input" />
        </div>
        <button onClick={addItem} className="btn-primary">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Summary */}
      <div className="glass-card" style={{
        marginBottom: '1.25rem',
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', textAlign: 'center' }}>
          <div>
            <p className="label-caps">Total Items</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-1)', marginTop: '0.2rem' }}>{items.length}</p>
          </div>
          <div>
            <p className="label-caps">Pending</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--warning)', marginTop: '0.2rem' }}>{pendingCount}</p>
          </div>
          <div>
            <p className="label-caps">Purchased</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--success)', marginTop: '0.2rem' }}>{purchasedCount}</p>
          </div>
          <div>
            <p className="label-caps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <IndianRupee size={11} /> Est. Cost
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--info)', marginTop: '0.2rem' }}>{fmtINR(totalCost)}</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {items.map(item => (
          <div key={item.id} className="glass-card" style={{
            padding: '1rem 1.25rem',
            opacity: item.purchased ? 0.6 : 1,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderColor: item.purchased ? 'rgba(52,211,153,0.3)' : 'var(--border)',
            transition: 'all 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1 }}>
              <button onClick={() => togglePurchased(item.id)} style={{
                width: '24px', height: '24px', borderRadius: '6px',
                border: `2px solid ${item.purchased ? 'var(--success)' : 'var(--border-strong)'}`,
                background: item.purchased ? 'var(--success)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease', flexShrink: 0,
              }}>
                {item.purchased && <Check size={14} color="#fff" />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', textDecoration: item.purchased ? 'line-through' : 'none' }}>{item.name}</p>
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.62rem', fontWeight: 700, background: getPriorityColor(item.priority), color: '#fff',
                  }}>{item.priority}</span>
                  {item.category && (
                    <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.62rem', fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-3)' }}>
                      {item.category}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>{fmtINR(item.estimatedCost)}</p>
              </div>
            </div>
            <button onClick={() => deleteItem(item.id)} style={{
              background: 'rgba(248,113,113,0.1)', border: 'none',
              color: 'var(--danger)', cursor: 'pointer', padding: '8px',
              borderRadius: 'var(--radius-sm)', display: 'flex',
              transition: 'all 0.2s ease',
            }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <ShoppingCart size={56} style={{ color: 'var(--text-3)', opacity: 0.25, marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>No items in your shopping list</p>
        </div>
      )}
    </div>
  );
};

export default Shopping;
