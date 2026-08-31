import { resolveBodyMetrics } from '../../lib/bodyMetricFallbacks';
import { constrainMorphWeights } from './morphMath';

/**
 * Pure metric-to-render mapping used by both the store and the 3D layer.
 * Keeping this module free of React/Zustand makes every measurement mapping
 * deterministic, testable, and reusable by future asset pipelines.
 */
export const MORPH_RANGES = Object.freeze({
  weight: { min: 45, max: 130 },
  bodyFat: { min: 5, max: 40 },
  leanMass: { min: 35, max: 95 },
  skeletalMuscle: { min: 20, max: 65 },
  chest: { min: 80, max: 130 },
  chestDepth: { min: 15, max: 38 },
  shoulders: { min: 90, max: 140 },
  shoulderBreadth: { min: 32, max: 58 },
  bideltoidBreadth: { min: 36, max: 65 },
  waist: { min: 65, max: 110 },
  arms: { min: 28, max: 55 },
  forearm: { min: 22, max: 40 },
  thighs: { min: 45, max: 75 },
  hips: { min: 80, max: 115 },
  pelvicBreadth: { min: 25, max: 45 },
  glutes: { min: 80, max: 120 },
  calves: { min: 30, max: 50 },
  neck: { min: 32, max: 48 },
  underbust: { min: 65, max: 120 },
  highHip: { min: 70, max: 120 },
  wrist: { min: 13, max: 24 },
  elbow: { min: 20, max: 38 },
  torsoLength: { min: 44, max: 58 },
  neckLength: { min: 7, max: 16 },
  upperArm: { min: 28, max: 40 },
  lowerArm: { min: 24, max: 35 },
  handLength: { min: 17, max: 22 },
  legLength: { min: 82, max: 98 },
  footLength: { min: 24, max: 31 },
  headCirc: { min: 52, max: 62 },
  sittingHeight: { min: 70, max: 110 },
  inseam: { min: 65, max: 100 },
  faceWidth: { min: 12, max: 20 },
  faceHeight: { min: 16, max: 26 },
  eyeSpacing: { min: 2.5, max: 8 },
  earLength: { min: 4, max: 8 },
  earWidth: { min: 2, max: 5 },
  noseLength: { min: 3, max: 7 },
  noseWidth: { min: 2, max: 5 },
  brow_depth: { min: 0, max: 1 },
  nose_bridge_width: { min: 0, max: 1 },
  nose_tip_size: { min: 0, max: 1 },
  ear_prominence: { min: 0, max: 1 },
  jaw_width: { min: 0, max: 1 },
  chin_projection: { min: 0, max: 1 },
  lip_fullness: { min: 0, max: 1 },
  eye_size: { min: 0, max: 1 },
  d_size: { min: 3, max: 9 },
  d_girth: { min: 3, max: 7 },
  ankle: { min: 18, max: 28 },
});

export const REFERENCE_HEIGHT_CM = 175;
export const SKIN_TONES = Object.freeze(['I', 'II', 'III', 'IV', 'V', 'VI']);

/**
 * Resolve the appearance value used by both the shader and the procedural
 * fallback. Profile data can arrive as either the named tone or the legacy
 * numeric index; an incomplete profile always renders as neutral IV instead
 * of sending -1 (which previously clamped to tone I in the shader).
 */
export function resolveSkinTone(metrics = {}) {
  const direct = String(metrics?.skinTone ?? '').trim().toUpperCase();
  if (SKIN_TONES.includes(direct)) return direct;
  const numeric = Number(metrics?.skinFitzpatrickIndex);
  if (Number.isFinite(numeric)) {
    return SKIN_TONES[Math.max(0, Math.min(SKIN_TONES.length - 1, Math.round(numeric)))] || 'IV';
  }
  return 'IV';
}

export function normaliseMetric(value, key) {
  const range = MORPH_RANGES[key];
  const numericValue = Number(value);
  if (!range || !Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(1, (numericValue - range.min) / (range.max - range.min)));
}

const averageMetric = (...values) => {
  const valid = values.map(Number).filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : undefined;
};

