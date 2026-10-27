// @vitest-environment node
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { expect, it } from 'vitest';
import { createBodyCollisionProxies, fitGarmentProxies } from './garmentProxyFit.js';

it('encloses every source triangle and keeps a finger as a separate collision part', () => {
  const torso = new BoxGeometry(1, 1, 1), finger = new BoxGeometry(0.1, 0.1, 0.3).translate(1, 0, 0);
  const geometry = mergeGeometries([torso, finger]);
  const count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i >= torso.attributes.position.count * 4 ? 1 : 0), 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
  const mesh = { geometry, skeleton: { bones: [{ name: 'mixamorigHips' }, { name: 'mixamorigLeftHandIndex1' }] } };
  const original = geometry.attributes.position.array.slice();
  const proxies = createBodyCollisionProxies(mesh, geometry);
  expect(proxies.map(proxy => proxy.region)).toEqual(['pelvis', 'left-index']);
  for (let vertex = 0; vertex < count; vertex++) {
    const proxy = proxies[vertex >= torso.attributes.position.count ? 1 : 0];
    const point = new Vector3().fromBufferAttribute(geometry.attributes.position, vertex);
    for (const plane of proxy.planes) expect(plane.normal.dot(point)).toBeLessThanOrEqual(plane.constant);
  }
  expect(geometry.attributes.position.array).toEqual(original);
  geometry.dispose(); torso.dispose(); finger.dispose();
});

it('moves UV duplicates together and reports an unsatisfied proxy when the displacement bound prevents separation', () => {
  const cube = new BoxGeometry(1, 1, 1);
  cube.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(cube.attributes.position.count * 4), 4));
  cube.setAttribute('skinWeight', new Float32BufferAttribute(Array.from({ length: cube.attributes.position.count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
  const proxies = createBodyCollisionProxies({ geometry: cube, skeleton: { bones: [{ name: 'mixamorigHips' }] } }, cube);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-0.1, 0, 0.501, 0.1, 0, 0.501, 0, 0.2, 0.501, -0.1, 0, 0.501], 3));
  geometry.setIndex([0, 1, 2, 3, 1, 2]);
  const original = geometry.attributes.position.array.slice();
  const options = { originalVertices: [0, 1, 2, 0], outwardNormals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]) };
  const bounded = fitGarmentProxies(proxies, geometry, { ...options, maxDisplacementMetres: 0.001, maxIterations: 3 });
  expect(bounded.converged).toBe(false); expect(bounded.saturated).toBe(true);
  expect(bounded.maximumDisplacementMetres).toBeLessThanOrEqual(0.00100001);
  geometry.attributes.position.array.set(original);
  const solved = fitGarmentProxies(proxies, geometry, options);
  expect(solved.converged).toBe(true);
  expect(geometry.attributes.position.getZ(0)).toBeGreaterThanOrEqual(0.503);
  expect(new Vector3().fromBufferAttribute(geometry.attributes.position, 0)).toEqual(new Vector3().fromBufferAttribute(geometry.attributes.position, 3));
  geometry.dispose(); cube.dispose();
});
