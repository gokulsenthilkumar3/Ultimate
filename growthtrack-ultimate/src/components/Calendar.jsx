import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Plus, Upload } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { featurePath } from '../config/featureRegistry';
import { getUserLocale } from '../utils/userFormatters';
import Button from './ui/Button';
import TextField from './ui/TextField';
import SelectField from './ui/SelectField';
import Modal from './ui/Modal';
import PageState from './ui/PageState';
import PageTemplate from './ui/PageTemplate';
import FormError from './ui/FormError';
import FileUploader from './ui/FileUploader';
import ConnectionCard from './ui/ConnectionCard';
import useCalendarWidth from './calendar/useCalendarWidth';
import { addDays, addMonths, CALENDAR_VIEWS, calendarRange, calendarView, dateLabel, normalizeEvent, occurrencesInRange, occurrencesOnDay, parseDateKey, persistMutation, RECURRENCES, resolveTimeZone, todayKey, validateEvent } from './calendar/calendarModel';
import { buildICS, downloadICS, MAX_ICS_BYTES, parseICS, readICSFile } from './calendar/calendarICS';

const EMPTY_EVENTS = Object.freeze([]);
const EVENT_TYPES = ['Event', 'Meeting', 'Reminder', 'Task', 'Birthday', 'Holiday', 'Personal', 'Work'];
const VIEW_LABELS = { month: 'Month', week: 'Week', agenda: 'Agenda', connections: 'Connections' };
const style = `
.gt-calendar{container:gt-calendar / inline-size;min-width:0}
.gt-calendar :is(button,input,select,textarea){min-height:44px}
.gt-calendar :is(button,a){touch-action:manipulation}
.gt-calendar :is(h2,h3,p,span,label){overflow-wrap:anywhere}
.gt-calendar a[aria-current=page]{font-weight:700;text-decoration:underline}
.gt-calendar-views,.gt-calendar-period,.gt-calendar-actions{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem}
.gt-calendar-views a{display:inline-flex;align-items:center;min-height:44px;padding:.5rem .75rem;border:1px solid var(--gt-border,#ccc);border-radius:.5rem;color:var(--gt-text,inherit)}
.gt-calendar-period h2{font-size:1rem;flex:1;margin:0}
.gt-calendar-month-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(14rem,20rem);gap:1rem}
.gt-calendar-month-scroll{overflow:auto;max-width:100%;padding:.25rem}
.gt-calendar-month{width:100%;min-width:24rem;table-layout:fixed;border-spacing:.2rem}
.gt-calendar-month th{font-size:.8rem;padding:.5rem 0}
.gt-calendar-month td{padding:0;vertical-align:top}
.gt-calendar-day{display:block;min-width:44px;width:100%;min-height:6rem!important;padding:.5rem;border:1px solid var(--gt-border,#ccc);border-radius:.5rem;background:var(--gt-surface,#fff);color:var(--gt-text,#202124);text-align:start}
.gt-calendar-day[aria-pressed=true]{outline:2px solid var(--gt-action,#5c67e8);outline-offset:-2px}
.gt-calendar-day[data-outside=true]{background:var(--gt-surface-raised,#eee)}
.gt-calendar-preview{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.75rem;margin-top:.3rem}
.gt-calendar-week{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(13rem,100%),1fr));gap:.75rem}
.gt-calendar-day-section,.gt-calendar-selected-day{min-width:0;padding:.75rem;border:1px solid var(--gt-border,#ccc);border-radius:.75rem;background:var(--gt-surface,#fff)}
.gt-calendar-day-section>h2,.gt-calendar-selected-day>h2{font-size:1rem;margin-block:0 .75rem}
.gt-calendar-event-list{list-style:none;padding:0;margin:0;display:grid;gap:.75rem}
.gt-calendar-event{min-width:0;padding:.75rem;border:1px solid var(--gt-border,#ccc);border-inline-start:3px solid var(--calendar-event-color,var(--gt-action,#5c67e8));border-radius:.5rem}
.gt-calendar-event h3{font-size:1rem;margin:0}
.gt-calendar-event p{margin-block:.35rem;font-size:.875rem}
.gt-calendar-event .gt-calendar-actions{margin-top:.5rem}
.gt-calendar-form{display:grid;gap:1rem}
.gt-calendar-form-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(14rem,100%),1fr));gap:.75rem}
.gt-calendar-form textarea{width:100%;min-height:6rem}
.gt-calendar-form fieldset{min-width:0;padding:0;border:0}
.gt-calendar-form .gt-calendar-check{display:flex;align-items:center;gap:.5rem;min-height:44px}
.gt-calendar-check input{min-width:44px;accent-color:var(--gt-action)}
.gt-calendar-connections{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(17rem,100%),1fr));gap:1rem}
@container gt-calendar (max-width:850px){.gt-calendar-month-layout{grid-template-columns:minmax(0,1fr)}}
@media(forced-colors:active){.gt-calendar-event{border-color:CanvasText}.gt-calendar-day[aria-pressed=true]{outline-color:Highlight}.gt-calendar-views a[aria-current=page]{outline:2px solid Highlight}}
`;

