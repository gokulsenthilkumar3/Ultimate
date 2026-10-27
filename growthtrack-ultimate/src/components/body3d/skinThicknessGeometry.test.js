import { BoxGeometry, PlaneGeometry, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { describe, expect, it } from 'vitest';
import { traceNormalChord } from '../../../scripts/parametric-portrait/build-thickness-core.mjs';

describe('geometry-normal thickness measurement', () => {
  it('measures the known exit distance of a closed slab in metres without changing inputs', () => {
    const geometry = new BoxGeometry(0.01, 0.02, 0.03), originalIndices = geometry.index.array.slice();
    const bvh = new MeshBVH(geometry, { indirect: true });
    const point = new Vector3(0, 0, 0.015), normal = new Vector3(0, 0, 1);
    const value = traceNormalChord(bvh, point, normal);
    expect(value).toBeCloseTo(0.03, 8);
    expect(point.toArray()).toEqual([0, 0, 0.015]);
    expect(normal.toArray()).toEqual([0, 0, 1]);
    expect(geometry.index.array).toEqual(originalIndices);
    expect(traceNormalChord(bvh, new Vector3(0.005, 0, 0), new Vector3(1, 0, 0))).toBeCloseTo(0.01, 8);
    geometry.dispose();
  });

  it('scales the geometric distance with the model rather than assuming an anatomical thickness', () => {
    const geometry = new BoxGeometry(0.01, 0.02, 0.03).scale(2, 2, 2);
    const bvh = new MeshBVH(geometry, { indirect: true });
    expect(traceNormalChord(bvh, new Vector3(0, 0, 0.03), new Vector3(0, 0, 1))).toBeCloseTo(0.06, 8);
    geometry.dispose();
  });

  it('rejects an open sheet and invalid scales instead of inventing a thin surface exit', () => {
    const geometry = new PlaneGeometry(0.02, 0.02), bvh = new MeshBVH(geometry, { indirect: true });
    expect(traceNormalChord(bvh, new Vector3(), new Vector3(0, 0, 1))).toBeNull();
    expect(() => traceNormalChord(bvh, new Vector3(), new Vector3())).toThrow();
    expect(() => traceNormalChord(bvh, new Vector3(), new Vector3(0, 0, 1), { epsilonMetres: 0.1, maximumRayMetres: 0.01 })).toThrow();
    geometry.dispose();
  });
});
