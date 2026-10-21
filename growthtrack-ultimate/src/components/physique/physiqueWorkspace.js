import { BODY_METRICS } from '../../lib/physiqueProfile';
import { datedLogs, finiteMetric, metricValue } from '../../lib/metricSeries';
import { convertMeasurement, formatMeasurement, formatNumber } from '../../utils/userFormatters';

export const WORKSPACE_VIEWS = [
  { value: 'blueprint', label: 'Blueprint', description: 'Your overview' },
  { value: 'measurements', label: 'Measurements', description: 'Record & estimate' },
  { value: '3d', label: '3D Mirror', description: 'Explore & compare' },
  { value: 'targets', label: 'Targets', description: 'Your next steps' },
  { value: 'history', label: 'History', description: 'See what changed' },
].map(view => ({ ...view, panelId: `physique-panel-${view.value}` }));

export const METRIC_BY_KEY = Object.fromEntries(BODY_METRICS.map(metric => [metric.key, metric]));
export const SUMMARY_KEYS = ['weight', 'bodyFat', 'waist', 'chest'];

export function formatBodyValue(value, unit, user, signed = false) {
  const number = finiteMetric(value);
  if (number === null) return '—';
  const prefix = signed && number > 0 ? '+' : '';
  if (['kg', 'cm', 'in', 'lb'].includes(unit)) return prefix + formatMeasurement(number, unit, user, { maximumFractionDigits: 1 });
  return prefix + formatNumber(number, user, { maximumFractionDigits: 1 }) + (unit === '%' ? '%' : unit && unit !== 'ratio' ? ` ${unit}` : '');
}

export function inputBodyValue(value, unit, user) {
  if (finiteMetric(value) === null) return '';
  return Number(convertMeasurement(value, unit, user).toFixed(2)).toString();
}

export function physiqueHistory(logs) {
  return datedLogs(logs).flatMap(log => {
    const metrics = {};
    for (const metric of BODY_METRICS) {
      const value = finiteMetric(log.metrics?.[metric.key]) ?? metricValue(log, metric.key);
      if (value !== null) metrics[metric.key] = value;
    }
    return Object.keys(metrics).length ? [{ ...log, metrics }] : [];
  });
}

export function parseTargetValue(value, metric) {
  if (value === '' || value == null) return null;
  const match = String(value).trim().match(/^(-?\d+(?:\.\d+)?)\s*(cm|in|kg|lb|%)?$/i);
  if (!match) return null;
  let number = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (metric?.unit === 'cm' && unit === 'in') number *= 2.54;
  if (metric?.unit === 'kg' && unit === 'lb') number *= 0.45359237;
  return number;
}

export function targetRows(targets, current, goals) {
  const seen = new Set();
  const rows = (targets || []).map((target, legacyIndex) => {
    const metric = BODY_METRICS.find(item => [item.key.toLowerCase(), item.label.toLowerCase()].includes(String(target.metric || target.key || target.label).toLowerCase()));
    if (metric) seen.add(metric.key);
    return {
      id: metric?.key || `custom-${legacyIndex}`, metric, legacyIndex, label: target.label || metric?.label || 'Measurement',
      current: finiteMetric(current[metric?.key]) ?? parseTargetValue(target.current, metric),
      goal: finiteMetric(goals[metric?.key]) ?? parseTargetValue(target.target, metric),
      raw: target,
    };
  });
  for (const [key, value] of Object.entries(goals)) {
    if (seen.has(key) || !METRIC_BY_KEY[key]) continue;
    rows.push({ id: key, metric: METRIC_BY_KEY[key], label: METRIC_BY_KEY[key].label, current: finiteMetric(current[key]), goal: finiteMetric(value), legacyIndex: null });
  }
  return rows;
}

// Existing circumference formula, kept separate from saved measurements.
export function navyBodyFat({ sex, height, neck, waist, hips }) {
  if (![height, neck, waist].every(value => finiteMetric(value) !== null && Number(value) > 0)) return null;
  if (sex === 'F' && !(Number(hips) > 0)) return null;
  const circumference = sex === 'F' ? Number(waist) + Number(hips) - Number(neck) : Number(waist) - Number(neck);
  if (circumference <= 0) return null;
  const density = sex === 'F'
    ? 1.29579 - 0.35004 * Math.log10(circumference) + 0.221 * Math.log10(height)
    : 1.0324 - 0.19077 * Math.log10(circumference) + 0.15456 * Math.log10(height);
  const result = 495 / density - 450;
  return Number.isFinite(result) && result > 0 && result < 70 ? result : null;
}
