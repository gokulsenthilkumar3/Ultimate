// @vitest-environment node
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { expect, it } from 'vitest';
import { createSurfaceGraph, graphGeodesicDistances, createGeodesicGarmentProjection } from './geodesicGarmentProjection.js';
import { measureBodySelfContact } from '../../../scripts/parametric-portrait/body-self-contact.mjs';

it('follows surface edges instead of jumping across spatially close body parts', () => {
  const graph = { representatives: [0, 1, 2, 3], neighbors: [[1], [0, 2], [1, 3], [2]] };
  const lengths = [[1], [1, 1], [1, 1], [1]];
  expect([...graphGeodesicDistances(graph, lengths, 0)]).toEqual([0, 1, 2, 3]);
  expect(graphGeodesicDistances(graph, lengths, 0, 1.5)[3]).toBe(Infinity);
});

it('welds reference UV duplicates and preserves a planar identity under rigid translation', () => {
  const body = new BufferGeometry();
  body.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0], 3));
  body.setIndex([0, 1, 2, 4, 2, 3]); body.computeVertexNormals();
  const graph = createSurfaceGraph(body); expect(graph.ids[0]).toBe(graph.ids[4]);
  const garment = body.clone().translate(0, 0, 0.01);
  const data = { originalVertices: [0, 1, 2, 3, 0], clearanceBindings: [0, 1, 2, 3, 0].map(vertex => ({ indices: [vertex], weights: [1] })) };
  const projection = createGeodesicGarmentProjection(body, garment, data);
  const original = body.attributes.position.array.slice();
  const posedBody = body.clone().translate(0.5, 0.2, 0), posedGarment = garment.clone().translate(0.5, 0.2, 0);
  const expected = posedGarment.attributes.position.array.slice();
  const result = projection.project(posedBody, posedGarment);
  expect(result.collisionCertified).toBe(false); expect(result.relaxationSweeps).toBe(3);
  expected.forEach((value, i) => expect(posedGarment.attributes.position.array[i]).toBeCloseTo(value, 5));
  expect(body.attributes.position.array).toEqual(original);
  [body, garment, posedBody, posedGarment].forEach(geometry => geometry.dispose());
});

it('counts a proper nonadjacent body crossing once, independently of garment diagnostics', () => {
  const body = new BufferGeometry();
  body.setAttribute('position', new Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0.2, -1, 0, 0.2, 1, 0, -0.5, 0], 3));
  body.setIndex([0, 1, 2, 3, 4, 5]);
  const report = measureBodySelfContact(body);
  expect(report.nonadjacentCrossingPairs).toBe(1); expect(report.crossingTriangles).toBe(2);
  body.dispose();
});

it('preserves triangle-interior bindings when approximate chart neighbors differ from authored weights', () => {
  const body = new BufferGeometry();
  body.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0.1, 0, 0, 0.1, 0.1, 0, 0, 0.1, 0], 3));
  body.setIndex([0, 1, 2, 0, 2, 3]); body.computeVertexNormals();
  const garment = new BufferGeometry();
  garment.setAttribute('position', new Float32BufferAttribute([0.025, 0.025, 0.01, 0.075, 0.025, 0.01, 0.075, 0.075, 0.01, 0.025, 0.025, 0.01], 3));
  garment.setIndex([0, 1, 2, 3, 1, 2]); garment.computeVertexNormals();
  const data = { originalVertices: [0, 1, 2, 0], clearanceBindings: [[0.75, 0, 0.25], [0.25, 0.5, 0.25], [0.25, 0, 0.75], [0.75, 0, 0.25]].map(weights => ({ indices: [0, 1, 2], weights })) };
  const projection = createGeodesicGarmentProjection(body, garment, data);
  const posedBody = body.clone().translate(0.05, 0.02, 0), posedGarment = garment.clone().translate(0.05, 0.02, 0);
  const expected = posedGarment.attributes.position.array.slice();
  try {
    projection.project(posedBody, posedGarment);
    expected.forEach((value, index) => expect(posedGarment.attributes.position.array[index]).toBeCloseTo(value, 6));
    expect(projection.project(posedBody, posedGarment).fieldCacheHit).toBe(true);
    posedBody.scale(1.1, 1, 1);
    expect(projection.project(posedBody, posedGarment).fieldCacheHit).toBe(false);
    expect(projection.project(posedBody, posedGarment).fieldCacheHit).toBe(true);
  } finally { [body, garment, posedBody, posedGarment].forEach(geometry => geometry.dispose()); }
});
