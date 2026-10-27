import { Box3, Line3, Vector3 } from 'three';
import { ExtendedTriangle } from 'three-mesh-bvh';
import { triangleIntersectsConvex, validateClassificationSurface, validateClosedProxy } from './proxyClassification.js';

/** Exact segment/triangle distance, including a segment piercing the triangle
 * interior. three-mesh-bvh 0.8.3's endpoint/edge helper alone omits that case. */
export function capsuleTriangleDistance(triangle, segment, onTriangle = new Vector3(), onAxis = new Vector3()) {
  triangle.needsUpdate = true; triangle.update();
  const hit = triangle.plane.intersectLine(segment, onAxis);
  if (hit && triangle.containsPoint(hit)) { onTriangle.copy(hit); return 0; }
  return triangle.closestPointToSegment(segment, onTriangle, onAxis);
}

function capsuleAxis(collider) { return new Line3(new Vector3().fromArray(collider.start), new Vector3().fromArray(collider.end)); }
function readTriangle(geometry, face, triangle) {
  triangle.points.forEach((point, corner) => point.fromBufferAttribute(geometry.attributes.position, geometry.index.getX(face * 3 + corner)));
  triangle.needsUpdate = true;
}
function touches(triangle, collider, axis, onTriangle, onAxis) {
  return collider.kind === 'capsule'
    ? capsuleTriangleDistance(triangle, axis, onTriangle, onAxis) <= collider.radius + 1e-8
    : triangleIntersectsConvex(triangle.points, collider.planes);
}

/** Whole-triangle certificate, separate from the solver's convergence flag.
 * Capsule radii enclose every assigned skin corner; convexity then encloses
 * the entire skin triangle. Actual source-surface clearance is still checked
 * independently by the garment matrix. */
export function classifyAnalyticExterior(body, garment, colliders) {
  validateClassificationSurface(body); validateClassificationSurface(garment);
  const covered = new Set(), point = new Vector3(), triangle = new ExtendedTriangle(), contactsByPart = {};
  const axes = colliders.map(collider => {
    if (collider.clearance !== 0) throw new Error('Classification requires unexpanded colliders.');
    if (collider.kind !== 'capsule') { validateClosedProxy(collider); return null; }
    if (!Number.isFinite(collider.radius) || collider.radius <= 0 || !Array.isArray(collider.start) || !Array.isArray(collider.end)
      || collider.start.length !== 3 || collider.end.length !== 3 || ![...collider.start, ...collider.end].every(Number.isFinite)) throw new Error('Invalid analytic capsule.');
    return capsuleAxis(collider);
  });
  let uncoveredCorners = 0, contactPairs = 0;
  const hitFaces = new Set(), onAxis = new Vector3(), onTriangle = new Vector3();
  colliders.forEach((collider, id) => {
    for (const face of collider.sourceFaces) {
      if (!Number.isInteger(face) || face < 0 || face >= body.index.count / 3) throw new Error('Invalid collider source face.');
      covered.add(face);
      for (let corner = 0; corner < 3; corner++) {
        point.fromBufferAttribute(body.attributes.position, body.index.getX(face * 3 + corner));
        const inside = axes[id] ? point.distanceTo(axes[id].closestPointToPoint(point, true, onAxis)) <= collider.radius + 1e-7
          : collider.planes.every(plane => plane.normal.dot(point) <= plane.constant + 1e-7);
        if (!inside) uncoveredCorners++;
      }
    }
  });
  for (let face = 0; face < garment.index.count / 3; face++) {
    readTriangle(garment, face, triangle);
    colliders.forEach((collider, id) => {
      if (touches(triangle, collider, axes[id], onTriangle, onAxis)) {
        contactPairs++; hitFaces.add(face); contactsByPart[collider.region] = (contactsByPart[collider.region] || 0) + 1;
      }
    });
  }
  const enclosedSource = covered.size === body.index.count / 3 && uncoveredCorners === 0;
  return { method: 'whole-triangle-exact-capsule-distance-and-box-clipping', enclosedSource,
    coveredBodyTriangles: covered.size, totalBodyTriangles: body.index.count / 3, uncoveredCorners,
    contactPairs, contactTriangles: hitFaces.size, contactsByPart, outsideProxy: enclosedSource && colliders.length > 0 && contactPairs === 0 };
}

/** Offline primitive comparison. Curved capsules supply exact contact queries
 * and tangent separating planes; boxes retain distinct bone-local extents.
 * No hand or body surface is omitted and no capsule is shrunk for a pass. */
