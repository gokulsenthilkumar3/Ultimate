import React, { useState, useMemo } from 'react';
import useStore, {
  selectGoals, selectAddGoal, selectDeleteGoal, selectUpdateGoal,
} from '../store/useStore';
import { Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, TrendingUp, Target, Calendar, Flag } from 'lucide-react';

const STATUS_OPTIONS = ['active', 'completed', 'paused', 'cancelled'];
const CATEGORY_OPTIONS = ['fitness', 'finance', 'career', 'learning', 'health', 'personal', 'other'];
const STATUS_COLORS = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  completed: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  paused: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  cancelled: 'text-red-400 bg-red-500/10 border-red-500/30',
};

function ProgressRing({ value = 0, size = 56, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={value >= 100 ? '#10b981' : value >= 60 ? '#f59e0b' : '#6366f1'}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

export default function GoalsDashboard() {
  const goals = useStore(selectGoals);
  const addGoal = useStore(selectAddGoal);
  const deleteGoal = useStore(selectDeleteGoal);
  const updateGoal = useStore(selectUpdateGoal);

  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'personal', status: 'active',
    target_value: '', current_value: '', unit: '', deadline: '',
  });
  const [editForm, setEditForm] = useState({});
  const [progressInput, setProgressInput] = useState({});

  const filtered = useMemo(() => {
    if (filter === 'all') return goals;
    return goals.filter(g => g.status === filter);
  }, [goals, filter]);

  const stats = useMemo(() => ({
    total: goals.length,
    active: goals.filter(g => g.status === 'active').length,
    completed: goals.filter(g => g.status === 'completed').length,
    avgProgress: goals.length
      ? Math.round(goals.reduce((s, g) => s + (getProgress(g)), 0) / goals.length)
      : 0,
  }), [goals]);

  function getProgress(g) {
    if (!g.target_value || Number(g.target_value) === 0) return g.status === 'completed' ? 100 : 0;
    return Math.min(100, Math.round((Number(g.current_value || 0) / Number(g.target_value)) * 100));
  }

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    await addGoal({
      ...form,
      target_value: form.target_value ? Number(form.target_value) : null,
      current_value: form.current_value ? Number(form.current_value) : 0,
      created_at: new Date().toISOString(),
    });
    setForm({ title: '', description: '', category: 'personal', status: 'active', target_value: '', current_value: '', unit: '', deadline: '' });
    setShowAdd(false);
  };

  const startEdit = (g) => {
    setEditId(g.id);
    setEditForm({ ...g });
  };

  const saveEdit = () => {
    updateGoal(editId, editForm);
    setEditId(null);
  };

  const updateProgress = (goalId, val) => {
    const g = goals.find(g => g.id === goalId);
    const newVal = Number(val);
    const updates = { current_value: newVal };
    if (g?.target_value && newVal >= Number(g.target_value)) updates.status = 'completed';
    updateGoal(goalId, updates);
    setProgressInput(p => ({ ...p, [goalId]: '' }));
  };

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    return diff;
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Goals</h2>
          <p className="text-sm text-gray-400 mt-0.5">{stats.active} active · {stats.completed} completed</p>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition"
        >
          <Plus size={14} /> New Goal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', val: stats.total, color: 'text-white' },
          { label: 'Active', val: stats.active, color: 'text-emerald-400' },
          { label: 'Done', val: stats.completed, color: 'text-blue-400' },
          { label: 'Avg %', val: stats.avgProgress + '%', color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white">New Goal</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Goal title *" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500" />
            <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500" />
            <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Target value (e.g. 75)" type="number" value={form.target_value} onChange={e => setForm(f => ({...f, target_value: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500" />
            <input placeholder="Unit (e.g. kg, pages, hrs)" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500" />
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({...f, deadline: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition">Add Goal</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUS_OPTIONS].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full border transition capitalize ${
              filter === f ? 'bg-amber-500 border-amber-500 text-black font-semibold' : 'border-white/10 text-gray-400 hover:border-white/30'
            }`}
          >{f}</button>
        ))}
      </div>

      {/* Goal cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-12">No goals here. Add one above!</p>
        )}
        {filtered.map(g => {
          const prog = getProgress(g);
          const dl = daysLeft(g.deadline);
          const isEditing = editId === g.id;
          const isExpanded = expandedId === g.id;

          return (
            <div key={g.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                {/* Progress ring */}
                <div className="relative flex-shrink-0">
                  <ProgressRing value={prog} />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{prog}%</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input value={editForm.title} onChange={e => setEditForm(f => ({...f, title: e.target.value}))}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none" />
                      <div className="flex gap-2">
                        <input value={editForm.current_value || ''} placeholder="Current" type="number"
                          onChange={e => setEditForm(f => ({...f, current_value: e.target.value}))}
                          className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none" />
                        <input value={editForm.target_value || ''} placeholder="Target" type="number"
                          onChange={e => setEditForm(f => ({...f, target_value: e.target.value}))}
                          className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none" />
                        <select value={editForm.status || 'active'} onChange={e => setEditForm(f => ({...f, status: e.target.value}))}
                          className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none">
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="date" value={editForm.deadline || ''} onChange={e => setEditForm(f => ({...f, deadline: e.target.value}))}
                          className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs rounded-lg"><Check size={12}/> Save</button>
                        <button onClick={() => setEditId(null)} className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg"><X size={12}/> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white font-semibold text-sm leading-tight">{g.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${STATUS_COLORS[g.status] || 'text-gray-400'}`}>
                          {g.status}
                        </span>
                      </div>
                      {g.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{g.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span className="text-amber-400/80 capitalize">{g.category}</span>
                        {g.target_value && (
                          <span className="flex items-center gap-1">
                            <Target size={10} /> {g.current_value || 0}/{g.target_value} {g.unit}
                          </span>
                        )}
                        {dl !== null && (
                          <span className={`flex items-center gap-1 ${dl < 0 ? 'text-red-400' : dl <= 7 ? 'text-yellow-400' : ''}`}>
                            <Calendar size={10} /> {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${prog}%`,
                            background: prog >= 100 ? '#10b981' : prog >= 60 ? 'linear-gradient(to right,#f59e0b,#fbbf24)' : 'linear-gradient(to right,#6366f1,#8b5cf6)',
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => startEdit(g)} className="text-gray-500 hover:text-white transition"><Edit3 size={14}/></button>
                    <button onClick={() => setExpandedId(isExpanded ? null : g.id)} className="text-gray-500 hover:text-white transition">
                      {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                    <button onClick={() => deleteGoal(g.id)} className="text-red-500 hover:text-red-400 transition"><Trash2 size={14}/></button>
                  </div>
                )}
              </div>

              {/* Expanded: quick progress updater */}
              {isExpanded && !isEditing && (
                <div className="px-4 pb-4 border-t border-white/10 pt-3">
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><TrendingUp size={12}/> Update Progress</p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder={`New value (current: ${g.current_value || 0} ${g.unit || ''})`}
                      value={progressInput[g.id] || ''}
                      onChange={e => setProgressInput(p => ({...p, [g.id]: e.target.value}))}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => updateProgress(g.id, progressInput[g.id])}
                      disabled={!progressInput[g.id]}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-semibold rounded-lg transition"
                    >Set</button>
                    {g.status !== 'completed' && (
                      <button
                        onClick={() => updateGoal(g.id, { status: 'completed', current_value: g.target_value })}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
                      ><Check size={12}/> Done</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
