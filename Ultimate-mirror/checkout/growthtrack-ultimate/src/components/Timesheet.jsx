import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Square, Clock, Trash2, Activity, Zap, Timer, RotateCcw, CheckCircle } from 'lucide-react';
import useStore, { selectTimesheet, selectAddTimesheetSession, selectDeleteTimesheetSession } from '../store/useStore';
import { useToast } from '../hooks/useToast';

const PRESETS = [
  { label: '5m', secs: 300 },
  { label: '25m', secs: 1500 },
  { label: '45m', secs: 2700 },
  { label: '1h', secs: 3600 },
  { label: '2h', secs: 7200 },
];

const fmt = (s) => {
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return h === '00' ? `${m}:${ss}` : `${h}:${m}:${ss}`;
};

export default function Timesheet() {
  const { sessions } = useStore(selectTimesheet);
  const addSession = useStore(selectAddTimesheetSession);
  const deleteSession = useStore(selectDeleteTimesheetSession);
  const toast = useToast();

  const [mode, setMode] = useState('stopwatch');
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [countdownStart, setCountdownStart] = useState(1500);
  const [taskName, setTaskName] = useState('');
  const [activeTab, setActiveTab] = useState('timer');
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime(t => {
          if (mode === 'countdown') {
            if (t <= 1) {
              setIsRunning(false);
              toast.success('Focus session complete! 🎉');
              return 0;
            }
            return t - 1;
          }
          return t + 1;
        });
      }, 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isRunning, mode]);

  const progress = mode === 'countdown' && countdownStart > 0
    ? ((countdownStart - time) / countdownStart) * 100
    : 0;

  const circumference = 2 * Math.PI * 90;
  const strokeDash = circumference - (progress / 100) * circumference;

  const handleStart = () => {
    if (!taskName.trim()) { toast.error('Enter a task name first'); return; }
    if (mode === 'countdown' && time === 0) setTime(countdownStart);
    setIsRunning(true);
  };

  const handlePause = () => { setIsRunning(false); toast.info('Session paused'); };

  const handleStop = () => {
    const dur = mode === 'countdown' ? (countdownStart - time) : time;
    setIsRunning(false);
    if (dur > 5) {
      addSession({ task: taskName || 'Focus Session', duration: dur, date: new Date().toLocaleString() });
      toast.success('Session logged ✓');
    }
    setTime(0);
    setTaskName('');
  };

  const totalTime = useMemo(() => sessions.reduce((a, s) => a + s.duration, 0), [sessions]);
  const todaySessions = sessions.filter(s => s.date?.includes(new Date().toLocaleDateString()));

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem', letterSpacing: '0.2em' }}>Productivity Engine</p>
          <h2 className="text-display text-gradient" style={{ fontSize: '2.4rem' }}>Chrono Timesheet</h2>
          <p className="text-secondary" style={{ marginTop: '0.4rem' }}>Deep work tracking with precision timers and session analytics.</p>
        </div>
        <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Activity size={20} color="var(--accent)" />
          <div>
            <p className="label-caps" style={{ fontSize: '0.55rem' }}>Total Tracked (All Time)</p>
            <p className="text-display" style={{ fontSize: '1.4rem' }}>{fmt(totalTime)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border)', width: 'fit-content' }}>
        {['timer', 'log'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '8px 24px', borderRadius: '10px', border: 'none',
            background: activeTab === t ? 'var(--accent)' : 'transparent',
            color: activeTab === t ? '#fff' : 'var(--text-3)',
            fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            transition: 'all 0.3s ease',
          }}>{t === 'timer' ? '⏱ Timer' : '📋 Log'}</button>
        ))}
      </div>

      {activeTab === 'timer' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
          {/* Circular Timer */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem', gap: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: '250px', height: '250px', background: isRunning ? 'var(--success)' : 'var(--accent)', filter: 'blur(80px)', opacity: 0.1, transition: 'background 1s ease, opacity 0.5s ease', pointerEvents: 'none' }} />

            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px' }}>
              {['stopwatch', 'countdown'].map(m => (
                <button key={m} onClick={() => { setMode(m); setTime(m === 'countdown' ? countdownStart : 0); setIsRunning(false); }}
                  style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-3)', fontWeight: 700, cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.06em', transition: 'all 0.3s ease' }}>
                  {m === 'stopwatch' ? '⏱ CHRONO' : '⏳ FOCUS'}
                </button>
              ))}
            </div>

            {/* Task Input */}
            <input
              type="text" placeholder="What are you working on?" value={taskName}
              onChange={e => setTaskName(e.target.value)}
              className="form-input" style={{ width: '100%', textAlign: 'center', fontWeight: 600 }}
            />

            {/* SVG Circular Timer */}
            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
              <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border)" strokeWidth="6" />
                {mode === 'countdown' && (
                  <circle cx="100" cy="100" r="90" fill="none"
                    stroke="var(--accent)" strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDash}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 8px var(--accent))' }}
                  />
                )}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <p className="text-display" style={{ fontSize: mode === 'stopwatch' ? '2.4rem' : '2rem', lineHeight: 1, color: isRunning ? 'var(--text-1)' : 'var(--text-2)', transition: 'color 0.5s ease' }}>
                  {fmt(time)}
                </p>
                {isRunning && <p style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 700, marginTop: '4px', animation: 'pulse 1.5s ease infinite', letterSpacing: '0.1em' }}>LIVE</p>}
              </div>
            </div>

            {/* Presets (countdown only) */}
            {mode === 'countdown' && !isRunning && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {PRESETS.map(p => (
                  <button key={p.secs} onClick={() => { setCountdownStart(p.secs); setTime(p.secs); }}
                    style={{ padding: '5px 14px', borderRadius: '8px', border: `1px solid ${countdownStart === p.secs ? 'var(--accent)' : 'var(--border)'}`, background: countdownStart === p.secs ? 'var(--accent-soft)' : 'transparent', color: countdownStart === p.secs ? 'var(--accent)' : 'var(--text-3)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.2s ease' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              {!isRunning ? (
                <button onClick={handleStart} className="btn-primary" style={{ flex: 1, background: 'var(--success)', color: '#000', justifyContent: 'center', fontWeight: 900 }}>
                  <Play size={18} /> START
                </button>
              ) : (
                <button onClick={handlePause} className="btn-primary" style={{ flex: 1, background: 'var(--warning)', color: '#000', justifyContent: 'center', fontWeight: 900 }}>
                  <Pause size={18} /> PAUSE
                </button>
              )}
              <button onClick={() => { setIsRunning(false); setTime(mode === 'countdown' ? countdownStart : 0); }} className="btn-ghost" title="Reset">
                <RotateCcw size={16} />
              </button>
              <button onClick={handleStop} className="btn-ghost" title="Stop & Save" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                <Square size={16} />
              </button>
            </div>
          </div>

          {/* Stats Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <p className="label-caps" style={{ marginBottom: '1rem' }}>Today's Sessions</p>
              <p className="text-display" style={{ fontSize: '2.5rem', color: 'var(--accent)' }}>{todaySessions.length}</p>
              <p className="text-secondary" style={{ marginTop: '0.25rem' }}>
                {fmt(todaySessions.reduce((a, s) => a + s.duration, 0))} tracked today
              </p>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <p className="label-caps" style={{ marginBottom: '1rem' }}>Quick Stats</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Total Sessions', value: sessions.length },
                  { label: 'Avg Duration', value: sessions.length ? fmt(Math.round(totalTime / sessions.length)) : '--' },
                  { label: 'Longest Session', value: sessions.length ? fmt(Math.max(...sessions.map(s => s.duration))) : '--' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                    <span className="text-secondary">{s.label}</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'log' && (
        <div className="glass-card" style={{ padding: 0 }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="text-display" style={{ fontSize: '1.2rem', margin: 0 }}>Session Audit Log</h3>
            <span className="badge">{sessions.length} Sessions</span>
          </div>
          {sessions.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-3)' }}>
              <Timer size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>No sessions logged yet. Start your first focus session!</p>
            </div>
          ) : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {sessions.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.2s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={16} color="var(--accent)" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-1)' }}>{s.task}</p>
                      <p className="text-secondary" style={{ fontSize: '0.72rem', marginTop: '2px' }}>{s.date}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <span className="text-display" style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>{fmt(s.duration)}</span>
                    <button onClick={() => deleteSession(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none'; }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