function blankEvent(date, zone) {
  return { id: crypto.randomUUID(), title: '', date, endDate: '', allDay: true, startTime: '', endTime: '', timeZone: zone, recurrence: 'none', type: 'Event', color: '#6366f1', description: '', location: '' };
}
function EventForm({ editor, onChange, onSubmit, onCancel, busy, id }) {
  const form = editor.form;
  const field = name => ({ value: form[name] || '', onChange: event => onChange({ ...form, [name]: event.target.value }) });
  return <form className="gt-calendar-form" onSubmit={onSubmit} noValidate aria-describedby={editor.error ? `${id}-error` : undefined}>
    <fieldset disabled={busy}><div className="gt-calendar-form-fields">
      <TextField data-dialog-autofocus label="Event title" required maxLength={200} {...field('title')} />
      <TextField label="Start date" type="date" required {...field('date')} />
      <TextField label="End date" type="date" hint="All-day end dates are inclusive." {...field('endDate')} />
      <label className="gt-calendar-check"><input type="checkbox" checked={form.allDay} onChange={event => onChange({ ...form, allDay: event.target.checked })} />All day event</label>
      {!form.allDay && <>
        <TextField label="Start time" type="time" required {...field('startTime')} />
        <TextField label="End time" type="time" {...field('endTime')} />
        <TextField label="Event timezone" required hint="IANA name (e.g. Asia/Kolkata) or UTC+05:30. Repeated clock times use the first occurrence." {...field('timeZone')} />
      </>}
      <SelectField label="Event type" options={EVENT_TYPES.map(value => ({ value, label: value }))} {...field('type')} />
      <SelectField label="Recurrence" options={RECURRENCES.map(value => ({ value, label: value === 'none' ? 'Does not repeat' : value[0].toUpperCase() + value.slice(1) }))} {...field('recurrence')} />
      <TextField label="Location" maxLength={1000} {...field('location')} />
      <TextField label="Event color" type="color" {...field('color')} />
      <label htmlFor={`${id}-description`}>Description<textarea id={`${id}-description`} maxLength={10000} {...field('description')} /></label>
    </div></fieldset>
    {editor.original?.recurrence && editor.original.recurrence !== 'none' && <p>Editing changes the complete recurring series.</p>}
    <FormError id={`${id}-error`}>{editor.error}</FormError>
    <div className="gt-calendar-actions"><Button variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" loading={busy} loadingLabel="Saving event…">Save event</Button></div>
  </form>;
}
function EventList({ items, day, locale, zone, onEdit, onDelete, busy }) {
  if (!items.length) return <p>No events.</p>;
  return <ul className="gt-calendar-event-list">{items.map(event => <li key={event.occurrenceId}>
    <article className="gt-calendar-event" style={{ '--calendar-event-color': event.color }}>
      <h3>{event.title}</h3>
      <p><time dateTime={event.date}>{dateLabel(event.date, locale)}</time>{event.coveredEnd > event.date && <> – <time dateTime={event.coveredEnd}>{dateLabel(event.coveredEnd, locale)}</time></>}</p>
      <p>{event.allDay ? 'All day' : `${event.startTime}${event.endTime ? ' – ' + event.endTime : ''} · ${zone}`}{event.date < day ? ' · Continues' : ''}</p>
      {event.recurrence !== 'none' && <p>Repeats {event.recurrence}</p>}
      {event.location && <p>Location: {event.location}</p>}{event.description && <p>{event.description}</p>}
      <div className="gt-calendar-actions">
        <Button variant="secondary" disabled={busy} aria-label={`Edit ${event.title}, ${event.date}`} onClick={() => onEdit(event.source)}>Edit{event.recurrence !== 'none' ? ' series' : ''}</Button>
        <Button variant="danger" disabled={busy} aria-label={`Delete ${event.title}, ${event.date}`} onClick={() => onDelete(event.source)}>Delete{event.recurrence !== 'none' ? ' series' : ''}</Button>
      </div>
    </article>
  </li>)}</ul>;
}

