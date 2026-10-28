// Strand hair for the preview head: scalp hair, eyebrows and eyelashes grown as thin strands.
// This file is plain geometry (no three.js) so it can be tested in Node; hair.mjs draws the result.
//
// How a head of hair is made here:
//  1. roots: points sampled on the skin inside the hair region (a hairline that dips at the temples, runs down in front
//     of the ears as sideburns and ends at the nape), thinned toward the hairline so the edge is soft;
//  2. guides: for each root a curve that leaves the scalp at a style-dependent angle, is brushed along a flow field
//     (radial from the crown whorl, swept or parted at the front), is pulled toward the skull so it lies on it, droops
//     under gravity once it is long enough, and cannot pass through head, neck or shoulders;
//  3. strands: every guide is cloned into a clump, spread toward the tips, with wave or coil, per-strand length and a few
//     flyaways; each strand is bound to its guide's root (triangle + barycentric weights) so it follows the skin when a
//     shape morph moves it;
//  4. drawing and shading are in hair.mjs.
import { bound } from './skinindex.mjs';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const HEAD_CENTRE = [0, 0.82, 0.05];

// ---- the hair region ------------------------------------------------------------------------------
// Hairline height (y, metres) by angle around the head, 0 = straight ahead, pi = nape.
const HAIRLINE = [[0, 0.884], [0.3, 0.878], [0.6, 0.862], [0.9, 0.84], [1.2, 0.812], [1.5, 0.784], [1.75, 0.772], [2.1, 0.758], [2.6, 0.742], [3.15, 0.736]];
function hairlineY(a, h) {
  let y = HAIRLINE[HAIRLINE.length - 1][1];
  for (let i = 1; i < HAIRLINE.length; i += 1) if (a <= HAIRLINE[i][0]) { const [a0, y0] = HAIRLINE[i - 1]; const [a1, y1] = HAIRLINE[i]; y = lerp(y0, y1, (a - a0) / (a1 - a0)); break; }
  const front = 1 - smooth(0.5, 1.25, a);
  const recess = h.recession * 0.02 * Math.sin(Math.PI * Math.min(1, Math.max(0, (a - 0.25) / 0.9)));
  return y + front * (h.height / 1000) + recess;
}

/** Hair density (0..1) at a point of the base head: 0 on the face, ears and neck below the nape line. */
export function hairWeight(p, hairline, LM) {
  const a = Math.abs(Math.atan2(p[0], p[2] - 0.045));
  const noise = Math.sin(p[0] * 520 + p[2] * 310) * 0.0012 + Math.sin(p[0] * 190 - p[2] * 410) * 0.0009;
  const y0 = hairlineY(a, hairline) + noise;
  let w = smooth(y0 - 0.0035, y0 + 0.006, p[1]);
  const ear = Math.hypot(Math.abs(p[0]) - LM.ear[0], p[1] - LM.ear[1], p[2] - LM.ear[2]);
  if (Math.abs(p[0]) > 0.064) w *= smooth(0.03, 0.045, ear);
  return w;
}

/** Per-vertex scalp mask for the skin shader (dark roots/stubble shows through where hair grows). */
export function scalpMask(pos, group, hairline, LM) {
  const n = pos.length / 3; const out = new Float32Array(n);
  for (let v = 0; v < n; v += 1) { if (group[v] !== 5 && group[v] !== 4) continue; out[v] = hairWeight([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], hairline, LM); }
  return out;
}

