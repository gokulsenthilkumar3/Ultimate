import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit3, Check, X, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EVENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#ec4899', '#6b7280', '#22c55e', '#fb923c'];
const RECUR_OPTIONS = [
  { value: 'none',    label: 'No recurrence' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
];
const EVENT_TYPES = ['Event', 'Meeting', 'Reminder', 'Task', 'Birthday', 'Holiday', 'Personal', 'Work'];

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function expandRecurring(event, viewStart, viewEnd) {
  const start = new Date(event.date);
  const dates = [];

  if (!event.recurrence || event.recurrence === 'none') {
    if (start >= viewStart && start <= viewEnd) dates.push(event.date);
    return dates;
  }

  let cur = new Date(start);
  const end = new Date(viewEnd);
  let safety = 0;

  while (cur <= end && safety < 400) {
    safety++;
    if (cur >= viewStart) dates.push(cur.toISOString().slice(0, 10));

    if (event.recurrence === 'daily')   cur.setDate(cur.getDate() + 1);
    else if (event.recurrence === 'weekly') cur.setDate(cur.getDate() + 7);
    else if (event.recurrence === 'monthly') cur.setMonth(cur.getMonth() + 1);
    else if (event.recurrence === 'yearly') cur.setFullYear(cur.getFullYear() + 1);
    else break;
  }

  return dates;
}

export default function Calendar() {
  const toast = useToast();
  const events              = useStore(s => s.calendar_events) || [];
  const _updateAll          = useStore(s => s.updateCalendarEvents);
  const addEvent            = (ev) => _updateAll && _updateAll([...events, ev]);
  const updateEvent         = (id, updates) => _updateAll && _updateAll(events.map(e => e.id === id ? { ...e, ...updates } : e));
  const deleteEvent         = (id) => _updateAll && _updateAll(events.filter(e => e.id !== id));

  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view,  setView]  = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [editForm, setEditForm] = useState({});

  const [form, setForm] = useState({
    title: '', date: today.toISOString().slice(0, 10), endDate: '',
    startTime: '', endTime: '', type: 'Event', color: EVENT_COLORS[0],
    description: '', location: '', recurrence: 'none', allDay: true,
  });

  // Build visible range for month view
  const { calDays, viewStart, viewEnd } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();
    const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

    const days = [];
    const vs = new Date(firstDay); vs.setDate(vs.getDate() - startDow);
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(vs); d.setDate(vs.getDate() + i);
      days.push(d);
    }

    const ve = new Date(vs); ve.setDate(vs.getDate() + totalCells);
    return { calDays: days, viewStart: vs, viewEnd: ve };
  }, [year, month]);

  // Expand recurring events across the visible range
  const expandedEvents = useMemo(() => {
    const result = [];
    events.forEach(ev => {
      const dates = expandRecurring(ev, viewStart, viewEnd);
      dates.forEach(d => result.push({ ...ev, date: d, _recurring: ev.recurrence !== 'none' }));
    });
    return result;
  }, [events, viewStart, viewEnd]);

  const eventsOnDay = useCallback((day) => {
    const key = day.toISOString().slice(0, 10);
    return expandedEvents.filter(e => e.date === key);
  }, [expandedEvents]);

  const doAdd = () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    const ev = { ...form, id: Date.now() };
    if (typeof addEvent === 'function') addEvent(ev);
    setForm({ title: '', date: today.toISOString().slice(0, 10), endDate: '', startTime: '', endTime: '', type: 'Event', color: EVENT_COLORS[0], description: '', location: '', recurrence: 'none', allDay: true });
    setShowAdd(false);
    toast.success(`📅 "${ev.title}" added`);
  };

  const doDelete = (id) => {
    const ev = events.find(e => e.id === id);
    if (typeof deleteEvent === 'function') deleteEvent(id);
    toast.info(`${ev?.title} deleted`);
  };

  const saveEdit = () => {
    if (typeof updateEvent === 'function') updateEvent(editId, editForm);
    setEditId(null); toast.success('Event updated');
  };

  // iCal export
  const exportICal = useCallback(() => {
    const esc = (s = '') => s.replace(/[,;\\]/g, c => '\\' + c).replace(/\n/g, '\\n');
    const dtStr = (dateStr, timeStr = '') => {
      if (!dateStr) return '';
      const dt = new Date(dateStr + (timeStr ? 'T' + timeStr : 'T00:00:00'));
      return dt.toISOString().replace(/[-:]/g, '').replace('.000', '');
    };
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GrowthTrack//Digital Twin//EN', 'CALSCALE:GREGORIAN',
    ];
    events.forEach(ev => {
      const uid = `${ev.id}@growthtrack`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`SUMMARY:${esc(ev.title)}`);
      lines.push(`DTSTART:${dtStr(ev.date, ev.startTime)}`);
      if (ev.endDate || ev.endTime) lines.push(`DTEND:${dtStr(ev.endDate || ev.date, ev.endTime || '23:59')}`);
      if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`);
      if (ev.location)    lines.push(`LOCATION:${esc(ev.location)}`);
      if (ev.recurrence && ev.recurrence !== 'none') {
        const rmap = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
        lines.push(`RRULE:FREQ=${rmap[ev.recurrence]}`);
      }
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const ical = lines.join('\r\n');
    const url = URL.createObjectURL(new Blob([ical], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'growthtrack-calendar.ics'; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${events.length} events as .ics`);
  }, [events, toast]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toISOString().slice(0, 10);
    return expandedEvents.filter(e => e.date === key).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [selectedDate, expandedEvents]);

  const upcomingEvents = useMemo(() => {
    const todayKey = today.toISOString().slice(0, 10);
    return expandedEvents.filter(e => e.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [expandedEvents, today]);

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Schedule</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Calendar</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{events.length} events · Recurring support · iCal export</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportICal} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            <Download size={12} /> Export .ics
          </button>
          <button onClick={() => setShowAdd(s => !s)} className="btn-primary"><Plus size={14} /> Add Event</button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass-card mb-lg">
          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>New Event</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="form-input" style={{ gridColumn: 'span 2' }} />
            <div>
              <label style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '4px' }}>Start Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '4px' }}>End Date</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="form-input" />
            </div>
            {!form.allDay && (
              <>
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="form-input" placeholder="Start time" />
                <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="form-input" placeholder="End time" />
              </>
            )}
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="form-input">
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))} className="form-input">
              {RECUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input placeholder="Location (optional)" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="form-input" />
            <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="form-input" />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <div onClick={() => setForm(f => ({ ...f, allDay: !f.allDay }))} style={{ width: '32px', height: '18px', borderRadius: '99px', background: form.allDay ? 'var(--accent)' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: '2px', left: form.allDay ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              All day
            </label>
            <div style={{ display: 'flex', gap: '4px', marginLeft: '0.5rem' }}>
              {EVENT_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, border: form.color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
            <button onClick={doAdd} className="btn-primary">Add Event</button>
          </div>
        </div>
      )}

      {/* Nav + view toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--text-2)' }}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-1)', minWidth: '160px', textAlign: 'center' }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--text-2)' }}><ChevronRight size={14} /></button>
          <button onClick={goToday} style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>Today</button>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {['month', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: view === v ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: view === v ? '#000' : 'var(--text-3)', border: 'none', textTransform: 'capitalize' }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 280px' : '1fr', gap: '1rem' }}>
        {/* Month grid */}
        {view === 'month' && (
          <div>
            {/* Days of week header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
              {DAYS_OF_WEEK.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {calDays.map((day, idx) => {
                const dayEvents = eventsOnDay(day);
                const isToday   = isSameDay(day, today);
                const isThisMonth = day.getMonth() === month;
                const isSelected  = selectedDate && isSameDay(day, selectedDate);
                const hasBirthday = dayEvents.some(e => e.type === 'Birthday');

                return (
                  <div key={idx} onClick={() => setSelectedDate(isSameDay(day, selectedDate || new Date(0)) ? null : day)}
                    style={{
                      minHeight: '80px', borderRadius: '8px', padding: '4px', cursor: 'pointer',
                      background: isSelected ? 'rgba(99,102,241,0.15)' : isToday ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(99,102,241,0.5)' : isToday ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)'}`,
                      opacity: isThisMonth ? 1 : 0.35,
                      transition: 'background 0.1s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: isToday ? 900 : 600,
                        color: isToday ? 'var(--accent)' : 'var(--text-2)',
                        width: '22px', height: '22px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isToday ? 'var(--accent)' : 'transparent',
                        color: isToday ? '#000' : isThisMonth ? 'var(--text-1)' : 'var(--text-3)',
                      }}>{day.getDate()}</span>
                      {hasBirthday && <span style={{ fontSize: '0.65rem' }}>🎂</span>}
                    </div>
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id + e.date} style={{
                        fontSize: '0.58rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', marginBottom: '1px',
                        background: `${e.color || '#6366f1'}25`, color: e.color || '#6366f1',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: '2px',
                      }}>
                        {e._recurring && <RefreshCw size={7} style={{ flexShrink: 0 }} />}
                        {e.startTime && <span style={{ opacity: 0.8 }}>{e.startTime.slice(0, 5)}</span>}
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-3)', paddingLeft: '4px' }}>+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {upcomingEvents.length === 0 ? (
              <EmptyState icon={RefreshCw} title="No upcoming events" description="Add events using the button above." />
            ) : (
              upcomingEvents.map((e, idx) => {
                const isEditingThis = editId === e.id;
                return (
                  <div key={e.id + e.date} style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${e.color || '#6366f1'}33`, borderLeft: `3px solid ${e.color || '#6366f1'}` }}>
                    {isEditingThis ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="form-input" style={{ fontSize: '0.85rem' }} />
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <input type="date" value={editForm.date || ''} onChange={ev => setEditForm(f => ({ ...f, date: ev.target.value }))} className="form-input" />
                          <select value={editForm.recurrence || 'none'} onChange={ev => setEditForm(f => ({ ...f, recurrence: ev.target.value }))} className="form-input">
                            {RECUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={saveEdit} className="btn-primary" style={{ padding: '3px 10px', fontSize: '0.72rem' }}><Check size={11} /> Save</button>
                          <button onClick={() => setEditId(null)} style={{ padding: '3px 10px', fontSize: '0.72rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ width: '42px', textAlign: 'center', flexShrink: 0, borderRight: `1px solid ${e.color}44`, paddingRight: '0.6rem' }}>
                          <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>{new Date(e.date + 'T00:00:00').toLocaleDateString('en', { month: 'short' })}</p>
                          <p style={{ fontSize: '1.4rem', fontWeight: 900, color: e.color, lineHeight: 1 }}>{new Date(e.date + 'T00:00:00').getDate()}</p>
                          <p style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{new Date(e.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' })}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <p style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-1)' }}>{e.title}</p>
                            {e._recurring && <span style={{ fontSize: '0.6rem', color: e.color, display: 'flex', alignItems: 'center', gap: '2px' }}><RefreshCw size={9} /> {e.recurrence}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '3px' }}>
                            {e.startTime && <span>⏰ {e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</span>}
                            {e.location && <span>📍 {e.location}</span>}
                            <span style={{ padding: '1px 7px', borderRadius: '99px', background: `${e.color}15`, color: e.color, fontWeight: 700 }}>{e.type}</span>
                          </div>
                          {e.description && <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '3px' }}>{e.description}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                          <button onClick={() => { setEditId(e.id); setEditForm({ ...events.find(ev => ev.id === e.id) }); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '3px' }}><Edit3 size={12} /></button>
                          <button onClick={() => doDelete(e.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '3px' }}><Trash2 size={12} /></button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Day detail sidebar */}
        {selectedDate && view === 'month' && (
          <div>
            <div className="glass-card" style={{ position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>{DAYS_OF_WEEK[selectedDate.getDay()]}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-1)', lineHeight: 1 }}>{selectedDate.getDate()}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</p>
                </div>
                <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', alignSelf: 'flex-start', padding: '3px' }}><X size={15} /></button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-3)' }}>
                  <p style={{ fontSize: '0.78rem' }}>No events</p>
                  <button onClick={() => { setForm(f => ({ ...f, date: selectedDate.toISOString().slice(0, 10) })); setShowAdd(true); }} className="btn-primary" style={{ marginTop: '0.75rem', padding: '5px 12px', fontSize: '0.72rem' }}><Plus size={11} /> Add</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedDayEvents.map(e => (
                    <div key={e.id + e.date} style={{ padding: '0.65rem 0.75rem', borderRadius: '8px', background: `${e.color || '#6366f1'}12`, borderLeft: `3px solid ${e.color || '#6366f1'}` }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-1)' }}>{e.title}</p>
                      {e.startTime && <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>⏰ {e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</p>}
                      {e.location && <p style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>📍 {e.location}</p>}
                      {e._recurring && <p style={{ fontSize: '0.58rem', color: e.color, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}><RefreshCw size={8} /> Recurring: {e.recurrence}</p>}
                      <button onClick={() => doDelete(e.id)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.5)', cursor: 'pointer', padding: '2px', marginTop: '4px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px' }}><Trash2 size={10} /> Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
