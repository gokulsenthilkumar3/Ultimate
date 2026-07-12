import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell,
  CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { Moon, Sun, Zap, Clock, TrendingUp, AlertCircle, CheckCircle, Plus, Trash2, BatteryCharging, Minus } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import useStore, { selectSleepLogs, selectSaveSleepLog, apiSync } from '../store/useStore';

const FALLBACK_TIPS = [
  { icon: Moon,       tip: 'Aim for consistent bed/wake times within a 30-min window daily.', priority: 'HIGH' },
  { icon: Sun,        tip: 'Get 10 min of sunlight within 30 min of waking to anchor your circadian clock.', priority: 'HIGH' },
  { icon: Zap,        tip: 'Cut caffeine 8–10 hours before target bedtime to clear adenosine receptors.', priority: 'MED' },
  { icon: Clock,      tip: 'Keep bedroom temp 18–20°C for optimal deep sleep onset.', priority: 'MED' },
  { icon: TrendingUp, tip: 'Progressive resistance training improves slow-wave sleep by ~15%.', priority: 'LOW' },
];

const PRIORITY_COLOR = { HIGH: '#ef4444', MED: '#f59e0b', LOW: '#22c55e' };
const QUALITY_LABELS = {
  1: 'Terrible', 2: 'Very Bad', 3: 'Bad', 4: 'Below Avg', 5: 'Average',
  6: 'Above Avg', 7: 'Good', 8: 'Very Good', 9: 'Excellent', 10: 'Perfect'
};

// ── Chart data builder ─────────────────────────────────────────────────────────
const buildChartData = (logs) =>
  [...logs].reverse().slice(-14).map((entry, i) => {
    const hrs = parseFloat(entry.duration) || 0;
    const score = Math.min(100, Math.round((hrs / 8) * 100));
    return {
      day: entry.date ? entry.date.slice(5) : `D${i + 1}`,
      hours: +hrs.toFixed(1),
      deep: +(hrs * 0.22).toFixed(1),
      rem: +(hrs * 0.20).toFixed(1),
      light: +(hrs * 0.58).toFixed(1),
      score,
    };
  });

const parseTime = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h + m / 60; };
const calcDuration = (bed, wake) => {
  if (!bed || !wake) return '';
  let b = parseTime(bed), w = parseTime(wake);
  if (w < b) w += 24;
  return (w - b).toFixed(1);
};

// ── Sleep Debt calculator (14-day rolling deficit vs 8h target) ─────────────────
function calcSleepDebt(chartData) {
  if (!chartData.length) return 0;
  const totalDebt = chartData.reduce((acc, d) => acc + Math.max(0, 8 - d.hours), 0);
  return +totalDebt.toFixed(1);
}

// ── Custom SVG Radial Gauge for Sleep Score ─────────────────────────────────────
function SleepScoreGauge({ score }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444';
  return (
    <div className="radial-gauge" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" className="progress-ring">
        <circle className="progress-ring__track" cx="70" cy="70" r={r} strokeWidth="10" stroke="var(--bg-elevated)" />
        <circle
          className="progress-ring__fill"
          cx="70" cy="70" r={r}
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s var(--ease)' }}
        />
      </svg>
      <div className="radial-gauge__label">
        <div className="radial-gauge__value" style={{ fontSize: '1.6rem', color }}>{score || '—'}</div>
        <div className="radial-gauge__sub">Sleep Score</div>
      </div>
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '12px', backdropFilter: 'blur(16px)', padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
      <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}{p.unit || ''}</p>
      ))}
    </div>
  );
};

// ── Stage Pie Chart ────────────────────────────────────────────────────────────
const STAGE_COLORS = { Deep: '#6366f1', REM: '#22d3ee', Light: '#94a3b8' };

