export const BODY_METRIC_GROUPS = [
  {
    id: 'composition',
    label: 'Body composition',
    metrics: [
      { key: 'weight', label: 'Weight', unit: 'kg', currentField: 'weightKg', targetField: 'targetWeightKg' },
      { key: 'bodyFat', label: 'Body fat', unit: '%', currentField: 'bodyFatPct', targetField: 'targetBodyFatPct', direction: 'decrease' },
      { key: 'leanMass', label: 'Lean mass', unit: 'kg', currentField: 'leanMassKg', targetField: 'targetLeanMassKg' },
      { key: 'skeletalMuscle', label: 'Skeletal muscle', unit: 'kg', currentField: 'skeletalMuscleKg', targetField: 'targetSkeletalMuscleKg' },
      { key: 'bodyWater', label: 'Body water', unit: '%', currentField: 'bodyWaterPct' },
      { key: 'boneMass', label: 'Bone mass', unit: 'kg', currentField: 'boneMassKg' },
      { key: 'visceralFat', label: 'Visceral fat', unit: 'level', currentField: 'visceralFatLevel' },
      { key: 'waist', label: 'Waist', unit: 'cm', currentField: 'waistCm', targetField: 'targetWaistCm', direction: 'decrease' },
      { key: 'hips', label: 'Hips', unit: 'cm', currentField: 'hipsCm', targetField: 'targetHipsCm' },
    ],
  },
  {
    id: 'upper',
    label: 'Upper body',
    metrics: [
      { key: 'chest', label: 'Chest', unit: 'cm', currentField: 'chestCm', targetField: 'targetChestCm' },
      { key: 'shoulders', label: 'Shoulders', unit: 'cm', currentField: 'shouldersCm', targetField: 'targetShouldersCm' },
      { key: 'shoulderBreadth', label: 'Shoulder breadth', unit: 'cm', currentField: 'shoulderBreadthCm' },
      { key: 'bideltoidBreadth', label: 'Bideltoid breadth', unit: 'cm', currentField: 'bideltoidBreadthCm' },
      { key: 'chestDepth', label: 'Chest depth', unit: 'cm', currentField: 'chestDepthCm' },
      { key: 'underbust', label: 'Underbust', unit: 'cm', currentField: 'underbustCm' },
      { key: 'arms', label: 'Arms', unit: 'cm', currentField: 'armsCm', targetField: 'targetArmsCm' },
      { key: 'forearm', label: 'Forearms', unit: 'cm', currentField: 'forearmsCm' },
      { key: 'wrist', label: 'Wrist', unit: 'cm', currentField: 'wristCm' },
      { key: 'elbow', label: 'Elbow', unit: 'cm', currentField: 'elbowCm' },
      { key: 'neck', label: 'Neck', unit: 'cm', currentField: 'neckCm' },
    ],
  },
  {
    id: 'lower',
    label: 'Lower body',
    metrics: [
      { key: 'thighs', label: 'Thighs', unit: 'cm', currentField: 'thighsCm', targetField: 'targetThighsCm' },
      { key: 'glutes', label: 'Glutes', unit: 'cm', currentField: 'glutesCm', targetField: 'targetGlutesCm' },
      { key: 'highHip', label: 'High hip', unit: 'cm', currentField: 'highHipCm' },
      { key: 'pelvicBreadth', label: 'Pelvic breadth', unit: 'cm', currentField: 'pelvicBreadthCm' },
      { key: 'calves', label: 'Calves', unit: 'cm', currentField: 'calvesCm', targetField: 'targetCalvesCm' },
      { key: 'ankle', label: 'Ankles', unit: 'cm', currentField: 'ankleCm' },
    ],
  },
  {
    id: 'proportions',
    label: 'Proportions and face',
    metrics: [
      { key: 'sittingHeight', label: 'Sitting height', unit: 'cm', currentField: 'sittingHeightCm' },
      { key: 'inseam', label: 'Inseam', unit: 'cm', currentField: 'inseamCm' },
      { key: 'upperLegLength', label: 'Upper leg length', unit: 'cm', currentField: 'upperLegLengthCm' },
      { key: 'lowerLegLength', label: 'Lower leg length', unit: 'cm', currentField: 'lowerLegLengthCm' },
      { key: 'neckLength', label: 'Neck length', unit: 'cm', currentField: 'neckLengthCm' },
      { key: 'faceWidth', label: 'Face width', unit: 'cm', currentField: 'faceWidthCm' },
      { key: 'faceHeight', label: 'Face height', unit: 'cm', currentField: 'faceHeightCm' },
      { key: 'eyeSpacing', label: 'Eye spacing', unit: 'cm', currentField: 'eyeSpacingCm' },
      { key: 'earLength', label: 'Ear length', unit: 'cm', currentField: 'earLengthCm' },
      { key: 'earWidth', label: 'Ear width', unit: 'cm', currentField: 'earWidthCm' },
      { key: 'noseLength', label: 'Nose length', unit: 'cm', currentField: 'noseLengthCm' },
      { key: 'noseWidth', label: 'Nose width', unit: 'cm', currentField: 'noseWidthCm' },
    ],
  },
  {
    id: 'asymmetry',
    label: 'Left / right symmetry',
    metrics: [
      { key: 'leftUpperArm', label: 'Left upper arm', unit: 'cm', currentField: 'leftUpperArmCircumferenceCm' },
      { key: 'rightUpperArm', label: 'Right upper arm', unit: 'cm', currentField: 'rightUpperArmCircumferenceCm' },
      { key: 'leftForearm', label: 'Left forearm', unit: 'cm', currentField: 'leftForearmCm' },
      { key: 'rightForearm', label: 'Right forearm', unit: 'cm', currentField: 'rightForearmCm' },
      { key: 'leftThigh', label: 'Left thigh', unit: 'cm', currentField: 'leftThighCm' },
      { key: 'rightThigh', label: 'Right thigh', unit: 'cm', currentField: 'rightThighCm' },
      { key: 'leftCalf', label: 'Left calf', unit: 'cm', currentField: 'leftCalfCm' },
      { key: 'rightCalf', label: 'Right calf', unit: 'cm', currentField: 'rightCalfCm' },
      { key: 'leftHip', label: 'Left hip', unit: 'cm', currentField: 'leftHipCm' },
      { key: 'rightHip', label: 'Right hip', unit: 'cm', currentField: 'rightHipCm' },
    ],
  },
  {
    id: 'posture',
    label: 'Posture and alignment',
    metrics: [
      { key: 'headTiltAngle', label: 'Head tilt', unit: 'deg', currentField: 'headTiltAngle' },
      { key: 'pelvicTilt', label: 'Pelvic tilt', unit: 'deg', currentField: 'pelvicTilt' },
      { key: 'shoulderRounding', label: 'Shoulder rounding', unit: 'deg', currentField: 'shoulderRounding' },
      { key: 'shoulderTilt', label: 'Shoulder tilt', unit: 'deg', currentField: 'shoulderTiltDeg' },
      { key: 'spineCurvature', label: 'Spine curvature', unit: 'deg', currentField: 'spineCurvatureDeg' },
      { key: 'hipRotation', label: 'Hip rotation', unit: 'deg', currentField: 'hipRotationDeg' },
      { key: 'kneeAlignment', label: 'Knee alignment', unit: 'deg', currentField: 'kneeAlignmentDeg' },
      { key: 'leftKneeAngle', label: 'Left knee angle', unit: 'deg', currentField: 'leftKneeAngleDeg' },
      { key: 'rightKneeAngle', label: 'Right knee angle', unit: 'deg', currentField: 'rightKneeAngleDeg' },
      { key: 'leftFootRotation', label: 'Left foot rotation', unit: 'deg', currentField: 'leftFootRotationDeg' },
      { key: 'rightFootRotation', label: 'Right foot rotation', unit: 'deg', currentField: 'rightFootRotationDeg' },
    ],
  },
  {
    id: 'facial-shape',
    label: 'Facial shape',
    metrics: [
      { key: 'brow_depth', label: 'Brow depth', unit: 'ratio', currentField: 'browDepth' },
      { key: 'nose_bridge_width', label: 'Nose bridge width', unit: 'ratio', currentField: 'noseBridgeWidth' },
      { key: 'nose_tip_size', label: 'Nose tip size', unit: 'ratio', currentField: 'noseTipSize' },
      { key: 'ear_prominence', label: 'Ear prominence', unit: 'ratio', currentField: 'earProminence' },
      { key: 'jaw_width', label: 'Jaw width', unit: 'ratio', currentField: 'jawWidth' },
      { key: 'chin_projection', label: 'Chin projection', unit: 'ratio', currentField: 'chinProjection' },
      { key: 'lip_fullness', label: 'Lip fullness', unit: 'ratio', currentField: 'lipFullness' },
      { key: 'eye_size', label: 'Eye size', unit: 'ratio', currentField: 'eyeSize' },
    ],
  },
];