// ---- growing guides ------------------------------------------------------------------------------
function lengthAt(p, len) {
  const t = smooth(0.835, 0.89, p[1]);
  const sideBack = lerp(len.side, len.back, smooth(0.02, -0.03, p[2]));
  const top = lerp(len.top, len.front, smooth(0.06, 0.12, p[2]));
  return lerp(sideBack, top, t);
}
function flowAt(p, n, r) {
  const rx = p[0] - 0.01; const rz = p[2] + 0.005; const rl = Math.hypot(rx, rz) || 1;
  let f = norm([(rx / rl) * 0.6, -0.45, (rz / rl) * 0.6]);
  const w = smooth(0.0, 0.075, p[2]) * smooth(0.84, 0.872, p[1]);
  let sweep = null;
  if (r.sweep === 'forward') sweep = [0, 0.1, 1];
  else if (r.sweep === 'back') sweep = [0.1, 0.25, -1];
  else if (r.sweep === 'up') sweep = [0, 1, -0.35];
  else if (r.sweep === 'sideback') {
    const partX = r.part === 'left' ? 0.024 : r.part === 'right' ? -0.024 : 0;
    const across = r.part === 'none' ? -1 : Math.max(-1, Math.min(1, (p[0] - partX) / 0.007)) * (r.part === 'right' ? -1 : 1);
    sweep = [across * 0.75, 0.25, -0.55];
  } else if (r.sweep === 'side') {
    const partX = r.part === 'left' ? 0.024 : r.part === 'right' ? -0.024 : 0;
    const across = r.part === 'none' ? -1 : Math.max(-1, Math.min(1, (p[0] - partX) / 0.0045)) * (r.part === 'right' ? -1 : 1);
    const mid = 1 - Math.abs(across); sweep = [across * 0.9, 0.05 + 0.5 * mid, 0.38 - 0.55 * mid];
  }
  if (sweep) f = norm([lerp(f[0], sweep[0], w), lerp(f[1], sweep[1], w), lerp(f[2], sweep[2], w)]);
  const tangentOf = g => { const k = dot(g, n); return [g[0] - n[0] * k, g[1] - n[1] * k, g[2] - n[2] * k]; };
  let tangent = tangentOf(f);
  // A flow that points straight out of (or into) the skin has no direction along it: comb toward the crown instead.
  if (Math.hypot(...tangent) < 0.3) tangent = tangentOf([0, 0.75, -0.65]);
  return Math.hypot(...tangent) < 1e-4 ? [0, -1, 0] : norm(tangent);
}

function vertexNormalAt(ctx, v) { return [ctx.normals[v * 3], ctx.normals[v * 3 + 1], ctx.normals[v * 3 + 2]]; }

function growGuide(ctx, root, r, rng) {
  const L = lengthAt(root.p, r.len) * (0.92 + 0.16 * rng());
  if (L < 0.0007) return null;
  const P = r.points; const seg = L / (P - 1); const out = new Float32Array(P * 3);
  const top = smooth(0.835, 0.89, root.p[1]);
  const lift = r.lift * (0.7 + 0.3 * top);
  const follow = 0.8 * Math.min(1, Math.max(0, 1.1 - r.lift / (Math.PI / 2)));
  const f = flowAt(root.p, root.n, r);
  let d = norm([root.n[0] * Math.sin(lift) + f[0] * Math.cos(lift), root.n[1] * Math.sin(lift) + f[1] * Math.cos(lift), root.n[2] * Math.sin(lift) + f[2] * Math.cos(lift)]);
  let p = root.p.slice(); out.set(p, 0);
  for (let i = 1; i < P; i += 1) {
    const along = i * seg; const s = along / L;
    const v = ctx.skin.nearestVertex(p); const vn = v >= 0 ? vertexNormalAt(ctx, v) : null;
    const g = r.gravity * smooth(0, 0.07, along);
    d = norm([d[0], d[1] - g * seg * 22, d[2]]);
    if (vn) {
      // Hair lies on the skull: lay the direction down toward the local surface plane, more so along the length.
      const k = follow * smooth(0, 0.4, s); const dn = dot(d, vn);
      d = norm([d[0] - vn[0] * dn * k, d[1] - vn[1] * dn * k, d[2] - vn[2] * dn * k]);
      const pull = follow * seg * 7; d = norm([d[0] - vn[0] * pull, d[1] - vn[1] * pull, d[2] - vn[2] * pull]);
    }
    const q = [p[0] + d[0] * seg, p[1] + d[1] * seg, p[2] + d[2] * seg];
    const v2 = ctx.skin.nearestVertex(q);
    if (v2 >= 0) {
      const vn2 = vertexNormalAt(ctx, v2); const vp = [ctx.pos[v2 * 3], ctx.pos[v2 * 3 + 1], ctx.pos[v2 * 3 + 2]];
      const sd = (q[0] - vp[0]) * vn2[0] + (q[1] - vp[1]) * vn2[1] + (q[2] - vp[2]) * vn2[2];
      const off = 0.0012 + r.volume * 0.007 * smooth(0, 0.5, s) * (1 - 0.5 * s);
      if (sd < off && sd > -0.02) { q[0] += vn2[0] * (off - sd); q[1] += vn2[1] * (off - sd); q[2] += vn2[2] * (off - sd); }
    }
    d = norm([q[0] - p[0], q[1] - p[1], q[2] - p[2]]); p = q; out.set(p, i * 3);
  }
  return out;
}

