import React, { useState } from 'react';
import { Target, Plus, Trash2, TrendingUp, CheckCircle2, Edit3, Save, X, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';
import useStore, { 
  selectGoals, selectAddGoal, selectDeleteGoal, selectUpdateGoal 
} from '../store/useStore';

const CATEGORIES = ['Health', 'Fitness', 'Finance', 'Career', 'Learning', 'Personal', 'Relationships', 'Lifestyle'];
const EMPTY_FORM = { title: '', category: 'Health', target_value: '', current_value: 0, unit: '', deadline: '' };

function GoalCard({ goal, onUpdate, onDelete, onToggleDone }) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(goal.current_value || 0);
  const progress = goal.target_value > 0 ? Math.min(100, Math.round((current / goal.target_value) * 100)) : 0;
  const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && !goal.done;

  const handleUpdateProgress = async () => {
    await onUpdate(goal.id, { current_value: parseFloat(current) || 0 });
    setEditing(false);
  };

  return (
    <div className="glass-card" style={{
      padding: '1.5rem',
      borderTop: `3px solid ${goal.done ? 'var(--success)' : (isOverdue ? 'var(--danger)' : 'var(--accent)')}`,
      opacity: goal.done ? 0.7 : 1,
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '6px' }}>
            {goal.category}
          </span>
          <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)', marginTop: '8px', textDecoration: goal.done ? 'line-through' : 'none' }}>{goal.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onToggleDone(goal)} title={goal.done ? 'Reopen goal' : 'Mark as achieved'}
            style={{ background: goal.done ? 'rgba(52,211,153,0.1)' : 'none', border: 'none', cursor: 'pointer', color: goal.done ? 'var(--success)' : 'var(--text-3)', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'all 0.2s' }}
            onMouseEnter={e => !goal.done && (e.currentTarget.style.color = 'var(--success)')}
            onMouseLeave={e => !goal.done && (e.currentTarget.style.color = 'var(--text-3)')}>
            <CheckCircle2 size={16} />
          </button>
          <button onClick={() => onDelete(goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="number" value={current} onChange={e => setCurrent(e.target.value)}
                  style={{ width: '70px', background: 'var(--bg-dark)', border: '1px solid var(--accent)', borderRadius: '6px', color: 'var(--text-1)', padding: '2px 6px', fontSize: '0.8rem' }}
                  min="0" max={goal.target_value}
                />
                <span style={{ color: 'var(--text-3)' }}>/ {goal.target_value} {goal.unit}</span>
                <button onClick={handleUpdateProgress} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', display: 'flex', padding: '2px' }}><Save size={14} /></button>
                <button onClick={() => { setCurrent(goal.current_value); setEditing(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '2px' }}><X size={14} /></button>
              </div>
            ) : (
              <span style={{ cursor: 'pointer' }} onClick={() => setEditing(true)}>
                {goal.current_value || 0} / {goal.target_value} {goal.unit}
                <Edit3 size={11} style={{ marginLeft: '6px', opacity: 0.5 }} />
              </span>
            )}
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: goal.done ? 'var(--success)' : (progress >= 80 ? 'var(--success)' : 'var(--accent)') }}>
            {goal.done ? '✓ Done' : `${progress}%`}
          </span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: goal.done ? 'var(--success)' : (progress >= 80 ? 'var(--success)' : 'var(--accent)'), borderRadius: '4px', transition: 'width 0.6s var(--ease)' }} />
        </div>
      </div>

      {/* Footer meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {goal.deadline ? (
          <span style={{ fontSize: '0.7rem', color: isOverdue ? 'var(--danger)' : (daysLeft <= 7 ? 'var(--warning)' : 'var(--text-3)'), display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            {isOverdue && <AlertCircle size={11} />}
            {goal.done ? `Completed` : isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
          </span>
        ) : <span />}
        {progress === 100 && !goal.done && (
          <button onClick={() => onToggleDone(goal)} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.68rem', background: 'var(--success)', color: '#000' }}>
            Mark Done ✓
          </button>
        )}
      </div>
    </div>
  );
}

export default function GoalsDashboard() {
  const goals = useStore(selectGoals);
  const addGoalAction = useStore(selectAddGoal);
  const deleteGoalAction = useStore(selectDeleteGoal);
  const updateGoalAction = useStore(selectUpdateGoal);
  const isLoading = useStore(s => s.isLoading);

  const [form, setForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('active');
  const toast = useToast();

  const handleAddGoal = async () => {
    if (!form.title.trim()) return toast.error('Goal title is required');
    if (!form.target_value || isNaN(parseFloat(form.target_value))) return toast.error('Enter a valid target value');
    try {
      await addGoalAction({ 
        ...form, 
        target_value: parseFloat(form.target_value), 
        current_value: parseFloat(form.current_value) || 0 
      });
      setForm(EMPTY_FORM);
      setShowAdd(false);
      toast.success('Goal created!');
    } catch { toast.error('Failed to create goal'); }
  };

  const handleUpdateGoal = async (id, updates) => {
    try {
      await updateGoalAction(id, updates);
      toast.success('Goal updated');
    } catch { toast.error('Update failed'); }
  };

  const handleToggleDone = async (goal) => {
    await handleUpdateGoal(goal.id, { done: !goal.done });
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await deleteGoalAction(id);
      toast.success('Goal removed');
    } catch { toast.error('Delete failed'); }
  };

  const displayed = (goals || []).filter(g => filter === 'active' ? !g.done : filter === 'done' ? g.done : true);
  const totalGoals = goals.length;
  const doneCount = goals.filter(g => g.done).length;
  const activeCount = totalGoals - doneCount;
  const avgProgress = totalGoals ? Math.round(goals.filter(g => !g.done).reduce((a, g) => a + (g.target_value > 0 ? Math.min(100, (g.current_value / g.target_value) * 100) : 0), 0) / Math.max(1, activeCount)) : 0;

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Strategic OKRs</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Target size={28} color="var(--accent)" /> Goals Dashboard
          </h2>
          <p className="text-secondary" style={{ marginTop: '0.35rem' }}>
            {totalGoals} goals · {doneCount} achieved · {avgProgress}% avg progress
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X size={16} /> : <Plus size={16} />} {showAdd ? 'CANCEL' : 'NEW GOAL'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Goals', value: totalGoals, color: 'var(--accent)' },
          { label: 'Achieved', value: doneCount, color: 'var(--success)' },
          { label: 'In Progress', value: activeCount, color: 'var(--info)' },
          { label: 'Avg Progress', value: `${avgProgress}%`, color: avgProgress >= 70 ? 'var(--success)' : 'var(--warning)' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <p className="label-caps" style={{ marginBottom: '0.5rem' }}>{s.label}</p>
            <p className="text-display" style={{ fontSize: '1.8rem', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.75rem', borderTop: '2px solid var(--accent)' }}>
          <p className="label-caps" style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Define New Goal</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Goal Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Reach 75kg body weight" className="form-input" />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="form-input">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Target Value *</label>
              <input type="number" value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })} placeholder="100" className="form-input" min="0" />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Current</label>
              <input type="number" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} placeholder="0" className="form-input" min="0" />
            </div>
            <div style={{ flex: '1 1 80px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Unit</label>
              <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="kg, %, hrs" className="form-input" />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="form-input" min={new Date().toISOString().slice(0, 10)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={handleAddGoal} className="btn-primary"><TrendingUp size={16} /> CREATE</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[{ key: 'active', label: '🎯 Active' }, { key: 'done', label: '✅ Achieved' }, { key: 'all', label: 'All' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`, background: filter === f.key ? 'var(--accent-soft)' : 'transparent', color: filter === f.key ? 'var(--accent)' : 'var(--text-3)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.2s' }}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>Syncing goals…</div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={Target}
          title={filter === 'done' ? 'No achieved goals yet' : 'No active goals'}
          description={filter === 'done' ? 'Keep pushing, you will get there!' : 'Define what you want to achieve to get started.'}
          ctaLabel={filter !== 'done' ? 'Create a goal' : undefined}
          onAction={filter !== 'done' ? () => setShowAdd(true) : undefined}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {displayed.map(goal => (
            <GoalCard key={goal.id} goal={goal} onUpdate={handleUpdateGoal} onDelete={handleDeleteGoal} onToggleDone={handleToggleDone} />
          ))}
        </div>
      )}
    </div>
  );
}