export const BODY_METRICS = BODY_METRIC_GROUPS.flatMap((group) => group.metrics);
export const BODY_METRIC_MAP = Object.fromEntries(BODY_METRICS.map((metric) => [metric.key, metric]));

export const BODY_APPEARANCE_FIELDS = Object.freeze([
  ['skinTone', 'skinTone'], ['skinFitzpatrickIndex', 'skinFitzpatrickIndex'], ['skinColor', 'skinColorHex'], ['skinUndertone', 'skinUndertone'], ['skinTextureVariant', 'skinTextureVariant'], ['skinFreckleDensity', 'skinFreckleDensity'], ['skinFeatureMap', 'skinFeatureMap'],
  ['eyeColor', 'eyeColorHex'], ['eyePattern', 'eyePattern'], ['eyelidShape', 'eyelidShape'], ['eyelashStyle', 'eyelashStyle'], ['scleraColor', 'scleraColorHex'], ['irisLimbalRing', 'irisLimbalRing'], ['lipColor', 'lipColorHex'],
  ['hairStyle', 'hairStyle'], ['hairColor', 'hairColorHex'], ['hairTexture', 'hairTexture'], ['hairlineStyle', 'hairlineStyle'], ['hairPart', 'hairPart'],
  ['hairDensity', 'hairDensity'], ['hairLength', 'hairLengthCm'], ['facialHairStyle', 'facialHairStyle'], ['facialHairColor', 'facialHairColorHex'],
  ['facialHairDensity', 'facialHairDensity'], ['eyebrowStyle', 'eyebrowStyle'], ['eyebrowColor', 'eyebrowColorHex'], ['bodyHairPattern', 'bodyHairPattern'],
  ['bodyHairColor', 'bodyHairColorHex'], ['bodyHairTexture', 'bodyHairTexture'], ['bodyHairDensity', 'bodyHairDensity'], ['nailColor', 'nailColorHex'], ['nailShape', 'nailShape'], ['nailLengthMm', 'nailLengthMm'], ['biologicalSex', 'biologicalSex'],
  ['modelPreset', 'modelPreset'], ['avatarAsset', 'avatarAsset'], ['tattooAsset', 'tattooAsset'], ['anatomyPreset', 'anatomyPreset'], ['anatomyVisibility', 'anatomyVisibility'],
  ['anatomyRevealConsent', 'anatomyRevealConsent'],
]);

