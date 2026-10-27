// @vitest-environment node
import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { readGlb } from '../../../scripts/plan-preview/glb.mjs';
import { sceneFromGlb } from '../../../scripts/human75/glb-tools.mjs';
import { prepareFaceGeometry, createMouthInterior } from './faceGeometry';
import { bakeAvatarSurface } from './avatarExport';

it('bakes the visible upper and hinged lower dental rows at their evaluated world positions', () => {
  const { root, body, features, skeleton } = sceneFromGlb(readGlb('public/assets/models/humanoid-preview-75-lite.glb'));
  prepareFaceGeometry(body, features);
  const mouth = createMouthInterior(body);
  body.morphTargetInfluences[body.morphTargetDictionary.jaw_open] = .65;
  skeleton.bones.find(bone => bone.name === 'Head').rotation.y = .35;
  root.updateMatrixWorld(true);
  mouth.update(); root.updateMatrixWorld(true);
  const position = body.geometry.attributes.position.array.slice();
  const baked = bakeAvatarSurface(root), origin = root.getWorldPosition(new Vector3());
  for (const source of [mouth.upper, mouth.lower]) {
    const exported = baked.children.find(mesh => mesh.name === source.name);
    expect(exported).toBeTruthy();
    expect(exported.geometry.attributes.position.array.every(Number.isFinite)).toBe(true);
    expect(exported.geometry.attributes.skinWeight).toBeUndefined();
    expect(exported.geometry.morphAttributes).toEqual({});
    expect(exported.geometry.groups).toEqual(source.geometry.groups);
    for (const i of [0, Math.floor(source.geometry.attributes.position.count / 2)]) {
      const expected = source.getVertexPosition(i, new Vector3()).applyMatrix4(source.matrixWorld).sub(origin);
      const actual = new Vector3().fromBufferAttribute(exported.geometry.attributes.position, i);
      expect(actual.distanceTo(expected)).toBeLessThan(1e-6);
    }
  }
  expect(body.geometry.attributes.position.array).toEqual(position);
  mouth.dispose();
  baked.traverse(node => {
    node.geometry?.dispose();
    (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => material?.dispose());
  });
});
