import { describe, expect, it } from 'vitest';
import {
  buildMorphWeights,
  computeHeightScale,
  computeMorphWeights,
  normaliseMetric,
} from '../components/morphEngine/metricsToBlendshapes';

const changedChannels = (before, after, epsilon = 1e-8) => Object.keys(after)
  .filter((key) => Math.abs((after[key] ?? 0) - (before[key] ?? 0)) > epsilon)
  .sort();

describe('pure metric-to-blendshape engine', () => {
  it('normalises and clamps physical measurements deterministically', () => {
    expect(normaliseMetric(45, 'weight')).toBe(0);
    expect(normaliseMetric(87.5, 'weight')).toBe(0.5);
    expect(normaliseMetric(200, 'weight')).toBe(1);
    expect(normaliseMetric('invalid', 'weight')).toBe(0);
  });

  it('keeps a waist-only edit isolated to core geometry channels', () => {
    const baseline = {
      biologicalSex: 'male', height: 175, weight: 75, bodyFat: 18,
      chest: 100, shoulders: 112, waist: 80, arms: 34, forearm: 28,
      hips: 94, glutes: 96, thighs: 55, calves: 37, neck: 38, ankle: 22,
    };
    const before = computeMorphWeights(baseline);
    const after = computeMorphWeights({ ...baseline, waist: 95 });

    expect(changedChannels(before, after)).toEqual(['oblique_def', 'waist_narrow']);
    expect(after.waist_narrow).toBeLessThan(before.waist_narrow);
  });

  it('keeps an arm-only edit isolated to biceps and triceps', () => {
    const baseline = {
      biologicalSex: 'male', height: 175, weight: 75, bodyFat: 18,
      chest: 100, shoulders: 112, waist: 80, arms: 32, forearm: 28,
      hips: 94, glutes: 96, thighs: 55, calves: 37, neck: 38, ankle: 22,
    };
    const before = computeMorphWeights(baseline);
    const after = computeMorphWeights({ ...baseline, arms: 44 });

    expect(changedChannels(before, after)).toEqual(['bicep_peak', 'tricep_horse']);
  });

  it('inherits unspecified goal values before calculating goal morphs', () => {
    const current = { biologicalSex: 'female', height: 168, weight: 64, chest: 94, waist: 78 };
    const goal = { weight: 58 };
    const currentWeights = buildMorphWeights(current);
    const goalWeights = buildMorphWeights(goal, {}, current);

    expect(goalWeights.chest_depth).toBeCloseTo(currentWeights.chest_depth, 6);
    expect(goalWeights.waist_narrow).toBeCloseTo(currentWeights.waist_narrow, 6);
    expect(goalWeights.overall_mass).toBeLessThan(currentWeights.overall_mass);
  });

  it('changes complete stature independently of circumference morphs', () => {
    expect(computeHeightScale({ height: 160 })).toBeCloseTo(160 / 175, 6);
    expect(computeHeightScale({ height: 190 })).toBeCloseTo(190 / 175, 6);
    expect(computeHeightScale({ height: 190 })).toBeGreaterThan(computeHeightScale({ height: 160 }));

    const inherited = computeHeightScale({}, { height: 182 });
    expect(inherited).toBeCloseTo(182 / 175, 6);
  });

  it('produces finite constrained output even when metrics are missing', () => {
    const weights = computeMorphWeights({});
    Object.values(weights).forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  });
});
