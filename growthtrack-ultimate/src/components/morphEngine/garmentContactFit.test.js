// @vitest-environment node
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { describe, expect, it } from 'vitest';
import { fitGarmentContact } from './garmentContactFit';
import { measureGarmentContact } from '../../../scripts/parametric-portrait/review-garment-matrix.mjs';

function plane(segments, z) {
  const positions = [], indices = [];
  for (let y = 0; y <= segments; y++) for (let x = 0; x <= segments; x++) positions.push(-0.3 + 0.6 * x / segments, -0.3 + 0.6 * y / segments, z);
  for (let y = 0; y < segments; y++) for (let x = 0; x < segments; x++) {
    const a = y * (segments + 1) + x, b = a + 1, c = a + segments + 1, d = c + 1;
    indices.push(a, b, d, a, d, c);
  }
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

describe('posed garment full-surface contact correction', () => {
  it('leaves a truly separated garment and its body unchanged', () => {
    const body = plane(1, 0), garment = plane(6, 0.006), bodyBefore = body.attributes.position.array.slice(), garmentBefore = garment.attributes.position.array.slice();
    try {
      const result = fitGarmentContact(body, garment);
      expect(result.converged).toBe(true);
      expect(result.maximumDisplacementMetres).toBe(0);
      expect(body.attributes.position.array).toEqual(bodyBefore);
      expect(garment.attributes.position.array).toEqual(garmentBefore);
      expect(measureGarmentContact(body, garment).pass).toBe(true);
    } finally { body.dispose(); garment.dispose(); }
  });
  it('corrects a protrusion through a triangle interior despite initially clear garment vertices', () => {
    const body = plane(1, 0), garment = plane(6, 0.006), points = [...body.attributes.position.array], indices = [...body.index.array], first = points.length / 3;
    points.push(0.025, 0.025, 0, 0.075, 0.025, 0, 0.075, 0.075, 0, 0.025, 0.075, 0, 0.05, 0.05, 0.02);
    for (let corner = 0; corner < 4; corner++) indices.push(first + corner, first + (corner + 1) % 4, first + 4);
    body.setAttribute('position', new Float32BufferAttribute(points, 3)); body.setIndex(indices); body.computeVertexNormals();
    try {
      expect(measureGarmentContact(body, garment).pass).toBe(false);
      const result = fitGarmentContact(body, garment);
      expect(result.converged, JSON.stringify(result)).toBe(true);
      expect(result.maximumDisplacementMetres).toBeLessThan(0.04);
      expect(measureGarmentContact(body, garment).pass).toBe(true);
    } finally { body.dispose(); garment.dispose(); }
  });
  it('preserves welded UV duplicates and reports a displacement-limited failure honestly', () => {
    const body = plane(1, 0), garment = plane(1, -0.02);
    const original = [...garment.attributes.position.array]; original.push(...original.slice(0, 3));
    garment.setAttribute('position', new Float32BufferAttribute(original, 3)); garment.setIndex([0, 1, 3, 4, 3, 2]);
    try {
      const result = fitGarmentContact(body, garment, { originalVertices: [0, 1, 2, 3, 0], maxDisplacementMetres: 0.005, maxIterations: 5 });
      expect(result.converged).toBe(false); expect(result.saturated).toBe(true);
      expect(result.maximumDisplacementMetres).toBeLessThanOrEqual(0.00500001);
      expect([...garment.attributes.position.array.slice(0, 3)]).toEqual([...garment.attributes.position.array.slice(12, 15)]);
    } finally { body.dispose(); garment.dispose(); }
  });
});
