import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useStore, {
  selectGoals, selectAddGoal, selectDeleteGoal, selectUpdateGoal,
} from '../store/useStore';
import {
  Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp,
  TrendingUp, Target, Calendar, Flag, BookOpen, Dumbbell,
  Briefcase, HeartPulse, User, Star, BarChart2
} from 'lucide-react';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis } from 'recharts';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';

const STATUS_OPTIONS = ['active', 'completed', 'paused', 'cancelled'];

const CATEGORY_CONFIG = [
  { key: 'fitness',  label: 'Fitness',  emoji: '💪', color: '#3b82f6' },
  { key: 'health',   label: 'Health',   emoji: '❤️',  color: '#10b981' },
  { key: 'career',   label: 'Career',   emoji: '💼', color: '#f59e0b' },
  { key: 'finance',  label: 'Finance',  emoji: '💰', color: '#8b5cf6' },
  { key: 'learning', label: 'Learning', emoji: '📚', color: '#0ea5e9' },
  { key: 'personal', label: 'Personal', emoji: '🧘', color: '#ec4899' },
  { key: 'other',    label: 'Other',    emoji: '✨', color: '#6b7280' },
];
const CAT_MAP = Object.fromEntries(CATEGORY_CONFIG.map(c => [c.key, c]));

const STATUS_COLORS = {
  active:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  completed: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  paused:    'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
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

function getProgress(g) {
  if (!g.target_value || Number(g.target_value) === 0) return g.status === 'completed' ? 100 : 0;
  return Math.min(100, Math.round((Number(g.current_value || 0) / Number(g.target_value)) * 100));
}

function daysLeft(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86400000);
}

