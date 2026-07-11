import { StateCreator } from 'zustand';
import { apiSync } from '../useStore';
import { MetricLog } from '../../schemas';

export interface HealthSlice {
  metric_logs: MetricLog[];
  nutrition_logs: any[];
  saveMetricLog: (log: Partial<MetricLog>) => Promise<void>;
  addMetricLog: (log: Partial<MetricLog>) => Promise<void>;
  addNutritionLog: (log: any) => Promise<void>;
  deleteNutritionLog: (id: string) => void;
  updateNutritionLog: (id: string, updates: any) => void;
  updateHealthExtras: (data: any) => Promise<void>;
}

export const createHealthSlice: StateCreator<any, [], [], HealthSlice> = (set) => ({
  metric_logs: [],
  nutrition_logs: [],

  saveMetricLog: async (log) => {
    const res = await apiSync('/metric_logs', 'POST', log);
    set((state: any) => ({ metric_logs: [{ ...log, id: res?.id ?? Date.now().toString() }, ...state.metric_logs] }));
  },
  addMetricLog: async (log) => {
    const res = await apiSync('/metric_logs', 'POST', log);
    set((state: any) => ({ metric_logs: [{ ...log, id: res?.id ?? Date.now().toString() }, ...state.metric_logs] }));
  },

  addNutritionLog: async (log) => {
    const payload = { ...log, id: log.id || Date.now().toString(), logged_at: log.logged_at || new Date().toISOString(), date: log.date || new Date().toISOString().slice(0, 10) };
    const res = await apiSync('/nutrition_logs', 'POST', payload);
    const id = res?.id || payload.id;
    set((state: any) => ({ nutrition_logs: [{ ...payload, id }, ...state.nutrition_logs] }));
  },
  deleteNutritionLog: (id) => {
    apiSync(`/nutrition_logs/${id}`, 'DELETE');
    set((state: any) => ({ nutrition_logs: state.nutrition_logs.filter((l: any) => l.id !== id) }));
  },
  updateNutritionLog: (id, updates) => {
    apiSync(`/nutrition_logs/${id}`, 'PUT', updates);
    set((state: any) => ({ nutrition_logs: state.nutrition_logs.map((l: any) => l.id === id ? { ...l, ...updates } : l) }));
  },

  updateHealthExtras: async (data) => {
    set((state: any) => ({ health_extras: { ...(state.health_extras || {}), ...data } }));
    await apiSync('/health_extras', 'PUT', data);
  },
});