/** Sample roots on the skin, area-weighted and thinned by the hair weight. */
function sampleRoots(ctx, weightAt, count, rng) {
  const tris = []; const cumulative = []; let total = 0;
  for (const t of ctx.skin.triangles) {
    const a = ctx.skin.corner(t, 0); const b = ctx.skin.corner(t, 1); const c = ctx.skin.corner(t, 2);
    const cy = (a[1] + b[1] + c[1]) / 3; if (cy < 0.72) continue;
    const w = Math.max(weightAt(a), weightAt(b), weightAt(c)); if (w <= 0.01) continue;
    const area = Math.hypot(...cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]])) / 2;
    total += area; tris.push(t); cumulative.push(total);
  }
  const roots = []; let guard = 0;
  while (roots.length < count && guard < count * 12) {
    guard += 1;
    const pick = rng() * total; let lo = 0; let hi = cumulative.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cumulative[mid] < pick) lo = mid + 1; else hi = mid; }
    const t = tris[lo]; let u = rng(); let v = rng(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const bary = [1 - u - v, u, v]; const p = bound(ctx.pos, ctx.idx, t, bary);
    if (rng() > weightAt(p)) continue;
    const n = norm(bound(ctx.normals, ctx.idx, t, bary));
    roots.push({ tri: t, bary, p, n });
  }
  return roots;
}

