import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Plus, CheckCircle2, Circle, Clock, Tag, X, Save
} from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'task', time: '09:00' });
  
  const events = useStore(state => state.calendar_events) || [];
  const toast = useToast();
  const fetchInitialData = useStore(state => state.fetchInitialData);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isToday = (day) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !selectedDay) return;
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const updatedEvents = [...events, { 
      id: Date.now().toString(), 
      ...newEvent, 
      date: dateStr, 
      completed: false 
    }];

    try {
      const res = await fetch('http://localhost:3001/api/calendar_events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvents)
      });
      
      if (res.ok) {
        toast.success('Event added to calendar');
        fetchInitialData();
        setIsModalOpen(false);
        setNewEvent({ title: '', type: 'task', time: '09:00' });
      }
    } catch (err) {
      toast.error('Failed to save event');
    }
  };

  const toggleComplete = async (eventId) => {
    const updatedEvents = events.map(e => e.id === eventId ? { ...e, completed: !e.completed } : e);
    try {
      await fetch('http://localhost:3001/api/calendar_events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvents)
      });
      fetchInitialData();
    } catch (err) {}
  };

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Schedule & Planning</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Personal Calendar</h2>
          <p className="text-secondary">Track your habits, events, and performance plans.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button onClick={() => { setSelectedDay(new Date().getDate()); setIsModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Plus size={18} /> ADD EVENT
           </button>
        </div>
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
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} style={{ fontWeight: 900, color: 'var(--text-3)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>{day}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)', gap: '4px' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const active = isToday(day);
              
              return (
                <div 
                  key={day} 
                  onClick={() => setSelectedDay(day)}
                  style={{ 
                    padding: '0.75rem', 
                    background: active ? 'rgba(6,182,212,0.05)' : 'var(--bg-elevated)', 
                    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: '0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => !active && (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <span style={{ 
                    fontWeight: 800, 
                    fontSize: '0.9rem',
                    color: active ? 'var(--accent)' : 'var(--text-2)',
                    display: 'block',
                    marginBottom: '8px'
                  }}>{day}</span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} style={{ 
                        fontSize: '0.65rem', 
                        padding: '2px 6px', 
                        borderRadius: '3px', 
                        background: e.completed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                        color: e.completed ? 'var(--success)' : 'var(--text-2)',
                        borderLeft: `2px solid ${e.type === 'fitness' ? '#f43f5e' : 'var(--accent)'}`,
                        textDecoration: e.completed ? 'line-through' : 'none',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis'
                      }}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 800 }}>+ {dayEvents.length - 3} MORE</span>
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
              Schedule for {selectedDay || 'Today'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {getEventsForDay(selectedDay || new Date().getDate()).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => toggleComplete(e.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}
                  >
                    {e.completed ? <CheckCircle2 size={18} color="var(--success)" /> : <Circle size={18} color="var(--text-3)" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: e.completed ? 'var(--text-3)' : 'var(--text-1)', textDecoration: e.completed ? 'line-through' : 'none' }}>{e.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> {e.time || 'All day'}
                      </span>
                      <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                        {e.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {getEventsForDay(selectedDay || new Date().getDate()).length === 0 && (
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
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>New Event - {selectedDay} {monthNames[month]}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Event Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g. Back Day Workout"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Type</label>
                  <select 
                    className="form-input" 
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="task">Task</option>
                    <option value="fitness">Fitness</option>
                    <option value="work">Work</option>
                    <option value="health">Health</option>
                  </select>
                </div>
                <div>
                  <label className="label-caps" style={{ fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>Time</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <button onClick={handleAddEvent} className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Save size={18} /> SAVE EVENT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
