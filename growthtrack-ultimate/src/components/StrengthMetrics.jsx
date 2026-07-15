import React, { useState, useMemo, useCallback } from 'react';
import { Dumbbell, Plus, Trash2, TrendingUp, TrendingDown, Minus, Award, Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';

const TOOLTIP_STYLE = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-1)', backdropFilter: 'blur(12px)', fontSize: '0.8rem',
};

// ── Exercise library with muscle-group mapping ────────────────────────────
const EXERCISE_LIBRARY = [
  { name: 'Bench Press',        muscles: ['Chest', 'Triceps', 'Shoulders'] },
  { name: 'Squat',              muscles: ['Quads', 'Glutes', 'Hamstrings'] },
  { name: 'Deadlift',           muscles: ['Back', 'Glutes', 'Hamstrings'] },
  { name: 'Overhead Press',     muscles: ['Shoulders', 'Triceps'] },
  { name: 'Pull-ups',           muscles: ['Back', 'Biceps'] },
  { name: 'Rows',               muscles: ['Back', 'Biceps'] },
  { name: 'Dips',               muscles: ['Chest', 'Triceps'] },
  { name: 'Leg Press',          muscles: ['Quads', 'Glutes'] },
  { name: 'Romanian Deadlift',  muscles: ['Hamstrings', 'Glutes'] },
  { name: 'Lateral Raises',     muscles: ['Shoulders'] },
  { name: 'Bicep Curls',        muscles: ['Biceps'] },
  { name: 'Tricep Pushdowns',   muscles: ['Triceps'] },
  { name: 'Face Pulls',         muscles: ['Shoulders', 'Back'] },
  { name: 'Cable Fly',          muscles: ['Chest'] },
  { name: 'Leg Extension',      muscles: ['Quads'] },
  { name: 'Leg Curl',           muscles: ['Hamstrings'] },
  { name: 'Calf Raises',        muscles: ['Calves'] },
  { name: 'Hip Thrust',         muscles: ['Glutes'] },
  { name: 'Plank',              muscles: ['Core'] },
  { name: 'Ab Crunches',        muscles: ['Core'] },
];

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'];
const MUSCLE_COLORS = {
  Chest: '#f43f5e', Back: '#0ea5e9', Shoulders: '#8b5cf6', Biceps: '#f59e0b',
  Triceps: '#f97316', Quads: '#10b981', Hamstrings: '#34d399', Glutes: '#22c55e',
  Calves: '#06b6d4', Core: '#fbbf24',
};

// ── 1RM Formulas ──────────────────────────────────────────────────────────
const oneRMFormulas = {
  epley:   (w, r) => r === 1 ? w : +(w * (1 + r / 30)).toFixed(1),
  brzycki: (w, r) => r === 1 ? w : +(w * (36 / (37 - r))).toFixed(1),
  lander:  (w, r) => r === 1 ? w : +(w * 100 / (101.3 - 2.67123 * r)).toFixed(1),
};

