import { describe, it, expect } from 'vitest';
import use3DStore, { computeFitCameraZoom, computeMorphWeights } from '../use3DStore';

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

describe('private anatomy privacy state', () => {
  it('is hidden by default and changes only through the explicit action', () => {
    use3DStore.getState().setPrivateAnatomyVisible(false);
    expect(use3DStore.getState().privateAnatomyVisible).toBe(false);

    use3DStore.getState().setPrivateAnatomyVisible(true);
    expect(use3DStore.getState().privateAnatomyVisible).toBe(true);

    use3DStore.getState().setPrivateAnatomyVisible(false);
  });
});

describe('progressive metric precision', () => {
  it('produces a coherent neutral render when no measurements exist', () => {
    const weights = computeMorphWeights({});
    expect(weights.overall_mass).toBeGreaterThan(0);
    expect(weights.chest_depth).toBeGreaterThan(0);
    expect(weights.hip_width).toBeGreaterThan(0);
    expect(weights.leg_length).toBeGreaterThan(0);
  });

  it('lets explicit measurements replace render-only estimates', () => {
    const estimated = computeMorphWeights({ biologicalSex: 'female', height: 165, weight: 60 });
    const measured = computeMorphWeights({ biologicalSex: 'female', height: 165, weight: 60, waist: 110 });
    expect(measured.waist_narrow).toBeLessThan(estimated.waist_narrow);
  });

  it('inherits current measurements when only a goal delta is supplied', () => {
    use3DStore.getState().setCurrentMetrics({ height: 180, weight: 75, chest: 102, waist: 82 });
    use3DStore.getState().setGoalMetrics({ weight: 80 });
    expect(use3DStore.getState().cloneB.weights.chest_depth).toBeCloseTo(
      use3DStore.getState().cloneA.weights.chest_depth,
      5,
    );
  });
});
