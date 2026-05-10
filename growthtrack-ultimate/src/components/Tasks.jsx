import React, { useState, useMemo } from 'react';
import useStore, {
  selectAddTask, selectCompleteTask, selectDeleteTask, selectUpdateTask, selectReopenTask
} from '../store/useStore';
import { Plus, Check, Trash2, RotateCcw, Edit3, X, Flag, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const PRIORITIES = [
  { value: 'high',   label: 'High',   color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30' },
  { value: 'low',    label: 'Low',    color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
];

const CATEGORIES = ['Work', 'Personal', 'Health', 'Finance', 'Learning', 'Other'];

function dueDateColor(dateStr) {
  if (!dateStr) return 'text-gray-500';
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return 'text-red-400';      // overdue
  if (dateStr === today) return 'text-amber-400';   // due today
  const diff = (new Date(dateStr) - new Date(today)) / 86400000;
  if (diff <= 3) return 'text-orange-400';           // due soon
  return 'text-gray-500';                            // future
}

function dueDateLabel(dateStr) {
  if (!dateStr) return '';
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return `Overdue · ${dateStr}`;
  if (dateStr === today) return 'Due today';
  const diff = Math.ceil((new Date(dateStr) - new Date(today)) / 86400000);
  if (diff === 1) return 'Due tomorrow';
  if (diff <= 7) return `Due in ${diff} days`;
  return `Due ${dateStr}`;
}

export default function Tasks() {
  const tasks        = useStore(s => s.user?.tasks);
  const addTask      = useStore(selectAddTask);
  const completeTask = useStore(selectCompleteTask);
  const deleteTask   = useStore(selectDeleteTask);
  const updateTask   = useStore(selectUpdateTask);
  const reopenTask   = useStore(selectReopenTask);
  const toast        = useToast();

  const pending   = tasks?.pending   || [];
  const completed = tasks?.completed || [];

  const [tab, setTab]     = useState('pending');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [filter, setFilter]     = useState('all');
  const [sortBy, setSortBy]     = useState('created');

  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', category: 'Work', dueDate: '',
  });

  const resetForm = () => {
    setForm({ title: '', description: '', priority: 'medium', category: 'Work', dueDate: '' });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editId) {
      updateTask(editId, form);
      toast.success('Task updated');
    } else {
      await addTask({ ...form, createdAt: new Date().toISOString() });
      toast.success('Task added');
    }
    resetForm();
  };

  const startEdit = (task) => {
    setForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      category: task.category || 'Work',
      dueDate: task.dueDate || '',
    });
    setEditId(task.id);
    setShowForm(true);
    setTab('pending');
  };

  const today = new Date().toISOString().slice(0, 10);

  const filteredPending = useMemo(() => {
    let list = [...pending];
    if (filter === 'overdue')  list = list.filter(t => t.dueDate && t.dueDate < today);
    if (filter === 'today')    list = list.filter(t => t.dueDate === today);
    if (filter === 'high')     list = list.filter(t => t.priority === 'high');
    if (sortBy === 'priority') list.sort((a, b) => (['high','medium','low'].indexOf(a.priority) - ['high','medium','low'].indexOf(b.priority)));
    if (sortBy === 'due')      list.sort((a, b) => (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1);
    return list;
  }, [pending, filter, sortBy, today]);

  const overdueCt = pending.filter(t => t.dueDate && t.dueDate < today).length;
  const todayCt   = pending.filter(t => t.dueDate === today).length;

  return (
    <div className="space-y-5 p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Tasks</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {pending.length} pending
            {overdueCt > 0 && <span className="text-red-400 ml-2">· {overdueCt} overdue</span>}
            {todayCt > 0 && <span className="text-amber-400 ml-2">· {todayCt} due today</span>}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); if (editId) resetForm(); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white">{editId ? 'Edit Task' : 'New Task'}</p>
          <input
            type="text"
            placeholder="Task title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-400"
            autoFocus
          />
          <textarea
            rows={2}
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-400 resize-none"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
              >
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="px-3 py-1.5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition">
              {editId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
        {[['pending', `Pending (${pending.length})`], ['completed', `Done (${completed.length})`]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === id ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* Pending filters + sort */}
      {tab === 'pending' && (
        <div className="flex flex-wrap gap-2">
          {[['all','All'], ['overdue','Overdue'], ['today','Today'], ['high','High Priority']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                filter === v ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'border-white/10 text-gray-500 hover:border-white/20'
              }`}
            >
              {l}{v === 'overdue' && overdueCt > 0 ? ` (${overdueCt})` : ''}
              {v === 'today' && todayCt > 0 ? ` (${todayCt})` : ''}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Sort:</span>
            {[['created','Created'],['priority','Priority'],['due','Due']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSortBy(v)}
                className={`px-2 py-1 rounded-lg text-xs border transition ${
                  sortBy === v ? 'border-white/30 text-white' : 'border-white/10 text-gray-600 hover:text-gray-400'
                }`}
              >{l}</button>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {tab === 'pending' && filteredPending.map(task => {
          const prio = PRIORITIES.find(p => p.value === task.priority) || PRIORITIES[1];
          const ddColor = dueDateColor(task.dueDate);
          const ddLabel = dueDateLabel(task.dueDate);
          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition group ${
                task.dueDate && task.dueDate < today
                  ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/8'
                  : task.dueDate === today
                  ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/8'
                  : 'border-white/8 bg-white/4 hover:bg-white/7'
              }`}
            >
              {/* Complete button */}
              <button
                onClick={() => { completeTask(task.id); toast.success('Task completed! ✓'); }}
                className="mt-0.5 w-5 h-5 rounded-full border-2 border-white/30 flex-shrink-0 hover:border-emerald-400 hover:bg-emerald-500/10 transition"
                title="Mark complete"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white leading-snug">{task.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${prio.bg} ${prio.color}`}>
                    {prio.label}
                  </span>
                  {task.category && (
                    <span className="text-xs text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{task.category}</span>
                  )}
                </div>
                {task.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>}
                {ddLabel && (
                  <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${ddColor}`}>
                    <Clock size={10} /> {ddLabel}
                  </p>
                )}
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                <button
                  onClick={() => startEdit(task)}
                  className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-amber-400 hover:border-amber-500/30 transition"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  onClick={() => { deleteTask(task.id, 'pending'); toast.info('Task deleted'); }}
                  className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {tab === 'completed' && completed.map(task => (
          <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/6 bg-white/3 group">
            <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center flex-shrink-0">
              <Check size={10} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 line-through">{task.title}</p>
              {task.completedAt && (
                <p className="text-xs text-gray-600 mt-0.5">Completed {task.completedAt.slice(0, 10)}</p>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
              <button
                onClick={() => { reopenTask(task.id); toast.info('Task reopened'); }}
                className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-blue-400 hover:border-blue-500/30 transition"
                title="Reopen"
              >
                <RotateCcw size={12} />
              </button>
              <button
                onClick={() => { deleteTask(task.id, 'completed'); toast.info('Task deleted'); }}
                className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}

        {tab === 'pending' && filteredPending.length === 0 && (
          <div className="text-center py-10 text-gray-600">
            <p className="text-sm">{filter !== 'all' ? 'No tasks match this filter.' : 'No pending tasks. Add one above!'}</p>
          </div>
        )}
        {tab === 'completed' && completed.length === 0 && (
          <div className="text-center py-10 text-gray-600">
            <p className="text-sm">No completed tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
