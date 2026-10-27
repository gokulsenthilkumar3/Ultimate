import { Bone, BufferGeometry, Float32BufferAttribute, Group, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createCanonicalCover } from './canonicalCover';
import { createParametricIdentity } from './parametricIdentity';

function bodyFixture() {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    -0.1, 0.4, 0.1, 0.1, 0.4, 0.1, -0.1, 0.55, 0.1, 0.1, 0.55, 0.1,
    -0.1, 0.8, 0, 0.1, 0.9, 0, 0, 1, 0,
    -0.1, 0, 0, 0.1, 0.1, 0, 0, 0.2, 0,
    0.4, 0.4, 0, 0.5, 0.45, 0, 0.4, 0.5, 0,
  ], 3));
  geometry.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  geometry.computeVertexNormals();
  const index = new Uint16Array(13 * 4), weight = new Float32Array(13 * 4);
  for (let vertex = 0; vertex < 13; vertex++) { index[vertex * 4] = vertex >= 10 ? 1 : 0; weight[vertex * 4] = 1; }
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(index, 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(weight, 4));
  geometry.setAttribute('uv', new Float32BufferAttribute(Array.from({ length: 26 }, (_, i) => i / 26), 2));
  const body = new SkinnedMesh(geometry);
  body.name = 'Body';
  const hips = new Bone(); hips.name = 'mixamorigHips';
  const arm = new Bone(); arm.name = 'mixamorigLeftArm'; hips.add(arm); body.add(hips);
  body.bind(new Skeleton([hips, arm]));
  const scene = new Group(); scene.add(body); scene.updateMatrixWorld(true);
  return { body, scene };
}

