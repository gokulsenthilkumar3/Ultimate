import { Bone, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createParametricIdentity, estimateMorphTextureBytes, readMorphCapabilities } from './parametricIdentity';

function triangle({ relative = true, name = 'Body', skin = false } = {}) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  geometry.morphTargetsRelative = relative;
  const deltas = [[0, 0, 1, 0, 0, 0, 0, 0, 0], [1, 0, 0, 1, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0, 0, -0.2, 0]];
  geometry.morphAttributes.position = deltas.map(delta => new Float32BufferAttribute(delta.map((value, index) => value + (relative ? 0 : geometry.attributes.position.array[index])), 3));
  const material = new MeshStandardMaterial();
  const mesh = skin ? new SkinnedMesh(geometry, material) : new Mesh(geometry, material);
  mesh.name = name;
  mesh.morphTargetDictionary = { noseWidth: 0, bodyWidth: 1, blink: 2 };
  if (skin) {
    geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(12), 4));
    geometry.setAttribute('skinWeight', new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    const root = new Bone(); root.name = 'Root';
    const child = new Bone(); child.name = 'Head'; root.add(child);
    mesh.add(root); mesh.bind(new Skeleton([root, child]));
  }
  return mesh;
}

function sceneWith(...meshes) { const scene = new Group(); scene.add(...meshes); return scene; }
function points(instance, name = 'Body') { return Array.from(instance.scene.getObjectByName(name).geometry.attributes.position.array); }

