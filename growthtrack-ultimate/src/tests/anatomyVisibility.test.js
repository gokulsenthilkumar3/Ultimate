import { describe, expect, it } from 'vitest';
import { isAnatomyVisible } from '../components/morphEngine/anatomyVisibility';
import use3DStore from '../store/use3DStore';

describe('anatomical viewport and protected capture', () => {
  it.each(['normal', 'ghost', 'delta', 'xray'])('shows complete anatomy in %s view', (renderMode) => {
    expect(isAnatomyVisible({ wardrobe: 'ANATOMICAL', renderMode, eligible: true })).toBe(true);
    expect(isAnatomyVisible({ wardrobe: 'ANATOMICAL', renderMode, eligible: true, captureRedacted: true })).toBe(false);
  });
  it.each(['UNDERWEAR', 'GYM', 'CASUAL', undefined])('covers anatomy for outfit %s', (wardrobe) => {
    expect(isAnatomyVisible({ wardrobe, eligible: true })).toBe(false);
  });
  it.each([undefined, false, 'yes', 1])('stays covered unless eligibility is explicitly true (%s)', (eligible) => {
    expect(isAnatomyVisible({ wardrobe: 'ANATOMICAL', eligible })).toBe(false);
  });
  it('redacts capture without changing the outfit', () => {
    const previous = use3DStore.getState().wardrobeState;
    try {
      use3DStore.getState().setWardrobe('ANATOMICAL');
      use3DStore.getState().setCaptureRedacted(true);
      expect(use3DStore.getState().wardrobeState).toBe('ANATOMICAL');
      use3DStore.getState().setCaptureRedacted(false);
      expect(isAnatomyVisible({ wardrobe: use3DStore.getState().wardrobeState, eligible: true })).toBe(true);
    } finally {
      use3DStore.getState().setCaptureRedacted(false);
      use3DStore.getState().setWardrobe(previous);
    }
  });
});
