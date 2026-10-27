import { Box3, Vector3 } from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';

const partitionCache = new WeakMap();

function collisionRegion(name) {
  const side = /Left/.test(name) ? 'left' : /Right/.test(name) ? 'right' : '';
  const finger = name.match(/Thumb|Index|Middle|Ring|Pinky/);
  if (finger) return `${side}-${finger[0].toLowerCase()}`;
  if (/Hand/.test(name)) return `${side}-hand`;
  if (/ForeArm/.test(name)) return `${side}-forearm`;
  if (/Arm/.test(name)) return `${side}-upper-arm`;
  if (/Toe|Foot/.test(name)) return `${side}-foot`;
  if (/UpLeg/.test(name)) return `${side}-thigh`;
  if (/Leg/.test(name)) return `${side}-shin`;
  if (/Head/.test(name)) return 'head';
  if (/Hips/.test(name)) return 'pelvis';
  if (/Spine/.test(name)) return name.replace(/^mixamorig:?/, '').toLowerCase();
  return 'chest-neck';
}

/** Conservative posed convex parts. Every body triangle belongs to a part,
 * including palms and each finger. Parts use all triangle corners, so they
 * enclose their assigned triangles rather than approximating a sampled skin. */
export function bodyTriangleRegions(bodyMesh) {
  const geometry = bodyMesh.geometry, indices = geometry.index;
  const ids = bodyMesh.geometry.attributes.skinIndex, weights = bodyMesh.geometry.attributes.skinWeight;
  const cached = partitionCache.get(geometry);
  if (cached && cached.ids === ids && cached.weights === weights && cached.index === indices
    && cached.idVersion === ids.version && cached.weightVersion === weights.version && cached.indexVersion === indices.version) return cached.parts;
  const regions = bodyMesh.skeleton.bones.map(bone => collisionRegion(bone.name));
  const parts = [];
  for (let face = 0; face < indices.count / 3; face++) {
    const scores = new Map(), vertices = [0, 1, 2].map(corner => indices.getX(face * 3 + corner));
    for (const vertex of vertices) for (let component = 0; component < 4; component++) {
      const region = regions[ids.getComponent(vertex, component)];
      scores.set(region, (scores.get(region) || 0) + weights.getComponent(vertex, component));
    }
    const region = [...scores].sort((a, b) => b[1] - a[1])[0][0];
    parts.push(region);
  }
  partitionCache.set(geometry, { ids, weights, index: indices, idVersion: ids.version, weightVersion: weights.version, indexVersion: indices.version, parts });
  return parts;
}

export function createBodyCollisionProxies(bodyMeshOrRegions, geometry, clearance = 0.003) {
  const positions = geometry.attributes.position, indices = geometry.index;
  const parts = Array.isArray(bodyMeshOrRegions) ? bodyMeshOrRegions : bodyTriangleRegions(bodyMeshOrRegions);
  if (parts.length !== indices.count / 3 || parts.some(region => typeof region !== 'string')) throw new Error('Body proxy partition does not match its triangles.');
  const groups = new Map();
  for (let face = 0; face < indices.count / 3; face++) {
    const region = parts[face], vertices = [0, 1, 2].map(corner => indices.getX(face * 3 + corner));
    if (!groups.has(region)) groups.set(region, { vertices: new Set(), faces: [] });
    const group = groups.get(region); group.faces.push(face);
    for (const vertex of vertices) group.vertices.add(vertex);
  }
  return [...groups].map(([region, { vertices, faces }]) => {
    const points = [...vertices].map(vertex => new Vector3().fromBufferAttribute(positions, vertex));
    const hull = new ConvexHull().setFromPoints(points), unique = new Map();
    for (const face of hull.faces) {
      const normal = face.normal.clone(), constant = face.constant + clearance;
      const key = [...normal.toArray(), constant].map(value => value.toFixed(8)).join('/');
      unique.set(key, { normal, constant });
    }
    const watertight = hull.faces.length >= 4 && hull.faces.every(face => {
      let edge = face.edge;
      do { if (!edge.twin || edge.twin.twin !== edge) return false; edge = edge.next; } while (edge !== face.edge);
      return true;
    });
    return { region, planes: [...unique.values()], bounds: new Box3().setFromPoints(points).expandByScalar(clearance), vertices: points.length,
      sourceFaces: faces, watertight, clearance };
  });
}

