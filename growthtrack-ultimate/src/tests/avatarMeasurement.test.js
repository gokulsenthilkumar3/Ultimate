import { describe, expect, it } from 'vitest';
import { BoxGeometry } from 'three';
import { sectionLoops, measurementFit } from '../lib/avatarMeasurement';

describe('mesh measurements', () => {
  it('welds duplicated face seams for a closed physical cross section', () => {
    const box = new BoxGeometry(2, 3, 4).toNonIndexed();
    const points = box.attributes.position.array;
    const loops = sectionLoops(points, Array.from({ length: points.length / 3 }, (_, i) => i), { offset: 0 });
    expect(loops).toHaveLength(1);
    expect(loops[0].perimeter).toBeCloseTo(12);
    box.dispose();
  });
  it('rejects an open cross section instead of inventing a circumference', () => {
    expect(sectionLoops([0, -1, 0, 1, 1, 0, 0, 1, 1], [0, 1, 2], { offset: 0 })).toEqual([]);
  });
  it('does not label unavailable or unsupported geometry calibrated', () => {
    expect(measurementFit({ requested: 80, achieved: 80 })).toMatchObject({ achieved: null, status: 'uncalibrated' });
    expect(measurementFit({ requested: 80, achieved: null, supported: true }).residual).toBeNull();
  });
  it('reports fit failure without clamping a user target', () => {
    expect(measurementFit({ requested: 80, achieved: 90, supported: true })).toMatchObject({ requested: 80, residual: 10, status: 'outside-tolerance' });
    expect(measurementFit({ requested: 100, achieved: 101.9, supported: true }).status).toBe('within-tolerance');
  });
});
