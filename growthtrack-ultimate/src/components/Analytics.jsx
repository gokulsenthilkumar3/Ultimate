import React, { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area, Legend, ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart2, Zap, Brain, Moon, Activity } from 'lucide-react';
import useStore from '../store/useStore';

const TOOLTIP_STYLE = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-1)', backdropFilter: 'blur(12px)', fontSize: '0.8rem',
};

// ── Correlation coefficient (Pearson) ─────────────────────────────────────
function pearson(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const n  = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const dx  = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const dy  = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  if (dx === 0 || dy === 0) return 0;
  return +(num / (dx * dy)).toFixed(3);
}

function corrStrength(r) {
  const abs = Math.abs(r || 0);
  if (abs >= 0.7) return { label: 'Strong',   color: r > 0 ? '#10b981' : '#f87171' };
  if (abs >= 0.4) return { label: 'Moderate', color: r > 0 ? '#f59e0b' : '#fb923c' };
  if (abs >= 0.2) return { label: 'Weak',     color: '#94a3b8' };
  return           { label: 'Negligible', color: '#475569' };
}

// ── Aggregation helpers ───────────────────────────────────────────────────
function groupMetricByDate(metrics, type) {
  const map = {};
  (metrics || []).forEach(m => {
    if ((m.type || '').toLowerCase() === type.toLowerCase()) {
      const d = (m.date || '').slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(Number(m.value) || 0);
    }
  });
  return map;
}

function meanMap(map) {
  const result = {};
  Object.entries(map).forEach(([d, vals]) => { result[d] = vals.reduce((a, b) => a + b, 0) / vals.length; });
  return result;
}

// ── Correlation panel ────────────────────────────────────────────────────
function CorrelationPanel({ title, xLabel, yLabel, color, data, r }) {
  const cs = corrStrength(r);
  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="card-title" style={{ margin: 0 }}>{title}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Pearson r:</span>
          <span style={{ fontWeight: 900, fontFamily: 'monospace', color: cs.color, fontSize: '0.9rem' }}>
            {r !== null ? (r >= 0 ? '+' : '') + r : 'N/A'}
          </span>
          {r !== null && (
            <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.62rem', fontWeight: 700, background: `${cs.color}20`, color: cs.color, border: `1px solid ${cs.color}44` }}>{cs.label}</span>
          )}
        </div>
      </div>
      {data.length < 5 ? (
        <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', padding: '1rem 0', textAlign: 'center' }}>Need 5+ paired data points. Log more {xLabel} and {yLabel} on the same dates.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 6, right: 10, bottom: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" name={xLabel} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} label={{ value: xLabel, position: 'insideBottom', offset: -6, fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis dataKey="y" name={yLabel} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v.toFixed(2), n]} />
              <Scatter data={data} fill={color} opacity={0.75} />
            </ScatterChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px', textAlign: 'center' }}>
            {data.length} matched days · {r !== null && Math.abs(r) >= 0.4 ? `${r > 0 ? 'Positive' : 'Negative'} correlation suggests ${xLabel} impacts ${yLabel}` : 'Insufficient correlation detected'}
          </p>
        </>
      )}
    </div>
  );
}

