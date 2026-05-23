import { Z_INDEX } from '../constants';
import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Plus, CheckCircle2, Circle, Clock, X, Save, Pencil, Trash2
} from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';

const EVENT_TYPES = ['task', 'fitness', 'work', 'health'];
const TYPE_COLOR  = { task: 'var(--accent)', fitness: '#f43f5e', work: '#3b82f6', health: '#10b981' };

const EMPTY_EVENT = { title: '', type: 'task', time: '09:00', notes: '' };

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = add mode, object = edit mode
  const [formData, setFormData] = useState(EMPTY_EVENT);

  const events = useStore(state => state.calendar_events) || [];
  const tasks  = useStore(state => state.tasks) || [];
  const toast  = useToast();
  const fetchInitialData = useStore(state => state.fetchInitialData);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth     = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isToday = (day) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const toDateStr = (day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getEventsForDay = (day) => {
    const dateStr = toDateStr(day);
    return events.filter(e => e.date === dateStr);
  };

  const taskDueDates = useMemo(() => {
    const map = {};
    (tasks || []).forEach(t => {
      if (!t.due_date) return;
      const d = t.due_date.slice(0, 10);
      const [y, m] = d.split('-').map(Number);
      if (y === year && m === month + 1) {
        map[d] = (map[d] || 0) + 1;
      }
    });
    return map;
  }, [tasks, year, month]);

  const openAddModal = (day) => {
    setSelectedDay(day);
    setEditingEvent(null);
    setFormData(EMPTY_EVENT);
    setIsModalOpen(true);
  };

  const openEditModal = (ev, e) => {
    e.stopPropagation();
    setEditingEvent(ev);
    setFormData({ title: ev.title, type: ev.type, time: ev.time || '09:00', notes: ev.notes || '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setFormData(EMPTY_EVENT);
  };

  // ADD event
  const handleAddEvent = async () => {
    if (!formData.title.trim()) { toast.error('Event title is required'); return; }
    if (!selectedDay) return;
    const dateStr = toDateStr(selectedDay);
    const event = {
      id: Date.now().toString(),
      ...formData,
      title: formData.title.trim(),
      date: dateStr,
      completed: false,
    };
    try {
      await apiSync('/calendar_events/single', 'POST', event);
      toast.success('Event added to calendar');
      fetchInitialData();
      closeModal();
    } catch {
      const updatedEvents = [...events, event];
      try {
        await apiSync('/calendar_events', 'POST', updatedEvents);
        fetchInitialData();
        closeModal();
        toast.success('Event added');
      } catch { toast.error('Failed to save event'); }
    }
  };

  // EDIT / UPDATE event
  const handleEditEvent = async () => {
    if (!formData.title.trim()) { toast.error('Event title is required'); return; }
    const updated = { ...editingEvent, ...formData, title: formData.title.trim() };
    try {
      await apiSync(`/calendar_events/${editingEvent.id}`, 'PATCH', updated);
      toast.success('Event updated');
      fetchInitialData();
      closeModal();
    } catch {
      const updatedEvents = events.map(e => e.id === editingEvent.id ? updated : e);
      try {
        await apiSync('/calendar_events', 'POST', updatedEvents);
        fetchInitialData();
        closeModal();
        toast.success('Event updated');
      } catch { toast.error('Failed to update event'); }
    }
  };

  // DELETE event
  const handleDeleteEvent = async (eventId, e) => {
    e.stopPropagation();
    try {
      await apiSync(`/calendar_events/${eventId}`, 'DELETE');
      toast.success('Event removed');
      fetchInitialData();
    } catch {
      const updatedEvents = events.filter(ev => ev.id !== eventId);
      try {
        await apiSync('/calendar_events', 'POST', updatedEvents);
        fetchInitialData();
        toast.success('Event removed');
      } catch { toast.error('Failed to remove event'); }
    }
  };

  // TOGGLE complete
  const toggleComplete = async (eventId) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    try {
      await apiSync(`/calendar_events/${eventId}`, 'PATCH', { completed: !ev.completed });
      fetchInitialData();
    } catch {
      const updatedEvents = events.map(e => e.id === eventId ? { ...e, completed: !e.completed } : e);
      try { await apiSync('/calendar_events', 'POST', updatedEvents); fetchInitialData(); } catch {}
    }
  };

  const handleDayClick = (day) => openAddModal(day);

  const handleSubmit = () => editingEvent ? handleEditEvent() : handleAddEvent();

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Schedule & Planning</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Personal Calendar</h2>
          <p className="text-secondary">Track your habits, events, and performance plans.</p>
        </div>
        <button onClick={() => openAddModal(new Date().getDate())} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> ADD EVENT
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
        {/* Calendar Body */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{monthNames[month]} <span style={{ color: 'var(--accent)' }}>{year}</span></h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={prevMonth} className="btn-icon"><ChevronLeft size={20} /></button>
              <button onClick={nextMonth} className="btn-icon"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '1rem' }}>
            {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(day => (
              <div key={day} style={{ fontWeight: 900, color: 'var(--text-3)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>{day}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(110px, auto)', gap: '4px' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day       = i + 1;
              const dayEvents = getEventsForDay(day);
              const dateStr   = toDateStr(day);
              const dueTasks  = taskDueDates[dateStr] || 0;
              const active    = isToday(day);
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  style={{
                    padding: '0.6rem',
                    background: active ? 'rgba(6,182,212,0.05)' : 'var(--bg-elevated)',
                    border: isSelected ? '1px solid var(--accent)' : active ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: '0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => { if (!active && !isSelected) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: active ? 'var(--accent)' : 'var(--text-2)', display: 'block', marginBottom: '4px' }}>{day}</span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} style={{
                        fontSize: '0.6rem', padding: '2px 5px', borderRadius: '3px',
                        background: e.completed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                        color: e.completed ? 'var(--success)' : 'var(--text-2)',
                        borderLeft: `2px solid ${TYPE_COLOR[e.type] || 'var(--accent)'}`,
                        textDecoration: e.completed ? 'line-through' : 'none',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>{e.title}</div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span style={{ fontSize: '0.55rem', color: 'var(--text-3)', fontWeight: 800 }}>+{dayEvents.length - 2} more</span>
                    )}
                    {dueTasks > 0 && (
                      <div style={{
                        fontSize: '0.55rem', padding: '1px 5px', borderRadius: '3px',
                        background: 'rgba(139,92,246,0.12)', color: '#a78bfa',
                        borderLeft: '2px solid #8b5cf6', fontWeight: 700,
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>📌 {dueTasks} task{dueTasks !== 1 ? 's' : ''} due</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 className="label-caps" style={{ color: 'var(--accent)', marginBottom: '1.25rem' }}>
              {selectedDay ? `${monthNames[month]} ${selectedDay}` : 'Today'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {getEventsForDay(selectedDay || new Date().getDate()).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <button onClick={() => toggleComplete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}>
                    {e.completed ? <CheckCircle2 size={18} color="var(--success)" /> : <Circle size={18} color="var(--text-3)" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: e.completed ? 'var(--text-3)' : 'var(--text-1)', textDecoration: e.completed ? 'line-through' : 'none' }}>{e.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> {e.time || 'All day'}</span>
                      <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: TYPE_COLOR[e.type] || 'var(--text-3)', textTransform: 'uppercase' }}>{e.type}</span>
                    </div>
                    {e.notes && <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '4px', fontStyle: 'italic' }}>{e.notes}</p>}
                  </div>
                  {/* Inline edit / delete actions */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      onClick={(ev) => openEditModal(e, ev)}
                      title="Edit event"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-3)', borderRadius: '4px' }}
                      onMouseEnter={ev => ev.currentTarget.style.color = 'var(--accent)'}
                      onMouseLeave={ev => ev.currentTarget.style.color = 'var(--text-3)'}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(ev) => handleDeleteEvent(e.id, ev)}
                      title="Delete event"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-3)', borderRadius: '4px' }}
                      onMouseEnter={ev => ev.currentTarget.style.color = '#f43f5e'}
                      onMouseLeave={ev => ev.currentTarget.style.color = 'var(--text-3)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {getEventsForDay(selectedDay || new Date().getDate()).length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No events scheduled.</p>
              )}
            </div>
            <button onClick={() => openAddModal(selectedDay || new Date().getDate())} className="btn-ghost" style={{ width: '100%', marginTop: '1rem', fontSize: '0.75rem', fontWeight: 800 }}>
              <Plus size={14} /> ADD NEW ITEM
            </button>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', background: 'var(--accent-gradient)', color: 'white' }}>
            <h4 className="label-caps" style={{ color: 'white', opacity: 0.8, marginBottom: '1rem' }}>Monthly Goal</h4>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.3 }}>Consistent 5AM Wake-up & Fasted Cardio</p>
            <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.2)', height: '4px', borderRadius: '2px' }}>
              <div style={{ width: '65%', height: '100%', background: 'white', borderRadius: '2px' }} />
            </div>
            <p style={{ fontSize: '0.7rem', marginTop: '8px', fontWeight: 700 }}>PROGRESS: 18/30 DAYS</p>
          </div>
        </div>
      </div>

      {/* Add / Edit Event Modal */}
      {isModalOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: Z_INDEX.HEADER }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>
                {editingEvent ? `Edit Event` : `New Event — ${selectedDay} ${monthNames[month]}`}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Event Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="e.g. Back Day Workout"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Type</label>
                  <select className="form-input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%' }}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Time</label>
                  <input type="time" className="form-input" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Notes (optional)</label>
                <textarea
                  className="form-input"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional details..."
                  style={{ width: '100%', resize: 'vertical', minHeight: '70px' }}
                  rows={3}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {editingEvent && (
                  <button
                    onClick={() => { handleDeleteEvent(editingEvent.id, { stopPropagation: () => {} }); closeModal(); }}
                    className="btn-ghost"
                    style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '6px', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}
                  >
                    <Trash2 size={16} /> DELETE
                  </button>
                )}
                <button onClick={handleSubmit} className="btn-primary" style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Save size={18} /> {editingEvent ? 'UPDATE EVENT' : 'SAVE EVENT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
