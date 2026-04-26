import React, { useState, useMemo, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, Trash2, Smile, Heart } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import PageHeader from './ui/PageHeader';

const EMOJIS = ['🏃','💤','🧘','📚','🌳','💧','🍎','🧠','🏋️','☀️','🎵','🚴'];
const todayStr = () => new Date().toISOString().slice(0, 10);
const last7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

const TOOLTIP_STYLE = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(12px)',
};

export default function Lifestyle({ user, setUser }) {
  const toast = useToast();

  const upd = useCallback((s, d) =>
    setUser({ ...user, [s]: { ...(user?.[s] || {}), ...d } }),
    [user, setUser]
  );

  const lf      = user?.lifestyle || { habits: [], mood: [], screenTime: null, outdoorMinutes: null };
  const habits  = Array.isArray(lf?.habits) ? lf.habits : [];
  const moodLog = lf.mood || [];

  const [hf, setHf] = useState({ name: '', icon: '🏃' });
  const [mf, setMf] = useState({ score: 7, note: '' });
  const [mt, setMt] = useState({ screenTime: lf.screenTime || '', outdoorMinutes: lf.outdoorMinutes || '' });

  // ── #2 Validated add habit with toast
  const addHabit = useCallback(() => {
    if (!hf.name.trim()) {
      toast.error('Habit name cannot be empty.');
      return;
    }
    upd('lifestyle', {
      habits: [...habits, { id: Date.now(), name: hf.name, icon: hf.icon, streak: 0, completedDates: [] }],
    });
    setHf({ name: '', icon: '🏃' });
    toast.success(`Habit "${hf.name}" added!`);
  }, [hf, habits, upd, toast]);

  const toggleDay = useCallback((hid, date) => {
    const updated = habits.map((h) => {
      if (h.id !== hid) return h;
      const ds = h.completedDates || [];
      const nd = ds.includes(date) ? ds.filter((d) => d !== date) : [...ds, date];
      let streak = 0;
      const sorted = [...nd].sort();
      for (let i = sorted.length - 1; i >= 0; i--) {
        const exp = new Date();
        exp.setDate(exp.getDate() - (sorted.length - 1 - i));
        if (sorted[i] === exp.toISOString().slice(0, 10)) streak++;
        else break;
      }
      return { ...h, completedDates: nd, streak };
    });
    upd('lifestyle', { habits: updated });
  }, [habits, upd]);

  const removeHabit = useCallback((id, name) => {
    upd('lifestyle', { habits: habits.filter((x) => x.id !== id) });
    toast.info(`Habit "${name}" removed.`);
  }, [habits, upd, toast]);

  const logMood = useCallback(() => {
    const ex = moodLog.filter((m) => m.date !== todayStr());
    upd('lifestyle', { mood: [...ex, { date: todayStr(), score: mf.score, note: mf.note }] });
    setMf({ score: 7, note: '' });
    toast.success(`Mood logged: ${mf.score}/10`);
  }, [mf, moodLog, upd, toast]);

  const saveMetrics = useCallback(() => {
    upd('lifestyle', {
      screenTime: mt.screenTime ? Number(mt.screenTime) : null,
      outdoorMinutes: mt.outdoorMinutes ? Number(mt.outdoorMinutes) : null,
    });
    toast.success('Daily metrics saved.');
  }, [mt, upd, toast]);

  // ── #9 useMemo: mood chart data
  const d7 = useMemo(() => last7Days(), []);
  const moodChart = useMemo(() =>
    d7.map((d) => {
      const e = moodLog.find((m) => m.date === d);
      return { date: d.slice(5), score: e?.score ?? null };
    }),
    [d7, moodLog]
  );
  const todaysMood = useMemo(() => moodLog.find((m) => m.date === todayStr()), [moodLog]);

  return (
    <div className="fade-in module-page">
      <PageHeader
        accent="Lifestyle"
        icon={<Heart size={24} />}
        title="Lifestyle"
        subtitle="Habit streaks, mood tracking, and daily wellness metrics."
      />

      <div className="lifestyle-grid mb-lg">
        {/* Habit Tracker */}
        <div className="glass-card" style={{ gridColumn: habits.length > 0 ? 'span 2' : 'span 1' }}>
          <div className="card-header-row mb-sm" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="card-title" style={{ margin: 0 }}>Habit Tracker — 7 Day Grid</span>
            <div className="flex-row gap-sm">
              <input
                placeholder="Habit name" value={hf.name}
                onChange={(e) => setHf({ ...hf, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                className="form-input" style={{ maxWidth: '160px' }}
              />
              <select
                value={hf.icon} onChange={(e) => setHf({ ...hf, icon: e.target.value })}
                className="form-input" style={{ width: 'auto', fontSize: '1rem' }}
              >
                {EMOJIS.map((em) => <option key={em} value={em}>{em}</option>)}
              </select>
              <button onClick={addHabit} className="btn-primary" style={{ padding: '0.4rem 0.75rem' }}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          {habits.length === 0 && (
            <p className="empty-msg">No habits yet. Add your first habit above.</p>
          )}
          {habits.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="habit-table">
                <thead>
                  <tr>
                    <th className="habit-table__label-col">Habit</th>
                    {d7.map((d) => <th key={d} className="habit-table__day-col">{d.slice(5)}</th>)}
                    <th className="habit-table__streak-col">🔥</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {habits.map((h) => (
                    <tr key={h.id}>
                      <td className="habit-table__name">{h.icon} {h.name}</td>
                      {d7.map((d) => {
                        const done = (h.completedDates || []).includes(d);
                        return (
                          <td key={d} style={{ textAlign: 'center', padding: '0 0.15rem' }}>
                            <button
                              onClick={() => toggleDay(h.id, d)}
                              title={d}
                              className={`habit-day-btn${done ? ' habit-day-btn--done' : ''}`}
                              aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {done ? '✓' : '·'}
                            </button>
                          </td>
                        );
                      })}
                      <td className="habit-table__streak">{h.streak}</td>
                      <td>
                        <button
                          onClick={() => removeHabit(h.id, h.name)}
                          className="btn-icon btn-icon--danger"
                          aria-label="Remove habit"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mood Log */}
        <div className="glass-card">
          <span className="card-title">Mood Log</span>
          {todaysMood && (
            <div className="mood-today mb-sm">
              <Smile size={20} color="var(--accent)" />
              <div>
                <p className="mood-today__score">Today: {todaysMood.score}/10</p>
                {todaysMood.note && <p className="mood-today__note">{todaysMood.note}</p>}
              </div>
            </div>
          )}
          <div className="form-stack" style={{ marginTop: todaysMood ? 0 : '0.75rem' }}>
            <div className="flex-row align-center gap-sm">
              <span className="mood-label">Mood: {mf.score}/10</span>
              <input
                type="range" min={1} max={10} value={mf.score}
                onChange={(e) => setMf({ ...mf, score: Number(e.target.value) })}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
            </div>
            <input
              placeholder="Optional note" value={mf.note}
              onChange={(e) => setMf({ ...mf, note: e.target.value })}
              className="form-input"
            />
            <button onClick={logMood} className="btn-primary btn-full">Log Mood</button>
          </div>
        </div>

        {/* Mood Trend */}
        <div className="glass-card">
          <span className="card-title">7-Day Mood Trend</span>
          {moodLog.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={moodChart}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="score" stroke="var(--accent)" fill="url(#moodGrad)" strokeWidth={2} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-msg" style={{ textAlign: 'center', padding: '2rem 0' }}>
              Log mood daily to see the trend
            </p>
          )}
        </div>

        {/* Daily Metrics */}
        <div className="glass-card">
          <span className="card-title">Daily Metrics</span>
          <div className="metrics-2col mt-sm mb-sm">
            {[{ label: 'Screen Time (hrs)', key: 'screenTime' }, { label: 'Outdoor (mins)', key: 'outdoorMinutes' }].map((f) => (
              <div key={f.key}>
                <p className="label-caps mb-xs">{f.label}</p>
                <input
                  type="number" value={mt[f.key]}
                  onChange={(e) => setMt({ ...mt, [f.key]: e.target.value })}
                  className="form-input"
                  style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                  min="0"
                />
              </div>
            ))}
          </div>
          <button onClick={saveMetrics} className="btn-primary btn-full">Save</button>
        </div>
      </div>
    </div>
  );
}