// ── Cross-domain trend view ───────────────────────────────────────────────
function CrossDomainTrend({ metrics, sleepLogs }) {
  const dates = useMemo(() => {
    const set = new Set();
    (metrics || []).forEach(m => { if (m.date) set.add(m.date.slice(0, 10)); });
    (sleepLogs || []).forEach(s => { if (s.date) set.add(s.date); });
    return [...set].sort().slice(-60);
  }, [metrics, sleepLogs]);

  const sleepMap    = useMemo(() => meanMap(groupMetricByDate(sleepLogs?.map(s => ({ type: 'sleep', date: s.date, value: s.duration })) || [], 'sleep')), [sleepLogs]);
  const moodMap     = useMemo(() => meanMap(groupMetricByDate(metrics, 'mood')), [metrics]);
  const energyMap   = useMemo(() => meanMap(groupMetricByDate(metrics, 'energy')), [metrics]);
  const workoutMap  = useMemo(() => meanMap(groupMetricByDate(metrics, 'workout_intensity')), [metrics]);

  const chartData = useMemo(() => dates.filter(d => sleepMap[d] || moodMap[d] || energyMap[d]).map(d => ({
    date: d.slice(5), sleep: sleepMap[d], mood: moodMap[d], energy: energyMap[d], workout: workoutMap[d],
  })), [dates, sleepMap, moodMap, energyMap, workoutMap]);

  if (chartData.length < 3) return (
    <div className="glass-card">
      <span className="card-title">Cross-Domain Trend</span>
      <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.75rem' }}>Log sleep, mood, and energy across several days to see trends.</p>
    </div>
  );

  return (
    <div className="glass-card">
      <span className="card-title">Cross-Domain Trend</span>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Sleep, mood, and energy across time — spot patterns and correlations.</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval={Math.floor(chartData.length / 8)} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => v?.toFixed(2)} />
          <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
          {chartData.some(d => d.sleep != null) && <Line type="monotone" dataKey="sleep"   name="Sleep (hrs)"  stroke="#0ea5e9" strokeWidth={2} dot={false} />}
          {chartData.some(d => d.mood != null)  && <Line type="monotone" dataKey="mood"    name="Mood (1-10)"  stroke="#ec4899" strokeWidth={2} dot={false} />}
          {chartData.some(d => d.energy != null)&& <Line type="monotone" dataKey="energy"  name="Energy (1-10)"stroke="#f59e0b" strokeWidth={2} dot={false} />}
          {chartData.some(d => d.workout != null)&& <Line type="monotone" dataKey="workout" name="Workout"      stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Analytics() {
  const state     = useStore();
  const metrics   = state.metric_logs  || [];
  const sleepLogs = state.sleep_logs   || [];
  const tasks     = state.tasks        || [];
  const habits    = state.habits       || [];
  const habitLogsByHabit = state.habitLogsByHabit || {};
  const goals     = state.goals        || [];

  const [view, setView] = useState('correlations');

  // ── Build correlation datasets ────────────────────────────────────────
  const sleepByDate  = useMemo(() => Object.fromEntries(sleepLogs.map(s => [s.date, Number(s.duration) || 0])), [sleepLogs]);
  const moodByDate   = useMemo(() => meanMap(groupMetricByDate(metrics, 'mood')), [metrics]);
  const energyByDate = useMemo(() => meanMap(groupMetricByDate(metrics, 'energy')), [metrics]);
  const weightByDate = useMemo(() => meanMap(groupMetricByDate(metrics, 'weight')), [metrics]);

  // ── All dates where we have paired data ─────────────────────────────
  const allDates = useMemo(() => {
    const s = new Set([...Object.keys(sleepByDate), ...Object.keys(moodByDate), ...Object.keys(energyByDate)]);
    return [...s].sort();
  }, [sleepByDate, moodByDate, energyByDate]);

  // Sleep vs Mood
  const sleepMoodData = useMemo(() =>
    allDates.filter(d => sleepByDate[d] != null && moodByDate[d] != null)
            .map(d => ({ x: sleepByDate[d], y: moodByDate[d], date: d })),
  [allDates, sleepByDate, moodByDate]);

  // Sleep vs Energy
  const sleepEnergyData = useMemo(() =>
    allDates.filter(d => sleepByDate[d] != null && energyByDate[d] != null)
            .map(d => ({ x: sleepByDate[d], y: energyByDate[d], date: d })),
  [allDates, sleepByDate, energyByDate]);

  // Energy vs Mood
  const energyMoodData = useMemo(() =>
    allDates.filter(d => energyByDate[d] != null && moodByDate[d] != null)
            .map(d => ({ x: energyByDate[d], y: moodByDate[d], date: d })),
  [allDates, energyByDate, moodByDate]);

  const rSleepMood   = useMemo(() => pearson(sleepMoodData.map(d => d.x), sleepMoodData.map(d => d.y)), [sleepMoodData]);
  const rSleepEnergy = useMemo(() => pearson(sleepEnergyData.map(d => d.x), sleepEnergyData.map(d => d.y)), [sleepEnergyData]);
  const rEnergyMood  = useMemo(() => pearson(energyMoodData.map(d => d.x), energyMoodData.map(d => d.y)), [energyMoodData]);

  // Task completion rate (7-day rolling)
  const taskCompletionRate = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d  = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayTasks = tasks.filter(t => (t.due_date || '').startsWith(key) || (t.completed_at || '').startsWith(key));
      const done     = dayTasks.filter(t => t.completed).length;
      const rate     = dayTasks.length > 0 ? Math.round((done / dayTasks.length) * 100) : null;
      data.push({ date: key.slice(5), rate, total: dayTasks.length });
    }
    return data;
  }, [tasks]);

  // Habit streak distribution
  const habitStreakData = useMemo(() => {
    return habits.map(h => {
      const logs  = habitLogsByHabit[h.id] || [];
      const logSet = new Set(logs.filter(l => l.completed !== false).map(l => l.date));
      let streak = 0;
      let d = new Date();
      while (true) {
        const k = d.toISOString().slice(0, 10);
        if (logSet.has(k)) streak++;
        else if (streak > 0) break;
        d.setDate(d.getDate() - 1);
        if (streak > 365) break;
      }
      return { name: h.name, streak };
    }).sort((a, b) => b.streak - a.streak);
  }, [habits, habitLogsByHabit]);

  // Goal progress distribution
  const goalProgressData = useMemo(() =>
    goals.map(g => ({
      name: g.title?.slice(0, 20),
      pct: g.target_value ? Math.min(100, Math.round((Number(g.current_value || 0) / Number(g.target_value)) * 100)) : g.status === 'completed' ? 100 : 0,
    })).sort((a, b) => b.pct - a.pct),
  [goals]);

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Insights</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Analytics</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Cross-domain correlations · Trend analysis · Habit & goal patterns</p>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {[
          { label: `Sleep × Mood r=${rSleepMood ?? 'N/A'}`,   icon: <Moon size={12} />,     color: corrStrength(rSleepMood).color },
          { label: `Sleep × Energy r=${rSleepEnergy ?? 'N/A'}`,icon: <Zap size={12} />,     color: corrStrength(rSleepEnergy).color },
          { label: `Energy × Mood r=${rEnergyMood ?? 'N/A'}`, icon: <Activity size={12} />, color: corrStrength(rEnergyMood).color },
        ].map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '99px', background: `${c.color}15`, border: `1px solid ${c.color}44`, color: c.color, fontSize: '0.72rem', fontWeight: 700 }}>
            {c.icon} {c.label}
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['correlations', 'trends', 'habits', 'goals'].map(t => (
          <button key={t} onClick={() => setView(t)} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: view === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: view === t ? '#000' : 'var(--text-3)', border: 'none', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Correlations */}
      {view === 'correlations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <CorrelationPanel title="Sleep → Mood" xLabel="Sleep (hrs)" yLabel="Mood (1-10)" color="#0ea5e9" data={sleepMoodData} r={rSleepMood} />
          <CorrelationPanel title="Sleep → Energy" xLabel="Sleep (hrs)" yLabel="Energy (1-10)" color="#f59e0b" data={sleepEnergyData} r={rSleepEnergy} />
          <CorrelationPanel title="Energy → Mood" xLabel="Energy (1-10)" yLabel="Mood (1-10)" color="#ec4899" data={energyMoodData} r={rEnergyMood} />

          {/* Interpretation guide */}
          <div className="glass-card">
            <span className="card-title">How to interpret correlations</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
              {[
                { range: '|r| ≥ 0.7', label: 'Strong', desc: 'Clear relationship between variables', color: '#10b981' },
                { range: '0.4–0.7',   label: 'Moderate', desc: 'Notable link, explore further', color: '#f59e0b' },
                { range: '0.2–0.4',   label: 'Weak', desc: 'Small tendency, more data needed', color: '#94a3b8' },
                { range: '< 0.2',     label: 'Negligible', desc: 'No meaningful relationship', color: '#475569' },
              ].map(g => (
                <div key={g.label} style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '8px', borderLeft: `3px solid ${g.color}` }}>
                  <p style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: 'var(--text-3)', marginBottom: '2px' }}>{g.range}</p>
                  <p style={{ fontSize: '0.78rem', fontWeight: 800, color: g.color, marginBottom: '2px' }}>{g.label}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{g.desc}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '0.75rem' }}>Note: Correlation ≠ causation. Always consider confounding variables.</p>
          </div>
        </div>
      )}

      {/* Trends */}
      {view === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <CrossDomainTrend metrics={metrics} sleepLogs={sleepLogs} />
          <div className="glass-card">
            <span className="card-title">Task Completion Rate — 30 Days</span>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>% of due tasks completed each day</p>
            {taskCompletionRate.filter(d => d.rate != null).length < 3 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', padding: '1rem 0', textAlign: 'center' }}>Need tasks with due dates to see this chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={taskCompletionRate.filter(d => d.rate != null)} margin={{ top: 8, right: 8, bottom: 4, left: -20 }}>
                  <defs>
                    <linearGradient id="gTask" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, 'Completion']} />
                  <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '80% target', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} />
                  <Area type="monotone" dataKey="rate" name="Completion" stroke="#10b981" fill="url(#gTask)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Habits */}
      {view === 'habits' && (
        <div className="glass-card">
          <span className="card-title">Habit Streak Leaderboard</span>
          {habitStreakData.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: '0.75rem' }}>No habits tracked yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              {habitStreakData.map((h, i) => (
                <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: i === 0 ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)' }}>
                  <span style={{ width: '20px', fontWeight: 900, fontSize: '0.8rem', color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#fb923c' : 'var(--text-3)', textAlign: 'center' }}>{i+1}</span>
                  <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700 }}>{h.name}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#f97316' }}>{h.streak > 0 ? `🔥 ${h.streak}` : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goals */}
      {view === 'goals' && (
        <div className="glass-card">
          <span className="card-title">Goal Progress Distribution</span>
          {goalProgressData.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: '0.75rem' }}>No goals tracked yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              {goalProgressData.map(g => (
                <div key={g.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{g.name}</span>
                    <span style={{ fontSize: '0.72rem', color: g.pct >= 100 ? '#10b981' : 'var(--text-3)' }}>{g.pct}%</span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                    <div style={{ height: '100%', width: `${g.pct}%`, background: g.pct >= 100 ? '#10b981' : g.pct >= 60 ? '#f59e0b' : 'var(--accent)', borderRadius: '99px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
