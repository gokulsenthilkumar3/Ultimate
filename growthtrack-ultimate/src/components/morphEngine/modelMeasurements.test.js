import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Mesh } from 'three';
import { horizontalContours, measureModelSections, neutralMorphPositions } from './modelMeasurements';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { computeMorphWeights } from './metricsToBlendshapes';

function prism(polygon, { open = false, duplicateSeams = false } = {}) {
  const vertices = [], indices = [];
  for (const y of [0, 2]) for (const [x, z] of polygon) vertices.push(x, y, z);
  const n = polygon.length;
  for (let i = 0; i < n - (open ? 1 : 0); i++) {
    const j = (i + 1) % n;
    indices.push(i, j, n + i, j, n + j, n + i);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices);
  return new Mesh(duplicateSeams ? geometry.toNonIndexed() : geometry);
}
const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

describe('neutral model cross-sections', () => {
  it('measures actual concave contours and welds duplicated UV vertices without using a hull', () => {
    const polygon = [[-1,-1],[1,-1],[1,1],[0,0],[-1,1]];
    for (const duplicateSeams of [false, true]) {
      const mesh = prism(polygon, { duplicateSeams });
      const [contour] = horizontalContours(neutralMorphPositions(mesh), mesh.geometry.index, 1);
      expect(contour.perimeter).toBeCloseTo(6 + 2 * Math.sqrt(2), 6);
    }
  });
  it('rejects open contours instead of closing gaps with invented edges', () => {
    const mesh = prism(square, { open: true });
    expect(horizontalContours(neutralMorphPositions(mesh), mesh.geometry.index, 1)).toEqual([]);
    expect(measureModelSections(mesh, {}, { waist: 90 })[1]).toMatchObject({ measured: null, error: null, entered: 90 });
  });
  it('excludes detached limb contours and refuses ambiguous central surfaces', () => {
    const torso = prism(square).geometry.toNonIndexed();
    const append = offset => {
      const second = torso.attributes.position.array.slice();
      for (let i = 0; i < second.length; i += 3) second[i] += offset;
      const mesh = new Mesh(new BufferGeometry());
      mesh.geometry.setAttribute('position', new Float32BufferAttribute([...torso.attributes.position.array, ...second], 3));
      return mesh;
    };
    // A pair of separate legs has no contour spanning the model centre.
    expect(measureModelSections(append(4))[1].measured).toBeNull();
    const limbs = Array.from(torso.attributes.position.array, (value, i) => i % 3 === 1 ? value : value * .2);
    const mesh = new Mesh(new BufferGeometry());
    const right = limbs.map((value, i) => i % 3 === 0 ? value + 2 : value);
    const left = limbs.map((value, i) => i % 3 === 0 ? value - 2 : value);
    mesh.geometry.setAttribute('position', new Float32BufferAttribute([...torso.attributes.position.array, ...left, ...right], 3));
    expect(measureModelSections(mesh)[1].measured).toBeCloseTo(700, 6);
    mesh.geometry.setAttribute('position', new Float32BufferAttribute([...torso.attributes.position.array, ...limbs], 3));
    expect(measureModelSections(mesh)[1].measured).toBeNull();
  });
  it('uses physical reference scale and never treats absent targets as entered measurements', () => {
    const mesh = prism(square);
    const small = measureModelSections(mesh, {}, { height: 150, waist: 90 });
    const tall = measureModelSections(mesh, {}, { height: 200, waist: 90 });
    expect(small).toEqual(tall);
    expect(small[1]).toMatchObject({ measured: 700, entered: 90, error: 610 });
    expect(small[0]).toMatchObject({ entered: null, error: null });
  });
  it('handles relative and absolute morphs without applying pose or changing shared geometry', () => {
    for (const relative of [false, true]) {
      const mesh = prism(square), base = mesh.geometry.attributes.position;
      mesh.geometry.morphTargetsRelative = relative;
      const target = Array.from(base.array, (value, i) => relative ? (i % 3 === 1 ? 0 : value) : (i % 3 === 1 ? value : value * 2));
      mesh.geometry.morphAttributes.position = [new Float32BufferAttribute(target, 3)];
      mesh.morphTargetDictionary = { expand: 0 }; mesh.morphTargetInfluences = [.9];
      const before = base.array.slice();
      const points = neutralMorphPositions(mesh, { expand: .5, unknown: 1, constructor: 1 });
      expect(horizontalContours(points, mesh.geometry.index, 1)[0].perimeter).toBeCloseTo(12, 6);
      expect(base.array).toEqual(before); expect(mesh.morphTargetInfluences).toEqual([.9]);
    }
  });
  it.each(['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb','humanoid-preview-75.glb','humanoid-preview-75-lite.glb'])('measures the real torso and responds to shape changes in %s', file => {
    const { body } = glbMeshFixture(file), before = body.geometry.attributes.position.array.slice();
    const metrics = { height: 175, weight: 74, chest: 98, waist: 82, hips: 98 };
    const rows = measureModelSections(body, computeMorphWeights(metrics), metrics);
    for (const row of rows) {
      expect(row.measured, `${file} ${row.key}`).toBeGreaterThan(40);
      expect(row.measured).toBeLessThan(160);
      expect(row.error).toBeCloseTo(row.measured - metrics[row.key], 6);
    }
    const larger = measureModelSections(body, computeMorphWeights({ ...metrics, weight: 110, waist: 115 }), metrics);
    expect(larger[1].measured).toBeGreaterThan(rows[1].measured);
    expect(body.geometry.attributes.position.array).toEqual(before);
    body.geometry.dispose();
  });
});
