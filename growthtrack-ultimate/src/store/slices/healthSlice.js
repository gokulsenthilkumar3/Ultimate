import { apiSync } from '../useStore';

export const createHealthSlice = (set, get) => ({
  metric_logs: [],
  nutrition_logs: [],

  saveMetricLog: async (log) => {
    const res = await apiSync('/metric_logs', 'POST', log);
    set(state => ({ metric_logs: [{ ...log, id: res?.id ?? Date.now() }, ...state.metric_logs] }));
  },
  addMetricLog: async (log) => {
    const res = await apiSync('/metric_logs', 'POST', log);
    set(state => ({ metric_logs: [{ ...log, id: res?.id ?? Date.now() }, ...state.metric_logs] }));
  },

  addNutritionLog: async (log) => {
    const payload = { ...log, id: log.id || Date.now(), logged_at: log.logged_at || new Date().toISOString(), date: log.date || new Date().toISOString().slice(0, 10) };
    const res = await apiSync('/nutrition_logs', 'POST', payload);
    const id = res?.id || payload.id;
    set(state => ({ nutrition_logs: [{ ...payload, id }, ...state.nutrition_logs] }));
  },
  deleteNutritionLog: (id) => {
    apiSync(`/nutrition_logs/${id}`, 'DELETE');
    set(state => ({ nutrition_logs: state.nutrition_logs.filter(l => l.id !== id) }));
  },
  updateNutritionLog: (id, updates) => {
    apiSync(`/nutrition_logs/${id}`, 'PUT', updates);
    set(state => ({ nutrition_logs: state.nutrition_logs.map(l => l.id === id ? { ...l, ...updates } : l) }));
  },

  updateHealthExtras: async (data) => {
    set((state) => ({ health_extras: { ...(state.health_extras || {}), ...data } }));
    await apiSync('/health_extras', 'PUT', data);
  },
});
