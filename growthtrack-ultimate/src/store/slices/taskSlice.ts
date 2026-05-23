import { StateCreator } from 'zustand';
import { apiSync } from '../useStore';
import { Task } from '../../schemas';

export interface TaskSlice {
  addTask: (task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string, list: string) => void;
  completeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  reopenTask: (id: string) => void;
}

export const createTaskSlice: StateCreator<any, [], [], TaskSlice> = (set, get) => ({
  addTask: async (task) => {
    const res = await apiSync('/tasks', 'POST', task);
    if (res?.id) {
      set((state: any) => ({
        user: {
          ...state.user,
          tasks: {
            ...state.user?.tasks,
            pending: [{ ...task, id: res.id, done: false }, ...(state.user?.tasks?.pending || [])],
          },
        },
      }));
    }
  },

  deleteTask: (id, list) => {
    apiSync(`/tasks/${id}`, 'DELETE');
    set((state: any) => ({
      user: {
        ...state.user,
        tasks: {
          ...state.user?.tasks,
          [list]: (state.user?.tasks?.[list] || []).filter((t: any) => t.id !== id),
        },
      },
    }));
  },

  completeTask: (id) => {
    const task = get().user?.tasks?.pending?.find((t: any) => t.id === id);
    if (task) {
      const completedAt = new Date().toISOString();
      apiSync(`/tasks/${id}`, 'PUT', { done: true, completedAt });
      set((state: any) => ({
        user: {
          ...state.user,
          tasks: {
            ...state.user?.tasks,
            pending: (state.user?.tasks?.pending || []).filter((t: any) => t.id !== id),
            completed: [{ ...task, done: true, completedAt }, ...(state.user?.tasks?.completed || [])],
          },
        },
      }));
    }
  },

  updateTask: (id, updates) => {
    apiSync(`/tasks/${id}`, 'PUT', updates);
    set((state: any) => {
      const tasks = state.user?.tasks || {};
      return {
        user: {
          ...state.user,
          tasks: {
            ...tasks,
            pending:   (tasks.pending   || []).map((t: any) => t.id === id ? { ...t, ...updates } : t),
            completed: (tasks.completed || []).map((t: any) => t.id === id ? { ...t, ...updates } : t),
          },
        },
      };
    });
  },

  reopenTask: (id) => {
    const task = get().user?.tasks?.completed?.find((t: any) => t.id === id);
    if (task) {
      apiSync(`/tasks/${id}`, 'PUT', { done: false, completedAt: null });
      set((state: any) => ({
        user: {
          ...state.user,
          tasks: {
            ...state.user?.tasks,
            completed: (state.user?.tasks?.completed || []).filter((t: any) => t.id !== id),
            pending: [{ ...task, done: false, completedAt: null }, ...(state.user?.tasks?.pending || [])],
          },
        },
      }));
    }
  },
});
