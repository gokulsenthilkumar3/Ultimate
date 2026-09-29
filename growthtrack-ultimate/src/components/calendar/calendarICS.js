import { addDays, instantParts, normalizeEvent, parseDateKey, resolveTimeZone, toInstant, validateEvent } from './calendarModel';

export const MAX_ICS_BYTES = 1024 * 1024;
export const MAX_IMPORT_EVENTS = 500;
const bytes = value => new TextEncoder().encode(value).length;
const escapeText = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/[,;]/g, match => `\\${match}`);
function unescapeText(value) {
  if (/\\(?![nN,;\\])/.test(value)) throw new Error('The ICS file contains invalid text escaping.');
  return value.replace(/\\([nN,;\\])/g, (_match, char) => /[nN]/.test(char) ? '\n' : char);
}
export function foldLine(line) {
  const lines = []; let current = '', length = 0;
  for (const char of line) {
    const size = bytes(char);
    if (length + size > 75) { lines.push(current); current = ' '; length = 1; }
    current += char; length += size;
  }
  lines.push(current); return lines.join('\r\n');
}
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Export the reviewed, finite occurrence set. UTC timed instants preserve DST;
    DATE values preserve civil days with an exclusive DTEND. No RRULE is invented. */
export function buildICS(occurrences, now = new Date()) {
  if (!occurrences.length) throw new Error('There are no events in this date range to export.');
  if (!Number.isFinite(now.getTime())) throw new Error('The export timestamp is invalid.');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GrowthTrack//Calendar//EN', 'CALSCALE:GREGORIAN'];
  const uids = new Set();
  for (const occurrence of occurrences) {
    const source = occurrence.source || occurrence;
    const error = validateEvent(source, source.timeZone || 'UTC');
    if (error) throw new Error(`${source.title || 'Event'}: ${error}`);
    const uid = source.recurrence && source.recurrence !== 'none' ? `${source.id}-${occurrence.occurrenceDate}@growthtrack` : source.icsUid || `${source.id}@growthtrack`;
    if (!source.id || /[\r\n]/.test(uid) || uids.has(uid)) throw new Error('Export requires unique event identifiers.');
    uids.add(uid);
    lines.push('BEGIN:VEVENT', `UID:${escapeText(uid)}`, `DTSTAMP:${stamp(now)}`, `SUMMARY:${escapeText(source.title)}`);
    if (source.allDay !== false) {
      const start = occurrence.date, end = occurrence.endDate || start;
      if (!parseDateKey(start) || !parseDateKey(end)) throw new Error('The export contains an invalid date.');
      lines.push(`DTSTART;VALUE=DATE:${start.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(end, 1).replace(/-/g, '')}`);
    } else {
      const start = occurrence.startInstant || toInstant(source.date, source.startTime, source.timeZone);
      const end = occurrence.endInstant || (source.endTime ? toInstant(source.endDate || source.date, source.endTime, source.timeZone) : null);
      if (!Number.isFinite(start.getTime()) || (end && end < start)) throw new Error('The export contains invalid timed endpoints.');
      lines.push(`DTSTART:${stamp(start)}`);
      if (end && end > start) lines.push(`DTEND:${stamp(end)}`);
    }
    if (source.description) lines.push(`DESCRIPTION:${escapeText(source.description)}`);
    if (source.location) lines.push(`LOCATION:${escapeText(source.location)}`);
    lines.push('END:VEVENT');
  }
  const result = [...lines, 'END:VCALENDAR'].map(foldLine).join('\r\n') + '\r\n';
  if (bytes(result) > MAX_ICS_BYTES) throw new Error('The export exceeds 1 MB. Choose a smaller date range.');
  return result;
}
function property(line) {
  let quoted = false, colon = -1;
  for (let index = 0; index < line.length; index++) {
    if (line[index] === '"') quoted = !quoted;
    if (line[index] === ':' && !quoted) { colon = index; break; }
  }
  if (colon < 1 || quoted) throw new Error('The ICS file contains a malformed property.');
  const parts = line.slice(0, colon).match(/(?:[^;"\s]|"[^"]*")+/g) || [];
  const name = parts.shift()?.toUpperCase(), params = {};
  for (const part of parts) {
    const equals = part.indexOf('=');
    if (equals < 1) throw new Error('The ICS file contains malformed parameters.');
    const key = part.slice(0, equals).toUpperCase();
    if (params[key] != null) throw new Error('The ICS file repeats a parameter.');
    params[key] = part.slice(equals + 1).replace(/^"|"$/g, '');
  }
  return { name, params, value: line.slice(colon + 1) };
}
function dateProperty(prop, defaultZone) {
  if (!prop) throw new Error('Each event needs DTSTART.');
  const allDay = prop.params.VALUE === 'DATE';
  if (allDay) {
    if (prop.params.TZID || !/^\d{8}$/.test(prop.value)) throw new Error('Invalid all-day ICS date.');
    const date = `${prop.value.slice(0, 4)}-${prop.value.slice(4, 6)}-${prop.value.slice(6, 8)}`;
    if (!parseDateKey(date)) throw new Error('Invalid all-day ICS date.');
    return { allDay: true, date };
  }
  if (prop.params.VALUE && prop.params.VALUE !== 'DATE-TIME') throw new Error('Unsupported ICS date value type.');
  const match = prop.value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match || match[6] !== '00') throw new Error('Timed ICS events must use valid minute-resolution DATE-TIME values.');
  if (match[7] && prop.params.TZID) throw new Error('UTC dates cannot also specify TZID.');
  const zone = resolveTimeZone(match[7] ? 'UTC' : prop.params.TZID || defaultZone);
  const date = `${match[1]}-${match[2]}-${match[3]}`, time = `${match[4]}:${match[5]}`;
  return { allDay: false, date, time, zone, instant: toInstant(date, time, zone), floating: !match[7] && !prop.params.TZID };
}
function eventFromProperties(properties, zone, idFactory, warnings) {
  const start = dateProperty(properties.DTSTART, zone), end = properties.DTEND ? dateProperty(properties.DTEND, zone) : null;
  if (end && end.allDay !== start.allDay) throw new Error('DTSTART and DTEND must have the same value type.');
  const uid = unescapeText(properties.UID?.value || '');
  if (!uid.trim() || uid.length > 200 || /[\r\n]/.test(uid)) throw new Error('Each imported event needs a valid UID.');
  if (!properties.DTSTAMP || !/^\d{8}T\d{6}Z$/.test(properties.DTSTAMP.value)) throw new Error('Each imported event needs a UTC DTSTAMP.');
  const timestamp = properties.DTSTAMP.value;
  const stampDate = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
  if (!parseDateKey(stampDate) || Number(timestamp.slice(9, 11)) > 23 || Number(timestamp.slice(11, 13)) > 59 || Number(timestamp.slice(13, 15)) > 59) throw new Error('Invalid UTC DTSTAMP.');
  const event = { id: idFactory(), icsUid: uid, title: unescapeText(properties.SUMMARY?.value || ''), date: start.date, allDay: start.allDay, endDate: '', startTime: '', endTime: '', recurrence: 'none', timeZone: start.zone || '', type: 'Event', color: '#6366f1', description: unescapeText(properties.DESCRIPTION?.value || ''), location: unescapeText(properties.LOCATION?.value || '') };
  if (start.allDay) {
    if (end && end.date <= start.date) throw new Error('All-day DTEND must be after DTSTART.');
    if (end) event.endDate = addDays(end.date, -1);
  } else {
    event.startTime = start.time;
    if (end) {
      if (end.instant <= start.instant) throw new Error('Timed DTEND must be after DTSTART.');
      const parts = instantParts(end.instant, start.zone);
      event.endDate = parts.date === event.date ? '' : parts.date; event.endTime = parts.time;
    }
    if (start.floating) warnings.add(`Floating times will use ${zone}.`);
  }
  if (properties.RRULE) {
    const match = properties.RRULE.value.match(/^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)$/i);
    if (!match) throw new Error('This file contains a recurrence rule this calendar cannot preserve. Use a file of individual occurrences.');
    event.recurrence = match[1].toLowerCase();
  }
  const error = validateEvent(event, zone);
  if (error) throw new Error(`${event.title || 'Imported event'}: ${error}`);
  return normalizeEvent(event, zone);
}

