import { describe, expect, it } from 'vitest';
import { postureOffsets } from '../components/morphEngine/postureMath';

const radians = (degrees) => degrees * Math.PI / 180;

describe('postureOffsets', () => {
  it('turns the authored A-pose into a symmetric relaxed stance', () => {
    const offsets = postureOffsets({});

    expect(offsets.leftShoulder[2] + offsets.leftUpperArm[2]).toBeCloseTo(radians(36));
    expect(offsets.rightShoulder[2] + offsets.rightUpperArm[2]).toBeCloseTo(radians(-36));
    expect(offsets.leftForeArm[1]).toBeLessThan(0);
    expect(offsets.rightForeArm[1]).toBeGreaterThan(0);
    expect(offsets.leftUpperArm[1]).toBeLessThan(0);
    expect(offsets.rightUpperArm[1]).toBeGreaterThan(0);
    expect(offsets.leftHand[1]).toBeLessThan(0);
    expect(offsets.rightHand[1]).toBeGreaterThan(0);
  });

  it('rolls rounded shoulders forward without widening the arms', () => {
    const offsets = postureOffsets({ shoulderRounding: 20 });

    expect(offsets.leftShoulder[0]).toBe(0);
    expect(offsets.leftShoulder[1]).toBeCloseTo(radians(6.4));
    expect(offsets.leftShoulder[2]).toBeGreaterThan(0);
    expect(offsets.rightShoulder[0]).toBe(0);
    expect(offsets.rightShoulder[1]).toBeCloseTo(radians(-6.4));
    expect(offsets.rightShoulder[2]).toBeLessThan(0);
  });

  it('clamps an explicit arm relaxation override to the safe rig range', () => {
    const maximum = postureOffsets({ armRelaxAngle: 90 });
    const minimum = postureOffsets({ armRelaxAngle: -10 });
    expect(maximum.leftShoulder[2] + maximum.leftUpperArm[2]).toBeCloseTo(radians(38));
    expect(minimum.leftShoulder[2] + minimum.leftUpperArm[2]).toBeCloseTo(radians(20));
  });
});
