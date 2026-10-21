import { describe, expect, it } from 'vitest';
import { postureOffsets } from '../components/morphEngine/postureMath';

describe('postureOffsets', () => {
  it('preserves the authored neutral pose when posture data is absent', () => {
    const offsets = postureOffsets({});

    Object.values(offsets).flat().forEach(value => expect(value).toBeCloseTo(0));
  });

  it('does not apply unsafe upper-limb rotations from posture data', () => {
    const offsets = postureOffsets({ shoulderRounding: 20 });

    expect(offsets.leftShoulder[0]).toBe(0);
    expect(offsets.leftShoulder[1]).toBe(0);
    expect(offsets.leftShoulder[2]).toBe(0);
    expect(offsets.rightShoulder[0]).toBe(0);
    expect(offsets.rightShoulder[1]).toBe(0);
    expect(offsets.rightShoulder[2]).toBe(0);
  });

  it('ignores arm relaxation until the production deformation rig is available', () => {
    const maximum = postureOffsets({ armRelaxAngle: 90 });
    const minimum = postureOffsets({ armRelaxAngle: -10 });
    expect(maximum.leftShoulder[2] + maximum.leftUpperArm[2]).toBe(0);
    expect(maximum.rightShoulder[2] + maximum.rightUpperArm[2]).toBe(0);
    expect(minimum.leftShoulder[2] + minimum.leftUpperArm[2]).toBe(0);
    expect(minimum.rightShoulder[2] + minimum.rightUpperArm[2]).toBe(0);
  });
});