describe('canonical fitted-shorts preview', () => {
  it('uses compact pelvis/thigh triangles and excludes arms and the rest of the body', () => {
    const { body, scene } = bodyFixture();
    const cover = createCanonicalCover(body);
    expect(cover.mesh.parent).toBe(scene);
    expect(cover.mesh.parent).not.toBe(body);
    expect(cover.mesh.name).toBe('Fitted shorts preview');
    expect(cover.mesh.geometry.attributes.position.count).toBe(4);
    expect(cover.mesh.geometry.index.count / 3).toBe(2);
    expect(cover.mesh.geometry.attributes.position.count).toBeLessThan(body.geometry.attributes.position.count);
    expect(cover.mesh.userData.sourceVertexIndices).toEqual([0, 1, 2, 3]);
    expect(cover.mesh.userData.fitValidation).toBe('not-certified');
    expect(cover.mesh.material.transparent).toBe(false);
    expect(cover.mesh.material.roughness).toBeGreaterThan(0.9);
    expect(cover.mesh.material.metalness).toBe(0);
    cover.dispose();
  });

  it('tracks CPU-evaluated shape positions with finite normal clearance and fixed correspondence', () => {
    const { body } = bodyFixture();
    const cover = createCanonicalCover(body);
    const index = Array.from(cover.mesh.geometry.index.array);
    expect(cover.update()).toBe(false);
    const positions = body.geometry.attributes.position;
    // Move selected vertices outside the original selection band: binding is
    // stable and does not jump to a different set of triangles on each edit.
    positions.setXYZ(0, -0.2, 0.3, 0.2);
    positions.needsUpdate = true;
    body.geometry.computeVertexNormals();
    expect(cover.update()).toBe(true);
    const bodyPoint = new Vector3(), coverPoint = new Vector3(), normal = new Vector3();
    for (let vertex = 0; vertex < cover.mesh.userData.sourceVertexIndices.length; vertex++) {
      const sourceVertex = cover.mesh.userData.sourceVertexIndices[vertex];
      bodyPoint.fromBufferAttribute(positions, sourceVertex);
      coverPoint.fromBufferAttribute(cover.mesh.geometry.attributes.position, vertex);
      normal.fromBufferAttribute(body.geometry.attributes.normal, sourceVertex).normalize();
      const displacement = coverPoint.sub(bodyPoint);
      expect(displacement.length()).toBeCloseTo(0.008, 6);
      expect(displacement.dot(normal)).toBeCloseTo(0.008, 6);
      expect(displacement.toArray().every(Number.isFinite)).toBe(true);
    }
    expect(Array.from(cover.mesh.geometry.index.array)).toEqual(index);
    expect(cover.update()).toBe(false);
    cover.dispose();
  });

  it('shares skeleton/bind space and copies the selected skin/UV correspondence', () => {
    const { body, scene } = bodyFixture();
    body.position.set(1, 2, 3); body.rotation.y = 0.5; body.scale.setScalar(1.1);
    scene.updateMatrixWorld(true);
    const cover = createCanonicalCover(body);
    expect(cover.mesh.skeleton).toBe(body.skeleton);
    expect(cover.mesh.bindMode).toBe(body.bindMode);
    expect(cover.mesh.bindMatrix.elements).toEqual(body.bindMatrix.elements);
    expect(cover.mesh.position.toArray()).toEqual(body.position.toArray());
    expect(cover.mesh.quaternion.toArray()).toEqual(body.quaternion.toArray());
    expect(cover.mesh.scale.toArray()).toEqual(body.scale.toArray());
    for (const attribute of ['skinIndex', 'skinWeight', 'uv']) {
      expect(cover.mesh.geometry.attributes[attribute]).not.toBe(body.geometry.attributes[attribute]);
      for (let vertex = 0; vertex < 4; vertex++) {
        for (let component = 0; component < body.geometry.attributes[attribute].itemSize; component++) {
          expect(cover.mesh.geometry.attributes[attribute].getComponent(vertex, component)).toBe(body.geometry.attributes[attribute].getComponent(vertex, component));
        }
      }
    }
    cover.dispose();
  });

  it('follows the same posed skinning transform without baking the pose twice', () => {
    const { body, scene } = bodyFixture();
    const cover = createCanonicalCover(body);
    body.skeleton.bones[0].rotation.y = 0.6;
    scene.updateMatrixWorld(true); body.skeleton.update();
    const source = new Vector3(), fitted = new Vector3();
    body.getVertexPosition(0, source);
    cover.mesh.getVertexPosition(0, fitted);
    expect(fitted.distanceTo(source)).toBeCloseTo(0.008, 6);
    cover.dispose();
  });

  it('rejects changed topology instead of silently using stale bindings', () => {
    const { body } = bodyFixture();
    const cover = createCanonicalCover(body);
    body.geometry.index.needsUpdate = true;
    expect(() => cover.update()).toThrow(/topology changed/);
    cover.dispose();
  });

  it('owns only its mesh, geometry and material and releases them once', () => {
    const { body, scene } = bodyFixture();
    const bodyGeometryDispose = vi.spyOn(body.geometry, 'dispose');
    const bodySkeletonDispose = vi.spyOn(body.skeleton, 'dispose');
    const cover = createCanonicalCover(body);
    const geometryDispose = vi.spyOn(cover.mesh.geometry, 'dispose');
    const materialDispose = vi.spyOn(cover.mesh.material, 'dispose');
    cover.dispose(); cover.dispose();
    expect(scene.children).toContain(body);
    expect(scene.children).not.toContain(cover.mesh);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(bodyGeometryDispose).not.toHaveBeenCalled();
    expect(bodySkeletonDispose).not.toHaveBeenCalled();
    expect(() => cover.update()).toThrow(/disposed/);
  });

  it('rejects missing skinning or invalid selection and clearance settings', () => {
    expect(() => createCanonicalCover(null)).toThrow(/skinned/);
    const { body } = bodyFixture();
    expect(() => createCanonicalCover(body, { clearance: Infinity })).toThrow(/clearance/);
    expect(() => createCanonicalCover(body, { band: [0.7, 0.3] })).toThrow(/band/);
    expect(() => createCanonicalCover(body, { band: [0.6, 0.7] })).toThrow(/No pelvis/);
  });

  it('evaluates the pinned 306-target candidate and updates a compact preview on actual hip edits', async () => {
    const bytes = readFileSync('public/assets/models/parametric-base-v1.glb');
    const data = new ArrayBuffer(bytes.byteLength); new Uint8Array(data).set(bytes);
    const gltf = await new GLTFLoader().parseAsync(data, '');
    const identity = createParametricIdentity(gltf.scene);
    const body = identity.scene.getObjectByName('Body');
    const originalBody = gltf.scene.getObjectByName('Body');
    const originalPositions = Array.from(originalBody.geometry.attributes.position.array);
    const cover = createCanonicalCover(body);
    const firstPositions = Array.from(cover.mesh.geometry.attributes.position.array);
    const originalCoverIndices = Array.from(cover.mesh.geometry.index.array);
    expect(identity.statistics.largestSourceMorphBank).toBe(306);
    expect(identity.statistics.vertices).toBe(15066);
    expect(identity.statistics.viewingMorphTextureBytes).toBe(0);
    expect(cover.mesh.geometry.attributes.position.count).toBeGreaterThan(100);
    expect(cover.mesh.geometry.attributes.position.count).toBeLessThan(14517 / 2);
    expect(cover.mesh.geometry.index.count).toBeLessThan(originalBody.geometry.index.count / 2);
    const evaluation = identity.setWeights({ hipsWider: 0.8, hipsDeeper: 0.5, noseWider: 0.7 });
    expect(evaluation.changed).toBe(true);
    expect(evaluation.durationMs).toBeGreaterThanOrEqual(0);
    expect(cover.update()).toBe(true);
    expect(Array.from(cover.mesh.geometry.attributes.position.array)).not.toEqual(firstPositions);
    expect(Array.from(cover.mesh.geometry.index.array)).toEqual(originalCoverIndices);
    expect(Array.from(originalBody.geometry.attributes.position.array)).toEqual(originalPositions);
    expect(Array.from(cover.mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
    expect(cover.mesh.skeleton).toBe(body.skeleton);
    cover.dispose(); identity.dispose();
  });
});