describe('CPU-baked parametric identity', () => {
  it.each([true, false])('evaluates relative=%s identity, resets omitted targets and removes every identity GPU layer', (relative) => {
    const source = triangle({ relative });
    const instance = createParametricIdentity(sceneWith(source));
    expect(instance.setWeights({ noseWidth: 0.5, bodyWidth: 0.25 }).changed).toBe(true);
    expect(points(instance)).toEqual([0.25, 0, 0.5, 1.25, 0, 0, 0.25, 1, 0]);
    const view = instance.scene.getObjectByName('Body');
    expect(view.geometry.morphAttributes).toEqual({});
    expect(view.morphTargetDictionary).toEqual({});
    expect(view.morphTargetInfluences).toEqual([]);
    const again = instance.setWeights({ bodyWidth: 0.25, noseWidth: 0.5, unknown: 1 });
    expect(again.changed).toBe(false);
    expect(again.updatedMeshes).toBe(0);
    expect(again.durationMs).toBeGreaterThanOrEqual(0);
    instance.setWeights({ bodyWidth: 0.25 });
    expect(points(instance)).toEqual([0.25, 0, 0, 1.25, 0, 0, 0.25, 1, 0]);
    instance.dispose();
  });

  it('keeps Current/Goal, immutable basis, UVs and materials independent', () => {
    const mesh = triangle();
    const scene = sceneWith(mesh);
    const first = createParametricIdentity(scene), second = createParametricIdentity(scene);
    const originalPositions = Array.from(mesh.geometry.attributes.position.array);
    const originalTargets = Array.from(mesh.geometry.morphAttributes.position[0].array);
    first.setWeights({ noseWidth: 1 });
    expect(points(second)).toEqual(originalPositions);
    expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(originalPositions);
    expect(Array.from(mesh.geometry.morphAttributes.position[0].array)).toEqual(originalTargets);
    const firstView = first.scene.getObjectByName('Body');
    const secondView = second.scene.getObjectByName('Body');
    firstView.geometry.attributes.uv.setX(0, 0.8);
    firstView.material.color.set('red');
    expect(mesh.geometry.attributes.uv.getX(0)).toBe(0);
    expect(secondView.geometry.attributes.uv.getX(0)).toBe(0);
    expect(secondView.material.color.getHex()).toBe(mesh.material.color.getHex());
    expect(secondView.material.color.getHex()).not.toBe(firstView.material.color.getHex());
    first.dispose(); second.dispose();
  });

  it('updates normals and bounds from actual evaluated positions', () => {
    const instance = createParametricIdentity(sceneWith(triangle()));
    instance.setWeights({ noseWidth: 0.8 });
    const geometry = instance.scene.getObjectByName('Body').geometry;
    const expected = new BufferGeometry();
    expected.setAttribute('position', geometry.attributes.position.clone());
    expected.setIndex([0, 1, 2]); expected.computeVertexNormals();
    expect(Array.from(geometry.attributes.normal.array)).toEqual(Array.from(expected.attributes.normal.array));
    expect(geometry.boundingBox.max.z).toBeCloseTo(0.8);
    expect(geometry.boundingSphere.radius).toBeGreaterThan(0);
    instance.dispose(); expected.dispose();
  });

  it('applies shared channel names to eyes, teeth and tongue and skips unchanged meshes', () => {
    const source = sceneWith(triangle(), ...['Eyes', 'Teeth', 'Tongue'].map(name => triangle({ name })));
    const instance = createParametricIdentity(source);
    const update = instance.setWeights({ noseWidth: 0.6 });
    expect(update.updatedMeshes).toBe(4);
    for (const name of ['Body', 'Eyes', 'Teeth', 'Tongue']) expect(points(instance, name)[2]).toBeCloseTo(0.6);
    expect(instance.statistics.meshCount).toBe(4);
    expect(instance.statistics.sourceMorphTargets).toBe(12);
    expect(instance.statistics.viewingMorphTextureBytes).toBe(0);
    instance.dispose();
  });

  it('clamps source channels and ignores invalid or inherited weights', () => {
    const instance = createParametricIdentity(sceneWith(triangle()));
    instance.setWeights({ noseWidth: 100, bodyWidth: -1, blink: NaN });
    expect(points(instance)[2]).toBe(1);
    expect(points(instance)[0]).toBe(0);
    instance.setWeights({ noseWidth: Infinity, bodyWidth: '1' });
    expect(points(instance)[2]).toBe(0);
    const inherited = Object.create({ noseWidth: 1 });
    instance.setWeights(inherited);
    expect(points(instance)[2]).toBe(0);
    const signed = createParametricIdentity(sceneWith(triangle()), { minWeight: -1 });
    signed.setWeights({ noseWidth: -0.5 });
    expect(points(signed)[2]).toBe(-0.5);
    instance.dispose(); signed.dispose();
  });

  it('clones bones and inverse bind matrices, retains skin attributes and invalidates skinned bounds', () => {
    const mesh = triangle({ skin: true });
    const instance = createParametricIdentity(sceneWith(mesh));
    const view = instance.scene.getObjectByName('Body');
    expect(view.skeleton).not.toBe(mesh.skeleton);
    expect(view.skeleton.bones[0]).not.toBe(mesh.skeleton.bones[0]);
    expect(view.skeleton.bones[1].parent).toBe(view.skeleton.bones[0]);
    expect(view.skeleton.boneInverses[0]).not.toBe(mesh.skeleton.boneInverses[0]);
    view.skeleton.bones[1].position.set(1, 2, 3);
    view.skeleton.boneInverses[0].elements[12] = 2;
    expect(mesh.skeleton.bones[1].position.toArray()).toEqual([0, 0, 0]);
    expect(mesh.skeleton.boneInverses[0].elements[12]).toBe(0);
    expect(Array.from(view.geometry.attributes.skinWeight.array)).toEqual(Array.from(mesh.geometry.attributes.skinWeight.array));
    view.computeBoundingBox(); view.computeBoundingSphere();
    instance.setWeights({ bodyWidth: 1 });
    expect(view.boundingBox).toBeNull();
    expect(view.boundingSphere).toBeNull();
    instance.dispose();
  });

  it.each([true, false])('retains only declared additive expressions and rebuilds their normal deltas (relative=%s)', (relative) => {
    const source = triangle({ relative });
    const instance = createParametricIdentity(sceneWith(source), { expressionTargets: ['blink'] });
    instance.setWeights({ noseWidth: 0.5, blink: 1 });
    const view = instance.scene.getObjectByName('Body');
    expect(view.geometry.morphTargetsRelative).toBe(true);
    expect(view.geometry.morphAttributes.position).toHaveLength(1);
    expect(view.geometry.morphAttributes.normal).toHaveLength(1);
    expect(view.morphTargetDictionary).toEqual({ blink: 0 });
    // Expressions are controlled on the rendered mesh, not baked as identity.
    expect(points(instance)[7]).toBe(1);
    view.morphTargetInfluences[0] = 1;
    const point = new Vector3(); view.getVertexPosition(2, point);
    expect(point.y).toBeCloseTo(0.8);
    const expected = view.geometry.clone();
    const positions = expected.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const target = view.geometry.morphAttributes.position[0];
      positions.setXYZ(i, positions.getX(i) + target.getX(i), positions.getY(i) + target.getY(i), positions.getZ(i) + target.getZ(i));
    }
    expected.computeVertexNormals();
    for (let i = 0; i < expected.attributes.normal.array.length; i++) {
      expect(view.geometry.attributes.normal.array[i] + view.geometry.morphAttributes.normal[0].array[i]).toBeCloseTo(expected.attributes.normal.array[i]);
    }
    expect(instance.statistics.largestViewingMorphBank).toBe(1);
    expect(instance.statistics.viewingMorphTextureBytes).toBe(3 * 2 * 16);
    instance.dispose(); expected.dispose();
  });

  it('does not put a 306-target source bank on viewing geometry', () => {
    const mesh = triangle();
    const delta = mesh.geometry.morphAttributes.position[0];
    mesh.geometry.morphAttributes.position = Array.from({ length: 306 }, () => delta);
    mesh.morphTargetDictionary = Object.fromEntries(Array.from({ length: 306 }, (_, index) => [`shape${index}`, index]));
    mesh.morphTargetInfluences = new Array(306).fill(0);
    const instance = createParametricIdentity(sceneWith(mesh));
    expect(instance.statistics.largestSourceMorphBank).toBe(306);
    expect(instance.statistics.largestViewingMorphBank).toBe(0);
    expect(instance.statistics.sourceMorphTextureBytes).toBe(3 * 16 * 306);
    expect(instance.statistics.viewingMorphTextureBytes).toBe(0);
    expect(mesh.geometry.morphAttributes.position).toHaveLength(306);
    instance.setWeights({ shape305: 0.4 });
    expect(points(instance)[2]).toBeCloseTo(0.4);
    instance.dispose();
  });

  it('disposes only owned geometry/materials/skeleton once and rejects use after disposal', () => {
    const mesh = triangle({ skin: true });
    const sourceGeometryDispose = vi.spyOn(mesh.geometry, 'dispose');
    const sourceMaterialDispose = vi.spyOn(mesh.material, 'dispose');
    const sourceSkeletonDispose = vi.spyOn(mesh.skeleton, 'dispose');
    const instance = createParametricIdentity(sceneWith(mesh));
    const view = instance.scene.getObjectByName('Body');
    const geometryDispose = vi.spyOn(view.geometry, 'dispose');
    const materialDispose = vi.spyOn(view.material, 'dispose');
    const skeletonDispose = vi.spyOn(view.skeleton, 'dispose');
    instance.dispose(); instance.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(skeletonDispose).toHaveBeenCalledTimes(1);
    expect(sourceGeometryDispose).not.toHaveBeenCalled();
    expect(sourceMaterialDispose).not.toHaveBeenCalled();
    expect(sourceSkeletonDispose).not.toHaveBeenCalled();
    expect(() => instance.setWeights({})).toThrow(/disposed/);
  });

  it('rejects invalid scenes, ranges, morph correspondence and input documents', () => {
    expect(() => createParametricIdentity(null)).toThrow(/GLTF/);
    expect(() => createParametricIdentity(new Group(), { minWeight: 2, maxWeight: 1 })).toThrow(/bounds/);
    const mesh = triangle();
    mesh.geometry.morphAttributes.position[0] = new Float32BufferAttribute([0, 0, 0], 3);
    expect(() => createParametricIdentity(sceneWith(mesh))).toThrow(/correspondence/);
    const instance = createParametricIdentity(sceneWith(triangle()));
    expect(() => instance.setWeights(null)).toThrow(/object/);
    expect(() => instance.setWeights([])).toThrow(/object/);
    instance.dispose();
  });
});

