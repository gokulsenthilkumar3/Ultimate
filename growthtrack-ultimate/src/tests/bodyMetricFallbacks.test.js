import { describe, expect, it } from 'vitest';
import { getMetricCompleteness, resolveBodyMetrics } from '../lib/bodyMetricFallbacks';

describe('body metric fallbacks', () => {
  it('keeps explicit values and derives only missing render inputs', () => {
    const result = resolveBodyMetrics({ biologicalSex: 'male', height: 181, weight: 79, waist: 84 });
    expect(result.metrics.height).toBe(181);
    expect(result.metrics.waist).toBe(84);
    expect(result.derivedKeys).not.toContain('waist');
    expect(result.metrics.chest).toBeGreaterThan(80);
  });

  it('inherits unchanged current values for a sparse goal', () => {
    const result = resolveBodyMetrics({ weight: 82 }, { height: 178, weight: 76, chest: 101 });
    expect(result.metrics.weight).toBe(82);
    expect(result.metrics.height).toBe(178);
    expect(result.metrics.chest).toBe(101);
  });

  it('reports precision without counting estimates as user measurements', () => {
    expect(getMetricCompleteness({ height: 178, weight: 76 })).toMatchObject({ supplied: 2, total: 10, percent: 20 });
  });
});

