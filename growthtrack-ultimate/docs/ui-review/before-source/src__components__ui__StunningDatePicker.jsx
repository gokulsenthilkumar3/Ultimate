import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function StunningDatePicker({ label, value, onChange }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); // 'date' | 'month' | 'year'
  
  const containerRef = useRef(null);
  const yearScrollRef = useRef(null);

  const parts = (value || '').split('-');
  const yearStr = parts[0] || '';
  const monthStr = parts[1] || '';
  const dayStr = parts[2] || '';

  // Internal state for the calendar view (what month/year we are looking at)
  const [viewDate, setViewDate] = useState(() => {
    if (yearStr && monthStr && dayStr) {
      return new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    }
    return new Date(); // Default to today
  });

  // Handle outside click to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  // Update viewDate if value changes externally
  useEffect(() => {
    if (yearStr && monthStr && dayStr) {
      setViewDate(new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr)));
    }
  }, [yearStr, monthStr, dayStr]);

  // Handle wheel scroll on inputs
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const handleWheel = (e) => {
      if (e.target.tagName === 'INPUT' && !showCalendar) {
        e.preventDefault();
        const isUp = e.deltaY < 0;
        const inc = isUp ? 1 : -1;
        const placeholder = e.target.getAttribute('placeholder');
        
        let y = parseInt(yearStr || new Date().getFullYear());
        let m = parseInt(monthStr || new Date().getMonth() + 1);
        let d = parseInt(dayStr || new Date().getDate());

        if (placeholder === 'DD') {
           d += inc;
           const maxD = new Date(y, m, 0).getDate();
           if (d > maxD) d = 1;
           if (d < 1) d = maxD;
        }
        if (placeholder === 'MM') {
           m += inc;
           if (m > 12) m = 1;
           if (m < 1) m = 12;
        }
        if (placeholder === 'YYYY') {
           y += inc;
        }

        const newY = y.toString();
        const newM = m.toString().padStart(2, '0');
        const newD = d.toString().padStart(2, '0');
        onChange(`${newY}-${newM}-${newD}`);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [yearStr, monthStr, dayStr, onChange, showCalendar]);

  // Scroll to active year when year mode opens
  useEffect(() => {
    if (pickerMode === 'year' && yearScrollRef.current) {
      const activeBtn = yearScrollRef.current.querySelector('.active-year');
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: 'center' });
      }
    }
  }, [pickerMode]);

  const updateDate = (y, m, d) => {
    if (!y && !m && !d) {
      onChange('');
      return;
    }
    onChange(`${y}-${m}-${d}`);
  };

  const handleDaySelect = (day) => {
    const y = viewDate.getFullYear().toString();
    const m = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    updateDate(y, m, d);
    setShowCalendar(false);
  };

  const changeMonth = (offset) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };
  const changeYear = (offset) => {
    setViewDate(prev => new Date(prev.getFullYear() + offset, prev.getMonth(), 1));
  };

  const renderCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const blanks = Array.from({ length: firstDay }).map((_, i) => (
      <div key={`blank-${i}`} className="calendar-day empty"></div>
    ));

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const selectedDateStr = value || '';

    const days = Array.from({ length: daysInMonth }).map((_, i) => {
      const dayNum = i + 1;
      const isToday = isCurrentMonth && today.getDate() === dayNum;
      
      const mStr = (month + 1).toString().padStart(2, '0');
      const dStr = dayNum.toString().padStart(2, '0');
      const thisDateStr = `${year}-${mStr}-${dStr}`;
      
      const isSelected = selectedDateStr === thisDateStr;

      return (
        <button
          key={`day-${dayNum}`}
          onClick={() => handleDaySelect(dayNum)}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
          style={{
            width: '28px', height: '28px', borderRadius: '50%',
            border: 'none', cursor: 'pointer', margin: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: isSelected ? 800 : 500,
            background: isSelected ? 'var(--accent)' : 'transparent',
            color: isSelected ? '#fff' : 'var(--text-1)',
            boxShadow: isSelected ? '0 0 12px var(--accent)' : 'none',
            transition: 'all 0.2s',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {dayNum}
          {isToday && !isSelected && (
            <span style={{ position: 'absolute', bottom: '4px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />
          )}
        </button>
      );
    });

    return [...blanks, ...days];
  };

  return (
    <div style={{ marginBottom: '1.25rem', position: 'relative' }} ref={containerRef}>
      <label className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '8px', color: 'var(--text-3)' }}>{label}</label>
      
      <div className="form-input" style={{ 
        display: 'flex', alignItems: 'center', gap: '8px', padding: '0 1rem',
        position: 'relative', transition: 'border-color 0.3s'
      }}>
        <input 
          className="date-part-input"
          placeholder="DD" 
          value={dayStr} 
          onChange={e => updateDate(yearStr, monthStr, e.target.value.replace(/\D/g, '').slice(0, 2))}
          style={{ width: '28px', background: 'transparent', border: 'none', color: 'var(--text-1)', textAlign: 'center', outline: 'none', fontSize: '1rem', padding: '0.8rem 0', fontFamily: 'var(--font-display)', fontWeight: 600 }}
        />
        <span style={{ color: 'var(--text-3)', fontWeight: 300 }}>/</span>
        <input 
          className="date-part-input"
          placeholder="MM" 
          value={monthStr} 
          onChange={e => updateDate(yearStr, e.target.value.replace(/\D/g, '').slice(0, 2), dayStr)}
          style={{ width: '28px', background: 'transparent', border: 'none', color: 'var(--text-1)', textAlign: 'center', outline: 'none', fontSize: '1rem', padding: '0.8rem 0', fontFamily: 'var(--font-display)', fontWeight: 600 }}
        />
        <span style={{ color: 'var(--text-3)', fontWeight: 300 }}>/</span>
        <input 
          className="date-part-input"
          placeholder="YYYY" 
          value={yearStr} 
          onChange={e => updateDate(e.target.value.replace(/\D/g, '').slice(0, 4), monthStr, dayStr)}
          style={{ width: '48px', background: 'transparent', border: 'none', color: 'var(--text-1)', textAlign: 'center', outline: 'none', fontSize: '1rem', padding: '0.8rem 0', fontFamily: 'var(--font-display)', fontWeight: 600 }}
        />

        <button 
          onClick={() => { setShowCalendar(!showCalendar); setPickerMode('date'); }}
          style={{
            marginLeft: 'auto',
            background: showCalendar ? 'var(--accent-20, rgba(6,182,212,0.2))' : 'transparent',
            border: 'none', borderRadius: '8px', padding: '6px',
            color: showCalendar ? 'var(--accent)' : 'var(--text-3)',
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = showCalendar ? 'var(--accent)' : 'var(--text-3)'}
        >
          <CalendarIcon size={16} />
        </button>
      </div>

      {/* Stunning Calendar Popover */}
      {showCalendar && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', left: 0, zIndex: 9999,
          background: 'var(--bg-glass)', border: '1px solid var(--border-strong)',
          borderRadius: '12px', padding: '16px', width: '280px',
          backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
          animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: 'top left'
        }}>
          {/* Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '4px', visibility: pickerMode === 'date' ? 'visible' : 'hidden' }}>
              <button 
                onClick={() => changeYear(-1)} title="Previous Year" 
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)', cursor: 'pointer' }}
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                onClick={() => changeMonth(-1)} title="Previous Month" 
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)', cursor: 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '4px', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
              <span 
                style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', background: pickerMode === 'month' ? 'rgba(255,255,255,0.1)' : 'transparent', transition: 'background 0.2s' }}
                onClick={() => setPickerMode(pickerMode === 'month' ? 'date' : 'month')}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => { if (pickerMode !== 'month') e.currentTarget.style.background = 'transparent'; }}
              >
                {MONTHS[viewDate.getMonth()]}
              </span>
              <span 
                style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', background: pickerMode === 'year' ? 'rgba(255,255,255,0.1)' : 'transparent', transition: 'background 0.2s' }}
                onClick={() => setPickerMode(pickerMode === 'year' ? 'date' : 'year')}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => { if (pickerMode !== 'year') e.currentTarget.style.background = 'transparent'; }}
              >
                {viewDate.getFullYear()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '4px', visibility: pickerMode === 'date' ? 'visible' : 'hidden' }}>
              <button 
                onClick={() => changeMonth(1)} title="Next Month" 
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)', cursor: 'pointer' }}
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => changeYear(1)} title="Next Year" 
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)', cursor: 'pointer' }}
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>

          {pickerMode === 'date' && (
            <>
              {/* Days Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)' }}>{d}</div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {renderCalendarDays()}
              </div>
            </>
          )}

          {pickerMode === 'month' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '10px 0' }}>
              {MONTHS.map((m, i) => (
                <button 
                  key={m} 
                  onClick={() => { 
                    setViewDate(prev => new Date(prev.getFullYear(), i, 1)); 
                    setPickerMode('date'); 
                  }}
                  style={{
                    padding: '12px 4px', borderRadius: '8px', border: 'none', 
                    background: viewDate.getMonth() === i ? 'var(--accent)' : 'transparent',
                    color: viewDate.getMonth() === i ? '#fff' : 'var(--text-1)',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => {
                    if (viewDate.getMonth() !== i) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (viewDate.getMonth() !== i) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {pickerMode === 'year' && (
            <div 
              ref={yearScrollRef}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '10px 0', maxHeight: '220px', overflowY: 'auto' }} 
              className="hide-scrollbar"
            >
              {Array.from({ length: 140 }).map((_, i) => {
                const y = new Date().getFullYear() - 100 + i;
                const isActive = viewDate.getFullYear() === y;
                return (
                  <button 
                    key={y} 
                    className={isActive ? 'active-year' : ''}
                    onClick={() => { 
                      setViewDate(prev => new Date(y, prev.getMonth(), 1)); 
                      setPickerMode('date'); 
                    }}
                    style={{
                      padding: '10px 4px', borderRadius: '8px', border: 'none', 
                      background: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-1)',
                      fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      fontSize: '0.8rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          )}
          
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'center' }}>
            <button 
              className="btn-sm" 
              onClick={() => {
                const now = new Date();
                setViewDate(now);
                setPickerMode('date');
                updateDate(now.getFullYear().toString(), (now.getMonth() + 1).toString().padStart(2, '0'), now.getDate().toString().padStart(2, '0'));
                setShowCalendar(false);
              }}
              style={{ fontSize: '0.75rem', padding: '4px 12px' }}
            >
              Select Today
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95) translateY(-10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
