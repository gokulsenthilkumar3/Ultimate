import { describe, it, expect } from 'vitest';
import { computeFitCameraZoom } from '../use3DStore';

describe('computeFitCameraZoom', () => {
  it('returns a wider view for a smaller model frame', () => {
    expect(computeFitCameraZoom(0.5)).toBe(1.8);
  });

  it('returns a tighter view for a larger model frame', () => {
    expect(computeFitCameraZoom(2.5)).toBeCloseTo(0.688, 3);
  });

  it('never goes below the minimum zoom', () => {
    expect(computeFitCameraZoom(999)).toBe(0.45);
  });
});
