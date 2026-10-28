// Measurement fitting for the plan's preview body.
//
// The plan's central idea: measure the final mesh, then adjust shape controls
// until the mesh agrees with what the person entered, and report what could not
// be matched. This is a small prototype of that loop, specific to the bundled
// preview asset (landmarks are placed by proportion on this generic body).
import { applyMorphs, loopExtent, loopLength, pickLoop, planeSection, weldMap } from './geometry.mjs';

/** Where each tape measurement is taken on the preview body (metres, model space). */
export const SITES = {
  neck: { kind: 'loopY', y: 0.68 },
  shoulders: { kind: 'loopY', y: 0.53 },
  chest: { kind: 'loopY', y: 0.44 },
  waist: { kind: 'loopY', y: 0.262 },
  hips: { kind: 'loopY', y: 0.05 },
  arms: { kind: 'limb', from: 'LeftUpperArm', to: 'LeftForeArm', t: 0.5, radius: 0.08 },
  thighs: { kind: 'limb', from: 'LeftUpLeg', to: 'LeftLeg', t: 0.4, radius: 0.12 },
  calves: { kind: 'limb', from: 'LeftLeg', to: 'LeftFoot', t: 0.25, radius: 0.09 },
};

/** Which shape controls move a measurement, and how far each may be pushed. */
const FITS = {
  chest: { channels: { chest_depth: 1, pec_thickness: 0.35 }, range: [-0.8, 1.7] },
  shoulders: { channels: { clavicle_width: 1 }, range: [-0.9, 1.6] },
  hips: { channels: { glute_volume: 0.7, hip_width: 0.5 }, range: [-0.9, 1.7] },
  neck: { channels: { neck_thickness: 1 }, range: [-1, 2] },
  arms: { channels: { bicep_peak: 0.6, tricep_horse: 0.6, forearm_girth: 0.35 }, range: [-1, 2.2] },
  thighs: { channels: { quad_sweep: 0.6, ham_thickness: 0.6 }, range: [-1.2, 2.4] },
  calves: { channels: { calf_diamond: 1 }, range: [-1, 2.2] },
  waist: { channels: { gut_volume: 1, overall_mass: 0.3 }, narrow: { waist_narrow: 1 }, range: [-1.2, 2] },
};
const FIT_ORDER = ['chest', 'shoulders', 'hips', 'neck', 'arms', 'thighs', 'calves', 'waist'];
export const FITTED_KEYS = [...FIT_ORDER];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const TOLERANCE = 0.0003; // metres

export function buildModel(parts) {
  const { body, joints, floorY, height } = parts;
  const weld = weldMap(body.pos);
  const model = { pos: body.pos, idx: body.idx, weld, group: body.group, morphs: body.morphs, joints, floorY, height, sites: {}, scratch: new Float32Array(body.pos.length) };
  for (const [id, def] of Object.entries(SITES)) {
    if (def.kind === 'loopY') {
      model.sites[id] = { ...def, origin: [0, def.y, 0], normal: [0, 1, 0], near: [0, def.y, 0.01], radius: 0.09, tris: subsetTriangles(model, p => Math.abs(p[1] - def.y) < 0.12) };
    } else {
      const a = joints[def.from]; const b = joints[def.to];
      const axis = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const origin = [a[0] + axis[0] * def.t, a[1] + axis[1] * def.t, a[2] + axis[2] * def.t];
      model.sites[id] = { ...def, origin, normal: axis, near: origin, tris: subsetTriangles(model, p => Math.hypot(p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]) < def.radius * 2.6) };
    }
  }
  return model;
}

function subsetTriangles(model, inside) {
  const { pos, idx } = model; const keep = [];
  const test = v => inside([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]);
  for (let t = 0; t < idx.length; t += 3) if (test(idx[t]) || test(idx[t + 1]) || test(idx[t + 2])) keep.push(idx[t], idx[t + 1], idx[t + 2]);
  return Uint16Array.from(keep);
}

/** Tape loop and extents for one site on the given (already morphed) positions. */
export function measureSite(model, positions, id) {
  const site = model.sites[id];
  const loops = planeSection(positions, site.tris, model.weld, site.origin, site.normal);
  const loop = pickLoop(loops, site.near, site.radius || SITES[id].radius || 0.09);
  if (!loop) return null;
  const lengthM = loopLength(loop);
  const ex = site.kind === 'loopY' ? loopExtent(loop, [1, 0, 0], [0, 0, 1]) : null;
  return { loop, length: lengthM, width: ex?.width ?? null, depth: ex?.depth ?? null };
}

