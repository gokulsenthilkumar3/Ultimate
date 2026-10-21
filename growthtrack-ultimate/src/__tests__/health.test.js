import { describe, it, expect } from 'vitest';
import {
  calcBMI,
  getBMICategory,
  calcLeanMass,
  calcStreak,
  calcProgress,
  sumMealLog,
  getTodayLog,
} from '../utils/health';

describe('calcBMI', () => {
  it('calculates BMI correctly', () => {
    expect(calcBMI(63, 182)).toBe(19.0);
    expect(calcBMI(80, 180)).toBe(24.7);
  });
  it('returns 0 for missing inputs', () => {
    expect(calcBMI(0, 180)).toBe(0);
    expect(calcBMI(80, 0)).toBe(0);
  });
});

describe('getBMICategory', () => {
  it('returns Underweight for BMI < 18.5', () => {
    expect(getBMICategory(17)).toBe('Underweight');
  });
  it('returns Normal for BMI 18.5–24.9', () => {
    expect(getBMICategory(19)).toBe('Normal');
    expect(getBMICategory(24.9)).toBe('Normal');
  });
  it('returns Overweight for BMI 25–29.9', () => {
    expect(getBMICategory(27)).toBe('Overweight');
  });
  it('returns Obese for BMI >= 30', () => {
    expect(getBMICategory(31)).toBe('Obese');
  });
});

describe('calcLeanMass', () => {
  it('calculates lean mass correctly', () => {
    expect(calcLeanMass(63, 22)).toBe(49.1); // 63 * 0.78
  });
  it('returns 0 body fat correctly', () => {
    expect(calcLeanMass(80, 0)).toBe(80.0);
  });
});

describe('calcStreak', () => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

  it('returns streak of 1 for today only', () => {
    expect(calcStreak([today])).toBe(1);
  });
  it('returns streak of 2 for today + yesterday', () => {
    expect(calcStreak([yesterday, today])).toBe(2);
  });
  it('returns streak of 3 for three consecutive days', () => {
    expect(calcStreak([twoDaysAgo, yesterday, today])).toBe(3);
  });
  it('returns 0 for empty array', () => {
    expect(calcStreak([])).toBe(0);
  });
  it('returns 0 if streak is broken (no today entry)', () => {
    expect(calcStreak([twoDaysAgo, yesterday])).toBe(0);
  });
});

describe('calcProgress', () => {
  it('calculates percentage correctly', () => {
    expect(calcProgress(1475, 2950)).toBe(50);
  });
  it('caps at 100', () => {
    expect(calcProgress(5000, 2950)).toBe(100);
  });
  it('returns 0 for zero target', () => {
    expect(calcProgress(100, 0)).toBe(0);
  });
});

describe('sumMealLog', () => {
  const log = [
    { calories: 600, protein: 40 },
    { calories: 800, protein: 60 },
    { calories: 500 },
  ];
  it('sums calories correctly', () => {
    expect(sumMealLog(log, 'calories')).toBe(1900);
  });
  it('sums protein correctly, treating missing as 0', () => {
    expect(sumMealLog(log, 'protein')).toBe(100);
  });
  it('handles empty log', () => {
    expect(sumMealLog([], 'calories')).toBe(0);
  });
});

describe('getTodayLog', () => {
  it('filters to only today entries', () => {
    const today = '2026-04-26';
    const log = [
      { date: '2026-04-25', name: 'Yesterday' },
      { date: '2026-04-26', name: 'Today' },
    ];
    const result = getTodayLog(log, today);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Today');
  });
  it('returns empty array if no entries today', () => {
    const log = [{ date: '2026-04-20', name: 'Old' }];
    expect(getTodayLog(log, '2026-04-26')).toHaveLength(0);
  });
});
