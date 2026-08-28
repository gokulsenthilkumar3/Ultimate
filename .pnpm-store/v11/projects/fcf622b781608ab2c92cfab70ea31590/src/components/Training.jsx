import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import {
  Dumbbell, Plus, Trash2, Trophy, Flame, ChevronDown, ChevronUp,
  Play, CheckCircle, Clock, TrendingUp, TrendingDown, Minus, ArrowRight,
} from 'lucide-react';
import EmptyState from './ui/EmptyState';
import useStore, {
  selectTrainingPlan,
  selectUpdateTrainingPlan,
  selectWorkouts,
  selectAddWorkoutFromTrainingDay,
  selectDeleteWorkoutSession,
} from '../store/useStore';
import { useToast } from '../hooks/useToast';

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LIFTS = ['benchPress', 'squat', 'deadlift', 'ohp'];
const LIFT_LABELS = { benchPress: 'Bench Press', squat: 'Squat', deadlift: 'Deadlift', ohp: 'OHP' };
const TOOLTIP_STYLE = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-1)',
  backdropFilter: 'blur(12px)', fontSize: '0.82rem',
};
const MUSCLE_COLORS = {
  Push: '#f43f5e', Pull: '#0ea5e9', Legs: '#10b981', Chest: '#f43f5e',
  Back: '#0ea5e9', Shoulders: '#a78bfa', Arms: '#fb923c', Core: '#fbbf24',
  Cardio: '#22d3ee', Rest: '#475569',
};

function computePlannedVolume(schedule) {
  return schedule.reduce((t, d) => t + (d.exercises || []).reduce((s, e) => s + (Number(e.sets) * Number(e.reps) * Number(e.weight) || 0), 0), 0);
}

function compute7DayVolume(sessions) {
  const now = new Date();
  return sessions.filter(s => {
    if (!s.date) return false;
    const diff = (now - new Date(s.date)) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  }).reduce((sum, s) => sum + (Number(s.volume) || 0), 0);
}

function buildVolumeHistory(sessions) {
  const map = {};
  sessions.forEach(s => { if (s.date) map[s.date] = (map[s.date] || 0) + (Number(s.volume) || 0); });
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key.slice(5), volume: map[key] || 0 });
  }
  return result;
}

// ── Progressive Overload Engine ────────────────────────────────────────────
// For each exercise, extract per-session best weight and recommend next target
function buildOverloadData(schedule, sessions) {
  // Map: exName → [ { date, maxWeight, totalVolume, sets } ]
  const exMap = {};

  // Collect all exercise names from schedule
  schedule.forEach(day => {
    (day.exercises || []).forEach(ex => {
      if (ex.name && !exMap[ex.name]) exMap[ex.name] = [];
    });
  });

  // Extract from logged sessions (sessions store _sets)
  sessions.forEach(s => {
    if (!s._sets || !s.date) return;
    const byEx = {};
    s._sets.forEach(set => {
      if (!set.exName) return;
      if (!byEx[set.exName]) byEx[set.exName] = { weights: [], volumes: [] };
      const w = Number(set.actualWeight || set.plannedWeight || 0);
      const r = Number(set.actualReps   || set.plannedReps   || 0);
      if (w > 0 && r > 0) {
        byEx[set.exName].weights.push(w);
        byEx[set.exName].volumes.push(w * r);
      }
    });

    Object.entries(byEx).forEach(([exName, data]) => {
      if (!exMap[exName]) exMap[exName] = [];
      const maxW = Math.max(...data.weights, 0);
      const vol  = data.volumes.reduce((a, b) => a + b, 0);
      exMap[exName].push({ date: s.date, maxWeight: maxW, volume: vol, sets: data.weights.length });
    });
  });

  // Sort each exercise by date
  Object.keys(exMap).forEach(k => {
    exMap[k].sort((a, b) => a.date.localeCompare(b.date));
  });

  return exMap;
}