function frame(t, prev) {
  const ref = prev || (Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  const e1 = norm([ref[0] - t[0] * dot(ref, t), ref[1] - t[1] * dot(ref, t), ref[2] - t[2] * dot(ref, t)]);
  return [e1, cross(t, e1)];
}

/** Clone one guide into `M` strands (clump + wave + tips) and append them to the strand arrays. */
function emitStrands(S, guide, root, M, opts, rng) {
  const P = S.P;
  const tan = []; for (let i = 0; i < P; i += 1) { const a = guide.subarray(Math.max(0, i - 1) * 3, Math.max(0, i - 1) * 3 + 3); const b = guide.subarray(Math.min(P - 1, i + 1) * 3, Math.min(P - 1, i + 1) * 3 + 3); tan.push(norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]])); }
  const frames = []; let prev = null; for (let i = 0; i < P; i += 1) { const f = frame(tan[i], prev); frames.push(f); prev = f[0]; }
  const guideId = S.guideCount; S.guideRoot.push(root.p[0], root.p[1], root.p[2]); S.guideTri.push(root.tri, root.bary[0], root.bary[1], root.bary[2]); S.guideCount += 1;
  const phase = rng() * Math.PI * 2; let arc = 0;
  const arcs = [0]; for (let i = 1; i < P; i += 1) { arc += Math.hypot(guide[i * 3] - guide[i * 3 - 3], guide[i * 3 + 1] - guide[i * 3 - 2], guide[i * 3 + 2] - guide[i * 3 - 1]); arcs.push(arc); }
  for (let m = 0; m < M; m += 1) {
    const idx = S.count; S.count += 1; S.guideOf.push(guideId);
    const ang = rng() * Math.PI * 2; const rad = Math.sqrt(rng()); const lenScale = 0.86 + 0.14 * rng();
    const amp = opts.curl.amp * (0.75 + 0.5 * rng()); const turnLen = opts.curl.turns > 0 ? 0.1 / opts.curl.turns : 0;
    const jitter = rng() * 0.8; const fly = rng() < opts.frizz ? 0.003 + 0.009 * rng() : 0; const flyDir = rng() * Math.PI * 2;
    for (let i = 0; i < P; i += 1) {
      const s = i / (P - 1); const clumpR = opts.clump * (0.25 + 0.75 * s ** 0.8);
      const [e1, e2] = frames[i];
      const ox = Math.cos(ang) * rad * clumpR; const oy = Math.sin(ang) * rad * clumpR;
      let x = guide[i * 3] + e1[0] * ox + e2[0] * oy; let y = guide[i * 3 + 1] + e1[1] * ox + e2[1] * oy; let z = guide[i * 3 + 2] + e1[2] * ox + e2[2] * oy;
      if (turnLen > 0) {
        const ph = (arcs[i] / turnLen) * Math.PI * 2 + phase + jitter; const ramp = Math.min(1, arcs[i] / 0.01) * amp;
        x += (e1[0] * Math.cos(ph) + e2[0] * Math.sin(ph)) * ramp; y += (e1[1] * Math.cos(ph) + e2[1] * Math.sin(ph)) * ramp; z += (e1[2] * Math.cos(ph) + e2[2] * Math.sin(ph)) * ramp;
      }
      if (fly) { const k = fly * s * s; x += (root.n[0] * 0.8 + Math.cos(flyDir) * 0.6) * k; y += (root.n[1] * 0.8 + Math.sin(flyDir) * 0.6) * k; z += (root.n[2] * 0.8) * k; }
      // shorter strands: pull the point back toward the root
      x = lerp(guide[0], x, i === 0 ? 1 : lenScale); y = lerp(guide[1], y, i === 0 ? 1 : lenScale); z = lerp(guide[2], z, i === 0 ? 1 : lenScale);
      const o = (idx * P + i) * 3; S.base[o] = x; S.base[o + 1] = y; S.base[o + 2] = z;
      const n = norm([x - HEAD_CENTRE[0], y - HEAD_CENTRE[1], z - HEAD_CENTRE[2]]); const nn = norm([lerp(root.n[0], n[0], smooth(0, 0.4, s)), lerp(root.n[1], n[1], smooth(0, 0.4, s)), lerp(root.n[2], n[2], smooth(0, 0.4, s))]);
      S.nrm[o] = nn[0]; S.nrm[o + 1] = nn[1]; S.nrm[o + 2] = nn[2];
    }
    // layer: strands pushed outward of the guide sit on the surface of the hair, those pushed inward are underneath
    const outward = (Math.cos(ang) * rad * (frames[Math.floor(P / 2)][0][1]) + Math.sin(ang) * rad * (frames[Math.floor(P / 2)][1][1]));
    S.rand.push(rng(), rng(), Math.min(1, Math.max(0, 0.5 + 0.5 * outward + (rng() - 0.5) * 0.5)), rng());
  }
}

function newStrands(P) { return { P, count: 0, guideCount: 0, guideOf: [], guideRoot: [], guideTri: [], rand: [], base: null, nrm: null }; }
function allocate(S, maxStrands) { S.base = new Float32Array(maxStrands * S.P * 3); S.nrm = new Float32Array(maxStrands * S.P * 3); return S; }

/** Scalp hair for a resolved selection (see hairstyles.mjs). `budget` caps total ribbon vertices. */
export function growScalpHair(ctx, r, { seed = 11, budget = 900000 } = {}) {
  if (r.bald) return null;
  const rng = mulberry32(seed); const P = r.points;
  const guides = Math.round((r.maxLen < 0.008 ? 5200 : r.maxLen > 0.15 ? 2000 : 2600) * r.density);
  const per = Math.max(2, Math.min(16, Math.floor((budget * r.density ** 0.3) / (2 * P * guides))));
  const roots = sampleRoots(ctx, p => hairWeight(p, r.hairline, ctx.LM), guides, rng);
  const S = allocate(newStrands(P), roots.length * per);
  const clump = r.maxLen < 0.01 ? 0.0012 : 0.0036 * (0.7 + 0.5 * Math.min(1, r.maxLen / 0.12));
  for (const root of roots) {
    const guide = growGuide(ctx, root, r, rng); if (!guide) continue;
    emitStrands(S, guide, root, per, { curl: r.curl, clump, frizz: r.maxLen < 0.01 ? 0 : 0.02 }, rng);
  }
  return finish(S, 'scalp');
}

