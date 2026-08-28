export const BODY_METRIC_GROUPS = [
  {
    id: 'composition',
    label: 'Body composition',
    metrics: [
      { key: 'weight', label: 'Weight', unit: 'kg', currentField: 'weightKg', targetField: 'targetWeightKg' },
      { key: 'bodyFat', label: 'Body fat', unit: '%', currentField: 'bodyFatPct', targetField: 'targetBodyFatPct', direction: 'decrease' },
      { key: 'waist', label: 'Waist', unit: 'cm', currentField: 'waistCm', targetField: 'targetWaistCm', direction: 'decrease' },
      { key: 'hips', label: 'Hips', unit: 'cm', currentField: 'hipsCm' },
    ],
  },
  {
    id: 'upper',
    label: 'Upper body',
    metrics: [
      { key: 'chest', label: 'Chest', unit: 'cm', currentField: 'chestCm', targetField: 'targetChestCm' },
      { key: 'shoulders', label: 'Shoulders', unit: 'cm', currentField: 'shouldersCm', targetField: 'targetShouldersCm' },
      { key: 'arms', label: 'Arms', unit: 'cm', currentField: 'armsCm', targetField: 'targetArmsCm' },
      { key: 'forearm', label: 'Forearms', unit: 'cm', currentField: 'forearmsCm' },
      { key: 'neck', label: 'Neck', unit: 'cm', currentField: 'neckCm' },
    ],
  },
  {
    id: 'lower',
    label: 'Lower body',
    metrics: [
      { key: 'thighs', label: 'Thighs', unit: 'cm', currentField: 'thighsCm', targetField: 'targetThighsCm' },
      { key: 'glutes', label: 'Glutes', unit: 'cm', currentField: 'glutesCm' },
      { key: 'calves', label: 'Calves', unit: 'cm', currentField: 'calvesCm' },
      { key: 'ankle', label: 'Ankles', unit: 'cm', currentField: 'ankleCm' },
    ],
  },
];

export const BODY_METRICS = BODY_METRIC_GROUPS.flatMap((group) => group.metrics);
export const BODY_METRIC_MAP = Object.fromEntries(BODY_METRICS.map((metric) => [metric.key, metric]));

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
  return Object.fromEntries(BODY_METRICS.flatMap((metric) => {
    const value = finite(profile?.[metric.currentField]);
    return value == null ? [] : [[metric.key, value]];
  }));
}

export function bodyProfileToGoals(profile = {}, physiqueTargets = {}) {
  const storedGoals = physiqueTargets?.goalMetrics || {};
  return Object.fromEntries(BODY_METRICS.flatMap((metric) => {
    const databaseValue = metric.targetField ? finite(profile?.[metric.targetField]) : null;
    const value = databaseValue ?? finite(storedGoals?.[metric.key]);
    return value == null ? [] : [[metric.key, value]];
  }));
}

export function metricsToBodyProfile(current = {}, goal = {}) {
  const payload = {};
  BODY_METRICS.forEach((metric) => {
    const currentValue = finite(current?.[metric.key]);
    const goalValue = finite(goal?.[metric.key]);
    if (currentValue != null) payload[metric.currentField] = currentValue;
    if (metric.targetField && goalValue != null) payload[metric.targetField] = goalValue;
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
