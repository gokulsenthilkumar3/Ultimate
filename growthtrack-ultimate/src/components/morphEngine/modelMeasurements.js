// Neutral-pose preview measurements, not anatomical landmark calibration.
// Never reads skinning/animation or changes the live mesh or its influences.
export const MODEL_SECTIONS = Object.freeze([
  { key: 'chest', label: 'Chest', fraction: .72 },
  { key: 'waist', label: 'Waist', fraction: .58 },
  { key: 'hips', label: 'Hips', fraction: .50 },
]);

export function neutralMorphPositions(mesh, weights = {}) {
  const geometry = mesh.geometry, base = geometry.attributes.position;
  const points = new Float64Array(base.count * 3);
  for (let i = 0; i < base.count; i++) points.set([base.getX(i), base.getY(i), base.getZ(i)], i * 3);
  for (const [name, weight] of Object.entries(weights)) {
    const slot = Object.hasOwn(mesh.morphTargetDictionary || {}, name) ? mesh.morphTargetDictionary[name] : undefined;
    const target = geometry.morphAttributes.position?.[slot];
    if (!target || !Number.isFinite(weight) || !weight || target.count !== base.count) continue;
    for (let i = 0; i < base.count; i++) {
      points[i * 3] += (target.getX(i) - (geometry.morphTargetsRelative ? 0 : base.getX(i))) * weight;
      points[i * 3 + 1] += (target.getY(i) - (geometry.morphTargetsRelative ? 0 : base.getY(i))) * weight;
      points[i * 3 + 2] += (target.getZ(i) - (geometry.morphTargetsRelative ? 0 : base.getZ(i))) * weight;
    }
  }
  return points;
}

/** Intersect triangles, weld UV seams and walk closed contours. A hull would
 * bridge gaps or combine the arms with the torso, so it is deliberately avoided. */
export function horizontalContours(points, index, y, epsilon = 1e-6) {
  if (!Number.isFinite(y) || !points.length || points.length % 3 || !points.every(Number.isFinite)) return [];
  const nodes = [], buckets = new Map(), edges = new Set();
  const nodeFor = ([x, z]) => {
    const bx = Math.floor(x / epsilon), bz = Math.floor(z / epsilon);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const id of buckets.get(`${bx + dx},${bz + dz}`) || []) {
        const node = nodes[id];
        if (Math.hypot(x - node.x, z - node.z) <= epsilon) return id;
      }
    }
    const key = `${bx},${bz}`, id = nodes.length;
    nodes.push({ x, z, neighbors: new Set() });
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(id);
    return id;
  };
  const count = index?.count ?? points.length / 3;
  for (let i = 0; i + 2 < count; i += 3) {
    const ids = [0, 1, 2].map(k => index ? index.getX(i + k) : i + k);
    if (ids.some(id => !Number.isInteger(id) || id < 0 || id * 3 >= points.length)) continue;
    const hits = [];
    for (let e = 0; e < 3; e++) {
      const a = ids[e] * 3, b = ids[(e + 1) % 3] * 3, ay = points[a + 1], by = points[b + 1];
      if ((ay > y) === (by > y)) continue;
      const t = (y - ay) / (by - ay);
      hits.push([points[a] + (points[b] - points[a]) * t, points[a + 2] + (points[b + 2] - points[a + 2]) * t]);
    }
    if (hits.length !== 2) continue;
    const a = nodeFor(hits[0]), b = nodeFor(hits[1]);
    if (a === b) continue;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (edges.has(key)) continue;
    edges.add(key); nodes[a].neighbors.add(b); nodes[b].neighbors.add(a);
  }
  const visited = new Set(), contours = [];
  for (let start = 0; start < nodes.length; start++) {
    if (visited.has(start)) continue;
    const component = [], queue = [start]; visited.add(start);
    while (queue.length) {
      const id = queue.pop(); component.push(id);
      for (const next of nodes[id].neighbors) if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
    if (component.length < 3 || component.some(id => nodes[id].neighbors.size !== 2)) continue;
    const polygon = []; let current = start, previous = -1;
    do {
      polygon.push([nodes[current].x, nodes[current].z]);
      const next = [...nodes[current].neighbors].find(id => id !== previous);
      previous = current; current = next;
    } while (current !== start && polygon.length <= component.length);
    if (current !== start || polygon.length !== component.length) continue;
    const perimeter = polygon.reduce((sum, point, i) => {
      const next = polygon[(i + 1) % polygon.length];
      return sum + Math.hypot(point[0] - next[0], point[1] - next[1]);
    }, 0);
    contours.push({ polygon, perimeter });
  }
  return contours;
}

export function measureModelSections(mesh, weights = {}, metrics = {}) {
  const base = mesh.geometry.attributes.position;
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (let i = 0; i < base.count; i++) {
    minY = Math.min(minY, base.getY(i)); maxY = Math.max(maxY, base.getY(i));
    minX = Math.min(minX, base.getX(i)); maxX = Math.max(maxX, base.getX(i));
  }
  const height = maxY - minY;
  if (!Number.isFinite(height) || height <= 0) throw new Error('The model has no measurable neutral stature.');
  // Viewer height stretches Y only. Horizontal distances retain the neutral
  // 175 cm reference, independently of selected height, pose or camera zoom.
  const cmPerUnit = 175 / height, centerX = (minX + maxX) / 2;
  const points = neutralMorphPositions(mesh, weights);
  return MODEL_SECTIONS.map(({ key, label, fraction }) => {
    const contours = horizontalContours(points, mesh.geometry.index, minY + height * fraction);
    const torso = contours.filter(({ polygon }) => Math.min(...polygon.map(p => p[0])) < centerX && Math.max(...polygon.map(p => p[0])) > centerX);
    const measured = torso.length === 1 ? torso[0].perimeter * cmPerUnit : null;
    const entered = typeof metrics[key] === 'number' && Number.isFinite(metrics[key]) && metrics[key] > 0 ? metrics[key] : null;
    return { key, label, fraction, measured, entered, error: measured !== null && entered !== null ? measured - entered : null,
      reason: measured === null ? 'A unique closed torso contour could not be measured.' : null };
  });
}
