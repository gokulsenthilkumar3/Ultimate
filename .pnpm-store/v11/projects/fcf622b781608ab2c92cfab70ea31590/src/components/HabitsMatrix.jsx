import React, { useEffect, useState, useMemo } from 'react';
import useStore, {
  selectHabits, selectAddHabit, selectDeleteHabit, selectUpdateHabit,
  selectHabitLogsByHabit, selectFetchHabitLogsForHabit, selectToggleHabitForDate,
} from '../store/useStore';
import { Plus, Trash2, Flame, Check, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import EmptyState from './ui/EmptyState';
import { useToast } from '../hooks/useToast';

const MATRIX_DAYS = 364;
const RECENT_DAYS = 28;

function getDateRange(daysBack) {
  const dates = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function getStreakCount(logs = []) {
  const logSet = new Set(logs.filter(l => l.completed !== false).map(l => l.date));
  let streak = 0;
  let missedConsecutive = 0;
  let started = false;
  let d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (logSet.has(key)) {
      streak++;
      missedConsecutive = 0;
      started = true;
    } else {
      if (started) {
        missedConsecutive++;
        if (missedConsecutive > 1) break;
      }
    }
    d.setDate(d.getDate() - 1);
    if (streak > 365) break;
  }
  return streak;
}

// ── Month labels for the 365-day grid ────────────────────────────────────
function buildMonthLabels(dates) {
  const labels = [];
  let lastMonth = null;
  // dates is ordered oldest→newest, displayed column-by-column (7 rows per col)
  // Each column is 1 week. We traverse columns left to right.
  const weeks = Math.ceil(dates.length / 7);
  for (let w = 0; w < weeks; w++) {
    const d = dates[w * 7];
    if (!d) continue;
    const month = d.slice(0, 7); // YYYY-MM
    if (month !== lastMonth) {
      labels.push({ col: w, label: new Date(d).toLocaleDateString('en', { month: 'short' }) });
      lastMonth = month;
    }
  }
  return labels;
}

const CATEGORY_CONFIG = [
  { key: 'health',   label: 'Health',   emoji: '🏃', color: '#10b981' },
  { key: 'work',     label: 'Work',     emoji: '💼', color: '#3b82f6' },
  { key: 'personal', label: 'Personal', emoji: '🧘', color: '#8b5cf6' },
  { key: 'learning', label: 'Learning', emoji: '📚', color: '#f59e0b' },
  { key: 'fitness',  label: 'Fitness',  emoji: '💪', color: '#0ea5e9' },
  { key: 'routine',  label: 'Routine',  emoji: '⏰', color: '#f97316' },
  { key: 'other',    label: 'Other',    emoji: '✨', color: '#6b7280' },
];
const CAT_MAP = Object.fromEntries(CATEGORY_CONFIG.map(c => [c.key, c]));
const DEFAULT_EMOJI = '✅';

const STREAK_MILESTONES = [
  { days: 100, label: '💯 100 Days!', color: '#f43f5e' },
  { days: 60,  label: '🌟 60 Days',  color: '#8b5cf6' },
  { days: 30,  label: '🏆 30 Days',  color: '#f59e0b' },
  { days: 21,  label: '💪 21 Days',  color: '#10b981' },
  { days: 14,  label: '🔥 2 Weeks',  color: '#f97316' },
  { days: 7,   label: '⚡ 1 Week',   color: '#0ea5e9' },
];
function getStreakMilestone(streak) {
  return STREAK_MILESTONES.find(m => streak >= m.days) || null;
}

// ── Global 365-day Heatmap (all habits combined) ──────────────────────────
function GlobalHeatmap({ dates, habits, habitLogsByHabit }) {
  const [tooltip, setTooltip] = useState(null);
  const totalHabits = habits.length;

  const countByDate = useMemo(() => {
    const map = {};
    dates.forEach(d => { map[d] = 0; });
    habits.forEach(h => {
      const logs = habitLogsByHabit[h.id] || [];
      const logSet = new Set(logs.filter(l => l.completed !== false).map(l => l.date));
      dates.forEach(d => { if (logSet.has(d)) map[d]++; });
    });
    return map;
  }, [dates, habits, habitLogsByHabit]);

  const monthLabels = useMemo(() => buildMonthLabels(dates), [dates]);
  const weeks = Math.ceil(dates.length / 7);
  const CELL = 13;
  const GAP  = 3;

  const getCellColor = (date) => {
    const count = countByDate[date] || 0;
    if (!count || !totalHabits) return 'rgba(255,255,255,0.04)';
    const pct = count / totalHabits;
    if (pct >= 1)    return '#10b981';
    if (pct >= 0.75) return '#34d399';
    if (pct >= 0.5)  return '#059669';
    if (pct >= 0.25) return '#0ea5e9';
    return '#1d4ed8';
  };

  if (habits.length === 0) return null;

  return (
    <div className="glass-card mb-lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
        <Calendar size={16} color="var(--accent)" />
        <span className="card-title" style={{ margin: 0 }}>365-Day Overview</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-3)' }}>
          All {totalHabits} habit{totalHabits !== 1 ? 's' : ''} combined
        </span>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '6px' }}>
        <div style={{ position: 'relative', width: `${weeks * (CELL + GAP)}px`, marginBottom: '4px' }}>
          {/* Month labels */}
          {monthLabels.map((ml, i) => (
            <span key={i} style={{
              position: 'absolute', left: `${ml.col * (CELL + GAP)}px`,
              fontSize: '0.6rem', color: 'var(--text-3)', whiteSpace: 'nowrap',
              top: 0, fontWeight: 600,
            }}>{ml.label}</span>
          ))}
        </div>

        {/* Day-of-week labels */}
        <div style={{ display: 'flex', gap: '0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px`, marginRight: `${GAP}px`, marginTop: '18px' }}>
            {['M', '', 'W', '', 'F', '', 'S'].map((d, i) => (
              <div key={i} style={{ height: `${CELL}px`, fontSize: '0.55rem', color: 'var(--text-3)', lineHeight: `${CELL}px`, width: '10px' }}>{d}</div>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateRows: `repeat(7, ${CELL}px)`,
            gridAutoFlow: 'column',
            gap: `${GAP}px`,
            marginTop: '18px',
          }}>
            {dates.map(d => {
              const count = countByDate[d] || 0;
              const bg = getCellColor(d);
              const today = new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={d}
                  style={{
                    width: `${CELL}px`, height: `${CELL}px`,
                    borderRadius: '3px', background: bg,
                    cursor: 'default',
                    border: d === today ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.04)',
                    transition: 'transform 0.1s',
                  }}
                  title={`${d}: ${count}/${totalHabits} habits completed`}
                  onMouseEnter={e => setTooltip({ date: d, count, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>0%</span>
        {[0.04, '#1d4ed8', '#0ea5e9', '#059669', '#34d399', '#10b981'].map((c, i) => (
          <div key={i} style={{
            width: '11px', height: '11px', borderRadius: '2px',
            background: typeof c === 'string' && c.startsWith('#') ? c : `rgba(255,255,255,${c})`,
          }} />
        ))}
        <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>100%</span>
      </div>
    </div>
  );
}

// ── Per-habit 365-day heatmap (expanded view) ─────────────────────────────
function HabitHeatmap({ habit, dates, habitLogsByHabit, cat, toggleHabitForDate }) {
  const CELL = 14;
  const GAP  = 3;
  const logs = habitLogsByHabit[habit.id] || [];
  const logSet = useMemo(() => new Set(logs.filter(l => l.completed !== false).map(l => l.date)), [logs]);
  const weeks = Math.ceil(dates.length / 7);
  const monthLabels = useMemo(() => buildMonthLabels(dates), [dates]);

  return (
    <div style={{ paddingLeft: '1rem', paddingRight: '1rem', paddingBottom: '1rem' }}>
      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        {/* Month labels */}
        <div style={{ position: 'relative', height: '18px', width: `${10 + GAP + weeks * (CELL + GAP)}px` }}>
          {monthLabels.map((ml, i) => (
            <span key={i} style={{
              position: 'absolute',
              left: `${10 + GAP + ml.col * (CELL + GAP)}px`,
              fontSize: '0.58rem', color: 'var(--text-3)', fontWeight: 600,
            }}>{ml.label}</span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0' }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px`, marginRight: `${GAP}px` }}>
            {['M', '', 'W', '', 'F', '', 'S'].map((d, i) => (
              <div key={i} style={{ height: `${CELL}px`, fontSize: '0.52rem', color: 'var(--text-3)', lineHeight: `${CELL}px`, width: '10px' }}>{d}</div>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateRows: `repeat(7, ${CELL}px)`,
            gridAutoFlow: 'column',
            gap: `${GAP}px`,
          }}>
            {dates.map(d => {
              const logged = logSet.has(d);
              const today  = new Date().toISOString().slice(0, 10);
              return (
                <button
                  key={d}
                  title={`${d}${logged ? ' (Done)' : ''}`}
                  onClick={() => toggleHabitForDate(habit.id, d)}
                  style={{
                    width: `${CELL}px`, height: `${CELL}px`,
                    borderRadius: '3px', cursor: 'pointer',
                    background: logged ? cat.color : 'rgba(255,255,255,0.04)',
                    border: d === today ? `2px solid ${cat.color}` : '1px solid rgba(255,255,255,0.05)',
                    opacity: logged ? 1 : 0.6,
                    transition: 'transform 0.1s, opacity 0.2s',
                  }}
                  className="hover-scale-12"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Date range labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{dates[0]}</span>
        <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{dates[dates.length - 1]}</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default React.memo(function HabitsMatrix() {
  const habits             = useStore(selectHabits);
  const addHabit           = useStore(selectAddHabit);
  const deleteHabit        = useStore(selectDeleteHabit);
  const updateHabit        = useStore(selectUpdateHabit);
  const habitLogsByHabit   = useStore(selectHabitLogsByHabit);
  const fetchHabitLogsForHabit = useStore(selectFetchHabitLogsForHabit);
  const toggleHabitForDate = useStore(selectToggleHabitForDate);
  const toast              = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '', category: 'routine', target_days: 7 });
  const [expanded, setExpanded] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [catFilter, setCatFilter] = useState('all');
  const [emojiEdit, setEmojiEdit] = useState({});
  const [justCompleted, setJustCompleted] = useState(new Set());

  useEffect(() => {
    const handleOpen = (e) => { if (e.detail === 'habits') setShowAdd(true); };
    window.addEventListener('open-add-form', handleOpen);
    return () => window.removeEventListener('open-add-form', handleOpen);
  }, []);

  const dates = useMemo(() => getDateRange(MATRIX_DAYS), []);
  const recentDates = useMemo(() => getDateRange(RECENT_DAYS), []);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    habits.forEach(h => { fetchHabitLogsForHabit(h.id); });
  }, [habits, fetchHabitLogsForHabit]);

  const handleDelete = (id) => {
    const habitToRestore = habits.find(h => h.id === id);
    deleteHabit(id);
    toast.info('Habit deleted', 5000, {
      action: { label: 'Undo', onClick: () => { if (habitToRestore) addHabit(habitToRestore); } }
    });
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addHabit({
      name: form.name.trim(),
      emoji: form.emoji.trim() || DEFAULT_EMOJI,
      category: form.category,
      target_days: Number(form.target_days),
    });
    setForm({ name: '', emoji: '', category: 'routine', target_days: 7 });
    setShowAdd(false);
  };

  const handleEmojiSave = async (habit) => {
    const draft = emojiEdit[habit.id];
    if (draft === undefined) return;
    const clean = [...(draft.trim())][0] || DEFAULT_EMOJI;
    await updateHabit(habit.id, { emoji: clean });
    setEmojiEdit(e => { const n = { ...e }; delete n[habit.id]; return n; });
  };

  const isLogged = (habitId, date) => {
    const logs = habitLogsByHabit[habitId] || [];
    return logs.some(l => l.date === date && l.completed !== false);
  };

  const handleToggleToday = (habitId) => {
    const wasLogged = isLogged(habitId, today);
    toggleHabitForDate(habitId, today);
    if (!wasLogged) {
      setJustCompleted(prev => { const next = new Set(prev); next.add(habitId); return next; });
      setTimeout(() => setJustCompleted(prev => { const next = new Set(prev); next.delete(habitId); return next; }), 700);
    }
  };

  const completionRate = (habitId) => {
    const logs = habitLogsByHabit[habitId] || [];
    const logSet = new Set(logs.filter(l => l.completed !== false).map(l => l.date));
    const count = recentDates.filter(d => logSet.has(d)).length;
    return Math.round((count / RECENT_DAYS) * 100);
  };

  const totalActiveToday = habits.filter(h => isLogged(h.id, today)).length;

  const groupedHabits = useMemo(() => {
    const filtered = catFilter === 'all' ? habits : habits.filter(h => h.category === catFilter);
    const groups = {};
    CATEGORY_CONFIG.forEach(c => { groups[c.key] = []; });
    filtered.forEach(h => {
      const cat = h.category && groups[h.category] !== undefined ? h.category : 'other';
      groups[cat].push(h);
    });
    Object.keys(groups).forEach(k => {
      groups[k].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    });
    return groups;
  }, [habits, catFilter]);

  const visibleCategories = CATEGORY_CONFIG.filter(c => groupedHabits[c.key]?.length > 0);

  const handleMove = async (habit, dir) => {
    const cat = habit.category && CAT_MAP[habit.category] ? habit.category : 'other';
    const list = groupedHabits[cat];
    const idx = list.findIndex(h => h.id === habit.id);
    if (dir === 'up' && idx > 0) {
      const updates = list.map((h, i) => ({ ...h, order_index: h.order_index ?? i }));
      const temp = updates[idx].order_index;
      updates[idx].order_index = updates[idx-1].order_index;
      updates[idx-1].order_index = temp;
      updateHabit(updates[idx].id, { order_index: updates[idx].order_index });
      updateHabit(updates[idx-1].id, { order_index: updates[idx-1].order_index });
    } else if (dir === 'down' && idx < list.length - 1) {
      const updates = list.map((h, i) => ({ ...h, order_index: h.order_index ?? i }));
      const temp = updates[idx].order_index;
      updates[idx].order_index = updates[idx+1].order_index;
      updates[idx+1].order_index = temp;
      updateHabit(updates[idx].id, { order_index: updates[idx].order_index });
      updateHabit(updates[idx+1].id, { order_index: updates[idx+1].order_index });
    }
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.3rem' }}>Habit Tracking</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Habit Matrix</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{totalActiveToday}/{habits.length} done today</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '8px',
                     border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                     color: 'var(--text-2)', cursor: 'pointer', fontWeight: 600 }}>
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </button>
          <button onClick={() => setShowAdd(s => !s)} className="btn-primary">
            <Plus size={14} /> New Habit
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Habits', val: habits.length, color: 'var(--accent)' },
          { label: 'Done Today',   val: totalActiveToday, color: '#10b981' },
          { label: '28-day Avg',
            val: habits.length > 0 ? Math.round(habits.reduce((s, h) => s + completionRate(h.id), 0) / habits.length) + '%' : '0%',
            color: '#0ea5e9' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Global 365-day heatmap */}
      <GlobalHeatmap dates={dates} habits={habits} habitLogsByHabit={habitLogsByHabit} />

      {/* Add Habit Form */}
      {showAdd && (
        <div className="glass-card mb-lg">
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>New Habit</p>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr auto', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '5px' }}>Emoji</label>
              <input placeholder="💪" value={form.emoji} maxLength={4}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                className="form-input" style={{ fontSize: '1.5rem', textAlign: 'center', padding: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '5px' }}>Habit name *</label>
              <input placeholder="e.g. Morning run" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="form-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '5px' }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input">
                {CATEGORY_CONFIG.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '5px' }}>Target days/wk</label>
              <input type="number" min={1} max={7} value={form.target_days}
                onChange={e => setForm(f => ({ ...f, target_days: e.target.value }))}
                className="form-input" style={{ width: '60px' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
            <button onClick={handleAdd} className="btn-primary">Add Habit</button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button onClick={() => setCatFilter('all')} style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
          background: catFilter === 'all' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
          color: catFilter === 'all' ? '#000' : 'var(--text-3)',
          border: catFilter === 'all' ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
        }}>All ({habits.length})</button>
        {CATEGORY_CONFIG.map(c => {
          const count = habits.filter(h => h.category === c.key).length;
          if (count === 0) return null;
          return (
            <button key={c.key} onClick={() => setCatFilter(c.key)} style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
              background: catFilter === c.key ? c.color : 'rgba(255,255,255,0.05)',
              color: catFilter === c.key ? '#fff' : 'var(--text-3)',
              border: catFilter === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
            }}>{c.emoji} {c.label} ({count})</button>
          );
        })}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {habits.length === 0 && (
            <EmptyState icon={Flame} title="No Habits" description="Start building your routine today."
              ctaLabel="Create Habit" onAction={() => setShowAdd(true)} />
          )}
          {visibleCategories.map(cat => (
            <div key={cat.key}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{cat.emoji}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: cat.color, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{cat.label}</span>
                <div style={{ flex: 1, height: '1px', background: `${cat.color}33` }} />
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{groupedHabits[cat.key].length} habit{groupedHabits[cat.key].length !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {groupedHabits[cat.key].map(habit => {
                  const logs   = habitLogsByHabit[habit.id] || [];
                  const streak = getStreakCount(logs);
                  const rate   = completionRate(habit.id);
                  const isOpen = expanded[habit.id];
                  const habitEmoji = habit.emoji || DEFAULT_EMOJI;
                  const isEditingEmoji = emojiEdit[habit.id] !== undefined;
                  const milestone = getStreakMilestone(streak);

                  return (
                    <div key={habit.id} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px', overflow: 'hidden',
                      borderLeft: isLogged(habit.id, today) ? `3px solid ${cat.color}` : '3px solid transparent',
                    }}>
                      {/* Habit row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem' }}>
                        {/* Today check button */}
                        <button onClick={() => handleToggleToday(habit.id)} style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                          border: `2px solid ${isLogged(habit.id, today) ? cat.color : 'rgba(255,255,255,0.2)'}`,
                          background: isLogged(habit.id, today) ? cat.color : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.25s',
                          transform: justCompleted.has(habit.id) ? 'scale(1.35)' : 'scale(1)',
                          boxShadow: justCompleted.has(habit.id) ? `0 0 15px ${cat.color}` : 'none',
                        }}>
                          {isLogged(habit.id, today) && <Check size={13} color="#fff" />}
                        </button>

                        {/* Emoji */}
                        {isEditingEmoji ? (
                          <input autoFocus maxLength={4} value={emojiEdit[habit.id]}
                            onChange={e => setEmojiEdit(ee => ({ ...ee, [habit.id]: e.target.value }))}
                            onBlur={() => handleEmojiSave(habit)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') handleEmojiSave(habit); }}
                            style={{ width: '36px', height: '32px', textAlign: 'center', fontSize: '1.25rem',
                                     background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
                                     borderRadius: '6px', color: 'white', flexShrink: 0 }} />
                        ) : (
                          <span title="Click to change emoji"
                            onClick={() => setEmojiEdit(ee => ({ ...ee, [habit.id]: habit.emoji || DEFAULT_EMOJI }))}
                            style={{ fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0 }}>
                            {habitEmoji}
                          </span>
                        )}

                        {/* Name + category */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {habit.name}
                          </p>
                          <p style={{ fontSize: '0.65rem', color: cat.color, marginTop: '1px' }}>{cat.emoji} {cat.label}</p>
                        </div>

                        {/* Streak + milestone */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: streak >= 3 ? '#f97316' : 'var(--text-3)' }}>
                            {streak >= 3 ? <Flame size={13} /> : null}
                            <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{streak}</span>
                          </div>
                          {milestone && (
                            <span style={{ fontSize: '0.52rem', fontWeight: 800, color: milestone.color,
                                           background: `${milestone.color}22`, padding: '1px 5px',
                                           borderRadius: '99px', whiteSpace: 'nowrap' }}>
                              {milestone.label}
                            </span>
                          )}
                        </div>

                        {/* 28-day % */}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', width: '32px', textAlign: 'right', flexShrink: 0 }}>{rate}%</span>

                        {/* Expand toggle */}
                        <button onClick={() => setExpanded(e => ({ ...e, [habit.id]: !isOpen }))}
                          style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px' }}>
                          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>

                        {/* Move up/down */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <button onClick={() => handleMove(habit, 'up')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '1px' }}><ChevronUp size={12} /></button>
                          <button onClick={() => handleMove(habit, 'down')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '1px' }}><ChevronDown size={12} /></button>
                        </div>

                        {/* Delete */}
                        <button onClick={() => handleDelete(habit.id)}
                          style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.6)', cursor: 'pointer', padding: '2px' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Completion mini-bar (always visible) */}
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ height: '100%', width: `${rate}%`, background: cat.color, transition: 'width 0.5s ease' }} />
                      </div>

                      {/* Expanded: 365-day heatmap */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', padding: '0.6rem 1rem 0.25rem' }}>
                            364-Day Activity · 28d rate: {rate}%
                          </p>
                          <HabitHeatmap
                            habit={habit} dates={dates}
                            habitLogsByHabit={habitLogsByHabit}
                            cat={cat} toggleHabitForDate={toggleHabitForDate}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['', 'Habit', 'Category', 'Today', '🔥 Streak', '28d %', ''].map((h, i) => (
                  <th key={i} style={{ padding: '0.5rem 0.6rem', textAlign: i <= 1 ? 'left' : 'center',
                                       color: 'var(--text-3)', fontWeight: 700, fontSize: '0.68rem',
                                       textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map(h => {
                const cat = CAT_MAP[h.category] || CAT_MAP.other;
                const streak = getStreakCount(habitLogsByHabit[h.id]);
                return (
                  <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem 0.6rem', fontSize: '1.15rem' }}>{h.emoji || DEFAULT_EMOJI}</td>
                    <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600, color: 'var(--text-1)' }}>{h.name}</td>
                    <td style={{ padding: '0.5rem 0.6rem', color: cat.color, textAlign: 'center' }}>{cat.emoji} {cat.label}</td>
                    <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                      <button onClick={() => handleToggleToday(h.id)} style={{
                        width: '24px', height: '24px', margin: '0 auto',
                        borderRadius: '50%', border: `2px solid ${isLogged(h.id, today) ? cat.color : 'rgba(255,255,255,0.2)'}`,
                        background: isLogged(h.id, today) ? cat.color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        transition: 'all 0.25s',
                        transform: justCompleted.has(h.id) ? 'scale(1.35)' : 'scale(1)',
                        boxShadow: justCompleted.has(h.id) ? `0 0 15px ${cat.color}` : 'none',
                      }}>
                        {isLogged(h.id, today) && <Check size={12} color="#fff" />}
                      </button>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: 800, color: streak >= 3 ? '#f97316' : 'var(--text-3)' }}>
                      {streak >= 3 ? '🔥' : ''}{streak}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#0ea5e9' }}>{completionRate(h.id)}%</td>
                    <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(h.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {habits.length === 0 && (
            <EmptyState icon={Flame} title="No Habits" description="Start building your routine today."
              ctaLabel="Create Habit" onAction={() => setShowAdd(true)} />
          )}
        </div>
      )}
    </div>
  );
});
