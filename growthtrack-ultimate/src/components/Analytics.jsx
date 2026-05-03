import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { BarChart3, TrendingUp, Activity, Cpu, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';

const TABS = [
  { id: 'overview', label: 'Weekly Overview' },
  { id: 'radar', label: 'Performance Radar' },
  { id: 'weight', label: 'Weight Trend' },
];

const tooltipStyle = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(12px)'
};

export default function Analytics({ user }) {
  const metric_logs = useStore(s => s.metric_logs);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState(null);

  // Fetch fresh metric logs directly
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:3001/api/metric_logs')
      .then(r => r.json())
      .then(rows => {
        const parsed = Array.isArray(rows)
          ? rows.map(r => {
              try { return { ...JSON.parse(r.data || '{}'), date: r.date, id: r.id }; }
              catch { return { date: r.date, id: r.id }; }
            })
          : [];
        setLiveData(parsed);
      })
      .catch(() => setLiveData([]))
      .finally(() => setLoading(false));
  }, []);

  const logs = liveData !== null ? liveData : (metric_logs || []);

  // Build chart series from real logs
  const weeklyData = useMemo(() => {
    if (!logs.length) return [];
    const byWeek = {};
    logs.forEach(l => {
      if (!l.date) return;
      const d = new Date(l.date);
      const week = `W${Math.ceil((d.getDate()) / 7)} ${d.toLocaleString('default', { month: 'short' })}`;
      if (!byWeek[week]) byWeek[week] = { week, weight: [], sleep: [], hrv: [], count: 0 };
      if (l.weight) byWeek[week].weight.push(+l.weight);
      if (l.sleep)  byWeek[week].sleep.push(+l.sleep);
      if (l.hrv)    byWeek[week].hrv.push(+l.hrv);
      byWeek[week].count++;
    });
    return Object.values(byWeek).slice(-12).map(w => ({
      week: w.week,
      weight: w.weight.length ? +(w.weight.reduce((a, b) => a + b, 0) / w.weight.length).toFixed(1) : null,
      sleep: w.sleep.length ? +(w.sleep.reduce((a, b) => a + b, 0) / w.sleep.length).toFixed(1) : null,
      hrv: w.hrv.length ? Math.round(w.hrv.reduce((a, b) => a + b, 0) / w.hrv.length) : null,
      count: w.count,
    }));
  }, [logs]);

  const weightData = useMemo(() =>
    logs.filter(l => l.weight && l.date).sort((a, b) => a.date.localeCompare(b.date)).slice(-60).map(l => ({
      date: l.date.slice(5),
      weight: +l.weight,
    })),
  [logs]);

  // Radar — compute from available log fields
  const radarData = useMemo(() => {
    if (!logs.length) return [
      { metric: 'Strength', value: user?.scores?.strength || 42 },
      { metric: 'Endurance', value: user?.scores?.endurance || 38 },
      { metric: 'Recovery', value: user?.scores?.recovery || 55 },
      { metric: 'Nutrition', value: user?.scores?.nutrition || 60 },
      { metric: 'Sleep', value: user?.scores?.sleep || 35 },
      { metric: 'Mobility', value: user?.scores?.mobility || 48 },
    ];
    const recent = logs.slice(0, 30);
    const avg = (arr, key) => { const v = arr.filter(l => l[key]).map(l => +l[key]); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
    const avgSleep = avg(recent, 'sleep');
    const avgHrv = avg(recent, 'hrv');
    const avgWeight = avg(recent, 'weight');
    return [
      { metric: 'Strength', value: user?.scores?.strength || 42 },
      { metric: 'Endurance', value: user?.scores?.endurance || 38 },
      { metric: 'Recovery', value: avgHrv ? Math.min(100, Math.round(avgHrv * 1.3)) : (user?.scores?.recovery || 55) },
      { metric: 'Nutrition', value: user?.scores?.nutrition || 60 },
      { metric: 'Sleep', value: avgSleep ? Math.min(100, Math.round((avgSleep / 9) * 100)) : (user?.scores?.sleep || 35) },
      { metric: 'Mobility', value: user?.scores?.mobility || 48 },
    ];
  }, [logs, user]);

  // KPIs from real data
  const latestWeight = logs.filter(l => l.weight).sort((a, b) => b.date?.localeCompare(a.date))[0];
  const earliestWeight = logs.filter(l => l.weight).sort((a, b) => a.date?.localeCompare(b.date))[0];
  const weightDelta = latestWeight && earliestWeight
    ? (parseFloat(latestWeight.weight) - parseFloat(earliestWeight.weight)).toFixed(1)
    : null;
  const avgSleep = logs.filter(l => l.sleep).length
    ? (logs.filter(l => l.sleep).reduce((a, l) => a + parseFloat(l.sleep), 0) / logs.filter(l => l.sleep).length).toFixed(1)
    : null;
  const avgHrv = logs.filter(l => l.hrv).length
    ? Math.round(logs.filter(l => l.hrv).reduce((a, l) => a + parseFloat(l.hrv), 0) / logs.filter(l => l.hrv).length)
    : null;

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Analytics</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={24} /> Analytics Engine
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
            {loading ? 'Loading data…' : `${logs.length} metric logs · real data`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => { setLiveData(null); setLoading(true); fetch('http://localhost:3001/api/metric_logs').then(r => r.json()).then(rows => { setLiveData(rows.map(r => { try { return { ...JSON.parse(r.data || '{}'), date: r.date }; } catch { return { date: r.date }; } })); }).finally(() => setLoading(false)); }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-3)', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`btn-sm${tab === t.id ? ' active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Logs', value: logs.length, color: 'var(--accent)', icon: Cpu },
          { label: 'Avg HRV', value: avgHrv ? `${avgHrv}ms` : '—', color: '#22d3ee', icon: Activity },
          { label: 'Avg Sleep', value: avgSleep ? `${avgSleep}h` : '—', color: '#6366f1', icon: TrendingUp },
          { label: 'Weight Δ', value: weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${weightDelta}kg` : '—', color: weightDelta > 0 ? '#22c55e' : '#ef4444', icon: BarChart3 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">{label}</span>
              <Icon size={15} color={color} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color, marginTop: '0.3rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {logs.length === 0 && !loading && (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-3)' }}>
          <BarChart3 size={40} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
          <p>No metric logs found. Use the Metric Logger to track weight, sleep, and HRV over time.</p>
        </div>
      )}

      {tab === 'overview' && weeklyData.length > 0 && (
        <div className="glass-card">
          <span className="card-title">Weekly Averages — Weight, Sleep & HRV</span>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={weeklyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" stroke="var(--text-3)" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="weight" orientation="left" domain={['auto', 'auto']} stroke="#22d3ee" tick={{ fontSize: 11 }} unit="kg" />
              <YAxis yAxisId="other" orientation="right" domain={[0, 12]} stroke="#a78bfa" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar yAxisId="other" dataKey="sleep" fill="#6366f1" opacity={0.5} radius={[3, 3, 0, 0]} name="Avg Sleep (h)" />
              <Bar yAxisId="other" dataKey="count" fill="#f59e0b" opacity={0.3} radius={[3, 3, 0, 0]} name="Log Count" />
              <Line yAxisId="weight" type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3 }} name="Avg Weight (kg)" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'radar' && (
        <div className="glass-card">
          <span className="card-title">Physical Performance Radar</span>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={120}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-3)', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 10 }} />
              <Radar name="Current" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
            {logs.length > 0 ? 'Recovery & Sleep computed from real metric logs' : 'Based on profile scores — log metrics for live updates'}
          </p>
        </div>
      )}

      {tab === 'weight' && (
        <div className="glass-card">
          <span className="card-title">Weight History (last {weightData.length} entries)</span>
          {weightData.length === 0 ? (
            <p style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>No weight data in logs. Log weight in Metric Logger.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={weightData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} stroke="var(--text-3)" tick={{ fontSize: 11 }} unit="kg" />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}kg`, 'Weight']} />
                <Area type="monotone" dataKey="weight" stroke="var(--accent)" fill="url(#weightGrad)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