export default function GoalsDashboard() {
  const toast = useToast();
  const goals      = useStore(selectGoals);
  const addGoal    = useStore(selectAddGoal);
  const deleteGoal = useStore(selectDeleteGoal);
  const updateGoal = useStore(selectUpdateGoal);

  // ── Filter state: status + category
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter,    setCatFilter]    = useState('all');

  const [showAdd,    setShowAdd]    = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [form, setForm] = useState({
    title: '', description: '', category: 'personal', status: 'active',
    target_value: '', current_value: '', unit: '', deadline: '',
  });
  const [editForm, setEditForm] = useState({});

  // ── Log Progress state: { [goalId]: { value, note, date } }
  const [logForm,    setLogForm]    = useState({});
  const [logHistory, setLogHistory] = useState({}); // { [goalId]: [{value, note, date}] }
  const [loadingLog, setLoadingLog] = useState({});

  // ── Fetch progress logs for a goal when expanded
  const fetchProgressLogs = useCallback(async (goalId) => {
    if (logHistory[goalId]) return; // already loaded
    setLoadingLog(l => ({ ...l, [goalId]: true }));
    try {
      const res = await fetch(`/api/goal_progress_logs?goal_id=${goalId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogHistory(h => ({ ...h, [goalId]: Array.isArray(data) ? data : [] }));
    } catch {
      setLogHistory(h => ({ ...h, [goalId]: [] }));
    } finally {
      setLoadingLog(l => ({ ...l, [goalId]: false }));
    }
  }, [logHistory]);

  // Fetch logs when a goal is expanded
  useEffect(() => {
    if (expandedId) fetchProgressLogs(expandedId);
  }, [expandedId]);

  const handleLogProgress = useCallback(async (goal) => {
    const lf = logForm[goal.id] || {};
    const val = parseFloat(lf.value);
    if (!lf.value || isNaN(val)) { toast.error('Enter a valid value to log.'); return; }
    try {
      const payload = {
        goal_id: goal.id,
        value:   val,
        note:    lf.note || '',
        date:    lf.date || new Date().toISOString().slice(0, 10),
      };
      const res = await fetch('/api/goal_progress_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      // Also update current_value on goal
      const updates = { current_value: val };
      if (goal.target_value && val >= Number(goal.target_value)) updates.status = 'completed';
      await updateGoal(goal.id, updates);
      // Refresh log history
      setLogHistory(h => ({
        ...h,
        [goal.id]: [...(h[goal.id] || []), payload].sort((a, b) => a.date.localeCompare(b.date)),
      }));
      setLogForm(f => ({ ...f, [goal.id]: {} }));
      toast.success(`Progress logged: ${val} ${goal.unit || ''}`);
    } catch {
      toast.error('Failed to log progress.');
    }
  }, [logForm, updateGoal, toast]);

  const filtered = useMemo(() => {
    let list = goals;
    if (statusFilter !== 'all') list = list.filter(g => g.status === statusFilter);
    if (catFilter    !== 'all') list = list.filter(g => g.category === catFilter);
    return list;
  }, [goals, statusFilter, catFilter]);

  const handleDelete = useCallback((id) => {
    const goalToRestore = goals.find(g => g.id === id);
    deleteGoal(id);
    toast.info('Goal deleted', 5000, {
      action: { label: 'Undo', onClick: () => { if (goalToRestore) addGoal(goalToRestore); } }
    });
  }, [goals, deleteGoal, addGoal, toast]);

  const stats = useMemo(() => ({
    total:       goals.length,
    active:      goals.filter(g => g.status === 'active').length,
    completed:   goals.filter(g => g.status === 'completed').length,
    avgProgress: goals.length
      ? Math.round(goals.reduce((s, g) => s + getProgress(g), 0) / goals.length)
      : 0,
  }), [goals]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    await addGoal({
      ...form,
      target_value:  form.target_value  ? Number(form.target_value)  : null,
      current_value: form.current_value ? Number(form.current_value) : 0,
      created_at: new Date().toISOString(),
    });
    setForm({ title: '', description: '', category: 'personal', status: 'active', target_value: '', current_value: '', unit: '', deadline: '' });
    setShowAdd(false);
    toast.success('Goal added!');
  };

  const startEdit = (g) => { setEditId(g.id); setEditForm({ ...g }); };
  const saveEdit  = () => { updateGoal(editId, editForm); setEditId(null); toast.success('Goal updated.'); };

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
          { label: 'Total',  val: stats.total,              color: 'text-white' },
          { label: 'Active', val: stats.active,             color: 'text-emerald-400' },
          { label: 'Done',   val: stats.completed,          color: 'text-blue-400' },
          { label: 'Avg %',  val: stats.avgProgress + '%',  color: 'text-amber-400' },
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
            {/* Category dropdown with emoji */}
            <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              {CATEGORY_CONFIG.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Target value (e.g. 75)" type="number" value={form.target_value} onChange={e => setForm(f => ({...f, target_value: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500" />
            <input placeholder="Unit (e.g. kg, pages, hrs)" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500" />
            {/* DATE deadline picker */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({...f, deadline: e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition">Add Goal</button>
          </div>
        </div>
      )}

      {/* Filter bar ─ Status + Category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: '54px' }}>Status</span>
          {['all', ...STATUS_OPTIONS].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 text-xs rounded-full border transition capitalize ${
                statusFilter === f ? 'bg-amber-500 border-amber-500 text-black font-semibold' : 'border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >{f}</button>
          ))}
        </div>
        {/* Category filter */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: '54px' }}>Category</span>
          <button
            onClick={() => setCatFilter('all')}
            style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
              background: catFilter === 'all' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: catFilter === 'all' ? '#000' : 'var(--text-3)',
              border: catFilter === 'all' ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
            }}
          >All</button>
          {CATEGORY_CONFIG.map(c => {
            const count = goals.filter(g => g.category === c.key).length;
            if (count === 0) return null;
            return (
              <button key={c.key} onClick={() => setCatFilter(c.key)}
                style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                  background: catFilter === c.key ? c.color : 'rgba(255,255,255,0.05)',
                  color: catFilter === c.key ? '#fff' : 'var(--text-3)',
                  border: catFilter === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                }}
              >{c.emoji} {c.label} ({count})</button>
            );
          })}
        </div>
      </div>

      {/* Goal cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div style={{ marginTop: '1rem' }}>
            <EmptyState 
              icon={Target} 
              title="No Goals" 
              description={goals.length === 0 ? "You have no goals set. Start tracking your progress today!" : "No goals match your current filter."}
              ctaLabel={goals.length === 0 ? "Create Goal" : null}
              onAction={goals.length === 0 ? () => { setForm(EMPTY_GOAL); setShowForm(true); setEditId(null); } : null}
            />
          </div>
        )}
        {filtered.map(g => {
          const prog     = getProgress(g);
          const dl       = daysLeft(g.deadline);
          const isEditing  = editId === g.id;
          const isExpanded = expandedId === g.id;
          const cat        = CAT_MAP[g.category] || CAT_MAP.other;
          const lf         = logForm[g.id] || {};
          const history    = logHistory[g.id] || [];
          const chartData  = history.map(l => ({ date: l.date?.slice(5), v: Number(l.value) }));

          // Days left badge styles
          const dlColor = dl === null ? '' : dl < 0 ? '#f87171' : dl <= 7 ? '#fbbf24' : '#6b7280';
          const dlLabel = dl === null ? null : dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`;

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
                      <div className="flex gap-2 flex-wrap">
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
                        {/* Edit deadline */}
                        <input type="date" value={editForm.deadline || ''} onChange={e => setEditForm(f => ({...f, deadline: e.target.value}))}
                          className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none" />
                        {/* Edit category */}
                        <select value={editForm.category || 'other'} onChange={e => setEditForm(f => ({...f, category: e.target.value}))}
                          className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none">
                          {CATEGORY_CONFIG.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs rounded-lg"><Check size={12}/> Save</button>
                        <button onClick={() => setEditId(null)} className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg"><X size={12}/> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1rem' }}>{cat.emoji}</span>
                          <p className="text-white font-semibold text-sm leading-tight">{g.title}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${STATUS_COLORS[g.status] || 'text-gray-400'}`}>
                          {g.status}
                        </span>
                      </div>
                      {g.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{g.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap" style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                        <span style={{ color: cat.color, fontWeight: 700 }}>{cat.label}</span>
                        {g.target_value && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Target size={10} /> {g.current_value || 0}/{g.target_value} {g.unit}
                          </span>
                        )}
                        {/* Deadline badge */}
                        {dlLabel && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: dlColor, fontWeight: dl !== null && dl <= 7 ? 700 : 400,
                            background: dl !== null && dl < 0 ? 'rgba(248,113,113,0.12)' : 'transparent',
                            padding: dl !== null && dl < 0 ? '1px 6px' : '0',
                            borderRadius: '10px',
                          }}>
                            <Calendar size={10} /> {dlLabel}
                          </span>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full transition-all" style={{
                          width: `${prog}%`,
                          background: prog >= 100 ? '#10b981' : prog >= 60 ? 'linear-gradient(to right,#f59e0b,#fbbf24)' : 'linear-gradient(to right,#6366f1,#8b5cf6)',
                        }} />
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
                    <button onClick={() => handleDelete(g.id)} className="text-red-500 hover:text-red-400 transition"><Trash2 size={14}/></button>
                  </div>
                )}
              </div>

              {/* Expanded panel ─ Log Progress + history chart */}
              {isExpanded && !isEditing && (
                <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">

                  {/* Log Progress form */}
                  <p className="text-xs text-gray-400 flex items-center gap-1 font-semibold">
                    <BarChart2 size={12} color="var(--accent)" /> Log Progress
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                      <label className="block" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '3px' }}>Value {g.unit ? `(${g.unit})` : ''}</label>
                      <input
                        type="number"
                        placeholder={`e.g. ${g.current_value || 0}`}
                        value={lf.value || ''}
                        onChange={e => setLogForm(f => ({ ...f, [g.id]: { ...lf, value: e.target.value } }))}
                        style={{ width: '100px' }}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '3px' }}>Date</label>
                      <input
                        type="date"
                        value={lf.date || new Date().toISOString().slice(0, 10)}
                        onChange={e => setLogForm(f => ({ ...f, [g.id]: { ...lf, date: e.target.value } }))}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="block" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '3px' }}>Note (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Post-workout, fasted"
                        value={lf.note || ''}
                        onChange={e => setLogForm(f => ({ ...f, [g.id]: { ...lf, note: e.target.value } }))}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      onClick={() => handleLogProgress(g)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition flex items-center gap-1"
                    >
                      <Plus size={12} /> Log
                    </button>
                    {g.status !== 'completed' && (
                      <button
                        onClick={() => updateGoal(g.id, { status: 'completed', current_value: g.target_value })}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
                      ><Check size={12}/> Mark Done</button>
                    )}
                  </div>

                  {/* Progress history mini-chart */}
                  {loadingLog[g.id] ? (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Loading history…</p>
                  ) : chartData.length >= 2 ? (
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '4px' }}>Progress history</p>
                      <ResponsiveContainer width="100%" height={60}>
                        <LineChart data={chartData}>
                          <XAxis dataKey="date" tick={{ fontSize: '0.55rem', fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Line type="monotone" dataKey="v" stroke={cat.color} strokeWidth={2} dot={{ r: 3, fill: cat.color }} />
                          <Tooltip
                            formatter={v => [`${v} ${g.unit || ''}`, 'Value']}
                            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.7rem' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : history.length === 1 ? (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>1 log entry — log more to see chart.</p>
                  ) : (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>No progress logs yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
