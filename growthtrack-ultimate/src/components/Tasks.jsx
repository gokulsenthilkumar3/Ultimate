import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, CheckCircle2, Clock, RotateCcw, AlertTriangle, Edit3, X, Save } from 'lucide-react';
import useStore, { 
  selectAddTask, selectDeleteTask, selectCompleteTask, 
  selectUpdateTask, selectReopenTask 
} from '../store/useStore';
import { useToast } from '../hooks/useToast';

const PRIORITIES = [
  { key: 'High', label: 'High', color: '#ef4444' },
  { key: 'Medium', label: 'Med', color: '#f59e0b' },
  { key: 'Low', label: 'Low', color: '#10b981' },
];
const TAGS = ['fitness', 'finance', 'work', 'personal', 'health', 'learning', 'creative', 'admin'];
const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (task) => !task.done && task.dueDate && task.dueDate < today();
const daysUntil = (date) => {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - new Date()) / 86400000);
  return diff;
};

function TaskCard({ task, onDelete, onComplete, onReopen, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const overdue = isOverdue(task);
  const days = daysUntil(task.dueDate);
  const priorityColor = PRIORITIES.find(p => p.key === task.priority)?.color || 'var(--border)';

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, { title: editTitle.trim() });
    }
    setEditing(false);
  };

  return (
    <div className="glass-card" style={{
      padding: '1.25rem',
      borderLeft: `4px solid ${task.done ? 'var(--success)' : (overdue ? 'var(--danger)' : priorityColor)}`,
      borderRadius: '16px',
      transition: 'all 0.25s ease',
      position: 'relative',
    }}>
      {/* Overdue warning badge */}
      {overdue && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800 }}>
          <AlertTriangle size={10} /> OVERDUE
        </div>
      )}

      {/* Title Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', paddingRight: overdue ? '70px' : '0' }}>
        {editing ? (
          <input
            autoFocus value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            className="form-input"
            style={{ flex: 1, marginRight: '8px', padding: '4px 8px', fontSize: '0.9rem', height: '32px' }}
          />
        ) : (
          <p style={{ fontSize: '0.92rem', fontWeight: 700, color: task.done ? 'var(--text-3)' : 'var(--text-1)', textDecoration: task.done ? 'line-through' : 'none', lineHeight: 1.5, flex: 1 }}>
            {task.title}
          </p>
        )}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
          {editing ? (
            <>
              <button onClick={handleSave} style={{ background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'var(--success)', display: 'flex' }}><Save size={13} /></button>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><X size={13} /></button>
            </>
          ) : (
            <>
              {!task.done && <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}><Edit3 size={13} /></button>}
              <button onClick={() => onDelete(task.id, task.done ? 'completed' : 'pending')} style={{ background: 'none', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}><Trash2 size={13} /></button>
            </>
          )}
        </div>
      </div>

      {/* Meta tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '6px', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {task.tag || 'general'}
        </span>
        <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '6px', background: `${priorityColor}18`, color: priorityColor, fontWeight: 800 }}>
          {task.priority || 'Medium'}
        </span>
        {task.dueDate && (
          <span style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px', color: overdue ? 'var(--danger)' : (days !== null && days <= 2 ? 'var(--warning)' : 'var(--text-3)'), fontWeight: 600 }}>
            <Clock size={11} />
            {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
          </span>
        )}
        {task.done && task.completedAt && (
          <span style={{ fontSize: '0.6rem', color: 'var(--success)', fontWeight: 700 }}>
            ✓ {new Date(task.completedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Action Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {!task.done ? (
          <button onClick={() => onComplete(task.id)} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.7rem', borderRadius: '8px', background: 'var(--success)', color: '#000', fontWeight: 900 }}>
            <CheckCircle2 size={13} /> DONE
          </button>
        ) : (
          <button onClick={() => onReopen(task.id)} style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}>
            <RotateCcw size={12} /> REOPEN
          </button>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = { title: '', priority: 'Medium', dueDate: '', tag: 'personal', recurring: false, frequency: 'daily' };

export default function Tasks({ user }) {
  const storeAddTask = useStore(selectAddTask);
  const storeDeleteTask = useStore(selectDeleteTask);
  const storeCompleteTask = useStore(selectCompleteTask);
  const storeUpdateTask = useStore(selectUpdateTask);
  const storeReopenTask = useStore(selectReopenTask);
  const toast = useToast();

  const tasks = user?.tasks || { pending: [], completed: [], recurring: [] };
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all'); // all, today, overdue, high
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddTask = async () => {
    if (!form.title.trim()) { toast.error('Task title is required'); return; }
    if (form.title.trim().length < 3) { toast.error('Title must be at least 3 characters'); return; }
    await storeAddTask({ ...form });
    toast.success('Task created successfully');
    setForm(EMPTY_FORM);
    setShowAdd(false);
  };

  const getFilteredPending = () => {
    let items = tasks.pending || [];
    if (searchTerm) items = items.filter(t => t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || t.tag?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filter === 'today') items = items.filter(t => t.dueDate === today());
    if (filter === 'overdue') items = items.filter(t => isOverdue(t));
    if (filter === 'high') items = items.filter(t => t.priority === 'High');
    return items;
  };

  const pending = getFilteredPending();
  const highPriority = pending.filter(t => t.priority === 'High');
  const normal = pending.filter(t => t.priority !== 'High');
  const completed = (tasks.completed || []).slice(0, 20);

  const overdueCount = (tasks.pending || []).filter(t => isOverdue(t)).length;

  const kanbanColumns = [
    { id: 'todo', label: 'Backlog', emoji: '📋', items: normal, color: 'var(--text-3)' },
    { id: 'priority', label: 'Priority', emoji: '🔥', items: highPriority, color: '#ef4444' },
    { id: 'done', label: 'Resolved', emoji: '✅', items: completed, color: 'var(--success)' },
  ];

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Mission Control</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckSquare size={30} color="var(--accent)" /> Kanban Board
          </h2>
          <p className="text-secondary" style={{ marginTop: '0.35rem' }}>
            {(tasks.pending || []).length} active · {completed.length} resolved
            {overdueCount > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}> · {overdueCount} overdue</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <input
            type="text" placeholder="Search tasks…" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input" style={{ width: '200px', padding: '0.55rem 0.85rem' }}
          />
          <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? <X size={16} /> : <Plus size={16} />} {showAdd ? 'CANCEL' : 'NEW TASK'}
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Tasks' },
          { key: 'today', label: '📅 Due Today' },
          { key: 'overdue', label: '🚨 Overdue' },
          { key: 'high', label: '🔥 High Priority' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '5px 14px', borderRadius: '20px', border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`, background: filter === f.key ? 'var(--accent-soft)' : 'transparent', color: filter === f.key ? 'var(--accent)' : 'var(--text-3)', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Add Task Panel */}
      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.75rem', borderTop: '2px solid var(--accent)' }}>
          <p className="label-caps" style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Create New Task</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 280px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Task Title *</label>
              <input
                autoFocus placeholder="What needs to be accomplished?" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                className="form-input"
              />
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="form-input">
                {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Tag</label>
              <select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} className="form-input">
                {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Due Date</label>
              <input type="date" value={form.dueDate} min={today()} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="form-input" />
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Recurring</label>
              <select value={form.recurring ? form.frequency : 'none'} onChange={e => setForm({ ...form, recurring: e.target.value !== 'none', frequency: e.target.value !== 'none' ? e.target.value : 'daily' })} className="form-input">
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={handleAddTask} className="btn-primary" style={{ height: '44px' }}>
                <Plus size={16} /> CREATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: '50vh' }}>
        {kanbanColumns.map(col => (
          <div key={col.id} style={{
            flex: '1 0 320px',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '20px',
            border: `1px solid ${col.id === 'priority' ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
            display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 260px)',
          }}>
            {/* Column Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: col.id === 'priority' ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)', borderRadius: '20px 20px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{col.emoji}</span>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, color: col.color }}>{col.label}</h3>
              </div>
              <span style={{ fontSize: '0.7rem', background: 'var(--bg-elevated)', padding: '3px 10px', borderRadius: '10px', color: 'var(--text-3)', fontWeight: 800 }}>{col.items.length}</span>
            </div>

            {/* Cards */}
            <div style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {col.items.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>
                  {col.id === 'done' ? 'Complete tasks to see them here' : 'No tasks in this lane'}
                </div>
              ) : (
                col.items.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={storeDeleteTask}
                    onComplete={storeCompleteTask}
                    onReopen={storeReopenTask}
                    onUpdate={storeUpdateTask}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