export function fitAnalyticGarmentColliders(colliders, garment, {
  originalVertices, outwardNormals, referencePositions, maxDisplacementMetres = 0.08, maxIterations = 80,
} = {}) {
  validateClassificationSurface(garment);
  const started = performance.now(), position = garment.attributes.position;
  const initial = referencePositions ? referencePositions.slice() : Float32Array.from({ length: position.count * 3 }, (_, i) => position.getComponent(Math.floor(i / 3), i % 3));
  if (initial.length !== position.count * 3 || !initial.every(Number.isFinite)) throw new Error('Invalid displacement reference.');
  const groups = new Map(), groupFor = [];
  for (let vertex = 0; vertex < position.count; vertex++) {
    const key = originalVertices?.[vertex] ?? vertex;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(vertex); groupFor[vertex] = groups.get(key);
  }
  const axes = colliders.map(collider => collider.kind === 'capsule' ? capsuleAxis(collider) : null);
  const triangle = new ExtendedTriangle(), triangleBounds = new Box3(), onTriangle = new Vector3(), onAxis = new Vector3();
  const outward = new Vector3(), delta = new Vector3(), point = new Vector3();
  let iterations = 0, contacts = 0, saturated = false;
  for (; iterations < maxIterations; iterations++) {
    contacts = 0;
    for (let face = 0; face < garment.index.count / 3; face++) {
      const vertices = [0, 1, 2].map(corner => garment.index.getX(face * 3 + corner));
      outward.set(0, 0, 0);
      if (outwardNormals) for (const vertex of vertices) outward.add(new Vector3().fromArray(outwardNormals, vertex * 3));
      outward.normalize();
      colliders.forEach((collider, id) => {
        readTriangle(garment, face, triangle); triangleBounds.setFromPoints(triangle.points);
        if (!triangleBounds.intersectsBox(collider.bounds) || !touches(triangle, collider, axes[id], onTriangle, onAxis)) return;
        contacts++;
        let planes = collider.planes;
        if (axes[id]) {
          const directions = [onTriangle.clone().sub(onAxis), triangle.getNormal(new Vector3()), triangle.getNormal(new Vector3()).negate(), outward.clone(), outward.clone().negate()];
          for (const corner of triangle.points) directions.push(corner.clone().sub(axes[id].closestPointToPoint(corner, true, new Vector3())));
          // Cardinal bone-frame support directions also provide exits when
          // the triangle pierces the capsule axis or two capsules overlap.
          directions.push(...collider.planes.map(plane => plane.normal));
          planes = directions.filter(normal => normal.lengthSq() > 1e-16).map(normal => {
            normal = normal.clone().normalize();
            return { normal, constant: Math.max(normal.dot(axes[id].start), normal.dot(axes[id].end)) + collider.radius };
          });
        }
        const appendage = /hand|thumb|index|middle|ring|pinky|forearm/.test(collider.region);
        let best = null, bestCost = Infinity;
        for (const plane of planes) {
          const alignment = outwardNormals && !appendage ? plane.normal.dot(outward) : 1;
          if (alignment <= 0.1) continue;
          const deficits = triangle.points.map(corner => Math.max(0, plane.constant - plane.normal.dot(corner) + 1e-5));
          const cost = deficits.reduce((sum, value) => sum + value * value, 0) / (alignment * alignment);
          if (cost < bestCost) { bestCost = cost; best = { plane, deficits }; }
        }
        if (!best) return;
        vertices.forEach((vertex, corner) => {
          if (best.deficits[corner] <= 0) return;
          const group = groupFor[vertex], first = group[0];
          point.fromBufferAttribute(position, first).addScaledVector(best.plane.normal, best.deficits[corner]);
          delta.copy(point).sub(new Vector3().fromArray(initial, first * 3));
          if (delta.length() > maxDisplacementMetres) { saturated = true; delta.setLength(maxDisplacementMetres); }
          point.fromArray(initial, first * 3).add(delta);
          for (const duplicate of group) position.setXYZ(duplicate, point.x, point.y, point.z);
        });
      });
    }
    if (!contacts) { iterations++; break; }
  }
  let maximumDisplacementMetres = 0;
  for (let vertex = 0; vertex < position.count; vertex++) maximumDisplacementMetres = Math.max(maximumDisplacementMetres,
    point.fromBufferAttribute(position, vertex).distanceTo(new Vector3().fromArray(initial, vertex * 3)));
  position.needsUpdate = true; garment.computeVertexNormals(); garment.computeBoundingBox(); garment.computeBoundingSphere();
  return { method: 'analytic-capsule-and-box-separating-planes', converged: contacts === 0, iterations, remainingContacts: contacts,
    saturated, maximumDisplacementMetres, durationMs: performance.now() - started };
}
