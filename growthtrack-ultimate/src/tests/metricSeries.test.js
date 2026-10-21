import { describe, expect, it } from 'vitest';
import { currentStreak, finiteMetric, groupMetricByDate, latestMetrics, metricDelta, metricSeries } from '../lib/metricSeries';

describe('metric series and streak regressions', () => {
  it('preserves zero and skips empty, invalid and infinite measurements', () => {
    expect([0, '0', '', null, undefined, NaN, Infinity, false].map(finiteMetric)).toEqual([0, 0, null, null, null, null, null, null]);
  });
  it('merges check-in and legacy metric formats in chronological order', () => {
    const logs = [{ date: '2026-09-06', water: 0 }, { date: '2026-09-01', type: 'water', value: '2' }, { date: 'invalid', water: 4 }];
    expect(metricSeries(logs, 'water')).toEqual([{ date: '2026-09-01', value: 2 }, { date: '2026-09-06', value: 0 }]);
    expect(metricDelta(logs, 'water')).toBe(-2);
  });
  it('selects the latest recorded value independently for each metric', () => {
    const logs = [{ date: '2026-09-06', sleep: 8, weight: null }, { date: '2026-08-01', weight: 80 }, { date: '2026-09-05', weight: 77 }];
    expect(latestMetrics(logs, ['sleep', 'weight', 'water'])).toEqual({ sleep: 8, weight: 77, water: null });
    expect(metricDelta(logs, 'weight')).toBe(-3);
    expect(metricDelta(logs, 'sleep')).toBeNull();
  });
  it('groups timestamps on the same calendar day without coercing gaps to zero', () => {
    expect(groupMetricByDate([{ date: '2026-09-01T10:00:00Z', mood: 7 }, { date: '2026-09-01', type: 'mood', value: 5 }, { date: '2026-09-02', mood: '' }], 'mood')).toEqual({ '2026-09-01': [5, 7] });
  });
  it('terminates for empty histories and histories with no recent completions', () => {
    const now = new Date(2026, 8, 6, 3);
    expect(currentStreak([], now)).toBe(0);
    expect(currentStreak([{ date: '2020-01-01' }], now)).toBe(0);
    expect(currentStreak([{ date: '2026-09-05' }, { date: '2026-09-04' }, { date: '2026-09-04' }], now)).toBe(2);
    expect(currentStreak([{ date: '2026-09-06', completed: false }, { date: '2026-09-04' }], now)).toBe(0);
  });
});
