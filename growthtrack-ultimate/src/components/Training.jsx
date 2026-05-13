import React, { useMemo, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { Dumbbell, Plus, Trash2, Trophy, Flame, ChevronDown, ChevronUp, Play, CheckCircle, Clock, Weight } from 'lucide-react';
import EmptyState from './ui/EmptyState';
import useStore, {
  selectTrainingPlan,
  selectUpdateTrainingPlan,
  selectWorkouts,
  selectAddWorkoutFromTrainingDay,
  selectDeleteWorkoutSession,
} from '../store/useStore';
import { useToast } from '../hooks/useToast';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LIFTS = ['benchPress', 'squat', 'deadlift', 'ohp'];
const LIFT_LABELS = { benchPress: 'Bench Press', squat: 'Squat', deadlift: 'Deadlift', ohp: 'OHP' };
const TOOLTIP_STYLE = { background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-1)', backdropFilter: 'blur(12px)', fontSize: '0.82rem' };
const MUSCLE_COLORS = { Push: '#f43f5e', Pull: '#0ea5e9', Legs: '#10b981', Chest: '#f43f5e', Back: '#0ea5e9', Shoulders: '#a78bfa', Arms: '#fb923c', Core: '#fbbf24', Cardio: '#22d3ee', Rest: '#475569' };

function computePlannedVolume(schedule) {
  return schedule.reduce((total, day) => total + (day.exercises || []).reduce((s, e) => s + (Number(e.sets) * Number(e.reps) * Number(e.weight) || 0), 0), 0);
}

function compute7DayVolume(sessions) {
  const now = new Date();
  return sessions.filter(s => {
    if (!s.date) return false;
    const diff = (now - new Date(s.date)) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  }).reduce((sum, s) => sum + (Number(s.volume) || 0), 0);
}

// Build last 30 days volume bar data from sessions
function buildVolumeHistory(sessions) {
  const map = {};
  sessions.forEach(s => {
    if (!s.date) return;
    map[s.date] = (map[s.date] || 0) + (Number(s.volume) || 0);
  });
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key.slice(5), volume: map[key] || 0 });
  }
  return result;
}

