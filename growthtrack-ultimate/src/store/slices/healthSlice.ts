import { StateCreator } from 'zustand';
import { apiSync } from '../useStore';
import { MetricLog } from '../../schemas';
import { createRecordActions } from '../recordActions';
import { captureSession } from '../persistence';

export interface HealthSlice {
  metric_logs: MetricLog[];
  nutrition_logs: any[];
  saveMetricLog: (log: Partial<MetricLog>) => Promise<any>;
  addMetricLog: (log: Partial<MetricLog>) => Promise<any>;
  addNutritionLog: (log: any) => Promise<any>;
  deleteNutritionLog: (id: string) => Promise<any>;
  updateNutritionLog: (id: string, updates: any) => Promise<any>;
  updateHealthExtras: (data: any) => Promise<any>;
}

export const createHealthSlice: StateCreator<any, [], [], HealthSlice> = (set, get) => {
  const metrics = createRecordActions(set, get, 'metric_logs', '/metric_logs');
  const nutrition = createRecordActions(set, get, 'nutrition_logs', '/nutrition_logs');
  return ({
  metric_logs: [],
  nutrition_logs: [],

  saveMetricLog: metrics.add,
  addMetricLog: metrics.add,

  addNutritionLog: async (log) => {
    const payload = { ...log, id: log.id || Date.now().toString(), logged_at: log.logged_at || new Date().toISOString(), date: log.date || new Date().toISOString().slice(0, 10) };
    return nutrition.add(payload);
  },
  deleteNutritionLog: nutrition.remove,
  updateNutritionLog: nutrition.update,

  updateHealthExtras: async (data) => {
    const current = captureSession(get);
    const response = await apiSync('/health-profile', 'PUT', data);
    if (current()) set((state: any) => ({ healthProfile: { ...(state.healthProfile || {}), ...data, ...(response || {}) } }));
    return response;
  },
});
};
