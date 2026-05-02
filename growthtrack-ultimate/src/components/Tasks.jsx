import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, AlertCircle, RefreshCw, CheckCircle2, Circle, Clock, Tag, MoreHorizontal } from 'lucide-react';
import useStore, { selectAddTask, selectDeleteTask, selectCompleteTask } from '../store/useStore';

const PRIORITIES = [
  { key: 'High', label: 'High', color: '#ef4444' },
  { key: 'Medium', label: 'Med', color: '#f59e0b' },
  { key: 'Low', label: 'Low', color: '#10b981' },
];
const TAGS = ['fitness','finance','work','personal','health','learning'];

const today = () => new Date().toISOString().slice(0,10);
const isOverdue = (task) => !task.done && task.dueDate && task.dueDate < today();

export default function Tasks({ user }) {
  const storeAddTask = useStore(selectAddTask);
  const storeDeleteTask = useStore(selectDeleteTask);
  const storeCompleteTask = useStore(selectCompleteTask);

  const tasks = user?.tasks || { pending:[], completed:[], recurring:[] };
  const [form, setForm] = useState({title:'',priority:'Medium',dueDate:'',tag:'personal',recurring:false,frequency:'daily'});
  const [showAdd, setShowAdd] = useState(false);

  const handleAddTask = async () => {
    if (!form.title.trim()) return;
    await storeAddTask({ ...form });
    setForm({title:'',priority:'Medium',dueDate:'',tag:'personal',recurring:false,frequency:'daily'});
    setShowAdd(false);
  };

  const kanbanColumns = [
    { id: 'todo', label: 'To Do', items: (tasks.pending||[]).filter(t => t.priority !== 'High') },
    { id: 'priority', label: 'Priority', items: (tasks.pending||[]).filter(t => t.priority === 'High') },
    { id: 'done', label: 'Completed', items: (tasks.completed||[]).slice(0, 20) },
  ];

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Task Flow Matrix</p>
          <h2 className="text-display" style={{ fontSize: '2.4rem', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <CheckSquare size={32} color="var(--accent)" /> Kanban Board
          </h2>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={18} /> {showAdd ? 'HIDE EDITOR' : 'NEW TASK'}
        </button>
      </div>

      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '2rem', borderTop: '2px solid var(--accent)', animation: 'fadeInUp 0.3s ease' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Task Objective</label>
              <input 
                placeholder="What needs to be done?" 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()} 
                className="form-input" 
                style={{ background: 'var(--bg-dark)', borderRadius: '12px' }}
              />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="form-input" style={{ background: 'var(--bg-dark)', borderRadius: '12px' }}>
                {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Context/Tag</label>
              <select value={form.tag} onChange={e => setForm({...form, tag: e.target.value})} className="form-input" style={{ background: 'var(--bg-dark)', borderRadius: '12px' }}>
                {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Deadline</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="form-input" style={{ background: 'var(--bg-dark)', borderRadius: '12px' }}/>
            </div>
            <button onClick={handleAddTask} className="btn-primary" style={{ height: '48px', marginTop: '22px' }}>INITIALIZE TASK</button>
          </div>
        </div>
      )}

      <div className="kanban-board" style={{ 
        display: 'flex', 
        gap: '1.5rem', 
        flex: 1, 
        overflowX: 'auto', 
        paddingBottom: '1rem',
        minHeight: '60vh'
      }}>
        {kanbanColumns.map(col => (
          <div key={col.id} className="kanban-column" style={{ 
            flex: '1 0 350px', 
            background: 'rgba(0,0,0,0.15)', 
            borderRadius: '24px', 
            border: col.id === 'priority' ? '1px solid var(--accent-soft)' : '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 250px)'
          }}>
            <div style={{ 
              padding: '1.5rem', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: col.id === 'priority' ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)',
              borderRadius: '24px 24px 0 0'
            }}>
              <h3 className="text-display" style={{ fontSize: '1rem', margin: 0, color: col.id === 'priority' ? 'var(--accent)' : 'var(--text-1)' }}>{col.label}</h3>
              <span style={{ fontSize: '0.75rem', background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: '12px', color: 'var(--text-2)', fontWeight: 800 }}>{col.items.length} UNITS</span>
            </div>
            
            <div className="kanban-items" style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {col.items.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', opacity: 0.3, fontSize: '0.85rem' }}>No active signals.</div>
              ) : (
                col.items.map(task => (
                  <div key={task.id} className="glass-card" style={{ 
                    padding: '1.25rem', 
                    cursor: 'default', 
                    borderLeft: `4px solid ${task.done ? 'var(--success)' : (PRIORITIES.find(p=>p.key===task.priority)?.color || 'var(--border)')}`,
                    boxShadow: 'var(--shadow-card)',
                    borderRadius: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.95rem', fontWeight: 800, color: task.done ? 'var(--text-3)' : 'var(--text-1)', textDecoration: task.done ? 'line-through' : 'none', lineHeight: 1.5 }}>
                        {task.title}
                      </p>
                      <button 
                        onClick={() => storeDeleteTask(task.id, task.done ? 'completed' : 'pending')} 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '6px', background: 'var(--bg-dark)', color: 'var(--accent)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {task.tag}
                      </span>
                      {task.dueDate && (
                        <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px', color: isOverdue(task) ? 'var(--danger)' : 'var(--text-3)', fontWeight: 600 }}>
                          <Clock size={12} /> {task.dueDate}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {!task.done && (
                        <button 
                          onClick={() => storeCompleteTask(task.id)} 
                          className="btn-primary" 
                          style={{ padding: '8px 16px', fontSize: '0.7rem', borderRadius: '8px', background: 'var(--success)', color: '#000' }}
                        >
                          <CheckCircle2 size={14} /> COMPLETE
                        </button>
                      )}
                      {task.done && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 800, fontSize: '0.75rem' }}><CheckCircle2 size={16} /> RESOLVED</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
