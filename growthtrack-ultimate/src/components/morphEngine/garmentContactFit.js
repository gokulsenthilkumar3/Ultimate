import { Box3, BufferGeometry, Matrix4, Vector3 } from 'three';
import { ExtendedTriangle, MeshBVH } from 'three-mesh-bvh';
import { createSurfaceContactNormal } from './surfaceContactNormal.js';

// Research alternative: Chekhmestruk & Romanyuk (2025),
// https://doi.org/10.31474/1996-1588-2025-2-41-39-51, sections 4–5.
// The paper reports sub-20 ms with geodesic charts, per-vertex energy
// minimization AND a separate continuous collision handler. It is not evidence
// that shortest-path projection alone resolves hand/torso intersections or
// that this solver has an intrinsic lower runtime bound. Our graph-distance
// prototype and exact-capsule comparison remain offline; see
// docs/real-human-3d/26-analytic-capsules-and-geodesic-timing.md.

const IDENTITY = new Matrix4();
const SAMPLE_WEIGHTS = [[1 / 3, 1 / 3, 1 / 3], [0.5, 0.25, 0.25], [0.25, 0.5, 0.25], [0.25, 0.25, 0.5]];

function validateGeometry(geometry, name) {
  if (!geometry?.index || !geometry.attributes.position || geometry.attributes.position.itemSize !== 3
    || geometry.index.count % 3 || !geometry.attributes.position.array.every(Number.isFinite)) {
    throw new Error(`${name} contact geometry must have finite indexed triangles.`);
  }
}

/**
 * Static contact correction in one common posed coordinate space. It retains
 * topology, UVs and seams, and moves the garment only. This is a constrained
 * geometric fit, not cloth dynamics or a guarantee for an unseen pose.
 */