function OneRMCalculator() {
  const [weight, setWeight] = useState('');
  const [reps,   setReps]   = useState('');
  const [unit,   setUnit]   = useState('kg');

  const results = useMemo(() => {
    const w = Number(weight), r = Number(reps);
    if (!w || !r || r > 30) return null;
    return {
      epley:   oneRMFormulas.epley(w, r),
      brzycki: oneRMFormulas.brzycki(w, r),
      lander:  oneRMFormulas.lander(w, r),
      avg:     +((oneRMFormulas.epley(w, r) + oneRMFormulas.brzycki(w, r) + oneRMFormulas.lander(w, r)) / 3).toFixed(1),
    };
  }, [weight, reps]);

  // % RM table
  const rmTable = results ? [
    { pct: 100, rm: 1,    weight: results.avg },
    { pct: 95,  rm: 2,    weight: +(results.avg * 0.95).toFixed(1) },
    { pct: 90,  rm: 4,    weight: +(results.avg * 0.90).toFixed(1) },
    { pct: 85,  rm: 6,    weight: +(results.avg * 0.85).toFixed(1) },
    { pct: 80,  rm: 8,    weight: +(results.avg * 0.80).toFixed(1) },
    { pct: 75,  rm: 10,   weight: +(results.avg * 0.75).toFixed(1) },
    { pct: 70,  rm: 12,   weight: +(results.avg * 0.70).toFixed(1) },
    { pct: 65,  rm: 15,   weight: +(results.avg * 0.65).toFixed(1) },
  ] : [];

  return (
    <div className="glass-card">
      <span className="card-title">1RM Calculator</span>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Calculate estimated 1-Rep Max using Epley, Brzycki & Lander formulas.</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '4px' }}>Weight</label>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="100" className="form-input" style={{ width: '100px' }} />
        </div>
        <select value={unit} onChange={e => setUnit(e.target.value)} className="form-input" style={{ width: '60px' }}>
          <option>kg</option><option>lb</option>
        </select>
        <div>
          <label style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '4px' }}>Reps (1–30)</label>
          <input type="number" value={reps} onChange={e => setReps(e.target.value)} placeholder="5" min="1" max="30" className="form-input" style={{ width: '80px' }} />
        </div>
        {results && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {Object.entries({ Epley: results.epley, Brzycki: results.brzycki, Lander: results.lander, Average: results.avg }).map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center', padding: '0.5rem 0.75rem', background: k === 'Average' ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)', borderRadius: '8px', border: k === 'Average' ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '2px', fontWeight: 700 }}>{k}</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 900, color: k === 'Average' ? 'var(--accent)' : 'var(--text-1)', fontFamily: 'monospace' }}>{v} {unit}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {rmTable.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Rep Max Table (based on avg 1RM: {results.avg} {unit})</p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {rmTable.map(r => (
              <div key={r.pct} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: '8px', textAlign: 'center', minWidth: '70px' }}>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 700 }}>{r.pct}% · {r.rm}RM</p>
                <p style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--text-1)', fontFamily: 'monospace' }}>{r.weight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Muscle Fatigue Heatmap ────────────────────────────────────────────────
