/**
 * Broad, non-diagnostic plausibility bounds for body measurements.
 *
 * These are data-integrity limits, not targets or medical recommendations.
 * They prevent legacy placeholders and unit mistakes (for example a 3 cm
 * thigh) from being treated as real anatomy by the renderer.
 */
export const BODY_METRIC_RANGES = Object.freeze({
  height: { min: 90, max: 250, unit: 'cm' },
  weight: { min: 25, max: 350, unit: 'kg' },
  bodyFat: { min: 2, max: 75, unit: '%' },
  leanMass: { min: 10, max: 260, unit: 'kg' },
  skeletalMuscle: { min: 5, max: 180, unit: 'kg' },
  bodyWater: { min: 20, max: 80, unit: '%' },
  boneMass: { min: 1, max: 15, unit: 'kg' },
  visceralFat: { min: 0, max: 60, unit: 'level' },
  chest: { min: 45, max: 250, unit: 'cm' },
  waist: { min: 40, max: 250, unit: 'cm' },
  shoulders: { min: 50, max: 250, unit: 'cm' },
  shoulderBreadth: { min: 20, max: 90, unit: 'cm' },
  bideltoidBreadth: { min: 25, max: 110, unit: 'cm' },
  chestDepth: { min: 8, max: 65, unit: 'cm' },
  underbust: { min: 40, max: 220, unit: 'cm' },
  arms: { min: 10, max: 100, unit: 'cm' },
  forearm: { min: 10, max: 80, unit: 'cm' },
  wrist: { min: 8, max: 40, unit: 'cm' },
  elbow: { min: 10, max: 60, unit: 'cm' },
  neck: { min: 15, max: 90, unit: 'cm' },
  hips: { min: 45, max: 250, unit: 'cm' },
  highHip: { min: 40, max: 250, unit: 'cm' },
  pelvicBreadth: { min: 15, max: 80, unit: 'cm' },
  glutes: { min: 45, max: 250, unit: 'cm' },
  thighs: { min: 20, max: 150, unit: 'cm' },
  calves: { min: 15, max: 90, unit: 'cm' },
  ankle: { min: 10, max: 50, unit: 'cm' },
  torsoLength: { min: 20, max: 100, unit: 'cm' },
  sittingHeight: { min: 40, max: 150, unit: 'cm' },
  upperArm: { min: 12, max: 70, unit: 'cm' },
  lowerArm: { min: 12, max: 65, unit: 'cm' },
  handLength: { min: 8, max: 35, unit: 'cm' },
  legLength: { min: 30, max: 160, unit: 'cm' },
  upperLegLength: { min: 15, max: 100, unit: 'cm' },
  lowerLegLength: { min: 15, max: 100, unit: 'cm' },
  inseam: { min: 30, max: 150, unit: 'cm' },
  neckLength: { min: 3, max: 30, unit: 'cm' },
  footLength: { min: 10, max: 45, unit: 'cm' },
  headCirc: { min: 35, max: 85, unit: 'cm' },
  faceWidth: { min: 8, max: 30, unit: 'cm' },
  faceHeight: { min: 10, max: 40, unit: 'cm' },
  eyeSpacing: { min: 1, max: 12, unit: 'cm' },
  earLength: { min: 2, max: 14, unit: 'cm' },
  earWidth: { min: 1, max: 10, unit: 'cm' },
  noseLength: { min: 1, max: 12, unit: 'cm' },
  noseWidth: { min: 1, max: 10, unit: 'cm' },
  leftShoulder: { min: 20, max: 90, unit: 'cm' },
  rightShoulder: { min: 20, max: 90, unit: 'cm' },
  leftUpperArm: { min: 10, max: 100, unit: 'cm' },
  rightUpperArm: { min: 10, max: 100, unit: 'cm' },
  leftForearm: { min: 10, max: 80, unit: 'cm' },
  rightForearm: { min: 10, max: 80, unit: 'cm' },
  leftWrist: { min: 8, max: 40, unit: 'cm' },
  rightWrist: { min: 8, max: 40, unit: 'cm' },
  leftThigh: { min: 20, max: 150, unit: 'cm' },
  rightThigh: { min: 20, max: 150, unit: 'cm' },
  leftCalf: { min: 15, max: 90, unit: 'cm' },
  rightCalf: { min: 15, max: 90, unit: 'cm' },
  leftHip: { min: 20, max: 130, unit: 'cm' },
  rightHip: { min: 20, max: 130, unit: 'cm' },
  headTiltAngle: { min: -90, max: 90, unit: 'deg' },
  pelvicTilt: { min: -90, max: 90, unit: 'deg' },
  shoulderRounding: { min: -90, max: 90, unit: 'deg' },
  shoulderTilt: { min: -90, max: 90, unit: 'deg' },
  spineCurvature: { min: -90, max: 90, unit: 'deg' },
  hipRotation: { min: -90, max: 90, unit: 'deg' },
  kneeAlignment: { min: -90, max: 90, unit: 'deg' },
  leftKneeAngle: { min: -90, max: 180, unit: 'deg' },
  rightKneeAngle: { min: -90, max: 180, unit: 'deg' },
  leftFootRotation: { min: -180, max: 180, unit: 'deg' },
  rightFootRotation: { min: -180, max: 180, unit: 'deg' },
  brow_depth: { min: 0, max: 1, unit: 'ratio' },
  nose_bridge_width: { min: 0, max: 1, unit: 'ratio' },
  nose_tip_size: { min: 0, max: 1, unit: 'ratio' },
  ear_prominence: { min: 0, max: 1, unit: 'ratio' },
  jaw_width: { min: 0, max: 1, unit: 'ratio' },
  chin_projection: { min: 0, max: 1, unit: 'ratio' },
  lip_fullness: { min: 0, max: 1, unit: 'ratio' },
  eye_size: { min: 0, max: 1, unit: 'ratio' },
});

export function validateBodyMetric(key, input, { allowEmpty = true } = {}) {
  if (input === '' || input == null) {
    return { valid: allowEmpty, empty: true, value: null, range: BODY_METRIC_RANGES[key] ?? null };
  }
  const value = Number(input);
  const range = BODY_METRIC_RANGES[key];
  if (!Number.isFinite(value)) return { valid: false, empty: false, value: null, range: range ?? null, reason: 'Enter a number.' };
  if (!range) return { valid: true, empty: false, value, range: null };
  if (value < range.min || value > range.max) {
    return {
      valid: false,
      empty: false,
      value,
      range,
      reason: `Enter ${range.min}–${range.max}${range.unit ? ` ${range.unit}` : ''}.`,
    };
  }
  return { valid: true, empty: false, value, range };
}

export function isBodyMetricValueValid(key, input) {
  return validateBodyMetric(key, input, { allowEmpty: false }).valid;
}

export function sanitizeBodyMetrics(source = {}) {
  const metrics = {};
  const invalid = [];
  Object.entries(source || {}).forEach(([key, value]) => {
    if (!BODY_METRIC_RANGES[key]) {
      metrics[key] = value;
      return;
    }
    const result = validateBodyMetric(key, value);
    if (result.empty) return;
    if (!result.valid) {
      invalid.push({ key, value, ...result });
      return;
    }
    metrics[key] = result.value;
  });
  return { metrics, invalid };
}
