import { localDateKey } from './metricSeries';

export function parseCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return localDateKey(date) === value ? date : null;
}

// Iterate the visible calendar, so a daily series from years ago never drops
// out after an arbitrary occurrence limit. Anchor monthly/yearly recurrences
// to their original date (January 31 must not drift into March 3).
export function expandRecurring(event, viewStart, viewEnd) {
  const start = parseCalendarDate(event.date);
  if (!start) return [];
  const dates = [];
  const current = new Date(viewStart.getFullYear(), viewStart.getMonth(), viewStart.getDate());
  const ordinal = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  for (; current <= viewEnd; current.setDate(current.getDate() + 1)) {
    if (current < start) continue;
    const dayDifference = ordinal(current) - ordinal(start);
    const recurrence = event.recurrence || 'none';
    if ((recurrence === 'none' && dayDifference === 0)
      || recurrence === 'daily'
      || (recurrence === 'weekly' && dayDifference % 7 === 0)
      || (recurrence === 'monthly' && current.getDate() === start.getDate())
      || (recurrence === 'yearly' && current.getMonth() === start.getMonth() && current.getDate() === start.getDate())) {
      dates.push(localDateKey(current));
    }
  }
  return dates;
}

export function validateCalendarEvent(event) {
  if (!String(event.title || '').trim()) return 'Enter an event title.';
  if (!parseCalendarDate(event.date)) return 'Choose a valid start date.';
  if (event.endDate && (!parseCalendarDate(event.endDate) || event.endDate < event.date)) return 'The end date must be on or after the start date.';
  if (!event.allDay) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.startTime || '')) return 'Choose a start time.';
    if (event.endTime && (!event.endDate || event.endDate === event.date) && event.endTime <= event.startTime) return 'The end time must be after the start time.';
  }
  return null;
}

export function buildCalendarExport(events, now = new Date()) {
  const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, match => `\\${match}`);
  const timestamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GrowthTrack//Calendar//EN', 'CALSCALE:GREGORIAN'];
  events.filter(event => parseCalendarDate(event.date)).forEach(event => {
    lines.push('BEGIN:VEVENT', `UID:${escape(event.id)}@growthtrack`, `DTSTAMP:${timestamp(now)}`, `SUMMARY:${escape(event.title)}`);
    if (event.allDay !== false) {
      const end = parseCalendarDate(event.endDate) || parseCalendarDate(event.date);
      end.setDate(end.getDate() + 1); // iCalendar all-day end dates are exclusive.
      lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${localDateKey(end).replace(/-/g, '')}`);
    } else {
      lines.push(`DTSTART:${timestamp(new Date(`${event.date}T${event.startTime || '00:00'}:00`))}`);
      if (event.endTime) lines.push(`DTEND:${timestamp(new Date(`${event.endDate || event.date}T${event.endTime}:00`))}`);
    }
    if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
    if (['daily', 'weekly', 'monthly', 'yearly'].includes(event.recurrence)) lines.push(`RRULE:FREQ=${event.recurrence.toUpperCase()}`);
    lines.push('END:VEVENT');
  });
  return [...lines, 'END:VCALENDAR'].join('\r\n');
}
