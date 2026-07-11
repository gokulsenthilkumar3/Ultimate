import React from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2, Upload, LineChart as LineIcon, ListTodo } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';


export default function AnalyticsTab({ COLORS, fmtINR, form, pieData, TOOLTIP_STYLE, expenses }) {
  {/* ── ANALYTICS ── */}
      return (
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
  );
}
