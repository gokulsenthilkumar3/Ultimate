import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import useStore, {
  selectGoals, selectAddGoal, selectDeleteGoal, selectUpdateGoal,
} from '../store/useStore';
import {
  Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp,
  Target, Calendar, BarChart2, Sparkles,
} from 'lucide-react';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis } from 'recharts';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';

// ── Confetti helper (canvas-confetti) ────────────────────────────────────
async function fireConfetti() {
  try {
    const confetti = (await import('canvas-confetti')).default;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#10b981', '#f59e0b', '#0ea5e9', '#a78bfa', '#f43f5e'] });
    setTimeout(() => confetti({ particleCount: 60, spread: 50, origin: { y: 0.4 }, angle: 60 }), 250);
    setTimeout(() => confetti({ particleCount: 60, spread: 50, origin: { y: 0.4 }, angle: 120 }), 400);
  } catch { /* canvas-confetti not available */ }
}

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
  active:    { text: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)'  },
  completed: { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)'  },
  paused:    { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)'  },
  cancelled: { text: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
};

function ProgressRing({ value = 0, size = 54, stroke = 4, color = '#6366f1' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const ringColor = value >= 100 ? '#10b981' : value >= 60 ? '#f59e0b' : color;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
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

function generateMilestones(goal) {
  if (!goal.target_value) return [];
  const start = goal.created_at ? new Date(goal.created_at) : new Date(Date.now() - 30 * 86400000);
  const end = goal.deadline ? new Date(goal.deadline) : new Date(start.getTime() + 90 * 86400000);
  const totalDays = Math.max(1, (end - start) / 86400000);
  return [25, 50, 75, 100].map(pct => {
    const targetDate = new Date(start.getTime() + totalDays * (pct/100) * 86400000);
    const targetVal  = Number(goal.target_value) * (pct/100);
    const achieved   = Number(goal.current_value || 0) >= targetVal;
    return { pct, targetDate, targetVal: targetVal.toLocaleString(undefined, { maximumFractionDigits: 1 }), achieved };
  });
}

// ── Milestone Sub-tasks ───────────────────────────────────────────────────
function MilestoneSubtasks({ goal, updateGoal, cat }) {
  const subtasks = goal.subtasks || [];
  const [newTask, setNewTask] = useState('');

  const addSubtask = () => {
    if (!newTask.trim()) return;
    const updated = [...subtasks, { id: Date.now(), text: newTask.trim(), done: false }];
    updateGoal(goal.id, { subtasks: updated });
    setNewTask('');
  };

  const toggleSubtask = (id) => {
    const updated = subtasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    updateGoal(goal.id, { subtasks: updated });
  };

  const deleteSubtask = (id) => {
    updateGoal(goal.id, { subtasks: subtasks.filter(t => t.id !== id) });
  };

  const doneCount = subtasks.filter(t => t.done).length;

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
        <Sparkles size={11} color={cat.color} />
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Sub-tasks {subtasks.length > 0 ? `(${doneCount}/${subtasks.length})` : ''}
        </span>
      </div>

      {/* Sub-task list */}
      {subtasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
          {subtasks.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => toggleSubtask(t.id)} style={{
                width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, cursor: 'pointer',
                border: `2px solid ${t.done ? cat.color : 'rgba(255,255,255,0.2)'}`,
                background: t.done ? cat.color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {t.done && <Check size={9} color="#fff" />}
              </button>
              <span style={{
                flex: 1, fontSize: '0.78rem', color: t.done ? 'var(--text-3)' : 'var(--text-1)',
                textDecoration: t.done ? 'line-through' : 'none',
              }}>{t.text}</span>
              <button onClick={() => deleteSubtask(t.id)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.5)', cursor: 'pointer', padding: '1px' }}>
                <X size={11} />
              </button>
            </div>
          ))}
          {/* Progress bar for subtasks */}
          {subtasks.length > 0 && (
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden', marginTop: '4px' }}>
              <div style={{ height: '100%', width: `${subtasks.length ? (doneCount / subtasks.length) * 100 : 0}%`, background: cat.color, transition: 'width 0.4s ease' }} />
            </div>
          )}
        </div>
      )}

      {/* Add sub-task input */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSubtask()}
          placeholder="Add sub-task…"
          style={{
            flex: 1, padding: '5px 10px', fontSize: '0.75rem',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px', color: 'var(--text-1)', outline: 'none',
          }}
        />
        <button onClick={addSubtask} style={{
          padding: '5px 10px', background: cat.color, border: 'none',
          borderRadius: '6px', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center',
        }}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function GoalsDashboard() {
  const toast = useToast();
  const goals      = useStore(selectGoals);
  const addGoal    = useStore(selectAddGoal);
  const deleteGoal = useStore(selectDeleteGoal);
  const updateGoal = useStore(selectUpdateGoal);

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
  const [logForm,    setLogForm]    = useState({});
  const [logHistory, setLogHistory] = useState({});
  const [loadingLog, setLoadingLog] = useState({});

  const fetchProgressLogs = useCallback(async (goalId) => {
    if (logHistory[goalId]) return;
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

  useEffect(() => { if (expandedId) fetchProgressLogs(expandedId); }, [expandedId]);

  const handleLogProgress = useCallback(async (goal) => {
    const lf = logForm[goal.id] || {};
    const val = parseFloat(lf.value);
    if (!lf.value || isNaN(val)) { toast.error('Enter a valid value to log.'); return; }
    try {
      const payload = {
        goal_id: goal.id, value: val,
        note: lf.note || '',
        date: lf.date || new Date().toISOString().slice(0, 10),
      };
      const res = await fetch('/api/goal_progress_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const updates = { current_value: val };
      const wasCompleted = goal.status === 'completed';
      if (goal.target_value && val >= Number(goal.target_value)) {
        updates.status = 'completed';
        if (!wasCompleted) {
          toast.success(`🎉 Goal "${goal.title}" completed!`);
          fireConfetti();
        }
      }
      await updateGoal(goal.id, updates);
      setLogHistory(h => ({
        ...h,
        [goal.id]: [...(h[goal.id] || []), payload].sort((a, b) => a.date.localeCompare(b.date)),
      }));
      setLogForm(f => ({ ...f, [goal.id]: {} }));
      if (!updates.status) toast.success(`Progress logged: ${val} ${goal.unit || ''}`);
    } catch { toast.error('Failed to log progress.'); }
  }, [logForm, updateGoal, toast]);

  const handleMarkDone = useCallback(async (goal) => {
    await updateGoal(goal.id, { status: 'completed', current_value: goal.target_value });
    toast.success(`🎉 "${goal.title}" marked complete!`);
    fireConfetti();
  }, [updateGoal, toast]);

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
    total:     goals.length,
    active:    goals.filter(g => g.status === 'active').length,
    completed: goals.filter(g => g.status === 'completed').length,
    avgProgress: goals.length ? Math.round(goals.reduce((s, g) => s + getProgress(g), 0) / goals.length) : 0,
  }), [goals]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    if (form.deadline) {
      const today = new Date().toISOString().split('T')[0];
      if (form.deadline < today) { toast.error('Deadline cannot be in the past.'); return; }
    }
    await addGoal({
      ...form,
      target_value:  form.target_value  ? Number(form.target_value)  : null,
      current_value: form.current_value ? Number(form.current_value) : 0,
      created_at: new Date().toISOString(),
      subtasks: [],
    });
    setForm({ title: '', description: '', category: 'personal', status: 'active', target_value: '', current_value: '', unit: '', deadline: '' });
    setShowAdd(false);
    toast.success('Goal added!');
  };

  const startEdit = (g) => { setEditId(g.id); setEditForm({ ...g }); };
  const saveEdit  = () => {
    if (editForm.deadline) {
      const today = new Date().toISOString().split('T')[0];
      if (editForm.deadline < today) { toast.error('Deadline cannot be in the past.'); return; }
    }
    updateGoal(editId, editForm);
    setEditId(null);
    toast.success('Goal updated.');
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.3rem' }}>Goal Tracking</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Goals</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{stats.active} active · {stats.completed} completed</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="btn-primary">
          <Plus size={14} /> New Goal
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total',     val: stats.total,              color: 'var(--text-1)' },
          { label: 'Active',    val: stats.active,             color: '#34d399' },
          { label: 'Done',      val: stats.completed,          color: '#60a5fa' },
          { label: 'Avg %',     val: `${stats.avgProgress}%`,  color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</p>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass-card mb-lg">
          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>New Goal</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            {[
              { placeholder: 'Goal title *', key: 'title' },
              { placeholder: 'Description', key: 'description' },
              { placeholder: 'Target value (e.g. 75)', key: 'target_value', type: 'number' },
              { placeholder: 'Unit (e.g. kg, pages, hrs)', key: 'unit' },
            ].map(f => (
              <input key={f.key} type={f.type || 'text'} placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm(ff => ({ ...ff, [f.key]: e.target.value }))}
                className="form-input" />
            ))}
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input">
              {CATEGORY_CONFIG.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="form-input">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div>
              <label style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '4px' }}>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="form-input" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
            <button onClick={handleAdd} className="btn-primary">Add Goal</button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: '50px' }}>Status</span>
          {['all', ...STATUS_OPTIONS].map(f => {
            const sc = STATUS_COLORS[f];
            const active = statusFilter === f;
            return (
              <button key={f} onClick={() => setStatusFilter(f)} style={{
                padding: '3px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                background: active ? (sc ? sc.bg : 'var(--accent)') : 'rgba(255,255,255,0.05)',
                color: active ? (sc ? sc.text : '#000') : 'var(--text-3)',
                border: active ? `1px solid ${sc ? sc.border : 'var(--accent)'}` : '1px solid rgba(255,255,255,0.1)',
                textTransform: 'capitalize',
              }}>{f}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: '50px' }}>Category</span>
          <button onClick={() => setCatFilter('all')} style={{
            padding: '3px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700,
            background: catFilter === 'all' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            color: catFilter === 'all' ? '#000' : 'var(--text-3)',
            border: catFilter === 'all' ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
          }}>All</button>
          {CATEGORY_CONFIG.map(c => {
            const count = goals.filter(g => g.category === c.key).length;
            if (count === 0) return null;
            return (
              <button key={c.key} onClick={() => setCatFilter(c.key)} style={{
                padding: '3px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700,
                background: catFilter === c.key ? c.color : 'rgba(255,255,255,0.05)',
                color: catFilter === c.key ? '#fff' : 'var(--text-3)',
                border: catFilter === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              }}>{c.emoji} {c.label} ({count})</button>
            );
          })}
        </div>
      </div>

      {/* Goal cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length === 0 && (
          <div style={{ marginTop: '1rem' }}>
            <EmptyState icon={Target} title="No Goals"
              description={goals.length === 0 ? "You have no goals set. Start tracking your progress today!" : "No goals match your current filter."}
              ctaLabel={goals.length === 0 ? "Create Goal" : null}
              onAction={goals.length === 0 ? () => setShowAdd(true) : null} />
          </div>
        )}

        {filtered.map(g => {
          const prog       = getProgress(g);
          const dl         = daysLeft(g.deadline);
          const isEditing  = editId === g.id;
          const isExpanded = expandedId === g.id;
          const cat        = CAT_MAP[g.category] || CAT_MAP.other;
          const lf         = logForm[g.id] || {};
          const history    = logHistory[g.id] || [];
          const chartData  = history.map(l => ({ date: l.date?.slice(5), v: Number(l.value) }));
          const sc         = STATUS_COLORS[g.status] || STATUS_COLORS.active;
          const dlColor    = dl === null ? '' : dl < 0 ? '#f87171' : dl <= 7 ? '#fbbf24' : '#6b7280';
          const dlLabel    = dl === null ? null : dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`;
          const isCompleted = g.status === 'completed';

          return (
            <div key={g.id} className="glass-card" style={{
              overflow: 'hidden',
              borderLeft: `3px solid ${isCompleted ? '#10b981' : cat.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0' }}>
                {/* Progress ring */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <ProgressRing value={prog} color={cat.color} />
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-1)' }}>{prog}%</span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        className="form-input" style={{ fontSize: '0.88rem' }} />
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input value={editForm.current_value || ''} placeholder="Current" type="number"
                          onChange={e => setEditForm(f => ({ ...f, current_value: e.target.value }))}
                          className="form-input" style={{ width: '90px', fontSize: '0.82rem' }} />
                        <input value={editForm.target_value || ''} placeholder="Target" type="number"
                          onChange={e => setEditForm(f => ({ ...f, target_value: e.target.value }))}
                          className="form-input" style={{ width: '90px', fontSize: '0.82rem' }} />
                        <select value={editForm.status || 'active'} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                          className="form-input" style={{ fontSize: '0.82rem' }}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="date" value={editForm.deadline || ''} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                          className="form-input" style={{ fontSize: '0.82rem' }} />
                        <select value={editForm.category || 'other'} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                          className="form-input" style={{ fontSize: '0.82rem' }}>
                          {CATEGORY_CONFIG.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={saveEdit} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                          <Check size={12} /> Save
                        </button>
                        <button onClick={() => setEditId(null)} style={{ padding: '4px 12px', fontSize: '0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-2)' }}>
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '1rem' }}>{cat.emoji}</span>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: isCompleted ? '#10b981' : 'var(--text-1)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {g.title}
                          {isCompleted && ' ✓'}
                        </p>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                                       background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, flexShrink: 0, textTransform: 'capitalize' }}>
                          {g.status}
                        </span>
                      </div>

                      {g.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.description}</p>}

                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '6px' }}>
                        <span style={{ color: cat.color, fontWeight: 700 }}>{cat.label}</span>
                        {g.target_value && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Target size={10} /> {g.current_value || 0}/{g.target_value} {g.unit}
                          </span>
                        )}
                        {dlLabel && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: dlColor, fontWeight: dl !== null && dl <= 7 ? 700 : 400,
                                         background: dl !== null && dl < 0 ? 'rgba(248,113,113,0.12)' : 'transparent',
                                         padding: dl !== null && dl < 0 ? '1px 6px' : '0', borderRadius: '10px' }}>
                            <Calendar size={10} /> {dlLabel}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '99px', transition: 'width 0.5s ease',
                          width: `${prog}%`,
                          background: isCompleted ? '#10b981' : prog >= 60 ? `linear-gradient(90deg,${cat.color},#fbbf24)` : cat.color,
                        }} />
                      </div>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                {!isEditing && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => startEdit(g)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '3px' }}><Edit3 size={13} /></button>
                    <button onClick={() => setExpandedId(isExpanded ? null : g.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '3px' }}>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button onClick={() => handleDelete(g.id)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.6)', cursor: 'pointer', padding: '3px' }}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>

              {/* Expanded panel */}
              {isExpanded && !isEditing && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem', marginTop: '0.75rem' }}>

                  {/* Log Progress */}
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <BarChart2 size={11} color="var(--accent)" /> Log Progress
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.58rem', color: 'var(--text-3)', marginBottom: '3px' }}>Value {g.unit ? `(${g.unit})` : ''}</label>
                      <input type="number" placeholder={`e.g. ${g.current_value || 0}`}
                        value={lf.value || ''} onChange={e => setLogForm(f => ({ ...f, [g.id]: { ...lf, value: e.target.value } }))}
                        style={{ width: '100px' }} className="form-input" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.58rem', color: 'var(--text-3)', marginBottom: '3px' }}>Date</label>
                      <input type="date" value={lf.date || new Date().toISOString().slice(0, 10)}
                        onChange={e => setLogForm(f => ({ ...f, [g.id]: { ...lf, date: e.target.value } }))}
                        className="form-input" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.58rem', color: 'var(--text-3)', marginBottom: '3px' }}>Note</label>
                      <input type="text" placeholder="Optional note" value={lf.note || ''}
                        onChange={e => setLogForm(f => ({ ...f, [g.id]: { ...lf, note: e.target.value } }))}
                        className="form-input" style={{ width: '100%' }} />
                    </div>
                    <button onClick={() => handleLogProgress(g)} className="btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.75rem' }}>
                      <Plus size={12} /> Log
                    </button>
                    {g.status !== 'completed' && (
                      <button onClick={() => handleMarkDone(g)}
                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.75rem', background: '#10b981', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <Check size={12} /> Mark Done 🎉
                      </button>
                    )}
                  </div>

                  {/* Progress chart */}
                  {loadingLog[g.id] ? (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Loading history…</p>
                  ) : chartData.length >= 2 ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '4px' }}>Progress history</p>
                      <ResponsiveContainer width="100%" height={60}>
                        <LineChart data={chartData}>
                          <XAxis dataKey="date" tick={{ fontSize: '0.52rem', fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Line type="monotone" dataKey="v" stroke={cat.color} strokeWidth={2} dot={{ r: 3, fill: cat.color }} />
                          <Tooltip formatter={v => [`${v} ${g.unit || ''}`, 'Value']}
                            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.68rem' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : history.length === 1 ? (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>1 log entry — log more to see chart.</p>
                  ) : null}

                  {/* Milestone sub-tasks */}
                  <MilestoneSubtasks goal={g} updateGoal={updateGoal} cat={cat} />

                  {/* Milestone timeline */}
                  {g.target_value && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Milestone Timeline</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 4px' }}>
                        <div style={{ position: 'absolute', top: '6px', left: '4px', right: '4px', height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px' }} />
                        <div style={{ position: 'absolute', top: '6px', left: '4px', height: '2px', borderRadius: '99px', transition: 'width 0.5s ease', background: cat.color,
                                      width: `calc(${Math.min(100, prog)}% - 8px)` }} />
                        {generateMilestones(g).map(m => (
                          <div key={m.pct} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{
                              width: '14px', height: '14px', borderRadius: '50%', zIndex: 1,
                              background: m.achieved ? cat.color : 'var(--bg-elevated)',
                              border: `2px solid ${m.achieved ? cat.color : 'rgba(255,255,255,0.2)'}`,
                              boxShadow: m.achieved ? `0 0 10px ${cat.color}66` : 'none',
                            }} />
                            <span style={{ fontSize: '0.55rem', color: m.achieved ? cat.color : 'var(--text-3)', fontWeight: 700 }}>{m.pct}%</span>
                            <span style={{ fontSize: '0.52rem', color: 'var(--text-3)' }}>{m.targetVal} {g.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
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
