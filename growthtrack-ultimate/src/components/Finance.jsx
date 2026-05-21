import React, { useState, useMemo, useCallback } from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2, Upload, LineChart as LineIcon } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import useStore, { selectFinance, selectAddTransaction, selectDeleteTransaction, selectAddBudget, selectDeleteBudget, apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import StatCard from './ui/StatCard';
import SIPCalculator from './SIPCalculator';
import EmptyState from './ui/EmptyState';
import { ListTodo, Activity } from 'lucide-react';

const CURRENCY = '₹';
const fmtINR = (n) => CURRENCY + Number(n).toLocaleString('en-IN');

const CATEGORIES = ['Gym', 'Supplements', 'Food', 'Apparel', 'Equipment', 'Salary', 'Stocks', 'Crypto', 'Rent', 'Utilities', 'Transport', 'Medical', 'Entertainment', 'Learning'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI (GPay/PhonePe)', 'Slice Card', 'Axio', 'HDFC Credit', 'SBI Debit'];
const COLORS = ['#10b981', '#f43f5e', '#0ea5e9', '#8b5cf6', '#e5a50a', '#ec4899', '#22d3ee', '#f97316', '#a78bfa', '#34d399'];
const TOOLTIP_STYLE = { background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-1)', backdropFilter: 'blur(12px)', fontSize: '0.82rem' };

const EMPTY_FORM = { type: 'Expense', category: '', amount: '', note: '', method: 'UPI (GPay/PhonePe)', date: new Date().toISOString().split('T')[0] };
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Build last N months as YYYY-MM strings
function lastNMonths(n = 6) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

// Aggregate transactions into monthly buckets for trend chart
function buildTrendData(transactions, months) {
  return months.map(month => {
    const txs = transactions.filter(t => t.date && t.date.startsWith(month));
    let income = 0, expenses = 0, investments = 0;
    txs.forEach(t => {
      if (t.type === 'Income') income += t.amount;
      else if (t.type === 'Expense') expenses += t.amount;
      else if (t.type === 'Investment') investments += t.amount;
    });
    return { month: month.slice(5), income, expenses, investments, savings: income - expenses - investments };
  });
}

// Day-of-month spend heatmap data for current month
function buildDayHeatmap(transactions, month) {
  const map = {};
  transactions.filter(t => t.date && t.date.startsWith(month) && t.type === 'Expense').forEach(t => {
    const day = parseInt(t.date.slice(8), 10);
    map[day] = (map[day] || 0) + t.amount;
  });
  const daysInMonth = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5)), 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: map[i + 1] || 0 }));
}

