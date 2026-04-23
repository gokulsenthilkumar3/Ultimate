import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, Calendar, Tag } from 'lucide-react';

const Tasks = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Morning Run 5km', category: 'Fitness', priority: 'High', dueDate: '2026-04-25', status: 'Pending', tags: ['exercise', 'cardio'] },
    { id: 2, title: 'Meal prep for the week', category: 'Nutrition', priority: 'Medium', dueDate: '2026-04-23', status: 'In Progress', tags: ['nutrition'] },
    { id: 3, title: 'Buy gym membership', category: 'General', priority: 'High', dueDate: '2026-04-24', status: 'Pending', tags: ['gym'] }
  ]);
  const [newTask, setNewTask] = useState({ title: '', category: '', priority: 'Medium', dueDate: '', status: 'Pending' });
  const [filter, setFilter] = useState('All');

  const categories = ['Fitness', 'Nutrition', 'General', 'Learning', 'Finance', 'Health'];
  const priorities = ['High', 'Medium', 'Low'];
  const statuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

  const addTask = () => {
    if (newTask.title.trim()) {
      setTasks([...tasks, { ...newTask, id: Date.now(), tags: [] }]);
      setNewTask({ title: '', category: '', priority: 'Medium', dueDate: '', status: 'Pending' });
    }
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateStatus = (id, status) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'Pending': return '#f59e0b';
      case 'Cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);
  const completed = tasks.filter(t => t.status === 'Completed').length;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', marginBottom: '10px' }}>
          <CheckSquare size={28} color="#10b981" />
          To-Do Tasks
        </h2>
        <p style={{ color: '#94a3b8' }}>Manage your daily tasks and goals</p>
      </div>

      {/* Progress Bar */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '25px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Progress: {completed}/{tasks.length} completed</span>
          <span style={{ color: '#10b981', fontWeight: 'bold' }}>{tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0}%</span>
        </div>
        <div style={{ height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}>
          <div style={{
            height: '100%',
            width: `${tasks.length > 0 ? (completed/tasks.length)*100 : 0}%`,
            background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
            borderRadius: '5px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Add New Task */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '20px', 
        borderRadius: '12px',
        marginBottom: '25px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>Add New Task</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '14px' }}
          />
          <select
            value={newTask.category}
            onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '14px' }}
          >
            <option value="">Select category</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '14px' }}
          >
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            type="date"
            value={newTask.dueDate}
            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '14px' }}
          />
        </div>
        <button
          onClick={addTask}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}
        >
          <Plus size={18} /> Add Task
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        {['All', ...statuses].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: `1px solid ${filter === s ? getStatusColor(s) : 'rgba(255,255,255,0.2)'}`,
            background: filter === s ? `${getStatusColor(s)}33` : 'transparent',
            color: filter === s ? getStatusColor(s) : '#94a3b8',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            {s} {s !== 'All' && `(${tasks.filter(t => t.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {filteredTasks.map(task => (
          <div key={task.id} style={{
            background: task.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            padding: '20px',
            borderRadius: '12px',
            border: `1px solid ${task.status === 'Completed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <h4 style={{ 
                  fontSize: '18px', margin: 0,
                  textDecoration: task.status === 'Completed' ? 'line-through' : 'none',
                  color: task.status === 'Completed' ? '#64748b' : 'white'
                }}>{task.title}</h4>
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: getPriorityColor(task.priority), color: 'white' }}>{task.priority}</span>
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', background: `${getStatusColor(task.status)}33`, color: getStatusColor(task.status), border: `1px solid ${getStatusColor(task.status)}66` }}>{task.status}</span>
              </div>
              <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#94a3b8', alignItems: 'center', flexWrap: 'wrap' }}>
                {task.category && (<span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Tag size={12} />{task.category}</span>)}
                {task.dueDate && (<span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={12} />Due: {task.dueDate}</span>)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={task.status}
                onChange={(e) => updateStatus(task.id, e.target.value)}
                style={{ padding: '6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '12px' }}
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={() => deleteTask(task.id)}
                style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <CheckSquare size={64} style={{ opacity: 0.3, marginBottom: '20px' }} />
          <p style={{ fontSize: '18px' }}>No tasks found</p>
        </div>
      )}
    </div>
  );
};

export default Tasks;