export default function SleepDashboard() {
  const logs = useStore(selectSleepLogs);
  const saveSleepLog = useStore(selectSaveSleepLog);
  const isLoading = useStore(s => s.isLoading);
  const toast = useToast();

  const [activeView, setActiveView] = useState('trend');
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    bed_time: '23:00', wake_time: '06:30',
    quality: 7, notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [tips, setTips] = useState(FALLBACK_TIPS);

  // Fetch tips from DB if on tips view
  useEffect(() => {
    if (activeView !== 'tips') return;
    apiSync('/sleep_tips', 'GET')
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTips(data.map(row => ({ icon: Clock, tip: row.tip, priority: (row.priority || 'MED').toUpperCase() })));
        }
      })
      .catch(() => {/* keep fallback */});
  }, [activeView]);

  const handleDeleteEntry = useCallback(async (date) => {
    try {
      await apiSync(`/sleep_logs/${date}`, 'DELETE');
      toast.success('Entry deleted');
      useStore.getState().fetchInitialData();
    } catch {
      toast.error('Delete failed');
    }
  }, [toast]);

  const handleLogSleep = async () => {
    if (!logForm.date) return toast.error('Date is required');
    if (!logForm.bed_time || !logForm.wake_time) return toast.error('Enter bed and wake times');
    const duration = parseFloat(calcDuration(logForm.bed_time, logForm.wake_time));
    if (isNaN(duration) || duration <= 0 || duration > 16) return toast.error('Invalid sleep duration');
    setSaving(true);
    try {
      await saveSleepLog({ ...logForm, duration });
      setLogForm({ date: new Date().toISOString().slice(0, 10), bed_time: '23:00', wake_time: '06:30', quality: 7, notes: '' });
      toast.success('Sleep logged ✓');
    } catch {
      toast.error('Save failed');
    }
    setSaving(false);
  };

  const chartData = useMemo(() => (logs || []).length > 0 ? buildChartData(logs) : [], [logs]);
  const avgHours = chartData.length ? (chartData.reduce((s, d) => s + d.hours, 0) / chartData.length).toFixed(1) : '—';
  const avgScore = chartData.length ? Math.round(chartData.reduce((s, d) => s + d.score, 0) / chartData.length) : 0;
  const latest = chartData[chartData.length - 1] || {};
  const scoreColor = avgScore >= 75 ? '#22c55e' : avgScore >= 55 ? '#f59e0b' : '#ef4444';
  const sleepDebt = useMemo(() => calcSleepDebt(chartData), [chartData]);

  const debtClass = sleepDebt === 0 ? 'sleep-debt-badge--good'
    : sleepDebt <= 5 ? 'sleep-debt-badge--warn'
    : 'sleep-debt-badge--crit';

  const previewDuration = logForm.bed_time && logForm.wake_time ? calcDuration(logForm.bed_time, logForm.wake_time) : null;

  // Pie data for stages
  const stageData = latest.hours ? [
    { name: 'Deep',  value: +latest.deep,  fill: '#6366f1' },
    { name: 'REM',   value: +latest.rem,   fill: '#22d3ee' },
    { name: 'Light', value: +latest.light, fill: '#94a3b8' },
  ] : [];

  const VIEWS = ['trend', 'stages', 'log', 'tips'];

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Sleep</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Moon size={24} color="var(--accent)" /> Sleep Analytics
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{logs.length} sessions logged</p>
            {chartData.length > 0 && (
              <span className={`sleep-debt-badge ${debtClass}`}>
                <BatteryCharging size={12} />
                {sleepDebt === 0 ? 'No Sleep Debt' : `${sleepDebt}h Debt`}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`btn-sm${activeView === v ? ' active' : ''}`}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Avg Sleep', value: `${avgHours}h`, sub: `last ${chartData.length}d`, color: parseFloat(avgHours) >= 7 ? '#22c55e' : '#ef4444', icon: Moon },
          { label: 'Score', value: avgScore || '—', sub: '/100', color: scoreColor, icon: Zap },
          { label: 'Deep', value: latest.deep ? `${latest.deep}h` : '—', sub: 'last night', color: '#6366f1', icon: TrendingUp },
          { label: 'REM', value: latest.rem ? `${latest.rem}h` : '—', sub: 'last night', color: '#22d3ee', icon: Sun },
          { label: 'Debt', value: sleepDebt ? `${sleepDebt}h` : '0h', sub: '14d rolling', color: sleepDebt > 5 ? 'var(--danger)' : sleepDebt > 0 ? 'var(--warning)' : 'var(--success)', icon: Minus },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="glass-card card-shine-wrap" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="label-caps">{label}</span>
              <Icon size={15} color={color} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color, marginTop: '0.3rem', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* TREND VIEW */}
      {activeView === 'trend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="card-title" style={{ margin: 0 }}>Sleep Duration Trend ({chartData.length} nights)</span>
              <SleepScoreGauge score={avgScore} />
            </div>
            {chartData.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
                <Moon size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.2 }} />
                <p style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: '4px' }}>No sleep data yet</p>
                <p style={{ fontSize: '0.82rem' }}>Switch to the LOG tab to add your first entry.</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="deepGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" stroke="var(--text-3)" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} stroke="var(--text-3)" tick={{ fontSize: 11 }} unit="h" />
                    <Tooltip content={<CustomTooltip />} />
                    {/* 8h target reference line rendered as constant data */}
                    <Area type="monotone" dataKey="hours" stroke="#6366f1" fill="url(#sleepGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} name="Total" unit="h" />
                    <Area type="monotone" dataKey="deep" stroke="#22d3ee" fill="url(#deepGrad)" strokeWidth={1.5} dot={false} name="Deep" unit="h" />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Optimal target indicator */}
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <span style={{
                    padding: '0.35rem 1rem', borderRadius: 'var(--radius-pill)', fontSize: '0.72rem', fontWeight: 700,
                    background: parseFloat(avgHours) >= 7 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: parseFloat(avgHours) >= 7 ? '#22c55e' : '#ef4444',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    border: `1px solid ${parseFloat(avgHours) >= 7 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
                  }}>
                    {parseFloat(avgHours) >= 7 ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {parseFloat(avgHours) >= 7
                      ? `On target — ${avgHours}h avg`
                      : `Below optimal — need +${(7 - parseFloat(avgHours)).toFixed(1)}h/night`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* STAGES VIEW */}
      {activeView === 'stages' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Stage pie chart */}
          <div className="glass-card">
            <span className="card-title">Last Entry — Stage Breakdown</span>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>⚠️ Estimated values based on 22% Deep / 20% REM / 58% Light ratios.</p>
            {stageData.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>No data yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={stageData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                      {stageData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}h`]} contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '10px', backdropFilter: 'blur(12px)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="macro-ring-legend" style={{ marginTop: '0.5rem' }}>
                  {stageData.map(s => (
                    <div key={s.name} className="macro-ring-legend__item">
                      <div className="macro-ring-legend__dot" style={{ background: s.fill }} />
                      <span className="macro-ring-legend__label">{s.name} Sleep</span>
                      <span className="macro-ring-legend__value">{s.value}h</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Score trend bar chart */}
          <div className="glass-card">
            <span className="card-title">Sleep Score Trend</span>
            {chartData.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-3)" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="var(--text-3)" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} name="Score" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* LOG VIEW */}
      {activeView === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.75rem', borderTop: '3px solid var(--accent)' }}>
            <p className="label-caps" style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Log Sleep Session</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              {[
                { label: 'Date', type: 'date', key: 'date', maxWidth: '160px' },
                { label: 'Bed Time', type: 'time', key: 'bed_time', maxWidth: '130px' },
                { label: 'Wake Time', type: 'time', key: 'wake_time', maxWidth: '130px' },
              ].map(({ label, type, key, maxWidth }) => (
                <div key={key}>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>{label}</label>
                  <input type={type} value={logForm[key]}
                    onChange={e => setLogForm({ ...logForm, [key]: e.target.value })}
                    className="form-input" style={{ maxWidth }} />
                </div>
              ))}

              {/* Duration preview */}
              {previewDuration && (
                <div style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', color: 'var(--accent)', fontWeight: 900, fontSize: '1.1rem', alignSelf: 'center', fontFamily: 'var(--font-display)' }}>
                  {previewDuration}h
                </div>
              )}

              <div style={{ flex: '1 1 180px' }}>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                  Quality: <span style={{ color: 'var(--accent)', fontWeight: 900 }}>{logForm.quality}/10 — {QUALITY_LABELS[logForm.quality]}</span>
                </label>
                <input
                  type="range" min="1" max="10" step="1"
                  value={logForm.quality}
                  onChange={e => setLogForm({ ...logForm, quality: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>
                  <span>1 — Terrible</span><span>10 — Perfect</span>
                </div>
              </div>

              <div style={{ flex: '1 1 200px' }}>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Notes</label>
                <input type="text" placeholder="Dreams, disturbances…" value={logForm.notes}
                  onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                  className="form-input" />
              </div>

              <button onClick={handleLogSleep} className="btn-primary" disabled={saving}>
                <Plus size={16} /> {saving ? 'Saving…' : 'Log Session'}
              </button>
            </div>
          </div>

          {/* History list */}
          <div className="glass-card" style={{ padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title" style={{ margin: 0 }}>Sleep History</span>
              <span className="badge">{logs.length} entries</span>
            </div>
            {isLoading ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Syncing history…</p>
            ) : logs.length === 0 ? (
              <p style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
                No entries yet. Log your first sleep session above.
              </p>
            ) : (
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {logs.slice(0, 30).map(entry => {
                  const hrs = parseFloat(entry.duration || 0);
                  const score = Math.min(100, Math.round((hrs / 8) * 100));
                  const scoreColor = score >= 75 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={entry.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.5rem', borderBottom: '1px solid var(--border)' }} className="hover-bg-subtle">
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-1)', minWidth: '88px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{entry.date}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.95rem' }}>{hrs.toFixed(1)}h</span>
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: `${scoreColor}18`, color: scoreColor, fontWeight: 700, border: `1px solid ${scoreColor}40` }}>
                          {score}/100
                        </span>
                        {entry.bed_time && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                            {entry.bed_time} → {entry.wake_time}
                          </span>
                        )}
                        {entry.quality && (
                          <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 700 }}>
                            Q:{entry.quality}/10
                          </span>
                        )}
                        {entry.notes && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.notes}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.date)}
                        className="btn-icon hover-text-danger"
                        style={{ color: 'var(--text-3)', flexShrink: 0 }}
                        title="Delete entry"
                      ><Trash2 size={13} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TIPS VIEW */}
      {activeView === 'tips' && (
        <div className="glass-card">
          <span className="card-title">Evidence-Based Sleep Optimisation</span>
          <div className="stagger-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {tips.map(({ icon: Icon, tip, priority }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.25rem',
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${PRIORITY_COLOR[priority] || '#f59e0b'}`,
                transition: 'background 0.2s'
              }} className="hover-bg-subtle">
                <Icon size={18} color={PRIORITY_COLOR[priority] || '#f59e0b'} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{tip}</span>
                <span style={{
                  fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${PRIORITY_COLOR[priority]}`, color: PRIORITY_COLOR[priority], flexShrink: 0, letterSpacing: '0.06em'
                }}>{priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
