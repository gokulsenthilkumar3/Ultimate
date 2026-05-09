import React, { useState, useMemo, useCallback } from 'react';
import {
  CheckSquare, Square, Plus, Trash2, Clock, Tag, AlertCircle,
  ChevronDown, ChevronUp, Filter, LayoutGrid, List, Star, Flame,
  Calendar, Search, Edit2, Check, X, Flag
} from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#f97316', Critical: '#f43f5e' };
const PRIORITY_ICONS = { Low: '🟢', Medium: '🟡', High: '🟠', Critical: '🔴' };
const STATUS_OPTIONS = ['Todo', 'In Progress', 'Done', 'Blocked'];
const STATUS_COLORS = { Todo: '#64748b', 'In Progress': '#0ea5e9', Done: '#10b981', Blocked: '#f43f5e' };
const CATEGORIES = ['Personal', 'Work', 'Health', 'Finance', 'Learning', 'Project', 'Errands', 'Other'];

const EMPTY_FORM = {
  title: '', notes: '', priority: 'Medium', status: 'Todo',
  dueDate: '', category: 'Personal', done: false
};

export default function Tasks() {
  const tasks = useStore(s => s.tasks || []);
  const addTask = useStore(s => s.addTask);
  const updateTask = useStore(s => s.updateTask);
  const deleteTask = useStore(s => s.deleteTask);
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate' | 'priority' | 'created'
  const [collapsedCols, setCollapsedCols] = useState({});

  const filtered = useMemo(() => {
    let result = tasks.filter(t => {
      if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
      if (filterCategory !== 'All' && t.category !== filterCategory) return false;
      if (filterStatus !== 'All' && t.status !== filterStatus) return false;
      if (searchQuery && !t.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'priority') {
        return PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority);
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return new Date(b.id || 0) - new Date(a.id || 0);
    });
    return result;
  }, [tasks, filterPriority, filterCategory, filterStatus, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.done || t.status === 'Done').length;
    const critical = tasks.filter(t => t.priority === 'Critical' && !t.done && t.status !== 'Done').length;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.done && t.status !== 'Done').length;
    return { total, done, critical, overdue, completion: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  const boardColumns = useMemo(() => {
    const cols = {};
    STATUS_OPTIONS.forEach(s => { cols[s] = []; });
    filtered.forEach(t => {
      const col = t.status || (t.done ? 'Done' : 'Todo');
      if (cols[col]) cols[col].push(t);
      else cols['Todo'].push(t);
    });
    return cols;
  }, [filtered]);

  const handleAdd = useCallback(() => {
    if (!form.title.trim()) return toast.error('Task title is required.');
    addTask({ ...form, id: Date.now().toString(), done: form.status === 'Done' });
    setForm(EMPTY_FORM);
    setShowAdd(false);
    toast.success('Task added.');
  }, [form, addTask, toast]);

  const handleToggle = useCallback((task) => {
    const isDone = !task.done;
    updateTask({ ...task, done: isDone, status: isDone ? 'Done' : 'Todo' });
    toast.success(isDone ? 'Task marked complete!' : 'Task reopened.');
  }, [updateTask, toast]);

  const handleSaveEdit = useCallback((id) => {
    updateTask({ ...editForm, id });
    setEditId(null);
    toast.success('Task updated.');
  }, [editForm, updateTask, toast]);

  const handleStatusChange = useCallback((task, newStatus) => {
    updateTask({ ...task, status: newStatus, done: newStatus === 'Done' });
  }, [updateTask]);

  const isOverdue = (task) => task.dueDate && new Date(task.dueDate) < new Date() && !task.done && task.status !== 'Done';

  return (
    <div className="fade-in module-page" style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Mission Control</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Task Matrix</h2>
          <p className="text-secondary">Kanban board with priority triage and deadline tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setViewMode(v => v === 'board' ? 'list' : 'board')}
            className="btn-ghost"
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            title="Toggle view"
          >
            {viewMode === 'board' ? <List size={16} /> : <LayoutGrid size={16} />}
          </button>
          <button onClick={() => setShowAdd(s => !s)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}>
            {showAdd ? <X size={16} /> : <Plus size={16} />}
            {showAdd ? 'CANCEL' : 'NEW TASK'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Tasks', value: stats.total, color: 'var(--text-1)', icon: CheckSquare },
          { label: 'Completed', value: stats.done, color: '#10b981', icon: Check },
          { label: 'Critical', value: stats.critical, color: '#f43f5e', icon: Flag },
          { label: 'Overdue', value: stats.overdue, color: '#f97316', icon: AlertCircle },
          { label: 'Completion', value: `${stats.completion}%`, color: 'var(--accent)', icon: Star },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: `${s.color}15`, padding: '8px', borderRadius: '10px' }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '2px' }}>{s.label}</p>
              <p style={{ fontWeight: 900, fontSize: '1.4rem', color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '2rem', border: '1px solid var(--accent)33' }}>
          <h4 className="card-title" style={{ marginBottom: '1.5rem' }}><Plus size={16} /> New Task</h4>
          <div className="form-stack">
            <input
              type="text"
              className="form-input"
              placeholder="Task title..."
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <textarea
              className="form-input"
              placeholder="Notes / description (optional)"
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
              <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <Calendar size={14} style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                <input
                  type="date"
                  className="form-input"
                  value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  style={{ paddingLeft: '2rem' }}
                />
              </div>
            </div>
            <button onClick={handleAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
              <Plus size={16} /> ADD TASK
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2rem' }}
          />
        </div>
        <select className="form-input" style={{ flex: '0 0 auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-input" style={{ flex: '0 0 auto' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="All">All Priority</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="form-input" style={{ flex: '0 0 auto' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-input" style={{ flex: '0 0 auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="dueDate">Sort: Due Date</option>
          <option value="priority">Sort: Priority</option>
          <option value="created">Sort: Created</option>
        </select>
        <span className="label-caps" style={{ color: 'var(--text-3)', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
          {filtered.length} of {tasks.length} tasks
        </span>
      </div>

      {/* Board View */}
      {viewMode === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {STATUS_OPTIONS.map(col => {
            const colTasks = boardColumns[col] || [];
            const collapsed = collapsedCols[col];
            return (
              <div key={col} style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div
                  style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: `${STATUS_COLORS[col]}0d` }}
                  onClick={() => setCollapsedCols(c => ({ ...c, [col]: !c[col] }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[col] }} />
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col}</span>
                    <span style={{ background: 'var(--bg-dark)', color: 'var(--text-3)', borderRadius: '999px', padding: '0 8px', fontSize: '0.7rem', fontWeight: 700 }}>{colTasks.length}</span>
                  </div>
                  {collapsed ? <ChevronDown size={14} color="var(--text-3)" /> : <ChevronUp size={14} color="var(--text-3)" />}
                </div>
                {!collapsed && (
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '120px' }}>
                    {colTasks.length === 0 && (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No tasks
                      </div>
                    )}
                    {colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        editId={editId}
                        editForm={editForm}
                        setEditId={setEditId}
                        setEditForm={setEditForm}
                        handleSaveEdit={handleSaveEdit}
                        handleToggle={handleToggle}
                        handleStatusChange={handleStatusChange}
                        deleteTask={deleteTask}
                        isOverdue={isOverdue}
                        toast={toast}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 && <p className="empty-msg" style={{ padding: '2rem' }}>No tasks match the current filters.</p>}
          {filtered.map((task, i) => (
            <div
              key={task.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 120px 100px 100px 80px 36px',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.5rem',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                background: isOverdue(task) ? 'rgba(249,115,22,0.04)' : 'transparent',
                opacity: task.done ? 0.55 : 1,
                transition: 'background 0.2s'
              }}
            >
              <button
                onClick={() => handleToggle(task)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: task.done ? '#10b981' : 'var(--text-3)', padding: 0, display: 'flex' }}
              >
                {task.done ? <CheckSquare size={20} /> : <Square size={20} />}
              </button>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'var(--text-3)' : 'var(--text-1)' }}>{task.title}</p>
                {task.notes && <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px' }}>{task.notes}</p>}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: `${STATUS_COLORS[task.status] || '#64748b'}15`, color: STATUS_COLORS[task.status] || '#64748b' }}>{task.status || 'Todo'}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: PRIORITY_COLORS[task.priority] || 'var(--text-3)' }}>{PRIORITY_ICONS[task.priority]} {task.priority}</span>
              <span style={{ fontSize: '0.72rem', color: isOverdue(task) ? '#f97316' : 'var(--text-3)', fontWeight: isOverdue(task) ? 800 : 400 }}>
                {task.dueDate ? (isOverdue(task) ? '⚠ ' : '') + task.dueDate : '—'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>{task.category}</span>
              <button onClick={() => deleteTask(task.id)} className="btn-icon btn-icon--danger"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, editId, editForm, setEditId, setEditForm, handleSaveEdit, handleToggle, handleStatusChange, deleteTask, isOverdue, toast }) {
  const overdue = isOverdue(task);
  const isEditing = editId === task.id;

  if (isEditing) {
    return (
      <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <input className="form-input" style={{ fontSize: '0.85rem' }} value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} autoFocus />
        <textarea className="form-input" style={{ fontSize: '0.78rem', resize: 'vertical' }} rows={2} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes..." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <select className="form-input" style={{ fontSize: '0.78rem' }} value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <input type="date" className="form-input" style={{ fontSize: '0.78rem' }} value={editForm.dueDate || ''} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn-primary" style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => handleSaveEdit(task.id)}><Check size={13} /> SAVE</button>
          <button className="btn-ghost" style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => setEditId(null)}><X size={13} /> CANCEL</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      background: 'var(--bg-dark)',
      borderRadius: '12px',
      border: `1px solid ${overdue ? 'rgba(249,115,22,0.3)' : 'var(--border)'}`,
      opacity: task.done ? 0.55 : 1,
      transition: 'all 0.2s',
      cursor: 'default'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
          <button
            onClick={() => handleToggle(task)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: task.done ? '#10b981' : 'var(--text-3)', padding: '2px 0', marginTop: '1px', flexShrink: 0 }}
          >
            {task.done ? <CheckSquare size={17} /> : <Square size={17} />}
          </button>
          <p style={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.35, textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'var(--text-3)' : 'var(--text-1)' }}>{task.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', flexShrink: 0 }}>
          <button onClick={() => { setEditId(task.id); setEditForm({ ...task }); }} className="btn-icon" style={{ color: 'var(--text-3)', padding: '3px' }} title="Edit"><Edit2 size={13} /></button>
          <button onClick={() => deleteTask(task.id)} className="btn-icon btn-icon--danger" style={{ padding: '3px' }} title="Delete"><Trash2 size={13} /></button>
        </div>
      </div>

      {task.notes && <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '0.75rem', lineHeight: 1.45, paddingLeft: '25px' }}>{task.notes}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '25px' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: '5px', background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}>
          {PRIORITY_ICONS[task.priority]} {task.priority}
        </span>
        {task.category && (
          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: 'var(--bg-elevated)', color: 'var(--text-3)' }}>
            <Tag size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{task.category}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: overdue ? 'rgba(249,115,22,0.15)' : 'var(--bg-elevated)', color: overdue ? '#f97316' : 'var(--text-3)' }}>
            {overdue ? '⚠ ' : ''}<Clock size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{task.dueDate}
          </span>
        )}
      </div>

      {/* Quick status changer */}
      <div style={{ marginTop: '0.75rem', paddingLeft: '25px' }}>
        <select
          className="form-input"
          style={{ fontSize: '0.7rem', padding: '3px 6px', borderColor: `${STATUS_COLORS[task.status || 'Todo']}66`, color: STATUS_COLORS[task.status || 'Todo'] }}
          value={task.status || 'Todo'}
          onChange={e => handleStatusChange(task, e.target.value)}
        >
          {STATUS_OPTIONS.map(s => <option key={s} style={{ color: 'var(--text-1)' }}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}
