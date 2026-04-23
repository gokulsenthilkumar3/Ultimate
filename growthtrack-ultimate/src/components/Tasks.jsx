import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, Calendar, Tag } from 'lucide-react';

const Tasks = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Morning Run 5km', category: 'Fitness', priority: 'High', dueDate: '2026-04-25', status: 'Pending' },
    { id: 2, title: 'Meal prep', category: 'Nutrition', priority: 'Medium', dueDate: '2026-04-23', status: 'In Progress' }
  ]);
  const [newTask, setNewTask] = useState({ title: '', category: '', priority: 'Medium', dueDate: '', status: 'Pending' });

  const categories = ['Fitness', 'Nutrition', 'General', 'Learning', 'Finance'];

  const addTask = () => {
    if (newTask.title.trim()) {
      setTasks([...tasks, { ...newTask, id: Date.now() }]);
      setNewTask({ title: '', category: '', priority: 'Medium', dueDate: '', status: 'Pending' });
    }
  };

  const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', marginBottom: '20px' }}>
        <CheckSquare size={28} color="#10b981" /> To-Do Tasks
      </h2>
      
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          <input type="text" placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }} />
          <select value={newTask.category} onChange={(e) => setNewTask({ ...newTask, category: e.target.value })} style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}>
            <option value="">Category</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }} />
        </div>
        <button onClick={addTask} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Add Task</button>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {tasks.map(task => (
          <div key={task.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0 }}>{task.title}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{task.category} • Due: {task.dueDate}</p>
            </div>
            <button onClick={() => deleteTask(task.id)} style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
