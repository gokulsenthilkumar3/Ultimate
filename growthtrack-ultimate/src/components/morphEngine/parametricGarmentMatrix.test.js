// @vitest-environment node
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { describe, expect, it } from 'vitest';
import { GARMENT_POSES, GARMENT_SHAPES, garmentBoundaryFaces, measureGarmentContact } from '../../../scripts/parametric-portrait/review-garment-matrix.mjs';

function grid(segments, z) {
  const positions = [], indices = [];
  for (let y = 0; y <= segments; y++) for (let x = 0; x <= segments; x++) positions.push(-0.3 + 0.6 * x / segments, -0.3 + 0.6 * y / segments, z);
  for (let y = 0; y < segments; y++) for (let x = 0; x < segments; x++) {
    const a = y * (segments + 1) + x, b = a + 1, c = a + segments + 1, d = c + 1;
    indices.push(a, b, d, a, d, c);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

describe('independent garment triangle-interior matrix', () => {
  it('defines thirty named bodies and five explicit joint-delta fixtures', () => {
    expect(GARMENT_SHAPES).toHaveLength(30);
    expect(new Set(GARMENT_SHAPES.map(shape => shape.id)).size).toBe(30);
    expect(GARMENT_POSES).toHaveLength(5);
    expect(new Set(GARMENT_POSES.map(pose => pose.id)).size).toBe(5);
    expect(GARMENT_POSES[0].joints).toEqual({});
    expect(GARMENT_SHAPES.every(shape => Object.values(shape.parameters).every(value => value >= 0 && value <= 1))).toBe(true);
  });

  it('accepts truly separated surfaces and reports their actual triangle gap', () => {
    const body = grid(1, 0), garment = grid(6, 0.006);
    try {
      const report = measureGarmentContact(body, garment);
      expect(report.pass).toBe(true);
      expect(report.intersectionPairs).toBe(0);
      expect(report.minimumTriangleGapMm).toBeCloseTo(6, 4);
      expect(report.minimumSignedNearestMm).toBeCloseTo(6, 4);
      expect(report.independentInteriorSamples).toBe(garment.index.count / 3 * 4);
    } finally { body.dispose(); garment.dispose(); }
  });

  it('detects a body feature crossing the interior of a coarse garment despite all garment vertices clearing the base plane', () => {
    const body = grid(1, 0), garment = grid(6, 0.006);
    const positions = [...body.attributes.position.array], indices = [...body.index.array], first = positions.length / 3;
    // A small chest-like protrusion sits BETWEEN all garment vertices. Their
    // nearest flat body plane is still 6 mm below, but its apex crosses cloth.
    positions.push(0.025, 0.025, 0, 0.075, 0.025, 0, 0.075, 0.075, 0, 0.025, 0.075, 0, 0.05, 0.05, 0.02);
    for (let corner = 0; corner < 4; corner++) indices.push(first + corner, first + (corner + 1) % 4, first + 4);
    body.setAttribute('position', new Float32BufferAttribute(positions, 3)); body.setIndex(indices); body.computeVertexNormals();
    try {
      const report = measureGarmentContact(body, garment);
      expect(report.pass).toBe(false);
      expect(report.intersectionPairs).toBeGreaterThan(0);
      expect(report.intersectingInteriorGarmentTriangles).toBeGreaterThan(0);
      expect(report.intersectingOpeningBoundaryTriangles).toBe(0);
      expect(report.minimumTriangleGapMm).toBe(0);
      expect([...garment.attributes.position.array].filter((_, index) => index % 3 === 2).every(value => value > 0.0059)).toBe(true);
      const boundary = garmentBoundaryFaces(garment);
      expect(boundary.vertices).toBe(24);
      expect(boundary.faces.size).toBeLessThan(garment.index.count / 3);
    } finally { body.dispose(); garment.dispose(); }
  });
});
