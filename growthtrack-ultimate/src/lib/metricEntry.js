// The logic behind a friendly measurement field: forgiving parsing of what people type, gentle range feedback that does
// not block, and progress toward a goal shown as a number as well as a bar. Pure functions; the React field uses them.
//
//   parseLength("5'10")   -> { ok: true, value: 177.8, unit: 'in' }      (value in the app's storage unit, centimetres)
//   parseMass("11 st 9")  -> { ok: true, value: 74.8 ... }               (kilograms)
//   rangeStatus(130, { hard: [40, 250], typical: [65, 110] }) -> { level: 'check', message: 'Above the usual range ...' }
//   progressToward({ baseline: 92, current: 88, goal: 82 }) -> { percent: 40, label: '40% there · 6 cm to go', ... }

const IN_CM = 2.54; const FT_CM = 30.48; const LB_KG = 0.45359237; const ST_KG = 6.35029318;

const normalise = (text) => String(text ?? '').trim().toLowerCase().replace(/[‘’′`´]/g, "'").replace(/[“”″]/g, '"').replace(/,(?=\d)/g, '.').replace(/\s+/g, ' ');
const num = '(\\d+(?:\\.\\d+)?|\\.\\d+)';

function fail(hint) { return { ok: false, value: null, unit: null, hint }; }

/** Parse a length into centimetres. A bare number uses `defaultUnit` ('cm' or 'in'). */
export function parseLength(input, defaultUnit = 'cm') {
  const t = normalise(input);
  if (!t) return fail('Enter a length.');
  let m = t.match(new RegExp(`^${num}\\s*(?:'|ft|feet|foot)\\s*${num}?\\s*(?:"|in|inch|inches)?$`));
  if (m) { const ft = Number(m[1]); const inch = m[2] ? Number(m[2]) : 0; if (inch >= 12 && m[2]) return fail('Inches go from 0 to 11 after the feet.'); return { ok: true, value: round(ft * FT_CM + inch * IN_CM), unit: 'in' }; }
  m = t.match(new RegExp(`^${num}\\s*(cm|mm|m|in|inch|inches|")?$`));
  if (!m) return fail('Try a number like 98.5, or 5\'10 for feet and inches.');
  const n = Number(m[1]); const unit = m[2] ?? defaultUnit;
  if (unit === 'cm') return { ok: true, value: round(n), unit: 'cm' };
  if (unit === 'mm') return { ok: true, value: round(n / 10), unit: 'mm' };
  if (unit === 'm') return { ok: true, value: round(n * 100), unit: 'm' };
  return { ok: true, value: round(n * IN_CM), unit: 'in' };
}

/** Parse a mass into kilograms. A bare number uses `defaultUnit` ('kg' or 'lb'). Stones and pounds ("11 st 9") work. */
export function parseMass(input, defaultUnit = 'kg') {
  const t = normalise(input);
  if (!t) return fail('Enter a weight.');
  let m = t.match(new RegExp(`^${num}\\s*(?:st|stone|stones)\\s*${num}?\\s*(?:lb|lbs|pounds?)?$`));
  if (m) return { ok: true, value: round(Number(m[1]) * ST_KG + (m[2] ? Number(m[2]) * LB_KG : 0)), unit: 'st' };
  m = t.match(new RegExp(`^${num}\\s*(kg|kgs|g|lb|lbs|pounds?)?$`));
  if (!m) return fail('Try a number like 74.5, or 163 lb.');
  const n = Number(m[1]); const unit = m[2] ?? defaultUnit;
  if (unit === 'g') return { ok: true, value: round(n / 1000), unit: 'g' };
  if (/^kg/.test(unit)) return { ok: true, value: round(n), unit: 'kg' };
  return { ok: true, value: round(n * LB_KG), unit: 'lb' };
}

// Preserve unit-conversion precision in storage; round only when displaying.
const round = (v) => Math.round(v * 1e6) / 1e6;

export const cmToIn = (cm) => cm / IN_CM;
export const kgToLb = (kg) => kg / LB_KG;

/** How to show a stored centimetre value in the user's unit. */
export function formatLength(cm, unit = 'cm') {
  if (!Number.isFinite(cm)) return '';
  if (unit === 'cm') return `${trim(cm, 1)} cm`;
  if (unit === 'in') return `${trim(cmToIn(cm), 1)} in`;
  const totalIn = Math.round(cmToIn(cm)); return `${Math.floor(totalIn / 12)}′${totalIn % 12}″`;
}
const trim = (v, digits) => String(Number(v.toFixed(digits)));

/**
 * Feedback for a value. `hard` is the range the app refuses (outside it the value cannot be stored); `typical` is a
 * wider-than-average range outside which we ask "is that right?" without blocking.
 */
export function rangeStatus(value, { hard, typical, unit = 'cm' }) {
  if (!Number.isFinite(value)) return { level: 'invalid', message: 'Enter a number.' };
  if (hard && (value < hard[0] || value > hard[1])) return { level: 'invalid', message: `Enter ${hard[0]} to ${hard[1]} ${unit}.` };
  if (typical && value < typical[0]) return { level: 'check', message: `Below the usual range (${typical[0]} to ${typical[1]} ${unit}). Is that right?` };
  if (typical && value > typical[1]) return { level: 'check', message: `Above the usual range (${typical[0]} to ${typical[1]} ${unit}). Is that right?` };
  return { level: 'ok', message: '' };
}

/**
 * A "you are here" gauge: where a value sits against the typical range. The gauge spans the typical range plus 25% of its
 * width on each side so a value just outside the range is still on the bar.
 */
export function rangeGauge(value, typical) {
  const span = typical[1] - typical[0]; const lo = typical[0] - span * 0.25; const hi = typical[1] + span * 0.25;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  return { position: clamp((value - lo) / (hi - lo)), bandStart: clamp((typical[0] - lo) / (hi - lo)), bandEnd: clamp((typical[1] - lo) / (hi - lo)), zone: value < typical[0] ? 'below' : value > typical[1] ? 'above' : 'within' };
}

/**
 * Progress from a starting value, through the current value, to a goal. Works for goals that go up or down. The percentage
 * matches `calculateGoalProgress` in src/lib/physiqueProfile.js; the label adds what the bar alone cannot say.
 */
export function progressToward({ baseline, current, goal, unit = 'cm', digits = 1 }) {
  if (![baseline, current, goal].every(Number.isFinite)) return { percent: null, label: 'Add a starting value and a goal to see progress.', direction: null, remaining: null, done: false };
  const span = goal - baseline;
  const raw = Math.abs(span) < 0.0001 ? (Math.abs(current - goal) < 0.0001 ? 100 : 0) : ((current - baseline) / span) * 100;
  const percent = Math.max(0, Math.min(100, Math.round(raw)));
  const remaining = goal - current; const direction = Math.abs(span) < 0.0001 ? 'hold' : span > 0 ? 'up' : 'down';
  const done = percent >= 100;
  const moved = raw < 0 ? ' (moving away from the goal)' : '';
  const label = done ? 'Goal reached' : `${percent}% there · ${trim(Math.abs(remaining), digits)} ${unit} to go${moved}`;
  return { percent, label, direction, remaining, done, wrongWay: raw < 0 };
}

/** Step for the +/- buttons and arrow keys. Shift makes it ten times larger. */
export function stepFor(unit, shift = false) {
  const base = { cm: 0.5, in: 0.25, kg: 0.1, lb: 0.2, '%': 0.1, mm: 0.5, level: 1, deg: 0.5, ratio: 0.01 }[unit] ?? 1;
  return shift ? base * 10 : base;
}
