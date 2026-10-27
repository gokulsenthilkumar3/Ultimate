import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bone, BufferGeometry, Float32BufferAttribute, Group, MeshStandardMaterial, Skeleton, SkinnedMesh, Texture, Uint16BufferAttribute } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { exportRiggedParametricAvatar, normalizeExportedSkinRoots } from './parametricExport';

afterEach(() => vi.restoreAllMocks());

describe('canonical skin root export', () => {
  it('uses the actual common ancestor instead of the first joint', () => {
    const input = { nodes: [{ name: 'hips', children: [1, 3] }, { name: 'spine', children: [2] }, { name: 'head' }, { name: 'leg' }], skins: [{ joints: [2, 3, 1, 0], skeleton: 2 }] };
    normalizeExportedSkinRoots(input);
    expect(input.skins[0].skeleton).toBe(0);
    expect(input.skins[0].joints).toEqual([2, 3, 1, 0]);
  });
  it('omits the optional root when joints form separate trees', () => {
    const input = { nodes: [{}, {}], skins: [{ joints: [0, 1], skeleton: 0 }] };
    normalizeExportedSkinRoots(input);
    expect(input.skins[0]).not.toHaveProperty('skeleton');
  });
  it('rejects cycles, invalid indices and multiple parents', () => {
    expect(() => normalizeExportedSkinRoots({ nodes: [{ children: [1] }, { children: [0] }], skins: [{ joints: [0] }] })).toThrow(/hierarchy/);
    expect(() => normalizeExportedSkinRoots({ nodes: [{}], skins: [{ joints: [2] }] })).toThrow(/hierarchy/);
    expect(() => normalizeExportedSkinRoots({ nodes: [{ children: [2] }, { children: [2] }, {}], skins: [] })).toThrow(/ancestry/);
  });
});

describe('portable normal-map tangent export', () => {
  it.each(['success', 'rejection'])('owns export tangents without changing or disposing the live avatar on %s', async outcome => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(12), 4));
    geometry.setAttribute('skinWeight', new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    geometry.setIndex([0, 1, 2]); geometry.computeVertexNormals();
    geometry.morphTargetsRelative = true;
    geometry.morphAttributes.position = [new Float32BufferAttribute([0, 0, 0.1, 0, 0, 0, 0, 0, 0], 3)];
    const liveMaterial = new MeshStandardMaterial();
    const normalMap = new Texture();
    const exportMaterial = new MeshStandardMaterial({ normalMap });
    const body = new SkinnedMesh(geometry, liveMaterial); body.name = 'Body';
    const root = new Bone(); root.name = 'Root'; body.add(root); body.bind(new Skeleton([root]));
    const source = new Group(); source.add(body); source.updateMatrixWorld(true);
    const originalAttributes = { ...geometry.attributes };
    const originalValues = Object.fromEntries(Object.entries(originalAttributes).map(([key, attribute]) => [key, Array.from(attribute.array)]));
    const originalMorph = geometry.morphAttributes.position[0];
    const originalMorphValues = Array.from(originalMorph.array);
    const originalIndex = geometry.index;
    const liveGeometryDispose = vi.spyOn(geometry, 'dispose');
    const liveMaterialDispose = vi.spyOn(liveMaterial, 'dispose');
    const exportMaterialDispose = vi.spyOn(exportMaterial, 'dispose');
    const normalMapDispose = vi.spyOn(normalMap, 'dispose');
    const liveSkeletonDispose = vi.spyOn(body.skeleton, 'dispose');
    let resolve, reject, exportedGeometry, temporaryGeometryDispose, temporaryMaterialDispose, temporarySkeletonDispose;
    const serialization = new Promise((yes, no) => { resolve = yes; reject = no; });
    vi.spyOn(GLTFExporter.prototype, 'parseAsync').mockImplementation(scene => {
      const exported = scene.getObjectByName('Body');
      exportedGeometry = exported.geometry;
      expect(exportedGeometry).not.toBe(geometry);
      expect(exportedGeometry.attributes.tangent.itemSize).toBe(4);
      expect(exportedGeometry.attributes.tangent.count).toBe(geometry.attributes.position.count);
      expect(Array.from(exportedGeometry.attributes.tangent.array).every(Number.isFinite)).toBe(true);
      const tangent = exportedGeometry.attributes.tangent;
      for (let vertex = 0; vertex < tangent.count; vertex++) {
        expect(Math.hypot(tangent.getX(vertex), tangent.getY(vertex), tangent.getZ(vertex))).toBeCloseTo(1);
        expect(Math.abs(tangent.getW(vertex))).toBe(1);
      }
      expect(exported.material.normalMap).toBe(normalMap);
      temporaryGeometryDispose = vi.spyOn(exportedGeometry, 'dispose');
      temporaryMaterialDispose = vi.spyOn(exported.material, 'dispose');
      temporarySkeletonDispose = vi.spyOn(exported.skeleton, 'dispose');
      return serialization;
    });

    const pending = exportRiggedParametricAvatar(source, { geometry: 'identity-baked-rigged' }, { bodyMaterial: exportMaterial });
    expect(exportedGeometry).toBeDefined();
    expect(temporaryGeometryDispose).not.toHaveBeenCalled();
    expect(geometry.attributes.tangent).toBeUndefined();
    if (outcome === 'rejection') {
      const failure = new Error('The GLB could not be serialized');
      const assertion = expect(pending).rejects.toBe(failure);
      reject(failure); await assertion;
    } else {
      const bytes = new ArrayBuffer(12); resolve(bytes);
      expect(await pending).toBe(bytes);
    }

    expect(temporaryGeometryDispose).toHaveBeenCalledTimes(1);
    expect(temporaryMaterialDispose).toHaveBeenCalledTimes(1);
    expect(temporarySkeletonDispose).toHaveBeenCalledTimes(1);
    expect(body.parent).toBe(source);
    expect(body.geometry).toBe(geometry);
    expect(body.material).toBe(liveMaterial);
    expect(geometry.index).toBe(originalIndex);
    expect(Array.from(geometry.index.array)).toEqual([0, 1, 2]);
    expect(geometry.attributes.tangent).toBeUndefined();
    expect(Object.keys(geometry.attributes)).toEqual(Object.keys(originalAttributes));
    for (const [key, attribute] of Object.entries(originalAttributes)) {
      expect(geometry.attributes[key]).toBe(attribute);
      expect(Array.from(attribute.array)).toEqual(originalValues[key]);
    }
    expect(geometry.morphAttributes.position[0]).toBe(originalMorph);
    expect(Array.from(originalMorph.array)).toEqual(originalMorphValues);
    for (const dispose of [liveGeometryDispose, liveMaterialDispose, exportMaterialDispose, normalMapDispose, liveSkeletonDispose]) {
      expect(dispose).not.toHaveBeenCalled();
    }
  });
});
