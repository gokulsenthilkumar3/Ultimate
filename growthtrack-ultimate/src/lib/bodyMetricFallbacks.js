const finite = (value) => {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, precision = 1) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const SEX_BASELINES = Object.freeze({
  male: Object.freeze({ height: 175, bodyFat: 18, hipRatio: 0.52, shoulderRatio: 0.259 }),
  female: Object.freeze({ height: 162, bodyFat: 28, hipRatio: 0.59, shoulderRatio: 0.228 }),
  neutral: Object.freeze({ height: 169, bodyFat: 23, hipRatio: 0.555, shoulderRatio: 0.244 }),
});

function normalizeSex(value) {
  const sex = String(value || '').trim().toLowerCase();
  if (['female', 'woman', 'f'].includes(sex)) return 'female';
  if (['male', 'man', 'm'].includes(sex)) return 'male';
  return 'neutral';
}

/**
 * Produces a render-safe metric set without mutating or persisting estimates.
 * User-entered values always win, followed by inherited values (goal → current),
 * then conservative anthropometric estimates. Estimates exist only to keep the
 * digital human coherent while profile data is incomplete.
 */
export function resolveBodyMetrics(metrics = {}, inherited = {}) {
  const supplied = { ...inherited, ...metrics };
  const sex = normalizeSex(supplied.biologicalSex || supplied.gender || supplied.modelPreset);
  const baseline = SEX_BASELINES[sex];
  const resolved = { ...supplied, biologicalSex: supplied.biologicalSex || sex };
  const derivedKeys = new Set();

  const setDerived = (key, value) => {
    if (finite(resolved[key]) != null || value == null || !Number.isFinite(Number(value))) return;
    resolved[key] = round(Number(value));
    derivedKeys.add(key);
  };

  setDerived('height', baseline.height);
  const height = finite(resolved.height) ?? baseline.height;
  setDerived('weight', 22 * ((height / 100) ** 2));
  const weight = finite(resolved.weight) ?? 22 * ((height / 100) ** 2);
  setDerived('bodyFat', baseline.bodyFat);
  const bodyFat = finite(resolved.bodyFat) ?? baseline.bodyFat;
  const massAdjustment = clamp((weight - 22 * ((height / 100) ** 2)) * 0.22, -7, 12);

  setDerived('waist', clamp(height * 0.435 + massAdjustment + (bodyFat - baseline.bodyFat) * 0.35, 58, 145));
  const waist = finite(resolved.waist);
  setDerived('hips', clamp(height * baseline.hipRatio + massAdjustment * 0.45, 72, 145));
  const hips = finite(resolved.hips);
  setDerived('chest', clamp(height * (sex === 'male' ? 0.56 : sex === 'female' ? 0.55 : 0.555) + massAdjustment * 0.55, 70, 150));
  setDerived('shoulderBreadth', clamp(height * baseline.shoulderRatio, 32, 58));
  setDerived('shoulders', clamp((finite(resolved.shoulderBreadth) ?? height * baseline.shoulderRatio) * 2.35, 78, 150));
  setDerived('underbust', clamp((finite(resolved.chest) ?? height * 0.55) - (sex === 'female' ? 12 : 7), 60, 130));
  setDerived('highHip', clamp((waist ?? height * 0.44) * 0.45 + (hips ?? height * baseline.hipRatio) * 0.55, 68, 140));
  setDerived('glutes', clamp((hips ?? height * baseline.hipRatio) + (sex === 'female' ? 2.5 : 0), 72, 150));

  setDerived('thighs', clamp((hips ?? height * baseline.hipRatio) * 0.29 + weight * 0.22 + 11, 38, 90));
  const thighs = finite(resolved.thighs);
  setDerived('calves', clamp((thighs ?? height * 0.32) * 0.54 + 7, 26, 58));
  setDerived('arms', clamp(height * 0.13 + weight * 0.13 - bodyFat * 0.08, 22, 60));
  setDerived('forearm', clamp((finite(resolved.arms) ?? height * 0.18) * 0.76 + 2.5, 18, 45));
  setDerived('wrist', clamp(height * 0.095, 13, 23));
  setDerived('elbow', clamp((finite(resolved.forearm) ?? height * 0.16) * 0.92, 19, 39));
  setDerived('neck', clamp(height * (sex === 'male' ? 0.215 : 0.205) + massAdjustment * 0.12, 28, 55));
  setDerived('ankle', clamp(height * 0.125, 17, 31));

  setDerived('sittingHeight', height * 0.52);
  setDerived('torsoLength', height * 0.29);
  setDerived('inseam', height * 0.455);
  setDerived('legLength', height * 0.53);
  setDerived('upperLegLength', height * 0.245);
  setDerived('lowerLegLength', height * 0.245);
  setDerived('upperArm', height * 0.19);
  setDerived('lowerArm', height * 0.16);
  setDerived('handLength', height * 0.108);
  setDerived('footLength', height * 0.152);
  setDerived('headCirc', height * 0.325);
  setDerived('neckLength', height * 0.06);

  return {
    metrics: resolved,
    derivedKeys: [...derivedKeys],
    suppliedKeys: Object.keys(metrics).filter((key) => finite(metrics[key]) != null),
  };
}

export function getMetricCompleteness(metrics = {}) {
  const highValueKeys = ['height', 'weight', 'bodyFat', 'chest', 'waist', 'hips', 'shoulderBreadth', 'arms', 'thighs', 'calves'];
  const supplied = highValueKeys.filter((key) => finite(metrics[key]) != null);
  return {
    supplied: supplied.length,
    total: highValueKeys.length,
    percent: Math.round((supplied.length / highValueKeys.length) * 100),
    missing: highValueKeys.filter((key) => !supplied.includes(key)),
  };
}