export function fitGarmentContact(bodyGeometry, garmentGeometry, {
  originalVertices, outwardNormals, intersectionMode = 'body-normal', minimumGapMetres = 0.002, paddingMetres = 0.0002,
  maxIterations = 60, maxDisplacementMetres = 0.08,
} = {}) {
  validateGeometry(bodyGeometry, 'Body'); validateGeometry(garmentGeometry, 'Garment');
  if (!Number.isFinite(minimumGapMetres) || minimumGapMetres <= 0 || !Number.isFinite(paddingMetres) || paddingMetres < 0
    || !Number.isInteger(maxIterations) || maxIterations < 1 || !Number.isFinite(maxDisplacementMetres) || maxDisplacementMetres <= 0) {
    throw new Error('Contact fitting needs positive finite lengths and an iteration limit.');
  }
  const positions = garmentGeometry.attributes.position, indices = garmentGeometry.index;
  if (!['body-normal', 'outward-plane'].includes(intersectionMode)) throw new Error('Unsupported contact separation mode.');
  if (outwardNormals && (outwardNormals.length !== positions.count * 3 || !outwardNormals.every(Number.isFinite))) throw new Error('Garment contact directions must match its vertices.');
  if (originalVertices && originalVertices.length !== positions.count) throw new Error('Garment seam correspondence has the wrong size.');
  const initial = positions.array.slice(), groups = new Map(), groupForVertex = [];
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const key = originalVertices ? originalVertices[vertex] : vertex;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(vertex); groupForVertex[vertex] = groups.get(key);
  }
  // Own the BVH container; indirect indexing leaves the caller's body untouched.
  const body = new BufferGeometry(); body.setAttribute('position', bodyGeometry.attributes.position); body.setIndex(bodyGeometry.index);
  const bodyBvh = new MeshBVH(body, { indirect: true, maxLeafTris: 8 });
  const contactNormal = createSurfaceContactNormal(body);
  const triangle = new ExtendedTriangle(), box = new Box3();
  const point = new Vector3(), hit = { point: new Vector3() }, normal = new Vector3(), delta = new Vector3();
  const onBody = new Vector3(), onGarment = new Vector3(), barycentric = new Vector3(), outward = new Vector3();
  const target = minimumGapMetres + paddingMetres, epsilon = 1e-7;
  let maxStep = 0, saturated = false, iterations = 0;

  const loadTriangle = face => {
    triangle.a.fromBufferAttribute(positions, indices.getX(face * 3));
    triangle.b.fromBufferAttribute(positions, indices.getX(face * 3 + 1));
    triangle.c.fromBufferAttribute(positions, indices.getX(face * 3 + 2));
    triangle.needsUpdate = true;
    return triangle;
  };
  function moveVertex(vertex, direction, amount) {
    if (!(amount > epsilon)) return;
    // Update every UV duplicate together. Bounds are measured from this call's
    // authored fitted input, so iterations cannot accumulate an unbounded fit.
    const group = groupForVertex[vertex], representative = group[0];
    point.fromBufferAttribute(positions, representative).addScaledVector(direction, amount);
    delta.set(point.x - initial[representative * 3], point.y - initial[representative * 3 + 1], point.z - initial[representative * 3 + 2]);
    if (delta.length() > maxDisplacementMetres) {
      saturated = true; delta.setLength(maxDisplacementMetres);
      point.set(initial[representative * 3] + delta.x, initial[representative * 3 + 1] + delta.y, initial[representative * 3 + 2] + delta.z);
    }
    const step = point.distanceTo(new Vector3().fromBufferAttribute(positions, representative));
    maxStep = Math.max(maxStep, step);
    for (const index of group) positions.setXYZ(index, point.x, point.y, point.z);
  }
  function projectPoint(face, weights, direction, amount) {
    const norm = weights.reduce((sum, value) => sum + value * value, 0);
    if (!(norm > 1e-12)) return;
    for (let corner = 0; corner < 3; corner++) moveVertex(indices.getX(face * 3 + corner), direction, amount * weights[corner] / norm);
  }

  const referenceNormals = new Float32Array(indices.count);
  for (let face = 0; face < indices.count / 3; face++) {
    if (outwardNormals) {
      outward.set(0, 0, 0);
      for (let corner = 0; corner < 3; corner++) outward.add(new Vector3().fromArray(outwardNormals, indices.getX(face * 3 + corner) * 3));
      outward.normalize();
    } else loadTriangle(face).getNormal(outward);
    outward.toArray(referenceNormals, face * 3);
  }

  try {
    for (; iterations < maxIterations; iterations++) {
      maxStep = 0;
      // Resolve embedded vertices using the closest surface feature, including
      // its shared-edge/vertex normal rather than an arbitrary incident face.
      for (const group of groups.values()) {
        point.fromBufferAttribute(positions, group[0]);
        const closest = bodyBvh.closestPointToPoint(point, hit);
        contactNormal(closest.faceIndex, closest.point, normal);
        const signed = delta.subVectors(point, closest.point).dot(normal);
        if (signed < target) moveVertex(group[0], normal, target - signed);
      }
      for (let face = 0; face < indices.count / 3; face++) {
        loadTriangle(face);
        for (const weights of SAMPLE_WEIGHTS) {
          point.set(0, 0, 0).addScaledVector(triangle.a, weights[0]).addScaledVector(triangle.b, weights[1]).addScaledVector(triangle.c, weights[2]);
          const closest = bodyBvh.closestPointToPoint(point, hit);
          contactNormal(closest.faceIndex, closest.point, normal);
          const signed = delta.subVectors(point, closest.point).dot(normal);
          if (signed < target) { projectPoint(face, weights, normal, target - signed); loadTriangle(face); }
        }
        box.setFromPoints([triangle.a, triangle.b, triangle.c]).expandByScalar(target);
        bodyBvh.shapecast({
          intersectsBounds: bounds => bounds.intersectsBox(box),
          intersectsTriangle: bodyFace => {
            loadTriangle(face);
            const distance = bodyFace.distanceToTriangle(triangle, onBody, onGarment);
            if (distance >= target - epsilon) return false;
            if (distance < 1e-8) {
              if (intersectionMode === 'body-normal') {
                bodyFace.getNormal(normal);
                triangle.getBarycoord(onGarment, barycentric);
                projectPoint(face, barycentric.toArray().map(value => Math.max(0, value)), normal, target);
                return false;
              }
              outward.fromArray(referenceNormals, face * 3);
              const support = Math.max(bodyFace.a.dot(outward), bodyFace.b.dot(outward), bodyFace.c.dot(outward));
              const closestCorner = Math.min(triangle.a.dot(outward), triangle.b.dot(outward), triangle.c.dot(outward));
              const amount = Math.min(0.01, Math.max(target, support + target - closestCorner));
              // Keep the authored outward side when a hand crosses the cloth:
              // opposite finger faces must not pull one patch both ways.
              for (let corner = 0; corner < 3; corner++) moveVertex(indices.getX(face * 3 + corner), outward, amount);
            } else {
              normal.subVectors(onGarment, onBody).multiplyScalar(1 / distance);
              triangle.getBarycoord(onGarment, barycentric);
              projectPoint(face, barycentric.toArray().map(value => Math.max(0, value)), normal, target - distance);
            }
            return false;
          },
        });
      }
      if (maxStep < epsilon) { iterations++; break; }
    }
    positions.needsUpdate = true;
    garmentGeometry.computeVertexNormals(); garmentGeometry.computeBoundingBox(); garmentGeometry.computeBoundingSphere();
    const priorBvh = garmentGeometry.boundsTree;
    garmentGeometry.boundsTree = new MeshBVH(garmentGeometry, { indirect: true, maxLeafTris: 8 });
    let distance;
    try { distance = bodyBvh.closestPointToGeometry(garmentGeometry, IDENTITY, {}, {}).distance; }
    finally { garmentGeometry.boundsTree = priorBvh; }
    let minimumSignedMetres = Infinity;
    for (let face = 0; face < indices.count / 3; face++) {
      loadTriangle(face);
      for (const weights of SAMPLE_WEIGHTS) {
        point.set(0, 0, 0).addScaledVector(triangle.a, weights[0]).addScaledVector(triangle.b, weights[1]).addScaledVector(triangle.c, weights[2]);
        const closest = bodyBvh.closestPointToPoint(point, hit);
        contactNormal(closest.faceIndex, closest.point, normal);
        minimumSignedMetres = Math.min(minimumSignedMetres, delta.subVectors(point, closest.point).dot(normal));
      }
    }
    let maximumDisplacementMetres = 0;
    for (let vertex = 0; vertex < positions.count; vertex++) maximumDisplacementMetres = Math.max(maximumDisplacementMetres,
      Math.hypot(positions.getX(vertex) - initial[vertex * 3], positions.getY(vertex) - initial[vertex * 3 + 1], positions.getZ(vertex) - initial[vertex * 3 + 2]));
    return { converged: distance >= minimumGapMetres && minimumSignedMetres >= -1e-7,
      iterations, minimumGapMetres: distance, minimumSignedMetres, maximumDisplacementMetres, saturated };
  } finally { body.dispose(); }
}
