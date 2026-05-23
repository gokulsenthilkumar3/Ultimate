import React from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2, Upload, LineChart as LineIcon, ListTodo } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';


export default function OverviewTab({ statCards, savingsRate, methodData, COLORS, fmtINR, form, setForm, CATEGORIES, PAYMENT_METHODS, handleAdd, dayHeatmapData, maxDaySpend, filteredTransactions, handleDeleteTransaction, expenses }) {
  {/* ── OVERVIEW ── */}
      return (
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
                  <div key={d.day} title={`Day ${d.day}: ${fmtINR(d.amount)}`} className="hover-scale-115" style={{ width: '36px', height: '36px', borderRadius: '6px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: intensity > 0.5 ? '#fff' : 'var(--text-2)', cursor: 'default', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.15s' }}>
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
  );
}
