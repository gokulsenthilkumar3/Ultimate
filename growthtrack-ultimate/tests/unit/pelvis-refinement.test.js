import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { refinePelvisMesh } from '../../scripts/refine-pelvis-assets.mjs';

describe('local pelvis topology refinement', () => {
  it('preserves original vertices, normalized rig weights, morph motion and a conforming closed surface', () => {
    const geometry = new THREE.SphereGeometry(.5, 20, 20);
    const count = geometry.attributes.position.count;
    const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([key, value]) => [key === 'position' ? 'POSITION' : key === 'normal' ? 'NORMAL' : 'TEXCOORD_0', { size: value.itemSize, values: value.array }]));
    attributes.JOINTS_0 = { size: 4, values: new Uint16Array(count * 4) };
    attributes.WEIGHTS_0 = { size: 4, values: Float32Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0) };
    const motion = Float32Array.from({ length: count * 3 }, (_, i) => i % 3 === 0 ? .1 : 0);
    const refined = refinePelvisMesh(attributes, geometry.index.array, [motion]);
    expect(refined.addedVertices).toBeGreaterThan(0);
    expect(refined.attributes.POSITION.values.slice(0, count * 3)).toEqual(Array.from(attributes.POSITION.values));
    for (let i = 0; i < refined.attributes.POSITION.values.length / 3; i += 1) {
      expect(refined.attributes.WEIGHTS_0.values.slice(i * 4, i * 4 + 4).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6);
      expect(refined.morphs[0][i * 3]).toBeCloseTo(.1, 6);
    }
    const key = vertex => [0, 1, 2].map(axis => Math.round(refined.attributes.POSITION.values[vertex * 3 + axis] * 1e6)).join(':');
    const edges = new Map();
    for (let i = 0; i < refined.indices.length; i += 3) {
      const [a, b, c] = refined.indices.slice(i, i + 3).map(key);
      for (const pair of [[a, b], [b, c], [c, a]]) {
        if (pair[0] === pair[1]) continue;
        const edge = pair.sort().join('/'); edges.set(edge, (edges.get(edge) || 0) + 1);
      }
    }
    expect([...edges.values()].every(count => count === 2)).toBe(true);
    expect(refined.attributes.NORMAL.values.every(Number.isFinite)).toBe(true);
  });
});
