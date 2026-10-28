// Pure mesh helpers shared by the plan's 3D stage and its Node build checks.
// Positions are metres in model space (y up, +z = front of the body).

/** Merge vertices that share a position (UV seams split them in the asset). */
export function weldMap(pos, eps = 1e-5) {
  const count = pos.length / 3;
  const ids = new Uint32Array(count);
  const seen = new Map();
  let next = 0;
  for (let i = 0; i < count; i += 1) {
    const key = `${Math.round(pos[i * 3] / eps)},${Math.round(pos[i * 3 + 1] / eps)},${Math.round(pos[i * 3 + 2] / eps)}`;
    let id = seen.get(key);
    if (id === undefined) { id = next; next += 1; seen.set(key, id); }
    ids[i] = id;
  }
  return { ids, count: next };
}

/** Smooth vertex normals that ignore UV seams. Writes into `out`. */
export function vertexNormals(pos, idx, weld, out) {
  const acc = new Float32Array(weld.count * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3; const b = idx[t + 1] * 3; const c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a]; const uy = pos[b + 1] - pos[a + 1]; const uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a]; const vy = pos[c + 1] - pos[a + 1]; const vz = pos[c + 2] - pos[a + 2];
    // Area-weighted: the unnormalised cross product.
    const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
    for (const v of [idx[t], idx[t + 1], idx[t + 2]]) {
      const w = weld.ids[v] * 3; acc[w] += nx; acc[w + 1] += ny; acc[w + 2] += nz;
    }
  }
  for (let i = 0; i < weld.ids.length; i += 1) {
    const w = weld.ids[i] * 3; const x = acc[w]; const y = acc[w + 1]; const z = acc[w + 2];
    const len = Math.hypot(x, y, z) || 1;
    out[i * 3] = x / len; out[i * 3 + 1] = y / len; out[i * 3 + 2] = z / len;
  }
  return out;
}

/**
 * Intersect the mesh with a plane and return the closed loops found.
 * Each loop is a Float32Array of xyz points. Loops that cannot be closed
 * (an open mesh) are returned with `closed = false`.
 */
export function planeSection(pos, idx, weld, origin, normal) {
  const [ox, oy, oz] = origin; const [nx, ny, nz] = normal;
  const nLen = Math.hypot(nx, ny, nz) || 1;
  const px = nx / nLen; const py = ny / nLen; const pz = nz / nLen;
  const dist = new Float32Array(pos.length / 3);
  for (let i = 0; i < dist.length; i += 1) {
    const d = (pos[i * 3] - ox) * px + (pos[i * 3 + 1] - oy) * py + (pos[i * 3 + 2] - oz) * pz;
    dist[i] = d === 0 ? 1e-9 : d;
  }
  const stride = weld.count + 1;
  const points = new Map(); // edge key -> [x, y, z]
  const segments = [];
  const edge = (a, b) => {
    const wa = weld.ids[a]; const wb = weld.ids[b];
    const key = wa < wb ? wa * stride + wb : wb * stride + wa;
    if (!points.has(key)) {
      const t = dist[a] / (dist[a] - dist[b]);
      points.set(key, [pos[a * 3] + (pos[b * 3] - pos[a * 3]) * t, pos[a * 3 + 1] + (pos[b * 3 + 1] - pos[a * 3 + 1]) * t, pos[a * 3 + 2] + (pos[b * 3 + 2] - pos[a * 3 + 2]) * t]);
    }
    return key;
  };
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]; const b = idx[t + 1]; const c = idx[t + 2];
    const sa = dist[a] > 0; const sb = dist[b] > 0; const sc = dist[c] > 0;
    if (sa === sb && sb === sc) continue;
    const keys = [];
    if (sa !== sb) keys.push(edge(a, b));
    if (sb !== sc) keys.push(edge(b, c));
    if (sc !== sa) keys.push(edge(c, a));
    if (keys.length === 2 && keys[0] !== keys[1]) segments.push(keys);
  }
  const ends = new Map();
  segments.forEach((seg, i) => { for (const key of seg) { if (!ends.has(key)) ends.set(key, []); ends.get(key).push(i); } });
  const used = new Uint8Array(segments.length);
  const loops = [];
  for (let s = 0; s < segments.length; s += 1) {
    if (used[s]) continue;
    used[s] = 1;
    const chain = [segments[s][0], segments[s][1]];
    const start = chain[0];
    let tip = chain[1];
    let closed = false;
    for (let guard = 0; guard < segments.length; guard += 1) {
      if (tip === start) { closed = true; chain.pop(); break; }
      const next = (ends.get(tip) || []).find(i => !used[i]);
      if (next === undefined) break;
      used[next] = 1;
      tip = segments[next][0] === tip ? segments[next][1] : segments[next][0];
      chain.push(tip);
    }
    if (chain.length < 3) continue;
    const loop = new Float32Array(chain.length * 3);
    chain.forEach((key, i) => loop.set(points.get(key), i * 3));
    loop.closed = closed;
    loops.push(loop);
  }
  return loops;
}

export function loopLength(loop) {
  let sum = 0; const n = loop.length / 3;
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    sum += Math.hypot(loop[j * 3] - loop[i * 3], loop[j * 3 + 1] - loop[i * 3 + 1], loop[j * 3 + 2] - loop[i * 3 + 2]);
  }
  return sum;
}

export function loopCentroid(loop) {
  const n = loop.length / 3; let x = 0; let y = 0; let z = 0;
  for (let i = 0; i < n; i += 1) { x += loop[i * 3]; y += loop[i * 3 + 1]; z += loop[i * 3 + 2]; }
  return [x / n, y / n, z / n];
}

/** Extent of the loop along two orthonormal axes (e.g. x and z for a level slice). */
export function loopExtent(loop, u, v) {
  let minU = Infinity; let maxU = -Infinity; let minV = Infinity; let maxV = -Infinity;
  for (let i = 0; i < loop.length; i += 3) {
    const a = loop[i] * u[0] + loop[i + 1] * u[1] + loop[i + 2] * u[2];
    const b = loop[i] * v[0] + loop[i + 1] * v[1] + loop[i + 2] * v[2];
    if (a < minU) minU = a; if (a > maxU) maxU = a; if (b < minV) minV = b; if (b > maxV) maxV = b;
  }
  return { width: maxU - minU, depth: maxV - minV, minU, maxU, minV, maxV };
}

/**
 * The longest closed loop whose centroid lies within `radius` of `near`
 * (so a torso slice ignores the arms); otherwise the closest closed loop.
 */
export function pickLoop(loops, near, radius = 0.09) {
  let best = null; let bestLen = -1; let closest = null; let closestD = Infinity;
  for (const loop of loops) {
    if (!loop.closed) continue;
    const c = loopCentroid(loop);
    const d = Math.hypot(c[0] - near[0], c[1] - near[1], c[2] - near[2]);
    if (d < closestD) { closestD = d; closest = loop; }
    if (d <= radius) { const len = loopLength(loop); if (len > bestLen) { bestLen = len; best = loop; } }
  }
  return best || closest;
}

/** Linear blend of a sparse morph target set into `out` (a copy of base positions). */
export function applyMorphs(base, morphs, weights, out) {
  out.set(base);
  for (const [name, weight] of Object.entries(weights)) {
    const morph = morphs[name];
    if (!morph || !weight) continue;
    const { index, delta } = morph;
    for (let i = 0; i < index.length; i += 1) {
      const v = index[i] * 3;
      out[v] += delta[i * 3] * weight; out[v + 1] += delta[i * 3 + 1] * weight; out[v + 2] += delta[i * 3 + 2] * weight;
    }
  }
  return out;
}
