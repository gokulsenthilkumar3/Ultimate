import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2 } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import useStore, { selectFinance, selectAddTransaction, selectDeleteTransaction, selectAddBudget, selectDeleteBudget } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import StatCard from './ui/StatCard';

const CURRENCY = '₹';
const fmtINR = (n) => CURRENCY + Number(n).toLocaleString('en-IN');

const CATEGORIES = ['Gym', 'Supplements', 'Food', 'Apparel', 'Equipment', 'Salary', 'Stocks', 'Crypto', 'Rent', 'Utilities', 'Transport', 'Medical', 'Entertainment', 'Learning'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI (GPay/PhonePe)', 'Slice Card', 'Axio', 'HDFC Credit', 'SBI Debit'];
const COLORS = ['#10b981', '#f43f5e', '#0ea5e9', '#8b5cf6', '#e5a50a', '#ec4899', '#22d3ee', '#f97316'];
const TOOLTIP_STYLE = { background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-1)', backdropFilter: 'blur(12px)', fontSize: '0.82rem' };

const EMPTY_FORM = { type: 'Expense', category: '', amount: '', note: '', method: 'UPI (GPay/PhonePe)', date: new Date().toISOString().split('T')[0] };

export default function Finance() {
  const { transactions, budgets = [] } = useStore(selectFinance);
  const addTransaction = useStore(selectAddTransaction);
  const deleteTransaction = useStore(selectDeleteTransaction);
  const addBudget = useStore(selectAddBudget);
  const deleteBudget = useStore(selectDeleteBudget);
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [budgetForm, setBudgetForm] = useState({ category: '', limit_amount: '' });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [activeTab, setActiveTab] = useState('Overview'); // Overview, Analytics, Budgeting, Sync, Subscriptions

  // Subscriptions — DB-backed (C3 fix: was hardcoded useState)
  const [subs, setSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [subForm, setSubForm] = useState({ name: '', cost: '', category: 'OTT', next_date: '', icon: '🍿', auto_renew: 1 });

  useEffect(() => {
    if (activeTab === 'Subscriptions') {
      setSubsLoading(true);
      fetch('http://localhost:3001/api/subscriptions')
        .then(r => r.json())
        .then(data => setSubs(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setSubsLoading(false));
    }
  }, [activeTab]);

  const addSub = async (sub) => {
    try {
      const res = await fetch('http://localhost:3001/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      const data = await res.json();
      if (data.success) setSubs(prev => [...prev, { ...sub, id: data.id }]);
    } catch (e) { console.warn('sub add failed', e); }
  };

  const deleteSub = async (id) => {
    try {
      await fetch(`http://localhost:3001/api/subscriptions/${id}`, { method: 'DELETE' });
      setSubs(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.warn('sub delete failed', e); }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date && t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const { income, expenses, investments, balance, pieData, methodData } = useMemo(() => {
    let inc = 0, exp = 0, inv = 0;
    const catMap = {};
    const methodMap = {};

    filteredTransactions.forEach(t => {
      if (t.type === 'Income') inc += t.amount;
      else if (t.type === 'Expense') {
        exp += t.amount;
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        methodMap[t.method || 'Unknown'] = (methodMap[t.method || 'Unknown'] || 0) + t.amount;
      }
      else if (t.type === 'Investment') inv += t.amount;
    });

    const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const methodData = Object.entries(methodMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    return { income: inc, expenses: exp, investments: inv, balance: inc - exp - inv, pieData, methodData };
  }, [filteredTransactions]);

  const statCards = useMemo(() => [
    { label: 'Net Monthly Balance', value: fmtINR(balance), icon: Wallet, color: balance >= 0 ? 'var(--success)' : 'var(--danger)' },
    { label: 'Total Income', value: '+' + fmtINR(income), icon: ArrowUpRight, color: 'var(--success)' },
    { label: 'Total Expenses', value: '-' + fmtINR(expenses), icon: ArrowDownRight, color: 'var(--danger)' },
    { label: 'Invested / Saved', value: fmtINR(investments), icon: TrendingUp, color: 'var(--info)' },
  ], [balance, income, expenses, investments]);

  const handleAdd = useCallback(() => {
    if (!form.category) return toast.error('Please select a category.');
    if (!form.method) return toast.error('Please select a payment method.');
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) return toast.error('Amount must be greater than ₹0.');
    
    addTransaction({ ...form, amount: amt, id: Date.now().toString() });
    setForm(EMPTY_FORM);
    toast.success(`${form.type} added successfully.`);
  }, [form, addTransaction, toast]);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {/* Dynamic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Wealth Engine</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Financial Command</h2>
          <p className="text-secondary">Track Axio, Slice, UPI, and bank flow month-to-month.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
            className="form-input" 
            style={{ fontWeight: 800, color: 'var(--accent)', borderColor: 'var(--accent)' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {['Overview', 'Analytics', 'Budgeting', 'Subscriptions', 'Sync'].map(tab => (
          <button 
            key={tab} 
            className={`btn-sm ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '0.6rem 1.5rem', fontWeight: 800, whiteSpace: 'nowrap' }}
          >
            {tab === 'Overview' && <Wallet size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Analytics' && <BarChart2 size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Budgeting' && <Activity size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Subscriptions' && <Calendar size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Sync' && <CreditCard size={14} style={{ marginRight: '6px' }} />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <>
          <div className="stats-grid mb-lg">
            {statCards.map((c) => <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />)}
          </div>

          <div className="dual-grid mb-lg">
            {/* Payment Method Breakdown */}
            <div className="glass-card">
              <div className="card-header-row" style={{ marginBottom: '1.5rem' }}>
                <CreditCard size={18} color="var(--accent)" />
                <span className="card-title" style={{ margin: 0 }}>Spending by Method</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {methodData.length === 0 ? <p className="empty-msg">No expense data for this month.</p> : 
                  methodData.map((d, i) => (
                    <div key={d.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{d.name}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-1)' }}>{fmtINR(d.value)}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${(d.value / expenses) * 100}%`, height: '100%', background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Add Transaction Form */}
            <div className="glass-card">
              <span className="card-title">New Log</span>
              <div className="form-stack mt-sm">
                <div className="btn-group">
                  {['Expense', 'Income', 'Investment'].map((type) => (
                    <button key={type} onClick={() => setForm({ ...form, type })} className={form.type === type ? 'btn-primary' : 'btn-ghost'} style={{ flex: 1, padding: '0.55rem', fontSize: '0.78rem' }}>
                      {type}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="form-input">
                    <option value="">Category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="form-input">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
                  <input type="number" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="form-input" min="0" />
                </div>
                <input type="text" placeholder="Description / Note (e.g. Swiggy, Uber)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="form-input" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
                <button onClick={handleAdd} className="btn-primary btn-full"><Plus size={16} /> ADD LEDGER ENTRY</button>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <span className="card-title">Ledger: {selectedMonth}</span>
            <div className="item-list mt-sm">
              {filteredTransactions.length === 0 && <p className="empty-msg">No transactions found for this month.</p>}
              {[...filteredTransactions].sort((a,b) => new Date(b.date) - new Date(a.date)).map((tx) => (
                <div key={tx.id} className="list-row" style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1.5fr 1fr 40px', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 800 }}>{tx.date}</div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '0.95rem' }}>{tx.category}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '2px' }}>{tx.note}</p>
                  </div>
                  <div style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--bg-elevated)', borderRadius: '4px', width: 'fit-content' }}>
                    💳 {tx.method}
                  </div>
                  <div style={{ fontWeight: 900, textAlign: 'right', color: tx.type === 'Income' ? 'var(--success)' : tx.type === 'Expense' ? 'var(--danger)' : 'var(--info)' }}>
                    {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}{fmtINR(tx.amount)}
                  </div>
                  <button onClick={() => deleteTransaction(tx.id)} className="btn-icon btn-icon--danger" style={{ marginLeft: 'auto' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'Analytics' && (
        <div className="dual-grid">
          <div className="glass-card">
             <h3 className="card-title"><PieChart size={18}/> Category Allocation</h3>
             <div style={{ height: '300px', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={pieData} innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                      {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val) => fmtINR(val)} contentStyle={TOOLTIP_STYLE} />
                  </RePieChart>
                </ResponsiveContainer>
             </div>
             <div className="legend-row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                {pieData.map((d, i) => (
                  <div key={d.name} className="legend-item" style={{ fontSize: '0.75rem' }}>
                    <div className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    {d.name} ({Math.round((d.value/expenses)*100)}%)
                  </div>
                ))}
             </div>
          </div>
          
          <div className="glass-card">
             <h3 className="card-title"><BarChart2 size={18}/> Spend Velocity</h3>
             <div style={{ height: '300px', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pieData.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip cursor={{ fill: 'var(--bg-elevated)' }} contentStyle={TOOLTIP_STYLE} formatter={(val) => fmtINR(val)} />
                    <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
             <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'center', marginTop: '1rem', fontStyle: 'italic' }}>
               Top 6 highest draining categories for {selectedMonth}
             </p>
          </div>
        </div>
      )}

      {activeTab === 'Budgeting' && (
        <div className="glass-card">
           <h3 className="card-title"><Activity size={18}/> Zero-Based Budgeting Matrix</h3>
           <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '2rem' }}>Allocate every rupee. Green means you are under budget, Red means you have breached the threshold.</p>
           
           <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
             <div style={{ flex: '1 1 200px' }}>
               <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Category</label>
               <select className="form-input" value={budgetForm.category} onChange={e => setBudgetForm({...budgetForm, category: e.target.value})}>
                 <option value="">Select Category</option>
                 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <div style={{ flex: '1 1 200px' }}>
               <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Limit Amount (₹)</label>
               <input type="number" className="form-input" placeholder="e.g. 5000" value={budgetForm.limit_amount} onChange={e => setBudgetForm({...budgetForm, limit_amount: e.target.value})} />
             </div>
             <button className="btn-primary" onClick={() => {
                if (budgetForm.category && budgetForm.limit_amount) {
                   addBudget({ category: budgetForm.category, limit_amount: parseFloat(budgetForm.limit_amount) });
                   setBudgetForm({ category: '', limit_amount: '' });
                   toast.success('Budget added');
                } else {
                   toast.error('Category and limit required');
                }
             }}><Plus size={16}/> ADD BUDGET</button>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>ACTIVE BUDGETS</h4>
                {budgets.length === 0 ? <p className="empty-msg" style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>No budgets defined. Add one above.</p> : budgets.map(b => {
                  const actual = pieData.find(d => d.name === b.category)?.value || 0;
                  return renderBudgetRow({ id: b.id, name: b.category, actual, limit: b.limit_amount, onDelete: () => deleteBudget(b.id) });
                })}
              </div>
              
              <div>
                <h4 style={{ fontSize: '0.9rem', color: '#22d3ee', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>BUDGET INSIGHTS</h4>
                <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1rem', lineHeight: 1.5 }}>
                     Total budget limits: <strong style={{ color: 'var(--text-1)' }}>{fmtINR(budgets.reduce((a, b) => a + b.limit_amount, 0))}</strong><br/>
                     Total monthly expenses: <strong style={{ color: 'var(--text-1)' }}>{fmtINR(expenses)}</strong>
                   </p>
                   {expenses > budgets.reduce((a, b) => a + b.limit_amount, 0) && budgets.length > 0 ? (
                     <p style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 700 }}>⚠️ You have exceeded your total defined budgets!</p>
                   ) : (
                     <p style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>✅ You are within your total defined budgets.</p>
                   )}
                </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'Subscriptions' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="card-title"><Calendar size={18}/> Recurring Subscriptions & Bills</h3>
            <button className="btn-primary btn-sm" onClick={() => setShowAddSub(!showAddSub)}>
              {showAddSub ? 'CANCEL' : '+ Add Bill'}
            </button>
          </div>

          {showAddSub && (
            <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--accent)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Name</label>
                <input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} className="form-input" placeholder="Netflix, Gym, etc." />
              </div>
              <div style={{ flex: '1 1 100px' }}>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Cost (₹)</label>
                <input type="number" value={subForm.cost} onChange={e => setSubForm({ ...subForm, cost: e.target.value })} className="form-input" placeholder="499" />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Category</label>
                <select value={subForm.category} onChange={e => setSubForm({ ...subForm, category: e.target.value })} className="form-input">
                  {['OTT', 'Utilities', 'Fitness', 'Learning', 'Insurance', 'Rent', 'Credit'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Next Bill Date</label>
                <input type="date" value={subForm.next_date} onChange={e => setSubForm({ ...subForm, next_date: e.target.value })} className="form-input" />
              </div>
              <div style={{ flex: '1 1 60px' }}>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Icon</label>
                <input value={subForm.icon} onChange={e => setSubForm({ ...subForm, icon: e.target.value })} className="form-input" placeholder="🍿" />
              </div>
              <button className="btn-primary" onClick={async () => {
                if (!subForm.name || !subForm.cost) return toast.error('Name and cost are required');
                await addSub({ ...subForm, cost: parseFloat(subForm.cost) });
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
                     <div>
                       <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{sub.name}</h4>
                       <span className="label-caps" style={{ color: 'var(--text-3)', fontSize: '0.65rem' }}>{sub.category}</span>
                     </div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--danger)', marginBottom: '4px' }}>{fmtINR(sub.cost)}</div>
                     <button onClick={() => deleteSub(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.7rem' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>[Delete]</button>
                   </div>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                   <div>
                     <p style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Next Billing Date</p>
                     <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>{sub.next_date || sub.nextDate || 'Not set'}</p>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span style={{ fontSize: '0.75rem', color: sub.autoRenew ? 'var(--success)' : 'var(--text-3)' }}>Auto-Renew</span>
                     <div style={{ width: '32px', height: '18px', background: sub.autoRenew ? 'var(--success)' : 'var(--bg-elevated)', borderRadius: '10px', position: 'relative', cursor: 'pointer' }}>
                       <div style={{ width: '14px', height: '14px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: sub.autoRenew ? '16px' : '2px', transition: '0.2s' }} />
                     </div>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === 'Sync' && (
        <div className="glass-card" style={{ padding: '2.5rem' }}>
           <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
             <h3 className="text-display" style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>Open Banking & App Sync</h3>
             <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto' }}>
               GrowthTrack uses secure read-only access to aggregate your financial telemetry from Indian FinTech apps. 
               Data is processed locally for privacy.
             </p>
           </div>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
             {[
               { name: 'Axio (Expense Manager)', color: '#ff5c35', desc: 'Auto-scrapes SMS and bank notifications.', status: 'Connected' },
               { name: 'BHIM / UPI Apps', color: '#0ea5e9', desc: 'Sync GPay, PhonePe, and PayTM flow.', status: 'Connect' },
               { name: 'Slice / Uni Card', color: '#8b5cf6', desc: 'Direct API sync for credit lines.', status: 'Connect' },
               { name: 'Roarbank (Neobank)', color: '#f59e0b', desc: 'Real-time settlement data.', status: 'Connect' },
               { name: 'HDFC / SBI NetBanking', color: '#10b981', desc: 'Secure bank statement parsing.', status: 'Connect' }
             ].map(provider => (
               <div key={provider.name} style={{ 
                 border: `1px solid ${provider.color}33`, 
                 padding: '2rem', 
                 borderRadius: '20px', 
                 background: `linear-gradient(135deg, ${provider.color}08, transparent)`, 
                 display: 'flex', 
                 flexDirection: 'column', 
                 gap: '1rem', 
                 transition: 'all 0.3s ease',
                 cursor: 'pointer'
               }}
               onMouseEnter={e => { e.currentTarget.style.borderColor = provider.color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
               onMouseLeave={e => { e.currentTarget.style.borderColor = `${provider.color}33`; e.currentTarget.style.transform = 'translateY(0)'; }}
               >
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: provider.color }}>{provider.name}</h4>
                   {provider.status === 'Connected' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />}
                 </div>
                 <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.4 }}>{provider.desc}</p>
                 <button 
                   className="btn-ghost" 
                   style={{ 
                     marginTop: 'auto',
                     width: '100%', 
                     borderColor: provider.color, 
                     color: provider.status === 'Connected' ? 'var(--text-1)' : provider.color, 
                     background: provider.status === 'Connected' ? `${provider.color}22` : 'transparent',
                     fontSize: '0.7rem'
                   }}
                   onClick={() => toast.success(`${provider.name} sync initiated.`)}
                 >
                   {provider.status === 'Connected' ? 'REFRESH SYNC' : 'AUTHORIZE CONNECTION'}
                 </button>
               </div>
             ))}
           </div>

           <div className="glass-card" style={{ marginTop: '3rem', background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--border-strong)', textAlign: 'center', padding: '2rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: '1rem' }}>Missing an app? We support 200+ Indian financial institutions via CSV import.</p>
              <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}>UPLOAD BANK STATEMENT (.CSV)</button>
           </div>
        </div>
      )}
    </div>
  );
}

function renderBudgetRow({ id, name, actual, limit, onDelete }) {
  const percent = Math.min((actual / limit) * 100, 100);
  const isOver = actual > limit;
  return (
    <div key={id || name} style={{ marginBottom: '1.25rem' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem', alignItems: 'center' }}>
         <span style={{ fontWeight: 700 }}>{name}</span>
         <div style={{ display: 'flex', alignItems: 'center' }}>
           <span style={{ color: isOver ? 'var(--danger)' : 'var(--text-1)', fontWeight: 800 }}>{actual}</span> / {limit}
           {onDelete && <button onClick={onDelete} className="btn-icon" style={{ marginLeft: '8px', color: 'var(--text-3)', padding: '2px' }} onMouseEnter={e => e.currentTarget.style.color='var(--danger)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}><Trash2 size={12}/></button>}
         </div>
       </div>
       <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, height: '100%', background: isOver ? 'var(--danger)' : 'var(--success)' }} />
       </div>
    </div>
  );
}
