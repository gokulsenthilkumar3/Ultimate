import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar
} from 'recharts';
import {
  BarChart3, TrendingUp, Activity, Gauge, Target, Flame,
  CheckCircle2, Layers
} from 'lucide-react';
import useStore, {
  selectHabits,
  selectGoals,
  selectNutritionLogs,
} from '../store/useStore';
import { trackEvent, trackPageView } from '../lib/firebase';

const TABS = [
  { id: 'overview',  label: '\ud83d\udcca Weekly Overview' },
  { id: 'modules',   label: '\ud83e\udde9 Modules' },
  { id: 'radar',     label: '\ud83c\udfaf Performance Radar' },
  { id: 'weight',    label: '\u2696\ufe0f Weight Trend' },
];

const tooltipStyle = {
  background: 'var(--bg-glass)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  backdropFilter: 'blur(12px)',
  color: 'var(--text-1)',
  fontSize: '0.8rem',
};

const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const pct = (n, t) => t ? Math.min(100, Math.round((n / t) * 100)) : 0;

export default function Analytics({ user }) {
  // ── Store-backed data (no fetch on mount) ────────────────────────────────
  const metric_logs = useStore((s) => s.metric_logs) || [];
  const habitData   = useStore(selectHabits) || [];
  const goalData    = useStore(selectGoals)  || [];
  const nutriData   = useStore(selectNutritionLogs) || [];
  const taskData    = useMemo(() => [
    ...(user?.tasks?.pending   || []),
    ...(user?.tasks?.completed || []),
  ], [user]);

  const [tab, setTab] = useState('overview');
  
  // ── Firebase Analytics tracking ──
  React.useEffect(() => { trackPageView('Analytics'); }, []);
  React.useEffect(() => { trackEvent('analytics_tab_switch', { tab }); }, [tab]);

  const logs = metric_logs;

  // ── velocity ──────────────────────────────────────────────────────────────────
  const velocity = useMemo(() => {
    if (!logs.length) return { val: 0, status: 'NO DATA', color: 'var(--text-3)' };
    const weighted = logs.filter((l) => l.weight && l.date).sort((a, b) => b.date.localeCompare(a.date));
    if (weighted.length < 2) return { val: 0, status: 'STABLE', color: 'var(--text-3)' };
    const latest   = weighted[0];
    const baseline = weighted.find((l) => {
      const d = (new Date(latest.date) - new Date(l.date)) / 86400000;
      return d >= 5 && d <= 10;
    }) || weighted[weighted.length - 1];
    const days = (new Date(latest.date) - new Date(baseline.date)) / 86400000;
    if (!days) return { val: 0, status: 'STABLE', color: 'var(--text-3)' };
    const rate = Number((((Number(latest.weight) - Number(baseline.weight)) / days) * 7).toFixed(2));
    if (rate >  0.1) return { val: rate, status: 'BULKING',     color: 'var(--accent)' };
    if (rate < -0.1) return { val: rate, status: 'CUTTING',     color: 'var(--success)' };
    return { val: rate, status: 'MAINTENANCE', color: 'var(--text-3)' };
  }, [logs]);

  // ── weekly rollup ───────────────────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    if (!logs.length) return [];
    const buckets = {};
    logs.forEach((l) => {
      if (!l.date) return;
      const d = new Date(l.date);
      const key = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('default', { month: 'short' })}`;
      if (!buckets[key]) buckets[key] = { week: key, weight: [], sleep: [], hrv: [], count: 0 };
      if (l.weight) buckets[key].weight.push(Number(l.weight));
      if (l.sleep)  buckets[key].sleep.push(Number(l.sleep));
      if (l.hrv)    buckets[key].hrv.push(Number(l.hrv));
      buckets[key].count += 1;
    });
    return Object.values(buckets).slice(-8).map((w) => ({
      week:   w.week,
      weight: w.weight.length ? Number(avg(w.weight).toFixed(1)) : null,
      sleep:  w.sleep.length  ? Number(avg(w.sleep).toFixed(1))  : null,
      hrv:    w.hrv.length    ? Math.round(avg(w.hrv))           : null,
      count:  w.count,
    }));
  }, [logs]);

  // ── weight trend ──────────────────────────────────────────────────────────
  const weightData = useMemo(() =>
    logs.filter((l) => l.weight && l.date)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30)
        .map((l) => ({ date: l.date.slice(5), weight: Number(l.weight) })),
  [logs]);

  // ── habit 30-day heatmap ───────────────────────────────────────────────────
  const habitHeatmap = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - i));
      const ds = d.toISOString().slice(0, 10);
      const done = habitData.filter((h) =>
        Array.isArray(h.completions) ? h.completions.includes(ds) :
        (h.last_completed === ds || h.completed_date === ds)
      ).length;
      const total = habitData.length || 1;
      return { date: ds, label: ds.slice(5), done, total, pct: pct(done, total) };
    });
  }, [habitData]);

  // ── goal progress for radar ───────────────────────────────────────────────
  const goalProgress = useMemo(() => {
    if (!goalData.length) return null;
    const byCategory = {};
    goalData.forEach((g) => {
      const cat = g.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(Number(g.progress || 0));
    });
    return Object.entries(byCategory).map(([k, vals]) => ({
      metric: k, value: Math.round(avg(vals)),
    }));
  }, [goalData]);

  // ── performance radar ───────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    const recent = logs.slice(0, 30);
    const avgs = (key) => { const v = recent.filter((l) => l[key]).map((l) => Number(l[key])); return avg(v); };
    const sleepScore    = avgs('sleep') ? Math.min(100, Math.round((avgs('sleep') / 9) * 100)) : 70;
    const recoveryScore = avgs('hrv')   ? Math.min(100, Math.round(avgs('hrv') * 1.3))        : 75;
    const goalScore     = goalData.length
      ? Math.round(avg(goalData.map((g) => Number(g.progress || 0))))
      : (user?.scores?.nutrition ?? 82);
    const habitScore = habitData.length
      ? Math.round(pct(
          habitData.filter((h) => h.streak >= 3).length,
          habitData.length
        ) * 1.2)
      : 85;
    const taskScore = taskData.length
      ? Math.round(pct(taskData.filter((t) => t.status === 'done' || t.done).length, taskData.length))
      : (user?.scores?.endurance ?? 58);
    return [
      { metric: 'Strength',    value: user?.scores?.strength ?? 65 },
      { metric: 'Endurance',   value: taskScore },
      { metric: 'Recovery',    value: recoveryScore },
      { metric: 'Goals',       value: goalScore },
      { metric: 'Sleep',       value: sleepScore },
      { metric: 'Habits',      value: Math.min(100, habitScore) },
    ];
  }, [logs, user, goalData, habitData, taskData]);

  // ── module stat cards ───────────────────────────────────────────────────────
  const moduleStats = useMemo(() => [
    {
      label: 'Active Habits',
      value: habitData.length,
      sub: `${habitData.filter((h) => (h.streak || 0) >= 3).length} on streak \u22653`,
      color: '#f59e0b', icon: Flame,
    },
    {
      label: 'Goals',
      value: goalData.length,
      sub: `Avg ${goalData.length ? Math.round(avg(goalData.map((g) => Number(g.progress || 0)))) : 0}% done`,
      color: '#8b5cf6', icon: Target,
    },
    {
      label: 'Tasks',
      value: taskData.length,
      sub: `${taskData.filter((t) => t.status === 'done' || t.done).length} completed`,
      color: '#10b981', icon: CheckCircle2,
    },
    {
      label: 'Nutrition Logs',
      value: nutriData.length,
      sub: nutriData.length
        ? `Avg ${Math.round(avg(nutriData.map((n) => Number(n.calories || 0))))} kcal`
        : 'No logs yet',
      color: '#3b82f6', icon: Layers,
    },
  ], [habitData, goalData, taskData, nutriData]);

  const hasHrv   = logs.some((l) => l.hrv);
  const hasSleep = logs.some((l) => l.sleep);

  const heatColor = (p) => {
    if (p === 0)   return 'rgba(255,255,255,0.05)';
    if (p < 30)    return 'rgba(245,158,11,0.25)';
    if (p < 60)    return 'rgba(245,158,11,0.55)';
    if (p < 90)    return 'rgba(16,185,129,0.55)';
    return 'rgba(16,185,129,0.9)';
  };

  return (
    <div className="fade-in module-page" style={{ padding: '0.5rem 0' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                    marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Intelligence &amp; Trends</p>
          <h2 className="text-display" style={{ fontSize: '2.5rem' }}>Growth Analytics</h2>
          <p className="text-secondary">Cross-module biometric &amp; behavioural aggregation.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`btn-sm ${tab === t.id ? 'active' : ''}`}
              style={{ padding: '0.65rem 1.2rem', borderRadius: '12px', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${velocity.color}` }}>
          <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '8px' }}>Weight Velocity</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gauge size={20} color={velocity.color} />
            <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>{velocity.val > 0 ? '+' : ''}{velocity.val}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>kg/wk</span>
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, color: velocity.color, marginTop: '8px' }}>{velocity.status}</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '8px' }}>Avg Recovery (HRV)</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#8b5cf6" />
            <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>
              {hasHrv ? `${radarData.find((d) => d.metric === 'Recovery')?.value ?? '\u2014'}ms` : '\u2014'}
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8b5cf6', marginTop: '8px' }}>{hasHrv ? 'FROM LOGS' : 'NO DATA'}</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '8px' }}>Sleep Consistency</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={20} color="#10b981" />
            <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>
              {hasSleep ? `${radarData.find((d) => d.metric === 'Sleep')?.value ?? '\u2014'}%` : '\u2014'}
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', marginTop: '8px' }}>{hasSleep ? 'FROM LOGS' : 'NO DATA'}</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '8px' }}>Habit Streaks Active</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Flame size={20} color="#f59e0b" />
            <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>
              {habitData.filter((h) => (h.streak || 0) >= 1).length}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>/ {habitData.length}</span>
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '8px' }}>
            {habitData.length ? 'FROM HABITS' : 'NO DATA'}
          </p>
        </div>
      </div>

      {/* main panel */}
      <div className="glass-card" style={{ padding: '2rem', minHeight: '450px' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginBottom: '1.5rem' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Biometric Synchronization</h3>
              <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Weekly averages \u00b7 last 8 weeks</p>
            </div>
            <div style={{ height: '340px' }}>
              {weeklyData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              gap: '1rem', color: 'var(--text-3)' }}>
                  <BarChart3 size={40} style={{ opacity: 0.25 }} />
                  <p style={{ fontSize: '0.82rem' }}>Log weight, sleep, or check-ins to see trend charts.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="week" stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar yAxisId="left" dataKey="sleep" name="Sleep (hrs)" fill="var(--accent)" radius={[4,4,0,0]} barSize={40} />
                    <Line yAxisId="right" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#3b82f6" strokeWidth={3} dot={{ fill:'#3b82f6', r:4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 30-day habit heatmap */}
            <div style={{ marginTop: '2rem' }}>
              <p className="label-caps" style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>30-Day Habit Completion Heatmap</p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {habitHeatmap.map((cell) => (
                  <div key={cell.date} title={`${cell.label}  ${cell.done}/${cell.total} habits`}
                    style={{ width: 28, height: 28, borderRadius: 6,
                             background: heatColor(cell.pct),
                             border: '1px solid rgba(255,255,255,0.06)',
                             cursor: 'default', transition: 'transform 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center' }}>
                {[['0%', 'rgba(255,255,255,0.05)'], ['<30%','rgba(245,158,11,0.25)'],
                  ['30-60%','rgba(245,158,11,0.55)'], ['60-90%','rgba(16,185,129,0.55)'],
                  ['100%','rgba(16,185,129,0.9)']].map(([lbl, bg]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: bg }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── MODULES ── */}
        {tab === 'modules' && (
          <>
            <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Cross-Module Snapshot</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '1.5rem', marginBottom: '2rem' }}>
              {moduleStats.map(({ label, value, sub, color, icon: Icon }) => (
                <div key={label} className="glass-card"
                  style={{ padding: '1.5rem', borderTop: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Icon size={18} color={color} />
                    <p className="label-caps" style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{label}</p>
                  </div>
                  <p style={{ fontSize: '2rem', fontWeight: 900, color }}>{value}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '4px' }}>{sub}</p>
                </div>
              ))}
            </div>

            {goalData.length > 0 && (
              <>
                <p className="label-caps" style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>Goal Progress</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {goalData.slice(0, 8).map((g) => (
                    <div key={g.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{g.title || g.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{g.progress ?? 0}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${g.progress ?? 0}%`,
                                     background: 'linear-gradient(90deg, var(--accent), #8b5cf6)',
                                     transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {goalData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                <Target size={36} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.85rem' }}>Add goals in the Goals module to see progress here.</p>
              </div>
            )}
          </>
        )}

        {/* ── RADAR ── */}
        {tab === 'radar' && (
          <div style={{ height: '420px', display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-2)', fontSize: 12, fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Current" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.4} />
                {goalProgress && (
                  <Radar name="Goals" dataKey="value" data={goalProgress}
                    stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeDasharray="4 2" />
                )}
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── WEIGHT TREND ── */}
        {tab === 'weight' && (
          <div style={{ height: '400px' }}>
            {weightData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '1rem', color: 'var(--text-3)' }}>
                <TrendingUp size={40} style={{ opacity: 0.25 }} />
                <p style={{ fontSize: '0.82rem' }}>Log weight via Daily Check-in to see your trend.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightData}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-3)" fontSize={10} tickLine={false} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="var(--text-3)" fontSize={12} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3}
                    fillOpacity={1} fill="url(#weightGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