export default function Finance() {
  const { transactions, budgets = [] } = useStore(selectFinance);
  const addTransaction = useStore(selectAddTransaction);
  const deleteTransaction = useStore(selectDeleteTransaction);
  const addBudget = useStore(selectAddBudget);
  const deleteBudget = useStore(selectDeleteBudget);
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [budgetForm, setBudgetForm] = useState({ category: '', limit_amount: '' });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState('Overview');
  const [trendWindow, setTrendWindow] = useState(6);

  const subs = useStore(s => s.subscriptions);
  const addSubscription = useStore(s => s.addSubscription);
  const deleteSubscription = useStore(s => s.deleteSubscription);
  const [showAddSub, setShowAddSub] = useState(false);
  const [subForm, setSubForm] = useState({ name: '', cost: '', category: 'OTT', next_date: '', icon: '🍿', auto_renew: 1 });

  const [csvUploading, setCsvUploading] = useState(false);
  const [axioSyncing, setAxioSyncing] = useState(false);
  const [axioLastSync, setAxioLastSync] = useState(null);

  const filteredTransactions = useMemo(() =>
    transactions.filter(t => t.date && t.date.startsWith(selectedMonth)),
  [transactions, selectedMonth]);

  const { income, expenses, investments, balance, pieData, methodData } = useMemo(() => {
    let inc = 0, exp = 0, inv = 0;
    const catMap = {}, methodMap = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'Income') inc += t.amount;
      else if (t.type === 'Expense') {
        exp += t.amount;
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        methodMap[t.method || 'Unknown'] = (methodMap[t.method || 'Unknown'] || 0) + t.amount;
      }
      else if (t.type === 'Investment') inv += t.amount;
    });
    return {
      income: inc, expenses: exp, investments: inv, balance: inc - exp - inv,
      pieData: Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      methodData: Object.entries(methodMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
    };
  }, [filteredTransactions]);

  const statCards = useMemo(() => [
    { label: 'Net Monthly Balance', value: fmtINR(balance), icon: Wallet, color: balance >= 0 ? 'var(--success)' : 'var(--danger)' },
    { label: 'Total Income', value: '+' + fmtINR(income), icon: ArrowUpRight, color: 'var(--success)' },
    { label: 'Total Expenses', value: '-' + fmtINR(expenses), icon: ArrowDownRight, color: 'var(--danger)' },
    { label: 'Invested / Saved', value: fmtINR(investments), icon: TrendingUp, color: 'var(--info)' },
  ], [balance, income, expenses, investments]);

  // Multi-month trend data
  const trendMonths = useMemo(() => lastNMonths(trendWindow), [trendWindow]);
  const trendData = useMemo(() => buildTrendData(transactions, trendMonths), [transactions, trendMonths]);

  // Day heatmap data
  const dayHeatmapData = useMemo(() => buildDayHeatmap(transactions, selectedMonth), [transactions, selectedMonth]);
  const maxDaySpend = useMemo(() => Math.max(...dayHeatmapData.map(d => d.amount), 1), [dayHeatmapData]);

  // Savings rate
  const savingsRate = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : '0.0';

  // Budget breach alerts
  const budgetAlerts = useMemo(() => {
    return budgets.filter(b => {
      const actual = pieData.find(d => d.name === b.category)?.value || 0;
      return actual >= b.limit_amount * 0.8;
    }).map(b => {
      const actual = pieData.find(d => d.name === b.category)?.value || 0;
      return { ...b, actual, pct: Math.round((actual / b.limit_amount) * 100) };
    });
  }, [budgets, pieData]);

  const handleAdd = useCallback(() => {
    if (!form.category) return toast.error('Please select a category.');
    if (!form.method) return toast.error('Please select a payment method.');
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) return toast.error('Amount must be greater than ₹0.');
    addTransaction({ ...form, amount: amt, id: Date.now().toString() });
    setForm(EMPTY_FORM);
    toast.success(`${form.type} added successfully.`);
  }, [form, addTransaction, toast]);

  const handleDeleteTransaction = useCallback((id) => {
    const txToRestore = transactions.find(t => t.id === id);
    deleteTransaction(id);
    toast.info('Transaction deleted', 5000, {
      action: { label: 'Undo', onClick: () => { if (txToRestore) addTransaction(txToRestore); } }
    });
  }, [transactions, deleteTransaction, addTransaction, toast]);

  const handleDeleteBudget = useCallback((id) => {
    const bToRestore = budgets.find(t => t.id === id);
    deleteBudget(id);
    toast.info('Budget deleted', 5000, {
      action: { label: 'Undo', onClick: () => { if (bToRestore) addBudget(bToRestore); } }
    });
  }, [budgets, deleteBudget, addBudget, toast]);

  const handleDeleteSubscription = useCallback((id) => {
    const subToRestore = subs.find(t => t.id === id);
    deleteSubscription(id);
    toast.info('Subscription deleted', 5000, {
      action: { label: 'Undo', onClick: () => { if (subToRestore) addSubscription(subToRestore); } }
    });
  }, [subs, deleteSubscription, addSubscription, toast]);

  const handleCsvImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please upload a .csv file'); return; }
    setCsvUploading(true);
    try {
      const text = await file.text();
      const res = await apiSync('/finance/import/csv', 'POST', { content: text });
      toast.success(`Imported ${res?.imported || 0} transactions from CSV`);
    } catch { toast.error('CSV import failed'); }
    setCsvUploading(false);
    event.target.value = '';
  };

  const handleAxioSync = async () => {
    setAxioSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    setAxioLastSync(new Date().toLocaleTimeString());
    setAxioSyncing(false);
    toast.success('Axio sync complete — 0 new transactions (SMS parsing not yet live).');
  };

  const handleCsvExport = () => window.open(`${API_BASE}/api/finance/export`, '_blank');

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Wealth Engine</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Financial Command</h2>
          <p className="text-secondary">Track Axio, Slice, UPI, and bank flow month-to-month.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={handleCsvExport} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
            <ArrowDownRight size={14} style={{ marginRight: '6px' }} />CSV EXPORT
          </button>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="form-input" style={{ fontWeight: 800, color: 'var(--accent)', borderColor: 'var(--accent)' }} />
        </div>
      </div>

      {/* Budget breach alerts */}
      {budgetAlerts.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {budgetAlerts.map(b => (
            <div key={b.id} style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', background: b.pct >= 100 ? 'rgba(244,63,94,0.12)' : 'rgba(245,158,11,0.1)', border: `1px solid ${b.pct >= 100 ? 'rgba(244,63,94,0.4)' : 'rgba(245,158,11,0.4)'}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{b.pct >= 100 ? '🚨' : '⚠️'}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                {b.category}: {fmtINR(b.actual)} / {fmtINR(b.limit_amount)} ({b.pct}%)
                {b.pct >= 100 ? ' — BUDGET BREACHED' : ' — approaching limit'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {['Overview', 'Analytics', 'Trends', 'Budgeting', 'Subscriptions', 'Planning', 'Sync'].map(tab => (
          <button key={tab} className={`btn-sm ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)} style={{ padding: '0.6rem 1.5rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {tab === 'Overview' && <Wallet size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Analytics' && <BarChart2 size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Trends' && <LineIcon size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Budgeting' && <Activity size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Subscriptions' && <Calendar size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Planning' && <TrendingUp size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Sync' && <CreditCard size={14} style={{ marginRight: '6px' }} />}
            {tab}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'Overview' && (
        <>
          <div className="stats-grid mb-lg">
            {statCards.map((c) => <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />)}
          </div>

          {/* Savings Rate pill */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem 1.25rem', borderRadius: '30px', background: parseFloat(savingsRate) >= 20 ? 'rgba(16,185,129,0.15)' : parseFloat(savingsRate) >= 0 ? 'rgba(245,158,11,0.12)' : 'rgba(244,63,94,0.12)', border: `1px solid ${parseFloat(savingsRate) >= 20 ? 'rgba(16,185,129,0.4)' : parseFloat(savingsRate) >= 0 ? 'rgba(245,158,11,0.3)' : 'rgba(244,63,94,0.3)'}` }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                💰 Savings Rate: {savingsRate}%
                {parseFloat(savingsRate) >= 30 ? ' 🔥 Excellent!' : parseFloat(savingsRate) >= 20 ? ' ✅ On track' : parseFloat(savingsRate) >= 0 ? ' ⚠️ Below 20% target' : ' 🚨 Overspending'}
              </span>
            </div>
          </div>

          <div className="dual-grid mb-lg">
            <div className="glass-card">
              <div className="card-header-row" style={{ marginBottom: '1.5rem' }}>
                <CreditCard size={18} color="var(--accent)" />
                <span className="card-title" style={{ margin: 0 }}>Spending by Method</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {methodData.length === 0
                  ? <EmptyState icon={CreditCard} title="No Spends" description="No expense data recorded for this month yet." />
                  : methodData.map((d, i) => (
                    <div key={d.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{d.name}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{fmtINR(d.value)}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${(d.value / expenses) * 100}%`, height: '100%', background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="glass-card">
              <span className="card-title">New Log</span>
              <div className="form-stack mt-sm">
                <div className="btn-group">
                  {['Expense', 'Income', 'Investment'].map((type) => (
                    <button key={type} onClick={() => setForm({ ...form, type })} className={form.type === type ? 'btn-primary' : 'btn-ghost'} style={{ flex: 1, padding: '0.55rem', fontSize: '0.78rem' }}>{type}</button>
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
                <input type="text" placeholder="Description / Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="form-input" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
                <button onClick={handleAdd} className="btn-primary btn-full"><Plus size={16} /> ADD LEDGER ENTRY</button>
              </div>
            </div>
          </div>

          {/* Day Spend Heatmap */}
          <div className="glass-card mb-lg">
            <span className="card-title">Daily Spend Heatmap — {selectedMonth}</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Each cell = 1 day. Darker = higher spend.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {dayHeatmapData.map(d => {
                const intensity = d.amount / maxDaySpend;
                const bg = d.amount === 0 ? 'var(--bg-elevated)' : `rgba(244,63,94,${0.15 + intensity * 0.75})`;
                return (
                  <div key={d.day} title={`Day ${d.day}: ${fmtINR(d.amount)}`} style={{ width: '36px', height: '36px', borderRadius: '6px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: intensity > 0.5 ? '#fff' : 'var(--text-2)', cursor: 'default', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    {d.day}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card">
            <span className="card-title">Ledger: {selectedMonth}</span>
            <div className="item-list mt-sm">
              {filteredTransactions.length === 0 && (
                <EmptyState 
                  icon={Wallet} 
                  title="No Transactions" 
                  description="No transactions found for this month. Start by adding a new ledger entry." 
                />
              )}
              {[...filteredTransactions].sort((a,b) => new Date(b.date) - new Date(a.date)).map((tx) => (
                <div key={tx.id} className="list-row" style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1.5fr 1fr 40px', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 800 }}>{tx.date}</div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '0.95rem' }}>{tx.category}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '2px' }}>{tx.note}</p>
                  </div>
                  <div style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--bg-elevated)', borderRadius: '4px', width: 'fit-content' }}>💳 {tx.method}</div>
                  <div style={{ fontWeight: 900, textAlign: 'right', color: tx.type === 'Income' ? 'var(--success)' : tx.type === 'Expense' ? 'var(--danger)' : 'var(--info)' }}>
                    {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}{fmtINR(tx.amount)}
                  </div>
                  <button onClick={() => handleDeleteTransaction(tx.id)} className="btn-icon btn-icon--danger" style={{ marginLeft: 'auto' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── ANALYTICS ── */}
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
                  {d.name} ({Math.round((d.value/(expenses||1))*100)}%)
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <h3 className="card-title"><BarChart2 size={18}/> Spend Velocity</h3>
            <div style={{ height: '300px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pieData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip cursor={{ fill: 'var(--bg-elevated)' }} contentStyle={TOOLTIP_STYLE} formatter={(val) => fmtINR(val)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {pieData.slice(0, 8).map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── TRENDS (new tab) ── */}
      {activeTab === 'Trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Window selector */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 700 }}>WINDOW:</span>
            {[3, 6, 12].map(n => (
              <button key={n} className={`btn-sm ${trendWindow === n ? 'active' : ''}`} onClick={() => setTrendWindow(n)} style={{ padding: '0.35rem 1rem', fontSize: '0.78rem' }}>{n}M</button>
            ))}
          </div>

          {/* Multi-month income vs expense vs savings area chart */}
          <div className="glass-card">
            <h3 className="card-title"><LineIcon size={18}/> Income vs Expenses vs Savings — {trendWindow}-Month Trend</h3>
            <div style={{ height: '320px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val, name) => [fmtINR(val), name.charAt(0).toUpperCase() + name.slice(1)]} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#colorIncome)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fill="url(#colorExpenses)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="savings" stroke="#0ea5e9" fill="url(#colorSavings)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly savings rate bar */}
          <div className="glass-card">
            <h3 className="card-title">Monthly Savings Rate %</h3>
            <div style={{ height: '220px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData.map(d => ({ month: d.month, rate: d.income > 0 ? parseFloat(((d.income - d.expenses) / d.income * 100).toFixed(1)) : 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [`${val}%`, 'Savings Rate']} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {trendData.map((d, idx) => {
                      const rate = d.income > 0 ? (d.income - d.expenses) / d.income * 100 : 0;
                      return <Cell key={idx} fill={rate >= 20 ? '#10b981' : rate >= 0 ? '#f59e0b' : '#f43f5e'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.5rem', textAlign: 'center' }}>🟢 ≥20% good · 🟡 0-20% caution · 🔴 negative = overspending</p>
          </div>

          {/* Investment accumulation */}
          <div className="glass-card">
            <h3 className="card-title">Cumulative Investments</h3>
            <div style={{ height: '200px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(() => { let cum = 0; return trendData.map(d => { cum += d.investments; return { month: d.month, cumulative: cum }; }); })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [fmtINR(val), 'Cumulative Invested']} />
                  <Area type="monotone" dataKey="cumulative" stroke="#8b5cf6" fill="rgba(139,92,246,0.2)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── BUDGETING ── */}
      {activeTab === 'Budgeting' && (
        <div className="glass-card">
          <h3 className="card-title"><Activity size={18}/> Zero-Based Budgeting Matrix</h3>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '2rem' }}>Allocate every rupee. Green = under budget, Red = breached.</p>
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
              } else toast.error('Category and limit required');
            }}><Plus size={16}/> ADD BUDGET</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>ACTIVE BUDGETS</h4>
              {budgets.length === 0
                ? <EmptyState icon={Activity} title="No Budgets" description="No budgets defined. Add one above to start tracking." />
                : budgets.map(b => {
                  const actual = pieData.find(d => d.name === b.category)?.value || 0;
                  return renderBudgetRow({ id: b.id, name: b.category, actual, limit: b.limit_amount, onDelete: () => handleDeleteBudget(b.id) });
                })}
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', color: '#22d3ee', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>BUDGET INSIGHTS</h4>
              <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Total limits: <strong>{fmtINR(budgets.reduce((a, b) => a + b.limit_amount, 0))}</strong><br/>
                  Total expenses: <strong>{fmtINR(expenses)}</strong>
                </p>
                {(() => {
                  const totalLimits = budgets.reduce((a, b) => a + b.limit_amount, 0);
                  if (!totalLimits) return null;
                  const ratio = expenses / totalLimits;
                  if (ratio > 1) return <p style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 700 }}>⚠️ You have exceeded your total defined budgets!</p>;
                  if (ratio >= 0.8) return <p style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 700 }}>⚠️ Warning: {(ratio * 100).toFixed(0)}% of budget consumed.</p>;
                  return <p style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>✅ Within total defined budgets.</p>;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTIONS ── */}
      {activeTab === 'Subscriptions' && (
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
                    <button onClick={() => handleDeleteSubscription(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.7rem' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>[Delete]</button>
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
      )}

      {activeTab === 'Planning' && <div className="fade-in"><SIPCalculator /></div>}

      {/* ── SYNC ── */}
      {activeTab === 'Sync' && (
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h3 className="text-display" style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>Open Banking & App Sync</h3>
            <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto' }}>GrowthTrack uses secure read-only access to aggregate your financial telemetry from Indian FinTech apps.</p>
          </div>
          <div style={{ padding: '2rem', marginBottom: '2.5rem', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(255,92,53,0.12), transparent)', border: '1px solid rgba(255,92,53,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#ff5c35', marginBottom: '6px' }}>Axio (Expense Manager)</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', maxWidth: '420px' }}>Auto-scrapes SMS and bank notifications to pull Axio-tracked spends directly into your ledger.<br/><span style={{ color: 'rgba(255,92,53,0.7)', fontSize: '0.75rem' }}>⚡ SMS parsing is in beta — CSV import is the primary path for now.</span></p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {axioLastSync && <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '8px' }}>Last sync: {axioLastSync}</p>}
                <button className="btn-primary" style={{ background: '#ff5c35', border: 'none', color: '#fff', opacity: axioSyncing ? 0.7 : 1 }} onClick={handleAxioSync} disabled={axioSyncing}>
                  {axioSyncing ? '⟳ SYNCING…' : '⚡ SYNC AXIO NOW'}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {[{ name: 'BHIM / UPI Apps', color: '#0ea5e9', desc: 'Sync GPay, PhonePe, and PayTM flow.' }, { name: 'Slice / Uni Card', color: '#8b5cf6', desc: 'Direct API sync for credit lines.' }, { name: 'Roarbank (Neobank)', color: '#f59e0b', desc: 'Real-time settlement data.' }, { name: 'HDFC / SBI NetBanking', color: '#10b981', desc: 'Secure bank statement parsing.' }].map(p => (
              <div key={p.name} style={{ border: `1px solid ${p.color}33`, padding: '1.5rem', borderRadius: '20px', background: `linear-gradient(135deg, ${p.color}08, transparent)`, display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.3s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = 'translateY(-4px)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = `${p.color}33`; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <h4 style={{ fontWeight: 800, fontSize: '1rem', color: p.color }}>{p.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.4 }}>{p.desc}</p>
                <button className="btn-ghost" style={{ width: '100%', borderColor: p.color, color: p.color, fontSize: '0.7rem' }} onClick={() => toast.success(`${p.name} sync initiated.`)}>AUTHORIZE CONNECTION</button>
              </div>
            ))}
          </div>
          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--border-strong)', textAlign: 'center', padding: '2rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: '1rem' }}>Missing an app? Import via CSV — supports 200+ Indian financial institutions.</p>
            <label className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={16} /> {csvUploading ? 'IMPORTING…' : 'UPLOAD BANK STATEMENT (.CSV)'}
              <input type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} />
            </label>
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
          <span style={{ color: isOver ? 'var(--danger)' : 'var(--text-1)', fontWeight: 800 }}>{fmtINR(actual)}</span>
          <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>/</span>
          <span>{fmtINR(limit)}</span>
          {onDelete && <button onClick={onDelete} className="btn-icon" style={{ marginLeft: '8px', color: 'var(--text-3)', padding: '2px' }} onMouseEnter={e => e.currentTarget.style.color='var(--danger)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}><Trash2 size={12}/></button>}
        </div>
      </div>
      <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: isOver ? 'var(--danger)' : actual / limit >= 0.8 ? 'var(--warning)' : 'var(--success)', transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}
