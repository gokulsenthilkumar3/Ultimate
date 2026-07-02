import React, { useEffect, useState, useMemo } from 'react';
import useStore, {
  selectHabits, selectAddHabit, selectDeleteHabit, selectUpdateHabit,
  selectHabitLogsByHabit, selectFetchHabitLogsForHabit, selectToggleHabitForDate,
} from '../store/useStore';
import { Plus, Trash2, Flame, Check, ChevronDown, ChevronUp, Smile } from 'lucide-react';
import EmptyState from './ui/EmptyState';
import { useToast } from '../hooks/useToast';

const DAYS_BACK = 28;

function getDateRange() {
  const dates = [];
  for (let i = DAYS_BACK - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ── Dynamic streak from habit_logs (DB-backed)
function getStreakCount(logs = []) {
  const logSet = new Set(
    logs.filter(l => l.completed !== false).map(l => l.date)
  );
  let streak = 0;
  let d = new Date();
  // Allow today to count even if not yet toggled
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!logSet.has(key)) {
      // If today not done yet, start from yesterday
      if (streak === 0) { d.setDate(d.getDate() - 1); continue; }
      break;
    }
    streak++;
    d.setDate(d.getDate() - 1);
    // Safety: max 365
    if (streak > 365) break;
  }
  return streak;
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

export default React.memo(function HabitsMatrix() {
  const habits              = useStore(selectHabits);
  const addHabit            = useStore(selectAddHabit);
  const deleteHabit         = useStore(selectDeleteHabit);
  const updateHabit         = useStore(selectUpdateHabit);
  const habitLogsByHabit    = useStore(selectHabitLogsByHabit);
  const fetchHabitLogsForHabit = useStore(selectFetchHabitLogsForHabit);
  const toast = useToast();
  const toggleHabitForDate  = useStore(selectToggleHabitForDate);

  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name: '', emoji: '', category: 'routine', target_days: 7 });
  const [expanded, setExpanded] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  // Category filter: 'all' or a category key
  const [catFilter, setCatFilter] = useState('all');
  // Emoji editing: habitId -> draft emoji
  const [emojiEdit, setEmojiEdit] = useState({});

  useEffect(() => {
    const handleOpen = (e) => {
      if (e.detail === 'habits') setShowAdd(true);
    };
    window.addEventListener('open-add-form', handleOpen);
    return () => window.removeEventListener('open-add-form', handleOpen);
  }, []);

  const dates = useMemo(() => getDateRange(), []);
  const today = new Date().toISOString().slice(0, 10);

  // ── Fetch logs on mount
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
    // Extract first emoji/char only
    const clean = [...(draft.trim())][0] || DEFAULT_EMOJI;
    await updateHabit(habit.id, { emoji: clean });
    setEmojiEdit(e => { const n = { ...e }; delete n[habit.id]; return n; });
  };

  const isLogged = (habitId, date) => {
    const logs = habitLogsByHabit[habitId] || [];
    return logs.some(l => l.date === date && l.completed !== false);
  };

  const completionRate = (habitId) => {
    const logs = habitLogsByHabit[habitId] || [];
    const logSet = new Set(logs.filter(l => l.completed !== false).map(l => l.date));
    const count = dates.filter(d => logSet.has(d)).length;
    return Math.round((count / DAYS_BACK) * 100);
  };

  const totalActiveToday = habits.filter(h => isLogged(h.id, today)).length;

  // ── Group habits by category
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
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Habit Matrix</h2>
          <p className="text-sm text-gray-400 mt-0.5">{totalActiveToday}/{habits.length} done today</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition"
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </button>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition"
          >
            <Plus size={14} /> New Habit
          </button>
        </div>
      </div>

      {/* Add Habit Form */}
      {showAdd && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Emoji input */}
            <div style={{ position: 'relative' }}>
              <label className="block text-xs text-gray-400 mb-1">Emoji</label>
              <input
                placeholder="💪"
                value={form.emoji}
                maxLength={4}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-lg text-center focus:outline-none focus:border-amber-500"
                style={{ fontSize: '1.5rem', lineHeight: 1 }}
              />
            </div>
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Habit name</label>
              <input
                placeholder="e.g. Morning run"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            {/* Category */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {CATEGORY_CONFIG.map(c => (
                  <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-400">Target days/week:</label>
            <input
              type="number" min={1} max={7}
              value={form.target_days}
              onChange={e => setForm(f => ({ ...f, target_days: e.target.value }))}
              className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleAdd}
              className="ml-auto px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition"
            >Add Habit</button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{habits.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total Habits</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{totalActiveToday}</p>
          <p className="text-xs text-gray-400 mt-0.5">Done Today</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {habits.length > 0
              ? Math.round(habits.reduce((s, h) => s + completionRate(h.id), 0) / habits.length)
              : 0}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">28-day Avg</p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setCatFilter('all')}
          style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
            background: catFilter === 'all' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            color: catFilter === 'all' ? '#000' : 'var(--text-3)',
            border: catFilter === 'all' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >All ({habits.length})</button>
        {CATEGORY_CONFIG.map(c => {
          const count = habits.filter(h => h.category === c.key).length;
          if (count === 0) return null;
          return (
            <button key={c.key}
              onClick={() => setCatFilter(c.key)}
              style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                background: catFilter === c.key ? c.color : 'rgba(255,255,255,0.05)',
                color: catFilter === c.key ? '#fff' : 'var(--text-3)',
                border: catFilter === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{c.emoji} {c.label} ({count})</button>
          );
        })}
      </div>

      {/* Grid View ─ Grouped by category */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {habits.length === 0 && (
            <EmptyState 
              icon={Flame} 
              title="No Habits" 
              description="You have no habits configured. Start building your routine today." 
              ctaLabel="Create Habit" 
              onAction={() => setShowAdd(true)} 
            />
          )}
          {visibleCategories.map(cat => (
            <div key={cat.key}>
              {/* Category section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{cat.emoji}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: cat.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{cat.label}</span>
                <div style={{ flex: 1, height: '1px', background: `${cat.color}33` }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{groupedHabits[cat.key].length} habit{groupedHabits[cat.key].length !== 1 ? 's' : ''}</span>
              </div>

              <div className="space-y-3">
                {groupedHabits[cat.key].map(habit => {
                  const logs   = habitLogsByHabit[habit.id] || [];
                  const streak = getStreakCount(logs);
                  const rate   = completionRate(habit.id);
                  const isOpen = expanded[habit.id];
                  const habitEmoji = habit.emoji || DEFAULT_EMOJI;
                  const isEditingEmoji = emojiEdit[habit.id] !== undefined;

                  return (
                    <div key={habit.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Today toggle */}
                        <button
                          onClick={() => toggleHabitForDate(habit.id, today)}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                            isLogged(habit.id, today)
                              ? 'bg-emerald-500 border-emerald-400'
                              : 'border-white/20 hover:border-emerald-400'
                          }`}
                        >
                          {isLogged(habit.id, today) && <Check size={14} className="text-white" />}
                        </button>

                        {/* Emoji (inline editable) */}
                        {isEditingEmoji ? (
                          <input
                            autoFocus
                            maxLength={4}
                            value={emojiEdit[habit.id]}
                            onChange={e => setEmojiEdit(ee => ({ ...ee, [habit.id]: e.target.value }))}
                            onBlur={() => handleEmojiSave(habit)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') handleEmojiSave(habit); }}
                            style={{
                              width: '36px', height: '32px', textAlign: 'center', fontSize: '1.25rem',
                              background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
                              borderRadius: '6px', color: 'white', flexShrink: 0,
                            }}
                          />
                        ) : (
                          <span
                            title="Click to change emoji"
                            onClick={() => setEmojiEdit(ee => ({ ...ee, [habit.id]: habit.emoji || DEFAULT_EMOJI }))}
                            style={{ fontSize: '1.25rem', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}
                          >{habitEmoji}</span>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{habit.name}</p>
                          <p style={{ fontSize: '0.68rem', color: cat.color }}>{cat.emoji} {cat.label}</p>
                        </div>

                        {/* Streak — 🔥 if >= 3 */}
                        <div className="flex items-center gap-1" style={{ color: streak >= 3 ? '#f97316' : 'var(--text-3)' }}>
                          {streak >= 3 ? <Flame size={14} /> : <span style={{ fontSize: '0.75rem' }}>💫</span>}
                          <span className="text-sm font-bold">{streak}</span>
                        </div>

                        <div className="text-xs text-gray-400 w-10 text-right">{rate}%</div>
                        <button
                          onClick={() => setExpanded(e => ({ ...e, [habit.id]: !isOpen }))}
                          className="text-gray-500 hover:text-white transition ml-2"
                        >
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <div className="flex flex-col gap-1 ml-2">
                          <button onClick={() => handleMove(habit, 'up')} className="text-gray-500 hover:text-white transition" title="Move Up">
                            <ChevronUp size={14} />
                          </button>
                          <button onClick={() => handleMove(habit, 'down')} className="text-gray-500 hover:text-white transition" title="Move Down">
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        <button onClick={() => handleDelete(habit.id)} className="text-red-500 hover:text-red-400 transition ml-2">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* 28-day grid */}
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-xs text-gray-500 mb-2">Last 28 days</p>
                          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${DAYS_BACK}, minmax(0, 1fr))` }}>
                            {dates.map(d => (
                              <button
                                key={d}
                                title={d}
                                onClick={() => toggleHabitForDate(habit.id, d)}
                                className={`w-full aspect-square rounded-sm transition ${
                                  isLogged(habit.id, d)
                                    ? 'bg-emerald-500 hover:bg-emerald-400'
                                    : 'bg-white/10 hover:bg-white/20'
                                } ${d === today ? 'ring-1 ring-amber-400' : ''}`}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>{dates[0]}</span><span>{dates[dates.length - 1]}</span>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>28-day completion</span><span>{rate}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all"
                                style={{ width: `${rate}%`, background: `linear-gradient(to right, ${cat.color}, ${cat.color}aa)` }}
                              />
                            </div>
                          </div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-white/10">
                <th className="text-left py-2 pr-2 font-medium w-8">🎭</th>
                <th className="text-left py-2 pr-4 font-medium">Habit</th>
                <th className="text-left py-2 pr-4 font-medium">Category</th>
                <th className="text-center py-2 pr-4 font-medium">Today</th>
                <th className="text-center py-2 pr-4 font-medium">🔥 Streak</th>
                <th className="text-center py-2 pr-4 font-medium">28d %</th>
                <th className="text-center py-2 font-medium">Del</th>
              </tr>
            </thead>
            <tbody>
              {habits.map(h => {
                const cat = CAT_MAP[h.category] || CAT_MAP.other;
                const streak = getStreakCount(habitLogsByHabit[h.id]);
                return (
                  <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-2 pr-2 text-lg">{h.emoji || DEFAULT_EMOJI}</td>
                    <td className="py-2 pr-4 text-white font-medium">{h.name}</td>
                    <td className="py-2 pr-4" style={{ color: cat.color }}>{cat.emoji} {cat.label}</td>
                    <td className="py-2 pr-4 text-center">
                      <button
                        onClick={() => toggleHabitForDate(h.id, today)}
                        className={`w-6 h-6 mx-auto rounded-full border flex items-center justify-center transition ${
                          isLogged(h.id, today) ? 'bg-emerald-500 border-emerald-400' : 'border-white/20 hover:border-emerald-400'
                        }`}
                      >
                        {isLogged(h.id, today) && <Check size={12} className="text-white" />}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-center font-bold" style={{ color: streak >= 3 ? '#f97316' : 'var(--text-3)' }}>
                      {streak >= 3 ? '🔥' : ''}{streak}
                    </td>
                    <td className="py-2 pr-4 text-center text-blue-400">{completionRate(h.id)}%</td>
                    <td className="py-2 text-center">
                      <button onClick={() => handleDelete(h.id)} className="text-red-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {habits.length === 0 && (
            <EmptyState 
              icon={Flame} 
              title="No Habits" 
              description="You have no habits configured. Start building your routine today." 
              ctaLabel="Create Habit" 
              onAction={() => setShowAdd(true)} 
            />
          )}
        </div>
      )}
    </div>
  );
});
