import { readFileSync } from 'node:fs';
import { Bone, BufferGeometry, Float32BufferAttribute, Group, MeshStandardMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';
import { exportParametricEditingAvatar, prepareParametricEditingScene } from './parametricEditingExport';
import { createParametricIdentity } from './parametricIdentity.js';

function fixture(relative = true) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    0, 0, 0, 0, 2, 0, -0.1, 0.9, 0, 0.1, 0.9, 0, 0, 1.1, 0, 0, 1, 0.1,
  ], 3));
  geometry.setIndex([2, 3, 4, 2, 4, 5, 0, 2, 5, 1, 4, 3]);
  geometry.computeVertexNormals();
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(24), 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(Array.from({ length: 24 }, (_, index) => index % 4 === 0 ? 1 : 0), 4));
  geometry.morphTargetsRelative = relative;
  geometry.morphAttributes.position = [0.04, -0.02].map(delta => new Float32BufferAttribute(
    Array.from(geometry.attributes.position.array, (value, index) => (relative ? 0 : value) + (index % 3 === 0 ? delta : 0)), 3,
  ));
  const material = new MeshStandardMaterial({ color: '#ba8866' });
  const body = new SkinnedMesh(geometry, material); body.name = 'Body';
  body.morphTargetDictionary = { noseWider: 0, hipsWider: 1 };
  body.morphTargetInfluences = [0.1, 0.2];
  const hips = new Bone(); hips.name = 'mixamorigHips';
  const spine = new Bone(); spine.name = 'mixamorigSpine'; hips.add(spine);
  const scene = new Group(); scene.add(body, hips); scene.updateMatrixWorld(true);
  body.bind(new Skeleton([spine, hips]));
  return { scene, body, geometry, material };
}

function parseJsonGlb(data) {
  const view = new DataView(data);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, view.getUint32(12, true))));
}