// ---- eyebrows ----------------------------------------------------------------------------------------
/** The brow guide mesh gives the brow's centre line and thickness; strands are rooted on the skin in front of it. */
function browCurve(guide, side) {
  const xs = []; for (let v = 0; v < guide.length / 3; v += 1) if (guide[v * 3] * side > 0) xs.push(v);
  let lo = Infinity; let hi = -Infinity; for (const v of xs) { lo = Math.min(lo, guide[v * 3] * side); hi = Math.max(hi, guide[v * 3] * side); }
  const bins = 9; const out = [];
  for (let b = 0; b < bins; b += 1) {
    const x0 = lerp(lo, hi, b / bins); const x1 = lerp(lo, hi, (b + 1) / bins); let n = 0; let y = 0; let ymin = Infinity; let ymax = -Infinity;
    for (const v of xs) { const x = guide[v * 3] * side; if (x < x0 || x > x1 + 1e-9) continue; n += 1; y += guide[v * 3 + 1]; ymin = Math.min(ymin, guide[v * 3 + 1]); ymax = Math.max(ymax, guide[v * 3 + 1]); }
    if (n) out.push({ x: (x0 + x1) / 2, y: y / n, half: Math.max(0.0012, (ymax - ymin) / 2) });
  }
  return out;
}
const sampleCurve = (curve, x) => {
  if (x <= curve[0].x) return curve[0]; if (x >= curve[curve.length - 1].x) return curve[curve.length - 1];
  for (let i = 1; i < curve.length; i += 1) if (x <= curve[i].x) { const t = (x - curve[i - 1].x) / (curve[i].x - curve[i - 1].x); return { x, y: lerp(curve[i - 1].y, curve[i].y, t), half: lerp(curve[i - 1].half, curve[i].half, t) }; }
  return curve[curve.length - 1];
};

/**
 * Brows. p = { density 0.3..1.6, length (scale), lift (m, moves the brow up), thick (m, widens), tail (0..1, how far out they reach), gap (m, each brow moves out by this much) }
 */
export function growBrows(ctx, p = {}) {
  const rng = mulberry32(5); const P = 5; const perSide = Math.round(300 * (p.density ?? 1)); const S = allocate(newStrands(P), perSide * 2 + 8);
  for (const side of [1, -1]) {
    const curve = browCurve(ctx.browGuide, side); if (curve.length < 3) continue;
    const x0 = curve[0].x; const x1 = lerp(x0, curve[curve.length - 1].x, 0.55 + 0.45 * (p.tail ?? 1));
    for (let k = 0; k < perSide; k += 1) {
      const u = rng() ** 1.15; const x = lerp(x0, x1, u); const c = sampleCurve(curve, x);
      const y = c.y + (p.lift ?? 0) + (rng() * 2 - 1) * (c.half + (p.thick ?? 0)) * (0.92 - 0.25 * u);
      const hit = ctx.skin.castRay([(x + (p.gap ?? 0)) * side, y, 0.45], [0, 0, -1], 0.6); if (!hit) continue;
      const n = norm(bound(ctx.normals, ctx.idx, hit.tri, hit.bary));
      const angle = ((72 - 108 * u ** 0.9) * Math.PI) / 180 + (rng() - 0.5) * 0.35;
      const lat = [Math.cos(angle) * side, Math.sin(angle), 0];
      const plane = norm([lat[0] - n[0] * dot(lat, n), lat[1] - n[1] * dot(lat, n), lat[2] - n[2] * dot(lat, n)]);
      const lift = 0.2 + rng() * 0.15; let d = norm([plane[0] * Math.cos(lift) + n[0] * Math.sin(lift), plane[1] * Math.cos(lift) + n[1] * Math.sin(lift), plane[2] * Math.cos(lift) + n[2] * Math.sin(lift)]);
      const L = 0.0095 * (p.length ?? 1) * (0.78 + 0.4 * rng()) * (1 - 0.3 * u); const seg = L / (P - 1);
      const guide = new Float32Array(P * 3); let q = hit.point.slice(); guide.set(q, 0);
      for (let i = 1; i < P; i += 1) { d = norm([d[0] - n[0] * seg * 8, d[1] - n[1] * seg * 8 - seg * 6, d[2] - n[2] * seg * 8]); q = [q[0] + d[0] * seg, q[1] + d[1] * seg, q[2] + d[2] * seg]; guide.set(q, i * 3); }
      emitStrands(S, guide, { tri: hit.tri, bary: hit.bary, p: hit.point, n }, 1, { curl: { amp: 0, turns: 0 }, clump: 0, frizz: 0 }, rng);
    }
  }
  return finish(S, 'brows');
}