// Recommend next weight based on simple linear progression (2.5kg every ~2 sessions)
function recommendNext(history) {
  if (history.length === 0) return null;
  const last = history[history.length - 1].maxWeight;
  if (!last) return null;
  // If 2+ sessions, check trend
  if (history.length >= 2) {
    const prev = history[history.length - 2].maxWeight;
    const delta = last - prev;
    if (delta > 0) return last + 2.5; // progressing — add 2.5kg
    if (delta === 0) return last + 2.5; // stalled — try adding 2.5kg
    return last; // deload — hold weight
  }
  return last + 2.5;
}

function epley1RM(weight, reps) {
  return weight && reps ? Math.round(Number(weight) * (1 + Number(reps) / 30)) : null;
}

// ── Progressive Overload Tab ───────────────────────────────────────────────
function ProgressiveOverloadTab({ schedule, sessions }) {
  const overloadData = useMemo(() => buildOverloadData(schedule, sessions), [schedule, sessions]);
  const exerciseNames = Object.keys(overloadData).filter(n => overloadData[n].length > 0);
  const [activeEx, setActiveEx] = useState(exerciseNames[0] || null);

  // Set activeEx when data loads
  useEffect(() => {
    if (!activeEx && exerciseNames.length > 0) setActiveEx(exerciseNames[0]);
  }, [exerciseNames.join(',')]);

  if (schedule.length === 0) {
    return (
      <EmptyState icon={TrendingUp} title="No Schedule Yet"
        description="Add training days in the Schedule tab first, then log sessions to track progressive overload." />
    );
  }

  if (exerciseNames.length === 0) {
    return (
      <div className="glass-card">
        <TrendingUp size={32} style={{ color: 'var(--text-3)', marginBottom: '0.75rem', opacity: 0.3 }} />
        <h3 style={{ fontWeight: 700, marginBottom: '0.35rem' }}>No logged session data yet</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
          Start a live session from the Schedule tab and finish it to populate overload tracking.
        </p>
      </div>
    );
  }

  const history    = activeEx ? (overloadData[activeEx] || []) : [];
  const lastEntry  = history[history.length - 1];
  const prevEntry  = history[history.length - 2];
  const nextTarget = recommendNext(history);
  const delta      = lastEntry && prevEntry ? lastEntry.maxWeight - prevEntry.maxWeight : null;
  const TrendIcon  = delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta === null ? 'var(--text-3)' : delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : 'var(--text-3)';

  const chartData = history.map(h => ({ date: h.date.slice(5), weight: h.maxWeight, volume: h.volume }));

  // Build a summary table of all exercises
  const summaryRows = exerciseNames.map(name => {
    const h = overloadData[name];
    const last = h[h.length - 1];
    const prev = h[h.length - 2];
    const d = last && prev ? last.maxWeight - prev.maxWeight : null;
    return {
      name, sessions: h.length,
      currentWeight: last?.maxWeight || 0,
      nextTarget: recommendNext(h),
      trend: d,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Summary table */}
      <div className="glass-card">
        <span className="card-title">Progressive Overload Summary</span>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
          Recommended increases based on your logged session history. Click a row to see the trend chart.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Exercise', 'Sessions', 'Last Weight', 'Next Target', 'Trend'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: h === 'Exercise' ? 'left' : 'center',
                                       color: 'var(--text-3)', fontWeight: 700, fontSize: '0.7rem',
                                       textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(row => {
                const active = activeEx === row.name;
                const TI = row.trend === null ? Minus : row.trend > 0 ? TrendingUp : row.trend < 0 ? TrendingDown : Minus;
                const tc = row.trend === null ? 'var(--text-3)' : row.trend > 0 ? '#10b981' : row.trend < 0 ? '#ef4444' : 'var(--text-3)';
                return (
                  <tr key={row.name}
                    onClick={() => setActiveEx(row.name)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                      transition: 'background 0.15s',
                    }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-1)' }}>
                      <Dumbbell size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', opacity: 0.6 }} />
                      {row.name}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: 'var(--text-3)' }}>{row.sessions}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>
                      {row.currentWeight ? `${row.currentWeight} kg` : '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                      {row.nextTarget ? (
                        <span style={{ color: '#0ea5e9', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <ArrowRight size={12} /> {row.nextTarget} kg
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: tc, fontWeight: 700 }}>
                        <TI size={13} />
                        {row.trend !== null ? `${row.trend > 0 ? '+' : ''}${row.trend} kg` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail chart for selected exercise */}
      {activeEx && history.length >= 1 && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span className="card-title" style={{ margin: 0 }}>{activeEx} — Progression</span>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px' }}>Max weight per session</p>
            </div>
            {/* Summary metrics */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Current',     val: lastEntry ? `${lastEntry.maxWeight} kg` : '—', color: 'var(--accent)' },
                { label: 'Next Target', val: nextTarget ? `${nextTarget} kg` : '—',         color: '#0ea5e9' },
                { label: 'Trend',
                  val: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <TrendIcon size={13} />
                      {delta !== null ? `${delta > 0 ? '+' : ''}${delta} kg` : '—'}
                    </span>
                  ),
                  color: trendColor },
              ].map(m => (
                <div key={m.label} style={{ padding: '0.6rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: '8px', textAlign: 'center' }}>
                  <p className="label-caps" style={{ fontSize: '0.58rem', marginBottom: '2px' }}>{m.label}</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 900, color: m.color }}>{m.val}</p>
                </div>
              ))}
            </div>
          </div>

          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit="kg" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v} kg`, 'Max Weight']} />
                {nextTarget && (
                  <ReferenceLine y={nextTarget} stroke="#0ea5e9" strokeDasharray="5 3"
                    label={{ value: `Target: ${nextTarget}kg`, fill: '#0ea5e9', fontSize: 10, position: 'insideTopRight' }} />
                )}
                <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.5}
                  dot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }}
                  activeDot={{ r: 7, fill: 'var(--accent)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', padding: '2rem 0', textAlign: 'center' }}>
              Log at least 2 sessions with {activeEx} to see the progression chart.
            </p>
          )}

          {/* Progression guide */}
          <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(14,165,233,0.06)', borderRadius: '10px', border: '1px solid rgba(14,165,233,0.15)' }}>
            <p style={{ fontSize: '0.72rem', color: '#0ea5e9', fontWeight: 700, marginBottom: '4px' }}>Linear Progression Protocol</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
              Add <strong>2.5 kg</strong> each session while you can complete all target reps with good form.
              If you fail to complete reps, repeat the same weight. After 3 failures, deload by 10% and rebuild.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Training() {
  const training             = useStore(selectTrainingPlan) || {};
  const setTraining          = useStore(selectUpdateTrainingPlan);
  const { sessions: workoutSessions } = useStore(selectWorkouts);
  const addWorkoutFromDay    = useStore(selectAddWorkoutFromTrainingDay);
  const deleteWorkoutSession = useStore(selectDeleteWorkoutSession);
  const toast = useToast();

  const updateSection = useCallback((data) => setTraining({ ...training, ...data }), [training, setTraining]);

  const schedule      = training.schedule  || [];
  const PRs           = training.PRs       || {};
  const prHistory     = training.prHistory || [];
  const streak        = training.streak    || 0;
  const longestStreak = training.longestStreak || 0;

  const TABS = ['Schedule', 'Live Logger', 'PRs', 'Progressive Overload', 'Volume History', 'Sessions'];
  const [activeTab, setActiveTab]     = useState('Schedule');
  const [expandedDay, setExpandedDay] = useState(null);
  const [newEx,  setNewEx]  = useState({ name: '', sets: '', reps: '', weight: '' });
  const [newDay, setNewDay] = useState({ day: 'Mon', muscleGroup: '' });
  const [prForm, setPrForm] = useState({ lift: 'benchPress', weight: '' });
  const [activePRLift, setActivePRLift] = useState('benchPress');
  const [calc1RM, setCalc1RM] = useState({ weight: '', reps: '' });

  // Live session logger
  const [activeSession,    setActiveSession]    = useState(null);
  const [sessionNotes,     setSessionNotes]     = useState('');
  const [sessionRestTimer, setSessionRestTimer] = useState(null);
  const [restSeconds,      setRestSeconds]      = useState(0);

  const totalPlannedVolume = useMemo(() => computePlannedVolume(schedule), [schedule]);
  const last7LoggedVolume  = useMemo(() => compute7DayVolume(workoutSessions), [workoutSessions]);
  const volumeHistory      = useMemo(() => buildVolumeHistory(workoutSessions), [workoutSessions]);
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

  const startSession = (day) => {
    const sets = (day.exercises || []).flatMap(ex => {
      let prevWeight = null, prevReps = null;
      for (let i = workoutSessions.length - 1; i >= 0; i--) {
        const s = workoutSessions[i];
        if (s._sets) {
          const pastSet = s._sets.find(st => st.exName === ex.name);
          if (pastSet) { prevWeight = pastSet.actualWeight; prevReps = pastSet.actualReps; break; }
        }
      }
      return Array.from({ length: parseInt(ex.sets) || 3 }, (_, i) => ({
        id: `${ex.id}-${i}`, exName: ex.name, setNum: i + 1,
        plannedReps: ex.reps, plannedWeight: ex.weight,
        actualReps: prevReps || ex.reps, actualWeight: prevWeight || ex.weight,
        prevWeight, prevReps, done: false,
      }));
    });
    setActiveSession({ day, startTime: Date.now(), sets });
    setSessionNotes('');
    toast.success(`Session started: ${day.day} — ${day.muscleGroup}`);
  };

  const toggleSet = (setId) => {
    setActiveSession(prev => ({ ...prev, sets: prev.sets.map(s => s.id === setId ? { ...s, done: !s.done } : s) }));
  };

  const updateSetValue = (setId, field, value) => {
    setActiveSession(prev => ({ ...prev, sets: prev.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) }));
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
    const volume   = doneSets.reduce((sum, s) => sum + (Number(s.actualReps) * Number(s.actualWeight) || 0), 0);
    const elapsed  = Math.round((Date.now() - activeSession.startTime) / 60000);
    await addWorkoutFromDay({ ...activeSession.day, _volume: volume, _sets: doneSets, _notes: sessionNotes || `${elapsed} min session — ${doneSets.length} sets completed` });
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

  const prChartData    = prHistory.filter(h => h.lift === activePRLift).slice(-10).map(h => ({ date: h.date.slice(5), weight: h.weight }));
  const recentSessions = workoutSessions.slice(0, 15);

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Training</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
            <Dumbbell size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
            Training Matrix
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Schedule · Live logger · PRs · Progressive overload · Volume tracking</p>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Weekly Volume (Plan)', value: `${(totalPlannedVolume / 1000).toFixed(1)}k kg`, icon: <Dumbbell size={18} color="var(--accent)" />, color: 'var(--accent)' },
          { label: 'Current Streak',       value: `${streak} days`,             icon: <Flame size={18} color="var(--warning)" />,  color: 'var(--warning)' },
          { label: 'Best Streak',          value: `${longestStreak} days`,       icon: <Trophy size={18} color="var(--warning)" />, color: 'var(--warning)' },
          { label: '7-Day Logged Volume',  value: `${(last7LoggedVolume / 1000).toFixed(1)}k kg`, icon: <Dumbbell size={18} color="var(--info)" />, color: 'var(--info)' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '1.15rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '0.4rem' }}>{s.icon}</div>
            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</p>
            <p className="label-caps" style={{ marginTop: '0.2rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {TABS.map(tab => (
          <button key={tab} className={`btn-sm ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '0.5rem 1rem', fontWeight: 800, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {tab === 'Live Logger' && <Play size={13} />}
            {tab === 'Progressive Overload' && <TrendingUp size={13} />}
            {tab}
          </button>
        ))}
      </div>

      {/* ── SCHEDULE ── */}
      {activeTab === 'Schedule' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="card-title" style={{ margin: 0 }}>Weekly Schedule</span>
            <button onClick={incrementStreak} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}>
              + Mark Today Done
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={newDay.day} onChange={e => setNewDay({ ...newDay, day: e.target.value })} className="form-input" style={{ width: 'auto' }}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input placeholder="Muscle group (e.g. Push / Chest)" value={newDay.muscleGroup}
              onChange={e => setNewDay({ ...newDay, muscleGroup: e.target.value })}
              className="form-input" style={{ flex: 1 }} />
            <button onClick={addDay} className="btn-primary" style={{ padding: '0.5rem 1rem' }}><Plus size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {schedule.length === 0 && (
              <div style={{ gridColumn: '1/-1' }}>
                <EmptyState icon={Dumbbell} title="No Training Days Scheduled"
                  description="Select a day and muscle group above to start building your workout split." />
              </div>
            )}
            {schedule.map(day => {
              const mg = day.muscleGroup || '';
              const color = MUSCLE_COLORS[mg] || MUSCLE_COLORS[Object.keys(MUSCLE_COLORS).find(k => mg.toLowerCase().includes(k.toLowerCase())) || ''] || 'var(--accent)';
              return (
                <div key={day.id} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', border: `1px solid ${color}44` }}>
                  <div className="flex-between">
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{day.day}</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color, fontWeight: 700 }}>{day.muscleGroup}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button onClick={() => startSession(day)} title="Start live session" style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px' }}><Play size={15} /></button>
                      <button onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}>
                        {expandedDay === day.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
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
                          <input key={f} placeholder={f === 'weight' ? 'kg' : f} value={newEx[f]}
                            onChange={e => setNewEx({ ...newEx, [f]: e.target.value })}
                            className="form-input" style={{ padding: '0.35rem', fontSize: '0.72rem' }} />
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

      {/* ── LIVE LOGGER ── */}
      {activeTab === 'Live Logger' && (
        <div>
          {!activeSession ? (
            <div className="glass-card">
              <span className="card-title">Start a Session</span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>Select a training day to begin a live logged session.</p>
              {schedule.length === 0 && <EmptyState icon={Dumbbell} title="No schedule yet" description="Go to the Schedule tab first." />}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {schedule.map(day => (
                  <button key={day.id} onClick={() => { startSession(day); setActiveTab('Live Logger'); }}
                    className="hover-lift" style={{ padding: '1.5rem 1rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
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
              <div className="glass-card" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 900, fontSize: '1.3rem', color: '#10b981' }}>{activeSession.day.day} — {activeSession.day.muscleGroup}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '4px' }}>
                      {activeSession.sets.filter(s => s.done).length} / {activeSession.sets.length} sets completed
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                        {['SET', 'REPS', 'WEIGHT (kg)', 'VOLUME', 'DONE'].map(h => (
                          <span key={h} style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>{h}</span>
                        ))}
                      </div>
                      {exSets.map(s => (
                        <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr 50px', gap: '8px', alignItems: 'center', marginBottom: '8px', opacity: s.done ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>#{s.setNum}</span>
                            {s.prevWeight && !s.done && <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>Prev: {s.prevWeight}kg</span>}
                          </div>
                          <input type="number" value={s.actualReps} onChange={e => updateSetValue(s.id, 'actualReps', e.target.value)}
                            className="form-input" style={{ padding: '0.35rem', fontSize: '0.82rem', textAlign: 'center' }} disabled={s.done} />
                          <input type="number" value={s.actualWeight} onChange={e => updateSetValue(s.id, 'actualWeight', e.target.value)}
                            className="form-input" style={{ padding: '0.35rem', fontSize: '0.82rem', textAlign: 'center' }} disabled={s.done} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-2)' }}>
                            {(Number(s.actualReps) * Number(s.actualWeight) || 0).toLocaleString()} kg
                          </span>
                          <button onClick={() => { toggleSet(s.id); if (!s.done) startRestTimer(90); }}
                            style={{ width: '36px', height: '36px', borderRadius: '8px', border: `2px solid ${s.done ? '#10b981' : 'var(--border)'}`, background: s.done ? 'rgba(16,185,129,0.2)' : 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            {s.done ? <CheckCircle size={16} color="#10b981" /> : <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid var(--text-3)' }} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}

              <div className="glass-card">
                <span className="card-title">Session Notes</span>
                <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
                  className="form-input" rows={3} placeholder="How did it feel? PRs, pain, or observations…"
                  style={{ resize: 'vertical', marginTop: '0.75rem' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRs ── */}
      {activeTab === 'PRs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <span className="card-title">Personal Records</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
              {LIFTS.map(lift => (
                <div key={lift} style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${PRs[lift] ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`, textAlign: 'center' }}>
                  <p className="label-caps">{LIFT_LABELS[lift]}</p>
                  <p style={{ fontSize: '1.6rem', fontWeight: 900, color: PRs[lift] ? 'var(--warning)' : 'var(--text-3)', marginTop: '0.25rem' }}>
                    {PRs[lift] ? `${PRs[lift]}kg` : '—'}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select value={prForm.lift} onChange={e => setPrForm({ ...prForm, lift: e.target.value })} className="form-input" style={{ flex: 1, minWidth: '140px' }}>
                {LIFTS.map(l => <option key={l} value={l}>{LIFT_LABELS[l]}</option>)}
              </select>
              <input type="number" placeholder="New PR (kg)" value={prForm.weight} onChange={e => setPrForm({ ...prForm, weight: e.target.value })} className="form-input" style={{ width: '120px' }} />
              <button onClick={logPR} className="btn-primary"><Trophy size={15} /> LOG PR</button>
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

          <div className="glass-card">
            <span className="card-title">1RM Calculator (Epley Formula)</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Calculate your 1-Rep Max based on weight and reps.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Weight (kg)</label>
                <input type="number" placeholder="100" value={calc1RM.weight} onChange={e => setCalc1RM(p => ({ ...p, weight: e.target.value }))} className="form-input" style={{ width: '120px' }} />
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Reps</label>
                <input type="number" placeholder="5" value={calc1RM.reps} onChange={e => setCalc1RM(p => ({ ...p, reps: e.target.value }))} className="form-input" style={{ width: '100px' }} />
              </div>
              <div style={{ paddingBottom: '4px' }}>
                <span className="label-caps" style={{ color: 'var(--text-3)' }}>Estimated 1RM</span>
                <p style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
                  {epley1RM(calc1RM.weight, calc1RM.reps) ? `${epley1RM(calc1RM.weight, calc1RM.reps)} kg` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROGRESSIVE OVERLOAD ── */}
      {activeTab === 'Progressive Overload' && (
        <ProgressiveOverloadTab schedule={schedule} sessions={workoutSessions} />
      )}

      {/* ── VOLUME HISTORY ── */}
      {activeTab === 'Volume History' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <span className="card-title">30-Day Volume History</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Each bar = total volume logged that day (sets × reps × weight).</p>
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

          <div className="glass-card">
            <span className="card-title">Volume Heatmap — Last 8 Weeks</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Brighter cell = more volume. Gray = rest day.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center', fontWeight: 700, paddingBottom: '4px' }}>{d}</div>
              ))}
              {(() => {
                const cells = [];
                const sessionMap = {};
                workoutSessions.forEach(s => { if (s.date) sessionMap[s.date] = (sessionMap[s.date] || 0) + (Number(s.volume) || 0); });
                const todayDate = new Date();
                const startDay  = new Date(todayDate);
                startDay.setDate(todayDate.getDate() - 55);
                const dow = (startDay.getDay() + 6) % 7;
                startDay.setDate(startDay.getDate() - dow);
                for (let i = 0; i < 56; i++) {
                  const d = new Date(startDay); d.setDate(startDay.getDate() + i);
                  const key  = d.toISOString().slice(0, 10);
                  const vol  = sessionMap[key] || 0;
                  const isToday = key === todayDate.toISOString().slice(0, 10);
                  const intensity = vol / maxVolume;
                  const bg = vol === 0 ? 'var(--bg-elevated)' : `rgba(99,102,241,${0.2 + intensity * 0.75})`;
                  cells.push(
                    <div key={key} title={`${key}: ${vol > 0 ? (vol/1000).toFixed(1) + 'k kg' : 'Rest'}`}
                      style={{ aspectRatio: '1', borderRadius: '4px', background: bg, border: isToday ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.04)', cursor: 'default' }} />
                  );
                }
                return cells;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── SESSIONS ── */}
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
                    <button onClick={() => deleteWorkoutSession(s.id)} className="hover-text-danger"
                      style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
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
