import React, { useState } from 'react';
import { ArrowUpRight, Button, Empty, Panel } from '../components';
import { SAMPLE_DATE } from '../models/chartModel';
import { SAMPLE_EVENTS, calendarDays, calendarTitle, formatDate, moveCalendar } from '../models/calendarModel';
import SetupScreen from './SetupScreen';

export default function CalendarScreen({ view = 'month', addRecord, openRecord, added = [] }) {
  const [cursor, setCursor] = useState(SAMPLE_DATE);
  const events = [...SAMPLE_EVENTS, ...added.map((event, i) => ({ ...event, id: event.id || `added-${i}`, date: /^\d{4}-\d{2}-\d{2}$/.test(event.date) ? event.date : SAMPLE_DATE }))].sort((a, b) => a.date.localeCompare(b.date));
  if (view === 'connections') return <SetupScreen title="Calendar connections" text="Choose which calendars appear in your workspace." items={['Local calendar', 'Google Calendar · setup required', 'Microsoft Calendar · setup required']} />;
  const days = calendarDays(cursor, view);
  const upcoming = events.filter(event => event.date >= cursor);
  return <Panel className="calendar-panel" title={view === 'agenda' ? 'Upcoming events' : calendarTitle(cursor, view)} subtitle="Space for your work, your people, and yourself." action={<div className="button-group calendar-actions">
    <Button aria-label={view === 'week' ? 'Previous week' : 'Previous month'} onClick={() => setCursor(value => moveCalendar(value, view, -1))}>Previous</Button>
    <Button onClick={() => setCursor(SAMPLE_DATE)}>Sample today</Button>
    <Button aria-label={view === 'week' ? 'Next week' : 'Next month'} onClick={() => setCursor(value => moveCalendar(value, view, 1))}>Next</Button>
  </div>}>
    {view === 'agenda' ? <div className="events-list">{upcoming.length ? upcoming.map(event => <button className="event-item" key={event.id} onClick={() => openRecord({ ...event, type: 'Calendar event' })}><span className="event-date"><strong>{formatDate(event.date, { day: '2-digit' })}</strong><small>{formatDate(event.date, { month: 'short' }).toUpperCase()}</small></span><span><strong>{event.title}</strong><small>{event.notes}</small></span><ArrowUpRight size={15} /></button>) : <Empty title="Your calendar has some space" description="No sample events are scheduled from this date." />}</div> : <div className="calendar-scroll" role="region" tabIndex={0} aria-label="Calendar dates">
      <div className="calendar-weekdays" aria-hidden="true">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div>
      <div className={`calendar-grid${view === 'week' ? ' week-view' : ''}`}>{days.map(date => {
        const entries = events.filter(event => event.date === date);
        return <button key={date} className={`${date === SAMPLE_DATE ? 'calendar-today' : ''} ${date.slice(0, 7) !== cursor.slice(0, 7) ? 'calendar-outside' : ''}`} aria-current={date === SAMPLE_DATE ? 'date' : undefined} aria-label={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} onClick={() => addRecord('calendar event', undefined, date)}><span>{Number(date.slice(-2))}</span>{entries.slice(0, 2).map(event => <small key={event.id} className="calendar-event">{event.title}</small>)}{entries.length > 2 && <small className="muted">+{entries.length - 2} more</small>}</button>;
      })}</div>
    </div>}
    <div className="panel-bottom small muted">Sample calendar · Select a date to add a local event.</div>
  </Panel>;
}
