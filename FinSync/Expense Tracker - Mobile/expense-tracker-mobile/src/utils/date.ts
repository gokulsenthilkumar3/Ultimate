import { Frequency } from '../constants/enums';

/** Return next due date given current due date and frequency */
export function getNextDueDate(current: Date, frequency: Frequency): Date {
  const next = new Date(current);
  switch (frequency) {
    case Frequency.DAILY:   next.setDate(next.getDate() + 1);     break;
    case Frequency.WEEKLY:  next.setDate(next.getDate() + 7);     break;
    case Frequency.MONTHLY: next.setMonth(next.getMonth() + 1);   break;
    case Frequency.YEARLY:  next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

/** Format a date to YYYY-MM-DD using LOCAL date parts (avoids UTC off-by-one in UTC+ timezones) */
export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get first and last day of a given month string (YYYY-MM) */
export function getMonthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 0);     // last day of month
  return { start: toISO(start), end: toISO(end) };
}

/** Current month as YYYY-MM */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
