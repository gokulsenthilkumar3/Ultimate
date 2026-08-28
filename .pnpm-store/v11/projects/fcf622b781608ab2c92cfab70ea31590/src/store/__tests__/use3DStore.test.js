import { describe, it, expect } from 'vitest';
import use3DStore, { computeFitCameraZoom } from '../use3DStore';

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
