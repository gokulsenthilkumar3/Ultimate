import { describe, expect, it } from 'vitest';
import { AVATAR_EXPOSURE } from './avatarPresentation';
import { EYE_APPEARANCE, advancePupil, pupilDiameterForExposure, resolveEyeAppearance } from './eyeAppearance';
import { bodyProfileToGoals, metricsToBodyProfile, publicBodyMetrics } from './physiqueProfile';

describe('saved eye appearance and exposure response', () => {
  it('bounds legacy values and preserves a saved false limbal ring', () => {
    expect(resolveEyeAppearance()).toEqual(EYE_APPEARANCE.defaults);
    for (const value of [undefined, null, '', false, {}, [], 'invalid', NaN, Infinity]) {
      expect(resolveEyeAppearance({ eyePupilSizeMm: value }).pupilSizeMm).toBe(3.8);
    }
    expect(resolveEyeAppearance({ eyeColor: 'url(fake)', scleraColor: '#FFEECC', eyePupilMode: 'constructor', irisLimbalRing: false, eyePupilSizeMm: 100, eyeIrisDetail: -1, eyeSeed: 0 })).toMatchObject({
      color: '#6b3b20', scleraColor: '#ffeecc', pupilMode: 'fixed', limbalRing: false, pupilSizeMm: 7, detail: 0, seed: 1,
    });
  });
  it('keeps fixed size independent of exposure and contracts automatic pupils monotonically', () => {
    const fixed = resolveEyeAppearance({ eyePupilSizeMm: 4.2 });
    const automatic = resolveEyeAppearance({ eyePupilMode: 'exposure' });
    const values = Array.from({ length: 101 }, (_, i) => AVATAR_EXPOSURE.min + (AVATAR_EXPOSURE.max - AVATAR_EXPOSURE.min) * i / 100);
    expect(values.map(exposure => pupilDiameterForExposure(fixed, exposure))).toEqual(values.map(() => 4.2));
    const pupils = values.map(exposure => pupilDiameterForExposure(automatic, exposure));
    expect(pupils[0]).toBe(7); expect(pupils.at(-1)).toBe(2);
    expect(pupils).toEqual([...pupils].sort((a, b) => b - a));
    expect(pupilDiameterForExposure(automatic, NaN)).toBeGreaterThan(2);
  });
  it('converges independently of frame rate without overshoot, and can settle synchronously', () => {
    const simulate = frames => { let value = 7; for (let i = 0; i < frames; i++) value = advancePupil(value, 2, 1 / frames); return value; };
    expect(simulate(30)).toBeCloseTo(simulate(60), 10);
    expect(simulate(60)).toBeGreaterThan(2); expect(simulate(60)).toBeLessThan(3);
    expect(advancePupil(7, 2, 0)).toBe(7);
    expect(advancePupil(7, 2, Infinity)).toBe(7);
    expect(advancePupil(7, 2, 0, true)).toBe(2);
    expect(advancePupil(2, 7, 1)).toBeLessThan(7);
  });
  it('maps existing eye columns and JSON-only appearance fields without polluting measurements', () => {
    const detail = { eyeColor: '#4e7897', irisLimbalRing: false, eyePupilMode: 'exposure', eyePupilSizeMm: 5.1, eyeIrisDetail: .8, eyeSeed: 321 };
    expect(metricsToBodyProfile(detail)).toEqual({ eyeColorHex: '#4e7897', irisLimbalRing: false });
    expect(bodyProfileToGoals({}, { goalMetrics: detail })).toEqual(detail);
    expect(publicBodyMetrics({ ...detail, height: 175 })).toEqual({ height: 175 });
  });
});
