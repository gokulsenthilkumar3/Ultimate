import { describe, expect, it } from 'vitest';
import { DIGITAL_HUMAN_V2_CONTRACT, inspectDigitalHumanV2, measureCalibrationError } from '../components/morphEngine/digitalHumanV2';

describe('Digital Human v2 contract', () => {
  it('rejects a legacy or incomplete asset', () => {
    const result = inspectDigitalHumanV2({ modelAsset: { version: 'legacy' }, meshNames: ['Body'], boneCount: 20, morphTargetCount: 58 });
    expect(result.ready).toBe(false);
    expect(result.missingParts).toContain('cornea');
  });

  it('accepts a contract-complete authored asset', () => {
    const meshNames = DIGITAL_HUMAN_V2_CONTRACT.requiredParts.map((part) => `GrowthTrack_${part}`);
    const result = inspectDigitalHumanV2({ modelAsset: { version: 'v2' }, meshNames, boneCount: 60, morphTargetCount: 96 });
    expect(result.ready).toBe(true);
  });

  it('reports deterministic calibration error', () => {
    const result = measureCalibrationError({ height: 176, waist: 82 }, { height: 175, waist: 80 });
    expect(result.maxAbsError).toBe(2);
    expect(result.complete).toBe(true);
  });
});
