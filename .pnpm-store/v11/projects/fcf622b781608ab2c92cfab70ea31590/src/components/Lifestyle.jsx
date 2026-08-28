import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Smile, Zap, Trophy, BarChart2, Flame, Calendar, CheckSquare } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ContributionGrid from './ContributionGrid';
import ConfirmDialog from './ui/ConfirmDialog';
import useStore, {
  selectHabits, selectAddHabit, selectDeleteHabit, selectUpdateHabit
} from '../store/useStore';

const EMOJIS = ['🏃','💤','🧘','📚','🌳','💧','🍎','🧠','🏋️','☀️','🎵','🚴','🚿','🥑','🚶','🏊','✍️','🎯','🧊','🌿'];

const todayStr  = () => new Date().toISOString().slice(0, 10);
const last7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
const last30Days = () =>
  Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

function calcStreak(completedDates = []) {
  const set = new Set(completedDates);
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function completionRate(completedDates = [], days) {
  if (!days.length) return 0;
  const set = new Set(completedDates);
  const done = days.filter(d => set.has(d)).length;
  return Math.round((done / days.length) * 100);
}

// ── Analytics panel ─────────────────────────────────────────────────────────────
function AnalyticsPanel({ habits }) {
  const days7  = useMemo(() => last7Days(),  []);
  const days30 = useMemo(() => last30Days(), []);

  if (!habits.length) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
        <BarChart2 size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.25 }} />
        <p style={{ fontWeight: 700 }}>No habits yet</p>
        <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Add habits in the Tracker tab to see analytics.</p>
      </div>
    );
  }

  const sorted30 = [...habits]
    .map(h => ({ ...h, rate30: completionRate(h.completed_dates, days30) }))
    .sort((a, b) => b.rate30 - a.rate30);
  const totalCompletionsToday = habits.filter(h => (h.completed_dates || []).includes(todayStr())).length;
  const overallRate7  = Math.round(habits.reduce((s, h) => s + completionRate(h.completed_dates, days7),  0) / habits.length);
  const overallRate30 = Math.round(habits.reduce((s, h) => s + completionRate(h.completed_dates, days30), 0) / habits.length);
  const bestStreak    = Math.max(0, ...habits.map(h => h.streak || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
        {[
          { label: 'Today',      value: `${totalCompletionsToday}/${habits.length}`, color: totalCompletionsToday === habits.length ? '#22c55e' : 'var(--accent)', icon: CheckSquare },
          { label: '7d Rate',    value: `${overallRate7}%`,  color: overallRate7  >= 70 ? '#22c55e' : '#f59e0b', icon: Calendar },
          { label: '30d Rate',   value: `${overallRate30}%`, color: overallRate30 >= 70 ? '#22c55e' : '#f59e0b', icon: BarChart2 },
          { label: 'Best Streak',value: `${bestStreak}d`,   color: 'var(--accent)', icon: Flame },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-card" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="label-caps" style={{ fontSize: '0.62rem' }}>{label}</span>
              <Icon size={13} color={color} />
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color, fontFamily: 'var(--font-display)', lineHeight: 1, marginTop: '0.25rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Per-habit leaderboard */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-2)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Trophy size={14} color="var(--accent)" /> 30-Day Consistency
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {sorted30.map((h, i) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{h.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{h.name}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: h.rate30 >= 70 ? '#22c55e' : h.rate30 >= 40 ? '#f59e0b' : '#f43f5e' }}>{h.rate30}%</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${h.rate30}%`, height: '100%', borderRadius: '2px',
                    background: h.rate30 >= 70 ? '#22c55e' : h.rate30 >= 40 ? '#f59e0b' : '#f43f5e',
                    transition: 'width 0.6s var(--ease)',
                  }} />
                </div>
              </div>
              <span style={{
                fontSize: '0.62rem', fontWeight: 900, color: 'var(--text-3)',
                minWidth: '28px', textAlign: 'right',
              }}>
                {h.streak || 0}🔥
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Lifestyle() {
  const habits           = useStore(selectHabits);
  const addHabitAction   = useStore(selectAddHabit);
  const deleteHabitAction = useStore(selectDeleteHabit);
  const updateHabitAction = useStore(selectUpdateHabit);
  const isLoading        = useStore(s => s.isLoading);
  const toast            = useToast();

  const [hf, setHf]               = useState({ name: '', icon: '🏃' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' | 'analytics'

  const days = useMemo(() => last7Days(), []);

  const handleAddHabit = async () => {
    if (!hf.name.trim()) return toast.error('Habit name required');
    try {
      await addHabitAction({ name: hf.name, icon: hf.icon });
      setHf({ name: '', icon: '🏃' });
      toast.success(`"${hf.name}" habit started!`);
    } catch {
      toast.error('Failed to add habit');
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteHabitAction(confirmDelete);
      toast.success('Habit removed');
    } catch {
      toast.error('Delete failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  const toggleDay = async (habit, date) => {
    const ds  = habit.completed_dates || [];
    const nd  = ds.includes(date) ? ds.filter(d => d !== date) : [...ds, date];
    const streak = calcStreak(nd);
    try {
      await updateHabitAction(habit.id, { completed_dates: nd, streak });
    } catch {
      toast.error('Failed to update habit');
    }
  };

  const bestStreak = habits.length > 0 ? Math.max(0, ...habits.map(h => h.streak || 0)) : 0;

  return (
    <div className="fade-in module-page" style={{ padding: '0.5rem 0' }}>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this habit?"
        description="All tracking history for this habit will be lost forever."
        confirmLabel="Delete Habit"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Behavioural Telemetry</p>
          <h2 className="text-display" style={{ fontSize: '2.25rem' }}>Habit Matrix</h2>
          <p className="text-secondary">Track atomic consistency and neurological patterns.</p>
        </div>
        <div style={{ display: 'flex', align: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="glass-card" style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={18} color="var(--accent)" />
            <div>
              <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>Best Streak</p>
              <p style={{ fontSize: '1rem', fontWeight: 900 }}>{bestStreak} Days</p>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={18} color="#f59e0b" />
            <div>
              <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>Active Habits</p>
              <p style={{ fontSize: '1rem', fontWeight: 900 }}>{habits.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contribution Grid ── */}
      <ContributionGrid habits={habits} />

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'tracker',   label: 'Tracker',   icon: CheckSquare },
          { id: 'analytics', label: 'Analytics', icon: BarChart2   },
          { id: 'add',       label: 'Add Habit', icon: Plus        },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`btn-sm${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── Tracker Tab ── */}
      {activeTab === 'tracker' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              <Zap size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Active Consistency Loops
            </h3>
            <span className="label-caps" style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>
              {days[0].slice(5)} → {days[6].slice(5)}
            </span>
          </div>

          {isLoading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}><div className="spin-ring" /></div>
          ) : habits.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
              <Smile size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.2 }} />
              <p style={{ fontWeight: 700, color: 'var(--text-2)' }}>No habits yet</p>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Switch to "Add Habit" to begin tracking.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Day-of-week header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0', marginBottom: '0.25rem' }}>
                <div style={{ flex: '1 1 160px' }} />
                <div style={{ display: 'flex', gap: '4px' }}>
                  {days.map(d => (
                    <div key={d} style={{ width: '28px', textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {new Date(d).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                    </div>
                  ))}
                </div>
                <div style={{ width: '60px' }} />
              </div>

              {habits.map(h => {
                const rate7 = (() => {
                  const set = new Set(h.completed_dates || []);
                  return Math.round((days.filter(d => set.has(d)).length / days.length) * 100);
                })();

                return (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '14px', border: '1px solid var(--border)',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Icon + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 160px', minWidth: '120px' }}>
                      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{h.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</p>
                        <p className="label-caps" style={{ fontSize: '0.58rem', color: 'var(--accent)' }}>{h.streak || 0}🔥 · {rate7}% this week</p>
                      </div>
                    </div>

                    {/* Sparkline toggles */}
                    <div onClick={e => {
                      const dayEl = e.target.closest('[data-day]');
                      if (dayEl) toggleDay(h, dayEl.dataset.day);
                    }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {days.map(d => {
                          const isDone  = (h.completed_dates || []).includes(d);
                          const isToday = d === todayStr();
                          return (
                            <div
                              key={d}
                              data-day={d}
                              style={{
                                width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                                background: isDone ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                border: isToday ? '1.5px solid var(--accent)' : '1px solid transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.15s',
                                userSelect: 'none',
                              }}
                            >
                              {isDone && <span style={{ color: '#000', fontWeight: 900, fontSize: '0.72rem', pointerEvents: 'none' }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      className="btn-icon"
                      style={{ color: 'var(--danger)', flexShrink: 0, marginLeft: 'auto' }}
                      onClick={() => setConfirmDelete(h.id)}
                      title="Remove habit"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {activeTab === 'analytics' && <AnalyticsPanel habits={habits} />}

      {/* ── Add Habit Tab ── */}
      {activeTab === 'add' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 className="card-title"><Plus size={16} /> New Habit</h3>
            <div style={{ marginTop: '1.25rem' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Habit Name</label>
              <input
                className="form-input"
                value={hf.name}
                onChange={e => setHf({ ...hf, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
                placeholder="e.g. Morning Meditation"
                maxLength={48}
              />
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Select Icon</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setHf({ ...hf, icon: e })}
                    style={{
                      padding: '8px', borderRadius: '8px',
                      background: hf.icon === e ? 'var(--accent-soft)' : 'var(--bg-dark)',
                      border: hf.icon === e ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.15s',
                      transform: hf.icon === e ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >{e}</button>
                ))}
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: '1.5rem' }}
              onClick={handleAddHabit}
              disabled={!hf.name.trim()}
            >
              INITIALIZE HABIT
            </button>
          </div>

          {/* Neuro-insights card */}
          <div className="glass-card" style={{ padding: '1.75rem', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <h3 className="card-title" style={{ color: '#10b981' }}><Smile size={16} /> Neuro-Insights</h3>
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
                Consistency is the only variable that compounds. Your current average atomic consistency is{' '}
                <span style={{ fontWeight: 800, color: 'var(--text-1)' }}>
                  {habits.length > 0
                    ? (habits.reduce((acc, h) => acc + (h.streak || 0), 0) / habits.length).toFixed(1)
                    : 0} days
                </span>.
              </p>
              {habits.length > 0 && (
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p className="label-caps" style={{ fontSize: '0.62rem', color: '#10b981', marginBottom: '8px' }}>Strongest habit</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>
                      {[...habits].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0]?.icon}
                    </span>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                        {[...habits].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0]?.name}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                        {[...habits].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0]?.streak || 0} day streak 🔥
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)', paddingTop: '0.85rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  "We are what we repeatedly do. Excellence, then, is not an act, but a habit." — Aristotle
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
