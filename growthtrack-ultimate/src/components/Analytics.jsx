import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { BarChart3, TrendingUp, Activity, Cpu, RefreshCw, Gauge, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';

const TABS = [
  { id: 'overview', label: 'Weekly Overview' },
  { id: 'radar', label: 'Performance Radar' },
  { id: 'weight', label: 'Weight Trend' },
];

const tooltipStyle = {
  background: 'var(--bg-glass)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  backdropFilter: 'blur(12px)',
  color: 'var(--text-1)',
  fontSize: '0.8rem',
};

export default function Analytics({ user }) {
  const metric_logs = useStore((s) => s.metric_logs);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState(null);

  // Hydrate from Supabase metric_logs API so charts always reflect latest data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiSync('/metric_logs', 'GET')
      .then((rows) => {
        if (cancelled) return;
        const parsed = Array.isArray(rows)
          ? rows.map((r) => {
              // server already returns { ...JSON.parse(data), date, id }
              // but we defensively JSON.parse if raw rows are ever sent
              if (r.data && !r.date) {
                try {
                  const obj = JSON.parse(r.data || '{}');
                  return { ...obj, date: r.date, id: r.id };
                } catch {
                  return { date: r.date, id: r.id };
                }
              }
              return r;
            })
          : [];
        setLiveData(parsed);
      })
      .catch(() => setLiveData([]))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefer live data from API; fallback to hydrated store snapshot
  const logs = liveData !== null ? liveData : metric_logs || [];

  // Velocity calculation: derive weekly weight change (kg/week)
  const velocity = useMemo(() => {
    if (!logs.length) return { val: 0, status: 'NO DATA', color: 'var(--text-3)' };
    const weighted = logs.filter((l) => l.weight && l.date).sort((a, b) => b.date.localeCompare(a.date));
    if (weighted.length < 2) return { val: 0, status: 'STABLE', color: 'var(--text-3)' };

    const latest = weighted[0];
    const baseline =
      weighted.find((l) => {
        const diffDays =
          (new Date(latest.date).getTime() - new Date(l.date).getTime()) /
          (1000 * 60 * 60 * 24);
        return diffDays >= 5 && diffDays <= 10;
      }) || weighted[weighted.length - 1];

    const daysDelta =
      (new Date(latest.date).getTime() - new Date(baseline.date).getTime()) /
      (1000 * 60 * 60 * 24);
    if (!daysDelta) return { val: 0, status: 'STABLE', color: 'var(--text-3)' };

    const diff = Number(latest.weight) - Number(baseline.weight);
    const weeklyRate = (diff / daysDelta) * 7;

    const rounded = Number(weeklyRate.toFixed(2));
    if (rounded > 0.1) return { val: rounded, status: 'BULKING', color: 'var(--accent)' };
    if (rounded < -0.1) return { val: rounded, status: 'CUTTING', color: 'var(--success)' };
    return { val: rounded, status: 'MAINTENANCE', color: 'var(--text-3)' };
  }, [logs]);

  // Roll up per-week averages for weight, sleep, and hrv
  const weeklyData = useMemo(() => {
    if (!logs.length) return [];
    const buckets = {};
    logs.forEach((l) => {
      if (!l.date) return;
      const d = new Date(l.date);
      const labelWeek = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('default', {
        month: 'short',
      })}`;
      if (!buckets[labelWeek]) {
        buckets[labelWeek] = { week: labelWeek, weight: [], sleep: [], hrv: [], count: 0 };
      }
      if (l.weight) buckets[labelWeek].weight.push(Number(l.weight));
      if (l.sleep) buckets[labelWeek].sleep.push(Number(l.sleep));
      if (l.hrv) buckets[labelWeek].hrv.push(Number(l.hrv));
      buckets[labelWeek].count += 1;
    });

    return Object.values(buckets)
      .slice(-8)
      .map((w) => ({
        week: w.week,
        weight: w.weight.length
          ? Number((w.weight.reduce((a, b) => a + b, 0) / w.weight.length).toFixed(1))
          : null,
        sleep: w.sleep.length
          ? Number((w.sleep.reduce((a, b) => a + b, 0) / w.sleep.length).toFixed(1))
          : null,
        hrv: w.hrv.length
          ? Math.round(w.hrv.reduce((a, b) => a + b, 0) / w.hrv.length)
          : null,
        count: w.count,
      }));
  }, [logs]);

  // 30-day weight trend
  const weightData = useMemo(
    () =>
      logs
        .filter((l) => l.weight && l.date)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30)
        .map((l) => ({
          date: l.date.slice(5),
          weight: Number(l.weight),
        })),
    [logs]
  );

  // Radar: derive averages from metric_logs for recovery/sleep; combine with user score hints
  const radarData = useMemo(() => {
    const recent = logs.slice(0, 30);
    const avg = (key) => {
      const vals = recent.filter((l) => l[key]).map((l) => Number(l[key]));
      if (!vals.length) return 0;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    const avgSleep = avg('sleep');
    const avgHrv = avg('hrv');

    const sleepScore = avgSleep ? Math.min(100, Math.round((avgSleep / 9) * 100)) : 70;
    const recoveryScore = avgHrv ? Math.min(100, Math.round(avgHrv * 1.3)) : 75;

    return [
      { metric: 'Strength', value: user?.scores?.strength ?? 65 },
      { metric: 'Endurance', value: user?.scores?.endurance ?? 58 },
      { metric: 'Recovery', value: recoveryScore },
      { metric: 'Nutrition', value: user?.scores?.nutrition ?? 82 },
      { metric: 'Sleep', value: sleepScore },
      { metric: 'Consistency', value: 85 },
    ];
  }, [logs, user]);

  const hasHrv = logs.some((l) => l.hrv);
  const hasSleep = logs.some((l) => l.sleep);

  return (
    <div className="fade-in module-page" style={{ padding: '0.5rem 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>
            Intelligence & Trends
          </p>
          <h2 className="text-display" style={{ fontSize: '2.5rem' }}>
            Growth Analytics
          </h2>
          <p className="text-secondary">Derived velocity and predictive biometric modeling.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn-sm ${tab === t.id ? 'active' : ''}`}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div
          className="glass-card"
          style={{ padding: '1.5rem', borderLeft: `4px solid ${velocity.color}` }}
        >
          <p
            className="label-caps"
            style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '8px' }}
          >
            Weight Velocity
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gauge size={20} color={velocity.color} />
            <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>
              {velocity.val > 0 ? '+' : ''}
              {velocity.val}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>kg/wk</span>
          </div>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: velocity.color,
              marginTop: '8px',
            }}
          >
            {velocity.status}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <p
            className="label-caps"
            style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '8px' }}
          >
            Avg Recovery (HRV)
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#8b5cf6" />
            <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>
              {hasHrv ? `${radarData.find((d) => d.metric === 'Recovery')?.value ?? '—'}ms` : '—'}
            </span>
          </div>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#8b5cf6',
              marginTop: '8px',
            }}
          >
            {hasHrv ? 'FROM LOGS' : 'NO DATA'}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <p
            className="label-caps"
            style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '8px' }}
          >
            Sleep Consistency
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={20} color="#10b981" />
            <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>
              {hasSleep ? `${radarData.find((d) => d.metric === 'Sleep')?.value ?? '—'}%` : '—'}
            </span>
          </div>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#10b981',
              marginTop: '8px',
            }}
          >
            {hasSleep ? 'FROM LOGS' : 'NO DATA'}
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem', minHeight: '450px' }}>
        {tab === 'overview' && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
              }}
            >
              <h3 className="card-title" style={{ margin: 0 }}>
                Biometric Synchronization
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.8rem' }}>
                Aggregated weekly averages vs baseline.
              </p>
            </div>
            <div style={{ height: '350px' }}>
              {weeklyData.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    color: 'var(--text-3)',
                  }}
                >
                  <BarChart3 size={40} style={{ opacity: 0.25 }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 700, marginBottom: '4px' }}>No data yet</p>
                    <p style={{ fontSize: '0.82rem' }}>
                      Log weight, sleep, or check-ins to see your trend charts.
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="week"
                      stroke="var(--text-3)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="var(--text-3)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--text-3)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      yAxisId="left"
                      dataKey="sleep"
                      name="Sleep (hrs)"
                      fill="var(--accent)"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="weight"
                      name="Weight (kg)"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}

        {tab === 'radar' && (
          <div style={{ height: '400px', display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: 'var(--text-2)', fontSize: 12, fontWeight: 700 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Current"
                  dataKey="value"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.4}
                />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === 'weight' && (
          <div style={{ height: '400px' }}>
            {weightData.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  color: 'var(--text-3)',
                }}
              >
                <TrendingUp size={40} style={{ opacity: 0.25 }} />
                <p style={{ fontSize: '0.82rem' }}>
                  Log weight data via Daily Check-in to see your trend.
                </p>
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-3)"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
                    stroke="var(--text-3)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#weightGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
