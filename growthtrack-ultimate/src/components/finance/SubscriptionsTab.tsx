import React from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2, Upload, LineChart as LineIcon, ListTodo } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';


export default function SubscriptionsTab({ fmtINR, form, showAddSub, setShowAddSub, subForm, setSubForm, addSubscription, subs, handleDeleteSubscription }) {
  {/* ── SUBSCRIPTIONS ── */}
      return (
    <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="card-title"><Calendar size={18}/> Recurring Subscriptions & Bills</h3>
            <button className="btn-primary btn-sm" onClick={() => setShowAddSub(!showAddSub)}>{showAddSub ? 'CANCEL' : '+ Add Bill'}</button>
          </div>
          {showAddSub && (
            <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--accent)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 180px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Name</label><input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} className="form-input" placeholder="Netflix, Gym, etc." /></div>
              <div style={{ flex: '1 1 100px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Cost (₹)</label><input type="number" value={subForm.cost} onChange={e => setSubForm({ ...subForm, cost: e.target.value })} className="form-input" placeholder="499" /></div>
              <div style={{ flex: '1 1 120px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Category</label><select value={subForm.category} onChange={e => setSubForm({ ...subForm, category: e.target.value })} className="form-input">{['OTT', 'Utilities', 'Fitness', 'Learning', 'Insurance', 'Rent', 'Credit'].map(c => <option key={c}>{c}</option>)}</select></div>
              <div style={{ flex: '1 1 140px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Next Bill Date</label><input type="date" value={subForm.next_date} onChange={e => setSubForm({ ...subForm, next_date: e.target.value })} className="form-input" /></div>
              <div style={{ flex: '1 1 60px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Icon</label><input value={subForm.icon} onChange={e => setSubForm({ ...subForm, icon: e.target.value })} className="form-input" placeholder="🍿" /></div>
              <button className="btn-primary" onClick={async () => {
                if (!subForm.name || !subForm.cost) return toast.error('Name and cost are required');
                await addSubscription({ ...subForm, cost: parseFloat(subForm.cost) });
                setShowAddSub(false);
                setSubForm({ name: '', cost: '', category: 'OTT', next_date: '', icon: '🍿', auto_renew: 1 });
                toast.success('Subscription added');
              }}>SAVE BILL</button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {subs.map(sub => (
              <div key={sub.id} style={{ padding: '1.5rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '2rem' }}>{sub.icon}</span>
                    <div><h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{sub.name}</h4><span className="label-caps" style={{ color: 'var(--text-3)', fontSize: '0.65rem' }}>{sub.category}</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--danger)', marginBottom: '4px' }}>{fmtINR(sub.cost)}</div>
                    <button onClick={() => handleDeleteSubscription(sub.id)} className="hover-text-danger" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.7rem' }}>[Delete]</button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Next Billing Date</p>
                    <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>{sub.next_date || sub.nextDate || 'Not set'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
  );
}
