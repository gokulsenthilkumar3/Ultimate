const ALIASES = { body_fat: 'bodyFat', heart_rate: 'hr', hydration: 'water', sleep_hours: 'sleep' };

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function finiteMetric(value) {
  if (value == null || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Accept wide check-ins and older { type, value } records without inventing zeroes.
export function metricValue(log, key) {
  const direct = finiteMetric(log?.[key]);
  if (direct !== null) return direct;
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (canonical === key && finiteMetric(log?.[alias]) !== null) return finiteMetric(log[alias]);
  }
  const type = String(log?.type || log?.metric || '').toLowerCase();
  return (ALIASES[type] || type).toLowerCase() === key.toLowerCase() ? finiteMetric(log?.value) : null;
}

export function datedLogs(logs) {
  return (Array.isArray(logs) ? logs : []).filter(log => typeof log?.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(log.date) && Number.isFinite(Date.parse(log.date)))
    .slice().sort((a, b) => a.date.localeCompare(b.date));
}

export function metricSeries(logs, key) {
  return datedLogs(logs).flatMap(log => {
    const value = metricValue(log, key);
    return value === null ? [] : [{ date: log.date.slice(0, 10), value }];
  });
}

export function latestMetrics(logs, keys) {
  return Object.fromEntries(keys.map(key => {
    const series = metricSeries(logs, key);
    return [key, series.at(-1)?.value ?? null];
  }));
}

export function metricDelta(logs, key, days = 30) {
  const series = metricSeries(logs, key);
  if (series.length < 2) return null;
  const latest = series.at(-1);
  const cutoff = new Date(`${latest.date}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - days);
  const baseline = series.filter(point => point.date <= localDateKey(cutoff)).at(-1) || series[0];
  if (baseline.date === latest.date) return null;
  return Number((latest.value - baseline.value).toFixed(1));
}

export function groupMetricByDate(logs, key) {
  const groups = {};
  for (const point of metricSeries(logs, key)) (groups[point.date] ||= []).push(point.value);
  return groups;
}

// Today's incomplete habit preserves yesterday's streak; an older gap breaks it.
export function currentStreak(logs = [], now = new Date()) {
  const dates = new Set(datedLogs(logs).filter(log => log.completed !== false && log.done !== false).map(log => log.date.slice(0, 10)));
  const day = new Date(now); day.setHours(12, 0, 0, 0);
  if (!dates.has(localDateKey(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (streak < dates.size && dates.has(localDateKey(day))) {
    streak += 1; day.setDate(day.getDate() - 1);
  }
  return streak;
}
