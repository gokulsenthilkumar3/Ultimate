import { describe, it, expect } from 'vitest';
import { normalizeObservations, observationDate, projectGoal, generateProjectionChartData } from './projectGoal';

const points = [
  { date: '2026-09-01', value: 80 },
  { date: '2026-09-08', value: 79 },
  { date: '2026-09-15', value: 78 },
];

describe('dated goal projection', () => {
  it.each([[], points.slice(0, 1), points.slice(0, 2)])('requires three distinct valid dates', input => {
    expect(projectGoal(input, 75)).toMatchObject({ trend: 'insufficient_data', weeklyRate: null, projectedDate: null });
    expect(generateProjectionChartData(input, 75).every(point => point.projected === null)).toBe(true);
  });
  it('filters invalid values and dates, sorts, and averages duplicate dates', () => {
    const input = [
      ...points.toReversed(), { date: '2026-09-15T18:00:00Z', value: 76 },
      { date: '2026-09-31', value: 40 }, { date: 'yesterday', value: 40 },
      ...['', ' ', null, true, {}, Infinity, 'NaN'].map(value => ({ date: '2026-09-22', value })),
    ];
    expect(normalizeObservations(input)).toEqual([points[0], points[1], { date: '2026-09-15', value: 77 }]);
    expect(observationDate('2026-02-29')).toBeNull();
    expect(observationDate('2026-09-15Tinvalid')).toBeNull();
    expect(projectGoal([points[0], points[0], points[1]], 75).weeklyRate).toBeNull();
  });
  it('uses real elapsed days and anchors ETA to the latest observation', () => {
    expect(projectGoal(points.toReversed(), 75)).toMatchObject({
      currentValue: 78, latestDate: '2026-09-15', weeklyRate: -1,
      trend: 'toward_target', projectedDate: '2026-10-06', weeksToTarget: 3, observationCount: 3,
    });
    const irregular = [{ date: '2026-09-01', value: 0 }, { date: '2026-09-03', value: 2 }, { date: '2026-09-15', value: 14 }];
    expect(projectGoal(irregular, 21).weeklyRate).toBe(7);
  });
  it('does not assume improvement for flat or worsening trends', () => {
    expect(projectGoal(points.map(point => ({ ...point, value: 80 })), 75)).toMatchObject({ weeklyRate: 0, projectedDate: null, trend: 'stalled' });
    expect(projectGoal(points, 85)).toMatchObject({ weeklyRate: -1, projectedDate: null, trend: 'away_from_target' });
    expect(projectGoal(points, 78)).toMatchObject({ projectedDate: '2026-09-15', trend: 'at_target', weeksToTarget: 0 });
    expect(projectGoal(points, '')).toMatchObject({ projectedDate: null, trend: 'observed_trend' });
    expect(projectGoal(points, 75)).not.toHaveProperty('confidence');
  });
  it('produces dated actuals and clearly separate signed estimates', () => {
    const chart = generateProjectionChartData(points, 75, 2);
    expect(chart).toHaveLength(5);
    expect(chart[2]).toEqual({ date: '2026-09-15', actual: 78, projected: 78 });
    expect(chart[3]).toEqual({ date: '2026-09-22', actual: null, projected: 77 });
    expect(chart[4].projected).toBe(76);
  });
});