// ---- eyelashes -------------------------------------------------------------------------------------------
/** Find where an eyeball emerges from the skin: the lid margin, as skin points in 2-degree steps around the eye. */
export function lidMargin(ctx, eye, steps = 180) {
  const c = eye.center; const R = eye.radius; const out = [];
  for (let k = 0; k < steps; k += 1) {
    const theta = (k / steps) * Math.PI * 2; const ct = Math.cos(theta); const st = Math.sin(theta);
    const dirAt = phi => [Math.sin(phi) * ct * eye.side, Math.sin(phi) * st, Math.cos(phi)];
    const covered = phi => { const hit = ctx.skin.castRay(c, dirAt(phi), 0.05); return hit && hit.t >= R - 0.0004 ? hit : null; };
    let prev = 0; let found = null; const stepPhi = 0.035;
    for (let phi = stepPhi; phi < 1.35; phi += stepPhi) { const hit = covered(phi); if (hit) { found = { phi, hit }; break; } prev = phi; }
    if (!found) continue;
    let lo = prev; let hi = found.phi; let best = found.hit;
    for (let i = 0; i < 6; i += 1) { const mid = (lo + hi) / 2; const hit = covered(mid); if (hit) { hi = mid; best = hit; } else lo = mid; }
    out.push({ theta, tri: best.tri, bary: best.bary, p: best.point });
  }
  return out;
}

/** Lashes. p = { density, length (scale), curl (0..1.5) }. */
export function growLashes(ctx, p = {}) {
  const rng = mulberry32(21); const P = 5; const S = allocate(newStrands(P), Math.ceil(130 * (p.density ?? 1)) * ctx.eyes.length + 16);
  for (const eye of ctx.eyes) {
    const margin = lidMargin(ctx, eye); if (margin.length < 40) continue;
    const lat = eye.side;
    for (const upper of [true, false]) {
      const set = margin.filter(m => (Math.sin(m.theta) > 0.12) === upper && (upper ? true : Math.sin(m.theta) < -0.12));
      const count = Math.round((upper ? 80 : 44) * (p.density ?? 1));
      for (let k = 0; k < count && set.length; k += 1) {
        const m = set[Math.floor(rng() * set.length)];
        const u = (1 + Math.cos(m.theta)) / 2;               // 0 at the inner corner, 1 at the outer corner
        const profile = (upper ? 0.35 : 0.2) + (upper ? 0.65 : 0.32) * Math.sin(Math.PI * u ** 0.8);
        const L = 0.0098 * (p.length ?? 1) * profile * (0.82 + 0.34 * rng()); const seg = L / (P - 1);
        const n = norm(bound(ctx.normals, ctx.idx, m.tri, m.bary));
        const o = [Math.cos(m.theta) * lat, Math.sin(m.theta), 0];
        const curl = p.curl ?? 1; const guide = new Float32Array(P * 3); let q = m.p.slice(); guide.set(q, 0);
        for (let i = 1; i < P; i += 1) {
          const s = (i - 1) / (P - 1);
          const d = upper
            ? norm([o[0] * (0.4 + 0.3 * s), o[1] * (0.4 + 0.3 * s) + (0.1 + 0.9 * s * s) * curl, 0.85 - 0.6 * s * curl + n[2] * 0.2])
            : norm([o[0] * 0.45, o[1] * 0.45 - (0.15 + 0.5 * s) * curl, 0.9 - 0.3 * s]);
          q = [q[0] + d[0] * seg, q[1] + d[1] * seg, q[2] + d[2] * seg]; guide.set(q, i * 3);
        }
        emitStrands(S, guide, { tri: m.tri, bary: m.bary, p: m.p, n }, 1, { curl: { amp: 0, turns: 0 }, clump: 0, frizz: 0 }, rng);
      }
    }
  }
  return finish(S, 'lashes');
}

