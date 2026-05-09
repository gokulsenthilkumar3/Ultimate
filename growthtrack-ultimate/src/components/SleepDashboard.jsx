import React, { useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { Moon, Sun, Zap, Clock, TrendingUp, AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import useStore, { selectSleepLogs, selectSaveSleepLog, apiSync } from '../store/useStore';

const SLEEP_TIPS = [
  { icon: Moon, tip: 'Aim for consistent bed/wake times within 30-min window', priority: 'HIGH' },
  { icon: Sun, tip: 'Get 10 min sunlight within 30 min of waking to anchor circadian clock', priority: 'HIGH' },
  { icon: Zap, tip: 'Cut caffeine 8–10 hours before target bedtime', priority: 'MED' },
  { icon: Clock, tip: 'Keep bedroom temp 18–20°C for optimal deep sleep onset', priority: 'MED' },
  { icon: TrendingUp, tip: 'Progressive resistance training improves slow-wave sleep by ~15%', priority: 'LOW' },
];
const PRIORITY_COLOR = { HIGH: '#ef4444', MED: '#f59e0b', LOW: '#22c55e' };
const QUALITY_LABELS = { 1: 'Terrible', 2: 'Very Bad', 3: 'Bad', 4: 'Below Avg', 5: 'Average', 6: 'Above Avg', 7: 'Good', 8: 'Very Good', 9: 'Excellent', 10: 'Perfect' };

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

const parseTime = (t) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
};

const calcDuration = (bed, wake) => {
  if (!bed || !wake) return '';
  let b = parseTime(bed), w = parseTime(wake);
  if (w < b) w += 24;
  return (w - b).toFixed(1);
};

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

  const handleDeleteEntry = useCallback(async (date) => {
    try {
      await apiSync(`/sleep_logs/${date}`, 'DELETE');
      toast.success('Entry deleted');
      const fetchData = useStore.getState().fetchInitialData;
      if (fetchData) fetchData();
    } catch {
      toast.error('Delete failed');
    }
  }, [toast]);

  const handleLogSleep = async () => {
    if (!logForm.date) return toast.error('Date is required');
    if (!logForm.bed_time || !logForm.wake_time) return toast.error('Enter bed and wake times');
    const duration = parseFloat(calcDuration(logForm.bed_time, logForm.wake_time));
    if (duration <= 0 || duration > 14) return toast.error('Invalid sleep duration calculated');
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

  const chartData = (logs || []).length > 0 ? buildChartData(logs) : [];
  const avgHours = chartData.length ? (chartData.reduce((s, d) => s + d.hours, 0) / chartData.length).toFixed(1) : '—';
  const avgScore = chartData.length ? Math.round(chartData.reduce((s, d) => s + d.score, 0) / chartData.length) : 0;
  const latest = chartData[chartData.length - 1] || {};
  const scoreColor = avgScore >= 75 ? '#22c55e' : avgScore >= 55 ? '#f59e0b' : '#ef4444';

  const stageData = latest.hours ? [
    { name: 'Deep', value: +latest.deep, fill: '#6366f1' },
    { name: 'REM', value: +latest.rem, fill: '#22d3ee' },
    { name: 'Light', value: +latest.light, fill: '#94a3b8' },
  ] : [];

  const tooltipStyle = { background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(12px)' };
  const previewDuration = logForm.bed_time && logForm.wake_time ? calcDuration(logForm.bed_time, logForm.wake_time) : null;

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Sleep</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Moon size={24} /> Sleep Analytics
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
            {logs.length} logged sessions · synced to cloud
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['trend', 'stages', 'log', 'tips'].map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`btn-sm${activeView === v ? ' active' : ''}`}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Avg Sleep', value: `${avgHours}h`, sub: `last ${chartData.length} days`, color: parseFloat(avgHours) >= 7 ? '#22c55e' : '#ef4444', icon: Moon },
          { label: 'Sleep Score', value: avgScore || '—', sub: '/100', color: scoreColor, icon: Zap },
          { label: 'Deep Sleep', value: latest.deep ? `${latest.deep}h` : '—', sub: 'last entry', color: '#6366f1', icon: TrendingUp },
          { label: 'REM Sleep', value: latest.rem ? `${latest.rem}h` : '—', sub: 'last entry', color: '#22d3ee', icon: Sun },
          { label: 'Total Logs', value: logs.length, sub: 'all time', color: 'var(--accent)', icon: AlertCircle },
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

      {/* Trend Chart */}
      {activeView === 'trend' && (
        <div className="glass-card">
          <span className="card-title">Sleep Duration Trend (last {chartData.length} logged nights)</span>
          {chartData.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
              No sleep data logged yet. Switch to the LOG tab to add entries.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-3)" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} stroke="var(--text-3)" tick={{ fontSize: 11 }} unit="h" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}h`, 'Sleep']} />
                  <Area type="monotone" dataKey="hours" stroke="#6366f1" fill="url(#sleepGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <span style={{ padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 600, background: parseFloat(avgHours) >= 7 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: parseFloat(avgHours) >= 7 ? '#22c55e' : '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {parseFloat(avgHours) >= 7 ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {parseFloat(avgHours) >= 7 ? `On target — ${avgHours}h avg` : `Below optimal — need +${(7 - parseFloat(avgHours)).toFixed(1)}h/night`}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {activeView === 'stages' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div className="glass-card">
            <span className="card-title">Last Entry — Stage Breakdown</span>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px', marginBottom: '0.5rem' }}>⚠️ Estimated values — 22% Deep / 20% REM / 58% Light. Actual stages require a sleep tracker device.</p>
            {stageData.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>No sleep data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart cx="50%" cy="50%" innerRadius={40} outerRadius={110} data={stageData}>
                  <RadialBar minAngle={15} label={{ fill: 'var(--text-1)', fontSize: 12 }} background clockWise dataKey="value" />
                  <Legend iconSize={10} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}h`]} />
                </RadialBarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="glass-card">
            <span className="card-title">Sleep Score Trend</span>
            {chartData.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>No sleep data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-3)" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="var(--text-3)" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="score" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {activeView === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.75rem', borderTop: '2px solid var(--accent)' }}>
            <p className="label-caps" style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Log Sleep Session</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Date</label>
                <input type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} className="form-input" style={{ maxWidth: '160px' }} />
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Bed Time</label>
                <input type="time" value={logForm.bed_time} onChange={e => setLogForm({ ...logForm, bed_time: e.target.value })} className="form-input" style={{ maxWidth: '130px' }} />
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Wake Time</label>
                <input type="time" value={logForm.wake_time} onChange={e => setLogForm({ ...logForm, wake_time: e.target.value })} className="form-input" style={{ maxWidth: '130px' }} />
              </div>
              {previewDuration && (
                <div style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 800, fontSize: '0.9rem', alignSelf: 'center' }}>
                  {previewDuration}h
                </div>
              )}
              <div style={{ flex: '1 1 180px' }}>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                  Quality: <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{logForm.quality}/10 — {QUALITY_LABELS[logForm.quality]}</span>
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
                <input type="text" placeholder="Dreams, disturbances, etc." value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} className="form-input" />
              </div>
              <button onClick={handleLogSleep} className="btn-primary" disabled={saving}>
                <Plus size={16} /> {saving ? 'Saving…' : 'LOG'}
              </button>
            </div>
          </div>

          {/* Log History */}
          <div className="glass-card" style={{ padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span className="card-title" style={{ margin: 0 }}>Sleep History</span>
              <span className="badge">{logs.length} entries</span>
            </div>
            {isLoading ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Syncing history…</p>
            ) : logs.length === 0 ? (
              <p style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>No entries yet. Log your first sleep session above.</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {logs.slice(0, 30).map(entry => (
                  <div key={entry.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-1)', minWidth: '85px' }}>{entry.date}</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{parseFloat(entry.duration || 0).toFixed(1)}h</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '6px', background: 'var(--bg-elevated)', color: 'var(--text-2)', fontWeight: 700 }}>
                        Score: {Math.min(100, Math.round((parseFloat(entry.duration||0)/8)*100))}/100
                      </span>
                      {entry.bed_time && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{entry.bed_time} → {entry.wake_time}</span>}
                      {entry.quality && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 700 }}>Q:{entry.quality}/10 — {QUALITY_LABELS[entry.quality]}</span>}
                      {entry.notes && <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontStyle: 'italic' }}>{entry.notes}</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(entry.date)}
                      className="btn-icon"
                      style={{ color: 'var(--text-3)', flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      title="Delete entry"
                    ><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: `1px solid ${PRIORITY_COLOR[priority]}`, color: PRIORITY_COLOR[priority], flexShrink: 0 }}>{priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
