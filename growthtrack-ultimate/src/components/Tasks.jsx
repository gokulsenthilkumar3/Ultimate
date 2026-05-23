import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useStore, {
  selectAddTask, selectCompleteTask, selectDeleteTask, selectUpdateTask, selectReopenTask
} from '../store/useStore';
import {
  Plus, Check, Trash2, RotateCcw, Edit3, X, Clock,
  ChevronDown, ChevronRight, ListTodo, AlertCircle, RefreshCw
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { apiSync } from '../store/useStore';
import EmptyState from './ui/EmptyState';

// ── P1-P4 priority config ─────────────────────────────────────────────────────────────
const PRIORITIES = [
  { value: 'p1', label: 'P1', long: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)' },
  { value: 'p2', label: 'P2', long: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
  { value: 'p3', label: 'P3', long: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  { value: 'p4', label: 'P4', long: 'Low',      color: '#6b7280', bg: 'rgba(107,114,128,0.12)',border: 'rgba(107,114,128,0.25)' },
];
const PMAP = Object.fromEntries(PRIORITIES.map(p => [p.value, p]));

// legacy priority values upgrade
const normPriority = (v) => {
  if (!v) return 'p3';
  if (v === 'high')   return 'p1';
  if (v === 'medium') return 'p3';
  if (v === 'low')    return 'p4';
  return v;
};

const CATEGORIES = ['Work', 'Personal', 'Health', 'Finance', 'Learning', 'Other'];

// ── due-date helpers ────────────────────────────────────────────────────────────────
function dueMeta(dateStr) {
  if (!dateStr) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return { label: `Overdue`,        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' };
  if (dateStr === today) return { label: 'Due today',    color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' };
  const diff = Math.ceil((new Date(dateStr) - new Date(today)) / 86400000);
  if (diff === 1) return    { label: 'Due tomorrow',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' };
  if (diff <= 7) return     { label: `In ${diff} days`,  color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' };
  return                    { label: dateStr,             color: '#4b5563', bg: 'rgba(75,85,99,0.08)',   border: 'rgba(75,85,99,0.15)' };
}

// ── SubTask row ────────────────────────────────────────────────────────────────────
function SubTaskRow({ sub, onToggle, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0' }}>
      <button
        onClick={() => onToggle(sub.id)}
        style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
          border: sub.done ? '2px solid #10b981' : '2px solid rgba(255,255,255,0.25)',
          background: sub.done ? 'rgba(16,185,129,0.2)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title={sub.done ? 'Uncheck' : 'Check'}
      >
        {sub.done && <Check size={9} color="#10b981" />}
      </button>
      <span style={{
        fontSize: '0.78rem', flex: 1,
        color: sub.done ? 'var(--text-3)' : 'var(--text-2)',
        textDecoration: sub.done ? 'line-through' : 'none',
        transition: 'all 0.2s',
      }}>{sub.title}</span>
      <button onClick={() => onDelete(sub.id)}
        style={{ opacity: 0, background: 'none', border: 'none', cursor: 'pointer',
                 color: 'var(--text-3)', padding: '2px', transition: 'opacity 0.2s' }}
        className="sub-del-btn">
        <X size={10} />
      </button>
    </div>
  );
}

// ── TaskCard ───────────────────────────────────────────────────────────────────────
function TaskCard({ task, onComplete, onDelete, onEdit, onSubToggle, onSubDelete, onSubAdd }) {
  const [expanded,    setExpanded]    = useState(false);
  const [subInput,    setSubInput]    = useState('');
  const today    = new Date().toISOString().slice(0, 10);
  const prio     = PMAP[normPriority(task.priority)] || PMAP.p3;
  const dm       = dueMeta(task.dueDate);
  const subs     = task.subtasks || [];
  const doneSubs = subs.filter(s => s.done).length;
  const isOverdue = task.dueDate && task.dueDate < today;

  const cardBorderColor = isOverdue ? 'rgba(239,68,68,0.3)'
    : task.dueDate === today ? 'rgba(249,115,22,0.3)'
    : 'rgba(255,255,255,0.07)';

  return (
    <div style={{
      background: isOverdue ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${cardBorderColor}`,
      borderRadius: '14px', padding: '0.85rem 1rem',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
        {/* circle complete btn */}
        <button
          onClick={() => onComplete(task.id)}
          title="Mark complete"
          className="hover-btn-success"
          style={{
            marginTop: '2px', width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.25)', background: 'transparent',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* title + badges row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.35 }}>{task.title}</span>
            {/* P1-P4 badge */}
            <span style={{
              fontSize: '0.62rem', fontWeight: 900, padding: '1px 7px', borderRadius: 99,
              color: prio.color, background: prio.bg, border: `1px solid ${prio.border}`,
              letterSpacing: '0.04em',
            }}>{prio.label}</span>
            {/* category badge */}
            {task.category && (
              <span style={{
                fontSize: '0.65rem', padding: '1px 7px', borderRadius: 99,
                color: 'var(--text-3)', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>{task.category}</span>
            )}
            {/* due-date urgency pill */}
            {dm && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                fontSize: '0.62rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                color: dm.color, background: dm.bg, border: `1px solid ${dm.border}`,
              }}>
                <Clock size={9} /> {dm.label}
              </span>
            )}
          </div>

          {task.description && (
            <p style={{ fontSize: '0.77rem', color: 'var(--text-3)', marginBottom: '6px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.description}
            </p>
          )}

          {/* sub-tasks toggle */}
          {(subs.length > 0 || true) && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: subs.length ? 'var(--text-2)' : 'var(--text-3)',
                fontSize: '0.72rem', padding: '2px 0', marginTop: '2px',
              }}
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <ListTodo size={11} />
              {subs.length
                ? `Sub-tasks  ${doneSubs}/${subs.length}`
                : 'Add sub-tasks'}
            </button>
          )}

          {/* expanded sub-tasks panel */}
          {expanded && (
            <div style={{
              marginTop: '8px', paddingLeft: '6px',
              borderLeft: '2px solid rgba(255,255,255,0.07)',
            }}>
              {subs.map(sub => (
                <SubTaskRow key={sub.id} sub={sub}
                  onToggle={(sid) => onSubToggle(task.id, sid)}
                  onDelete={(sid) => onSubDelete(task.id, sid)} />
              ))}
              {/* add sub-task inline */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder="+ Add sub-task…"
                  value={subInput}
                  onChange={e => setSubInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && subInput.trim()) {
                      onSubAdd(task.id, subInput.trim());
                      setSubInput('');
                    }
                  }}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '4px 10px',
                    color: 'var(--text-1)', fontSize: '0.75rem', outline: 'none',
                  }}
                />
                <button
                  onClick={() => { if (subInput.trim()) { onSubAdd(task.id, subInput.trim()); setSubInput(''); } }}
                  style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem',
                    background: 'var(--accent)', color: '#000', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                  }}
                >Add</button>
              </div>
            </div>
          )}
        </div>

        {/* action buttons */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} className="task-actions">
          <button onClick={() => onEdit(task)}
            title="Edit"
            className="hover-btn-warning"
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
              width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              color: 'var(--text-3)'
            }}
          ><Edit3 size={12} /></button>
          <button onClick={() => onDelete(task.id, 'pending')}
            title="Delete"
            className="hover-btn-danger"
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
              width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              color: 'var(--text-3)'
            }}
          ><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────────
export default function Tasks() {
  const storeAddTask      = useStore(selectAddTask);
  const storeCompleteTask = useStore(selectCompleteTask);
  const storeDeleteTask   = useStore(selectDeleteTask);
  const storeUpdateTask   = useStore(selectUpdateTask);
  const storeReopenTask   = useStore(selectReopenTask);
  const toast             = useToast();

  // DB-backed task list (overrides store snapshot when loaded)
  const [dbTasks,   setDbTasks]   = useState(null);  // null = not yet loaded
  const [syncing,   setSyncing]   = useState(false);

  // Local state for tasks when not yet fetched from DB
  const storeTasks = useStore(s => s.user?.tasks);

  const fetchTasks = useCallback(async () => {
    setSyncing(true);
    try {
      const rows = await apiSync('/tasks', 'GET');
      if (Array.isArray(rows)) setDbTasks(rows);
    } catch { /* fallback to store */ }
    finally { setSyncing(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Merge DB tasks + store tasks
  const allTasks = useMemo(() => {
    if (dbTasks !== null) return dbTasks;
    const p = storeTasks?.pending   || [];
    const c = storeTasks?.completed || [];
    return [...p, ...c.map(t => ({ ...t, status: 'done' }))];
  }, [dbTasks, storeTasks]);

  const pending   = useMemo(() => allTasks.filter(t => t.status !== 'done'), [allTasks]);
  const completed = useMemo(() => allTasks.filter(t => t.status === 'done'),  [allTasks]);

  const [tab,      setTab]      = useState('pending');
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [sortBy,   setSortBy]   = useState('created');

  useEffect(() => {
    const handleOpen = (e) => {
      if (e.detail === 'tasks') {
        setShowForm(true);
        setEditId(null);
      }
    };
    window.addEventListener('open-add-form', handleOpen);
    return () => window.removeEventListener('open-add-form', handleOpen);
  }, []);

  const EMPTY_FORM = { title: '', description: '', priority: 'p3', category: 'Work', dueDate: '' };
  const [form, setForm] = useState(EMPTY_FORM);

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); };

  // ── CRUD helpers ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editId) {
      // PATCH to API
      try {
        await apiSync(`/tasks/${editId}`, 'PATCH', form);
        setDbTasks(prev => prev ? prev.map(t => t.id === editId ? { ...t, ...form } : t) : null);
        toast.success('Task updated');
      } catch {
        storeUpdateTask(editId, form);
        toast.success('Task updated (local)');
      }
    } else {
      const payload = { ...form, status: 'pending', subtasks: [], created_at: new Date().toISOString() };
      try {
        const created = await apiSync('/tasks', 'POST', payload);
        const newTask = created?.id ? created : { ...payload, id: Date.now() };
        setDbTasks(prev => prev ? [newTask, ...prev] : [newTask]);
        toast.success('Task added');
      } catch {
        await storeAddTask(payload);
        toast.success('Task added (local)');
      }
    }
    resetForm();
  };

  const handleComplete = useCallback(async (id) => {
    try {
      await apiSync(`/tasks/${id}`, 'PATCH', { status: 'done', completed_at: new Date().toISOString() });
      setDbTasks(prev => prev ? prev.map(t => t.id === id
        ? { ...t, status: 'done', completed_at: new Date().toISOString() } : t) : null);
    } catch { storeCompleteTask(id); }
    toast.success('Task completed! ✓');
  }, [storeCompleteTask, toast]);

  const handleDelete = useCallback(async (id, bucket) => {
    const taskToRestore = allTasks.find(t => t.id === id);
    try {
      await apiSync(`/tasks/${id}`, 'DELETE');
      setDbTasks(prev => prev ? prev.filter(t => t.id !== id) : null);
    } catch { storeDeleteTask(id, bucket); }
    
    toast.info('Task deleted', 5000, {
      action: {
        label: 'Undo',
        onClick: async () => {
          if (!taskToRestore) return;
          try {
            const created = await apiSync('/tasks', 'POST', taskToRestore);
            const newTask = created?.id ? created : { ...taskToRestore, id: Date.now() };
            setDbTasks(prev => prev ? [...prev, newTask] : null);
          } catch {
            storeAddTask(taskToRestore);
          }
          toast.success('Task restored');
        }
      }
    });
  }, [storeDeleteTask, toast, allTasks]);

  const handleReopen = useCallback(async (id) => {
    try {
      await apiSync(`/tasks/${id}`, 'PATCH', { status: 'pending', completed_at: null });
      setDbTasks(prev => prev ? prev.map(t => t.id === id ? { ...t, status: 'pending', completed_at: null } : t) : null);
    } catch { storeReopenTask(id); }
    toast.info('Task reopened');
  }, [storeReopenTask, toast]);

  const startEdit = (task) => {
    setForm({
      title:       task.title       || '',
      description: task.description || '',
      priority:    normPriority(task.priority),
      category:    task.category    || 'Work',
      dueDate:     task.dueDate     || task.due_date || '',
    });
    setEditId(task.id);
    setShowForm(true);
    setTab('pending');
  };

  // ── Sub-task helpers ──
  const handleSubAdd = useCallback(async (taskId, title) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    const newSub = { id: Date.now(), title, done: false };
    const updated = { subtasks: [...(task.subtasks || []), newSub] };
    try {
      await apiSync(`/tasks/${taskId}`, 'PATCH', updated);
    } catch { /* local only */ }
    setDbTasks(prev => prev
      ? prev.map(t => t.id === taskId ? { ...t, subtasks: updated.subtasks } : t)
      : null
    );
    toast.success('Sub-task added');
  }, [allTasks, toast]);

  const handleSubToggle = useCallback(async (taskId, subId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = (task.subtasks || []).map(s => s.id === subId ? { ...s, done: !s.done } : s);
    try { await apiSync(`/tasks/${taskId}`, 'PATCH', { subtasks: newSubs }); } catch { /* local */ }
    setDbTasks(prev => prev ? prev.map(t => t.id === taskId ? { ...t, subtasks: newSubs } : t) : null);
  }, [allTasks]);

  const handleSubDelete = useCallback(async (taskId, subId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = (task.subtasks || []).filter(s => s.id !== subId);
    try { await apiSync(`/tasks/${taskId}`, 'PATCH', { subtasks: newSubs }); } catch { /* local */ }
    setDbTasks(prev => prev ? prev.map(t => t.id === taskId ? { ...t, subtasks: newSubs } : t) : null);
  }, [allTasks]);

  const today     = new Date().toISOString().slice(0, 10);
  const overdueCt = pending.filter(t => (t.dueDate || t.due_date) && (t.dueDate || t.due_date) < today).length;
  const todayCt   = pending.filter(t => (t.dueDate || t.due_date) === today).length;

  const filteredPending = useMemo(() => {
    let list = [...pending];
    if (filter === 'overdue') list = list.filter(t => (t.dueDate || t.due_date) && (t.dueDate || t.due_date) < today);
    if (filter === 'today')   list = list.filter(t => (t.dueDate || t.due_date) === today);
    if (filter === 'p1')      list = list.filter(t => normPriority(t.priority) === 'p1');
    if (filter === 'p2')      list = list.filter(t => normPriority(t.priority) === 'p2');
    const prioOrder = ['p1','p2','p3','p4'];
    if (sortBy === 'priority') list.sort((a, b) => prioOrder.indexOf(normPriority(a.priority)) - prioOrder.indexOf(normPriority(b.priority)));
    if (sortBy === 'due')      list.sort((a, b) => ((a.dueDate||a.due_date||'9999') < (b.dueDate||b.due_date||'9999') ? -1 : 1));
    return list;
  }, [pending, filter, sortBy, today]);

  // ── Render ──
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>Tasks</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '4px' }}>
            {pending.length} pending
            {overdueCt > 0 && <span style={{ color: '#ef4444', marginLeft: '8px' }}>· {overdueCt} overdue</span>}
            {todayCt  > 0 && <span style={{ color: '#f97316', marginLeft: '8px' }}>· {todayCt} due today</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchTasks} title="Refresh from DB"
            style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)',
                     border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                     color: 'var(--text-3)', opacity: syncing ? 0.5 : 1 }}>
            <RefreshCw size={14} className={syncing ? 'spin' : ''} />
          </button>
          <button
            onClick={() => { setShowForm(v => !v); if (editId) resetForm(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px',
              background: showForm ? 'rgba(255,255,255,0.08)' : 'var(--accent)',
              color: showForm ? 'var(--text-2)' : '#000',
              border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
            }}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'Add Task'}
          </button>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                   borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>
            {editId ? '✏️ Edit Task' : '➕ New Task'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <input type="text" placeholder="Task title *" value={form.title} autoFocus
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="form-input" />
            <textarea rows={2} placeholder="Description (optional)" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="form-input" style={{ resize: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.65rem' }}>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '5px', fontSize: '0.6rem' }}>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="form-input">
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label} — {p.long}</option>)}
                </select>
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '5px', fontSize: '0.6rem' }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="label-caps" style={{ display: 'block', marginBottom: '5px', fontSize: '0.6rem' }}>Due Date</label>
                <input type="date" value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="form-input" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button type="button" onClick={resetForm}
                style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem',
                         background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                         color: 'var(--text-3)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit"
                style={{ padding: '6px 18px', borderRadius: '8px', fontSize: '0.78rem',
                         fontWeight: 700, background: 'var(--accent)', color: '#000',
                         border: 'none', cursor: 'pointer' }}>
                {editId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                    padding: '4px', marginBottom: '1rem' }}>
        {[['pending', `Pending (${pending.length})`], ['completed', `Done (${completed.length})`]].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              flex: 1, padding: '6px 0', borderRadius: '9px', fontSize: '0.8rem',
              fontWeight: 700, border: 'none', cursor: 'pointer',
              background: tab === id ? 'var(--accent)' : 'transparent',
              color: tab === id ? '#000' : 'var(--text-3)', transition: 'all 0.2s',
            }}>{lbl}</button>
        ))}
      </div>

      {/* Filters + sort row */}
      {tab === 'pending' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          {[['all','All'],['overdue',`Overdue${overdueCt ? ` (${overdueCt})` : ''}`],
            ['today',`Today${todayCt ? ` (${todayCt})` : ''}`],
            ['p1','P1 Critical'],['p2','P2 High']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{
                padding: '4px 11px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                border: `1px solid ${filter === v ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
                background: filter === v ? 'rgba(245,158,11,0.12)' : 'transparent',
                color: filter === v ? '#f59e0b' : 'var(--text-3)', cursor: 'pointer',
                transition: 'all 0.15s',
              }}>{l}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Sort:</span>
            {[['created','Created'],['priority','Priority'],['due','Due']].map(([v, l]) => (
              <button key={v} onClick={() => setSortBy(v)}
                style={{
                  padding: '4px 9px', borderRadius: '8px', fontSize: '0.71rem',
                  border: `1px solid ${sortBy === v ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  background: sortBy === v ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: sortBy === v ? 'var(--text-1)' : 'var(--text-3)', cursor: 'pointer',
                }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {tab === 'pending' && filteredPending.map(task => (
          <TaskCard key={task.id} task={task}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onEdit={startEdit}
            onSubToggle={handleSubToggle}
            onSubDelete={handleSubDelete}
            onSubAdd={handleSubAdd}
          />
        ))}

        {tab === 'completed' && completed.map(task => (
          <div key={task.id}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
                     padding: '0.75rem 1rem', borderRadius: '14px',
                     background: 'rgba(255,255,255,0.02)',
                     border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ marginTop: '2px', width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(16,185,129,0.18)', border: '2px solid rgba(16,185,129,0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={10} color="#10b981" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', textDecoration: 'line-through' }}>{task.title}</p>
              {(task.completedAt || task.completed_at) && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px', opacity: 0.6 }}>
                  Completed {(task.completedAt || task.completed_at)?.slice(0, 10)}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button onClick={() => handleReopen(task.id)} title="Reopen"
                className="hover-btn-info"
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                  width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: 'var(--text-3)'
                }}
              ><RotateCcw size={12} /></button>
              <button onClick={() => handleDelete(task.id, 'completed')} title="Delete Forever"
                className="hover-btn-danger-strong"
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                  width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: 'var(--text-3)'
                }}
              ><Trash2 size={12} /></button>
            </div>
          </div>
        ))}

        {tab === 'pending' && filteredPending.length === 0 && (
          <div style={{ marginTop: '1rem' }}>
            <EmptyState 
              icon={ListTodo} 
              title={filter !== 'all' ? 'No matches found' : 'No Pending Tasks'} 
              description={filter !== 'all' ? 'No tasks match your current filter criteria.' : 'You have no pending tasks. Start by adding one to keep track of your goals.'}
              ctaLabel={filter === 'all' ? 'Add First Task' : null}
              onAction={filter === 'all' ? () => setShowForm(true) : null}
            />
          </div>
        )}
        {tab === 'completed' && completed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: '0.82rem' }}>No completed tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
