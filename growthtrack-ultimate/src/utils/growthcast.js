import { BODY_METRICS, bodyProfileToGoals } from '../lib/physiqueProfile';
import { validateBodyMetric } from '../lib/bodyMetricContract';
import { localDateKey, metricValue } from '../lib/metricSeries';
import { finiteObservation, normalizeObservations, observationDate, projectGoal, generateProjectionChartData } from './projectGoal';

const FORECAST_METRICS = [
  ...BODY_METRICS,
  { key: 'stamina', label: 'Stamina', unit: '%' },
  { key: 'memoryPower', label: 'Cognition', unit: '%' },
  { key: 'eyePower', label: 'Eye Power', unit: 'dp' },
];

function validMetric(key, value) {
  if (finiteObservation(value) === null) return false;
  if (['stamina', 'memoryPower'].includes(key)) return value >= 0 && value <= 100;
  return validateBodyMetric(key, value, { allowEmpty: false }).valid;
}

export function buildMetricForecasts(logs, state = {}, asOf = localDateKey()) {
  const numericFields = source => Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [key, finiteObservation(value)]));
  const goalMetrics = numericFields(state.physiqueTargets?.goalMetrics);
  const targets = { ...goalMetrics, ...bodyProfileToGoals(numericFields(state.bodyProfile), { goalMetrics }) };
  const validatedLogs = (Array.isArray(logs) ? logs : []).map(log => ({
    ...numericFields(log), date: log?.date, type: log?.type, metric: log?.metric, unit: log?.unit,
  }));
  return FORECAST_METRICS.flatMap(metric => {
    const observations = normalizeObservations(validatedLogs.flatMap(log => {
      const date = observationDate(log?.date);
      const value = metricValue(log, metric.key);
      // Explicit mismatching units must never be blended with canonical units.
      if (!date || date > asOf || !validMetric(metric.key, value) || (log.unit && log.unit !== metric.unit)) return [];
      return [{ date, value }];
    }));
    const rawTarget = finiteObservation(targets[metric.key]);
    const target = validMetric(metric.key, rawTarget) ? rawTarget : null;
    if (!observations.length && target === null) return [];
    const model = projectGoal(observations, target);
    const projected30 = model.dailyRate === null || target === null ? null : model.currentValue + model.dailyRate * 30;
    const chart = target === null ? [] : generateProjectionChartData(observations, target, 6)
      .map(point => ({ ...point, projected: validMetric(metric.key, point.projected) ? point.projected : null }));
    return [{
      ...metric, target, observations, ...model,
      projected30: validMetric(metric.key, projected30) ? projected30 : null,
      chart,
    }];
  });
}

// Counts describe saved records; they are not modeled momentum or confidence scores.
export function buildGrowthcastSummary(state = {}) {
  const goals = Array.isArray(state.goals) ? state.goals : [];
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const habits = Array.isArray(state.habits) ? state.habits : [];
  const logs = Array.isArray(state.metric_logs) ? state.metric_logs : [];
  const dated = logs.map(log => observationDate(log?.date)).filter(Boolean);
  return {
    goalCount: goals.length,
    completedGoals: goals.filter(goal => ['completed', 'done'].includes(String(goal?.status).toLowerCase())).length,
    pendingTasks: tasks.filter(task => !task?.completed && !['completed', 'done', 'cancelled'].includes(String(task?.status).toLowerCase())).length,
    habitCount: habits.length,
    measurementCount: logs.length,
    observedDates: new Set(dated).size,
    latestDate: dated.sort().at(-1) ?? null,
    sleepCount: Array.isArray(state.sleep_logs) ? state.sleep_logs.length : 0,
  };
}
