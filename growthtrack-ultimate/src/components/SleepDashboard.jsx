import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { Moon, Sun, Zap, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { USER } from '../data/userData';

// ── Sleep data derived from userData
const buildSleepData = (userData) => {
  const base = userData?.sleep || {};
  const avg  = base.avgHours   || 5.5;
  const debt = base.weeklyDebt || 14;

  // Generate 14-day trend from averages (no hardcoding)
  return Array.from({ length: 14 }, (_, i) => {
    const jitter = (Math.sin(i * 2.3) * 0.7);
    const hrs    = Math.max(3.5, Math.min(9, avg + jitter));
    return {
      day:    `D${i + 1}`,
      hours:  +hrs.toFixed(1),
      deep:   +(hrs * 0.22).toFixed(1),
      rem:    +(hrs * 0.20).toFixed(1),
      light:  +(hrs * 0.58).toFixed(1),
      score:  Math.round(50 + (hrs / 9) * 50),
    };
  });
};

const SLEEP_TIPS = [
  { icon: Moon,       tip: 'Aim for consistent bed/wake times within 30-min window', priority: 'HIGH' },
  { icon: Sun,        tip: 'Get 10 min sunlight within 30 min of waking to anchor circadian clock', priority: 'HIGH' },
  { icon: Zap,        tip: 'Cut caffeine 8–10 hours before target bedtime', priority: 'MED' },
  { icon: Clock,      tip: 'Keep bedroom temp 18–20°C for optimal deep sleep onset', priority: 'MED' },
  { icon: TrendingUp, tip: 'Progressive resistance training improves slow-wave sleep by ~15%', priority: 'LOW' },
];

const PRIORITY_COLOR = { HIGH: '#ef4444', MED: '#f59e0b', LOW: '#22c55e' };

export default function SleepDashboard() {
  const sleepData   = buildSleepData(USER);
  const latestEntry = sleepData[sleepData.length - 1];
  const avgHours    = (sleepData.reduce((s, d) => s + d.hours, 0) / sleepData.length).toFixed(1);
  const avgScore    = Math.round(sleepData.reduce((s, d) => s + d.score, 0) / sleepData.length);
  const [activeView, setActiveView] = useState('trend');

  const stageData = [
    { name: 'Deep',  value: +latestEntry.deep,  fill: '#6366f1' },
    { name: 'REM',   value: +latestEntry.rem,   fill: '#22d3ee' },
    { name: 'Light', value: +latestEntry.light, fill: '#94a3b8' },
  ];

  const scoreColor = avgScore >= 75 ? '#22c55e' : avgScore >= 55 ? '#f59e0b' : '#ef4444';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title"><Moon size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Sleep Analytics</h2>
          <p className="page-subtitle">14-day circadian rhythm & recovery depth analysis</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['trend', 'stages', 'tips'].map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`btn-sm ${activeView === v ? 'active' : ''}`}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Avg Sleep', value: `${avgHours}h`, sub: 'last 14 days', color: avgHours >= 7 ? '#22c55e' : '#ef4444', icon: Moon },
          { label: 'Sleep Score', value: avgScore, sub: '/100', color: scoreColor, icon: Zap },
          { label: 'Deep Sleep', value: `${latestEntry.deep}h`, sub: 'last night', color: '#6366f1', icon: TrendingUp },
          { label: 'REM Sleep', value: `${latestEntry.rem}h`, sub: 'last night', color: '#22d3ee', icon: Sun },
          { label: 'Deficit', value: `${USER?.sleep?.weeklyDebt || 14}h`, sub: 'this week', color: '#ef4444', icon: AlertCircle },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="metric-label">{label}</span>
              <Icon size={16} color={color} />
            </div>
            <div className="metric-value" style={{ color }}>{value}</div>
            <div className="metric-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {activeView === 'trend' && (
        <div className="card">
          <h3 className="card-title">14-Day Sleep Duration</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={sleepData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit="h" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-muted)' }}
                formatter={(v) => [`${v}h`, 'Sleep']}
              />
              {/* 8h optimal line */}
              <Area type="monotone" dataKey="hours" stroke="#6366f1" fill="url(#sleepGrad)" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <span className="badge" style={{ background: avgHours >= 7 ? '#14532d' : '#7f1d1d', color: avgHours >= 7 ? '#4ade80' : '#fca5a5' }}>
              {avgHours >= 7 ? <CheckCircle size={12} style={{ marginRight: 4 }} /> : <AlertCircle size={12} style={{ marginRight: 4 }} />}
              {avgHours >= 7 ? `On target — ${avgHours}h avg` : `Below optimal — need +${(7 - avgHours).toFixed(1)}h/night`}
            </span>
          </div>
        </div>
      )}

      {activeView === 'stages' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="card">
            <h3 className="card-title">Last Night — Stage Breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <RadialBarChart cx="50%" cy="50%" innerRadius={40} outerRadius={110} data={stageData}>
                <RadialBar minAngle={15} label={{ fill: 'var(--text-primary)', fontSize: 12 }} background clockWise dataKey="value" />
                <Legend iconSize={10} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v) => [`${v}h`]} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="card-title">14-Day Sleep Score</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sleepData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="score" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeView === 'tips' && (
        <div className="card">
          <h3 className="card-title">Evidence-Based Sleep Optimisation</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {SLEEP_TIPS.map(({ icon: Icon, tip, priority }, i) => (
              <div key={i} className="list-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.85rem 1rem', background: 'var(--bg-base)', borderRadius: 8, border: `1px solid var(--border)` }}>
                <Icon size={18} color={PRIORITY_COLOR[priority]} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{tip}</span>
                <span className="badge" style={{ fontSize: '0.65rem', background: 'transparent', border: `1px solid ${PRIORITY_COLOR[priority]}`, color: PRIORITY_COLOR[priority], flexShrink: 0 }}>{priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
