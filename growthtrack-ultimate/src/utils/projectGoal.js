const DAY_MS = 86_400_000;

// Reject blank values, booleans and coerced objects rather than inventing zeroes.
export function finiteObservation(value) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function observationDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const date = value.slice(0, 10);
  const timestamp = Date.parse(date + 'T00:00:00Z');
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
  if (value.length > 10 && !Number.isFinite(Date.parse(value))) return null;
  return date;
}

// Same-day entries count once; their mean gives each observed day equal weight.
export function normalizeObservations(dataPoints) {
  const grouped = new Map();
  for (const point of Array.isArray(dataPoints) ? dataPoints : []) {
    const date = observationDate(point?.date);
    const value = finiteObservation(point?.value);
    if (!date || value === null) continue;
    const values = grouped.get(date) || [];
    values.push(value);
    grouped.set(date, values);
  }
  return [...grouped].sort(([a], [b]) => a.localeCompare(b)).flatMap(([date, values]) => {
    const value = values.reduce((sum, entry) => sum + entry / values.length, 0);
    return Number.isFinite(value) ? [{ date, value }] : [];
  });
}

/** Linear trend over at least three valid, distinct observation dates. */
export function projectGoal(dataPoints, targetValue) {
  const points = normalizeObservations(dataPoints);
  const target = finiteObservation(targetValue);
  const unavailable = {
    weeksToTarget: null, projectedDate: null, weeklyRate: null,
    dailyRate: null, currentValue: points.at(-1)?.value ?? null,
    latestDate: points.at(-1)?.date ?? null, observationCount: points.length,
    trend: 'insufficient_data',
  };
  if (points.length < 3) return unavailable;
  const firstTime = Date.parse(points[0].date);
  const xs = points.map(point => (Date.parse(point.date) - firstTime) / DAY_MS);
  const mx = xs.reduce((sum, x) => sum + x / xs.length, 0);
  const my = points.reduce((sum, point) => sum + point.value / points.length, 0);
  const numerator = points.reduce((sum, point, i) => sum + (xs[i] - mx) * (point.value - my), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  const dailyRate = numerator / denominator;
  if (!Number.isFinite(dailyRate) || !Number.isFinite(dailyRate * 7)) return unavailable;
  const currentValue = points.at(-1).value;
  const remaining = target === null ? null : target - currentValue;
  const trend = remaining === 0 ? 'at_target' : dailyRate === 0 ? 'stalled'
    : remaining === null ? 'observed_trend' : remaining * dailyRate > 0 ? 'toward_target' : 'away_from_target';
  let weeksToTarget = null;
  let projectedDate = null;
  if (remaining === 0) {
    weeksToTarget = 0;
    projectedDate = points.at(-1).date;
  } else if (trend === 'toward_target') {
    const days = remaining / dailyRate;
    const eta = new Date(Date.parse(points.at(-1).date) + days * DAY_MS);
    if (Number.isFinite(eta.getTime()) && eta.getUTCFullYear() <= 9999) {
      weeksToTarget = days / 7;
      projectedDate = eta.toISOString().slice(0, 10);
    }
  }
  return { ...unavailable, currentValue, dailyRate, weeklyRate: dailyRate * 7, trend, weeksToTarget, projectedDate };
}

export function generateProjectionChartData(dataPoints, targetValue, projectionWeeks = 12) {
  const points = normalizeObservations(dataPoints);
  const model = projectGoal(points, targetValue);
  const result = points.map(point => ({ date: point.date, actual: point.value, projected: null }));
  if (model.dailyRate === null) return result;
  const last = points.at(-1);
  result[result.length - 1].projected = last.value;
  const count = Number.isFinite(projectionWeeks) ? Math.max(0, Math.min(52, Math.floor(projectionWeeks))) : 0;
  for (let week = 1; week <= count; week++) {
    const date = new Date(Date.parse(last.date) + week * 7 * DAY_MS);
    const value = last.value + model.weeklyRate * week;
    if (!Number.isFinite(value) || !Number.isFinite(date.getTime()) || date.getUTCFullYear() > 9999) break;
    result.push({ date: date.toISOString().slice(0, 10), actual: null, projected: value });
  }
  return result;
}
