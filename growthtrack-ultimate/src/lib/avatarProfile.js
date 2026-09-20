import { sanitizeBodyMetrics, validateBodyMetric } from './bodyMetricContract';

export function createAvatarSnapshot({ metrics, weights = {}, asset = null, kind = 'check-in', id = crypto.randomUUID(), date = new Date().toISOString() }) {
  const height = validateBodyMetric('height', metrics?.height, { allowEmpty: false });
  if (!height.valid) throw new Error('Enter a valid height before saving your avatar.');
  const result = sanitizeBodyMetrics(metrics);
  if (result.invalid.length) throw new Error(`Correct these measurements: ${result.invalid.map((v) => v.key).join(', ')}`);
  return JSON.parse(JSON.stringify({ schemaVersion: 1, id, date, kind, metrics: result.metrics,
    weights, asset, calibrationVersion: null, label: kind === 'baseline' ? 'Avatar baseline' : 'Avatar check-in' }));
}

export const AVATAR_MEASUREMENTS = [
  ['height', 'Height', 'Stand barefoot and measure floor to crown.', 0],
  ['chest', 'Chest', 'Measure around the fullest chest, tape level, breathing normally.', 0.70],
  ['waist', 'Waist', 'Use the same natural-waist landmark each time; do not pull the tape tight.', 0.59],
  ['hips', 'Hips', 'Measure the fullest circumference around the buttocks.', 0.49],
  ['neck', 'Neck', 'Measure around the base of the neck without compressing the skin.', 0.83],
  ['arms', 'Upper arm', 'Measure midway between shoulder and elbow with the arm relaxed.', 0.65],
  ['thighs', 'Thigh', 'Measure the fullest upper thigh; record the same side each time.', 0.36],
  ['calves', 'Calf', 'Measure the widest calf, standing with weight evenly distributed.', 0.18],
];