// ---- strand sets -> GPU ----------------------------------------------------------------------------------
function finish(S, kind) {
  if (!S.count) return null;
  const P = S.P; const N = S.count;
  const base = S.base.subarray(0, N * P * 3); const nrm = S.nrm.subarray(0, N * P * 3);
  const tan = new Int8Array(N * P * 6); const nrmQ = new Int8Array(N * P * 6); const misc = new Uint8Array(N * P * 8); const rand = new Uint8Array(N * P * 8);
  for (let i = 0; i < N; i += 1) {
    for (let j = 0; j < P; j += 1) {
      const o = (i * P + j) * 3; const a = (i * P + Math.max(0, j - 1)) * 3; const b = (i * P + Math.min(P - 1, j + 1)) * 3;
      const t = norm([base[b] - base[a], base[b + 1] - base[a + 1], base[b + 2] - base[a + 2]]);
      for (let side = 0; side < 2; side += 1) {
        const v = (i * P + j) * 2 + side;
        for (let k = 0; k < 3; k += 1) { tan[v * 3 + k] = Math.round(t[k] * 127); nrmQ[v * 3 + k] = Math.round(nrm[o + k] * 127); }
        misc[v * 4] = side ? 255 : 0; misc[v * 4 + 1] = Math.round((j / (P - 1)) * 255);
        for (let k = 0; k < 4; k += 1) rand[v * 4 + k] = Math.round(S.rand[i * 4 + k] * 255);
      }
    }
  }
  const index = new Uint32Array(N * (P - 1) * 6);
  for (let i = 0; i < N; i += 1) for (let j = 0; j < P - 1; j += 1) {
    const a = (i * P + j) * 2; const o = (i * (P - 1) + j) * 6;
    index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], o);
  }
  return { kind, P, count: N, base: base.slice(), tan, nrm: nrmQ, misc, rand, index, guideOf: Uint32Array.from(S.guideOf), guideRoot: Float32Array.from(S.guideRoot), guideTri: Float32Array.from(S.guideTri), guideCount: S.guideCount };
}

/** Write each strand's points (two vertices per point, for the ribbon) moved with the skin: roots are bound to skin triangles. */
export function strandPositions(S, idx, bodyPos, out) {
  const P = S.P; const delta = new Float32Array(S.guideCount * 3); const cur = [0, 0, 0];
  for (let g = 0; g < S.guideCount; g += 1) {
    bound(bodyPos, idx, S.guideTri[g * 4], [S.guideTri[g * 4 + 1], S.guideTri[g * 4 + 2], S.guideTri[g * 4 + 3]], cur);
    for (let k = 0; k < 3; k += 1) delta[g * 3 + k] = cur[k] - S.guideRoot[g * 3 + k];
  }
  for (let i = 0; i < S.count; i += 1) {
    const g = S.guideOf[i] * 3;
    for (let j = 0; j < P; j += 1) {
      const o = (i * P + j) * 3; const v = (i * P + j) * 6;
      const x = S.base[o] + delta[g]; const y = S.base[o + 1] + delta[g + 1]; const z = S.base[o + 2] + delta[g + 2];
      out[v] = x; out[v + 1] = y; out[v + 2] = z; out[v + 3] = x; out[v + 4] = y; out[v + 5] = z;
    }
  }
  return out;
}
