import { Z_INDEX } from '../constants';
import React, { useState, useMemo } from 'react';
import {
  Dumbbell, Plus, Trash2, Save, Trophy, TrendingUp, Activity, Target, Zap, BarChart2, X
} from 'lucide-react';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';

const DEFAULT_GOALS = {
  'Bench Press': 100,
  'Squat': 150,
  'Deadlift': 180,
  'Overhead Press': 65,
  'Pull-ups': 20,
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body'];
const EXERCISE_TYPES = ['Compound', 'Isolation', 'Cardio', 'Plyometric'];

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

  // ── Custom exercise modal state
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [customExForm, setCustomExForm] = useState({ name: '', muscleGroup: 'Chest', type: 'Compound', goalWeight: '' });

  const strengthLogs = useMemo(() => {
    if (!metric_logs?.length) return [];
    return metric_logs.filter(l => l.type === 'strength' || l.exercise);
  }, [metric_logs]);

  const exerciseBests = useMemo(() => {
    const bests = {};
    strengthLogs.forEach(l => {
      if (!l.exercise) return;
      const prev = bests[l.exercise];
      if (!prev || l.weight > prev.weight) bests[l.exercise] = l;
    });
    return bests;
  }, [strengthLogs]);

  // ── Per-exercise trend data (last 8 sessions, max weight per session)
  const exerciseTrends = useMemo(() => {
    const trends = {};
    const exercises = Object.keys(goals);
    exercises.forEach(ex => {
      const exLogs = strengthLogs
        .filter(l => l.exercise === ex)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      // group by date, take max weight per date
      const byDate = {};
      exLogs.forEach(l => {
        if (!byDate[l.date] || l.weight > byDate[l.date]) byDate[l.date] = l.weight;
      });
      trends[ex] = Object.entries(byDate)
        .slice(-8)
        .map(([date, w]) => ({ date, w }));
    });
    return trends;
  }, [strengthLogs, goals]);

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

  const totalVolume  = weeklyVolume.reduce((a, d) => a + d.volume, 0);
  const trainingDays = weeklyVolume.filter(d => d.volume > 0).length;
  const maxVolume    = Math.max(...weeklyVolume.map(d => d.volume), 1);

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

  const handleAddCustomExercise = () => {
    if (!customExForm.name.trim()) { toast.error('Exercise name is required.'); return; }
    const goalVal = parseFloat(customExForm.goalWeight) || 60;
    const updated = { ...goals, [customExForm.name.trim()]: goalVal };
    setGoals(updated);
    localStorage.setItem('gt_strength_goals', JSON.stringify(updated));
    setForm(f => ({ ...f, exercise: customExForm.name.trim() }));
    toast.success(`${customExForm.name} added (${customExForm.muscleGroup} · ${customExForm.type})`);
    setCustomExForm({ name: '', muscleGroup: 'Chest', type: 'Compound', goalWeight: '' });
    setShowAddExercise(false);
  };

  const handleRemoveExercise = (ex) => {
    if (DEFAULT_GOALS[ex]) { toast.error('Cannot remove a default exercise.'); return; }
    const updated = { ...goals };
    delete updated[ex];
    setGoals(updated);
    localStorage.setItem('gt_strength_goals', JSON.stringify(updated));
    toast.info(`${ex} removed.`);
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
          { label: 'Weekly Volume',  value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '—', icon: BarChart2, color: '#3b82f6' },
          { label: 'Training Days',  value: `${trainingDays}/7`, icon: Activity, color: '#10b981' },
          { label: 'Total Sessions', value: strengthLogs.length, icon: Trophy, color: '#f59e0b' },
          { label: 'PRs Tracked',    value: Object.keys(exerciseBests).length, icon: Zap, color: 'var(--accent)' },
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
            </select>
          </div>
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
          <button className="btn-secondary" onClick={() => setShowAddExercise(true)} style={{ height: '44px' }} title="Add custom exercise">
            <Plus size={14} /> Add Exercise
          </button>
        </div>
      </div>

      {/* Custom Exercise Modal */}
      {showAddExercise && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: Z_INDEX.MODAL_BACKDROP, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ padding: '2rem', width: '100%', maxWidth: '440px', position: 'relative' }}>
            <button onClick={() => setShowAddExercise(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
              <X size={18} />
            </button>
            <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>Add Custom Exercise</h3>
            <div className="form-stack">
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Exercise Name</label>
                <input className="form-input" placeholder="e.g. Romanian Deadlift" value={customExForm.name}
                  onChange={e => setCustomExForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Muscle Group</label>
                  <select className="form-input" value={customExForm.muscleGroup} onChange={e => setCustomExForm(f => ({ ...f, muscleGroup: e.target.value }))}>
                    {MUSCLE_GROUPS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Type</label>
                  <select className="form-input" value={customExForm.type} onChange={e => setCustomExForm(f => ({ ...f, type: e.target.value }))}>
                    {EXERCISE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Goal Weight (kg)</label>
                <input className="form-input" type="number" min={0} placeholder="e.g. 80" value={customExForm.goalWeight}
                  onChange={e => setCustomExForm(f => ({ ...f, goalWeight: e.target.value }))} />
              </div>
              <button className="btn-primary btn-full" onClick={handleAddCustomExercise}>
                <Save size={14} /> Save Exercise
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* PR Cards with Sparklines */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={20} color="var(--accent)" />
              <h3 className="card-title" style={{ margin: 0 }}>Personal Records</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {exercises.map(ex => {
              const best     = exerciseBests[ex];
              const goal     = goals[ex];
              const progress = best ? Math.min(100, Math.round((best.weight / goal) * 100)) : 0;
              const trend    = exerciseTrends[ex] || [];
              const isPR     = progress >= 100;
              const isCustom = !DEFAULT_GOALS[ex];
              return (
                <div key={ex} style={{
                  padding: '0.875rem 1rem',
                  background: isPR ? 'rgba(16,185,129,0.07)' : 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: isPR ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)',
                  position: 'relative',
                }}>
                  {isPR && (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#10b981', color: '#fff', fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.05em' }}>PR ✓</span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>{ex}</span>
                        {isCustom && <span style={{ fontSize: '0.55rem', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '1px 5px' }}>custom</span>}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: best ? '#10b981' : 'var(--text-3)', fontWeight: 800 }}>
                        {best ? `${best.weight}kg × ${best.reps}r` : 'No data'}
                      </span>
                      {best && <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginLeft: '6px' }}>{best.date}</span>}
                    </div>
                    {/* Sparkline */}
                    {trend.length >= 2 && (
                      <div style={{ width: '90px', height: '36px', flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trend}>
                            <Line type="monotone" dataKey="w" stroke={isPR ? '#10b981' : 'var(--accent)'} strokeWidth={1.5} dot={false} />
                            <Tooltip formatter={v => [`${v}kg`]} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.65rem', padding: '2px 6px' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                  {/* Progress bar + goal */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{progress}% to goal</span>
                      {editingGoal === ex ? (
                        <input autoFocus type="number" defaultValue={goal}
                          style={{ width: '56px', fontSize: '0.7rem', padding: '1px 4px', borderRadius: '4px', border: '1px solid var(--accent)', background: 'var(--bg-dark)', color: 'var(--text-1)' }}
                          onBlur={e => handleSaveGoal(ex, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveGoal(ex, e.target.value); if (e.key === 'Escape') setEditingGoal(null); }} />
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setEditingGoal(ex)} title="Edit goal">{goal}kg goal</span>
                      )}
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-dark)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: isPR ? '#10b981' : 'var(--accent)', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  {isCustom && (
                    <button onClick={() => handleRemoveExercise(ex)}
                      style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
                      title="Remove exercise">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '1rem' }}>
            Click a goal to edit. Sparklines show last 8 sessions.
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

      {/* Recent Sessions */}
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
