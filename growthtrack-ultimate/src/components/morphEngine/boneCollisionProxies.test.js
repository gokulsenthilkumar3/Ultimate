// @vitest-environment node
import { Bone, BoxGeometry, Float32BufferAttribute, Uint16BufferAttribute, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { boneColliderKind, createBoneCollisionProxies } from './boneCollisionProxies.js';

it('uses boxes for torso/pelvis/palm and capsules for arms and each finger segment', () => {
  for (const name of ['Hips', 'Spine', 'Spine1', 'Spine2', 'LeftHand']) expect(boneColliderKind(name)).toBe('box');
  for (const name of ['LeftArm', 'RightForeArm', 'LeftHandIndex1', 'LeftHandIndex2', 'LeftHandIndex3']) expect(boneColliderKind(name)).toBe('capsule');
});

it.each(['mixamorigHips', 'mixamorigLeftHandIndex2'])('encloses every assigned triangle under a rotated %s bone', name => {
  const bone = new Bone(); bone.name = name; bone.rotation.set(0.4, 0.8, 0.2); bone.position.set(1, 2, 3); bone.updateMatrixWorld(true);
  const geometry = new BoxGeometry(0.08, 0.12, 0.04); geometry.applyMatrix4(bone.matrixWorld);
  const count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
  const [proxy] = createBoneCollisionProxies({ geometry, skeleton: { bones: [bone] } }, geometry, 0);
  expect(proxy.sourceFaces).toHaveLength(12);
  for (let vertex = 0; vertex < count; vertex++) {
    const point = new Vector3().fromBufferAttribute(geometry.attributes.position, vertex);
    for (const plane of proxy.planes) expect(plane.normal.dot(point)).toBeLessThanOrEqual(plane.constant + 1e-7);
  }
  geometry.dispose();
});
