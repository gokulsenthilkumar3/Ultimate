// Keep the editor honest about the current renderer. Stored measurements and
// calibrated geometric constraints are different capabilities.
const recordOnly = new Set(['leanMass', 'skeletalMuscle', 'bodyWater', 'boneMass', 'visceralFat',
  'underbust', 'highHip', 'wrist', 'leftWrist', 'rightWrist', 'elbow', 'upperLegLength', 'lowerLegLength',
  'eyeSpacing', 'earWidth', 'earLength', 'shoulderRounding', 'shoulderTilt', 'spineCurvature',
  'hipRotation', 'kneeAlignment', 'leftKneeAngle', 'rightKneeAngle', 'leftFootRotation', 'rightFootRotation']);
const paired = new Set(['leftUpperArm', 'rightUpperArm', 'leftForearm', 'rightForearm', 'leftThigh', 'rightThigh', 'leftCalf', 'rightCalf']);

export function avatarMetricSupport(key) {
  if (key === 'leftHip' || key === 'rightHip') return 'Legacy measurement with undefined landmarks; use whole hip circumference for new entries.';
  if (recordOnly.has(key)) return 'Saved record · no independent shape control in the current model.';
  if (paired.has(key)) return 'Approximate shape · left and right values currently drive a shared, averaged shape.';
  if (key === 'headTiltAngle' || key === 'pelvicTilt') return 'Pose input · preview angles are bounded by the current rig.';
  if (key === 'height') return 'Overall scale · the current preview supports 140–210 cm visually; other valid heights remain saved.';
  return 'Approximate shape input · the final mesh dimension is not calibrated.';
}
