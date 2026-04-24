import React, { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Dumbbell, Plus, Trash2, Trophy, Flame, ChevronDown, ChevronUp } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LIFTS = ['benchPress', 'squat', 'deadlift', 'ohp'];
const LIFT_LABELS = { benchPress: 'Bench Press', squat: 'Squat', deadlift: 'Deadlift', ohp: 'OHP' };

export default function Training({ user, updateSection }) {
  const { addToArray, removeFromArray } = useUserStore();
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
    const exists = schedule.find(d => d.day === newDay.day);
    if (exists) return;
    updateSection('training', {
      schedule: [...schedule, { ...newDay, exercises: [], id: Date.now() }],
    });
  };

  const addExercise = (dayId) => {
    if (!newEx.name) return;
    const updated = schedule.map(d =>
      d.id === dayId
        ? { ...d, exercises: [...(d.exercises || []), { ...newEx, id: Date.now() }] }
        : d
    );
    updateSection('training', { schedule: updated });
    setNewEx({ name: '', sets: '', reps: '', weight: '' });
  };

  const removeExercise = (dayId, exId) => {
    const updated = schedule.map(d =>
      d.id === dayId
        ? { ...d, exercises: (d.exercises || []).filter(e => e.id !== exId) }
        : d
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

  const prChartData = prHistory
    .filter(h => h.lift === activePRLift)
    .slice(-10)
    .map(h => ({ date: h.date.slice(5), weight: h.weight }));

  return (
    <div className="fade-in">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>Training Matrix</h2>
        <p className="text-secondary">Workout tracker — schedule, volume, and personal records.</p>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Weekly Volume', value: `${(totalVolume / 1000).toFixed(1)}k kg`, icon: <Dumbbell size={18} /> },
          { label: 'Current Streak', value: `${streak} days`, icon: <Flame size={18} color="#f59e0b" /> },
          { label: 'Best Streak', value: `${longestStreak} days`, icon: <Trophy size={18} color="#f59e0b" /> },
          { label: 'Days Planned', value: `${schedule.length} / 7`, icon: <Dumbbell size={18} /> },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>{s.icon}</div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>{s.value}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Weekly schedule */}
        <div className="glass-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p className="label-caps">Weekly Schedule</p>
            <button onClick={incrementStreak} style={{ padding: '0.4rem 0.9rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}>
              + Log Today
            </button>
          </div>

          {/* Add day */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={newDay.day} onChange={e => setNewDay({ ...newDay, day: e.target.value })}
              style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input placeholder="Muscle group (e.g. Push / Chest)" value={newDay.muscleGroup}
              onChange={e => setNewDay({ ...newDay, muscleGroup: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }} />
            <button onClick={addDay} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
              <Plus size={14} />
            </button>
          </div>

          {/* Day cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '0.75rem' }}>
            {schedule.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', gridColumn: '1/-1' }}>No days scheduled yet. Add your first day above.</p>
            )}
            {schedule.map(day => (
              <div key={day.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{day.day}</span>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{day.muscleGroup}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {expandedDay === day.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => removeDay(day.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {(day.exercises || []).length} exercises
                </p>

                {expandedDay === day.id && (
                  <div style={{ marginTop: '0.75rem' }}>
                    {(day.exercises || []).map(ex => (
                      <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderTop: '1px solid var(--border-light)' }}>
                        <div>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{ex.name}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ex.sets}×{ex.reps} @ {ex.weight}kg</p>
                        </div>
                        <button onClick={() => removeExercise(day.id, ex.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 60px 32px', gap: '4px', marginTop: '0.5rem' }}>
                      {['name', 'sets', 'reps', 'weight'].map(f => (
                        <input key={f} placeholder={f === 'weight' ? 'kg' : f}
                          value={newEx[f]} onChange={e => setNewEx({ ...newEx, [f]: e.target.value })}
                          style={{ padding: '0.3rem', background: 'rgba(0,0,0,0.3)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.7rem' }} />
                      ))}
                      <button onClick={() => addExercise(day.id)}
                        style={{ padding: '0.3rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
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
          <p className="label-caps" style={{ marginBottom: '1rem' }}>Personal Records</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            {LIFTS.map(lift => (
              <div key={lift} style={{ background: 'rgba(255,255,255,0.04)', padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{LIFT_LABELS[lift]}</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{PRs[lift] ? `${PRs[lift]}kg` : '—'}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <select value={prForm.lift} onChange={e => setPrForm({ ...prForm, lift: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }}>
              {LIFTS.map(l => <option key={l} value={l}>{LIFT_LABELS[l]}</option>)}
            </select>
            <input type="number" placeholder="kg" value={prForm.weight} onChange={e => setPrForm({ ...prForm, weight: e.target.value })}
              style={{ width: '70px', padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }} />
            <button onClick={logPR} style={{ padding: '0.5rem 0.75rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Log</button>
          </div>
        </div>

        {/* PR progression chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p className="label-caps">PR Progression</p>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {LIFTS.map(l => (
                <button key={l} onClick={() => setActivePRLift(l)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', background: activePRLift === l ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)', color: activePRLift === l ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {l === 'benchPress' ? 'BP' : l === 'ohp' ? 'OHP' : l.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {prChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={prChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="kg" />
                <Tooltip contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }} />
                <Line type="monotone" dataKey="weight" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent-primary)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Log PRs to see progression</p>
          )}
        </div>
      </div>
    </div>
  );
}
