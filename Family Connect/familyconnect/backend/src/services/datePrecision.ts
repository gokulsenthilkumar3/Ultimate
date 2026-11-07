import { FamilyRuleError } from './relationshipRules';

export type Precision = 'day' | 'month' | 'year';
export type DateKind = 'birth' | 'death';
export interface PartialDate { date: Date | string | null | undefined; precision?: Precision | null; approximate?: boolean | null }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The stored value for month and year dates is the first day of the period, in UTC. */
export function startOfPeriod(date: Date, precision: Precision): Date {
  if (precision === 'year') return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  if (precision === 'month') return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return date;
}

/** Human text that never invents precision: "12 Mar 1950", "Mar 1950", "1950", "c. 1950". */
export function describeDate({ date, precision = 'day', approximate = false }: PartialDate, empty = 'Unknown'): string {
  const value = date ? new Date(date) : null;
  if (!value || !Number.isFinite(value.getTime())) return empty;
  const year = String(value.getUTCFullYear());
  const text = precision === 'year' ? year : precision === 'month' ? `${MONTHS[value.getUTCMonth()]} ${year}` : `${value.getUTCDate()} ${MONTHS[value.getUTCMonth()]} ${year}`;
  return approximate ? `c. ${text}` : text;
}

/** Calendar-day equality, or year equality when either side is less precise or approximate. */
export function sameBirth(a: PartialDate, b: PartialDate): boolean {
  if (!a.date || !b.date) return true;
  const first = new Date(a.date), second = new Date(b.date);
  const loose = (value: PartialDate) => (value.precision || 'day') !== 'day' || Boolean(value.approximate);
  if (loose(a) || loose(b)) return first.getUTCFullYear() === second.getUTCFullYear();
  return first.toISOString().slice(0, 10) === second.toISOString().slice(0, 10);
}

/**
 * Turns the date, certainty and "death recorded" fields of a profile payload into stored columns.
 * Rules that keep old and new clients consistent:
 *  - A date sent without certainty is exact; clearing a date resets its certainty.
 *  - Certainty without a date in the same payload is refused (the stored date is not known here).
 *  - A death date implies death, so deathRecorded only means "deceased, date unknown".
 *  - Fields that are not in the payload are left untouched.
 */
export function normalizeProfileDates(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...fields };
  for (const kind of ['birth', 'death'] as DateKind[]) {
    const dateKey = `${kind}Date`, precisionKey = `${kind}DatePrecision`, approximateKey = `${kind}DateApproximate`;
    const touchedCertainty = (precisionKey in fields && fields[precisionKey] !== 'day') || (approximateKey in fields && fields[approximateKey] === true);
    if (!(dateKey in fields)) {
      if (touchedCertainty) throw new FamilyRuleError(400, 'Choose the date together with how certain it is.');
      continue;
    }
    if (!fields[dateKey]) {
      out[dateKey] = null; out[precisionKey] = 'day'; out[approximateKey] = false;
      if (kind === 'death') out.deathRecorded = fields.deathRecorded === true;
      continue;
    }
    const precision: Precision = fields[precisionKey] || 'day';
    out[dateKey] = startOfPeriod(new Date(fields[dateKey]), precision);
    out[precisionKey] = precision; out[approximateKey] = fields[approximateKey] === true;
    if (kind === 'death') out.deathRecorded = false;
  }
  return out;
}

/** One definition of "deceased" for filters, reminders and summaries. */
export const isDeceased = (member: { deathDate?: Date | string | null; deathRecorded?: boolean | null }) => Boolean(member.deathDate) || member.deathRecorded === true;