export default function Calendar() {
  const user = useStore(state => state.user);
  const events = useStore(state => state.calendar_events ?? EMPTY_EVENTS);
  const updateCalendarEvents = useStore(state => state.updateCalendarEvents);
  const toast = useToast(), location = useLocation(), navigate = useNavigate();
  const root = useRef(null), width = useCalendarWidth(root), id = useId();
  const timezone = useMemo(() => {
    try { return { zone: resolveTimeZone(user?.timezone), error: '' }; }
    catch (error) { return { zone: 'UTC', error: `${error.message} The calendar is displaying UTC.` }; }
  }, [user?.timezone]);
  const zone = timezone.zone, locale = getUserLocale(user);
  const [clock, setClock] = useState(() => new Date());
  const today = todayKey(zone, clock);
  const [anchor, setAnchor] = useState(() => today);
  const [selectedDay, setSelectedDay] = useState(() => today);
  const [editor, setEditor] = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [busy, setBusy] = useState(false);
  const operationBusy = useRef(false);
  const explicit = new URLSearchParams(location.search).get('view');
  const view = calendarView(explicit, width);
  const range = useMemo(() => calendarRange(anchor, view), [anchor, view]);
  const occurrenceStart = range.days[0], occurrenceEnd = range.days.at(-1);
  const occurrences = useMemo(() => occurrencesInRange(events, occurrenceStart, occurrenceEnd, zone), [events, occurrenceStart, occurrenceEnd, zone]);
  const invalidEvents = useMemo(() => events.filter(event => validateEvent(event, zone)), [events, zone]);
  const [pageError, setPageError] = useState('');
  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 60000); return () => clearInterval(timer); }, []);
  const viewHref = value => {
    const params = new URLSearchParams(location.search); params.set('view', value);
    return `${featurePath('calendar')}?${params}`;
  };
  useEffect(() => {
    if (explicit && !CALENDAR_VIEWS.includes(explicit) && width != null) {
      const params = new URLSearchParams(location.search); params.set('view', view);
      navigate(`${featurePath('calendar')}?${params}`, { replace: true });
    }
  }, [explicit, location.search, navigate, view, width]);

  const startNew = date => { if (!operationBusy.current) setEditor({ original: null, form: blankEvent(date, zone), error: '' }); };
  const startEdit = original => { if (!operationBusy.current) setEditor({ original: { ...original }, form: { ...blankEvent(original.date || today, zone), ...original, allDay: original.allDay !== false, timeZone: original.timeZone || zone }, error: '' }); };
  const closeEditor = () => { if (!operationBusy.current) setEditor(null); };
  const closeTransfer = () => { if (!operationBusy.current) setTransfer(null); };
  const persist = operation => persistMutation(operation, { update: updateCalendarEvents, getState: useStore.getState, setState: useStore.setState });
  const submitEvent = async event => {
    event.preventDefault();
    if (operationBusy.current) return;
    const error = validateEvent(editor.form, zone);
    if (error) { setEditor(previous => ({ ...previous, error })); return; }
    operationBusy.current = true; setBusy(true);
    try {
      await persist({ kind: editor.original ? 'update' : 'create', original: editor.original, event: normalizeEvent(editor.form, zone) });
      setEditor(null); toast.success(editor.original ? 'Event updated.' : 'Event added.');
    } catch (error) { setEditor(previous => previous && ({ ...previous, error: `${error.message} Your form is still here.` })); }
    finally { operationBusy.current = false; setBusy(false); }
  };
  const prepareImport = async files => {
    const preview = parseICS(await readICSFile(files[0]), { timeZone: zone });
    const existing = new Set(events.map(event => event.icsUid || `${event.id}@growthtrack`));
    const additions = preview.events.filter(event => !existing.has(event.icsUid));
    if (!additions.length) throw new Error('All events in this file already exist. Nothing to import.');
    setTransfer({ kind: 'import', events: additions, warnings: preview.warnings, duplicateCount: preview.events.length - additions.length, error: '', fileName: files[0].name });
  };
  const prepareExport = () => {
    setPageError('');
    try {
      if (invalidEvents.length) throw new Error('Correct invalid saved events before exporting.');
      const selected = occurrences.filter(event => event.date <= range.end && event.coveredEnd >= range.start);
      setTransfer({ kind: 'export', content: buildICS(selected), count: selected.length, start: range.start, end: range.end, error: '' });
    } catch (error) { setPageError(error.message); }
  };
  const confirmTransfer = async () => {
    if (operationBusy.current) return;
    operationBusy.current = true; setBusy(true);
    try {
      if (transfer.kind === 'export') { downloadICS(transfer.content); toast.info('Calendar download requested.'); }
      else {
        await persist(transfer.kind === 'delete' ? { kind: 'delete', original: transfer.original } : { kind: 'import', events: transfer.events });
        toast.success(transfer.kind === 'delete' ? 'Event deleted.' : 'Calendar import acknowledged.');
      }
      setTransfer(null);
    } catch (error) { setTransfer(previous => ({ ...previous, error: error.message })); }
    finally { operationBusy.current = false; setBusy(false); }
  };
  const requestDelete = original => setTransfer({ kind: 'delete', original: { ...original }, error: '' });
  const movePeriod = direction => {
    setAnchor(previous => view === 'month' ? addMonths(previous, direction) : addDays(previous, direction * (view === 'week' ? 7 : 30)));
  };
  const periodLabel = view === 'month' ? dateLabel(range.start, locale, { day: undefined }) : `${dateLabel(range.start, locale)} – ${dateLabel(range.end, locale)}`;
  const eventList = day => <EventList items={occurrencesOnDay(occurrences, day)} day={day} locale={locale} zone={zone} onEdit={startEdit} onDelete={requestDelete} busy={busy} />;
  const dayHeading = day => dateLabel(day, locale, { weekday: 'long' });
  const activeDay = range.days.includes(selectedDay) ? selectedDay : range.start;
  const dayKeyDown = (event, day) => {
    const index = range.days.indexOf(day), dow = (parseDateKey(day).getUTCDay() + 6) % 7;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const delta = event.key === 'ArrowDown' ? 7 : event.key === 'ArrowUp' ? -7 : event.key === 'ArrowRight' ? rtl ? -1 : 1 : event.key === 'ArrowLeft' ? rtl ? 1 : -1 : event.key === 'Home' ? -dow : event.key === 'End' ? 6 - dow : null;
    if (delta == null || !range.days[index + delta]) return;
    event.preventDefault(); const next = range.days[index + delta]; setSelectedDay(next); document.getElementById(`${id}-day-${next}`)?.focus();
  };
  const confirmTitle = transfer?.kind === 'delete' ? 'Confirm event deletion' : transfer?.kind === 'export' ? 'Confirm calendar export' : 'Confirm calendar import';

  return <section className="gt-calendar" ref={root} data-responsive-foundation data-calendar-view={view}>
    <style>{style}</style>
    <PageTemplate type="record" title="Calendar" accent="Workspace" subtitle={`${events.length} saved events · Display timezone: ${zone}`} actions={<>
      <Button variant="secondary" disabled={busy} icon={<Upload size={18} />} onClick={() => setTransfer({ kind: 'select' })}>Import .ics</Button>
      <Button variant="secondary" disabled={busy} icon={<Download size={18} />} onClick={prepareExport}>Export .ics</Button>
      <Button disabled={busy} icon={<Plus size={18} />} onClick={() => startNew(selectedDay || today)}>Add event</Button>
    </>} toolbar={<nav className="gt-calendar-views" aria-label="Calendar views">{CALENDAR_VIEWS.map(value => <Link key={value} to={viewHref(value)} aria-current={view === value ? 'page' : undefined}>{VIEW_LABELS[value]}</Link>)}</nav>}>
      <FormError>{timezone.error || pageError}</FormError>
      {invalidEvents.length > 0 && <section aria-label="Invalid saved events"><p role="alert">{invalidEvents.length} saved event(s) need correction before display or export.</p>{invalidEvents.map(event => <Button key={event.id} variant="secondary" disabled={busy} onClick={() => startEdit(event)}>Correct {event.title || 'untitled event'}</Button>)}</section>}
      {view !== 'connections' && <div className="gt-calendar-period">
        <Button variant="secondary" aria-label={`Previous ${view === 'agenda' ? '30 days' : view}`} onClick={() => movePeriod(-1)} icon={<ChevronLeft size={18} />} />
        <h2 aria-live="polite">{periodLabel}</h2>
        <Button variant="secondary" aria-label={`Next ${view === 'agenda' ? '30 days' : view}`} onClick={() => movePeriod(1)} icon={<ChevronRight size={18} />} />
        <Button variant="secondary" onClick={() => { setAnchor(today); setSelectedDay(today); }}>Today</Button>
      </div>}
      {view === 'month' && <div className="gt-calendar-month-layout">
        <div className="gt-calendar-month-scroll" role="region" tabIndex={0} aria-label={`Month calendar, ${periodLabel}`}>
          <table className="gt-calendar-month"><caption className="gt-foundation-sr-only">{periodLabel}</caption><thead><tr>{Array.from({ length: 7 }, (_, index) => <th scope="col" key={index}>{dateLabel(addDays('2026-09-28', index), locale, { weekday: 'short', day: undefined, month: undefined, year: undefined })}</th>)}</tr></thead>
            <tbody>{Array.from({ length: range.days.length / 7 }, (_, row) => <tr key={row}>{range.days.slice(row * 7, row * 7 + 7).map(day => {
              const items = occurrencesOnDay(occurrences, day);
              return <td key={day}><button id={`${id}-day-${day}`} className="gt-calendar-day" type="button" tabIndex={activeDay === day ? 0 : -1} aria-pressed={selectedDay === day} aria-current={day === today ? 'date' : undefined} data-outside={day.slice(0, 7) !== anchor.slice(0, 7)}
                aria-label={`${dayHeading(day)}, ${items.length} event${items.length === 1 ? '' : 's'}${day === today ? ', Today' : ''}`} onKeyDown={event => dayKeyDown(event, day)} onClick={() => setSelectedDay(day)}>
                <time dateTime={day}>{parseDateKey(day).getUTCDate()}</time>{items.slice(0, 3).map(item => <span className="gt-calendar-preview" key={item.occurrenceId}>{item.title}</span>)}{items.length > 3 && <span className="gt-calendar-preview">+{items.length - 3} more</span>}
              </button></td>;
            })}</tr>)}</tbody></table>
        </div>
        <aside className="gt-calendar-selected-day" aria-label="Selected day events"><h2>{dayHeading(selectedDay)}</h2>{eventList(selectedDay)}<Button disabled={busy} onClick={() => startNew(selectedDay)}>Add event on this day</Button></aside>
      </div>}
      {view === 'week' && <div className="gt-calendar-week" aria-label="Week schedule">{range.days.map(day => <section key={day} className="gt-calendar-day-section" aria-labelledby={`${id}-week-${day}`}><h2 id={`${id}-week-${day}`}><time dateTime={day}>{dayHeading(day)}</time></h2>{eventList(day)}<Button variant="secondary" disabled={busy} aria-label={`Add event on ${day}`} onClick={() => startNew(day)}>Add event</Button></section>)}</div>}
      {view === 'agenda' && <section aria-label="Agenda schedule">
        {!occurrences.length ? <PageState state="empty" title="No events in this date range" description="Add an event or choose another date range." /> : range.days.filter(day => occurrencesOnDay(occurrences, day).length).map(day => <section key={day} className="gt-calendar-day-section" aria-labelledby={`${id}-agenda-${day}`}><h2 id={`${id}-agenda-${day}`}><time dateTime={day}>{dayHeading(day)}</time></h2>{eventList(day)}</section>)}
      </section>}
      {view === 'connections' && <section aria-label="Calendar connections"><p>Provider setup is required. No calendar provider is connected by this screen. ICS import and export work with local files.</p><div className="gt-calendar-connections">
        {['Google Calendar', 'Outlook Calendar', 'CalDAV'].map(title => <ConnectionCard key={title} title={title} status="unavailable" description="No verified calendar connection or sync adapter is configured." />)}
      </div><Link to={featurePath('profile', 'integrations')}>Open integration settings</Link></section>}
    </PageTemplate>
    {editor && <Modal open title={editor.original ? 'Edit event' : 'New event'} onClose={closeEditor}><EventForm editor={editor} id={id} busy={busy} onChange={form => setEditor(previous => ({ ...previous, form, error: '' }))} onSubmit={submitEvent} onCancel={closeEditor} /></Modal>}
    {transfer?.kind === 'select' && <Modal open title="Import calendar file" onClose={closeTransfer}><p>Select a file to validate and review. No events are added until you confirm.</p><FileUploader label="ICS file" accept=".ics" maxSizeBytes={MAX_ICS_BYTES} onFilesSelected={prepareImport} /></Modal>}
    {transfer && transfer.kind !== 'select' && <Modal open title={confirmTitle} onClose={closeTransfer} actions={<>
      <Button variant="secondary" data-dialog-autofocus disabled={busy} onClick={closeTransfer}>Cancel</Button><Button variant={transfer.kind === 'delete' ? 'danger' : 'primary'} loading={busy} loadingLabel={transfer.kind === 'export' ? 'Preparing download…' : 'Saving changes…'} onClick={confirmTransfer}>{transfer.kind === 'delete' ? 'Delete event' : transfer.kind === 'export' ? 'Download reviewed .ics' : 'Import reviewed events'}</Button>
    </>}>
      {transfer.kind === 'delete' && <p>Delete “{transfer.original.title}”{transfer.original.recurrence && transfer.original.recurrence !== 'none' ? ' and its complete recurring series' : ''}?</p>}
      {transfer.kind === 'export' && <p>Download {transfer.count} event occurrence(s) from {transfer.start} to {transfer.end}. Recurring series are expanded into individual occurrences in this range. This exports the reviewed snapshot to a local file.</p>}
      {transfer.kind === 'import' && <><p>Add up to {transfer.events.length} validated event(s) from {transfer.fileName}. Existing UID matches are skipped; existing events are never replaced. {transfer.duplicateCount} duplicate(s) excluded.</p>{transfer.warnings.map(warning => <p key={warning}>{warning}</p>)}<ul>{transfer.events.map(event => <li key={event.id}>{event.title} · {event.date} · {event.allDay ? 'All day' : `${event.startTime} ${event.timeZone}`}{event.recurrence !== 'none' ? ` · Repeats ${event.recurrence}` : ''}</li>)}</ul></>}
      <FormError>{transfer.error}</FormError>
    </Modal>}
  </section>;
}

