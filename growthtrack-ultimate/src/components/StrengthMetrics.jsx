import React, { useState, useMemo } from 'react';
import {
  Dumbbell, Plus, Trash2, Save, Trophy, TrendingUp, Activity, Target, Zap, BarChart2
} from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';

// ── Default goals — shown as placeholders until user edits them
const DEFAULT_GOALS = {
  'Bench Press': 100,
  'Squat': 150,
  'Deadlift': 180,
  'Overhead Press': 65,
  'Pull-ups': 20,
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StrengthMetrics({ user }) {
  const toast = useToast();
  const metric_logs = useStore(s => s.metric_logs);
  const saveMetricLog = useStore(s => s.saveMetricLog);

  const [form, setForm] = useState({ exercise: 'Bench Press', weight: '', reps: '', sets: '' });
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gt_strength_goals') || 'null') || DEFAULT_GOALS; }
    catch { return DEFAULT_GOALS; }
  });
  const [editingGoal, setEditingGoal] = useState(null);

  // ── Filter strength logs from metric_logs
  const strengthLogs = useMemo(() => {
    if (!metric_logs?.length) return [];
    return metric_logs.filter(l => l.type === 'strength' || l.exercise);
  }, [metric_logs]);

  // ── Compute per-exercise bests from logs
  const exerciseBests = useMemo(() => {
    const bests = {};
    strengthLogs.forEach(l => {
      if (!l.exercise) return;
      const prev = bests[l.exercise];
      if (!prev || l.weight > prev.weight) bests[l.exercise] = l;
    });
    return bests;
  }, [strengthLogs]);

  // ── Weekly volume per day (sum of weight × reps × sets)
  const weeklyVolume = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const dayVols = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    strengthLogs.forEach(l => {
      const d = new Date(l.date);
      if (d >= startOfWeek) {
        const day = dayNames[d.getDay()];
        dayVols[day] = (dayVols[day] || 0) + ((l.weight || 0) * (l.reps || 1) * (l.sets || 1));
      }
    });
    return DAYS.map(day => ({ day, volume: dayVols[day] || 0 }));
  }, [strengthLogs]);

  const totalVolume = weeklyVolume.reduce((a, d) => a + d.volume, 0);
  const trainingDays = weeklyVolume.filter(d => d.volume > 0).length;
  const maxVolume = Math.max(...weeklyVolume.map(d => d.volume), 1);

  const handleLogSet = async () => {
    if (!form.exercise || !form.weight || !form.reps) {
      toast.error('Exercise, weight, and reps are required.');
      return;
    }
    const log = {
      type: 'strength',
      exercise: form.exercise,
      weight: parseFloat(form.weight),
      reps: parseInt(form.reps),
      sets: parseInt(form.sets) || 1,
      date: new Date().toISOString().slice(0, 10),
    };
    await saveMetricLog(log);
    toast.success(`Logged: ${form.exercise} ${form.weight}kg × ${form.reps}`);
    setForm(f => ({ ...f, weight: '', reps: '', sets: '' }));
  };

  const handleSaveGoal = (exercise, value) => {
    const updated = { ...goals, [exercise]: parseFloat(value) || goals[exercise] };
    setGoals(updated);
    localStorage.setItem('gt_strength_goals', JSON.stringify(updated));
    setEditingGoal(null);
    toast.success(`Goal updated: ${exercise} → ${value}kg`);
  };

  const exercises = Object.keys(goals);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Performance Engine</p>
        <h2 className="text-display" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Dumbbell size={28} color="var(--accent)" /> Strength Metrics
        </h2>
        <p className="text-secondary">Live personal records from your logged sessions.</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Weekly Volume', value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '—', icon: BarChart2, color: '#3b82f6' },
          { label: 'Training Days', value: `${trainingDays}/7`, icon: Activity, color: '#10b981' },
          { label: 'Total Sessions', value: strengthLogs.length, icon: Trophy, color: '#f59e0b' },
          { label: 'PRs Tracked', value: Object.keys(exerciseBests).length, icon: Zap, color: 'var(--accent)' },
        ].map((k, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <k.icon size={20} color={k.color} />
            </div>
            <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '4px' }}>{k.label}</p>
            <span className="text-display" style={{ fontSize: '2rem' }}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* Log a Set */}
      <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2rem', borderTop: '2px solid var(--accent)' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Log a Working Set</p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Exercise</label>
            <select className="form-input" value={form.exercise} onChange={e => setForm(f => ({ ...f, exercise: e.target.value }))}>
              {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              <option value="Custom">Custom…</option>
            </select>
          </div>
          {form.exercise === 'Custom' && (
            <div style={{ flex: '1 1 160px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Custom Name</label>
              <input className="form-input" placeholder="e.g. Romanian Deadlift"
                onBlur={e => setForm(f => ({ ...f, exercise: e.target.value || 'Custom' }))} />
            </div>
          )}
          <div style={{ flex: '1 1 100px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Weight (kg)</label>
            <input className="form-input" type="number" min={0} step={0.5} placeholder="80"
              value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
          </div>
          <div style={{ flex: '1 1 80px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Reps</label>
            <input className="form-input" type="number" min={1} max={100} placeholder="8"
              value={form.reps} onChange={e => setForm(f => ({ ...f, reps: e.target.value }))} />
          </div>
          <div style={{ flex: '1 1 80px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Sets</label>
            <input className="form-input" type="number" min={1} max={20} placeholder="3"
              value={form.sets} onChange={e => setForm(f => ({ ...f, sets: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={handleLogSet} style={{ height: '44px' }}>
            <Plus size={16} /> LOG SET
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* PR Table */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <Target size={20} color="var(--accent)" />
            <h3 className="card-title" style={{ margin: 0 }}>Personal Records vs Goals</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {exercises.map(ex => {
              const best = exerciseBests[ex];
              const goal = goals[ex];
              const progress = best ? Math.min(100, Math.round((best.weight / goal) * 100)) : 0;
              return (
                <div key={ex}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>{ex}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: best ? '#10b981' : 'var(--text-3)', fontWeight: 800 }}>
                        {best ? `${best.weight}kg` : 'No data'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>/ </span>
                      {editingGoal === ex ? (
                        <input autoFocus type="number" defaultValue={goal} style={{ width: '60px', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--accent)', background: 'var(--bg-dark)', color: 'var(--text-1)' }}
                          onBlur={e => handleSaveGoal(ex, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveGoal(ex, e.target.value); if (e.key === 'Escape') setEditingGoal(null); }} />
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setEditingGoal(ex)} title="Click to edit goal">{goal}kg</span>
                      )}
                    </div>
                  </div>
                  <div style={{ height: '5px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#10b981' : 'var(--accent)', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '1rem' }}>
            Click a goal value to edit. Session logs persist to the backend.
          </p>
        </div>

        {/* Weekly Volume Chart */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <TrendingUp size={20} color="#3b82f6" />
            <h3 className="card-title" style={{ margin: 0 }}>Weekly Volume</h3>
          </div>
          {totalVolume === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', color: 'var(--text-3)' }}>
              <Dumbbell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontSize: '0.82rem' }}>No sessions logged this week</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '160px' }}>
              {weeklyVolume.map(d => (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '100%',
                    height: `${Math.round((d.volume / maxVolume) * 120)}px`,
                    background: d.volume > 0 ? 'var(--accent)' : 'var(--bg-elevated)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s ease',
                    minHeight: '4px',
                  }} title={d.volume > 0 ? `${d.volume}kg total volume` : 'Rest day'} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{d.day}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Session Log */}
      {strengthLogs.length > 0 && (
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Recent Sessions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '240px', overflowY: 'auto' }}>
            {[...strengthLogs].reverse().slice(0, 15).map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-dark)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Dumbbell size={14} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{l.exercise}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 800 }}>{l.weight}kg × {l.reps} reps × {l.sets || 1} sets</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{l.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
