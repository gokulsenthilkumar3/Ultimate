import { SAMPLE_DATE } from './chartModel';
import { FAMILY_EVENTS } from './familyModel';
const dateOf = iso => new Date(`${iso}T00:00:00Z`);
export const isoDate = date => date.toISOString().slice(0, 10);
export function addDays(iso, amount) { const date = dateOf(iso); date.setUTCDate(date.getUTCDate() + amount); return isoDate(date); }
export function mondayOf(iso) { return addDays(iso, -((dateOf(iso).getUTCDay() + 6) % 7)); }
export function moveCalendar(iso, view, direction) {
  if (view === 'week') return addDays(iso, direction * 7);
  const date = dateOf(iso); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + direction); return isoDate(date);
}
export function calendarDays(iso = SAMPLE_DATE, view = 'month') {
  if (view === 'week') return Array.from({ length: 7 }, (_, i) => addDays(mondayOf(iso), i));
  const first = `${iso.slice(0, 7)}-01`;
  const last = dateOf(first); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
  const cells = Math.ceil((((dateOf(first).getUTCDay() + 6) % 7) + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => addDays(mondayOf(first), i));
}
export function formatDate(iso, options = {}) { return dateOf(iso).toLocaleDateString('en-GB', { timeZone: 'UTC', ...options }); }
export function calendarTitle(iso, view) {
  if (view !== 'week') return formatDate(iso, { month: 'long', year: 'numeric' });
  const days = calendarDays(iso, 'week');
  return `${formatDate(days[0], { day: 'numeric', month: 'short' })} – ${formatDate(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
export const SAMPLE_EVENTS = Object.freeze([
  { id: 'event-review', title: 'Weekly review', date: '2026-10-28', notes: 'Work and personal progress · 4:00 PM' },
  ...FAMILY_EVENTS,
]);
