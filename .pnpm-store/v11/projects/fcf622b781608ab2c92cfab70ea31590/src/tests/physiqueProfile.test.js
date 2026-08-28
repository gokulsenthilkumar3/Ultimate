import { describe, expect, it } from 'vitest';
import {
  bodyProfileToGoals,
  bodyProfileToMetrics,
  calculateGoalProgress,
  metricLogsToSnapshots,
  mergeBodyProfileSources,
  metricsToBodyProfile,
} from '../lib/physiqueProfile';

describe('physique profile mapping', () => {
  it('maps database fields without inventing missing measurements', () => {
    expect(bodyProfileToMetrics({ weightKg: 70, chestCm: null })).toEqual({ weight: 70 });
    expect(bodyProfileToGoals({ targetWeightKg: 80 }, { goalMetrics: { calves: 41 } })).toEqual({ weight: 80, calves: 41 });
  });

  it('recovers legacy user measurements while preferring normalized profile values', () => {
    expect(mergeBodyProfileSources(
      { chestCm: 104 },
      { weight: 72, chest: 101, forearm: 29, calves: 38 },
    )).toMatchObject({ weightKg: 72, chestCm: 104, forearmsCm: 29, calvesCm: 38 });
  });

  it('persists supported current and target fields', () => {
    expect(metricsToBodyProfile({ weight: 71, waist: 80 }, { weight: 82, waist: 76 })).toMatchObject({
      weightKg: 71,
      waistCm: 80,
      targetWeightKg: 82,
      targetWaistCm: 76,
    });
  });

  it('calculates progress from the baseline rather than current divided by goal', () => {
    expect(calculateGoalProgress({ baseline: { weight: 60 }, current: { weight: 70 }, goal: { weight: 80 } }).score).toBe(50);
    expect(calculateGoalProgress({ baseline: { bodyFat: 20 }, current: { bodyFat: 15 }, goal: { bodyFat: 10 } }).score).toBe(50);
  });

  it('builds ordered snapshots from database logs', () => {
    const snapshots = metricLogsToSnapshots([
      { id: 'b', date: '2026-02-01', metric: 'weight', value: 72 },
      { id: 'a', date: '2026-01-01', metric: 'weight', value: 70 },
      { id: 'c', date: '2026-01-01', metric: 'waist', value: 82 },
    ]);
    expect(snapshots.map((snapshot) => snapshot.date)).toEqual(['2026-01-01', '2026-02-01']);
    expect(snapshots[0].metrics).toEqual({ weight: 70, waist: 82 });
  });
});
