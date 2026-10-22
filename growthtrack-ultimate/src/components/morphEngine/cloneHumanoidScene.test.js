// @vitest-environment node
import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { readGlb } from '../../../scripts/plan-preview/glb.mjs';
import { sceneFromGlb } from '../../../scripts/human75/glb-tools.mjs';
import { cloneHumanoidScene } from './cloneHumanoidScene';
import { createMorphRig } from './morphRig';

it.each(['humanoid-preview-75.glb', 'humanoid-preview-75-lite.glb'])('keeps morph rig edits independent from the cached GLB and another figure: %s', file => {
  const source = sceneFromGlb(readGlb(`public/assets/models/${file}`));
  const original = source.body.skeleton.boneInverses.map(matrix => matrix.toArray());
  const current = cloneHumanoidScene(source.root), goal = cloneHumanoidScene(source.root);
  const a = current.getObjectByName(source.body.name), b = goal.getObjectByName(source.body.name);
  const rigA = createMorphRig(a), rigB = createMorphRig(b);
  a.morphTargetInfluences[a.morphTargetDictionary.torso_length] = .9;
  a.morphTargetInfluences[a.morphTargetDictionary.head_circumference] = .8;
  rigA(); current.updateMatrixWorld(true); a.skeleton.update();
  expect(a.skeleton.boneInverses.map(matrix => matrix.toArray())).not.toEqual(original);
  expect(source.body.skeleton.boneInverses.map(matrix => matrix.toArray())).toEqual(original);
  expect(b.skeleton.boneInverses.map(matrix => matrix.toArray())).toEqual(original);
  const aBefore = a.skeleton.boneInverses.map(matrix => matrix.toArray());
  b.morphTargetInfluences[b.morphTargetDictionary.torso_length] = .2;
  rigB(); goal.updateMatrixWorld(true); b.skeleton.update();
  expect(a.skeleton.boneInverses.map(matrix => matrix.toArray())).toEqual(aBefore);
  const future = cloneHumanoidScene(source.root).getObjectByName(source.body.name);
  expect(future.skeleton.boneInverses.map(matrix => matrix.toArray())).toEqual(original);
  // Surfaces on the same figure must still share that figure's inverse pose.
  const nail = current.getObjectByName('GrowthTrackNails');
  expect(nail.skeleton.boneInverses).toBe(a.skeleton.boneInverses);
  const point = new Vector3();
  goal.updateMatrixWorld(true); b.skeleton.update();
  for (let i = 0; i < b.geometry.attributes.position.count; i += 113) {
    expect(b.getVertexPosition(i, point).toArray().every(Number.isFinite)).toBe(true);
  }
});
