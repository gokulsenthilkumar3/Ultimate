import { dateLabel } from '../native/format';

const MONTH = { year: 'numeric', month: 'short', timeZone: 'UTC' };

/** Reads a stored date with the certainty it was recorded at: "12 Mar 1950", "Mar 1950", "1950", "c. 1950". */
export function describeDate(date, precision = 'day', approximate = false, empty = 'Unknown date') {
  if (!date || !Number.isFinite(Date.parse(date))) return empty;
  const value = new Date(date);
  const text = precision === 'year' ? String(value.getUTCFullYear()) : precision === 'month' ? value.toLocaleDateString(undefined, MONTH) : dateLabel(date);
  return approximate ? `c. ${text}` : text;
}

/** Year only, for compact labels such as tree nodes. */
export const yearLabel = (date, approximate = false) => (date ? `${approximate ? 'c. ' : ''}${String(date).slice(0, 4)}` : '');

/** One definition of deceased: a death date, or a death recorded without a date. */
export const isDeceased = person => Boolean(person?.deathDate) || person?.deathRecorded === true;

/**
 * Turns form values into the profile payload the API expects. Checkbox values arrive as "on" or not at
 * all; certainty fields are only sent for dates that are actually in the form.
 */
export function dateBody(values) {
  const body = { ...values };
  for (const kind of ['birth', 'death']) {
    if (!(`${kind}Date` in values)) continue;
    body[`${kind}DatePrecision`] = values[`${kind}DatePrecision`] || 'day';
    body[`${kind}DateApproximate`] = values[`${kind}DateApproximate`] === 'on';
  }
  if ('deathDate' in values) body.deathRecorded = values.deathRecorded === 'on';
  return body;
}
