import fs from 'fs';
let content = fs.readFileSync('src/components/Tasks.jsx', 'utf8');

// 1. FixedSizeList import
if(!content.includes('import { FixedSizeList as List }')) {
  content = content.replace(import EmptyState from './ui/EmptyState';, import EmptyState from './ui/EmptyState';\nimport { FixedSizeList as List } from '../lib/FixedSizeList';);
}

// 2. handleSubmit optimistic UI
content = content.replace(      // PATCH to API
      try {
        await apiSync(\/tasks/\\, 'PATCH', form);
        setDbTasks(prev => prev ? prev.map(t => t.id === editId ? { ...t, ...form } : t) : null);
        toast.success('Task updated');
      } catch {
        storeUpdateTask(editId, form);
        toast.success('Task updated (local)');
      },       // PATCH to API (Optimistic)
      setDbTasks(prev => prev ? prev.map(t => t.id === editId ? { ...t, ...form } : t) : null);
      try {
        await apiSync(\/tasks/\\, 'PATCH', form);
        toast.success('Task updated');
      } catch {
        storeUpdateTask(editId, form);
        toast.success('Task updated (local)');
      });

content = content.replace(      const payload = { ...form, status: 'pending', subtasks: [], created_at: new Date().toISOString() };
      try {
        const created = await apiSync('/tasks', 'POST', payload);
        const newTask = created?.id ? created : { ...payload, id: Date.now() };
        setDbTasks(prev => prev ? [newTask, ...prev] : [newTask]);
        toast.success('Task added');
      } catch {
        await storeAddTask(payload);
        toast.success('Task added (local)');
      },       const payload = { ...form, status: 'pending', subtasks: [], created_at: new Date().toISOString() };
      const tempId = Date.now();
      const newTask = { ...payload, id: tempId };
      setDbTasks(prev => prev ? [newTask, ...prev] : [newTask]); // Optimistic UI
      try {
        const created = await apiSync('/tasks', 'POST', payload);
        if (created?.id) {
          setDbTasks(prev => prev ? prev.map(t => t.id === tempId ? created : t) : null);
        }
        toast.success('Task added');
      } catch {
        await storeAddTask(newTask);
        toast.success('Task added (local)');
      });

// 3. handleComplete optimistic UI
content = content.replace(  const handleComplete = useCallback(async (id) => {
    try {
      await apiSync(\/tasks/\\, 'PATCH', { status: 'done', completed_at: new Date().toISOString() });
      setDbTasks(prev => prev ? prev.map(t => t.id === id
        ? { ...t, status: 'done', completed_at: new Date().toISOString() } : t) : null);
    } catch { storeCompleteTask(id); }
    toast.success('Task completed! ?');
  }, [storeCompleteTask, toast]);,   const handleComplete = useCallback(async (id) => {
    const ts = new Date().toISOString();
    setDbTasks(prev => prev ? prev.map(t => t.id === id ? { ...t, status: 'done', completed_at: ts } : t) : null); // Optimistic UI
    try {
      await apiSync(\/tasks/\\, 'PATCH', { status: 'done', completed_at: ts });
    } catch { storeCompleteTask(id); }
    toast.success('Task completed! ?');
  }, [storeCompleteTask, toast]););

// 4. handleDelete optimistic UI
content = content.replace(  const handleDelete = useCallback(async (id, bucket) => {
    const taskToRestore = allTasks.find(t => t.id === id);
    try {
      await apiSync(\/tasks/\\, 'DELETE');
      setDbTasks(prev => prev ? prev.filter(t => t.id !== id) : null);
    } catch { storeDeleteTask(id, bucket); },   const handleDelete = useCallback(async (id, bucket) => {
    const taskToRestore = allTasks.find(t => t.id === id);
    setDbTasks(prev => prev ? prev.filter(t => t.id !== id) : null); // Optimistic UI
    try {
      await apiSync(\/tasks/\\, 'DELETE');
    } catch { storeDeleteTask(id, bucket); });

// 5. handleReopen optimistic UI
content = content.replace(  const handleReopen = useCallback(async (id) => {
    try {
      await apiSync(\/tasks/\\, 'PATCH', { status: 'pending', completed_at: null });
      setDbTasks(prev => prev ? prev.map(t => t.id === id ? { ...t, status: 'pending', completed_at: null } : t) : null);
    } catch { storeReopenTask(id); }
    toast.info('Task reopened');
  }, [storeReopenTask, toast]);,   const handleReopen = useCallback(async (id) => {
    setDbTasks(prev => prev ? prev.map(t => t.id === id ? { ...t, status: 'pending', completed_at: null } : t) : null); // Optimistic UI
    try {
      await apiSync(\/tasks/\\, 'PATCH', { status: 'pending', completed_at: null });
    } catch { storeReopenTask(id); }
    toast.info('Task reopened');
  }, [storeReopenTask, toast]););

fs.writeFileSync('src/components/Tasks.jsx', content);
