import { BODY_METRIC_RANGES, validateBodyMetric } from './bodyMetricContract.js';
import { parseLength, parseMass, stepFor } from './metricEntry.js';

export function parseMetricEntry(key, input, displayUnit = BODY_METRIC_RANGES[key]?.unit) {
  const unit = BODY_METRIC_RANGES[key]?.unit;
  let parsed;
  if (unit === 'cm') parsed = parseLength(input, displayUnit);
  else if (unit === 'kg') parsed = parseMass(input, displayUnit);
  else {
    const text = String(input ?? '').trim().replace(',', '.');
    const suffix = unit === '%' ? '%' : unit === 'deg' ? '(?:deg|°)' : '';
    const match = text.match(new RegExp(`^([+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+))\\s*${suffix ? `(?:${suffix})?` : ''}$`, 'i'));
    parsed = match ? { ok: true, value: Number(match[1]) } : { ok: false, hint: 'Enter a number in the displayed unit.' };
  }
  if (!parsed.ok) return { valid: false, value: null, reason: parsed.hint };
  return validateBodyMetric(key, parsed.value, { allowEmpty: false });
}

export function displayMetricValue(value, unit) {
  if (value == null || value === '') return '';
  const converted = unit === 'in' ? Number(value) / 2.54 : unit === 'lb' ? Number(value) / 0.45359237 : Number(value);
  return Number.isFinite(converted) ? String(Number(converted.toFixed(2))) : '';
}

// Returns a new draft only. Enter/blur commits, Escape can still cancel.
export function stepMetricEntry(key, draft, unit, event) {
  const direction = { ArrowUp: 1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[event.key];
  if (!direction) return null;
  const parsed = parseMetricEntry(key, draft, unit);
  if (!parsed.valid) return null;
  const next = Number(displayMetricValue(parsed.value, unit)) + direction * stepFor(unit, event.shiftKey);
  const text = String(Number(next.toFixed(4)));
  return parseMetricEntry(key, text, unit).valid ? text : null;
}