describe('morph resource capabilities and estimates', () => {
  it('matches r184 RGBA32F packing with max-texture-size padding', () => {
    const geometry = triangle().geometry;
    expect(estimateMorphTextureBytes(geometry)).toBe(3 * 16 * 3);
    expect(estimateMorphTextureBytes(geometry, { maxTextureSize: 2 })).toBe(2 * 2 * 16 * 3);
    geometry.morphAttributes.normal = geometry.morphAttributes.position;
    expect(estimateMorphTextureBytes(geometry)).toBe(3 * 2 * 16 * 3);
    geometry.morphAttributes.color = geometry.morphAttributes.position;
    expect(estimateMorphTextureBytes(geometry)).toBe(3 * 3 * 16 * 3);
    expect(estimateMorphTextureBytes(new BufferGeometry())).toBe(0);
    expect(() => estimateMorphTextureBytes(geometry, { maxTextureSize: 0 })).toThrow(/positive/);
  });

  it('queries the actual enabled context and reports unsupported/unknown limits explicitly', () => {
    const context = { MAX_ARRAY_TEXTURE_LAYERS: 1, MAX_TEXTURE_SIZE: 2, getParameter: value => value === 1 ? 256 : 8192 };
    expect(readMorphCapabilities({ getContext: () => context })).toEqual({ backend: 'webgl2', maxArrayTextureLayers: 256, maxTextureSize: 8192 });
    expect(readMorphCapabilities(null)).toEqual({ backend: 'unknown', maxArrayTextureLayers: null, maxTextureSize: null });
    const blocked = { ...context, getParameter: () => { throw new Error('lost context'); } };
    expect(readMorphCapabilities(blocked).maxArrayTextureLayers).toBeNull();
  });
});
