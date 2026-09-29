import { StateCreator } from 'zustand';
import { apiSync } from '../useStore';
import { Task } from '../../schemas';
import { logCRUD } from '../../lib/logger';
import { captureSession, createWriteQueue, requireRecord, requireAcknowledgement, recordFields, mutationPayload } from '../persistence';

export interface TaskSlice {
  addTask: (task: Partial<Task>) => Promise<any>;
  deleteTask: (id: string, list?: string) => Promise<any>;
  completeTask: (id: string) => Promise<any>;
  updateTask: (id: string, updates: Partial<Task> | ((task: any) => any)) => Promise<any>;
  reopenTask: (id: string) => Promise<any>;
  fetchTasks: () => Promise<any[]>;
}

export const taskIsDone = (task: any) => Boolean(task?.done || ['done', 'completed'].includes(String(task?.status || '').toLowerCase()));
const sameId = (a: any, b: any) => String(a) === String(b);
const taskLists = (state: any) => state.user?.tasks || { pending: [], completed: [] };
const findTask = (state: any, id: any) => [...(taskLists(state).pending || []), ...(taskLists(state).completed || [])].find(t => sameId(t.id, id));

function placeTask(state: any, id: any, task: any, position = 0) {
  const lists = taskLists(state);
  const pending = (lists.pending || []).filter((t: any) => !sameId(t.id, id));
  const completed = (lists.completed || []).filter((t: any) => !sameId(t.id, id));
  if (task) {
    const bucket = taskIsDone(task) ? completed : pending;
    bucket.splice(Math.min(position, bucket.length), 0, task);
  }
  return { user: { ...state.user, tasks: { ...lists, pending, completed } } };
}

export const createTaskSlice: StateCreator<any, [], [], TaskSlice> = (set, get) => {
  const queue = createWriteQueue();
  let revision = 0;
  let writesPending = 0;
  const write = (key: string, operation: () => Promise<any>) => {
    writesPending += 1;
    return queue(key, async () => {
      try { return await operation(); }
      finally { writesPending -= 1; revision += 1; }
    });
  };
  const audit = (action: 'create' | 'update' | 'delete', task: any) => {
    void logCRUD(action, 'tasks', task.id, `Task ${action}: ${task.title || 'Untitled'}`).catch(error => console.error('[tasks] audit failed', error));
  };
  const mutate = (id: string, updates: any, remove = false) => {
    const isCurrent = captureSession(get);
    revision += 1;
    return write(`${get()._sessionVersion}:${get().user?.id}:${id}`, async () => {
      if (!isCurrent()) throw new Error('The session changed. Refresh and try again.');
      const previous = findTask(get(), id);
      if (!previous) throw new Error('Task not found. Refresh and try again.');
      const bucket = taskIsDone(previous) ? 'completed' : 'pending';
      const index = (taskLists(get())[bucket] || []).indexOf(previous);
      const patch = typeof updates === 'function' ? updates(previous) : updates;
      const optimistic = remove ? null : { ...previous, ...patch };
      set((state: any) => placeTask(state, id, optimistic, index));
      try {
        const response = requireAcknowledgement(await apiSync(`/tasks/${encodeURIComponent(id)}`, remove ? 'DELETE' : 'PUT', mutationPayload(previous, remove ? {} : patch)));
        const saved = remove ? response : { ...optimistic, ...recordFields(response) };
        if (isCurrent() && !remove && findTask(get(), id) === optimistic) set((state: any) => placeTask(state, id, saved, index));
        if (isCurrent()) audit(remove ? 'delete' : 'update', previous);
        return saved;
      } catch (error) {
        if (isCurrent() && findTask(get(), id) === (optimistic || undefined)) set((state: any) => placeTask(state, id, previous, index));
        throw error;
      } finally { revision += 1; }
    });
  };
  return {
    addTask: (task) => {
      const isCurrent = captureSession(get);
      revision += 1;
      return write(`${get()._sessionVersion}:${get().user?.id}:create`, async () => {
        if (!isCurrent()) throw new Error('The session changed. Refresh and try again.');
        try {
          const response = requireRecord(await apiSync('/tasks', 'POST', task));
          const saved = { ...task, ...response };
          if (isCurrent()) { set((state: any) => placeTask(state, saved.id, saved)); audit('create', saved); }
          return saved;
        } finally { revision += 1; }
      });
    },
    deleteTask: (id) => mutate(id, null, true),
    updateTask: (id, updates) => mutate(id, updates),
    completeTask: (id) => mutate(id, () => {
      const completedAt = new Date().toISOString();
      return { done: true, status: 'done', completedAt, completed_at: completedAt };
    }),
    reopenTask: (id) => mutate(id, { done: false, status: 'pending', completedAt: null, completed_at: null }),
    fetchTasks: async () => {
      const isCurrent = captureSession(get);
      const startedAt = revision;
      const rows = await apiSync('/tasks', 'GET');
      if (!Array.isArray(rows)) throw new Error('The server returned an invalid task list.');
      if (isCurrent() && !writesPending && revision === startedAt) set((state: any) => ({ user: { ...state.user, tasks: { ...taskLists(state), pending: rows.filter(t => !taskIsDone(t)), completed: rows.filter(taskIsDone) } } }));
      return rows;
    },
  };
};