function MuscleFatigueHeatmap({ recentLogs }) {
  const fatigue = useMemo(() => {
    const map = {};
    MUSCLE_GROUPS.forEach(m => { map[m] = 0; });

    const now = Date.now();
    recentLogs.forEach(log => {
      const daysAgo = (now - new Date(log.date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo > 7) return;

      const exName = log.exercise || log.name || '';
      const ex = EXERCISE_LIBRARY.find(e => e.name.toLowerCase() === exName.toLowerCase());
      const muscles = ex?.muscles || ['Core'];

      // Fatigue decays over days: 100% → 0% linearly over 3 days
      const fatigueScore = Math.max(0, 1 - daysAgo / 3);
      const sets   = Number(log.sets) || 3;
      const volume = (Number(log.weight) || 50) * (Number(log.reps) || 8) * sets;
      const score  = fatigueScore * Math.log1p(volume / 1000);

      muscles.forEach(m => { if (map[m] !== undefined) map[m] += score; });
    });

    // Normalize to 0-100
    const max = Math.max(...Object.values(map), 0.001);
    const normalized = {};
    MUSCLE_GROUPS.forEach(m => { normalized[m] = Math.min(100, Math.round((map[m] / max) * 100)); });
    return normalized;
  }, [recentLogs]);

  const muscleStatus = (pct) => {
    if (pct >= 75) return { label: 'Fatigued',   color: '#f43f5e', bg: 'rgba(244,63,94,0.2)' };
    if (pct >= 40) return { label: 'Moderate',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
    if (pct >= 15) return { label: 'Light',      color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
    return               { label: 'Recovered',   color: '#6b7280', bg: 'rgba(107,114,128,0.08)' };
  };

  return (
    <div className="glass-card">
      <span className="card-title">Muscle Fatigue Heatmap</span>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Based on recent 7-day training logs. Fatigue decays 33% per day.</p>

      {/* Body diagram (simplified grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        {MUSCLE_GROUPS.map(m => {
          const pct    = fatigue[m] || 0;
          const status = muscleStatus(pct);
          return (
            <div key={m} style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: status.bg, border: `1px solid ${status.color}44` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-1)' }}>{m}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: status.color, background: `${status.color}18`, padding: '1px 5px', borderRadius: '99px' }}>{status.label}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: status.color, borderRadius: '99px', transition: 'width 0.5s' }} />
              </div>
              <p style={{ fontSize: '0.58rem', color: status.color, marginTop: '2px', fontWeight: 700 }}>{pct}% fatigued</p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Recovered (0–14%)',  color: '#6b7280' },
          { label: 'Light (15–39%)',      color: '#10b981' },
          { label: 'Moderate (40–74%)',   color: '#f59e0b' },
          { label: 'Fatigued (75–100%)', color: '#f43f5e' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color }} />
            <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function StrengthMetrics() {
  const toast = useToast();
  const metric_logs = useStore(s => s.metric_logs) || [];
  const saveMetricLog = useStore(s => s.saveMetricLog);

  const [tab,     setTab]     = useState('log');
  const [showAdd, setShowAdd] = useState(false);
  const [exFilter, setExFilter] = useState('');
  const [form, setForm] = useState({
    exercise: '', date: new Date().toISOString().slice(0, 10),
    weight: '', reps: '', sets: '', notes: '',
  });

  const strengthLogs = useMemo(() =>
    metric_logs.filter(l => l.type === 'strength' || l.exercise)
               .map(l => ({
                 ...l,
                 exercise: l.exercise || l.name || 'Exercise',
                 weight: Number(l.weight || l.value || 0),
                 reps:   Number(l.reps || 0),
                 sets:   Number(l.sets || 0),
               }))
               .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
  [metric_logs]);

  // PRs per exercise
  const PRs = useMemo(() => {
    const map = {};
    strengthLogs.forEach(l => {
      if (!map[l.exercise] || l.weight > map[l.exercise].weight) {
        map[l.exercise] = { weight: l.weight, date: l.date };
      }
    });
    return map;
  }, [strengthLogs]);

  // Chart data per exercise
  const exercises = useMemo(() => [...new Set(strengthLogs.map(l => l.exercise))], [strengthLogs]);
  const [activeEx, setActiveEx] = useState('');
  const exLogs = useMemo(() => {
    const ex = activeEx || exercises[0] || '';
    return strengthLogs.filter(l => l.exercise === ex).slice(0, 30).reverse().map(l => ({
      date: l.date?.slice(5), weight: l.weight, volume: l.weight * l.reps * l.sets,
    }));
  }, [activeEx, exercises, strengthLogs]);

  // Weekly volume by muscle
  const weeklyVolume = useMemo(() => {
    const now = Date.now();
    const map = {};
    MUSCLE_GROUPS.forEach(m => { map[m] = 0; });

    strengthLogs.filter(l => (now - new Date(l.date).getTime()) <= 7 * 86400000).forEach(l => {
      const ex = EXERCISE_LIBRARY.find(e => e.name.toLowerCase() === (l.exercise || '').toLowerCase());
      const muscles = ex?.muscles || ['Core'];
      const volume = l.weight * l.reps * l.sets;
      muscles.forEach(m => { if (map[m] !== undefined) map[m] += volume; });
    });

    return MUSCLE_GROUPS.map(m => ({ muscle: m, volume: Math.round(map[m]) }));
  }, [strengthLogs]);

  const doAdd = async () => {
    if (!form.exercise || !form.weight) { toast.error('Exercise and weight required'); return; }
    const log = {
      type: 'strength', exercise: form.exercise, date: form.date,
      weight: Number(form.weight), reps: Number(form.reps) || 1, sets: Number(form.sets) || 1,
      value: Number(form.weight), unit: 'kg', notes: form.notes,
    };
    if (typeof saveMetricLog === 'function') await saveMetricLog(log);
    setForm(f => ({ ...f, exercise: '', weight: '', reps: '', sets: '', notes: '' }));
    setShowAdd(false);
    toast.success(`✅ ${log.exercise} — ${log.weight}kg logged`);
  };

  const recentLogs7Days = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return strengthLogs.filter(l => new Date(l.date).getTime() >= cutoff);
  }, [strengthLogs]);

  const filteredLogs = useMemo(() => {
    if (!exFilter) return strengthLogs;
    return strengthLogs.filter(l => l.exercise.toLowerCase().includes(exFilter.toLowerCase()));
  }, [strengthLogs, exFilter]);

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Training</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Strength Metrics</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{strengthLogs.length} logs · {Object.keys(PRs).length} exercises tracked</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="btn-primary"><Plus size={14} /> Log Set</button>
      </div>

      {/* PR Summary */}
      {Object.keys(PRs).length > 0 && (
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {Object.entries(PRs).slice(0, 6).map(([ex, pr]) => (
            <div key={ex} style={{ padding: '0.65rem 0.85rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '10px', minWidth: '100px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 700, marginBottom: '2px' }}>🏆 PR</p>
              <p style={{ fontSize: '1rem', fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace' }}>{pr.weight} kg</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-2)', fontWeight: 700 }}>{ex}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['log', 'progression', '1rm', 'fatigue', 'volume'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: tab === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: tab === t ? '#000' : 'var(--text-3)', border: 'none', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass-card mb-lg">
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>Log Set</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <input list="ex-list" placeholder="Exercise *" value={form.exercise} onChange={e => setForm(f => ({ ...f, exercise: e.target.value }))} className="form-input" />
              <datalist id="ex-list">{EXERCISE_LIBRARY.map(e => <option key={e.name} value={e.name} />)}</datalist>
            </div>
            <input type="number" placeholder="Weight (kg) *" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} className="form-input" />
            <input type="number" placeholder="Reps" value={form.reps} onChange={e => setForm(f => ({ ...f, reps: e.target.value }))} className="form-input" />
            <input type="number" placeholder="Sets" value={form.sets} onChange={e => setForm(f => ({ ...f, sets: e.target.value }))} className="form-input" />
            <div>
              <label style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '4px' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="form-input" />
            </div>
            <input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="form-input" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
            <button onClick={doAdd} className="btn-primary">Log</button>
          </div>
        </div>
      )}

      {/* Log tab */}
      {tab === 'log' && (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input value={exFilter} onChange={e => setExFilter(e.target.value)} placeholder="Filter by exercise…" className="form-input" style={{ maxWidth: '250px' }} />
          </div>
          {filteredLogs.length === 0 ? (
            <EmptyState icon={Dumbbell} title="No strength logs" description="Log your first set above." ctaLabel="Log Set" onAction={() => setShowAdd(true)} />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Exercise', 'Sets × Reps', 'Weight', 'Volume', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 40).map(l => {
                  const isPR = PRs[l.exercise]?.weight === l.weight && PRs[l.exercise]?.date === l.date;
                  return (
                    <tr key={l.id || l.date + l.exercise} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isPR ? 'rgba(251,191,36,0.05)' : 'transparent' }}>
                      <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: '0.72rem' }}>{l.date}</td>
                      <td style={{ padding: '0.5rem 0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isPR && <span title="Personal Record">🏆</span>} {l.exercise}
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'monospace' }}>{l.sets}×{l.reps}</td>
                      <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent)' }}>{l.weight} kg</td>
                      <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'monospace', color: 'var(--text-2)' }}>{(l.weight * l.reps * l.sets).toLocaleString()} kg</td>
                      <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-3)', fontSize: '0.7rem' }}>{l.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Progression tab */}
      {tab === 'progression' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
              <span className="card-title" style={{ margin: 0, marginRight: '0.5rem' }}>Max Weight Progression</span>
              {exercises.slice(0, 10).map(ex => (
                <button key={ex} onClick={() => setActiveEx(ex)} style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', background: (activeEx || exercises[0]) === ex ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: (activeEx || exercises[0]) === ex ? '#000' : 'var(--text-3)', border: 'none' }}>{ex}</button>
              ))}
            </div>
            {exLogs.length < 2 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', padding: '1.5rem 0', textAlign: 'center' }}>Log 2+ sessions for this exercise to see progression.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={exLogs} margin={{ top: 8, right: 8, bottom: 4, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit="kg" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="weight" name="Max Weight" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 5, fill: 'var(--accent)' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* 1RM tab */}
      {tab === '1rm' && <OneRMCalculator />}

      {/* Fatigue tab */}
      {tab === 'fatigue' && <MuscleFatigueHeatmap recentLogs={recentLogs7Days} />}

      {/* Volume tab */}
      {tab === 'volume' && (
        <div className="glass-card">
          <span className="card-title">Weekly Volume by Muscle Group</span>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Total volume (sets × reps × weight) for each muscle group this week.</p>
          {weeklyVolume.every(m => m.volume === 0) ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', padding: '1.5rem 0', textAlign: 'center' }}>No training logs from the past 7 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyVolume} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="muscle" tick={{ fontSize: 11, fill: 'var(--text-2)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v.toLocaleString()} kg`, 'Volume']} />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                  {weeklyVolume.map((entry, idx) => (
                    <React.Fragment key={entry.muscle}>
                      <rect fill={MUSCLE_COLORS[entry.muscle] || 'var(--accent)'} />
                    </React.Fragment>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
