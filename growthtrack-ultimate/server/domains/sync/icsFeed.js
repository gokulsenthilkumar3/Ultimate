import { parseICS } from '../../../src/components/calendar/calendarICS.js';

export const MAX_FEED_EVENTS = 500;
const KEEP = new Set(['UID', 'DTSTAMP', 'DTSTART', 'DTEND', 'SUMMARY', 'DESCRIPTION', 'LOCATION', 'RRULE']);
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY = 86_400_000;

function propertyName(line) {
  return line.slice(0, line.search(/[;:]/)).toUpperCase();
}

function dateKeyOf(value) {
  const match = String(value || '').match(/(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** Reduce a recurrence rule to the single-frequency form the calendar stores,
    but only when the extra parts are implied by DTSTART. Anything else would
    change which days the event occurs on, so it stays unsupported. */
export function simplifyRule(rule, startKey) {
  const parts = Object.fromEntries(String(rule).split(';').filter(Boolean).map(part => {
    const [key, ...value] = part.split('=');
    return [key.toUpperCase(), value.join('=').toUpperCase()];
  }));
  const start = startKey ? new Date(`${startKey}T00:00:00Z`) : null;
  delete parts.WKST;
  if (parts.INTERVAL === '1') delete parts.INTERVAL;
  if (parts.FREQ === 'WEEKLY' && start && parts.BYDAY === WEEKDAYS[start.getUTCDay()]) delete parts.BYDAY;
  if (parts.FREQ === 'MONTHLY' && start && Number(parts.BYMONTHDAY) === start.getUTCDate()) delete parts.BYMONTHDAY;
  if (parts.FREQ === 'YEARLY' && start && Number(parts.BYMONTH) === start.getUTCMonth() + 1) delete parts.BYMONTH;
  const keys = Object.keys(parts);
  return keys.length === 1 && keys[0] === 'FREQ' ? `FREQ=${parts.FREQ}` : null;
}

/** Read a subscribed calendar feed tolerantly: each VEVENT is validated on its
    own by the same strict parser as manual imports, so one unsupported event
    is reported and skipped instead of rejecting the whole feed. */
export function readCalendarFeed(text, { timeZone = 'UTC', idFor, now = new Date(), pastDays = 30, futureDays = 400 } = {}) {
  if (typeof text !== 'string' || !/BEGIN:VCALENDAR/i.test(text)) throw Object.assign(new Error('The address did not return an iCalendar (.ics) feed.'), { status: 422, code: 'FEED_INVALID' });
  const lines = text.replace(/^\uFEFF/, '').replace(/\r?\n[ \t]/g, '').split(/\r?\n/).filter(Boolean);
  const windowStart = new Date(now.getTime() - pastDays * DAY).toISOString().slice(0, 10);
  const windowEnd = new Date(now.getTime() + futureDays * DAY).toISOString().slice(0, 10);
  const events = []; const skipped = []; let outsideWindow = 0;
  const seen = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].toUpperCase() !== 'BEGIN:VEVENT') continue;
    const block = []; let depth = 0;
    while (++index < lines.length) {
      const upper = lines[index].toUpperCase();
      if (upper.startsWith('BEGIN:')) depth += 1;
      else if (upper.startsWith('END:') && depth) depth -= 1;
      else if (upper === 'END:VEVENT') break;
      else if (!depth) block.push(lines[index]);
    }
    const props = block.filter(line => KEEP.has(propertyName(line)));
    const statusLine = block.find(line => propertyName(line) === 'STATUS');
    const uidLine = props.find(line => propertyName(line) === 'UID');
    const label = (props.find(line => propertyName(line) === 'SUMMARY') || 'SUMMARY:Untitled').replace(/^[^:]*:/, '').slice(0, 80);
    if (/:CANCELLED$/i.test(statusLine || '')) continue;
    if (block.some(line => propertyName(line) === 'RECURRENCE-ID')) { skipped.push({ title: label, reason: 'Changed single occurrence of a repeating event.' }); continue; }
    const startLine = props.find(line => propertyName(line) === 'DTSTART');
    const startKey = dateKeyOf(startLine?.replace(/^[^:]*:/, ''));
    const ruleIndex = props.findIndex(line => propertyName(line) === 'RRULE');
    if (ruleIndex >= 0) {
      const rule = simplifyRule(props[ruleIndex].replace(/^[^:]*:/, ''), startKey);
      if (!rule) { skipped.push({ title: label, reason: 'Repeat rule is more detailed than this calendar can store.' }); continue; }
      props[ruleIndex] = `RRULE:${rule}`;
    } else if (startKey && (startKey < windowStart || startKey > windowEnd)) { outsideWindow += 1; continue; }
    if (!props.some(line => propertyName(line) === 'DTSTAMP')) props.push(`DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`);
    const uid = uidLine?.replace(/^[^:]*:/, '') || '';
    if (seen.has(uid)) { skipped.push({ title: label, reason: 'Repeated event identifier.' }); continue; }
    try {
      const single = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GrowthTrack//Feed//EN', 'BEGIN:VEVENT', ...props, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      const [event] = parseICS(single, { timeZone, idFactory: () => idFor(uid) }).events;
      seen.add(uid);
      events.push(event);
    } catch (error) {
      skipped.push({ title: label, reason: String(error?.message || 'Unsupported event.').slice(0, 160) });
    }
    if (events.length >= MAX_FEED_EVENTS) break;
  }
  return { events, skipped, outsideWindow };
}
