import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Dumbbell, Plus, Trash2, Trophy, Flame, ChevronDown, ChevronUp } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LIFTS = ['benchPress', 'squat', 'deadlift', 'ohp'];
const LIFT_LABELS = { benchPress: 'Bench Press', squat: 'Squat', deadlift: 'Deadlift', ohp: 'OHP' };

export default function Training({ user, setUser }) {
  const updateSection = (section, data) => {
    setUser({ ...user, [section]: { ...(user?.[section] || {}), ...data } });
  };

  const training = user?.training || {};
  const schedule = training.schedule || [];
  const PRs = training.PRs || {};
  const prHistory = training.prHistory || [];
  const streak = training.streak || 0;
  const longestStreak = training.longestStreak || 0;

  const [expandedDay, setExpandedDay] = useState(null);
  const [newEx, setNewEx] = useState({ name: '', sets: '', reps: '', weight: '' });
  const [newDay, setNewDay] = useState({ day: 'Mon', muscleGroup: '' });
  const [prForm, setPrForm] = useState({ lift: 'benchPress', weight: '' });
  const [activePRLift, setActivePRLift] = useState('benchPress');

  const totalVolume = schedule.reduce((total, day) =>
    total + (day.exercises || []).reduce((s, e) => s + (Number(e.sets) * Number(e.reps) * Number(e.weight) || 0), 0), 0
  );

  const addDay = () => {
    if (!newDay.muscleGroup) return;
    if (schedule.find(d => d.day === newDay.day)) return;
    updateSection('training', { schedule: [...schedule, { ...newDay, exercises: [], id: Date.now() }] });
  };

  const addExercise = (dayId) => {
    if (!newEx.name) return;
    const updated = schedule.map(d =>
      d.id === dayId ? { ...d, exercises: [...(d.exercises || []), { ...newEx, id: Date.now() }] } : d
    );
    updateSection('training', { schedule: updated });
    setNewEx({ name: '', sets: '', reps: '', weight: '' });
  };

  const removeExercise = (dayId, exId) => {
    const updated = schedule.map(d =>
      d.id === dayId ? { ...d, exercises: (d.exercises || []).filter(e => e.id !== exId) } : d
    );
    updateSection('training', { schedule: updated });
  };

  const removeDay = (dayId) => {
    updateSection('training', { schedule: schedule.filter(d => d.id !== dayId) });
  };

  const logPR = () => {
    if (!prForm.weight) return;
    const w = Number(prForm.weight);
    const newPRs = { ...PRs, [prForm.lift]: Math.max(PRs[prForm.lift] || 0, w) };
    const newHistory = [...prHistory, { date: new Date().toISOString().slice(0, 10), lift: prForm.lift, weight: w }];
    updateSection('training', { PRs: newPRs, prHistory: newHistory });
    setPrForm({ lift: prForm.lift, weight: '' });
  };

  const incrementStreak = () => {
    const newStreak = streak + 1;
    updateSection('training', { streak: newStreak, longestStreak: Math.max(longestStreak, newStreak) });
  };

  const prChartData = prHistory.filter(h => h.lift === activePRLift).slice(-10)
    .map(h => ({ date: h.date.slice(5), weight: h.weight }));

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Training</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
          <Dumbbell size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
          Training Matrix
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Workout tracker — schedule, volume, and personal records.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Weekly Volume', value: `${(totalVolume / 1000).toFixed(1)}k kg`, icon: <Dumbbell size={18} color="var(--accent)" />, color: 'var(--accent)' },
          { label: 'Current Streak', value: `${streak} days`, icon: <Flame size={18} color="var(--warning)" />, color: 'var(--warning)' },
          { label: 'Best Streak', value: `${longestStreak} days`, icon: <Trophy size={18} color="var(--warning)" />, color: 'var(--warning)' },
          { label: 'Days Planned', value: `${schedule.length} / 7`, icon: <Dumbbell size={18} color="var(--info)" />, color: 'var(--info)' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '1.15rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '0.4rem' }}>{s.icon}</div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</p>
            <p className="label-caps" style={{ marginTop: '0.2rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Weekly Schedule */}
        <div className="glass-card" style={{ gridColumn: schedule.length > 0 ? 'span 2' : 'span 1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="card-title" style={{ margin: 0 }}>Weekly Schedule</span>
            <button onClick={incrementStreak} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}>
              + Log Today
            </button>
          </div>

          {/* Add day */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={newDay.day} onChange={e => setNewDay({ ...newDay, day: e.target.value })} className="form-input" style={{ width: 'auto' }}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input placeholder="Muscle group (e.g. Push / Chest)" value={newDay.muscleGroup}
              onChange={e => setNewDay({ ...newDay, muscleGroup: e.target.value })}
              className="form-input" style={{ flex: 1 }} />
            <button onClick={addDay} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
              <Plus size={14} />
            </button>
          </div>

          {/* Day cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {schedule.length === 0 && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', gridColumn: '1/-1' }}>No days scheduled yet. Add your first day above.</p>
            )}
            {schedule.map(day => (
              <div key={day.id} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '0.85rem', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-1)' }}>{day.day}</span>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--accent)' }}>{day.muscleGroup}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}>
                      {expandedDay === day.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => removeDay(day.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
                  {(day.exercises || []).length} exercises
                </p>
                {expandedDay === day.id && (
                  <div style={{ marginTop: '0.75rem' }}>
                    {(day.exercises || []).map(ex => (
                      <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderTop: '1px solid var(--border)' }}>
                        <div>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{ex.name}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{ex.sets}×{ex.reps} @ {ex.weight}kg</p>
                        </div>
                        <button onClick={() => removeExercise(day.id, ex.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px 60px 36px', gap: '4px', marginTop: '0.5rem' }}>
                      {['name', 'sets', 'reps', 'weight'].map(f => (
                        <input key={f} placeholder={f === 'weight' ? 'kg' : f}
                          value={newEx[f]} onChange={e => setNewEx({ ...newEx, [f]: e.target.value })}
                          className="form-input" style={{ padding: '0.35rem', fontSize: '0.72rem' }} />
                      ))}
                      <button onClick={() => addExercise(day.id)} className="btn-primary" style={{ padding: '0.35rem', fontSize: '0.7rem' }}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PRs */}
        <div className="glass-card">
          <span className="card-title">Personal Records</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '1rem' }}>
            {LIFTS.map(lift => (
              <div key={lift} style={{ background: 'var(--bg-elevated)', padding: '0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p className="label-caps">{LIFT_LABELS[lift]}</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginTop: '0.15rem' }}>{PRs[lift] ? `${PRs[lift]}kg` : '—'}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <select value={prForm.lift} onChange={e => setPrForm({ ...prForm, lift: e.target.value })} className="form-input" style={{ flex: 1 }}>
              {LIFTS.map(l => <option key={l} value={l}>{LIFT_LABELS[l]}</option>)}
            </select>
            <input type="number" placeholder="kg" value={prForm.weight} onChange={e => setPrForm({ ...prForm, weight: e.target.value })}
              className="form-input" style={{ width: '70px' }} />
            <button onClick={logPR} className="btn-primary" style={{ padding: '0.5rem 0.75rem' }}>Log</button>
          </div>
        </div>
      </div>

      {/* PR Progression Chart */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="card-title" style={{ margin: 0 }}>PR Progression</span>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {LIFTS.map(l => (
              <button key={l} onClick={() => setActivePRLift(l)}
                className={`btn-sm${activePRLift === l ? ' active' : ''}`}>
                {l === 'benchPress' ? 'BP' : l === 'ohp' ? 'OHP' : l.slice(0, 3).toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {prChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={prChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} unit="kg" />
              <Tooltip contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', backdropFilter: 'blur(12px)' }} />
              <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent)' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center', padding: '2.5rem 0' }}>Log PRs to see progression</p>
        )}
      </div>
    </div>
  );
}
