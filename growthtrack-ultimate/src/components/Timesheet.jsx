import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Clock, Play, Pause, Square, Plus, Trash2, Download, DollarSign, BarChart2, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';
import { FixedSizeList as List } from 'react-window';

const TOOLTIP_STYLE = { background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-1)', backdropFilter: 'blur(12px)', fontSize: '0.8rem' };
const PROJECTS_LIST = ['General', 'Development', 'Design', 'Research', 'Meetings', 'Admin', 'Marketing', 'Other'];
const DEFAULT_RATE = 50; // USD/hr

function padTime(n) { return String(n).padStart(2, '0'); }
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${padTime(h)}:${padTime(m)}:${padTime(s)}`;
}
function formatHours(seconds) {
  return (seconds / 3600).toFixed(2) + 'h';
}

export default function Timesheet() {
  const toast = useToast();
  const timesheetEntries = useStore(s => s.timesheetEntries) || [];
  const addTimesheetEntry    = useStore(s => s.addTimesheetEntry);
  const deleteTimesheetEntry = useStore(s => s.deleteTimesheetEntry);

  const [tab, setTab] = useState('timer');
  const [running,   setRunning]   = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [project,   setProject]   = useState('General');
  const [task,      setTask]       = useState('');
  const [billable,  setBillable]  = useState(true);
  const [rate,      setRate]      = useState(DEFAULT_RATE);
  const [notes,     setNotes]     = useState('');
  const intervalRef = useRef(null);

  // Manual entry form
  const [manualForm, setManualForm] = useState({ project: 'General', task: '', date: new Date().toISOString().slice(0, 10), hours: '', minutes: '', billable: true, notes: '' });
  const [showManual, setShowManual] = useState(false);

  // Stopwatch logic
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const startTimer = () => {
    setStartTime(new Date().toISOString());
    setRunning(true);
    toast.info('Timer started');
  };

  const pauseTimer = () => setRunning(false);
  const resumeTimer = () => setRunning(true);

  const stopTimer = () => {
    if (elapsed < 10) { toast.error('Session too short (< 10 seconds)'); return; }
    setRunning(false);
    const totalSeconds = elapsed;
    const hours = totalSeconds / 3600;
    const earnings = billable ? hours * rate : 0;
    const entry = {
      id: Date.now(),
      project, task: task || 'Work session',
      date: new Date().toISOString().slice(0, 10),
      seconds: totalSeconds,
      hours: +hours.toFixed(4),
      billable,
      earnings: +earnings.toFixed(2),
      notes,
      startTime,
      endTime: new Date().toISOString(),
    };
    if (typeof addTimesheetEntry === 'function') addTimesheetEntry(entry);
    toast.success(`⏱ Session saved: ${formatHours(totalSeconds)} · ${billable ? `$${earnings.toFixed(2)}` : 'Non-billable'}`);
    setElapsed(0); setStartTime(null); setTask(''); setNotes('');
  };

  const saveManual = () => {
    const totalSeconds = (Number(manualForm.hours) || 0) * 3600 + (Number(manualForm.minutes) || 0) * 60;
    if (totalSeconds < 60) { toast.error('Duration must be at least 1 minute'); return; }
    const hours = totalSeconds / 3600;
    const earnings = manualForm.billable ? hours * rate : 0;
    const entry = {
      id: Date.now(),
      project: manualForm.project, task: manualForm.task || 'Manual entry',
      date: manualForm.date, seconds: totalSeconds, hours: +hours.toFixed(4),
      billable: manualForm.billable, earnings: +earnings.toFixed(2),
      notes: manualForm.notes, startTime: null, endTime: null,
    };
    if (typeof addTimesheetEntry === 'function') addTimesheetEntry(entry);
    toast.success('Manual entry saved');
    setManualForm({ project: 'General', task: '', date: new Date().toISOString().slice(0, 10), hours: '', minutes: '', billable: true, notes: '' });
    setShowManual(false);
  };

  // Analytics
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }, []);

  const stats = useMemo(() => {
    const all = timesheetEntries;
    const todayEntries = all.filter(e => e.date === today);
    const weekEntries  = all.filter(e => e.date >= thisWeek);
    const billableAll  = all.filter(e => e.billable);
    return {
      totalSeconds:   all.reduce((s, e) => s + (e.seconds || 0), 0),
      todaySeconds:   todayEntries.reduce((s, e) => s + (e.seconds || 0), 0),
      weekSeconds:    weekEntries.reduce((s, e) => s + (e.seconds || 0), 0),
      totalEarnings:  billableAll.reduce((s, e) => s + (e.earnings || 0), 0),
      weekEarnings:   weekEntries.filter(e => e.billable).reduce((s, e) => s + (e.earnings || 0), 0),
    };
  }, [timesheetEntries, today, thisWeek]);

  const byProject = useMemo(() => {
    const map = {};
    timesheetEntries.forEach(e => {
      if (!map[e.project]) map[e.project] = 0;
      map[e.project] += e.seconds || 0;
    });
    return Object.entries(map).map(([project, seconds]) => ({ project, hours: +(seconds / 3600).toFixed(2) })).sort((a, b) => b.hours - a.hours);
  }, [timesheetEntries]);

  // 7-day chart
  const last7 = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayEntries = timesheetEntries.filter(e => e.date === key);
      const hours = dayEntries.reduce((s, e) => s + (e.seconds || 0), 0) / 3600;
      const earnings = dayEntries.filter(e => e.billable).reduce((s, e) => s + (e.earnings || 0), 0);
      data.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), hours: +hours.toFixed(2), earnings: +earnings.toFixed(2) });
    }
    return data;
  }, [timesheetEntries]);

  const exportCSV = useCallback(() => {
    const headers = 'Date,Project,Task,Hours,Billable,Earnings,Notes';
    const rows = timesheetEntries.map(e => [e.date, e.project, e.task || '', e.hours, e.billable ? 'Yes' : 'No', e.earnings || 0, e.notes || ''].map(v => JSON.stringify(v)).join(','));
    const csv = [headers, ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `timesheet-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Timesheet exported');
  }, [timesheetEntries, today]);

  const recentEntries = useMemo(() => [...timesheetEntries].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [timesheetEntries]);

  // Block timeline (today's entries as horizontal blocks)
  const todayTimeline = useMemo(() => {
    return timesheetEntries.filter(e => e.date === today && e.startTime && e.endTime).map(e => ({
      ...e,
      startMs: new Date(e.startTime).getTime(),
      endMs:   new Date(e.endTime).getTime(),
    })).sort((a, b) => a.startMs - b.startMs);
  }, [timesheetEntries, today]);

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Productivity</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Timesheet</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Time tracking · Billable hours · Earnings</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Today',        val: formatHours(stats.todaySeconds),  color: 'var(--accent)' },
          { label: 'This Week',    val: formatHours(stats.weekSeconds),   color: '#10b981' },
          { label: 'Total',        val: formatHours(stats.totalSeconds),  color: '#0ea5e9' },
          { label: 'Wk Earnings',  val: `$${stats.weekEarnings.toFixed(0)}`, color: '#fbbf24' },
          { label: 'Total Earned', val: `$${stats.totalEarnings.toFixed(0)}`, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>{s.val}</p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {['timer', 'log', 'analytics'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: tab === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: tab === t ? '#000' : 'var(--text-3)', border: 'none', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Timer tab */}
      {tab === 'timer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Stopwatch */}
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
            {/* Big clock */}
            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '3.5rem', fontWeight: 900, color: running ? '#10b981' : 'var(--text-1)', letterSpacing: '0.05em', marginBottom: '1rem', textShadow: running ? '0 0 30px rgba(16,185,129,0.4)' : 'none', transition: 'all 0.3s' }}>
              {formatDuration(elapsed)}
            </div>
            {running && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', margin: '0 auto 1rem', animation: 'pulse 1s infinite' }} />}

            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
              {!running && elapsed === 0 && (
                <button onClick={startTimer} style={{ padding: '0.75rem 2rem', borderRadius: '12px', background: '#10b981', border: 'none', color: '#fff', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Play size={20} /> START
                </button>
              )}
              {running && (
                <button onClick={pauseTimer} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: '#f59e0b', border: 'none', color: '#000', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pause size={18} /> PAUSE
                </button>
              )}
              {!running && elapsed > 0 && (
                <button onClick={resumeTimer} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: '#10b981', border: 'none', color: '#fff', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Play size={18} /> RESUME
                </button>
              )}
              {elapsed > 0 && (
                <button onClick={stopTimer} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: '#6366f1', border: 'none', color: '#fff', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Square size={18} /> STOP & SAVE
                </button>
              )}
            </div>

            {/* Earnings preview */}
            {elapsed > 0 && billable && (
              <div style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <DollarSign size={16} color="#fbbf24" />
                <span style={{ fontWeight: 900, color: '#fbbf24', fontSize: '1.1rem' }}>+${((elapsed / 3600) * rate).toFixed(2)}</span>
                <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>@ ${rate}/hr</span>
              </div>
            )}

            {/* Session metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem', maxWidth: '540px', margin: '0 auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '4px', fontWeight: 700 }}>Project</label>
                <select value={project} onChange={e => setProject(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }}>
                  {PROJECTS_LIST.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '4px', fontWeight: 700 }}>Task / Description</label>
                <input value={task} onChange={e => setTask(e.target.value)} placeholder="What are you working on?" className="form-input" style={{ fontSize: '0.82rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '4px', fontWeight: 700 }}>Hourly Rate ($)</label>
                <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="form-input" style={{ fontSize: '0.82rem' }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingTop: '1.2rem' }}>
                  <div onClick={() => setBillable(v => !v)} style={{ width: '32px', height: '18px', borderRadius: '99px', background: billable ? '#10b981' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: '2px', left: billable ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: billable ? '#10b981' : 'var(--text-3)' }}>Billable</span>
                </label>
              </div>
            </div>
          </div>

          {/* Today's block timeline */}
          {todayTimeline.length > 0 && (
            <div className="glass-card">
              <span className="card-title">Today's Timeline</span>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Visualisation of today's timed sessions (auto-timed only)</p>
              <div style={{ position: 'relative', height: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', overflow: 'hidden' }}>
                {(() => {
                  const dayStart = new Date(today + 'T06:00:00').getTime();
                  const dayEnd   = new Date(today + 'T22:00:00').getTime();
                  const range    = dayEnd - dayStart;
                  return todayTimeline.map((e, i) => {
                    const left  = Math.max(0, (e.startMs - dayStart) / range) * 100;
                    const width = Math.min(100 - left, (e.endMs - e.startMs) / range * 100);
                    const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6'];
                    return (
                      <div key={e.id} title={`${e.project}: ${e.task} (${formatHours(e.seconds)})`} style={{
                        position: 'absolute', top: '10px', height: '40px', borderRadius: '6px',
                        left: `${left}%`, width: `${Math.max(0.5, width)}%`,
                        background: colors[i % colors.length], opacity: 0.8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#fff', padding: '0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.project}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>06:00</span>
                <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>22:00</span>
              </div>
            </div>
          )}

          {/* Manual entry */}
          <button onClick={() => setShowManual(s => !s)} style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', padding: '0.65rem', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Plus size={13} /> Add manual entry
          </button>
          {showManual && (
            <div className="glass-card">
              <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>Manual Entry</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <select value={manualForm.project} onChange={e => setManualForm(f => ({ ...f, project: e.target.value }))} className="form-input">
                  {PROJECTS_LIST.map(p => <option key={p}>{p}</option>)}
                </select>
                <input placeholder="Task description" value={manualForm.task} onChange={e => setManualForm(f => ({ ...f, task: e.target.value }))} className="form-input" />
                <div>
                  <label style={{ fontSize: '0.62rem', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Date</label>
                  <input type="date" value={manualForm.date} onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))} className="form-input" />
                </div>
                <input type="number" placeholder="Hours" value={manualForm.hours} onChange={e => setManualForm(f => ({ ...f, hours: e.target.value }))} className="form-input" />
                <input type="number" placeholder="Minutes" value={manualForm.minutes} onChange={e => setManualForm(f => ({ ...f, minutes: e.target.value }))} className="form-input" />
                <input placeholder="Notes" value={manualForm.notes} onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))} className="form-input" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button onClick={() => setShowManual(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
                <button onClick={saveManual} className="btn-primary">Save</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log tab */}
      {tab === 'log' && (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          {recentEntries.length === 0 ? (
            <EmptyState icon={Clock} title="No Entries" description="Start the timer to log your first session." />
          ) : (<>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Project', 'Task', 'Duration', 'Billable', 'Earnings', ''].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
            </thead>
          </table>
          <div style={{ flex: 1, minHeight: '400px' }}>
            <List
              height={400}
              itemCount={recentEntries.length}
              itemSize={36}
              width="100%"
              itemData={recentEntries}
            >
              {({ index, style, data }) => {
                const e = data[index];
                return (
                  <div style={{ ...style, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: '15%', padding: '0 0.6rem', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: '0.72rem' }}>{e.date}</div>
                    <div style={{ width: '15%', padding: '0 0.6rem', fontWeight: 700, fontSize: '0.78rem' }}>{e.project}</div>
                    <div style={{ width: '25%', padding: '0 0.6rem', color: 'var(--text-2)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.task || '—'}</div>
                    <div style={{ width: '15%', padding: '0 0.6rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent)', fontSize: '0.78rem' }}>{formatDuration(e.seconds || 0)}</div>
                    <div style={{ width: '15%', padding: '0 0.6rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: '99px', fontWeight: 700, background: e.billable ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)', color: e.billable ? '#10b981' : '#6b7280' }}>{e.billable ? 'Billable' : 'Non-bill.'}</span>
                    </div>
                    <div style={{ width: '10%', padding: '0 0.6rem', fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, fontSize: '0.78rem' }}>{e.earnings ? `$${e.earnings.toFixed(2)}` : '—'}</div>
                    <div style={{ width: '5%', padding: '0 0.6rem', display: 'flex', justifyContent: 'center' }}>
                      <button onClick={() => { if (typeof deleteTimesheetEntry === 'function') deleteTimesheetEntry(e.id); }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              }}
            </List>
          </>)}
        </div>
      )}

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card">
            <span className="card-title">Hours by Day — Last 7 Days</span>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last7} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit="h" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="hours" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card">
            <span className="card-title">Earnings by Day — Last 7 Days</span>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`$${v}`, 'Earnings']} />
                <Bar dataKey="earnings" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card">
            <span className="card-title">Time by Project</span>
            {byProject.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: '0.75rem' }}>No entries yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                {byProject.map(row => {
                  const maxH = byProject[0]?.hours || 1;
                  return (
                    <div key={row.project}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{row.project}</span>
                        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--accent)' }}>{row.hours}h</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                        <div style={{ height: '100%', width: `${(row.hours / maxH) * 100}%`, background: 'var(--accent)', borderRadius: '99px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