export function mergeBodyProfileSources(bodyProfile = {}, legacyUser = {}) {
  const legacy = {
    heightCm: legacyUser.height,
    weightKg: legacyUser.weight,
    bodyFatPct: legacyUser.bodyFat,
    chestCm: legacyUser.chest,
    waistCm: legacyUser.waist,
    shouldersCm: legacyUser.shoulders,
    armsCm: legacyUser.arms,
    forearmsCm: legacyUser.forearm,
    hipsCm: legacyUser.hips,
    thighsCm: legacyUser.thighs,
    calvesCm: legacyUser.calves,
    neckCm: legacyUser.neck,
    glutesCm: legacyUser.glutes,
    ankleCm: legacyUser.ankle,
    headCircCm: legacyUser.headCirc,
  };
  return { ...legacy, ...(bodyProfile || {}) };
}

const finite = (value) => {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function bodyProfileToMetrics(profile = {}) {
  const measurements = Object.fromEntries(BODY_METRICS.flatMap((metric) => {
    const value = finite(profile?.[metric.currentField]);
    return value == null ? [] : [[metric.key, value]];
  }));
  const fitzpatrickIndex = finite(profile?.skinFitzpatrickIndex);
  const appearance = Object.fromEntries(BODY_APPEARANCE_FIELDS.flatMap(([key, field]) => {
    let value = profile?.[field];
    if (key === 'skinTone' && !value && fitzpatrickIndex != null) value = ['I', 'II', 'III', 'IV', 'V', 'VI'][Math.max(0, Math.min(5, Math.round(fitzpatrickIndex)))];
    if (key === 'anatomyRevealConsent') return value === undefined ? [] : [[key, value === true]];
    if (value === '' || value == null) return [];
    if (typeof value === 'string' && field === 'morphOverrides') return [];
    return [[key, value]];
  }));
  return { ...measurements, ...appearance };
}

export function bodyProfileToGoals(profile = {}, physiqueTargets = {}) {
  const storedGoals = physiqueTargets?.goalMetrics || {};
  return Object.fromEntries(BODY_METRICS.flatMap((metric) => {
    const databaseValue = metric.targetField ? finite(profile?.[metric.targetField]) : null;
    const value = databaseValue ?? finite(storedGoals?.[metric.key]);
    return value == null ? [] : [[metric.key, value]];
  }));
}

export function metricsToBodyProfile(current = {}, goal = {}, { includeEmpty = false } = {}) {
  const payload = {};
  BODY_METRICS.forEach((metric) => {
    const currentValue = finite(current?.[metric.key]);
    const goalValue = finite(goal?.[metric.key]);
    if (currentValue != null || (includeEmpty && Object.prototype.hasOwnProperty.call(current, metric.key))) payload[metric.currentField] = currentValue;
    if (metric.targetField && (goalValue != null || (includeEmpty && Object.prototype.hasOwnProperty.call(goal, metric.key)))) payload[metric.targetField] = goalValue;
  });
  BODY_APPEARANCE_FIELDS.forEach(([key, field]) => {
    const value = current?.[key];
    if (key === 'anatomyRevealConsent') {
      if (value !== undefined) payload[field] = Boolean(value);
    } else if (value !== undefined && value !== null && value !== '') {
      payload[field] = value;
    } else if (includeEmpty && Object.prototype.hasOwnProperty.call(current, key)) {
      payload[field] = null;
    }
  });
  return payload;
}

export function metricLogsToSnapshots(logs = []) {
  const explicit = logs
    .filter((log) => log?.metric === 'physique_snapshot' && log?.metrics && typeof log.metrics === 'object')
    .map((log) => ({ id: log.id, date: log.date || log.createdAt, label: log.label || 'Check-in', metrics: log.metrics, note: log.note || '' }));

  const grouped = new Map();
  logs.filter((log) => BODY_METRIC_MAP[log?.metric] && finite(log?.value) != null).forEach((log) => {
    const date = String(log.date || log.createdAt || '').slice(0, 10);
    if (!date) return;
    const snapshot = grouped.get(date) || { id: `metrics-${date}`, date, label: 'Check-in', metrics: {} };
    snapshot.metrics[log.metric] = finite(log.value);
    grouped.set(date, snapshot);
  });

  return [...explicit, ...grouped.values()]
    .filter((snapshot) => snapshot.date && Object.keys(snapshot.metrics || {}).length)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function calculateGoalProgress({ baseline = {}, current = {}, goal = {} }) {
  const entries = BODY_METRICS.flatMap((metric) => {
    const start = finite(baseline[metric.key]);
    const now = finite(current[metric.key]);
    const target = finite(goal[metric.key]);
    if (start == null || now == null || target == null) return [];
    const span = target - start;
    const progress = Math.abs(span) < 0.0001 ? (Math.abs(now - target) < 0.0001 ? 100 : 0) : ((now - start) / span) * 100;
    return [{ key: metric.key, progress: Math.max(0, Math.min(100, progress)) }];
  });
  if (!entries.length) return { score: null, completed: 0, total: 0 };
  return {
    score: Math.round(entries.reduce((sum, entry) => sum + entry.progress, 0) / entries.length),
    completed: entries.filter((entry) => entry.progress >= 100).length,
    total: entries.length,
  };
}

export function getBaselineMetrics(snapshots = [], current = {}) {
  return snapshots[0]?.metrics && Object.keys(snapshots[0].metrics).length ? snapshots[0].metrics : current;
}
