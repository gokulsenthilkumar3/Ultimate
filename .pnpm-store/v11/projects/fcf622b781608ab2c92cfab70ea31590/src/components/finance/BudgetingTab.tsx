import React from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2, Upload, LineChart as LineIcon, ListTodo } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';


export default function BudgetingTab({ fmtINR, form, CATEGORIES, pieData, budgetForm, setBudgetForm, addBudget, budgets, expenses, renderBudgetRow, handleDeleteBudget }) {
  {/* ── BUDGETING ── */}
      return (
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
  );
}