describe('desktop parametric shape-editing export', () => {
  it('exports the same selected rest joints as the live fitted identity', async () => {
    const bytes = readFileSync('public/assets/models/parametric-base-v1.glb');
    const data = new ArrayBuffer(bytes.byteLength); new Uint8Array(data).set(bytes);
    const { scene } = await new GLTFLoader().parseAsync(data, '');
    const parameters = { heightTaller: 0.75, shouldersWider: 0.8, waistWider: 0.6 };
    const live = createParametricIdentity(scene); live.setWeights(parameters);
    const prepared = prepareParametricEditingScene(scene, { parameters });
    try {
      const expected = live.scene.getObjectByName('Body').skeleton;
      const actual = prepared.scene.getObjectByName('Body').skeleton;
      expect(prepared.scene.userData.avatar.rigFitting).toBe('selected-identity-rest-joints');
      expect(prepared.scene.userData.avatar.rigFitParameters).toEqual(parameters);
      expect(prepared.scene.userData.avatar.fitValidity).toEqual({ appliesTo: 'selected-identity-and-rest-pose', invalidatedBy: ['shape-weight-changes', 'pose-changes'], solverIncluded: false });
      actual.bones.forEach((bone, index) => {
        expect(bone.position.distanceTo(expected.bones[index].position)).toBeLessThan(1e-6);
        actual.boneInverses[index].elements.forEach((value, element) => expect(value).toBeCloseTo(expected.boneInverses[index].elements[element], 5));
      });
    } finally { prepared.dispose(); live.dispose(); }
  });

  it('retains all 306 pinned body shapes and separates selected Current/Goal weights without touching the source', async () => {
    const bytes = readFileSync('public/assets/models/parametric-base-v1.glb');
    const data = new ArrayBuffer(bytes.byteLength); new Uint8Array(data).set(bytes);
    const { scene } = await new GLTFLoader().parseAsync(data, '');
    const body = scene.getObjectByName('Body');
    const children = [...scene.children], parent = body.parent, geometry = body.geometry, material = body.material, skeleton = body.skeleton;
    const names = Object.keys(body.morphTargetDictionary), weights = [...body.morphTargetInfluences];
    const originalPositions = geometry.attributes.position.array.slice();
    const originalShape = geometry.morphAttributes.position[body.morphTargetDictionary.hipsWider].array.slice();
    const originalInverses = skeleton.boneInverses.map(matrix => [...matrix.elements]);
    const current = prepareParametricEditingScene(scene, { parameters: { noseWider: 0.45, hipsWider: 0.8 }, context: 'current' });
    const goal = prepareParametricEditingScene(scene, { parameters: { noseNarrower: 0.2 }, context: 'goal' });
    try {
      const currentBody = current.scene.getObjectByName('Body'), goalBody = goal.scene.getObjectByName('Body');
      expect(names).toHaveLength(306);
      expect(Object.keys(currentBody.morphTargetDictionary)).toEqual(names);
      expect(currentBody.morphTargetInfluences[body.morphTargetDictionary.noseWider]).toBe(0.45);
      expect(currentBody.morphTargetInfluences[body.morphTargetDictionary.hipsWider]).toBe(0.8);
      expect(goalBody.morphTargetInfluences[body.morphTargetDictionary.noseWider]).toBe(0);
      expect(goalBody.morphTargetInfluences[body.morphTargetDictionary.noseNarrower]).toBe(0.2);
      expect(current.statistics.bodyShapeTargets).toBe(306);
      const cover = current.scene.getObjectByName('Fitted shorts preview');
      expect(cover.morphTargetDictionary).toEqual(currentBody.morphTargetDictionary);
      expect(cover.morphTargetInfluences).toEqual(currentBody.morphTargetInfluences);
      expect(cover.morphTargetInfluences).not.toBe(currentBody.morphTargetInfluences);
      expect(cover.skeleton).toBe(currentBody.skeleton);
      for (const name of ['hipsWider', 'noseWider']) {
        const index = body.morphTargetDictionary[name];
        const sourceTarget = geometry.morphAttributes.position[index];
        const coverTarget = cover.geometry.morphAttributes.position[index];
        const expected = cover.userData.sourceVertexIndices.flatMap(vertex => [sourceTarget.getX(vertex), sourceTarget.getY(vertex), sourceTarget.getZ(vertex)]);
        expect(Array.from(coverTarget.array)).toEqual(expected);
      }
      currentBody.skeleton.boneInverses[0].elements[12] += 1;
    } finally { current.dispose(); goal.dispose(); }
    expect(scene.children).toEqual(children);
    expect(body.parent === parent).toBe(true);
    expect(body.geometry).toBe(geometry); expect(body.material).toBe(material); expect(body.skeleton).toBe(skeleton);
    expect(body.morphTargetInfluences).toEqual(weights);
    expect(geometry.attributes.position.array).toEqual(originalPositions);
    expect(geometry.morphAttributes.position[body.morphTargetDictionary.hipsWider].array).toEqual(originalShape);
    expect(skeleton.boneInverses.map(matrix => matrix.elements)).toEqual(originalInverses);
  });

  it.each([true, false])('transfers relative=%s shape deltas to the same cover vertices with neutral clearance', relative => {
    const { scene, body } = fixture(relative);
    const prepared = prepareParametricEditingScene(scene, { parameters: { noseWider: 0.75, hipsWider: 0.25 } });
    try {
      const exportedBody = prepared.scene.getObjectByName('Body');
      const cover = prepared.scene.getObjectByName('Fitted shorts preview');
      expect(cover.geometry.morphTargetsRelative).toBe(true);
      for (let index = 0; index < cover.userData.sourceVertexIndices.length; index++) {
        const vertex = cover.userData.sourceVertexIndices[index];
        const bodyPoint = new Vector3(), coverPoint = new Vector3();
        exportedBody.getVertexPosition(vertex, bodyPoint); cover.getVertexPosition(index, coverPoint);
        const normal = new Vector3().fromBufferAttribute(body.geometry.attributes.normal, vertex).normalize();
        expect(coverPoint.sub(bodyPoint).distanceTo(normal.multiplyScalar(0.008))).toBeLessThan(1e-6);
        expect(cover.geometry.morphAttributes.position[0].getX(index)).toBeCloseTo(0.04, 6);
        expect(cover.geometry.morphAttributes.position[1].getX(index)).toBeCloseTo(-0.02, 6);
      }
    } finally { prepared.dispose(); }
  });

  it('releases owned export resources once while leaving source and supplied skin resources usable', () => {
    const { scene, body, geometry, material } = fixture();
    const skin = new MeshStandardMaterial({ color: '#d99b75' });
    const sourceSpies = [geometry, material, skin, body.skeleton].map(resource => vi.spyOn(resource, 'dispose'));
    const prepared = prepareParametricEditingScene(scene, { skinMaterial: skin });
    const exportedBody = prepared.scene.getObjectByName('Body'), cover = prepared.scene.getObjectByName('Fitted shorts preview');
    const ownedSpies = [exportedBody.geometry, exportedBody.material, exportedBody.skeleton, cover.geometry, cover.material].map(resource => vi.spyOn(resource, 'dispose'));
    expect(exportedBody.geometry).not.toBe(geometry);
    expect(exportedBody.geometry.attributes.position).toBe(geometry.attributes.position);
    expect(exportedBody.material).not.toBe(skin);
    expect(exportedBody.skeleton).not.toBe(body.skeleton);
    prepared.dispose(); prepared.dispose();
    for (const spy of ownedSpies) expect(spy).toHaveBeenCalledTimes(1);
    for (const spy of sourceSpies) expect(spy).not.toHaveBeenCalled();
    expect(scene.getObjectByName('Body')).toBe(body);
    expect(scene.getObjectByName('Fitted shorts preview')).toBeUndefined();
  });

  it('writes named morphs, selected weights and a valid skin root through the actual GLB exporter', async () => {
    const { scene, body } = fixture();
    const data = await exportParametricEditingAvatar(scene, { parameters: { noseWider: 0.6 }, context: 'current' });
    const gltf = parseJsonGlb(data);
    const mesh = gltf.meshes[gltf.nodes.find(node => node.name === 'Body').mesh];
    const cover = gltf.meshes[gltf.nodes.find(node => node.name === 'Fitted_shorts_preview' || node.name === 'Fitted shorts preview').mesh];
    expect(mesh.extras.targetNames).toEqual(['noseWider', 'hipsWider']);
    expect(mesh.weights).toEqual([0.6, 0]);
    expect(mesh.primitives[0].targets).toHaveLength(2);
    expect(cover.extras.targetNames).toEqual(mesh.extras.targetNames);
    expect(cover.weights).toEqual(mesh.weights);
    expect(gltf.nodes[gltf.skins[0].skeleton].name).toBe('mixamorigHips');
    const reopened = await new GLTFLoader().parseAsync(data, '');
    expect(reopened.scene.getObjectByName('Body').morphTargetInfluences).toEqual([0.6, 0]);
    expect(reopened.scene.getObjectByName('Body').skeleton.bones).toHaveLength(2);
    expect(reopened.scene.userData.avatar).toMatchObject({
      externalShapeEdits: 'refit-joints-and-garment-after-changing-identity',
      externalPoseEdits: 'refit-garment-after-changing-pose',
      fitValidity: { appliesTo: 'selected-identity-and-rest-pose', invalidatedBy: ['shape-weight-changes', 'pose-changes'], solverIncluded: false },
    });
    expect(body.morphTargetInfluences).toEqual([0.1, 0.2]);
  });

  it('rejects incompatible state and changed wrapper transforms before exporting', () => {
    const { scene } = fixture();
    expect(() => prepareParametricEditingScene(scene, { parameters: { unknown: 0.2 } })).toThrow(/Unsupported editing shape/);
    expect(() => prepareParametricEditingScene(scene, { parameters: { noseWider: NaN } })).toThrow(/Invalid editing shape/);
    expect(() => prepareParametricEditingScene(scene, { parameters: { noseWider: 1.1 } })).toThrow(/Invalid editing shape/);
    expect(() => prepareParametricEditingScene(scene, { context: 'other' })).toThrow(/context/);
    scene.position.x = 1;
    expect(() => prepareParametricEditingScene(scene)).toThrow(/identity transform/);
  });
});
