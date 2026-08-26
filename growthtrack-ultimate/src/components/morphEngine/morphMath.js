/**
 * Pure morph-domain operations shared by the renderer and the data store.
 *
 * Keeping these operations free of React/Three state makes the shape engine
 * deterministic, testable, and safe to reuse for authored GLBs and the
 * production procedural renderer.
 */

import { MORPH_TARGET_NAMES } from './constants';

export const SHADER_MORPH_TARGETS = Object.freeze(new Set([
  'vascularity_intensity',
  'fitzpatrick_index',
]));

export const GEOMETRY_MORPH_TARGETS = Object.freeze(
  MORPH_TARGET_NAMES.filter((name) => !SHADER_MORPH_TARGETS.has(name))
);

export const MORPH_CHANNEL_GROUPS = Object.freeze({
  composition: Object.freeze(['overall_mass', 'gut_volume', 'face_roundness']),
  torso: Object.freeze(['chest_depth', 'pec_thickness', 'waist_narrow', 'oblique_def', 'torso_length', 'ribcage_depth']),
  shoulder: Object.freeze(['deltoid_width', 'trap_swell', 'trap_rise', 'clavicle_width', 'shoulder_slope']),
  arms: Object.freeze(['bicep_peak', 'tricep_horse', 'forearm_girth', 'upper_arm_length', 'forearm_length']),
  lowerBody: Object.freeze(['glute_volume', 'hip_width', 'pelvis_width', 'quad_sweep', 'ham_thickness', 'calf_diamond', 'ankle_width', 'leg_length']),
  face: Object.freeze(['brow_depth', 'nose_bridge_width', 'nose_tip_size', 'ear_prominence', 'jaw_width', 'chin_projection', 'lip_fullness', 'eye_size', 'cheekbone_width', 'forehead_height', 'temple_narrowing', 'nose_length', 'jaw_angle']),
  extremities: Object.freeze(['knee_spacing', 'ankle_taper', 'hand_splay', 'foot_arch', 'hand_length', 'foot_length']),
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0));

/** Keep every channel finite and inside the range accepted by Three.js. */
export function sanitizeMorphWeights(weights = {}) {
  const clean = {};
  for (const name of MORPH_TARGET_NAMES) {
    const raw = weights?.[name];
    if (SHADER_MORPH_TARGETS.has(name) && name === 'fitzpatrick_index') {
      clean[name] = Math.max(0, Math.min(5, Number.isFinite(Number(raw)) ? Number(raw) : 0));
    } else {
      clean[name] = clamp01(raw);
    }
  }
  return clean;
}

/**
 * Enforce relationships between shape channels. These constraints prevent
 * impossible silhouettes when measurements or authored keys are blended from
 * different sources.
 */
export function constrainMorphWeights(weights = {}) {
  const next = sanitizeMorphWeights(weights);

  // Fat around the abdomen softens the visual effect of an extreme waist key.
  next.waist_narrow = clamp01(next.waist_narrow * (1 - next.gut_volume * 0.28));
  next.oblique_def = clamp01(next.oblique_def * (1 - next.gut_volume * 0.20));

  // Large shoulders need a proportional upper chest/trap response.
  next.pec_thickness = Math.max(next.pec_thickness, next.chest_depth * 0.68);
  next.trap_swell = Math.max(next.trap_swell, next.deltoid_width * 0.42);
  next.clavicle_width = Math.max(next.clavicle_width, next.deltoid_width * 0.30);

  // The lower-body chain stays continuous at the knee and ankle.
  next.ham_thickness = Math.max(next.ham_thickness, next.quad_sweep * 0.32);
  next.ankle_taper = Math.max(next.ankle_taper, 1 - next.ankle_width * 0.45);
  next.knee_spacing = clamp01(next.knee_spacing * 0.9 + next.pelvis_width * 0.08);

  // Private channels are bounded but never allowed to affect public channels.
  next.d_length = clamp01(next.d_length);
  next.d_girth = clamp01(next.d_girth);
  return next;
}

/** Blend several morph layers while preserving channel constraints. */
export function composeMorphLayers(base = {}, layers = []) {
  const output = { ...base };
  for (const layer of layers) {
    const values = layer?.values || layer;
    const weight = Number.isFinite(Number(layer?.weight)) ? Number(layer.weight) : 1;
    if (!values || weight === 0) continue;
    for (const name of MORPH_TARGET_NAMES) {
      if (Number.isFinite(Number(values[name]))) {
        const current = Number.isFinite(Number(output[name])) ? Number(output[name]) : 0;
        output[name] = current + (Number(values[name]) - current) * weight;
      }
    }
  }
  return constrainMorphWeights(output);
}

/** Frame-independent interpolation helper for timeline and compare modes. */
export function interpolateMorphWeights(from = {}, to = {}, progress = 0) {
  const t = clamp01(progress);
  const result = {};
  for (const name of MORPH_TARGET_NAMES) {
    const a = Number.isFinite(Number(from[name])) ? Number(from[name]) : 0;
    const b = Number.isFinite(Number(to[name])) ? Number(to[name]) : 0;
    result[name] = a + (b - a) * t;
  }
  return constrainMorphWeights(result);
}

