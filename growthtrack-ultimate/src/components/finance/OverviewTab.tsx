import React from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2, Upload, LineChart as LineIcon, ListTodo } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';


export default function OverviewTab({ statCards, savingsRate, methodData, COLORS, fmtINR, form, setForm, CATEGORIES, PAYMENT_METHODS, handleAdd, dayHeatmapData, maxDaySpend, filteredTransactions, handleDeleteTransaction, expenses, selectedMonth }) {
  {/* ── OVERVIEW ── */}
      return (
    <>
          <div className="stats-grid mb-lg">
            {statCards.map((c) => <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />)}
          </div>

          {/* Savings Rate pill */}
          <div className="finance-overview-savings-rate-container">
            <div className={`finance-overview-savings-rate ${parseFloat(savingsRate) >= 20 ? 'finance-savings-good' : parseFloat(savingsRate) >= 0 ? 'finance-savings-warn' : 'finance-savings-danger'}`}>
              <span>
                💰 Savings Rate: {savingsRate}%
                {parseFloat(savingsRate) >= 30 ? ' 🔥 Excellent!' : parseFloat(savingsRate) >= 20 ? ' ✅ On track' : parseFloat(savingsRate) >= 0 ? ' ⚠️ Below 20% target' : ' 🚨 Overspending'}
              </span>
            </div>
          </div>

          <div className="dual-grid mb-lg">
            <div className="glass-card">
              <div className="card-header-row finance-overview-card-header">
                <CreditCard size={18} color="var(--accent)" />
                <span className="card-title finance-overview-card-title">Spending by Method</span>
              </div>
              <div className="finance-overview-spending-list">
                {methodData.length === 0
                  ? <EmptyState icon={CreditCard as any} title="No Spends" description="No expense data recorded for this month yet." />
                  : methodData.map((d, i) => {
                    const barStyle = { width: `${(d.value / expenses) * 100}%`, background: COLORS[i % COLORS.length] };
                    return (
                    <div key={d.name}>
                      <div className="finance-overview-spending-item-header">
                        <span className="finance-overview-spending-item-name">{d.name}</span>
                        <span className="finance-overview-spending-item-value">{fmtINR(d.value)}</span>
                      </div>
                      <div className="finance-overview-spending-bar-container">
                        <div className="finance-overview-spending-bar" ref={el => { if (el) { el.style.width = `${(d.value / expenses) * 100}%`; el.style.background = COLORS[i % COLORS.length]; } }} />
                      </div>
                    </div>
                  )})}
              </div>
            </div>

            <div className="glass-card">
              <span className="card-title">New Log</span>
              <div className="form-stack mt-sm">
                <div className="btn-group">
                  {['Expense', 'Income', 'Investment'].map((type) => (
                    <button key={type} onClick={() => setForm({ ...form, type })} className={`finance-overview-type-btn ${form.type === type ? 'btn-primary' : 'btn-ghost'}`}>{type}</button>
                  ))}
                </div>
                <div className="finance-overview-form-grid">
                  <select title="Select Category" aria-label="Select Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="form-input">
                    <option value="">Category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select title="Select Method" aria-label="Select Method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="form-input">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="finance-overview-form-grid">
                  <input type="date" title="Select Date" aria-label="Select Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
                  <input type="number" title="Amount" placeholder="Amount (₹)" aria-label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="form-input" min="0" />
                </div>
                <input type="text" placeholder="Description / Note" title="Description / Note" aria-label="Description / Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="form-input" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
                <button title="Add Ledger Entry" aria-label="Add Ledger Entry" onClick={handleAdd} className="btn-primary btn-full"><Plus size={16} /> ADD LEDGER ENTRY</button>
              </div>
            </div>
          </div>

          {/* Day Spend Heatmap */}
          <div className="glass-card mb-lg">
            <span className="card-title">Daily Spend Heatmap — {selectedMonth}</span>
            <p className="finance-overview-heatmap-subtitle">Each cell = 1 day. Darker = higher spend.</p>
            <div className="finance-overview-heatmap-grid">
              {dayHeatmapData.map(d => {
                const intensity = d.amount / maxDaySpend;
                return (
                  <div key={d.day} title={`Day ${d.day}: ${fmtINR(d.amount)}`} className="hover-scale-115 finance-overview-heatmap-cell" ref={el => { if (el) { el.style.background = d.amount === 0 ? 'var(--bg-elevated)' : `rgba(244,63,94,${0.15 + intensity * 0.75})`; el.style.color = intensity > 0.5 ? '#fff' : 'var(--text-2)'; } }}>
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
                  icon={Wallet as any}
                  title="No Transactions" 
                  description="No transactions found for this month. Start by adding a new ledger entry." 
                />
              )}
              {[...filteredTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                <div key={tx.id} className="list-row finance-overview-ledger-row">
                  <div className="finance-overview-ledger-date">{tx.date}</div>
                  <div>
                    <p className="finance-overview-ledger-category">{tx.category}</p>
                    <p className="finance-overview-ledger-note">{tx.note}</p>
                  </div>
                  <div className="finance-overview-ledger-method">💳 {tx.method}</div>
                  <div className={`finance-overview-ledger-amount ${tx.type === 'Income' ? 'finance-text-income' : tx.type === 'Expense' ? 'finance-text-expense' : 'finance-text-invest'}`}>
                    {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}{fmtINR(tx.amount)}
                  </div>
                  <button title="Delete transaction" aria-label="Delete transaction" onClick={() => handleDeleteTransaction(tx.id)} className="btn-icon btn-icon--danger finance-overview-ledger-delete"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </>
  );
}
