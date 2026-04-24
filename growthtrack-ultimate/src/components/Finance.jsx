import React, { useState } from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2 } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CURRENCY = '₹';
const fmtINR = (n) => CURRENCY + n.toLocaleString('en-IN');

const Finance = () => {
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'Expense', category: 'Gym', amount: 2500, date: '2026-04-20', note: 'Monthly membership' },
    { id: 2, type: 'Expense', category: 'Supplements', amount: 4800, date: '2026-04-21', note: 'Protein & Creatine' },
    { id: 3, type: 'Income', category: 'Salary', amount: 85000, date: '2026-04-01', note: 'Monthly pay' },
    { id: 4, type: 'Investment', category: 'Stocks', amount: 15000, date: '2026-04-15', note: 'Nifty 50 Index' },
  ]);

  const [newTx, setNewTx] = useState({ type: 'Expense', category: '', amount: 0, note: '' });

  const categories = ['Gym', 'Supplements', 'Food', 'Apparel', 'Equipment', 'Salary', 'Stocks', 'Crypto', 'Rent', 'Utilities', 'Transport', 'Medical'];
  const colors = ['#10b981', '#f43f5e', '#0ea5e9', '#8b5cf6', '#e5a50a', '#ec4899'];

  const income = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
  const investments = transactions.filter(t => t.type === 'Investment').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses - investments;

  const chartData = [
    { name: 'Income', value: income },
    { name: 'Expenses', value: expenses },
    { name: 'Investments', value: investments },
  ].filter(d => d.value > 0);

  const addTransaction = () => {
    if (newTx.category && newTx.amount > 0) {
      setTransactions([...transactions, { ...newTx, id: Date.now(), date: new Date().toISOString().split('T')[0] }]);
      setNewTx({ type: 'Expense', category: '', amount: 0, note: '' });
    }
  };

  const deleteTransaction = (id) => setTransactions(transactions.filter(t => t.id !== id));

  const statCards = [
    { label: 'Total Balance', value: fmtINR(balance), icon: Wallet, positive: balance >= 0, color: balance >= 0 ? 'var(--success)' : 'var(--danger)' },
    { label: 'Income', value: '+' + fmtINR(income), icon: ArrowUpRight, positive: true, color: 'var(--success)' },
    { label: 'Expenses', value: '-' + fmtINR(expenses), icon: ArrowDownRight, positive: false, color: 'var(--danger)' },
    { label: 'Investments', value: fmtINR(investments), icon: TrendingUp, positive: true, color: 'var(--info)' },
  ];

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Finance</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
          <IndianRupee size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
          Finance Dashboard
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Manage your budget, income, and investments</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <Icon size={16} color={c.color} />
                <span className="label-caps">{c.label}</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: c.color }}>
                {c.value}
              </p>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Pie Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <PieChart size={18} color="var(--accent)" />
            <span className="card-title" style={{ margin: 0 }}>Allocation</span>
          </div>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={chartData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={colors[idx % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => fmtINR(val)}
                  contentStyle={{
                    background: 'var(--bg-glass)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-1)',
                    backdropFilter: 'blur(12px)', fontSize: '0.82rem',
                  }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {chartData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-2)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[i % colors.length] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        {/* Add Transaction */}
        <div className="glass-card">
          <span className="card-title">Add Transaction</span>
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['Expense', 'Income', 'Investment'].map(type => (
                <button key={type} onClick={() => setNewTx({ ...newTx, type })}
                  className={newTx.type === type ? 'btn-primary' : 'btn-ghost'}
                  style={{ flex: 1, padding: '0.55rem', fontSize: '0.78rem' }}>
                  {type}
                </button>
              ))}
            </div>
            <select value={newTx.category} onChange={(e) => setNewTx({ ...newTx, category: e.target.value })} className="form-input">
              <option value="">Select Category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Amount (₹)" value={newTx.amount || ''}
              onChange={(e) => setNewTx({ ...newTx, amount: parseFloat(e.target.value) || 0 })}
              className="form-input" />
            <input type="text" placeholder="Note (optional)" value={newTx.note}
              onChange={(e) => setNewTx({ ...newTx, note: e.target.value })}
              className="form-input" />
            <button onClick={addTransaction} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={16} /> Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="glass-card">
        <span className="card-title">Recent History</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {[...transactions].reverse().map(tx => (
            <div key={tx.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              transition: 'all 0.2s ease',
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-1)' }}>{tx.category}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px' }}>{tx.date} · {tx.note}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontWeight: 700, fontSize: '0.9rem',
                  color: tx.type === 'Income' ? 'var(--success)' : tx.type === 'Expense' ? 'var(--danger)' : 'var(--info)',
                }}>
                  {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}{fmtINR(tx.amount)}
                </span>
                <button onClick={() => deleteTransaction(tx.id)}
                  style={{ background: 'rgba(248,113,113,0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '6px', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Finance;