/** Strict supported subset, atomic preview: unsupported semantic data fails the
    complete file before confirmation; ignorable metadata is disclosed in warnings. */
export function parseICS(text, { timeZone = 'UTC', idFactory = () => crypto.randomUUID() } = {}) {
  if (typeof text !== 'string' || bytes(text) > MAX_ICS_BYTES) throw new Error('Choose an ICS file up to 1 MB.');
  if (/\r(?!\n)/.test(text) || [...text].some(character => {
    const code = character.codePointAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  })) throw new Error('The ICS file contains invalid control characters.');
  const lines = text.replace(/^\uFEFF/, '').replace(/\r?\n[ \t]/g, '').split(/\r?\n/).filter(Boolean);
  if (lines[0]?.toUpperCase() !== 'BEGIN:VCALENDAR' || lines.at(-1)?.toUpperCase() !== 'END:VCALENDAR') throw new Error('Choose a complete VCALENDAR file.');
  const events = [], warnings = new Set(), uids = new Set();
  let current = null, version = false, prodid = false;
  const zone = resolveTimeZone(timeZone);
  const allowed = new Set(['UID', 'DTSTAMP', 'DTSTART', 'DTEND', 'SUMMARY', 'DESCRIPTION', 'LOCATION', 'RRULE']);
  for (let index = 1; index < lines.length - 1; index++) {
    const prop = property(lines[index]);
    if (prop.name === 'BEGIN' && prop.value === 'VTIMEZONE' && !current) {
      const timezoneLines = []; let depth = 1;
      while (++index < lines.length - 1 && depth) {
        const item = property(lines[index]);
        if (item.name === 'BEGIN') {
          if (!['STANDARD', 'DAYLIGHT'].includes(item.value) || depth !== 1) throw new Error('Unsupported nested ICS component.');
          depth++;
        } else if (item.name === 'END') depth--;
        timezoneLines.push(item);
      }
      index--;
      const tzid = timezoneLines.find(item => item.name === 'TZID')?.value;
      if (depth || !tzid) throw new Error('Invalid VTIMEZONE component.');
      resolveTimeZone(tzid);
      warnings.add('Timezone definitions use the installed IANA timezone rules. Custom timezone rules are not imported.');
      continue;
    }
    if (prop.name === 'BEGIN' && prop.value === 'VEVENT' && !current) { current = {}; continue; }
    if (prop.name === 'END' && prop.value === 'VEVENT' && current) {
      const event = eventFromProperties(current, zone, idFactory, warnings);
      if (uids.has(event.icsUid)) throw new Error('The ICS file repeats an event UID.');
      uids.add(event.icsUid); events.push(event); current = null;
      if (events.length > MAX_IMPORT_EVENTS) throw new Error('Import at most 500 events per file.');
      continue;
    }
    if (['BEGIN', 'END'].includes(prop.name)) throw new Error('Only supported VEVENT calendar components can be imported.');
    if (!current) {
      if (prop.name === 'VERSION') { if (version || prop.value !== '2.0') throw new Error('ICS VERSION must be 2.0.'); version = true; }
      else if (prop.name === 'PRODID') { if (prodid || !prop.value) throw new Error('ICS PRODID is invalid.'); prodid = true; }
      else if (prop.name === 'METHOD' && prop.value !== 'PUBLISH') throw new Error('Invitations and cancellation files cannot be imported as events.');
      else if (prop.name === 'CALSCALE' && prop.value !== 'GREGORIAN') throw new Error('Only Gregorian calendars are supported.');
      else if (!['METHOD', 'CALSCALE'].includes(prop.name)) warnings.add(`Calendar metadata ${prop.name} is not imported.`);
      continue;
    }
    if (!allowed.has(prop.name)) {
      if (['STATUS', 'TRANSP', 'CREATED', 'LAST-MODIFIED', 'SEQUENCE', 'CLASS', 'CATEGORIES'].includes(prop.name) || prop.name.startsWith('X-')) {
        if (prop.name === 'STATUS' && prop.value === 'CANCELLED') throw new Error('Cancelled events cannot be imported as active events.');
        warnings.add(`Event metadata ${prop.name} is not imported.`); continue;
      }
      throw new Error(`The calendar cannot preserve ${prop.name}. Import individual events without this property.`);
    }
    if (current[prop.name]) throw new Error(`The ICS file repeats ${prop.name}.`);
    current[prop.name] = prop;
  }
  if (current || !version || !prodid || !events.length) throw new Error('The file must contain VERSION:2.0, PRODID, and complete valid events.');
  return { events, warnings: [...warnings] };
}
export async function readICSFile(file) {
  if (!file || !/\.ics$/i.test(file.name) || file.size > MAX_ICS_BYTES) throw new Error('Choose an .ics file up to 1 MB.');
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('The ICS file could not be read.')); reader.readAsText(file);
  });
}
export function downloadICS(content) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  try {
    const link = document.createElement('a'); link.href = url; link.download = 'growthtrack-calendar.ics'; document.body.append(link);
    try { link.click(); } finally { link.remove(); }
  } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
}
