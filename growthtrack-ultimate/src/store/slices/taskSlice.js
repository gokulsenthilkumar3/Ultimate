import { apiSync } from '../useStore';

export const createTaskSlice = (set, get) => ({
  addTask: async (task) => {
    const res = await apiSync('/tasks', 'POST', task);
    if (res?.id) {
      set((state) => ({
        user: {
          ...state.user,
          tasks: {
            ...state.user.tasks,
            pending: [{ ...task, id: res.id, done: false }, ...(state.user?.tasks?.pending || [])],
          },
        },
      }));
    }
  },

  deleteTask: (id, list) => {
    apiSync(`/tasks/${id}`, 'DELETE');
    set((state) => ({
      user: {
        ...state.user,
        tasks: {
          ...state.user.tasks,
          [list]: (state.user?.tasks?.[list] || []).filter((t) => t.id !== id),
        },
      },
    }));
  },

  completeTask: (id) => {
    const task = get().user?.tasks?.pending?.find((t) => t.id === id);
    if (task) {
      const completedAt = new Date().toISOString();
      apiSync(`/tasks/${id}`, 'PUT', { done: true, completedAt });
      set((state) => ({
        user: {
          ...state.user,
          tasks: {
            ...state.user.tasks,
            pending: (state.user.tasks.pending || []).filter((t) => t.id !== id),
            completed: [{ ...task, done: true, completedAt }, ...(state.user.tasks.completed || [])],
          },
        },
      }));
    }
  },

  updateTask: (id, updates) => {
    apiSync(`/tasks/${id}`, 'PUT', updates);
    set((state) => {
      const tasks = state.user?.tasks || {};
      return {
        user: {
          ...state.user,
          tasks: {
            ...tasks,
            pending:   (tasks.pending   || []).map(t => t.id === id ? { ...t, ...updates } : t),
            completed: (tasks.completed || []).map(t => t.id === id ? { ...t, ...updates } : t),
          },
        },
      };
    });
  },

  reopenTask: (id) => {
    const task = get().user?.tasks?.completed?.find((t) => t.id === id);
    if (task) {
      apiSync(`/tasks/${id}`, 'PUT', { done: false, completedAt: null });
      set((state) => ({
        user: {
          ...state.user,
          tasks: {
            ...state.user.tasks,
            completed: (state.user.tasks.completed || []).filter(t => t.id !== id),
            pending: [{ ...task, done: false, completedAt: null }, ...(state.user.tasks.pending || [])],
          },
        },
      }));
    }
  },
});
