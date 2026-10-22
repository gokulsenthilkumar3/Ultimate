import { validateBodyMetric } from './bodyMetricContract';

export function avatarPosture(metrics = {}, inherited = {}) {
  return Object.fromEntries(['headTiltAngle', 'pelvicTilt', 'shoulderRounding'].map(key => {
    const direct = validateBodyMetric(key, metrics[key], {allowEmpty:false});
    const fallback = validateBodyMetric(key, inherited[key], {allowEmpty:false});
    return [key, direct.valid ? direct.value : fallback.valid ? fallback.value : 0];
  }));
}