const firstMetric = (...values) => values.find((value) => (
  value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))
));

/**
 * Avatar Y scale is deliberately separate from blendshapes. Circumference
 * measurements remain absolute while height changes the complete stature.
 */
export function computeHeightScale(metrics = {}, inheritedMetrics = {}) {
  const resolved = resolveBodyMetrics(metrics, inheritedMetrics).metrics;
  const height = Number(resolved.height);
  const safeHeight = Number.isFinite(height) ? height : REFERENCE_HEIGHT_CM;
  return Math.max(0.8, Math.min(1.2, safeHeight / REFERENCE_HEIGHT_CM));
}

export function computeMorphWeights(metrics = {}, inheritedMetrics = {}) {
  const { metrics: renderMetrics } = resolveBodyMetrics(metrics, inheritedMetrics);
  const armCirc = firstMetric(averageMetric(renderMetrics.leftUpperArm, renderMetrics.rightUpperArm), renderMetrics.arms);
  const forearmCirc = firstMetric(averageMetric(renderMetrics.leftForearm, renderMetrics.rightForearm), renderMetrics.forearm);
  const thighCirc = firstMetric(averageMetric(renderMetrics.leftThigh, renderMetrics.rightThigh), renderMetrics.thighs);
  const calfCirc = firstMetric(averageMetric(renderMetrics.leftCalf, renderMetrics.rightCalf), renderMetrics.calves);
  const hipCirc = firstMetric(averageMetric(renderMetrics.leftHip, renderMetrics.rightHip), renderMetrics.hips);
  const shoulderValue = firstMetric(renderMetrics.shoulderBreadth, renderMetrics.bideltoidBreadth, renderMetrics.shoulders);
  const shoulderRange = renderMetrics.shoulderBreadth != null ? 'shoulderBreadth' : renderMetrics.bideltoidBreadth != null ? 'bideltoidBreadth' : 'shoulders';
  const hipValue = firstMetric(renderMetrics.pelvicBreadth, hipCirc);
  const hipRange = renderMetrics.pelvicBreadth != null ? 'pelvicBreadth' : 'hips';
  const chestDepthValue = renderMetrics.chestDepth != null
    ? normaliseMetric(renderMetrics.chestDepth, 'chestDepth')
    : normaliseMetric(renderMetrics.chest, 'chest');
  const legLengthValue = renderMetrics.inseam != null
    ? normaliseMetric(renderMetrics.inseam, 'inseam')
    : normaliseMetric(renderMetrics.legLength ?? (renderMetrics.height ? renderMetrics.height * 0.52 : undefined), 'legLength');
  const torsoValue = firstMetric(renderMetrics.torsoLength, renderMetrics.sittingHeight, renderMetrics.height ? renderMetrics.height * 0.28 : undefined);
  const torsoRange = renderMetrics.torsoLength != null ? 'torsoLength' : renderMetrics.sittingHeight != null ? 'sittingHeight' : 'torsoLength';
  const normalise = normaliseMetric;

  return constrainMorphWeights({
    overall_mass: normalise(renderMetrics.weight, 'weight'),
    gut_volume: Math.max(normalise(renderMetrics.weight, 'weight') * 0.6, normalise(renderMetrics.bodyFat, 'bodyFat') * 0.4),
    face_roundness: normalise(renderMetrics.bodyFat, 'bodyFat') * 0.7,
    chest_depth: chestDepthValue,
    pec_thickness: normalise(renderMetrics.chest, 'chest') * 0.85,
    deltoid_width: normalise(shoulderValue, shoulderRange),
    trap_swell: normalise(shoulderValue, shoulderRange) * 0.6,
    waist_narrow: 1 - normalise(renderMetrics.waist, 'waist'),
    oblique_def: 1 - normalise(renderMetrics.waist, 'waist') * 0.7,
    bicep_peak: normalise(armCirc, 'arms'),
    tricep_horse: normalise(armCirc, 'arms') * 0.9,
    forearm_girth: normalise(forearmCirc, 'forearm'),
    glute_volume: normalise(renderMetrics.glutes, 'glutes'),
    hip_width: normalise(hipValue, hipRange),
    quad_sweep: normalise(thighCirc, 'thighs'),
    ham_thickness: normalise(thighCirc, 'thighs') * 0.8,
    calf_diamond: normalise(calfCirc, 'calves'),
    ankle_width: normalise(renderMetrics.ankle, 'ankle'),
    neck_thickness: normalise(renderMetrics.neck, 'neck'),
    trap_rise: normalise(renderMetrics.neck, 'neck') * 0.5,
    torso_length: normalise(torsoValue, torsoRange),
    shoulder_slope: normalise(shoulderValue, shoulderRange) * 0.5,
    clavicle_width: normalise(shoulderValue, shoulderRange) * 0.8,
    ribcage_depth: chestDepthValue * 0.75,
    pelvis_width: normalise(hipValue, hipRange) * 0.85,
    neck_length: normalise(renderMetrics.neckLength ?? renderMetrics.neck, renderMetrics.neckLength != null ? 'neckLength' : 'neck') * 0.45,
    upper_arm_length: normalise(renderMetrics.upperArm ?? 34, 'upperArm'),
    forearm_length: normalise(renderMetrics.lowerArm ?? 29, 'lowerArm'),
    hand_length: normalise(renderMetrics.handLength ?? 19, 'handLength'),
    leg_length: legLengthValue,
    foot_length: normalise(renderMetrics.footLength ?? 27, 'footLength'),
    head_circumference: normalise(renderMetrics.headCirc ?? 57, 'headCirc'),
    brow_depth: normalise(renderMetrics.brow_depth ?? 0.35, 'brow_depth'),
    nose_bridge_width: normalise(renderMetrics.nose_bridge_width ?? 0.32, 'nose_bridge_width'),
    nose_tip_size: normalise(renderMetrics.nose_tip_size ?? 0.33, 'nose_tip_size'),
    ear_prominence: normalise(renderMetrics.ear_prominence ?? 0.38, 'ear_prominence'),
    jaw_width: normalise(renderMetrics.jaw_width ?? 0.36, 'jaw_width'),
    chin_projection: normalise(renderMetrics.chin_projection ?? 0.30, 'chin_projection'),
    lip_fullness: normalise(renderMetrics.lip_fullness ?? 0.42, 'lip_fullness'),
    eye_size: normalise(renderMetrics.eye_size ?? 0.40, 'eye_size'),
    cheekbone_width: normalise(renderMetrics.bodyFat, 'bodyFat') * 0.35 + normalise(shoulderValue, shoulderRange) * 0.15,
    forehead_height: normalise(renderMetrics.headCirc ?? 57, 'headCirc') * 0.25,
    temple_narrowing: 1 - normalise(renderMetrics.headCirc ?? 57, 'headCirc') * 0.15,
    nose_length: normalise(renderMetrics.bodyFat, 'bodyFat') * 0.18 + 0.15,
    jaw_angle: normalise(renderMetrics.bodyFat, 'bodyFat') * 0.2,
    shoulder_drop: 1 - normalise(shoulderValue, shoulderRange) * 0.3,
    knee_spacing: normalise(hipValue, hipRange) * 0.22,
    ankle_taper: 1 - normalise(renderMetrics.ankle, 'ankle') * 0.3,
    hand_splay: normalise(renderMetrics.handLength ?? 19, 'handLength') * 0.25,
    foot_arch: normalise(renderMetrics.footLength ?? 27, 'footLength') * 0.2,
    d_length: normalise(renderMetrics.d_length ?? renderMetrics.d_size, 'd_size'),
    d_girth: normalise(renderMetrics.d_girth, 'd_girth'),
    vascularity_intensity: renderMetrics.bodyFat < 15 ? Math.max(0, (15 - renderMetrics.bodyFat) / 10) : 0,
    fitzpatrick_index: SKIN_TONES.indexOf(resolveSkinTone(renderMetrics)),
  });
}

export function buildMorphWeights(metrics = {}, overrides = {}, inheritedMetrics = {}) {
  return constrainMorphWeights({
    ...computeMorphWeights(metrics, inheritedMetrics),
    ...overrides,
  });
}
