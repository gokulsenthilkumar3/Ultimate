// Face parameters: sizes, spacings and volumes you can read and set in millimetres.
//
// Each parameter drives one generated shape channel: a set of landmark-anchored bumps (a smooth falloff around a
// point on the face, moving the skin by a vector per millimetre of change), stored like the asset's own sparse morph
// targets, so the stage's existing morph pipeline moves the skin, the eyes and everything bound to the skin (hair roots,
// brows, lashes) without special cases. Measurements are taken between landmarks bound to skin triangles, so the
// number you read is the distance on the shape that is drawn, not a number the slider claims.
//
// Typical adult ranges are quoted from face anthropometry (Farkas; Alghamdi et al. 2020 review; interpupillary
// distance from the 2012 US Army ANSUR survey). They are population averages that differ by sex and ancestry; they
// bound the sliders, but they are not a standard of beauty.
import { LM } from './face.mjs';
import { bound } from './skinindex.mjs';

const MM = 0.001;
const falloff = t => { const u = 1 - t * t; return u > 0 ? u * u : 0; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Landmarks snapped to the skin surface when the asset loads (name -> [x, y, z] for the person's left; mirrored for the right). */
const SKIN_POINTS = {
  cheek: [0.041, 0.774, 0.118], medialCanthus: LM.medialCanthus, lateralCanthus: LM.lateralCanthus, alare: LM.alare, cheilion: LM.cheilion, gonion: LM.gonion, zygion: LM.zygion,
  nasion: LM.nasion, glabella: LM.glabella, pronasale: LM.pronasale, subnasale: LM.subnasale, upperLip: LM.upperLip, stomion: LM.stomion,
  lowerLip: LM.lowerLip, pogonion: LM.pogonion, menton: LM.menton,
};

/** Bump specs. `at` is a landmark name; `mirror` adds the right-hand copy (x and the x component of the vector flipped). */
const CHANNELS = {
  // Eyes: the eyeballs move with the eye-spacing channel; lid channels move skin only, so the eyeball stays put.
  f_eye_spacing: { eyes: true, bumps: [{ at: 'eye', r: 0.034, v: [0.5 * MM, 0, 0], mirror: true }] },
  f_eye_open: { bumps: [
    { at: 'eye', dy: 0.0058, dz: 0.0118, r: 0.0095, v: [0, 0.5 * MM, 0], mirror: true, half: { axis: 1, sign: 1, at: 0.0012 } },
    { at: 'eye', dy: -0.0062, dz: 0.0128, r: 0.0085, v: [0, -0.5 * MM, 0], mirror: true, half: { axis: 1, sign: -1, at: -0.0012 } },
  ] },
  f_eye_width: { bumps: [{ at: 'lateralCanthus', r: 0.012, v: [0.5 * MM, 0, 0], mirror: true }, { at: 'medialCanthus', r: 0.01, v: [-0.5 * MM, 0, 0], mirror: true }] },
  f_eye_tilt: { bumps: [{ at: 'lateralCanthus', r: 0.012, v: [0, 0.25 * MM, 0], mirror: true }, { at: 'medialCanthus', r: 0.01, v: [0, -0.25 * MM, 0], mirror: true }] },
  // Nose
  f_nose_width: { bumps: [{ at: 'alare', r: 0.012, v: [0.5 * MM, 0, 0], mirror: true }] },
  f_nose_projection: { bumps: [{ at: 'pronasale', r: 0.018, v: [0, 0, MM] }, { at: 'pronasale', dy: 0.012, r: 0.02, v: [0, 0, 0.45 * MM] }] },
  f_nose_length: { bumps: [{ at: 'pronasale', dy: -0.002, r: 0.022, v: [0, -MM, 0] }, { at: 'subnasale', r: 0.014, v: [0, -0.6 * MM, 0] }] },
  // Mouth
  f_mouth_width: { bumps: [{ at: 'cheilion', r: 0.016, v: [0.5 * MM, 0, 0], mirror: true }] },
  f_lip_upper: { bumps: [{ at: 'upperLip', dy: -0.003, r: 0.019, v: [0, 0.6 * MM, 0.8 * MM], half: { axis: 1, sign: 1, ref: 'stomion', at: 0.0006 } }] },
  f_lip_lower: { bumps: [{ at: 'lowerLip', dy: 0.003, r: 0.019, v: [0, -0.6 * MM, 0.8 * MM], half: { axis: 1, sign: -1, ref: 'stomion', at: -0.0006 } }] },
  // Jaw, chin, cheekbones, ears
  f_jaw_width: { bumps: [{ at: 'gonion', r: 0.03, v: [0.5 * MM, 0, 0], mirror: true }] },
  f_chin_projection: { bumps: [{ at: 'pogonion', r: 0.024, v: [0, 0, MM] }] },
  f_chin_height: { bumps: [{ at: 'menton', dy: 0.003, r: 0.026, v: [0, -MM, 0] }] },
  f_cheek_width: { bumps: [{ at: 'zygion', r: 0.03, v: [0.5 * MM, 0, 0], mirror: true }] },
  // Smile: per 1% the mouth corners rise and widen a little and the cheeks lift and fill (100% is a broad closed-lip smile).
  f_smile: { bumps: [{ at: 'cheilion', r: 0.017, v: [0.035 * MM, 0.075 * MM, -0.015 * MM], mirror: true }, { at: 'cheek', r: 0.026, v: [0, 0.04 * MM, 0.03 * MM], mirror: true }] },
  f_ear_size: { bumps: [{ at: 'ear', r: 0.06, scale: 0.01, mirror: true }] },
};
export const FACE_CHANNEL_NAMES = Object.keys(CHANNELS);

/** Build the generated sparse channels for the body and for the eye part, anchored on skin-snapped landmarks. */
export function buildFaceChannels(D, skin, eyeLayout) {
  const points = { ear: LM.ear, eye: eyeLayout[0].center };
  for (const [name, p] of Object.entries(SKIN_POINTS)) { const hit = skin.nearest(p, 0.03); points[name] = hit ? hit.point : p; }
  const out = { body: {}, eyes: {}, points };
  const headVerts = []; for (let v = 0; v < D.body.count; v += 1) if (D.body.group[v] === 5 || D.body.group[v] === 4) headVerts.push(v);
  const eyeCount = D.parts.eyes.pos.length / 3;
  for (const [name, spec] of Object.entries(CHANNELS)) {
    const resolved = [];
    for (const b of spec.bumps) {
      const base = points[b.at]; const c = [base[0], base[1] + (b.dy || 0), base[2] + (b.dz || 0)];
      const half = b.half ? { ...b.half, abs: points[b.half.ref || b.at][b.half.axis] + b.half.at } : null;
      resolved.push({ ...b, c, half });
      if (b.mirror) resolved.push({ ...b, c: [-c[0], c[1], c[2]], v: b.v ? [-b.v[0], b.v[1], b.v[2]] : undefined, half });
    }
    const evaluate = (pos, count, ids) => {
      const index = []; const delta = [];
      for (let k = 0; k < (ids ? ids.length : count); k += 1) {
        const v = ids ? ids[k] : k; const x = pos[v * 3]; const y = pos[v * 3 + 1]; const z = pos[v * 3 + 2];
        let dx = 0; let dy = 0; let dz = 0;
        for (const b of resolved) {
          const d = Math.hypot(x - b.c[0], y - b.c[1], z - b.c[2]); if (d >= b.r) continue;
          let w = falloff(d / b.r);
          if (b.half) { const s = b.half.axis === 1 ? y : x; w *= smooth(-0.0008, 0.0008, (s - b.half.abs) * b.half.sign); }
          if (b.scale) { const ctr = [b.c[0], b.c[1], b.c[2]]; dx += (x - ctr[0]) * b.scale * w; dy += (y - ctr[1]) * b.scale * w; dz += (z - ctr[2]) * b.scale * w; } else { dx += b.v[0] * w; dy += b.v[1] * w; dz += b.v[2] * w; }
        }
        if (dx || dy || dz) { index.push(v); delta.push(dx, dy, dz); }
      }
      return index.length ? { index: Uint16Array.from(index), delta: Float32Array.from(delta) } : null;
    };
    const body = evaluate(D.body.pos, D.body.count, headVerts); if (body) out.body[name] = body;
    if (spec.eyes) { const eyes = evaluate(D.parts.eyes.pos, eyeCount); if (eyes) out.eyes[name] = eyes; }
  }
  return out;
}

// ---- measurements ---------------------------------------------------------------------------------------------
/** Landmark pairs read off the shape that is drawn: bind each skin point to its triangle once, read positions back after any morph. */
export function bindMeasurements(skin, points) {
  const bind = p => { const hit = skin.nearest(p, 0.03); return hit ? { tri: hit.tri, bary: hit.bary } : null; };
  const names = ['medialCanthus', 'lateralCanthus', 'alare', 'cheilion', 'gonion', 'zygion', 'nasion', 'subnasale', 'pronasale', 'upperLip', 'stomion', 'lowerLip', 'pogonion', 'menton', 'glabella'];
  const out = {};
  for (const name of names) {
    const p = points[name];
    out[`${name}`] = bind(p);
    if (p[0] > 1e-4) out[`${name}R`] = bind([-p[0], p[1], p[2]]);
  }
  return out;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 1000;

/** Add the upper and lower lid points (at 90 and 270 degrees around the eye) to the bindings, from a lid margin (see hairgrow.lidMargin). */
export function bindLid(bindings, margin) {
  if (!margin || !margin.length) return bindings;
  const pick = deg => margin.reduce((a, m) => (Math.abs(m.theta - (deg * Math.PI) / 180) < Math.abs(a.theta - (deg * Math.PI) / 180) ? m : a), margin[0]);
  const up = pick(90); const low = pick(270);
  bindings.lidUp = { tri: up.tri, bary: up.bary }; bindings.lidLow = { tri: low.tri, bary: low.bary };
  return bindings;
}

/** All face measurements in mm (tilt in degrees) for the given skin positions and eye centres. */
export function measureFace(bindings, idx, pos, eyeCentres) {
  const at = name => { const b = bindings[name]; return b ? bound(pos, idx, b.tri, b.bary) : null; };
  const m = {};
  const eyeL = eyeCentres[0]; const eyeR = eyeCentres[1];
  m.eyeSpacing = dist(eyeL, eyeR);
  const mcL = at('medialCanthus'); const mcR = at('medialCanthusR'); const lcL = at('lateralCanthus'); const lcR = at('lateralCanthusR');
  if (mcL && mcR) m.innerEyeGap = dist(mcL, mcR);
  if (lcL && lcR) m.outerEyeSpan = dist(lcL, lcR);
  if (mcL && lcL && mcR && lcR) {
    m.eyeWidth = (dist(mcL, lcL) + dist(mcR, lcR)) / 2;
    m.eyeTilt = (Math.atan2(lcL[1] - mcL[1], Math.abs(lcL[0] - mcL[0])) + Math.atan2(lcR[1] - mcR[1], Math.abs(lcR[0] - mcR[0]))) * 90 / Math.PI;
  }
  const alL = at('alare'); const alR = at('alareR'); const pro = at('pronasale'); const sub = at('subnasale'); const nas = at('nasion');
  if (alL && alR) m.noseWidth = dist(alL, alR);
  if (nas && sub) m.noseLength = dist(nas, sub);
  if (pro && alL && alR) m.noseProjection = (((alL[2] + alR[2]) / 2) - pro[2]) * -1000;
  const chL = at('cheilion'); const chR = at('cheilionR'); const up = at('upperLip'); const sto = at('stomion'); const low = at('lowerLip');
  if (chL && chR) m.mouthWidth = dist(chL, chR);
  if (up && sto) m.upperLip = (up[1] - sto[1]) * 1000;
  if (sto && low) m.lowerLip = (sto[1] - low[1]) * 1000;
  const goL = at('gonion'); const goR = at('gonionR'); const zyL = at('zygion'); const zyR = at('zygionR');
  if (goL && goR) m.jawWidth = dist(goL, goR);
  if (zyL && zyR) m.cheekWidth = dist(zyL, zyR);
  const pog = at('pogonion'); const men = at('menton'); const gla = at('glabella');
  if (pog && sto) m.chinHeight = (sto[1] - (men ? men[1] : pog[1])) * 1000;
  if (pog && sub) m.chinProjection = (pog[2] - sub[2]) * 1000;
  if (gla && men) m.faceHeight = (gla[1] - men[1]) * 1000;
  const lidUp = at('lidUp'); const lidLow = at('lidLow');
  if (lidUp && lidLow) m.eyeOpen = Math.abs(lidUp[1] - lidLow[1]) * 1000;
  return m;
}

// ---- parameter table (drives the plan page's "Face" controls) --------------------------------------------------------
/**
 * Each parameter: key, group, label, hint (plain words), unit, measure (key in measureFace) or null, channel, gain
 * (change of the measure per unit of the channel weight), step, the slider's end words, and the allowed range.
 */
export const FACE_PARAMS = [
  { key: 'eyeSpacing', low: 'closer together', high: 'wider apart', group: 'Eyes', label: 'Eye spacing', hint: 'Centre of one eye to the centre of the other', unit: 'mm', measure: 'eyeSpacing', channel: 'f_eye_spacing', gain: 0.75, range: [-8, 12], default: 3 },
  { key: 'eyeWidth', low: 'narrower', high: 'wider', group: 'Eyes', label: 'Eye width', hint: 'Inner corner to outer corner of one eye', unit: 'mm', measure: 'eyeWidth', channel: 'f_eye_width', gain: 1, range: [-4, 7], default: 1.5 },
  { key: 'eyeOpen', low: 'more hooded', high: 'more open', group: 'Eyes', label: 'Eye opening', hint: 'How tall the open eye is, lid to lid', unit: 'mm', measure: 'eyeOpen', channel: 'f_eye_open', gain: 1, range: [-3, 6], default: 4.5 },
  { key: 'eyeTilt', low: 'downturned', high: 'upturned', group: 'Eyes', label: 'Eye tilt', hint: 'Outer corners higher (+) or lower (-) than inner corners', unit: '°', measure: 'eyeTilt', channel: 'f_eye_tilt', gain: 1, range: [-8, 10], default: 3, step: 0.5 },
  { key: 'noseWidth', low: 'narrower', high: 'wider', group: 'Nose', label: 'Nose width', hint: 'Across the nostril wings', unit: 'mm', measure: 'noseWidth', channel: 'f_nose_width', gain: 1, range: [-8, 12], default: 3 },
  { key: 'noseLength', low: 'shorter', high: 'longer', group: 'Nose', label: 'Nose length', hint: 'Top of the nose bridge to the base', unit: 'mm', measure: 'noseLength', channel: 'f_nose_length', gain: 1, range: [-8, 10], default: 2 },
  { key: 'noseProjection', low: 'flatter', high: 'more prominent', group: 'Nose', label: 'Nose projection', hint: 'How far the tip stands out from the face', unit: 'mm', measure: 'noseProjection', channel: 'f_nose_projection', gain: 1, range: [-7, 8], default: 1.5 },
  { key: 'mouthWidth', low: 'narrower', high: 'wider', group: 'Mouth', label: 'Mouth width', hint: 'Corner to corner, resting', unit: 'mm', measure: 'mouthWidth', channel: 'f_mouth_width', gain: 1, range: [-10, 10], default: -2 },
  { key: 'upperLip', low: 'thinner', high: 'fuller', group: 'Mouth', label: 'Upper lip', hint: 'Thickness of the upper lip', unit: 'mm', measure: 'upperLip', channel: 'f_lip_upper', gain: 1, range: [-4, 6], default: 1 },
  { key: 'lowerLip', low: 'thinner', high: 'fuller', group: 'Mouth', label: 'Lower lip', hint: 'Thickness of the lower lip', unit: 'mm', measure: 'lowerLip', channel: 'f_lip_lower', gain: 1, range: [-4, 7], default: 1.5 },
  { key: 'jawWidth', low: 'narrower', high: 'wider', group: 'Jaw and cheeks', label: 'Jaw width', hint: 'Across the two jaw corners', unit: 'mm', measure: 'jawWidth', channel: 'f_jaw_width', gain: 1, range: [-14, 16], default: 0 },
  { key: 'cheekWidth', low: 'narrower', high: 'wider', group: 'Jaw and cheeks', label: 'Cheekbone width', hint: 'Across the widest part of the face', unit: 'mm', measure: 'cheekWidth', channel: 'f_cheek_width', gain: 1, range: [-14, 14], default: 0 },
  { key: 'chinProjection', low: 'receding', high: 'prominent', group: 'Jaw and cheeks', label: 'Chin projection', hint: 'How far the chin stands out', unit: 'mm', measure: 'chinProjection', channel: 'f_chin_projection', gain: 1, range: [-8, 8], default: 0 },
  { key: 'chinHeight', low: 'shorter', high: 'longer', group: 'Jaw and cheeks', label: 'Chin height', hint: 'Lower lip line to the bottom of the chin', unit: 'mm', measure: 'chinHeight', channel: 'f_chin_height', gain: 1, range: [-8, 8], default: 0 },
  { key: 'smile', low: 'neutral', high: 'broad smile', group: 'Expression', label: 'Smile', hint: 'Lifts and widens the mouth corners and fills the cheeks', unit: '%', measure: null, channel: 'f_smile', gain: 1, range: [-20, 100], default: 12, step: 1 },
  { key: 'earSize', low: 'smaller', high: 'larger', group: 'Ears', label: 'Ear size', hint: 'Scales both ears', unit: '%', measure: null, channel: 'f_ear_size', gain: 1, range: [-30, 40], default: 0, step: 1 },
  { key: 'browRidge', low: 'flatter', high: 'heavier', group: 'Brows', label: 'Brow ridge', hint: 'How much the bone above the eyes stands out', unit: '%', measure: null, channel: 'brow_depth', gain: 100, range: [-60, 100], default: 0, step: 1 },
  { key: 'noseTip', low: 'smaller', high: 'larger', group: 'Nose', label: 'Nose tip size', hint: 'The ball at the end of the nose', unit: '%', measure: null, channel: 'nose_tip_size', gain: 100, range: [-100, 100], default: 0, step: 1 },
  { key: 'noseBridge', low: 'narrower', high: 'wider', group: 'Nose', label: 'Nose bridge', hint: 'Width of the bony ridge between the eyes', unit: '%', measure: null, channel: 'nose_bridge_width', gain: 100, range: [-100, 100], default: 0, step: 1 },
  { key: 'jawAngle', low: 'softer', high: 'squarer', group: 'Jaw and cheeks', label: 'Jaw corner', hint: 'How sharp the corner of the jaw is', unit: '%', measure: null, channel: 'jaw_angle', gain: 100, range: [-100, 100], default: 0, step: 1 },
  { key: 'earOut', low: 'flat to the head', high: 'sticking out', group: 'Ears', label: 'Ear prominence', hint: 'How far the ears stand away from the head', unit: '%', measure: null, channel: 'ear_prominence', gain: 100, range: [-60, 100], default: 0, step: 1 },
];
export const FACE_PARAM_BY_KEY = Object.fromEntries(FACE_PARAMS.map(p => [p.key, p]));
export const FACE_DEFAULTS = Object.fromEntries(FACE_PARAMS.map(p => [p.key, p.default]));

/** Weight of each generated channel for the given parameter values (mm, deg, %). */
export function faceWeights(values) {
  const weights = {};
  for (const p of FACE_PARAMS) { const v = values[p.key] ?? p.default; weights[p.channel] = (weights[p.channel] || 0) + v / p.gain; }
  return weights;
}

/**
 * Find the value of a parameter at which `readOf(values)` equals `target`. The response of a measurement to its channel is
 * read numerically (secant steps), so it need not be exactly 1 mm per mm. Returns { value, reached, ok }.
 */
export function solveFaceParam(p, target, values, readOf) {
  const trial = { ...values };
  for (let i = 0; i < 4; i += 1) {
    const cur = readOf(trial); if (cur == null || Math.abs(target - cur) < 0.05) break;
    const step = trial[p.key] + 1 > p.range[1] ? -1 : 1; const probe = { ...trial, [p.key]: trial[p.key] + step };
    const slope = (readOf(probe) - cur) / step;
    if (Math.abs(slope) < 0.02) break;
    trial[p.key] = Math.min(p.range[1], Math.max(p.range[0], trial[p.key] + (target - cur) / slope));
  }
  const reached = readOf(trial);
  return { value: trial[p.key], reached, ok: reached != null && Math.abs(reached - target) < 0.25 };
}
