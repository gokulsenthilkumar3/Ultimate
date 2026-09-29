const DAY = 86400000;
export const CALENDAR_VIEWS = Object.freeze(['month', 'week', 'agenda', 'connections']);
export const RECURRENCES = Object.freeze(['none', 'daily', 'weekly', 'monthly', 'yearly']);

export function parseDateKey(value) {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value || '')) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
export function addDays(key, days) {
  const date = parseDateKey(key);
  if (!date) throw new Error('Choose a valid date.');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function dayDistance(from, to) { return (parseDateKey(to) - parseDateKey(from)) / DAY; }
export function addMonths(key, months) {
  const date = parseDateKey(key);
  const day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString().slice(0, 10);
}
export function resolveTimeZone(value, fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
  const raw = String(value || fallback).trim();
  const offset = raw.match(/^UTC([+-])(\d{2}):(\d{2})(?:\s*\([^\r\n]*\))?$/i);
  if (offset) {
    const minutes = Number(offset[2]) * 60 + Number(offset[3]);
    if (Number(offset[2]) > 14 || Number(offset[3]) > 59 || minutes > 14 * 60) throw new Error('Choose a valid timezone offset.');
    return `UTC${offset[1]}${offset[2]}:${offset[3]}`;
  }
  try { return new Intl.DateTimeFormat('en', { timeZone: raw }).resolvedOptions().timeZone; }
  catch { throw new Error(`Timezone “${raw}” is not recognized. Use an IANA name or UTC offset.`); }
}
const formatters = new Map();
function wallParts(instant, zone) {
  const offset = zone.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (offset) {
    const minutes = (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === '-' ? -1 : 1);
    const shifted = new Date(instant.getTime() + minutes * 60000).toISOString();
    return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
  }
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));
  const parts = Object.fromEntries(formatters.get(zone).formatToParts(instant).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
export function instantParts(instant, zone) { return wallParts(new Date(instant), resolveTimeZone(zone)); }
export function todayKey(zone, now = new Date()) { return instantParts(now, zone).date; }

/** Date-only arithmetic never passes through device-local midnight. Ambiguous
    fall-back times select the first occurrence; nonexistent spring times reject. */
export function toInstant(date, time, timeZone) {
  if (!parseDateKey(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) throw new Error('Choose a valid date and time.');
  const zone = resolveTimeZone(timeZone);
  const naive = Date.parse(`${date}T${time}:00Z`);
  const fixed = zone.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (fixed) return new Date(naive - (Number(fixed[2]) * 60 + Number(fixed[3])) * (fixed[1] === '-' ? -1 : 1) * 60000);
  const offsets = new Set([-36, -24, -6, 0, 6, 24, 36].map(hours => {
    const sample = naive + hours * 3600000;
    const parts = wallParts(new Date(sample), zone);
    return Date.parse(`${parts.date}T${parts.time}:00Z`) - sample;
  }));
  const candidates = [...offsets].map(offset => new Date(naive - offset)).filter(candidate => {
    const parts = wallParts(candidate, zone);
    return parts.date === date && parts.time === time;
  }).sort((a, b) => a - b);
  if (!candidates.length) throw new Error('This local time does not exist because the timezone clock changes. Choose another time.');
  return candidates[0];
}
export function dateLabel(key, locale = 'en', options = {}) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', ...options }).format(parseDateKey(key));
}
export function calendarRange(anchor, view) {
  const date = parseDateKey(anchor);
  if (view === 'week') {
    const start = addDays(anchor, -((date.getUTCDay() + 6) % 7));
    return { start, end: addDays(start, 6), days: Array.from({ length: 7 }, (_, i) => addDays(start, i)) };
  }
  if (view === 'agenda') return { start: anchor, end: addDays(anchor, 29), days: Array.from({ length: 30 }, (_, i) => addDays(anchor, i)) };
  const start = `${anchor.slice(0, 7)}-01`, end = addDays(addMonths(start, 1), -1);
  const gridStart = addDays(start, -((parseDateKey(start).getUTCDay() + 6) % 7));
  const count = Math.ceil((dayDistance(gridStart, end) + 1) / 7) * 7;
  return { start, end, days: Array.from({ length: count }, (_, i) => addDays(gridStart, i)) };
}
export function calendarView(explicit, width) {
  return CALENDAR_VIEWS.includes(explicit) ? explicit : explicit === 'list' ? 'agenda' : width != null && width < 720 ? 'agenda' : 'month';
}
export function normalizeEvent(event, defaultZone = 'UTC') {
  return { ...event, title: String(event.title || '').trim(), allDay: event.allDay !== false, recurrence: event.recurrence || 'none', timeZone: event.allDay !== false ? '' : resolveTimeZone(event.timeZone || defaultZone), color: /^#[\da-f]{6}$/i.test(event.color || '') ? event.color : '#6366f1' };
}
export function validateEvent(event, defaultZone = 'UTC') {
  if (!String(event.title || '').trim()) return 'Enter an event title.';
  if (String(event.title).length > 200) return 'Keep the event title within 200 characters.';
  if (!parseDateKey(event.date)) return 'Choose a valid start date.';
  if (event.endDate && (!parseDateKey(event.endDate) || event.endDate < event.date)) return 'The end date must be on or after the start date.';
  if (event.endDate && dayDistance(event.date, event.endDate) > 366) return 'An event can span at most 366 days.';
  if (!RECURRENCES.includes(event.recurrence || 'none')) return 'Choose a supported recurrence.';
  if (String(event.description || '').length > 10000 || String(event.location || '').length > 1000) return 'The description or location is too long.';
  if (event.allDay === false) {
    try {
      const start = toInstant(event.date, event.startTime, event.timeZone || defaultZone);
      if (event.endTime && toInstant(event.endDate || event.date, event.endTime, event.timeZone || defaultZone) <= start) return 'The end time must be after the start time.';
      if (event.endDate && !event.endTime) return 'Choose an end time for a timed event with an end date.';
    } catch (error) { return error.message; }
  }
  return null;
}
function recursOn(event, key) {
  if (key < event.date) return false;
  const original = parseDateKey(event.date), date = parseDateKey(key);
  return event.recurrence === 'none' ? key === event.date : event.recurrence === 'daily' ? true : event.recurrence === 'weekly' ? dayDistance(event.date, key) % 7 === 0 : event.recurrence === 'monthly' ? date.getUTCDate() === original.getUTCDate() : date.getUTCDate() === original.getUTCDate() && date.getUTCMonth() === original.getUTCMonth();
}
/** Occurrences retain their source record and true endpoints. Multi-day events
    occupy every covered day; timezone conversion happens before range filtering. */
export function occurrencesInRange(events, start, end, zone) {
  if (!parseDateKey(start) || !parseDateKey(end) || dayDistance(start, end) > 366 || end < start) throw new Error('Choose a range of at most 366 days.');
  const occurrences = [];
  for (const raw of events) {
    if (validateEvent(raw, zone)) continue;
    const event = normalizeEvent(raw, zone), duration = dayDistance(event.date, event.endDate || event.date);
    for (let key = addDays(start, -duration - 2); key <= addDays(end, 2); key = addDays(key, 1)) {
      if (!recursOn(event, key)) continue;
      const sourceEnd = addDays(key, duration);
      let displayStart = { date: key, time: '' }, displayEnd = { date: sourceEnd, time: '' }, startInstant, endInstant;
      if (!event.allDay) {
        try {
          startInstant = toInstant(key, event.startTime, event.timeZone);
          endInstant = event.endTime ? toInstant(sourceEnd, event.endTime, event.timeZone) : startInstant;
          displayStart = instantParts(startInstant, zone); displayEnd = instantParts(endInstant, zone);
        } catch { continue; } // A recurring wall time can fall in a future DST gap.
      }
      // A timed endpoint at midnight is exclusive; all-day stored endDate is inclusive.
      const coveredEnd = !event.allDay && displayEnd.time === '00:00' && endInstant > startInstant ? addDays(displayEnd.date, -1) : displayEnd.date;
      if (displayStart.date > end || coveredEnd < start) continue;
      occurrences.push({ ...event, source: raw, occurrenceDate: key, occurrenceId: `${event.id}:${key}`, date: displayStart.date, endDate: displayEnd.date, startTime: displayStart.time, endTime: displayEnd.time, coveredEnd, startInstant, endInstant });
    }
  }
  return occurrences.sort((a, b) => a.date.localeCompare(b.date) || Number(b.allDay) - Number(a.allDay) || a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title));
}
export function occurrencesOnDay(occurrences, key) { return occurrences.filter(event => event.date <= key && event.coveredEnd >= key); }

export function eventFingerprint(event) {
  return JSON.stringify(['title', 'date', 'endDate', 'startTime', 'endTime', 'allDay', 'recurrence', 'timeZone', 'type', 'description', 'location', 'color', 'icsUid'].map(key => event[key] ?? ''));
}
export function applyMutation(previous, operation) {
  const events = Array.isArray(previous) ? previous : [];
  if (operation.kind === 'create') {
    if (events.some(event => event.id === operation.event.id)) throw new Error('This event already exists. Refresh before retrying.');
    return [...events, operation.event];
  }
  if (operation.kind === 'import') {
    const ids = new Set(events.map(event => event.icsUid || `${event.id}@growthtrack`));
    const additions = operation.events.filter(event => !ids.has(event.icsUid));
    if (!additions.length) throw new Error('All imported events already exist. Nothing was added.');
    return [...events, ...additions];
  }
  const current = events.find(event => event.id === operation.original.id);
  if (!current || eventFingerprint(current) !== eventFingerprint(operation.original)) throw new Error('This event changed while you were editing. Close the form and reopen the latest event.');
  return operation.kind === 'delete' ? events.filter(event => event.id !== current.id) : events.map(event => event.id === current.id ? { ...current, ...operation.event } : event);
}
function sessionKey(state) { return JSON.stringify([state.user?.id ?? state.user?.email, state._sessionVersion, state._dataRevision]); }
/** Delayed store writes need no UI optimism. On a malformed acknowledgement,
    conditionally undo only our exact calendar snapshot, never newer/account data. */
export async function persistMutation(operation, { update, getState, setState }) {
  const session = sessionKey(getState());
  let before, attempted;
  try {
    const response = await update(previous => {
      if (sessionKey(getState()) !== session) throw new Error('The session changed. Refresh the calendar.');
      before = previous; attempted = applyMutation(previous, operation); return attempted;
    });
    if (!response || response.id == null || response.id === '') throw new Error('The server did not acknowledge the calendar change. Your draft is still here.');
    if (sessionKey(getState()) !== session) throw new Error('The session changed. Refresh the calendar.');
    return response;
  } catch (error) {
    if (attempted && sessionKey(getState()) === session && getState().calendar_events === attempted) {
      setState(state => state.calendar_events === attempted && sessionKey(state) === session ? { calendar_events: before, user: state.user ? { ...state.user, calendar_events: before } : state.user } : {});
    }
    throw error;
  }
}
