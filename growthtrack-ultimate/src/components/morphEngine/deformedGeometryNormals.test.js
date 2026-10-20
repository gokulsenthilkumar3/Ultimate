import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createMorphNormalUpdater } from './deformedGeometryNormals';

describe('pose-dependent anatomy normals', () => {
  const mesh = () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], 3));
    geometry.setIndex([0, 1, 2, 1, 3, 2]); geometry.computeVertexNormals();
    geometry.morphTargetsRelative = true;
    geometry.morphAttributes.position = [new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 3)];
    const instance = new THREE.Mesh(geometry); instance.morphTargetInfluences = [.75]; return instance;
  };
  it('matches normals recomputed from the actual deformed surface and skips unchanged poses', () => {
    const instance = mesh(); const update = createMorphNormalUpdater(instance);
    expect(update()).toBe(true);
    const expected = instance.geometry.clone();
    expected.attributes.position.setZ(3, .75); expected.computeVertexNormals();
    expect(Array.from(instance.geometry.attributes.normal.array)).toEqual(Array.from(expected.attributes.normal.array));
    expect(update()).toBe(false);
    instance.morphTargetInfluences[0] = .2; expect(update()).toBe(true); update.dispose();
  });
  it('keeps independently owned comparison geometry isolated', () => {
    const first = mesh(); const second = mesh(); const before = Array.from(second.geometry.attributes.normal.array);
    createMorphNormalUpdater(first)(); expect(Array.from(second.geometry.attributes.normal.array)).toEqual(before);
  });
});
