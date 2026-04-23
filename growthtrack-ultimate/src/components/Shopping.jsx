import React, { useState } from 'react';
import { ShoppingCart, Plus, Trash2, DollarSign } from 'lucide-react';

const Shopping = () => {
  const [items, setItems] = useState([
    { id: 1, name: 'Protein Powder', category: 'Supplements', priority: 'High', estimatedCost: 45, purchased: false },
    { id: 2, name: 'Resistance Bands', category: 'Equipment', priority: 'Medium', estimatedCost: 25, purchased: false },
    { id: 3, name: 'Running Shoes', category: 'Apparel', priority: 'High', estimatedCost: 120, purchased: false }
  ]);
  const [newItem, setNewItem] = useState({ name: '', category: '', priority: 'Medium', estimatedCost: 0 });

  const categories = ['Supplements', 'Equipment', 'Apparel', 'Food', 'Other'];
  const priorities = ['Urgent', 'High', 'Medium', 'Low'];

  const addItem = () => {
    if (newItem.name.trim()) {
      setItems([...items, { ...newItem, id: Date.now(), purchased: false }]);
      setNewItem({ name: '', category: '', priority: 'Medium', estimatedCost: 0 });
    }
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const togglePurchased = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, purchased: !item.purchased } : item
    ));
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Urgent': return '#ef4444';
      case 'High': return '#f59e0b';
      case 'Medium': return '#10b981';
      case 'Low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const totalCost = items.reduce((sum, item) => sum + (item.purchased ? 0 : item.estimatedCost), 0);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', marginBottom: '10px' }}>
          <ShoppingCart size={28} color="#3b82f6" />
          Shopping List - Need to Buy
        </h2>
        <p style={{ color: '#94a3b8' }}>Track items you need to purchase for your fitness journey</p>
      </div>

      {/* Add New Item */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '20px', 
        borderRadius: '12px',
        marginBottom: '25px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>Add New Item</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Item name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'white',
              fontSize: '14px'
            }}
          />
          <select
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <option value="">Select category</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={newItem.priority}
            onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'white',
              fontSize: '14px'
            }}
          >
            {priorities.map(pri => <option key={pri} value={pri}>{pri}</option>)}
          </select>
          <input
            type="number"
            placeholder="Estimated cost"
            value={newItem.estimatedCost || ''}
            onChange={(e) => setNewItem({ ...newItem, estimatedCost: parseFloat(e.target.value) || 0 })}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'white',
              fontSize: '14px'
            }}
          />
        </div>
        <button
          onClick={addItem}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Summary */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '25px',
        border: '1px solid rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '5px' }}>Total Items</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{items.length}</p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '5px' }}>Pending</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{items.filter(i => !i.purchased).length}</p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '5px' }}>Purchased</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{items.filter(i => i.purchased).length}</p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <DollarSign size={14} />
              Estimated Cost
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>${totalCost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              background: item.purchased ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: `1px solid ${item.purchased ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: item.purchased ? 0.7 : 1
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={item.purchased}
                  onChange={() => togglePurchased(item.id)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <h4 style={{ 
                  fontSize: '18px', 
                  margin: 0,
                  textDecoration: item.purchased ? 'line-through' : 'none'
                }}>
                  {item.name}
                </h4>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: getPriorityColor(item.priority),
                  color: 'white'
                }}>
                  {item.priority}
                </span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8'
                }}>
                  {item.category}
                </span>
              </div>
              <div style={{ paddingLeft: '35px' }}>Add Shopping.jsx component to growthtrack-ultimate
                <p style={{ fontSize: '16px', color: '#3b82f6', fontWeight: '600', margin: 0 }}>
                  ${item.estimatedCost.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={() => deleteItem(item.id)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#64748b'
        }}>
          <ShoppingCart size={64} style={{ opacity: 0.3, marginBottom: '20px' }} />
          <p style={{ fontSize: '18px' }}>No items in your shopping list</p>
          <p style={{ fontSize: '14px' }}>Add items you need to buy for your fitness journey</p>
        </div>
      )}
    </div>
  );
};

export default Shopping;