/** Expanded convex-part fitting uses cheap half-space constraints in place of
 * repeated nearest points on the concave body. Full source triangles remain
 * the independent acceptance surface. The displacement cap is never enlarged. */
export function fitGarmentProxies(proxies, geometry, {
  originalVertices, outwardNormals, referencePositions, maxDisplacementMetres = 0.08, maxIterations = 80,
} = {}) {
  const start = performance.now(), points = geometry.attributes.position, indices = geometry.index;
  if (referencePositions && (referencePositions.length !== points.array.length || !referencePositions.every(Number.isFinite))) throw new Error('Invalid garment displacement reference.');
  const initial = referencePositions ? referencePositions.slice() : points.array.slice(), groups = new Map(), representative = [];
  for (let vertex = 0; vertex < points.count; vertex++) {
    const key = originalVertices?.[vertex] ?? vertex;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(vertex); representative[vertex] = groups.get(key);
  }
  const corners = [new Vector3(), new Vector3(), new Vector3()], outward = new Vector3();
  const box = new Box3(), point = new Vector3(), delta = new Vector3();
  let remaining = Infinity, maximumDisplacementMetres = 0, saturated = false, iterations = 0;
  for (; iterations < maxIterations; iterations++) {
    remaining = 0;
    for (let face = 0; face < indices.count / 3; face++) {
      const vertices = [0, 1, 2].map(corner => indices.getX(face * 3 + corner));
      outward.set(0, 0, 0);
      if (outwardNormals) for (const vertex of vertices) outward.add(new Vector3().fromArray(outwardNormals, vertex * 3));
      outward.normalize();
      for (const proxy of proxies) {
        vertices.forEach((vertex, corner) => corners[corner].fromBufferAttribute(points, vertex));
        box.setFromPoints(corners);
        if (!box.intersectsBox(proxy.bounds)) continue;
        let best = null, cost = Infinity, separated = false;
        for (const plane of proxy.planes) {
          const deficits = corners.map(corner => plane.constant - plane.normal.dot(corner));
          if (Math.max(...deficits) < 1e-7) { separated = true; break; }
          // A hand touching the front of a tee may need the cloth behind it.
          // Its exit side must not be forced to match the torso's normal.
          const appendage = /hand|thumb|index|middle|ring|pinky|forearm/.test(proxy.region);
          const alignment = outwardNormals && !appendage ? plane.normal.dot(outward) : 1;
          if (alignment <= 0.1) continue;
          const candidate = deficits.reduce((sum, deficit) => sum + Math.max(0, deficit) ** 2, 0) / (alignment * alignment);
          if (candidate < cost) { cost = candidate; best = { plane, deficits }; }
        }
        if (separated) continue;
        remaining++;
        if (!best) continue;
        vertices.forEach((vertex, corner) => {
          if (best.deficits[corner] <= 1e-7) return;
          const group = representative[vertex], first = group[0];
          point.fromBufferAttribute(points, first).addScaledVector(best.plane.normal, best.deficits[corner] + 1e-5);
          delta.set(point.x - initial[first * 3], point.y - initial[first * 3 + 1], point.z - initial[first * 3 + 2]);
          if (delta.length() > maxDisplacementMetres) { saturated = true; delta.setLength(maxDisplacementMetres); }
          maximumDisplacementMetres = Math.max(maximumDisplacementMetres, delta.length());
          for (const duplicate of group) points.setXYZ(duplicate, initial[first * 3] + delta.x, initial[first * 3 + 1] + delta.y, initial[first * 3 + 2] + delta.z);
        });
      }
    }
    if (!remaining) { iterations++; break; }
  }
  points.needsUpdate = true;
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return { converged: remaining === 0, iterations, remainingProxyContacts: remaining, maximumDisplacementMetres, saturated,
    solver: 'expanded-convex-parts', proxyParts: proxies.map(proxy => proxy.region), durationMs: performance.now() - start };
}
