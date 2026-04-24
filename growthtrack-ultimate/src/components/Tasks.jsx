import React, { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { CheckSquare, Plus, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

const PRIORITIES = [
  { key: 'High',   label: '🔴 High',   color: '#ef4444' },
  { key: 'Medium', label: '🟡 Medium', color: '#f59e0b' },
  { key: 'Low',    label: '🟢 Low',    color: '#10b981' },
];
const TAGS = ['fitness', 'finance', 'work', 'personal', 'health', 'learning'];
const FREQS = ['daily', 'weekly'];

const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (task) => !task.done && task.dueDate && task.dueDate < today();

export default function Tasks({ user, updateSection }) {
  const tasks = user?.tasks || { pending: [], completed: [], recurring: [] };
  const [form, setForm] = useState({ title: '', priority: 'Medium', dueDate: '', tag: 'personal', recurring: false, frequency: 'daily' });
  const [tab, setTab] = useState('pending');

  const addTask = () => {
    if (!form.title.trim()) return;
    const newTask = { ...form, done: false, id: Date.now() };
    if (form.recurring) {
      updateSection('tasks', {
        recurring: [...(tasks.recurring || []), { id: Date.now(), title: form.title, frequency: form.frequency, lastDone: null }],
        pending: [...(tasks.pending || []), newTask],
      });
    } else {
      updateSection('tasks', { pending: [...(tasks.pending || []), newTask] });
    }
    setForm({ title: '', priority: 'Medium', dueDate: '', tag: 'personal', recurring: false, frequency: 'daily' });
  };

  const completeTask = (id) => {
    const task = (tasks.pending || []).find(t => t.id === id);
    if (!task) return;
    updateSection('tasks', {
      pending: (tasks.pending || []).filter(t => t.id !== id),
      completed: [...(tasks.completed || []), { ...task, done: true, completedAt: new Date().toISOString() }],
    });
  };

  const deleteTask = (id, list) => {
    updateSection('tasks', { [list]: (tasks[list] || []).filter(t => t.id !== id) });
  };

  const lanes = PRIORITIES.map(p => ({
    ...p,
    items: (tasks.pending || []).filter(t => t.priority === p.key),
  }));

  return (
    <div className="fade-in">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>Task Manager</h2>
        <p className="text-secondary">Priority lanes — stay on top of everything.</p>
      </div>

      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.75rem' }}>Quick Add</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input placeholder="Task title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            style={{ gridColumn: '1 / -1', padding: '0.55rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem' }} />
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
            style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }}>
            {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}
            style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }}>
            {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
            style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} />
            <RefreshCw size={14} /> Recurring
          </label>
          {form.recurring && (
            <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
              style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }}>
              {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
        </div>
        <button onClick={addTask}
          style={{ padding: '0.5rem 1.25rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['pending', 'completed', 'recurring'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '0.4rem 0.9rem', background: tab === t ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)', color: tab === t ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize' }}>
            {t} {t !== 'recurring' && <span style={{ opacity: 0.7 }}>({(tasks[t] || []).length})</span>}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem' }}>
          {lanes.map(lane => (
            <div key={lane.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: lane.color, display: 'inline-block' }} />
                <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{lane.label}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({lane.items.length})</span>
              </div>
              {lane.items.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>No {lane.key.toLowerCase()} tasks</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {lane.items.map(task => (
                  <div key={task.id} style={{
                    background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '10px',
                    border: isOverdue(task) ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border-light)',
                    boxShadow: isOverdue(task) ? '0 0 8px rgba(239,68,68,0.15)' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {isOverdue(task) && <AlertCircle size={12} color="#ef4444" />}
                          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{task.title}</p>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {task.tag} {task.dueDate && `· Due ${task.dueDate}`}{task.recurring && ' · ↻'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem', marginLeft: '0.5rem' }}>
                        <button onClick={() => completeTask(task.id)}
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer' }}>
                          <CheckSquare size={14} />
                        </button>
                        <button onClick={() => deleteTask(task.id, 'pending')}
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'completed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(tasks.completed || []).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No completed tasks yet.</p>}
          {(tasks.completed || []).slice().reverse().map(task => (
            <div key={task.id} style={{ background: 'rgba(16,185,129,0.05)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, textDecoration: 'line-through', color: 'var(--text-muted)' }}>{task.title}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{task.tag} · {task.completedAt?.slice(0, 10)}</p>
              </div>
              <button onClick={() => deleteTask(task.id, 'completed')}
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'recurring' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(tasks.recurring || []).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recurring tasks. Add one above with the Recurring toggle.</p>}
          {(tasks.recurring || []).map(r => (
            <div key={r.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.title}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>↻ {r.frequency} · Last done: {r.lastDone || 'never'}</p>
              </div>
              <button onClick={() => deleteTask(r.id, 'recurring')}
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