export default function Training() {
  const training = useStore(selectTrainingPlan) || {};
  const setTraining = useStore(selectUpdateTrainingPlan);
  const { sessions: workoutSessions } = useStore(selectWorkouts);
  const addWorkoutFromDay = useStore(selectAddWorkoutFromTrainingDay);
  const deleteWorkoutSession = useStore(selectDeleteWorkoutSession);
  const toast = useToast();

  const updateSection = useCallback((data) => setTraining({ ...training, ...data }), [training, setTraining]);

  const schedule = training.schedule || [];
  const PRs = training.PRs || {};
  const prHistory = training.prHistory || [];
  const streak = training.streak || 0;
  const longestStreak = training.longestStreak || 0;

  const [activeTab, setActiveTab] = useState('Schedule');
  const [expandedDay, setExpandedDay] = useState(null);
  const [newEx, setNewEx] = useState({ name: '', sets: '', reps: '', weight: '' });
  const [newDay, setNewDay] = useState({ day: 'Mon', muscleGroup: '' });
  const [prForm, setPrForm] = useState({ lift: 'benchPress', weight: '' });
  const [activePRLift, setActivePRLift] = useState('benchPress');

  // Live session logger state
  const [activeSession, setActiveSession] = useState(null); // { day, startTime, sets: [{exName, set, reps, weight, done}] }
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionRestTimer, setSessionRestTimer] = useState(null);
  const [restSeconds, setRestSeconds] = useState(0);

  const totalPlannedVolume = useMemo(() => computePlannedVolume(schedule), [schedule]);
  const last7LoggedVolume = useMemo(() => compute7DayVolume(workoutSessions), [workoutSessions]);
  const volumeHistory = useMemo(() => buildVolumeHistory(workoutSessions), [workoutSessions]);
  const maxVolume = useMemo(() => Math.max(...volumeHistory.map(d => d.volume), 1), [volumeHistory]);

  const addDay = () => {
    if (!newDay.muscleGroup) return;
    if (schedule.find(d => d.day === newDay.day)) return toast.error(`${newDay.day} already in schedule`);
    updateSection({ schedule: [...schedule, { ...newDay, exercises: [], id: Date.now() }] });
  };

  const addExercise = (dayId) => {
    if (!newEx.name) return;
    const updated = schedule.map(d => d.id === dayId ? { ...d, exercises: [...(d.exercises || []), { ...newEx, id: Date.now() }] } : d);
    updateSection({ schedule: updated });
    setNewEx({ name: '', sets: '', reps: '', weight: '' });
  };

  const removeExercise = (dayId, exId) => {
    const updated = schedule.map(d => d.id === dayId ? { ...d, exercises: (d.exercises || []).filter(e => e.id !== exId) } : d);
    updateSection({ schedule: updated });
  };

  const removeDay = (dayId) => updateSection({ schedule: schedule.filter(d => d.id !== dayId) });

  const logPR = () => {
    if (!prForm.weight) return;
    const w = Number(prForm.weight);
    const newPRs = { ...PRs, [prForm.lift]: Math.max(PRs[prForm.lift] || 0, w) };
    const newHistory = [...prHistory, { date: new Date().toISOString().slice(0, 10), lift: prForm.lift, weight: w }];
    updateSection({ PRs: newPRs, prHistory: newHistory });
    setPrForm({ lift: prForm.lift, weight: '' });
    toast.success(`PR logged: ${LIFT_LABELS[prForm.lift]} ${w}kg`);
  };

  const incrementStreak = () => {
    const newStreak = streak + 1;
    updateSection({ streak: newStreak, longestStreak: Math.max(longestStreak, newStreak) });
  };

  // ── Live Session Logger ──
  const startSession = (day) => {
    const sets = (day.exercises || []).flatMap(ex =>
      Array.from({ length: parseInt(ex.sets) || 3 }, (_, i) => ({
        id: `${ex.id}-${i}`,
        exName: ex.name,
        setNum: i + 1,
        plannedReps: ex.reps,
        plannedWeight: ex.weight,
        actualReps: ex.reps,
        actualWeight: ex.weight,
        done: false,
      }))
    );
    setActiveSession({ day, startTime: Date.now(), sets });
    setSessionNotes('');
    toast.success(`Session started: ${day.day} — ${day.muscleGroup}`);
  };

  const toggleSet = (setId) => {
    setActiveSession(prev => ({
      ...prev,
      sets: prev.sets.map(s => s.id === setId ? { ...s, done: !s.done } : s),
    }));
  };

  const updateSetValue = (setId, field, value) => {
    setActiveSession(prev => ({
      ...prev,
      sets: prev.sets.map(s => s.id === setId ? { ...s, [field]: value } : s),
    }));
  };

  const startRestTimer = (seconds = 90) => {
    setRestSeconds(seconds);
    if (sessionRestTimer) clearInterval(sessionRestTimer);
    const interval = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) { clearInterval(interval); setSessionRestTimer(null); toast.success('Rest over — next set!'); return 0; }
        return prev - 1;
      });
    }, 1000);
    setSessionRestTimer(interval);
  };

  const finishSession = async () => {
    if (!activeSession) return;
    const doneSets = activeSession.sets.filter(s => s.done);
    const volume = doneSets.reduce((sum, s) => sum + (Number(s.actualReps) * Number(s.actualWeight) || 0), 0);
    const elapsed = Math.round((Date.now() - activeSession.startTime) / 60000);
    await addWorkoutFromDay({ ...activeSession.day, _volume: volume, _notes: sessionNotes || `${elapsed} min session — ${doneSets.length} sets completed` });
    incrementStreak();
    setActiveSession(null);
    if (sessionRestTimer) clearInterval(sessionRestTimer);
    toast.success(`Session saved! Volume: ${(volume / 1000).toFixed(2)}k kg · ${elapsed} min`);
  };

  const cancelSession = () => {
    if (sessionRestTimer) clearInterval(sessionRestTimer);
    setActiveSession(null);
    toast.error('Session cancelled');
  };

  const prChartData = prHistory.filter(h => h.lift === activePRLift).slice(-10).map(h => ({ date: h.date.slice(5), weight: h.weight }));
  const recentSessions = workoutSessions.slice(0, 15);

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Training</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
            <Dumbbell size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} /> Training Matrix
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Workout tracker — schedule, live logger, volume, PRs, and logged sessions.</p>
        </div>
        {activeSession && (
          <div style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>LIVE: {activeSession.day.day} {activeSession.day.muscleGroup}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{activeSession.sets.filter(s => s.done).length}/{activeSession.sets.length} sets</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Weekly Volume (Plan)', value: `${(totalPlannedVolume / 1000).toFixed(1)}k kg`, icon: <Dumbbell size={18} color="var(--accent)" />, color: 'var(--accent)' },
          { label: 'Current Streak', value: `${streak} days`, icon: <Flame size={18} color="var(--warning)" />, color: 'var(--warning)' },
          { label: 'Best Streak', value: `${longestStreak} days`, icon: <Trophy size={18} color="var(--warning)" />, color: 'var(--warning)' },
          { label: '7-Day Logged Volume', value: `${(last7LoggedVolume / 1000).toFixed(1)}k kg`, icon: <Dumbbell size={18} color="var(--info)" />, color: 'var(--info)' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '1.15rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '0.4rem' }}>{s.icon}</div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</p>
            <p className="label-caps" style={{ marginTop: '0.2rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {['Schedule', 'Live Logger', 'PRs', 'Volume History', 'Sessions'].map(tab => (
          <button key={tab} className={`btn-sm ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)} style={{ padding: '0.5rem 1.2rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {tab === 'Live Logger' && <Play size={13} style={{ marginRight: '5px' }} />}
            {tab}
          </button>
        ))}
      </div>

      {/* ── SCHEDULE TAB ── */}
      {activeTab === 'Schedule' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="card-title" style={{ margin: 0 }}>Weekly Schedule</span>
            <button onClick={incrementStreak} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}>+ Mark Today Done</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={newDay.day} onChange={e => setNewDay({ ...newDay, day: e.target.value })} className="form-input" style={{ width: 'auto' }}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input placeholder="Muscle group (e.g. Push / Chest)" value={newDay.muscleGroup} onChange={e => setNewDay({ ...newDay, muscleGroup: e.target.value })} className="form-input" style={{ flex: 1 }} />
            <button onClick={addDay} className="btn-primary" style={{ padding: '0.5rem 1rem' }}><Plus size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {schedule.length === 0 && (
              <div style={{ gridColumn: '1/-1' }}><EmptyState icon={Dumbbell} title="No Training Days Scheduled" description="Select a day and muscle group above to start building your workout split." /></div>
            )}
            {schedule.map(day => {
              const mg = day.muscleGroup || '';
              const color = MUSCLE_COLORS[mg] || MUSCLE_COLORS[Object.keys(MUSCLE_COLORS).find(k => mg.toLowerCase().includes(k.toLowerCase())) || ''] || 'var(--accent)';
              return (
                <div key={day.id} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', border: `1px solid ${color}44` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{day.day}</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color, fontWeight: 700 }}>{day.muscleGroup}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button onClick={() => startSession(day)} title="Start live session" style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px' }}><Play size={15} /></button>
                      <button onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}>{expandedDay === day.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                      <button onClick={() => removeDay(day.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>

                    </div>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>{(day.exercises || []).length} exercises · click ▶ to start live</p>
                  {expandedDay === day.id && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {(day.exercises || []).map(ex => (
                        <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderTop: '1px solid var(--border)' }}>
                          <div>
                            <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>{ex.name}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{ex.sets}×{ex.reps} @ {ex.weight}kg</p>
                          </div>
                          <button onClick={() => removeExercise(day.id, ex.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}><Trash2 size={12} /></button>
                        </div>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px 60px 36px', gap: '4px', marginTop: '0.5rem' }}>
                        {['name', 'sets', 'reps', 'weight'].map(f => (
                          <input key={f} placeholder={f === 'weight' ? 'kg' : f} value={newEx[f]} onChange={e => setNewEx({ ...newEx, [f]: e.target.value })} className="form-input" style={{ padding: '0.35rem', fontSize: '0.72rem' }} />
                        ))}
                        <button onClick={() => addExercise(day.id)} className="btn-primary" style={{ padding: '0.35rem', fontSize: '0.7rem' }}><Plus size={12} /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIVE LOGGER TAB ── */}
      {activeTab === 'Live Logger' && (
        <div>
          {!activeSession ? (
            <div className="glass-card">
              <span className="card-title">Start a Session</span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>Select a day from your schedule to begin a live logged workout.</p>
              {schedule.length === 0 && <EmptyState icon={Dumbbell} title="No schedule yet" description="Go to the Schedule tab and add training days first." />}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {schedule.map(day => (
                  <button key={day.id} onClick={() => { startSession(day); setActiveTab('Live Logger'); }} style={{ padding: '1.5rem 1rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>{day.day}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>{day.muscleGroup}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '6px' }}>{(day.exercises || []).length} exercises</p>
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.78rem', fontWeight: 700 }}>
                      <Play size={13} /> START LIVE
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Session header */}
              <div className="glass-card" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 900, fontSize: '1.3rem', color: '#10b981' }}>{activeSession.day.day} — {activeSession.day.muscleGroup}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '4px' }}>
                      {activeSession.sets.filter(s => s.done).length} / {activeSession.sets.length} sets completed
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {restSeconds > 0 && (
                      <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', fontWeight: 800, color: '#f59e0b', fontSize: '0.95rem' }}>
                        <Clock size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />{restSeconds}s
                      </div>
                    )}
                    <button className="btn-ghost" style={{ borderColor: '#f59e0b', color: '#f59e0b', fontSize: '0.78rem' }} onClick={() => startRestTimer(90)}>⏱ Rest 90s</button>
                    <button className="btn-ghost" style={{ borderColor: '#f59e0b', color: '#f59e0b', fontSize: '0.78rem' }} onClick={() => startRestTimer(180)}>⏱ Rest 3m</button>
                    <button className="btn-primary" style={{ background: '#10b981', border: 'none' }} onClick={finishSession}><CheckCircle size={15} /> FINISH</button>
                    <button className="btn-ghost" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '0.78rem' }} onClick={cancelSession}>CANCEL</button>
                  </div>
                </div>
              </div>

              {/* Sets by exercise */}
              {(() => {
                const exercises = [...new Set(activeSession.sets.map(s => s.exName))];
                return exercises.map(exName => {
                  const exSets = activeSession.sets.filter(s => s.exName === exName);
                  const allDone = exSets.every(s => s.done);
                  return (
                    <div key={exName} className="glass-card" style={{ borderColor: allDone ? 'rgba(16,185,129,0.4)' : 'var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                        {allDone && <CheckCircle size={18} color="#10b981" />}
                        <h4 style={{ fontWeight: 800, fontSize: '1rem', color: allDone ? '#10b981' : 'var(--text-1)' }}>{exName}</h4>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr 50px', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>SET</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>REPS</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>WEIGHT (kg)</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>VOLUME</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>DONE</span>
                      </div>
                      {exSets.map(s => (
                        <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr 50px', gap: '8px', alignItems: 'center', marginBottom: '8px', opacity: s.done ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>#{s.setNum}</span>
                          <input type="number" value={s.actualReps} onChange={e => updateSetValue(s.id, 'actualReps', e.target.value)} className="form-input" style={{ padding: '0.35rem', fontSize: '0.82rem', textAlign: 'center' }} disabled={s.done} />
                          <input type="number" value={s.actualWeight} onChange={e => updateSetValue(s.id, 'actualWeight', e.target.value)} className="form-input" style={{ padding: '0.35rem', fontSize: '0.82rem', textAlign: 'center' }} disabled={s.done} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-2)' }}>{(Number(s.actualReps) * Number(s.actualWeight) || 0).toLocaleString()} kg</span>
                          <button onClick={() => { toggleSet(s.id); if (!s.done) startRestTimer(90); }} style={{ width: '36px', height: '36px', borderRadius: '8px', border: `2px solid ${s.done ? '#10b981' : 'var(--border)'}`, background: s.done ? 'rgba(16,185,129,0.2)' : 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            {s.done ? <CheckCircle size={16} color="#10b981" /> : <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid var(--text-3)' }} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}

              {/* Session notes */}
              <div className="glass-card">
                <span className="card-title">Session Notes</span>
                <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} className="form-input" rows={3} placeholder="How did it feel? Any PRs, pain, or observations..." style={{ resize: 'vertical', marginTop: '0.75rem' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRs TAB ── */}
      {activeTab === 'PRs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <span className="card-title">Personal Records</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
              {LIFTS.map(lift => (
                <div key={lift} style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${PRs[lift] ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`, textAlign: 'center' }}>
                  <p className="label-caps">{LIFT_LABELS[lift]}</p>
                  <p style={{ fontSize: '1.6rem', fontWeight: 900, color: PRs[lift] ? 'var(--warning)' : 'var(--text-3)', fontFamily: 'var(--font-display)', marginTop: '0.25rem' }}>
                    {PRs[lift] ? `${PRs[lift]}kg` : '—'}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={prForm.lift} onChange={e => setPrForm({ ...prForm, lift: e.target.value })} className="form-input" style={{ flex: 1, minWidth: '140px' }}>
                {LIFTS.map(l => <option key={l} value={l}>{LIFT_LABELS[l]}</option>)}
              </select>
              <input type="number" placeholder="New PR (kg)" value={prForm.weight} onChange={e => setPrForm({ ...prForm, weight: e.target.value })} className="form-input" style={{ width: '120px' }} />
              <button onClick={logPR} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}><Trophy size={15} /> LOG PR</button>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="card-title" style={{ margin: 0 }}>PR Progression</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {LIFTS.map(l => (
                  <button key={l} onClick={() => setActivePRLift(l)} className={`btn-sm${activePRLift === l ? ' active' : ''}`}>
                    {l === 'benchPress' ? 'BP' : l === 'ohp' ? 'OHP' : l.slice(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {prChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={prChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} unit="kg" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="weight" stroke="var(--warning)" strokeWidth={2.5} dot={{ r: 5, fill: 'var(--warning)' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center', padding: '2.5rem 0' }}>Log PRs to see progression chart</p>
            )}
          </div>
        </div>
      )}

      {/* ── VOLUME HISTORY ── */}
      {activeTab === 'Volume History' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <span className="card-title">30-Day Volume History</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Each bar = total volume logged that day (sets × reps × weight kg).</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${(v/1000).toFixed(2)}k kg`, 'Volume']} />
                <Bar dataKey="volume" radius={[3, 3, 0, 0]}>
                  {volumeHistory.map((d, idx) => (
                    <Cell key={idx} fill={d.volume === 0 ? 'var(--bg-elevated)' : d.volume / maxVolume > 0.7 ? '#10b981' : d.volume / maxVolume > 0.3 ? '#0ea5e9' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Volume heatmap (week × day grid) */}
          <div className="glass-card">
            <span className="card-title">Volume Heatmap — Last 8 Weeks</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Each cell = 1 day. Brighter = more volume. Gray = rest day.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center', fontWeight: 700, paddingBottom: '4px' }}>{d}</div>)}
              {(() => {
                const cells = [];
                const sessionMap = {};
                workoutSessions.forEach(s => { if (s.date) sessionMap[s.date] = (sessionMap[s.date] || 0) + (Number(s.volume) || 0); });
                const today = new Date();
                const startDay = new Date(today);
                startDay.setDate(today.getDate() - 55);
                // Align to Monday
                const dow = (startDay.getDay() + 6) % 7;
                startDay.setDate(startDay.getDate() - dow);
                for (let i = 0; i < 56; i++) {
                  const d = new Date(startDay);
                  d.setDate(startDay.getDate() + i);
                  const key = d.toISOString().slice(0, 10);
                  const vol = sessionMap[key] || 0;
                  const isToday = key === today.toISOString().slice(0, 10);
                  const intensity = vol / maxVolume;
                  const bg = vol === 0 ? 'var(--bg-elevated)' : `rgba(99,102,241,${0.2 + intensity * 0.75})`;
                  cells.push(
                    <div key={key} title={`${key}: ${vol > 0 ? (vol/1000).toFixed(1) + 'k kg' : 'Rest'}`} style={{ aspectRatio: '1', borderRadius: '4px', background: bg, border: isToday ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.04)', cursor: 'default', transition: 'transform 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                  );
                }
                return cells;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── SESSIONS TAB ── */}
      {activeTab === 'Sessions' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="card-title" style={{ margin: 0 }}>Session Log</span>
            <span className="label-caps" style={{ color: 'var(--text-3)' }}>{workoutSessions.length} sessions tracked</span>
          </div>
          {workoutSessions.length === 0 ? (
            <EmptyState icon={Dumbbell} title="No sessions yet" description="Start a live session from the Schedule or Live Logger tab." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentSessions.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Dumbbell size={16} color="var(--accent)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{s.date}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px' }}>{s.notes || 'Workout session'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent)' }}>{((s.volume || 0) / 1000).toFixed(2)}k kg</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>volume</p>
                    </div>
                    <button onClick={() => deleteWorkoutSession(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}><Trash2 size={14} /></button>
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
