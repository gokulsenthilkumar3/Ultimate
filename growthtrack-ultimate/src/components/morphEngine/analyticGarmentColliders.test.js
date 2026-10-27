// @vitest-environment node
import { Bone, Box3, BoxGeometry, BufferGeometry, Float32BufferAttribute, Line3, Uint16BufferAttribute, Vector3 } from 'three';
import { ExtendedTriangle } from 'three-mesh-bvh';
import { expect, it } from 'vitest';
import { createBoneCollisionProxies } from './boneCollisionProxies.js';
import { capsuleTriangleDistance, classifyAnalyticExterior, fitAnalyticGarmentColliders } from './analyticGarmentColliders.js';
import { triangleIntersectsConvex } from './proxyClassification.js';

function triangleGeometry(z = 0) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-0.1, -0.1, z, 0.1, -0.1, z, 0, 0.1, z, -0.1, -0.1, z], 3));
  geometry.setIndex([0, 1, 2, 3, 1, 2]); geometry.computeVertexNormals(); return geometry;
}
function capsule(overrides = {}) {
  const start = [0, 0, -0.01], end = [0, 0, 0.01], radius = 0.02;
  return { kind: 'capsule', region: 'lefthandindex1', start, end, radius, clearance: 0, sourceFaces: Array.from({ length: 12 }, (_, i) => i),
    planes: [0, 1, 2].flatMap(axis => [-1, 1].map(sign => ({ normal: new Vector3().setComponent(axis, sign) }))),
    bounds: new Box3(new Vector3(-0.02, -0.02, -0.03), new Vector3(0.02, 0.02, 0.03)), ...overrides };
}

it('detects a capsule axis piercing a triangle whose vertices and edges all miss the capsule', () => {
  const triangle = new ExtendedTriangle(new Vector3(-1, -1, 0), new Vector3(1, -1, 0), new Vector3(0, 1, 0));
  const segment = new Line3(new Vector3(0, 0, -1), new Vector3(0, 0, 1));
  expect(triangle.closestPointToSegment(segment)).toBeGreaterThan(0.4);
  expect(capsuleTriangleDistance(triangle, segment)).toBe(0);
  segment.start.set(0, 0, 0.3); segment.end.set(0, 0, 0.5);
  expect(capsuleTriangleDistance(triangle, segment)).toBeCloseTo(0.3, 10);
});

it('classifies the curved capsule rather than its outer support polyhedron and refuses uncovered source skin', () => {
  const body = new BoxGeometry(0.01, 0.01, 0.01), garment = triangleGeometry(0.04);
  try {
    expect(classifyAnalyticExterior(body, garment, [capsule()]).outsideProxy).toBe(true);
    garment.translate(0, 0, -0.04);
    expect(classifyAnalyticExterior(body, garment, [capsule()]).contactPairs).toBe(2);
    expect(classifyAnalyticExterior(body, garment, [capsule({ sourceFaces: [] })]).enclosedSource).toBe(false);
    expect(() => classifyAnalyticExterior(body, garment, [capsule({ radius: NaN })])).toThrow(/capsule/);
    expect(() => classifyAnalyticExterior(body, garment, [capsule({ clearance: 0.003 })])).toThrow(/unexpanded/);
  } finally { body.dispose(); garment.dispose(); }
});

it('distinguishes a curved capsule from the conservative 26-plane approximation', () => {
  const triangle = new ExtendedTriangle(new Vector3(0.0194, 0.008, -0.001), new Vector3(0.0194, 0.008, 0.001), new Vector3(0.0195, 0.0081, 0));
  const axis = new Line3(new Vector3(0, 0, -0.01), new Vector3(0, 0, 0.01)), radius = 0.02, planes = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
    if (!x && !y && !z) continue;
    const normal = new Vector3(x, y, z).normalize();
    planes.push({ normal, constant: Math.max(normal.dot(axis.start), normal.dot(axis.end)) + radius });
  }
  expect(triangleIntersectsConvex(triangle.points, planes)).toBe(true);
  expect(capsuleTriangleDistance(triangle, axis)).toBeGreaterThan(radius);
});

it('fits whole triangles, preserves UV duplicates and does not hide a displacement-bound failure', () => {
  const body = new BoxGeometry(0.01, 0.01, 0.01), garment = triangleGeometry(), original = garment.attributes.position.array.slice();
  const options = { originalVertices: [0, 1, 2, 0] };
  try {
    const limited = fitAnalyticGarmentColliders([capsule()], garment, { ...options, maxDisplacementMetres: 0.001, maxIterations: 3 });
    expect(limited.converged).toBe(false); expect(limited.saturated).toBe(true);
    expect(limited.maximumDisplacementMetres).toBeLessThan(0.0010001);
    garment.attributes.position.array.set(original);
    const solved = fitAnalyticGarmentColliders([capsule()], garment, options);
    expect(solved.converged).toBe(true);
    expect(classifyAnalyticExterior(body, garment, [capsule()]).outsideProxy).toBe(true);
    expect(new Vector3().fromBufferAttribute(garment.attributes.position, 0)).toEqual(new Vector3().fromBufferAttribute(garment.attributes.position, 3));
  } finally { body.dispose(); garment.dispose(); }
});

it.each(['mixamorigLeftHand', 'mixamorigLeftHandIndex2'])('fits a curved %s capsule around every assigned skin corner', name => {
  const bone = new Bone(); bone.name = name; bone.rotation.set(0.4, 0.8, 0.2); bone.position.set(1, 2, 3); bone.updateMatrixWorld(true);
  const geometry = new BoxGeometry(0.03, 0.12, 0.02).applyMatrix4(bone.matrixWorld), count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
  const [collider] = createBoneCollisionProxies({ geometry, skeleton: { bones: [bone] } }, geometry, 0, { analytic: true });
  expect(collider.kind).toBe('capsule');
  const axis = new Line3(new Vector3().fromArray(collider.start), new Vector3().fromArray(collider.end));
  for (let vertex = 0; vertex < count; vertex++) {
    const point = new Vector3().fromBufferAttribute(geometry.attributes.position, vertex);
    expect(point.distanceTo(axis.closestPointToPoint(point, true, new Vector3()))).toBeLessThanOrEqual(collider.radius + 1e-7);
  }
  geometry.dispose();
});
