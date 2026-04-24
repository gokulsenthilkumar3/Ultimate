import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { Moon, Sun, Zap, Clock, TrendingUp, AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';

const buildSleepData = (userData) => {
  const base = userData?.sleep || {};
  const avg = base.avgHours || 5.5;
  const logged = userData?.sleepLog || [];
  if (logged.length > 0) {
    return logged.slice(-14).map((entry, i) => ({
      day: `D${i + 1}`,
      hours: +entry.hours,
      deep: +(entry.hours * 0.22).toFixed(1),
      rem: +(entry.hours * 0.20).toFixed(1),
      light: +(entry.hours * 0.58).toFixed(1),
      score: Math.round(50 + (entry.hours / 9) * 50),
    }));
  }
  return Array.from({ length: 14 }, (_, i) => {
    const jitter = (Math.sin(i * 2.3) * 0.7);
    const hrs = Math.max(3.5, Math.min(9, avg + jitter));
    return {
      day: `D${i + 1}`, hours: +hrs.toFixed(1),
      deep: +(hrs * 0.22).toFixed(1), rem: +(hrs * 0.20).toFixed(1),
      light: +(hrs * 0.58).toFixed(1), score: Math.round(50 + (hrs / 9) * 50),
    };
  });
};

const SLEEP_TIPS = [
  { icon: Moon, tip: 'Aim for consistent bed/wake times within 30-min window', priority: 'HIGH' },
  { icon: Sun, tip: 'Get 10 min sunlight within 30 min of waking to anchor circadian clock', priority: 'HIGH' },
  { icon: Zap, tip: 'Cut caffeine 8–10 hours before target bedtime', priority: 'MED' },
  { icon: Clock, tip: 'Keep bedroom temp 18–20°C for optimal deep sleep onset', priority: 'MED' },
  { icon: TrendingUp, tip: 'Progressive resistance training improves slow-wave sleep by ~15%', priority: 'LOW' },
];

const PRIORITY_COLOR = { HIGH: '#ef4444', MED: '#f59e0b', LOW: '#22c55e' };

export default function SleepDashboard({ user, setUser }) {
  const sleepData = buildSleepData(user);
  const latestEntry = sleepData[sleepData.length - 1];
  const avgHours = (sleepData.reduce((s, d) => s + d.hours, 0) / sleepData.length).toFixed(1);
  const avgScore = Math.round(sleepData.reduce((s, d) => s + d.score, 0) / sleepData.length);
  const [activeView, setActiveView] = useState('trend');
  const [logForm, setLogForm] = useState({ hours: '', date: new Date().toISOString().slice(0, 10) });

  const logSleep = () => {
    if (!logForm.hours) return;
    const newLog = [...(user?.sleepLog || []), { hours: Number(logForm.hours), date: logForm.date, id: Date.now() }];
    setUser({ ...user, sleepLog: newLog });
    setLogForm({ hours: '', date: new Date().toISOString().slice(0, 10) });
  };

  const stageData = [
    { name: 'Deep', value: +latestEntry.deep, fill: '#6366f1' },
    { name: 'REM', value: +latestEntry.rem, fill: '#22d3ee' },
    { name: 'Light', value: +latestEntry.light, fill: '#94a3b8' },
  ];

  const scoreColor = avgScore >= 75 ? '#22c55e' : avgScore >= 55 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Sleep</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
            <Moon size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
            Sleep Analytics
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>14-day circadian rhythm & recovery depth analysis</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['trend', 'stages', 'log', 'tips'].map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`btn-sm${activeView === v ? ' active' : ''}`}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Avg Sleep', value: `${avgHours}h`, sub: 'last 14 days', color: avgHours >= 7 ? '#22c55e' : '#ef4444', icon: Moon },
          { label: 'Sleep Score', value: avgScore, sub: '/100', color: scoreColor, icon: Zap },
          { label: 'Deep Sleep', value: `${latestEntry.deep}h`, sub: 'last night', color: '#6366f1', icon: TrendingUp },
          { label: 'REM Sleep', value: `${latestEntry.rem}h`, sub: 'last night', color: '#22d3ee', icon: Sun },
          { label: 'Deficit', value: `${user?.sleep?.weeklyDebt || 14}h`, sub: 'this week', color: '#ef4444', icon: AlertCircle },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="label-caps">{label}</span>
              <Icon size={16} color={color} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color, marginTop: '0.3rem' }}>{value}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {activeView === 'trend' && (
        <div className="glass-card">
          <span className="card-title">14-Day Sleep Duration</span>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={sleepData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-3)" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} stroke="var(--text-3)" tick={{ fontSize: 11 }} unit="h" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(12px)' }}
                formatter={(v) => [`${v}h`, 'Sleep']}
              />
              <Area type="monotone" dataKey="hours" stroke="#6366f1" fill="url(#sleepGrad)" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <span style={{
              padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem', fontWeight: 600,
              background: avgHours >= 7 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: avgHours >= 7 ? '#22c55e' : '#ef4444',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}>
              {avgHours >= 7 ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
              {avgHours >= 7 ? `On target — ${avgHours}h avg` : `Below optimal — need +${(7 - avgHours).toFixed(1)}h/night`}
            </span>
          </div>
        </div>
      )}

      {activeView === 'stages' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div className="glass-card">
            <span className="card-title">Last Night — Stage Breakdown</span>
            <ResponsiveContainer width="100%" height={260}>
              <RadialBarChart cx="50%" cy="50%" innerRadius={40} outerRadius={110} data={stageData}>
                <RadialBar minAngle={15} label={{ fill: 'var(--text-1)', fontSize: 12 }} background clockWise dataKey="value" />
                <Legend iconSize={10} />
                <Tooltip contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} formatter={(v) => [`${v}h`]} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card">
            <span className="card-title">14-Day Sleep Score</span>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sleepData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--text-3)" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="var(--text-3)" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                <Bar dataKey="score" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeView === 'log' && (
        <div className="glass-card">
          <span className="card-title">Log Sleep</span>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input type="number" step="0.5" placeholder="Hours slept" value={logForm.hours}
              onChange={e => setLogForm({ ...logForm, hours: e.target.value })} className="form-input" style={{ maxWidth: '140px' }} />
            <input type="date" value={logForm.date}
              onChange={e => setLogForm({ ...logForm, date: e.target.value })} className="form-input" style={{ maxWidth: '180px' }} />
            <button onClick={logSleep} className="btn-primary"><Plus size={16} /> Log Sleep</button>
          </div>
          {(user?.sleepLog || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[...(user?.sleepLog || [])].reverse().slice(0, 14).map(entry => (
                <div key={entry.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-1)' }}>{entry.hours}h</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: '0.5rem' }}>{entry.date}</span>
                  </div>
                  <button onClick={() => setUser({ ...user, sleepLog: (user?.sleepLog || []).filter(l => l.id !== entry.id) })}
                    style={{ background: 'rgba(248,113,113,0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '5px', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'tips' && (
        <div className="glass-card">
          <span className="card-title">Evidence-Based Sleep Optimisation</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {SLEEP_TIPS.map(({ icon: Icon, tip, priority }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.85rem 1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <Icon size={18} color={PRIORITY_COLOR[priority]} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{tip}</span>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${PRIORITY_COLOR[priority]}`, color: PRIORITY_COLOR[priority],
                  flexShrink: 0,
                }}>{priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
