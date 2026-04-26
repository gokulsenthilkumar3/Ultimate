import React, { useState, useMemo, useCallback } from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2 } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import useStore, {
  selectFinance,
  selectAddTransaction,
  selectDeleteTransaction,
} from '../store/useStore';
import { useToast } from '../hooks/useToast';
import StatCard from './ui/StatCard';
import PageHeader from './ui/PageHeader';

const CURRENCY = '₹';
const fmtINR = (n) => CURRENCY + Number(n).toLocaleString('en-IN');

const CATEGORIES = ['Gym', 'Supplements', 'Food', 'Apparel', 'Equipment', 'Salary', 'Stocks', 'Crypto', 'Rent', 'Utilities', 'Transport', 'Medical'];
const COLORS = ['#10b981', '#f43f5e', '#0ea5e9', '#8b5cf6', '#e5a50a', '#ec4899'];
const TOOLTIP_STYLE = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-1)',
  backdropFilter: 'blur(12px)', fontSize: '0.82rem',
};

const EMPTY_FORM = { type: 'Expense', category: '', amount: '', note: '' };

export default function Finance() {
  // ── Zustand (persisted — no more data loss on tab switch)
  const { transactions } = useStore(selectFinance);
  const addTransaction    = useStore(selectAddTransaction);
  const deleteTransaction = useStore(selectDeleteTransaction);
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);

  // ── #9 useMemo: only recalculate when transactions array changes
  const { income, expenses, investments, balance, chartData } = useMemo(() => {
    const income      = transactions.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const expenses    = transactions.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const investments = transactions.filter((t) => t.type === 'Investment').reduce((s, t) => s + t.amount, 0);
    const balance     = income - expenses - investments;
    const chartData   = [
      { name: 'Income', value: income },
      { name: 'Expenses', value: expenses },
      { name: 'Investments', value: investments },
    ].filter((d) => d.value > 0);
    return { income, expenses, investments, balance, chartData };
  }, [transactions]);

  // ── Stat card config
  const statCards = useMemo(() => [
    { label: 'Total Balance',  value: fmtINR(balance),      icon: Wallet,        color: balance >= 0 ? 'var(--success)' : 'var(--danger)' },
    { label: 'Income',         value: '+' + fmtINR(income),  icon: ArrowUpRight,  color: 'var(--success)' },
    { label: 'Expenses',       value: '-' + fmtINR(expenses), icon: ArrowDownRight,color: 'var(--danger)' },
    { label: 'Investments',    value: fmtINR(investments),   icon: TrendingUp,    color: 'var(--info)' },
  ], [balance, income, expenses, investments]);

  // ── #2 Validated add with toast feedback
  const handleAdd = useCallback(() => {
    if (!form.category) {
      toast.error('Please select a category.');
      return;
    }
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      toast.error('Amount must be greater than ₹0.');
      return;
    }
    addTransaction({ ...form, amount: amt });
    setForm(EMPTY_FORM);
    toast.success(`${form.type} of ${fmtINR(amt)} added.`);
  }, [form, addTransaction, toast]);

  const handleDelete = useCallback((id) => {
    deleteTransaction(id);
    toast.info('Transaction removed.');
  }, [deleteTransaction, toast]);

  return (
    <div className="fade-in module-page">
      {/* #7 PageHeader sub-component */}
      <PageHeader
        accent="Finance"
        icon={<IndianRupee size={24} />}
        title="Finance Dashboard"
        subtitle="Manage your budget, income, and investments"
      />

      {/* Stats Grid — #7 StatCard sub-component */}
      <div className="stats-grid mb-lg">
        {statCards.map((c) => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />
        ))}
      </div>

      <div className="dual-grid mb-lg">
        {/* Pie Chart */}
        <div className="glass-card">
          <div className="card-header-row">
            <PieChart size={18} color="var(--accent)" />
            <span className="card-title" style={{ margin: 0 }}>Allocation</span>
          </div>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={chartData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => fmtINR(val)} contentStyle={TOOLTIP_STYLE} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-row">
            {chartData.map((d, i) => (
              <div key={d.name} className="legend-item">
                <div className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        {/* Add Transaction */}
        <div className="glass-card">
          <span className="card-title">Add Transaction</span>
          <div className="form-stack mt-sm">
            <div className="btn-group">
              {['Expense', 'Income', 'Investment'].map((type) => (
                <button
                  key={type}
                  onClick={() => setForm({ ...form, type })}
                  className={form.type === type ? 'btn-primary' : 'btn-ghost'}
                  style={{ flex: 1, padding: '0.55rem', fontSize: '0.78rem' }}
                >
                  {type}
                </button>
              ))}
            </div>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="form-input">
              <option value="">Select Category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              placeholder="Amount (₹)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="form-input"
              min="0"
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="form-input"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button onClick={handleAdd} className="btn-primary btn-full">
              <Plus size={16} /> Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card">
        <span className="card-title">Recent History</span>
        <div className="item-list mt-sm">
          {transactions.length === 0 && (
            <p className="empty-msg">No transactions yet. Add your first one above.</p>
          )}
          {[...transactions].reverse().map((tx) => (
            <div key={tx.id} className="list-row">
              <div>
                <p className="list-row__title">{tx.category}</p>
                <p className="list-row__sub">{tx.date}{tx.note ? ` · ${tx.note}` : ''}</p>
              </div>
              <div className="list-row__actions">
                <span
                  className="list-row__amount"
                  style={{
                    color: tx.type === 'Income' ? 'var(--success)' : tx.type === 'Expense' ? 'var(--danger)' : 'var(--info)',
                  }}
                >
                  {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}{fmtINR(tx.amount)}
                </span>
                <button onClick={() => handleDelete(tx.id)} className="btn-icon btn-icon--danger" aria-label="Delete transaction">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
