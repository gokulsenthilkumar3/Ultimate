import { describe, expect, it } from 'vitest';
import { formatBodyValue, inputBodyValue, parseTargetValue, physiqueHistory, targetRows } from './physiqueWorkspace';

describe('physique workspace data presentation', () => {
  it('distinguishes missing measurements from an entered zero', () => {
    for (const value of [null, undefined, '', ' ', false, NaN]) {
      expect(formatBodyValue(value, 'cm', {})).toBe('—');
      expect(inputBodyValue(value, 'cm', {})).toBe('');
    }
    expect(formatBodyValue(0, '%', {})).toBe('0%');
  });

  it('combines old logs and nested snapshots in date order, excluding private and unrelated fields', () => {
    const history = physiqueHistory([
      { date: '2026-10-15', metric: 'physique_snapshot', metrics: { weight: '74', waist: 82, anatomyRevealConsent: true, privateLength: 12 } },
      { date: '2026-09-01', metric: 'weight', value: 72 },
      { date: '2026-09-15', body_fat: 20, waist: 84 },
      { date: '2026-09-17', water: 2 },
      { date: 'invalid', weight: 73 },
      { date: '2026-09-18', weight: null },
    ]);
    expect(history.map(row => row.date)).toEqual(['2026-09-01', '2026-09-15', '2026-10-15']);
    expect(history[2].metrics).toEqual({ weight: 74, waist: 82 });
    expect(history[1].metrics).toEqual({ bodyFat: 20, waist: 84 });
  });

  it('uses profile goals ahead of legacy target strings without duplicating the goal', () => {
    const rows = targetRows([{ label: 'Waist', current: '34in', target: '32in' }], { waist: 83 }, { waist: 80, weight: 76 });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'waist', current: 83, goal: 80 });
    expect(rows[1]).toMatchObject({ id: 'weight', current: null, goal: 76 });
    expect(parseTargetValue('32in', { unit: 'cm' })).toBeCloseTo(81.28);
    expect(parseTargetValue('invalid', { unit: 'cm' })).toBeNull();
  });

  it('formats metric data using the user’s imperial preference', () => {
    const user = { measurementSystem: 'Imperial (in, lb)' };
    expect(inputBodyValue(25.4, 'cm', user)).toBe('10');
    expect(formatBodyValue(25.4, 'cm', user)).toBe('10 in');
    expect(formatBodyValue(2.54, 'cm', user, true)).toBe('+1 in');
  });
});
