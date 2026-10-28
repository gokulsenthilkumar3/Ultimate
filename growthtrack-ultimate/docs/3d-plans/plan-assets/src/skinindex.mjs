// A small spatial index over the body's triangles, used to grow hair on the skin: ray casts (brows, eyelid margin),
// nearest-surface queries (strand collision against head, neck and shoulders) and barycentric binding, so a strand's
// root can follow the skin when a shape morph moves it.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function createSkinIndex(pos, idx, keepTriangle = () => true, cell = 0.012) {
  const tris = []; const grid = new Map();
  const key = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  const corner = (t, k) => [pos[idx[t * 3 + k] * 3], pos[idx[t * 3 + k] * 3 + 1], pos[idx[t * 3 + k] * 3 + 2]];
  for (let t = 0; t < idx.length / 3; t += 1) {
    if (!keepTriangle(t)) continue;
    tris.push(t);
    const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < 3; k += 1) { const c = corner(t, k); for (let a = 0; a < 3; a += 1) { lo[a] = Math.min(lo[a], c[a]); hi[a] = Math.max(hi[a], c[a]); } }
    for (let x = Math.floor(lo[0] / cell); x <= Math.floor(hi[0] / cell); x += 1) for (let y = Math.floor(lo[1] / cell); y <= Math.floor(hi[1] / cell); y += 1) for (let z = Math.floor(lo[2] / cell); z <= Math.floor(hi[2] / cell); z += 1) {
      const k = key(x, y, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t);
    }
  }

  // Vertices of the indexed triangles, bucketed, for the cheap "which skin point is this strand near" queries.
  const vgrid = new Map(); const seenVertex = new Set(); const vcell = 0.016;
  for (const t of tris) for (let k = 0; k < 3; k += 1) {
    const v = idx[t * 3 + k]; if (seenVertex.has(v)) continue; seenVertex.add(v);
    const kk = key(Math.floor(pos[v * 3] / vcell), Math.floor(pos[v * 3 + 1] / vcell), Math.floor(pos[v * 3 + 2] / vcell));
    if (!vgrid.has(kk)) vgrid.set(kk, []); vgrid.get(kk).push(v);
  }
  /** Nearest indexed vertex within `radius` (at most one cell), or -1. */
  function nearestVertex(p) {
    const cx = Math.floor(p[0] / vcell); const cy = Math.floor(p[1] / vcell); const cz = Math.floor(p[2] / vcell);
    let best = -1; let bd = Infinity;
    for (let x = cx - 1; x <= cx + 1; x += 1) for (let y = cy - 1; y <= cy + 1; y += 1) for (let z = cz - 1; z <= cz + 1; z += 1) {
      const list = vgrid.get(key(x, y, z)); if (!list) continue;
      for (const v of list) { const d = (pos[v * 3] - p[0]) ** 2 + (pos[v * 3 + 1] - p[1]) ** 2 + (pos[v * 3 + 2] - p[2]) ** 2; if (d < bd) { bd = d; best = v; } }
    }
    return best;
  }

  /** First hit of a ray (direction need not be unit length) within maxT, or null: { t, tri, bary:[u,v,w], point }. */
  function castRay(origin, dir, maxT = 1) {
    const len = Math.hypot(...dir); const d = dir.map(v => v / len); const seen = new Set(); let best = null;
    const step = cell * 0.5;
    for (let s = 0; s <= maxT + step; s += step) {
      const p = [origin[0] + d[0] * Math.min(s, maxT), origin[1] + d[1] * Math.min(s, maxT), origin[2] + d[2] * Math.min(s, maxT)];
      const list = grid.get(key(Math.floor(p[0] / cell), Math.floor(p[1] / cell), Math.floor(p[2] / cell)));
      if (!list) continue;
      for (const t of list) {
        if (seen.has(t)) continue; seen.add(t);
        const a = corner(t, 0); const b = corner(t, 1); const c = corner(t, 2);
        const e1 = sub(b, a); const e2 = sub(c, a); const h = cross(d, e2); const det = dot(e1, h);
        if (Math.abs(det) < 1e-12) continue;
        const f = 1 / det; const sv = sub(origin, a); const u = f * dot(sv, h); if (u < -1e-6 || u > 1 + 1e-6) continue;
        const q = cross(sv, e1); const v = f * dot(d, q); if (v < -1e-6 || u + v > 1 + 1e-6) continue;
        const tt = f * dot(e2, q);
        if (tt > 1e-6 && tt <= maxT && (!best || tt < best.t)) best = { t: tt, tri: t, bary: [1 - u - v, u, v], point: [origin[0] + d[0] * tt, origin[1] + d[1] * tt, origin[2] + d[2] * tt] };
      }
      if (best && best.t < s) break;
    }
    return best;
  }

  /** Closest point on the indexed surface within `radius`, or null: { dist, tri, bary, point }. */
  function nearest(p, radius = 0.03) {
    const r = Math.ceil(radius / cell); const cx = Math.floor(p[0] / cell); const cy = Math.floor(p[1] / cell); const cz = Math.floor(p[2] / cell);
    let best = null; const seen = new Set();
    for (let x = cx - r; x <= cx + r; x += 1) for (let y = cy - r; y <= cy + r; y += 1) for (let z = cz - r; z <= cz + r; z += 1) {
      const list = grid.get(key(x, y, z)); if (!list) continue;
      for (const t of list) {
        if (seen.has(t)) continue; seen.add(t);
        const hit = closestOnTriangle(p, corner(t, 0), corner(t, 1), corner(t, 2));
        if (!best || hit.dist < best.dist) best = { ...hit, tri: t };
      }
    }
    return best && best.dist <= radius ? best : null;
  }

  return { castRay, nearest, nearestVertex, triangles: tris, corner };
}

/** Closest point on triangle abc to p (Ericson, Real-Time Collision Detection 5.1.5), with barycentric weights. */
export function closestOnTriangle(p, a, b, c) {
  const ab = sub(b, a); const ac = sub(c, a); const ap = sub(p, a);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  const finish = (u, v, w) => { const q = [a[0] * u + b[0] * v + c[0] * w, a[1] * u + b[1] * v + c[1] * w, a[2] * u + b[2] * v + c[2] * w]; return { bary: [u, v, w], point: q, dist: Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }; };
  if (d1 <= 0 && d2 <= 0) return finish(1, 0, 0);
  const bp = sub(p, b); const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return finish(0, 1, 0);
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return finish(1 - v, v, 0); }
  const cp = sub(p, c); const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return finish(0, 0, 1);
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return finish(1 - w, 0, w); }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return finish(0, 1 - w, w); }
  const denom = 1 / (va + vb + vc); return finish(1 - (vb + vc) * denom, vb * denom, vc * denom);
}

/** Interpolate a 3-vector attribute at a bound point (tri + barycentric weights) from `array` indexed like `pos`. */
export function bound(array, idx, tri, bary, out = [0, 0, 0]) {
  out[0] = out[1] = out[2] = 0;
  for (let k = 0; k < 3; k += 1) { const v = idx[tri * 3 + k]; for (let a = 0; a < 3; a += 1) out[a] += array[v * 3 + a] * bary[k]; }
  return out;
}
