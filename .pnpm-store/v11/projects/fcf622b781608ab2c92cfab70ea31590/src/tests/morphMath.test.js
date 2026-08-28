import { describe, expect, it } from 'vitest';
import {
  MORPH_CHANNEL_GROUPS,
  constrainMorphWeights,
  composeMorphLayers,
  interpolateMorphWeights,
  sanitizeMorphWeights,
} from '../components/morphEngine/morphMath';

describe('advanced morph domain', () => {
  it('sanitizes invalid channels and keeps shader ranges separate', () => {
    const weights = sanitizeMorphWeights({ overall_mass: Infinity, fitzpatrick_index: 99, vascularity_intensity: -2 });
    expect(weights.overall_mass).toBe(0);
    expect(weights.fitzpatrick_index).toBe(5);
    expect(weights.vascularity_intensity).toBe(0);
  });

  it('preserves anatomical relationships when channels are extreme', () => {
    const weights = constrainMorphWeights({
      gut_volume: 1,
      waist_narrow: 1,
      chest_depth: 1,
      pec_thickness: 0,
      deltoid_width: 1,
      trap_swell: 0,
      quad_sweep: 1,
      ham_thickness: 0,
    });
    expect(weights.waist_narrow).toBeLessThan(1);
    expect(weights.pec_thickness).toBeGreaterThanOrEqual(0.68);
    expect(weights.trap_swell).toBeGreaterThanOrEqual(0.42);
    expect(weights.ham_thickness).toBeGreaterThanOrEqual(0.32);
  });

  it('blends layers and interpolates without producing NaN values', () => {
    const mixed = composeMorphLayers({ overall_mass: 0.2 }, [
      { values: { overall_mass: 0.8, chest_depth: 0.6 }, weight: 0.5 },
    ]);
    const halfway = interpolateMorphWeights({ overall_mass: 0 }, { overall_mass: 1 }, 0.5);
    expect(mixed.overall_mass).toBeCloseTo(0.5);
    expect(mixed.chest_depth).toBeCloseTo(0.3);
    expect(halfway.overall_mass).toBeCloseTo(0.5);
    expect(Object.values(halfway).every((value) => Number.isFinite(value))).toBe(true);
  });

  it('publishes named channel groups for editor and renderer consumers', () => {
    expect(Object.keys(MORPH_CHANNEL_GROUPS)).toContain('face');
    expect(Object.keys(MORPH_CHANNEL_GROUPS)).toContain('lowerBody');
  });
});
