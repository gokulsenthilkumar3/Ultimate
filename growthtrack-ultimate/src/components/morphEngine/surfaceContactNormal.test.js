// @vitest-environment node
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { createSurfaceContactNormal } from './surfaceContactNormal.js';

it('uses the same crease normal from either face, including welded UV seams', () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    0, 0, 0, 0, 1, 0, -1, 0, 0,
    0, 0, 0, 0, 0, -1, 0, 1, 0,
  ], 3));
  geometry.setIndex([0, 1, 2, 3, 4, 5]);
  const before = geometry.attributes.position.array.slice();
  const contactNormal = createSurfaceContactNormal(geometry);
  const expected = new Vector3(1, 0, 1).normalize();
  for (const point of [new Vector3(0, 0.5, 0), new Vector3(0, 0, 0)]) {
    expect(contactNormal(0, point, new Vector3()).distanceTo(expected)).toBeLessThan(1e-7);
    expect(contactNormal(1, point, new Vector3()).distanceTo(expected)).toBeLessThan(1e-7);
  }
  expect(contactNormal(0, new Vector3(-0.2, 0.2, 0), new Vector3()).toArray()).toEqual([0, 0, 1]);
  expect(contactNormal(1, new Vector3(0, 0.2, -0.2), new Vector3()).toArray()).toEqual([1, 0, 0]);
  expect(geometry.attributes.position.array).toEqual(before);
  geometry.dispose();
});
