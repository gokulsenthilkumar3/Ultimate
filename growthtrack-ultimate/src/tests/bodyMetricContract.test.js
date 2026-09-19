import { describe, expect, it } from 'vitest';
import { sanitizeBodyMetrics, validateBodyMetric } from '../lib/bodyMetricContract';

describe('body measurement contract', () => {
  it('accepts realistic measurements and explains rejected values', () => {
    expect(validateBodyMetric('height', 175)).toMatchObject({ valid: true, value: 175 });
    expect(validateBodyMetric('thighs', 3)).toMatchObject({
      valid: false,
      reason: 'Enter 20–150 cm.',
    });
  });

  it('removes invalid anatomy values without removing appearance settings', () => {
    expect(sanitizeBodyMetrics({ chest: -0.1, waist: 82, hairStyle: 'short' })).toMatchObject({
      metrics: { waist: 82, hairStyle: 'short' },
      invalid: [expect.objectContaining({ key: 'chest', value: -0.1 })],
    });
  });

  it('supports clearing optional measurements', () => {
    expect(validateBodyMetric('waist', '')).toMatchObject({ valid: true, empty: true, value: null });
  });
});
