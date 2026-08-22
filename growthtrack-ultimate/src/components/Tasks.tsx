// @ts-nocheck
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useStore, {
  selectAddTask, selectCompleteTask, selectDeleteTask, selectUpdateTask, selectReopenTask
} from '../store/useStore';
import {
  Plus, Check, Trash2, RotateCcw, Edit3, X, Clock,
  ChevronDown, ChevronRight, ListTodo, AlertCircle, RefreshCw, LayoutGrid, List as ListIcon,
  Zap, Archive
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { apiSync } from '../store/useStore';
import EmptyState from './ui/EmptyState';
import { FixedSizeList as List } from '../lib/FixedSizeList';

// ── P1-P4 priority config ─────────────────────────────────────────────────────────────
const PRIORITIES = [
  { value: 'p1', label: 'P1', long: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)' },
  { value: 'p2', label: 'P2', long: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
  { value: 'p3', label: 'P3', long: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  { value: 'p4', label: 'P4', long: 'Low',      color: '#6b7280', bg: 'rgba(107,114,128,0.12)',border: 'rgba(107,114,128,0.25)' },
];
const PMAP = Object.fromEntries(PRIORITIES.map(p => [p.value, p]));

// legacy priority values upgrade
const normPriority = (v: any) => {
  if (!v) return 'p3';
  if (v === 'high')   return 'p1';
  if (v === 'medium') return 'p3';
  if (v === 'low')    return 'p4';
  return v;
};

const CATEGORIES = ['Work', 'Personal', 'Health', 'Finance', 'Learning', 'Other'];

// ── due-date helpers ────────────────────────────────────────────────────────────────
function dueMeta(dateStr: any) {
  if (!dateStr) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return { label: `Overdue`,        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' };
  if (dateStr === today) return { label: 'Due today',    color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' };
  const diff = Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
  if (diff === 1) return    { label: 'Due tomorrow',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' };
  if (diff <= 7) return     { label: `In ${diff} days`,  color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' };
  return                    { label: dateStr,             color: '#4b5563', bg: 'rgba(75,85,99,0.08)',   border: 'rgba(75,85,99,0.15)' };
}

// ── SubTask row ────────────────────────────────────────────────────────────────────
function SubTaskRow({ sub, onToggle, onDelete }: any) {
  return (
    <div className="subtask-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
function TaskCard({ task, onComplete, onDelete, onEdit, onSubToggle, onSubDelete, onSubAdd }: any) {
  const [expanded,    setExpanded]    = useState(false);
  const [subInput,    setSubInput]    = useState('');
  const today    = new Date().toISOString().slice(0, 10);
  const prio     = PMAP[normPriority(task.priority)] || PMAP.p3;
  const dm       = dueMeta(task.dueDate);
  const subs     = task.subtasks || [];
  const doneSubs = subs.filter((s: any) => s.done).length;
  const isOverdue = task.dueDate && task.dueDate < today;

  return (
    <div className="card-enter glass-card" style={{
      background: isOverdue ? 'rgba(239,68,68,0.04)' : 'var(--bg-glass)',
      borderColor: isOverdue ? 'rgba(239,68,68,0.3)' : (task.dueDate === today ? 'rgba(249,115,22,0.3)' : 'var(--border-subtle)'),
      padding: '1.25rem',
      marginBottom: '0.5rem',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      transition: 'all 0.25s var(--ease)'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = isOverdue ? 'rgba(239,68,68,0.5)' : (task.dueDate === today ? 'rgba(249,115,22,0.5)' : 'var(--accent)');
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = isOverdue ? 'rgba(239,68,68,0.3)' : (task.dueDate === today ? 'rgba(249,115,22,0.3)' : 'var(--border-subtle)');
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
    }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        {/* custom complete checkbox */}
        <button
          onClick={() => onComplete(task.id)}
          title="Mark complete"
          className="checkbox-custom"
          style={{
            marginTop: '3px', width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.01)',
            cursor: 'pointer', transition: 'all 0.25s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#10b981';
            e.currentTarget.style.background = 'rgba(16,185,129,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
          }}
        >
          <Check size={12} color="#10b981" style={{ opacity: 0, transition: 'opacity 0.2s' }} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* title + badges row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.35 }}>{task.title}</span>
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
                color: 'var(--text-3)', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
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
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '8px', lineHeight: 1.45 }}>
              {task.description}
            </p>
          )}

          {/* Subtask progress bar */}
          {subs.length > 0 && (
            <div style={{ marginTop: '8px', marginBottom: '8px', maxWidth: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '4px', fontWeight: 700 }}>
                <span>Subtask Progress</span>
                <span>{doneSubs}/{subs.length} ({Math.round(doneSubs / subs.length * 100)}%)</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(doneSubs / subs.length) * 100}%`, background: 'var(--accent)', borderRadius: '99px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </div>
            </div>
          )}

          {/* sub-tasks toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 0',
              marginTop: '4px',
              color: subs.length ? 'var(--accent)' : 'var(--text-3)',
              transition: 'color 0.2s'
            }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <ListTodo size={12} />
            {subs.length
              ? `Sub-tasks  ${doneSubs}/${subs.length}`
              : 'Add sub-tasks'}
          </button>

          {/* expanded sub-tasks panel */}
          {expanded && (
            <div style={{
              marginTop: '10px', paddingLeft: '12px',
              borderLeft: '2px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
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
                    flex: 1, background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px', padding: '6px 12px',
                    color: 'var(--text-1)', fontSize: '0.75rem', outline: 'none',
                  }}
                />
                <button
                  onClick={() => { if (subInput.trim()) { onSubAdd(task.id, subInput.trim()); setSubInput(''); } }}
                  style={{
                    padding: '4px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 800, transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                >Add</button>
              </div>
            </div>
          )}
        </div>

        {/* action buttons */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} className="task-actions">
          <button 
            onClick={() => onEdit(task)}
            title="Edit"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--accent-glow)';
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.color = 'var(--text-3)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <Edit3 size={12} />
          </button>
          
          <button 
            onClick={() => onDelete(task.id, 'pending')}
            title="Delete"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.color = 'var(--text-3)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <Trash2 size={12} />
          </button>
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
  const [dbTasks,   setDbTasks]   = useState<any>(null);  // null = not yet loaded
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
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'matrix'
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<any>(null);
  const [filter,   setFilter]   = useState('all');
  const [sortBy,   setSortBy]   = useState('created');
  const [selected, setSelected] = useState<Set<string>>(new Set()); // multi-select IDs

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

  // 'N' key shortcut: open new task form when no input is focused
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.key === 'n' || e.key === 'N') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setShowForm(true);
        setEditId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const EMPTY_FORM = { title: '', description: '', priority: 'p3', category: 'Work', dueDate: '', parent_task_id: '' };
  const [form, setForm] = useState(EMPTY_FORM);

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); };

  // ── CRUD helpers ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    if (form.parent_task_id) {
      if (form.parent_task_id === editId) {
        toast.error("Task cannot be its own parent.");
        return;
      }
      const parentTask = allTasks.find(t => t.id === form.parent_task_id);
      if (parentTask && parentTask.parent_task_id === editId) {
        toast.error("Circular reference detected.");
        return;
      }
    }
    if (editId) {
      // PATCH to API
      // Optimistic update
      setDbTasks((prev: any) => prev ? prev.map((t: any) => t.id === editId ? { ...t, ...form } : t) : null);
      try {
        await apiSync(`/tasks/${editId}`, 'PATCH', form);
        toast.success('Task updated');
      } catch {
        storeUpdateTask(editId, form);
        toast.success('Task updated (local)');
      }
    } else {
      const payload = { ...form, status: 'pending', subtasks: [], created_at: new Date().toISOString() };
      const tempId = Date.now();
      const newTask = { ...payload, id: tempId };
      // Optimistic update
      setDbTasks((prev: any) => prev ? [newTask, ...prev] : [newTask]);
      try {
        const created = await apiSync('/tasks', 'POST', payload);
        if (created?.id) {
          setDbTasks((prev: any) => prev ? prev.map((t: any) => t.id === tempId ? created : t) : null);
        }
        toast.success('Task added');
      } catch {
        await storeAddTask(newTask);
        toast.success('Task added (local)');
      }
    }
    resetForm();
  };

  const handleComplete = useCallback(async (id) => {
    const ts = new Date().toISOString();
    // Optimistic UI
    setDbTasks((prev: any) => prev ? prev.map((t: any) => t.id === id
        ? { ...t, status: 'done', completed_at: ts } : t) : null);
    try {
      await apiSync(`/tasks/${id}`, 'PATCH', { status: 'done', completed_at: ts });
    } catch { storeCompleteTask(id); }
    toast.success('Task completed! ✓');
  }, [storeCompleteTask, toast]);

  const handleDelete = useCallback(async (id, bucket) => {
    const taskToRestore = allTasks.find(t => t.id === id);
    // Optimistic UI
    setDbTasks((prev: any) => prev ? prev.filter(t => t.id !== id) : null);
    try {
      await apiSync(`/tasks/${id}`, 'DELETE');
    } catch { storeDeleteTask(id, bucket); }
    
    toast.info('Task deleted', 5000, {
      action: {
        label: 'Undo',
        onClick: async () => {
          if (!taskToRestore) return;
          try {
            const created = await apiSync('/tasks', 'POST', taskToRestore);
            const newTask = created?.id ? created : { ...taskToRestore, id: Date.now() };
            setDbTasks((prev: any) => prev ? [...prev, newTask] : null);
          } catch {
            storeAddTask(taskToRestore);
          }
          toast.success('Task restored');
        }
      }
    });
  }, [storeDeleteTask, toast, allTasks]);

  const handleReopen = useCallback(async (id) => {
    // Optimistic UI
    setDbTasks((prev: any) => prev ? prev.map((t: any) => t.id === id ? { ...t, status: 'pending', completed_at: null } : t) : null);
    try {
      await apiSync(`/tasks/${id}`, 'PATCH', { status: 'pending', completed_at: null });
    } catch { storeReopenTask(id); }
    toast.info('Task reopened');
  }, [storeReopenTask, toast]);

  const startEdit = (task: any) => {
    setForm({
      title:       task.title       || '',
      description: task.description || '',
      priority:    normPriority(task.priority),
      category:    task.category    || 'Work',
      dueDate:     task.dueDate     || task.due_date || '',
      parent_task_id: task.parent_task_id || ''
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
    setDbTasks((prev: any) => prev
      ? prev.map((t: any) => t.id === taskId ? { ...t, subtasks: updated.subtasks } : t)
      : null
    );
    toast.success('Sub-task added');
  }, [allTasks, toast]);

  const handleSubToggle = useCallback(async (taskId, subId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = (task.subtasks || []).map(s => s.id === subId ? { ...s, done: !s.done } : s);
    try { await apiSync(`/tasks/${taskId}`, 'PATCH', { subtasks: newSubs }); } catch { /* local */ }
    setDbTasks((prev: any) => prev ? prev.map((t: any) => t.id === taskId ? { ...t, subtasks: newSubs } : t) : null);
  }, [allTasks]);

  const handleSubDelete = useCallback(async (taskId, subId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = (task.subtasks || []).filter(s => s.id !== subId);
    try { await apiSync(`/tasks/${taskId}`, 'PATCH', { subtasks: newSubs }); } catch { /* local */ }
    setDbTasks((prev: any) => prev ? prev.map((t: any) => t.id === taskId ? { ...t, subtasks: newSubs } : t) : null);
  }, [allTasks]);

  const today     = new Date().toISOString().slice(0, 10);
  const overdueCt = pending.filter(t => (t.dueDate || t.due_date) && (t.dueDate || t.due_date) < today).length;
  const todayCt   = pending.filter(t => (t.dueDate || t.due_date) === today).length;

  const filteredPending = useMemo(() => {
    let list = [...pending];
    if (filter === 'overdue') list = list.filter(t => (t.dueDate || t.due_date) && (t.dueDate || t.due_date) < today);
    else if (filter === 'today')   list = list.filter(t => (t.dueDate || t.due_date) === today);
    else if (filter === 'p1')      list = list.filter(t => normPriority(t.priority) === 'p1');
    else if (filter === 'p2')      list = list.filter(t => normPriority(t.priority) === 'p2');
    else if (CATEGORIES.includes(filter)) list = list.filter(t => t.category === filter);
    const prioOrder = ['p1','p2','p3','p4'];
    if (sortBy === 'priority') list.sort((a, b) => prioOrder.indexOf(normPriority(a.priority)) - prioOrder.indexOf(normPriority(b.priority)));
    if (sortBy === 'due')      list.sort((a, b) => ((a.dueDate||a.due_date||'9999') < (b.dueDate||b.due_date||'9999') ? -1 : 1));
    return list;
  }, [pending, filter, sortBy, today]);

  const catCounts = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach(c => { counts[c] = pending.filter(t => t.category === c).length; });
    return counts;
  }, [pending]);

  // Bulk actions
  const handleBulkComplete = useCallback(async () => {
    for (const id of selected) { await handleComplete(id).catch(() => {}); }
    setSelected(new Set());
    toast.success(`${selected.size} task(s) marked complete!`);
  }, [selected, handleComplete, toast]);

  const handleBulkDelete = useCallback(async () => {
    for (const id of selected) { await handleDelete(id, 'pending').catch(() => {}); }
    setSelected(new Set());
  }, [selected, handleDelete]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const getQuadrant = (task) => {
    const due = task.dueDate || task.due_date;
    const urgent = due && due <= tomorrowStr;
    const p = normPriority(task.priority);
    const important = p === 'p1' || p === 'p2';
    if (urgent && important) return 1; // Do First
    if (!urgent && important) return 2; // Schedule
    if (urgent && !important) return 3; // Delegate
    if (!urgent && !important) return 4; // Don't Do / Later
  };

  const matrixTasks = useMemo(() => {
    const q1 = [], q2 = [], q3 = [], q4 = [];
    filteredPending.forEach(t => {
      const q = getQuadrant(t);
      if (q === 1) q1.push(t);
      else if (q === 2) q2.push(t);
      else if (q === 3) q3.push(t);
      else if (q === 4) q4.push(t);
    });
    return { q1, q2, q3, q4 };
  }, [filteredPending, tomorrowStr]);

  // ── Render ──
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem' }}>
      {/* Dynamic Keyframes Injection */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .checkbox-custom:hover svg {
          opacity: 1 !important;
        }
        .matrix-quadrant {
          transition: all 0.25s var(--ease);
        }
        .matrix-quadrant:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25) !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.02em' }}>Tasks Command</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '4px', fontWeight: 600 }}>
            {pending.length} pending
            {overdueCt > 0 && <span style={{ color: '#ef4444', marginLeft: '8px' }}>· {overdueCt} overdue</span>}
            {todayCt  > 0 && <span style={{ color: '#f97316', marginLeft: '8px' }}>· {todayCt} due today</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={fetchTasks} title="Refresh from DB"
            style={{ 
              padding: '10px', 
              borderRadius: '12px', 
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', 
              cursor: 'pointer',
              color: 'var(--text-2)', 
              opacity: syncing ? 0.5 : 1, 
              display: 'flex', 
              alignItems: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.borderColor = 'var(--border-glow)';
              e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
              e.currentTarget.style.background = 'var(--accent-soft)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-2)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = 'var(--bg-elevated)';
            }}
          >
            <RefreshCw size={14} className={syncing ? 'spin' : ''} />
          </button>
          <button
            onClick={() => { setShowForm(v => !v); if (editId) resetForm(); }}
            style={{ 
              padding: '10px 20px', 
              fontSize: '0.85rem', 
              gap: '8px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
              fontWeight: 800,
              border: showForm ? '1px solid var(--border)' : 'none',
              background: showForm ? 'var(--bg-elevated)' : 'var(--accent)',
              color: showForm ? 'var(--text-1)' : '#000',
              boxShadow: showForm ? 'none' : 'var(--glow-cyan)',
              transition: 'all 0.25s var(--ease)'
            }}
            onMouseEnter={e => {
              if (showForm) {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              } else {
                e.currentTarget.style.filter = 'brightness(1.15)';
              }
            }}
            onMouseLeave={e => {
              if (showForm) {
                e.currentTarget.style.borderColor = 'var(--border)';
              } else {
                e.currentTarget.style.filter = 'none';
              }
            }}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'Deploy Task'}
          </button>
        </div>
      </div>

      {/* Slide-over Drawer for Task Form */}
      {showForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.25s ease'
        }} onClick={resetForm}>
          <form 
            onSubmit={handleSubmit} 
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              height: '100%',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(32px) saturate(180%)',
              borderLeft: '1px solid var(--border)',
              padding: '2.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
              transform: 'translateX(0)',
              animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-1)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editId ? <Edit3 size={18} color="var(--accent)" /> : <Plus size={18} color="var(--accent)" />}
                {editId ? 'Edit Task Spec' : 'Deploy New Task'}
              </h3>
              <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '8px', fontSize: '0.68rem', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Title *</label>
                <input type="text" placeholder="Specify task name..." value={form.title} autoFocus required
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="form-input" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text-1)', fontSize: '0.88rem' }} />
              </div>

              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '8px', fontSize: '0.68rem', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Description</label>
                <textarea rows={4} placeholder="Describe the objectives..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="form-input" style={{ width: '100%', resize: 'none', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text-1)', fontSize: '0.88rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '8px', fontSize: '0.68rem', color: 'var(--text-3)' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="form-input" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)' }}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value} style={{ background: 'var(--bg-surface)', color: 'var(--text-1)' }}>{p.label} — {p.long}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '8px', fontSize: '0.68rem', color: 'var(--text-3)' }}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)' }}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: 'var(--bg-surface)', color: 'var(--text-1)' }}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '8px', fontSize: '0.68rem', color: 'var(--text-3)' }}>Due Date</label>
                <input type="date" value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="form-input" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)' }} />
              </div>

              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '8px', fontSize: '0.68rem', color: 'var(--text-3)' }}>Parent Task (Optional)</label>
                <select value={form.parent_task_id} onChange={e => setForm(f => ({ ...f, parent_task_id: e.target.value }))} className="form-input" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)' }}>
                  <option value="" style={{ background: 'var(--bg-surface)', color: 'var(--text-1)' }}>None</option>
                  {allTasks.filter(t => t.id !== editId).map(t => (
                    <option key={t.id} value={t.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-1)' }}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <button type="button" onClick={resetForm}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700,
                         background: 'none', border: '1px solid var(--border)',
                         color: 'var(--text-2)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >Cancel</button>
              <button type="submit"
                style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.85rem',
                         fontWeight: 900, background: 'var(--accent)', color: '#000',
                         border: 'none', cursor: 'pointer', boxShadow: 'var(--glow-cyan)' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                {editId ? 'Save Changes' : 'Initialize Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '6px',
        marginBottom: '1.75rem',
        position: 'relative'
      }}>
        {[['pending', `Pending Tasks (${pending.length})`], ['completed', `Completed Archive (${completed.length})`]].map(([id, lbl]) => {
          const isActive = tab === id;
          return (
            <button 
              key={id} 
              onClick={() => setTab(id)}
              style={{
                flex: 1, 
                padding: '10px 0', 
                borderRadius: '12px', 
                fontSize: '0.82rem',
                fontWeight: 800, 
                border: 'none', 
                cursor: 'pointer',
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-3)',
                boxShadow: isActive ? 'var(--shadow-card), 0 0 0 1px var(--border-glow)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-1)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-3)';
              }}
            >
              {id === 'pending' ? <ListTodo size={15} /> : <Archive size={15} />}
              {lbl}
            </button>
          );
        })}
      </div>

      {/* Filters + sort row */}
      {tab === 'pending' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
          {[['all','All'],['overdue',`Overdue${overdueCt ? ` (${overdueCt})` : ''}`],
            ['today',`Today${todayCt ? ` (${todayCt})` : ''}`],
            ['p1','P1 Critical'],['p2','P2 High']].map(([v, l]) => {
            const isActive = filter === v;
            return (
              <button key={v} onClick={() => setFilter(v)}
                style={{
                  padding: '6px 16px', 
                  borderRadius: '99px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  transition: 'all 0.25s var(--ease)', 
                  minHeight: '32px',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isActive ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                  boxShadow: isActive ? 'var(--glow-cyan)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.color = 'var(--text-1)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-2)';
                  }
                }}
              >{l}</button>
            );
          })}
          {CATEGORIES.filter(c => catCounts[c] > 0).map(c => {
            const isActive = filter === c;
            return (
              <button key={c} onClick={() => setFilter(f => f === c ? 'all' : c)}
                style={{
                  padding: '6px 16px', 
                  borderRadius: '99px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  transition: 'all 0.25s var(--ease)', 
                  minHeight: '32px',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isActive ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                  boxShadow: isActive ? 'var(--glow-cyan)' : 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.color = 'var(--text-1)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-2)';
                  }
                }}
              >{c} ({catCounts[c]})</button>
            );
          })}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600 }}>Sort:</span>
            <div className="segmented--compact" style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)' }}>
              {[['created','Created'],['priority','Priority'],['due','Due']].map(([v, l]) => {
                const isActive = sortBy === v;
                return (
                  <button key={v} onClick={() => setSortBy(v)}
                    style={{
                      padding: '5px 14px', 
                      borderRadius: '8px', 
                      fontSize: '0.75rem', 
                      fontWeight: 800,
                      border: 'none',
                      background: isActive ? 'var(--bg-surface)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-3)', 
                      cursor: 'pointer',
                      boxShadow: isActive ? 'var(--shadow-card), 0 0 0 1px var(--border-glow)' : 'none',
                      transition: 'all 0.2s var(--ease)'
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.color = 'var(--text-1)';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.color = 'var(--text-3)';
                    }}
                  >{l}</button>
                );
              })}
            </div>
            <div style={{ width: '1px', height: '14px', background: 'var(--border-strong)', margin: '0 4px' }} />
            <button 
              onClick={() => setViewMode('list')} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: viewMode === 'list' ? 'var(--accent)' : 'var(--text-3)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
              onMouseEnter={e => { if (viewMode !== 'list') e.currentTarget.style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { if (viewMode !== 'list') e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              <ListIcon size={16} />
            </button>
            <button 
              onClick={() => setViewMode('matrix')} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: viewMode === 'matrix' ? 'var(--accent)' : 'var(--text-3)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
              onMouseEnter={e => { if (viewMode !== 'matrix') e.currentTarget.style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { if (viewMode !== 'matrix') e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', marginBottom: '0.75rem', background: 'var(--accent-soft)', border: '1px solid var(--border-glow)', borderRadius: '12px', boxShadow: 'var(--glow-cyan)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent)' }}>{selected.size} selected</span>
          <button onClick={handleBulkComplete} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.25)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}>
            ✓ Mark Complete
          </button>
          <button onClick={handleBulkDelete} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}>
            🗑 Delete Selected
          </button>
          <button onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>Clear</button>
        </div>
      )}

      {/* Task list / Matrix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {tab === 'pending' && viewMode === 'list' && filteredPending.map((task: any) => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <input
              type="checkbox"
              checked={selected.has(task.id)}
              onChange={(e: any) => setSelected(prev => {
                const next = new Set(prev);
                e.target.checked ? next.add(task.id) : next.delete(task.id);
                return next;
              })}
              style={{ marginTop: '20px', accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0, width: 16, height: 16 }}
              title="Select task"
            />
            <div style={{ flex: 1 }}>
              <TaskCard task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onEdit={startEdit}
                onSubToggle={handleSubToggle}
                onSubDelete={handleSubDelete}
                onSubAdd={handleSubAdd}
              />
            </div>
          </div>
        ))}
        
        {tab === 'pending' && viewMode === 'matrix' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '0.5rem' }}>
            {/* Q1: Do First */}
            <div className="glass-card matrix-quadrant" style={{ 
              padding: '1.5rem', 
              borderTop: '4px solid #ef4444', 
              background: 'linear-gradient(180deg, rgba(239,68,68,0.03) 0%, rgba(0,0,0,0) 100%)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                <Zap size={16} color="#ef4444" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ef4444', margin: 0 }}>Do First</h3>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem', fontWeight: 600 }}>Urgent & Important (Resolve immediately)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {matrixTasks.q1.length > 0 ? (
                  matrixTasks.q1.map(task => (
                    <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={startEdit} onSubToggle={handleSubToggle} onSubDelete={handleSubDelete} onSubAdd={handleSubAdd} />
                  ))
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-3)', fontSize: '0.72rem' }}>No critical items</div>
                )}
              </div>
            </div>
            
            {/* Q2: Schedule */}
            <div className="glass-card matrix-quadrant" style={{ 
              padding: '1.5rem', 
              borderTop: '4px solid #3b82f6',
              background: 'linear-gradient(180deg, rgba(59,130,246,0.03) 0%, rgba(0,0,0,0) 100%)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                <Clock size={16} color="#3b82f6" style={{ filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.5))' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#3b82f6', margin: 0 }}>Schedule</h3>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem', fontWeight: 600 }}>Not Urgent & Important (Plan time to do)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {matrixTasks.q2.length > 0 ? (
                  matrixTasks.q2.map(task => (
                    <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={startEdit} onSubToggle={handleSubToggle} onSubDelete={handleSubDelete} onSubAdd={handleSubAdd} />
                  ))
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-3)', fontSize: '0.72rem' }}>No scheduled items</div>
                )}
              </div>
            </div>
            
            {/* Q3: Delegate */}
            <div className="glass-card matrix-quadrant" style={{ 
              padding: '1.5rem', 
              borderTop: '4px solid #f59e0b',
              background: 'linear-gradient(180deg, rgba(245,158,11,0.03) 0%, rgba(0,0,0,0) 100%)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                <AlertCircle size={16} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b', margin: 0 }}>Delegate</h3>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem', fontWeight: 600 }}>Urgent & Not Important (Assign or defer)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {matrixTasks.q3.length > 0 ? (
                  matrixTasks.q3.map(task => (
                    <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={startEdit} onSubToggle={handleSubToggle} onSubDelete={handleSubDelete} onSubAdd={handleSubAdd} />
                  ))
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-3)', fontSize: '0.72rem' }}>No delegated items</div>
                )}
              </div>
            </div>
            
            {/* Q4: Later / Eliminate */}
            <div className="glass-card matrix-quadrant" style={{ 
              padding: '1.5rem', 
              borderTop: '4px solid #6b7280',
              background: 'linear-gradient(180deg, rgba(107,114,128,0.03) 0%, rgba(0,0,0,0) 100%)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                <Trash2 size={16} color="#9ca3af" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#9ca3af', margin: 0 }}>Later / Eliminate</h3>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem', fontWeight: 600 }}>Not Urgent & Not Important (De-prioritize)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {matrixTasks.q4.length > 0 ? (
                  matrixTasks.q4.map(task => (
                    <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={startEdit} onSubToggle={handleSubToggle} onSubDelete={handleSubDelete} onSubAdd={handleSubAdd} />
                  ))
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-3)', fontSize: '0.72rem' }}>No low-priority items</div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'completed' && completed.length > 0 && (
          <List
            height={600}
            itemCount={completed.length}
            itemSize={65}
            width="100%"
            itemData={completed}
          >
            {({ index, style, data }: any) => {
              const task = data[index];
              return (
                <div style={{ ...style, paddingBottom: '0.6rem' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
                             padding: '0.75rem 1rem', borderRadius: '14px',
                             background: 'rgba(255,255,255,0.02)',
                             border: '1px solid var(--border)',
                             height: '100%', boxSizing: 'border-box' }}>
                    <div style={{ marginTop: '2px', width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                  background: 'rgba(16,185,129,0.18)', border: '2px solid rgba(16,185,129,0.5)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={10} color="#10b981" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', textDecoration: 'line-through', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</p>
                      {(task.completedAt || task.completed_at) && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px', opacity: 0.6 }}>
                          Completed {(task.completedAt || task.completed_at)?.slice(0, 10)}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button 
                        onClick={() => handleReopen(task.id)} 
                        title="Reopen"
                        style={{
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px',
                          width: '28px', 
                          height: '28px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer',
                          color: 'var(--text-3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(14, 165, 233, 0.15)';
                          e.currentTarget.style.color = '#0ea5e9';
                          e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.4)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.color = 'var(--text-3)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button 
                        onClick={() => handleDelete(task.id, 'completed')} 
                        title="Delete Forever"
                        style={{
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px',
                          width: '28px', 
                          height: '28px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer',
                          color: 'var(--text-3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.color = 'var(--text-3)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }}
          </List>
        )}

        {tab === 'pending' && filteredPending.length === 0 && (
          <div style={{ marginTop: '1rem' }}>
            <EmptyState 
              icon="CheckSquare" 
              title={filter !== 'all' ? 'No matches found' : 'No Pending Tasks'} 
              description={filter !== 'all' ? 'No tasks match your current filter criteria.' : 'You have no pending tasks. Start by adding one to keep track of your goals.'}
              actionLabel={filter === "all" ? "Add First Task" : ""}
              onAction={filter === "all" ? () => setShowForm(true) : undefined}
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
