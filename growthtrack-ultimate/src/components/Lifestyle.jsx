import React, { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, Trash2, Smile } from 'lucide-react';

const EMOJIS = ['🏃', '💤', '🧘', '📚', '🌳', '💧', '🍎', '🧠', '🏋️', '☀️', '🎵', '🚴'];
const today = () => new Date().toISOString().slice(0, 10);

const last7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
};

export default function Lifestyle({ user, updateSection }) {
  const lifestyle = user?.lifestyle || { habits: [], mood: [], screenTime: null, outdoorMinutes: null };
  const habits = lifestyle.habits || [];
  const moodLog = lifestyle.mood || [];

  const [habitForm, setHabitForm] = useState({ name: '', icon: '🏃' });
  const [moodForm, setMoodForm] = useState({ score: 7, note: '' });
  const [metrics, setMetrics] = useState({ screenTime: lifestyle.screenTime || '', outdoorMinutes: lifestyle.outdoorMinutes || '' });

  const addHabit = () => {
    if (!habitForm.name) return;
    const updated = [...habits, { id: Date.now(), name: habitForm.name, icon: habitForm.icon, streak: 0, completedDates: [] }];
    updateSection('lifestyle', { habits: updated });
    setHabitForm({ name: '', icon: '🏃' });
  };

  const toggleHabitDay = (habitId, date) => {
    const updated = habits.map(h => {
      if (h.id !== habitId) return h;
      const dates = h.completedDates || [];
      const newDates = dates.includes(date) ? dates.filter(d => d !== date) : [...dates, date];
      const sortedDates = newDates.slice().sort();
      let streak = 0;
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        const expected = new Date(); expected.setDate(expected.getDate() - (sortedDates.length - 1 - i));
        if (sortedDates[i] === expected.toISOString().slice(0, 10)) streak++;
        else break;
      }
      return { ...h, completedDates: newDates, streak };
    });
    updateSection('lifestyle', { habits: updated });
  };

  const removeHabit = (id) => {
    updateSection('lifestyle', { habits: habits.filter(h => h.id !== id) });
  };

  const logMood = () => {
    const existing = moodLog.filter(m => m.date !== today());
    const updated = [...existing, { date: today(), score: moodForm.score, note: moodForm.note }];
    updateSection('lifestyle', { mood: updated });
    setMoodForm({ score: 7, note: '' });
  };

  const saveMetrics = () => {
    updateSection('lifestyle', {
      screenTime: metrics.screenTime ? Number(metrics.screenTime) : null,
      outdoorMinutes: metrics.outdoorMinutes ? Number(metrics.outdoorMinutes) : null,
    });
  };

  const days7 = last7Days();
  const moodChart = days7.map(d => {
    const entry = moodLog.find(m => m.date === d);
    return { date: d.slice(5), score: entry?.score ?? null };
  });

  const todaysMood = moodLog.find(m => m.date === today());

  return (
    <div className="fade-in">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>Lifestyle</h2>
        <p className="text-secondary">Habit streaks, mood tracking, and daily wellness metrics.</p>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p className="label-caps">Habit Tracker — 7 Day Grid</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input placeholder="Habit name" value={habitForm.name} onChange={e => setHabitForm({ ...habitForm, name: e.target.value })}
                style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }} />
              <select value={habitForm.icon} onChange={e => setHabitForm({ ...habitForm, icon: e.target.value })}
                style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.9rem' }}>
                {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
              <button onClick={addHabit}
                style={{ padding: '0.4rem 0.75rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          {habits.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No habits yet. Add your first habit above.</p>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.4rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.5rem', minWidth: 140 }}>Habit</th>
                  {days7.map(d => (
                    <th key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.25rem', minWidth: 36 }}>
                      {d.slice(5)}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.5rem' }}>🔥</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {habits.map(habit => (
                  <tr key={habit.id}>
                    <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}>
                      {habit.icon} {habit.name}
                    </td>
                    {days7.map(d => {
                      const done = (habit.completedDates || []).includes(d);
                      return (
                        <td key={d} style={{ textAlign: 'center', padding: '0 0.25rem' }}>
                          <button onClick={() => toggleHabitDay(habit.id, d)}
                            title={d}
                            style={{
                              width: 28, height: 28, borderRadius: '6px', border: 'none', cursor: 'pointer',
                              background: done ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                              color: done ? '#fff' : 'var(--text-muted)',
                              fontSize: '0.75rem', fontWeight: 700,
                              transition: 'all 0.15s ease',
                            }}>
                            {done ? '✓' : '·'}
                          </button>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {habit.streak}
                    </td>
                    <td>
                      <button onClick={() => removeHabit(habit.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '0.2rem' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card">
          <p className="label-caps" style={{ marginBottom: '0.75rem' }}>Mood Log</p>
          {todaysMood && (
            <div style={{ marginBottom: '0.75rem', padding: '0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Smile size={20} color="var(--accent-primary)" />
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>Today: {todaysMood.score}/10</p>
                {todaysMood.note && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{todaysMood.note}</p>}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: 60 }}>Mood: {moodForm.score}/10</span>
              <input type="range" min={1} max={10} value={moodForm.score} onChange={e => setMoodForm({ ...moodForm, score: Number(e.target.value) })}
                style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
            </div>
            <input placeholder="Optional note" value={moodForm.note}
              onChange={e => setMoodForm({ ...moodForm, note: e.target.value })}
              style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }} />
            <button onClick={logMood}
              style={{ padding: '0.5rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
              Log Mood
            </button>
          </div>
        </div>

        <div className="glass-card">
          <p className="label-caps" style={{ marginBottom: '0.75rem' }}>14-Day Mood Trend</p>
          {moodLog.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={moodChart}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }} />
                <Area type="monotone" dataKey="score" stroke="var(--accent-primary)" fill="url(#moodGrad)" strokeWidth={2} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Log mood daily to see the trend</p>
          )}
        </div>

        <div className="glass-card">
          <p className="label-caps" style={{ marginBottom: '0.75rem' }}>Daily Metrics</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {[
              { label: 'Screen Time (hrs)', key: 'screenTime' },
              { label: 'Outdoor (mins)', key: 'outdoorMinutes' },
            ].map(f => (
              <div key={f.key}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{f.label}</p>
                <input type="number" value={metrics[f.key]} onChange={e => setMetrics({ ...metrics, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, textAlign: 'center' }} />
              </div>
            ))}
          </div>
          <button onClick={saveMetrics}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
