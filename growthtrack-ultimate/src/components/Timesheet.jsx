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
  const [hourlyRate, setHourlyRate] = useState(50);
  const [manualForm, setManualForm] = useState({ task: '', duration: '', date: new Date().toLocaleString() });
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
  }, [isRunning, mode, toast]);

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

  const handleAddManual = async () => {
    if (!manualForm.task.trim()) return toast.error('Task name is required');
    const mins = parseFloat(manualForm.duration);
    if (!mins || mins <= 0) return toast.error('Duration must be > 0 minutes');
    const secs = Math.round(mins * 60);
    await addSession({ task: manualForm.task.trim(), duration: secs, date: manualForm.date });
    toast.success('Manual session added');
    setManualForm({ task: '', duration: '', date: new Date().toLocaleString() });
  };

  const totalTime = useMemo(() => sessions.reduce((a, s) => a + s.duration, 0), [sessions]);
  const todaySessions = sessions.filter(s => s.date?.includes(new Date().toLocaleDateString()));

  const byTask = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      const key = s.task || 'Unnamed';
      map[key] = (map[key] || 0) + s.duration;
    });
    return Object.entries(map).map(([task, duration]) => ({ task, duration })).sort((a, b) => b.duration - a.duration).slice(0, 5);
  }, [sessions]);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem', letterSpacing: '0.2em' }}>Productivity Engine</p>
          <h2 className="text-display text-gradient" style={{ fontSize: '2.4rem' }}>Chrono Timesheet</h2>
          <p className="text-secondary" style={{ marginTop: '0.4rem' }}>Deep work tracking with precision timers, manual entries, and session analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Activity size={20} color="var(--accent)" />
            <div>
              <p className="label-caps" style={{ fontSize: '0.55rem' }}>Total Tracked</p>
              <p className="text-display" style={{ fontSize: '1.4rem' }}>{fmt(totalTime)}</p>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', padding: '6px', borderRadius: '8px' }}>
              <span style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 800 }}>$</span>
            </div>
            <div>
              <p className="label-caps" style={{ fontSize: '0.55rem' }}>Billable Earnings</p>
              <p className="text-display" style={{ fontSize: '1.4rem', color: '#10b981' }}>
                ${((totalTime / 3600) * hourlyRate).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border)', width: 'fit-content' }}>
        {['timer', 'log', 'summary'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '8px 24px', borderRadius: '10px', border: 'none',
            background: activeTab === t ? 'var(--accent)' : 'transparent',
            color: activeTab === t ? '#fff' : 'var(--text-3)',
            fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            transition: 'all 0.3s ease',
          }}>{t === 'timer' ? '⏱ Timer' : t === 'log' ? '📋 Log' : '📊 Summary'}</button>
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

          {/* Stats & Manual Entry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <p className="label-caps" style={{ marginBottom: '1rem' }}>Today's Sessions</p>
              <p className="text-display" style={{ fontSize: '2.5rem', color: 'var(--accent)' }}>{todaySessions.length}</p>
              <p className="text-secondary" style={{ marginTop: '0.25rem' }}>
                {fmt(todaySessions.reduce((a, s) => a + s.duration, 0))} tracked today
              </p>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <p className="label-caps" style={{ marginBottom: '1rem' }}>Quick Manual Entry</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text" className="form-input" placeholder="Task name"
                  value={manualForm.task}
                  onChange={e => setManualForm({ ...manualForm, task: e.target.value })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem' }}>
                  <input
                    type="number" className="form-input" placeholder="Duration (minutes)"
                    value={manualForm.duration}
                    min="1"
                    onChange={e => setManualForm({ ...manualForm, duration: e.target.value })}
                  />
                  <input
                    type="text" className="form-input" value={manualForm.date}
                    onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                  />
                </div>
                <button className="btn-primary" onClick={handleAddManual}>
                  <CheckCircle size={16} /> ADD MANUAL SESSION
                </button>
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
                  className="hover-bg-subtle">
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
                    <button onClick={() => deleteSession(s.id)} className="hover-bg-danger-subtle" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', borderRadius: '6px', display: 'flex' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Hourly Rate ($):</label>
            <input type="number" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-1)', width: '100px', outline: 'none' }} />
          </div>
          
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <p className="label-caps" style={{ marginBottom: '1rem' }}>Today's Block Timeline</p>
            <div style={{ position: 'relative', height: '40px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              {todaySessions.map((s, i) => {
                const end = new Date(s.date);
                if (isNaN(end.getTime())) return null;
                const start = new Date(end.getTime() - s.duration * 1000);
                const startPercent = ((start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds()) / 86400) * 100;
                const widthPercent = (s.duration / 86400) * 100;
                return (
                  <div key={i} title={`${s.task} (${fmt(s.duration)})`}
                    style={{ position: 'absolute', left: `${startPercent}%`, width: `${widthPercent}%`, height: '100%', background: 'var(--accent)', opacity: 0.8, borderRight: '1px solid rgba(0,0,0,0.2)' }} />
                );
              })}
              {/* Markers for 0, 6, 12, 18, 24 */}
              {[0, 25, 50, 75].map(p => (
                <div key={p} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.65rem', color: 'var(--text-3)' }}>
              <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span style={{ opacity: 0 }}>12 AM</span>
            </div>
          </div>
          
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <p className="label-caps" style={{ marginBottom: '1rem' }}>Top Focus Streams</p>
            {byTask.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Log some sessions to see your breakdown by task.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {byTask.map(row => (
                  <div key={row.task} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{row.task}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>{fmt(row.duration)} <span style={{ color: '#10b981', marginLeft: '8px', fontSize: '0.75rem' }}>(${((row.duration / 3600) * hourlyRate).toFixed(2)})</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
