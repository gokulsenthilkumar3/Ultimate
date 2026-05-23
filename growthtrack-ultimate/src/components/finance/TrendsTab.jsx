import React from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2, Upload, LineChart as LineIcon, ListTodo } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';


export default function TrendsTab({ fmtINR, form, TOOLTIP_STYLE, trendWindow, setTrendWindow, trendData, expenses }) {
  {/* ── TRENDS (new tab) ── */}
      return (
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
  );
}
