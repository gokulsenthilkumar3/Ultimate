import { describe, it, expect } from 'vitest';
import { buildMetricForecasts, buildGrowthcastSummary } from './growthcast';

const logs = [{ date: '2026-09-01', weight: 80 }, { date: '2026-09-08', weight: 79 }, { date: '2026-09-15', weight: 78 }];
describe('grounded growthcast', () => {
  it('uses saved targets, canonical units, and each metric’s own dated observations', () => {
    const forecasts = buildMetricForecasts([...logs, { date: '2026-09-15', chest: 100 }], {
      bodyProfile: { targetWeightKg: 75 }, physiqueTargets: { goalMetrics: { chest: 105 } },
    }, '2026-09-29');
    expect(forecasts.find(item => item.key === 'weight')).toMatchObject({ target: 75, unit: 'kg', weeklyRate: -1, projectedDate: '2026-10-06' });
    expect(forecasts.find(item => item.key === 'chest')).toMatchObject({ target: 105, dailyRate: null, projected30: null, observationCount: 1 });
    expect(forecasts.some(item => item.key === 'eyePower')).toBe(false);
  });
  it('keeps missing targets missing and excludes implausible, future, and mismatching unit records', () => {
    const forecast = buildMetricForecasts([
      ...logs, { date: '2026-09-22', weight: 1 }, { date: '2026-10-01', weight: 77 },
      { date: '2026-09-23', type: 'weight', value: 180, unit: 'lb' },
      { date: '2026-09-24', weight: true }, { date: '2026-09-25', weight: '' },
    ], {}, '2026-09-29')[0];
    expect(forecast).toMatchObject({ target: null, projected30: null, observationCount: 3, chart: [] });
  });
  it('supports sparse legacy typed observations and zero-valued user targets', () => {
    const forecasts = buildMetricForecasts([
      { date: '2026-09-01', type: 'eyePower', value: -3, unit: 'dp' },
      { date: '2026-09-08', eyePower: -2 }, { date: '2026-09-15', eyePower: -1 },
    ], { physiqueTargets: { goalMetrics: { eyePower: 0 } } }, '2026-09-29');
    expect(forecasts[0]).toMatchObject({ target: 0, weeklyRate: 1, projectedDate: '2026-09-22', unit: 'dp' });
  });
  it('reports record counts without manufactured scores or confidence', () => {
    expect(buildGrowthcastSummary({
      goals: [{ status: 'completed' }, { status: 'active' }], habits: [{}],
      tasks: [{ completed: true }, { status: 'done' }, { title: 'Pending' }],
      metric_logs: [...logs.toReversed(), { date: '2026-09-15' }, { date: '2026-09-31' }],
      sleep_logs: [{}],
    })).toEqual({ goalCount: 2, completedGoals: 1, pendingTasks: 1, habitCount: 1, measurementCount: 5, observedDates: 3, latestDate: '2026-09-15', sleepCount: 1 });
    expect(buildGrowthcastSummary()).not.toHaveProperty('dataConfidence');
    expect(buildGrowthcastSummary()).not.toHaveProperty('momentum');
  });
  it('rejects coercible arrays and objects as observations and targets', () => {
    const forecasts = buildMetricForecasts([
      { date: '2026-09-01', weight: [80] }, { date: '2026-09-08', weight: 79 },
      { date: '2026-09-15', weight: 78 }, { date: '2026-09-22', type: 'weight', value: [77] },
    ], { bodyProfile: { targetWeightKg: [75] } }, '2026-09-29');
    expect(forecasts[0]).toMatchObject({ target: null, observationCount: 2, dailyRate: null });
  });
});
