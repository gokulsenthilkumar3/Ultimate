import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Square, Clock, Trash2, Activity, Zap, BarChart, Timer, RotateCcw } from 'lucide-react';
import useStore, { selectTimesheet, selectAddTimesheetSession, selectDeleteTimesheetSession } from '../store/useStore';
import { useToast } from '../hooks/useToast';

export default function Timesheet() {
  const { sessions } = useStore(selectTimesheet);
  const addSession = useStore(selectAddTimesheetSession);
  const deleteSession = useStore(selectDeleteTimesheetSession);
  const toast = useToast();

  const [mode, setMode] = useState('stopwatch'); // 'stopwatch' or 'countdown'
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [countdownStart, setCountdownStart] = useState(1500); // 25 mins default
  const [taskName, setTaskName] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime((t) => {
          if (mode === 'countdown') {
            if (t <= 0) {
              setIsRunning(false);
              toast.success('Countdown finished!');
              new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
              return 0;
            }
            return t - 1;
          }
          return t + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, mode, toast]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleStart = () => {
    if (!taskName.trim()) {
      toast.error('Enter a task name first.');
      return;
    }
    if (mode === 'countdown' && time === 0) {
      setTime(countdownStart);
    }
    setIsRunning(true);
    toast.info(`${mode === 'countdown' ? 'Countdown' : 'Stopwatch'} started.`);
  };

  const handlePause = () => {
    setIsRunning(false);
    toast.info('Session paused.');
  };

  const handleStop = () => {
    const sessionDuration = mode === 'countdown' ? (countdownStart - time) : time;
    setIsRunning(false);
    if (sessionDuration > 0) {
      addSession({
        task: taskName || 'Focus Session',
        duration: sessionDuration,
        date: new Date().toLocaleString()
      });
      toast.success('Session saved.');
    }
    setTime(0);
    setTaskName('');
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(mode === 'countdown' ? countdownStart : 0);
  };

  const totalTime = useMemo(() => sessions.reduce((acc, s) => acc + s.duration, 0), [sessions]);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Productivity Engine</p>
          <h2 className="text-display" style={{ fontSize: '2rem' }}>Chrono Timesheet</h2>
        </div>
        <div className="glass-card" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
           <Activity size={18} color="var(--accent)" />
           <div>
             <p className="label-caps" style={{ fontSize: '0.6rem' }}>Total Tracked</p>
             <p style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatTime(totalTime)}</p>
           </div>
        </div>
      </div>
      
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Timer Control Center */}
        <div className="glass-card" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: isRunning ? 'var(--success)' : 'var(--accent)', filter: 'blur(100px)', opacity: 0.1, transition: 'background 1s ease' }} />
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-dark)', padding: '4px', borderRadius: '12px', zIndex: 1 }}>
            <button onClick={() => { setMode('stopwatch'); setTime(0); setIsRunning(false); }} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: mode === 'stopwatch' ? 'var(--accent)' : 'transparent', color: mode === 'stopwatch' ? '#fff' : 'var(--text-3)', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>STOPWATCH</button>
            <button onClick={() => { setMode('countdown'); setTime(countdownStart); setIsRunning(false); }} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: mode === 'countdown' ? 'var(--accent)' : 'transparent', color: mode === 'countdown' ? '#fff' : 'var(--text-3)', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>COUNTDOWN</button>
          </div>

          <input 
            type="text" 
            placeholder="Focus target..." 
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="form-input"
            style={{ width: '100%', textAlign: 'center', fontSize: '1.1rem', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.5rem', zIndex: 1 }}
          />

          {mode === 'countdown' && !isRunning && (
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', zIndex: 1 }}>
              {[300, 1500, 3600].map(s => (
                <button key={s} onClick={() => { setCountdownStart(s); setTime(s); }} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: countdownStart === s ? 'var(--bg-elevated)' : 'transparent', fontSize: '0.7rem', color: 'var(--text-2)', cursor: 'pointer' }}>{s/60}m</button>
              ))}
            </div>
          )}

          <div style={{ fontSize: '4.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-1)', marginBottom: '2rem', zIndex: 1 }}>
            {formatTime(time)}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', zIndex: 1 }}>
            {!isRunning ? (
              <button onClick={handleStart} className="btn-primary" style={{ flex: 1, background: 'var(--success)', color: '#000' }}>
                <Play size={18} /> START
              </button>
            ) : (
              <button onClick={handlePause} className="btn-primary" style={{ flex: 1, background: 'var(--warning)', color: '#000' }}>
                <Pause size={18} /> PAUSE
              </button>
            )}
            <button onClick={handleReset} className="btn-ghost" style={{ padding: '0.75rem' }} title="Reset">
              <RotateCcw size={18} />
            </button>
            <button onClick={handleStop} className="btn-primary" style={{ background: 'var(--danger)', color: '#fff' }}>
              <Square size={18} />
            </button>
          </div>
        </div>

        {/* Audit Log */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Audit Logs</h3>
            <span className="badge">{sessions.length}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
            {sessions.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{s.task}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{s.date}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontWeight: 900, color: 'var(--accent)', fontSize: '1rem' }}>{formatTime(s.duration)}</div>
                  <button onClick={() => deleteSession(s.id)} className="btn-icon--danger" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
