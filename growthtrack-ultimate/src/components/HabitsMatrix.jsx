import React, { useEffect, useState, useMemo } from 'react';
import useStore, {
  selectHabits, selectAddHabit, selectDeleteHabit, selectUpdateHabit,
  selectHabitLogsByHabit, selectFetchHabitLogsForHabit, selectToggleHabitForDate,
} from '../store/useStore';
import { Plus, Trash2, Flame, Check, ChevronDown, ChevronUp } from 'lucide-react';

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

function getStreakCount(logs = []) {
  const logSet = new Set(logs.map(l => l.date));
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!logSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const CATEGORIES = ['health', 'fitness', 'mindset', 'learning', 'routine', 'other'];
const CAT_COLORS = {
  health: 'text-emerald-400', fitness: 'text-blue-400', mindset: 'text-purple-400',
  learning: 'text-yellow-400', routine: 'text-orange-400', other: 'text-gray-400',
};

export default function HabitsMatrix() {
  const habits = useStore(selectHabits);
  const addHabit = useStore(selectAddHabit);
  const deleteHabit = useStore(selectDeleteHabit);
  const updateHabit = useStore(selectUpdateHabit);
  const habitLogsByHabit = useStore(selectHabitLogsByHabit);
  const fetchHabitLogsForHabit = useStore(selectFetchHabitLogsForHabit);
  const toggleHabitForDate = useStore(selectToggleHabitForDate);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'routine', target_days: 7 });
  const [expanded, setExpanded] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const dates = useMemo(() => getDateRange(), []);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    habits.forEach(h => {
      if (!habitLogsByHabit[h.id]) fetchHabitLogsForHabit(h.id);
    });
  }, [habits]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addHabit({ ...form, target_days: Number(form.target_days) });
    setForm({ name: '', category: 'routine', target_days: 7 });
    setShowAdd(false);
  };

  const isLogged = (habitId, date) => {
    const logs = habitLogsByHabit[habitId] || [];
    return logs.some(l => l.date === date);
  };

  const completionRate = (habitId) => {
    const logs = habitLogsByHabit[habitId] || [];
    const logSet = new Set(logs.map(l => l.date));
    const count = dates.filter(d => logSet.has(d)).length;
    return Math.round((count / DAYS_BACK) * 100);
  };

  const totalActiveToday = habits.filter(h => isLogged(h.id, today)).length;

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Habit name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500 col-span-1 sm:col-span-2"
            />
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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
            >Add</button>
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

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          {habits.length === 0 && (
            <div className="text-center text-gray-500 py-12">No habits yet. Add your first habit above.</div>
          )}
          {habits.map(habit => {
            const logs = habitLogsByHabit[habit.id] || [];
            const streak = getStreakCount(logs);
            const rate = completionRate(habit.id);
            const isOpen = expanded[habit.id];

            return (
              <div key={habit.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {/* Habit header */}
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

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{habit.name}</p>
                    <p className={`text-xs ${CAT_COLORS[habit.category] || 'text-gray-400'}`}>{habit.category}</p>
                  </div>

                  {/* Streak */}
                  <div className="flex items-center gap-1 text-orange-400">
                    <Flame size={14} />
                    <span className="text-sm font-bold">{streak}</span>
                  </div>

                  {/* Rate */}
                  <div className="text-xs text-gray-400 w-10 text-right">{rate}%</div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [habit.id]: !isOpen }))}
                    className="text-gray-500 hover:text-white transition"
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="text-red-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* 28-day grid — shown when expanded */}
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

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>28-day completion</span><span>{rate}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-white/10">
                <th className="text-left py-2 pr-4 font-medium">Habit</th>
                <th className="text-left py-2 pr-4 font-medium">Category</th>
                <th className="text-center py-2 pr-4 font-medium">Today</th>
                <th className="text-center py-2 pr-4 font-medium">🔥 Streak</th>
                <th className="text-center py-2 pr-4 font-medium">28d %</th>
                <th className="text-center py-2 font-medium">Del</th>
              </tr>
            </thead>
            <tbody>
              {habits.map(h => (
                <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="py-2 pr-4 text-white font-medium">{h.name}</td>
                  <td className={`py-2 pr-4 ${CAT_COLORS[h.category] || 'text-gray-400'}`}>{h.category}</td>
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
                  <td className="py-2 pr-4 text-center text-orange-400 font-bold">{getStreakCount(habitLogsByHabit[h.id])}</td>
                  <td className="py-2 pr-4 text-center text-blue-400">{completionRate(h.id)}%</td>
                  <td className="py-2 text-center">
                    <button onClick={() => deleteHabit(h.id)} className="text-red-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {habits.length === 0 && (
            <p className="text-center text-gray-500 py-8">No habits yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
