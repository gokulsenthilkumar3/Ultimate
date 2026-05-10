import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Plus, CheckCircle2, Circle, Clock, X, Save
} from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent]       = useState({ title: '', type: 'task', time: '09:00' });

  const events = useStore(state => state.calendar_events) || [];
  const tasks  = useStore(state => state.tasks)           || [];
  const toast  = useToast();
  const fetchInitialData = useStore(state => state.fetchInitialData);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isToday = (day) => {
    const t = new Date();
    return t.getDate() === day && t.getMonth() === month && t.getFullYear() === year;
  };

  const dateStr = (day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getEventsForDay = (day) => events.filter(e => e.date === dateStr(day));

  // Task due markers: tasks whose due_date falls in this month
  const taskDueMap = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (!task.due_date) return;
      const d = new Date(task.due_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(task);
      }
    });
    return map;
  }, [tasks, year, month]);

  // Open modal on cell click
  const handleCellClick = (day) => {
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  // Normalized: POST single event row
  const handleAddEvent = async () => {
    if (!newEvent.title || !selectedDay) return;
    const event = {
      id: Date.now().toString(),
      ...newEvent,
      date: dateStr(selectedDay),
      completed: false,
    };
    try {
      // Normalized single-row insert
      await apiSync('/calendar_events', 'POST', event);
      toast.success('Event added to calendar');
      fetchInitialData();
      setIsModalOpen(false);
      setNewEvent({ title: '', type: 'task', time: '09:00' });
    } catch {
      toast.error('Failed to save event');
    }
  };

  // Normalized: PATCH single event row
  const toggleComplete = async (eventId) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    try {
      await apiSync(`/calendar_events/${eventId}`, 'PATCH', { completed: !ev.completed });
      fetchInitialData();
    } catch {}
  };

  const displayDay = selectedDay || new Date().getDate();

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Schedule & Planning</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Personal Calendar</h2>
          <p className="text-secondary">Track your habits, events, and performance plans.</p>
        </div>
        <button onClick={() => { setSelectedDay(new Date().getDate()); setIsModalOpen(true); }}
          className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> ADD EVENT
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
        {/* Calendar body */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              {monthNames[month]} <span style={{ color: 'var(--accent)' }}>{year}</span>
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={prevMonth} className="btn-icon"><ChevronLeft size={20} /></button>
              <button onClick={nextMonth} className="btn-icon"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '1rem' }}>
            {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
              <div key={d} style={{ fontWeight: 900, color: 'var(--text-3)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)', gap: '4px' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day       = i + 1;
              const dayEvents = getEventsForDay(day);
              const dueTasks  = taskDueMap[day] || [];
              const active    = isToday(day);
              return (
                <div key={day}
                  onClick={() => handleCellClick(day)}
                  style={{
                    padding: '0.75rem', cursor: 'pointer',
                    background: active ? 'rgba(6,182,212,0.05)' : 'var(--bg-elevated)',
                    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: '4px', transition: '0.2s', position: 'relative',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => !active && (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: active ? 'var(--accent)' : 'var(--text-2)', display: 'block', marginBottom: '6px' }}>{day}</span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {/* Calendar events */}
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} style={{
                        fontSize: '0.62rem', padding: '2px 5px', borderRadius: '3px',
                        background: e.completed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                        color: e.completed ? 'var(--success)' : 'var(--text-2)',
                        borderLeft: `2px solid ${e.type === 'fitness' ? '#f43f5e' : 'var(--accent)'}`,
                        textDecoration: e.completed ? 'line-through' : 'none',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>{e.title}</div>
                    ))}

                    {/* Task due-date markers */}
                    {dueTasks.slice(0, 2).map(task => (
                      <div key={`task-${task.id}`} style={{
                        fontSize: '0.62rem', padding: '2px 5px', borderRadius: '3px',
                        background: 'rgba(139,92,246,0.12)',
                        color: '#a78bfa',
                        borderLeft: '2px solid #8b5cf6',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>📌 {task.title}</div>
                    ))}

                    {/* Overflow count */}
                    {(dayEvents.length + dueTasks.length) > 4 && (
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-3)', fontWeight: 800 }}>+{dayEvents.length + dueTasks.length - 4} MORE</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 className="label-caps" style={{ color: 'var(--accent)', marginBottom: '1.25rem' }}>
              Schedule for {displayDay} {monthNames[month]}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {getEventsForDay(displayDay).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <button onClick={() => toggleComplete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}>
                    {e.completed ? <CheckCircle2 size={18} color="var(--success)" /> : <Circle size={18} color="var(--text-3)" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: e.completed ? 'var(--text-3)' : 'var(--text-1)', textDecoration: e.completed ? 'line-through' : 'none' }}>{e.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> {e.time || 'All day'}
                      </span>
                      <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)', textTransform: 'uppercase' }}>{e.type}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Due tasks section in sidebar */}
              {(taskDueMap[displayDay] || []).length > 0 && (
                <>
                  <p className="label-caps" style={{ fontSize: '0.65rem', color: '#a78bfa', marginTop: '0.5rem' }}>TASK DUE</p>
                  {(taskDueMap[displayDay]).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#a78bfa', flex: 1 }}>{task.title}</p>
                    </div>
                  ))}
                </>
              )}

              {getEventsForDay(displayDay).length === 0 && (taskDueMap[displayDay] || []).length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No events scheduled.</p>
              )}
            </div>
            <button onClick={() => setIsModalOpen(true)} className="btn-ghost" style={{ width: '100%', marginTop: '1rem', fontSize: '0.75rem', fontWeight: 800 }}>
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

      {/* Add Event Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>New Event — {selectedDay} {monthNames[month]}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Event Title</label>
                <input type="text" className="form-input" value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g. Back Day Workout" style={{ width: '100%' }}
                  onKeyDown={e => e.key === 'Enter' && handleAddEvent()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Type</label>
                  <select className="form-input" value={newEvent.type}
                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value })} style={{ width: '100%' }}>
                    <option value="task">Task</option>
                    <option value="fitness">Fitness</option>
                    <option value="work">Work</option>
                    <option value="health">Health</option>
                  </select>
                </div>
                <div>
                  <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Time</label>
                  <input type="time" className="form-input" value={newEvent.time}
                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} style={{ width: '100%' }} />
                </div>
              </div>
              <button onClick={handleAddEvent} className="btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Save size={18} /> SAVE EVENT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
