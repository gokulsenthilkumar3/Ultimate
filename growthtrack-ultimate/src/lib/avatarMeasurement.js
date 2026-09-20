/** Plane/triangle sections. Weld only section endpoints; preserve render UV seams. */
export function sectionLoops(positions, indices, { axis = 1, offset, epsilon = 1e-6 }) {
  if (![0, 1, 2].includes(axis) || !Number.isFinite(offset) || !(epsilon > 0)) throw new Error('Invalid measurement plane');
  const nodes = new Map();
  const edges = new Set();
  const key = (p) => p.map((n) => Math.round(n / epsilon)).join(',');
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [0, 1, 2].map((j) => Array.from(positions.slice(indices[i + j] * 3, indices[i + j] * 3 + 3)));
    if (triangle.some((p) => p.length !== 3 || p.some((v) => !Number.isFinite(v)))) throw new Error('Invalid geometry');
    const hits = new Map();
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3];
      const da = a[axis] - offset, db = b[axis] - offset;
      if (Math.abs(da) <= epsilon) hits.set(key(a), a);
      if ((da < -epsilon && db > epsilon) || (da > epsilon && db < -epsilon)) {
        const t = da / (da - db);
        const p = a.map((v, k) => v + t * (b[k] - v));
        hits.set(key(p), p);
      }
    }
    if (hits.size !== 2) continue;
    const [[ka, a], [kb, b]] = [...hits];
    const edge = [ka, kb].sort().join('|');
    if (edges.has(edge)) continue;
    edges.add(edge);
    if (!nodes.has(ka)) nodes.set(ka, { point: a, neighbors: new Set() });
    if (!nodes.has(kb)) nodes.set(kb, { point: b, neighbors: new Set() });
    nodes.get(ka).neighbors.add(kb); nodes.get(kb).neighbors.add(ka);
  }
  const visited = new Set(), loops = [];
  for (const start of nodes.keys()) {
    if (visited.has(start)) continue;
    const stack = [start], component = [];
    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id); component.push(id);
      stack.push(...nodes.get(id).neighbors);
    }
    if (component.length < 3 || component.some((id) => nodes.get(id).neighbors.size !== 2)) continue;
    let perimeter = 0;
    const center = [0, 0, 0];
    for (const id of component) {
      const node = nodes.get(id);
      node.point.forEach((v, k) => { center[k] += v / component.length; });
      for (const other of node.neighbors) perimeter += Math.hypot(...node.point.map((v, k) => v - nodes.get(other).point[k])) / 2;
    }
    loops.push({ perimeter, center });
  }
  return loops;
}

export function measurementFit({ requested, achieved = null, source = 'estimated', supported = false, unit = 'cm' }) {
  const valid = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  const available = supported && valid(achieved) && valid(requested);
  const residual = available ? achieved - requested : null;
  const tolerance = valid(requested) ? Math.max(1, requested * 0.02) : null;
  return { requested: valid(requested) ? requested : null, achieved: available ? achieved : null,
    residual, tolerance, unit, source, status: !available ? 'uncalibrated' : Math.abs(residual) <= tolerance ? 'within-tolerance' : 'outside-tolerance' };
}