function girth(model, weights, id) {
  applyMorphs(model.pos, model.morphs, weights, model.scratch);
  return measureSite(model, model.scratch, id)?.length ?? NaN;
}

function addChannels(weights, channels, t) {
  const next = { ...weights };
  for (const [name, k] of Object.entries(channels)) next[name] = (next[name] || 0) + k * t;
  return next;
}

/** Find t in [lo, hi] with f(t) = target for an increasing f (regula falsi, bracketed). */
function solve(f, target, lo, hi) {
  let a = lo; let b = hi; let fa = f(a) - target; let fb = f(b) - target;
  if (fa >= 0) return { t: a, limit: fa > TOLERANCE ? 'min' : null };
  if (fb <= 0) return { t: b, limit: fb < -TOLERANCE ? 'max' : null };
  let side = 0;
  for (let i = 0; i < 24; i += 1) {
    const c = (a * fb - b * fa) / (fb - fa);
    const fc = f(c) - target;
    if (Math.abs(fc) < TOLERANCE) return { t: c, limit: null };
    if (fc * fb > 0) { b = c; fb = fc; if (side === -1) fa /= 2; side = -1; } else { a = c; fa = fc; if (side === 1) fb /= 2; side = 1; }
  }
  return { t: (a + b) / 2, limit: null };
}

const finite = v => Number.isFinite(Number(v)) && Number(v) > 0;

/**
 * Fit the preview body to a set of entries (cm / kg / % keyed like the app's
 * body metrics). Returns shape weights, a uniform height scale, and a report
 * saying for each entry what the preview model measures and whether the
 * request was matched, limited by the shape range, or only approximated.
 */
export function fitEntries(model, entries = {}) {
  const e = Object.fromEntries(Object.entries(entries).filter(([, v]) => finite(v)).map(([k, v]) => [k, Number(v)]));
  const scale = e.height ? clamp(e.height / (model.height * 100), 0.7, 1.35) : 1;
  const weights = {};
  const heightM = (e.height || model.height * 100) / 100;
  if (e.weight) weights.overall_mass = clamp((e.weight / (heightM * heightM) - 21) / 8, -0.4, 1.6);
  if (e.bodyFat) {
    weights.face_roundness = clamp((e.bodyFat - 12) / 24, -0.3, 1.2);
    if (!e.waist) weights.gut_volume = clamp((e.bodyFat - 15) / 20, -0.4, 1.3) * 0.8;
  }
  const report = {};
  let current = weights;
  const residual = key => Math.abs(girth(model, current, key) - e[key] / 100 / scale);
  for (let sweep = 0; sweep < 4; sweep += 1) {
    for (const key of FIT_ORDER) {
      if (!e[key]) continue;
      const spec = FITS[key];
      const target = e[key] / 100 / scale;
      // Fit on top of the other controls, with this measurement's own controls reset.
      const without = { ...current };
      for (const name of [...Object.keys(spec.channels), ...Object.keys(spec.narrow || {})]) without[name] = weights[name] || 0;
      const apply = t => (spec.narrow && t < 0 ? addChannels(without, spec.narrow, -t) : addChannels(without, spec.channels, t));
      current = apply(solve(t => girth(model, apply(t), key), target, spec.range[0], spec.range[1]).t);
    }
    // Later fits disturb earlier ones a little; stop once every entry agrees.
    if (FIT_ORDER.every(key => !e[key] || residual(key) < TOLERANCE)) break;
  }
  for (const key of FIT_ORDER) {
    if (!e[key]) continue;
    const achieved = girth(model, current, key) * scale * 100;
    const off = achieved - e[key];
    report[key] = { requested: e[key], achieved, status: Math.abs(off) <= 0.5 ? 'fitted' : 'limit', limit: Math.abs(off) <= 0.5 ? null : off < 0 ? 'max' : 'min' };
  }
  if (e.height) report.height = { requested: e.height, achieved: model.height * scale * 100, limit: null, status: 'fitted' };
  if (e.weight) report.weight = { requested: e.weight, status: 'approx' };
  if (e.bodyFat) report.bodyFat = { requested: e.bodyFat, status: 'approx' };
  const clean = {}; for (const [k, v] of Object.entries(current)) if (Math.abs(v) > 1e-4) clean[k] = v;
  return { weights: clean, scale, report };
}

/** Preview-body measurements (cm, at the fitted height) for every tape site. */
export function measureAll(model, fit) {
  applyMorphs(model.pos, model.morphs, fit.weights, model.scratch);
  const out = {};
  for (const id of Object.keys(SITES)) { const m = measureSite(model, model.scratch, id); out[id] = m ? m.length * fit.scale * 100 : null; }
  return out;
}
