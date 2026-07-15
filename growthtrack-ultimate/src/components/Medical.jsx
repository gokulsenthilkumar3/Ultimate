import React, { useMemo, useState } from 'react';
import useStore, {
  selectMedicalData,
  selectVitalsLogs,
  selectAddVitalLog,
  selectMedications,
  selectAddMedication,
  selectDeleteMedication,
} from '../store/useStore';
import { AlertCircle, Activity, Droplets, Stethoscope, Plus, Trash2, Printer, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine,
} from 'recharts';

const VITAL_TYPES = ['Blood Pressure', 'Heart Rate', 'Blood Sugar', 'SpO2', 'Temperature', 'Weight'];

const VITAL_META = {
  'Blood Pressure': { color: '#ef4444', unit: 'mmHg', normalRange: [90, 120], icon: '🫀' },
  'Heart Rate':     { color: '#f97316', unit: 'bpm',  normalRange: [60, 100], icon: '💓' },
  'Blood Sugar':    { color: '#f59e0b', unit: 'mg/dL',normalRange: [70, 100], icon: '🩸' },
  'SpO2':           { color: '#0ea5e9', unit: '%',    normalRange: [95, 100], icon: '🫁' },
  'Temperature':    { color: '#8b5cf6', unit: '°C',   normalRange: [36.1, 37.2], icon: '🌡️' },
  'Weight':         { color: '#10b981', unit: 'kg',   normalRange: null, icon: '⚖️' },
};

const tooltipStyle = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: '8px', backdropFilter: 'blur(12px)',
  color: 'var(--text-1)', fontSize: '0.76rem',
};

// ── Health Timeline Visualizer ────────────────────────────────────────────
function VitalsTimeline({ vitalsLogs }) {
  const [activeType, setActiveType] = useState('Heart Rate');

  const types = useMemo(() =>
    VITAL_TYPES.filter(t => vitalsLogs.some(l => l.type === t)),
  [vitalsLogs]);

  const chartData = useMemo(() => {
    const logs = vitalsLogs
      .filter(l => l.type === activeType && l.value !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map(l => ({ date: l.date.slice(5), value: Number(l.value), unit: l.unit || VITAL_META[activeType]?.unit || '' }));
    return logs;
  }, [vitalsLogs, activeType]);

  const meta = VITAL_META[activeType] || { color: 'var(--accent)', unit: '', icon: '📊' };

  const latest  = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const prev    = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const trend   = latest && prev ? latest.value - prev.value : null;
  const TrendIcon = trend === null ? Minus : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend === null ? 'var(--text-3)' : trend > 0 ? '#f59e0b' : '#10b981';

  if (types.length === 0) return null;

  return (
    <div className="glass-card mb-lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <Activity size={18} color="var(--accent)" />
        <span className="card-title" style={{ margin: 0 }}>Health Timeline</span>
      </div>

      {/* Type selector */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {types.map(t => {
          const m = VITAL_META[t] || {};
          const active = activeType === t;
          return (
            <button key={t} onClick={() => setActiveType(t)} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
              background: active ? m.color : 'rgba(255,255,255,0.05)',
              color: active ? '#fff' : 'var(--text-3)',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}>
              <span>{m.icon}</span> {t}
            </button>
          );
        })}
      </div>

      {/* Summary strip */}
      {latest && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderRadius: '10px', minWidth: '120px' }}>
            <p className="label-caps" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>Latest Reading</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 900, color: meta.color, lineHeight: 1 }}>
              {latest.value}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: '4px' }}>{meta.unit}</span>
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>{latest.date}</p>
          </div>
          {trend !== null && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
              <p className="label-caps" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>Change</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: trendColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendIcon size={16} />
                {trend > 0 ? '+' : ''}{trend.toFixed(1)} {meta.unit}
              </p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>vs previous</p>
            </div>
          )}
          {meta.normalRange && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
              <p className="label-caps" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>Normal Range</p>
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-2)' }}>
                {meta.normalRange[0]}–{meta.normalRange[1]} {meta.unit}
              </p>
              <p style={{
                fontSize: '0.65rem', marginTop: '2px', fontWeight: 700,
                color: (latest.value >= meta.normalRange[0] && latest.value <= meta.normalRange[1]) ? '#10b981' : '#ef4444',
              }}>
                {(latest.value >= meta.normalRange[0] && latest.value <= meta.normalRange[1]) ? '✓ Normal' : '⚠ Out of range'}
              </p>
            </div>
          )}
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
            <p className="label-caps" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>Readings</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-1)' }}>{chartData.length}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>last 30 entries</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} ${meta.unit}`, activeType]} />
              {meta.normalRange && (
                <>
                  <ReferenceLine y={meta.normalRange[0]} stroke={meta.color} strokeDasharray="4 2" strokeOpacity={0.4} />
                  <ReferenceLine y={meta.normalRange[1]} stroke={meta.color} strokeDasharray="4 2" strokeOpacity={0.4} />
                </>
              )}
              <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2.5}
                    dot={{ r: 4, fill: meta.color, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: meta.color }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : chartData.length === 1 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', padding: '1.5rem 0', textAlign: 'center' }}>
          Log at least 2 readings to see the trend chart.
        </p>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', padding: '1.5rem 0', textAlign: 'center' }}>
          No {activeType} data yet. Log a reading above.
        </p>
      )}
    </div>
  );
}

// ── Chronological Events Timeline ─────────────────────────────────────────
function EventTimeline({ vitalsLogs, medications }) {
  const events = useMemo(() => {
    const vEvents = vitalsLogs.map(l => ({
      date: l.date,
      label: `${l.type}: ${l.value}${l.unit ? ' ' + l.unit : ''}`,
      icon: VITAL_META[l.type]?.icon || '📋',
      color: VITAL_META[l.type]?.color || 'var(--accent)',
      type: 'vital',
    }));
    const mEvents = medications.map(m => ({
      date: m.start_date || '',
      label: `Started ${m.name} — ${m.dose}`,
      icon: '💊',
      color: '#8b5cf6',
      type: 'med',
    }));
    return [...vEvents, ...mEvents]
      .filter(e => e.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [vitalsLogs, medications]);

  if (events.length === 0) return null;

  return (
    <div className="glass-card mb-lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <Clock size={18} color="var(--accent)" />
        <span className="card-title" style={{ margin: 0 }}>Event Timeline</span>
      </div>
      <div style={{ position: 'relative', paddingLeft: '28px' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: '11px', top: 0, bottom: 0, width: '2px',
          background: 'linear-gradient(to bottom, var(--accent), transparent)',
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {events.map((ev, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '1rem', position: 'relative' }}>
              {/* Dot */}
              <div style={{
                position: 'absolute', left: '-22px', top: '2px',
                width: '12px', height: '12px', borderRadius: '50%',
                background: ev.color, border: '2px solid var(--bg-base)',
                boxShadow: `0 0 8px ${ev.color}55`,
              }} />
              <div style={{ flex: 1, padding: '0.6rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{ev.icon}</span> {ev.label}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', whiteSpace: 'nowrap', marginLeft: '8px' }}>{ev.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Medical({ user }) {
  const dbMedical = useStore(selectMedicalData);
  const medicalData = dbMedical || { testsRequired: [] };
  const vitalsLogs = useStore(selectVitalsLogs) || [];
  const addVitalLog = useStore(selectAddVitalLog);
  const medications = useStore(selectMedications) || [];
  const addMedication = useStore(selectAddMedication);
  const deleteMedication = useStore(selectDeleteMedication);
  const toast = useToast();

  const [logForm, setLogForm] = useState({
    type: 'Blood Pressure', value: '', unit: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [medForm, setMedForm] = useState({
    name: '', dose: '', frequency: '',
    start_date: new Date().toISOString().slice(0, 10), end_date: '',
  });

  const recentVitals = useMemo(
    () => [...vitalsLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12),
    [vitalsLogs]
  );

  const addVital = async () => {
    if (!logForm.value.trim()) return toast.error('Please enter a value for this vital reading.');
    try {
      await addVitalLog({
        date: logForm.date, type: logForm.type,
        value: Number(logForm.value) || null,
        unit: logForm.unit || VITAL_META[logForm.type]?.unit || null,
      });
      setLogForm({ ...logForm, value: '', unit: '' });
      toast.success(`${logForm.type} logged ✓`);
    } catch {
      toast.error('Failed to save vital — check your connection.');
    }
  };

  const addMed = async () => {
    if (!medForm.name.trim()) return toast.error('Medication name is required.');
    if (!medForm.dose.trim()) return toast.error('Dose / dosage is required (e.g. 1000 IU).');
    try {
      await addMedication(medForm);
      setMedForm({ name: '', dose: '', frequency: '', start_date: new Date().toISOString().slice(0, 10), end_date: '' });
      toast.success(`${medForm.name} added.`);
    } catch { toast.error('Failed to save medication.'); }
  };

  const handleDeleteMed = (m) => {
    deleteMedication(m.id);
    toast.info(`${m.name} removed`, 5000, { action: { label: 'Undo', onClick: () => addMedication(m) } });
  };

  const priorityColor = (p) => {
    const s = p?.toLowerCase();
    if (s === 'critical' || s === 'urgent') return 'var(--danger)';
    if (s === 'high') return 'var(--warning)';
    return 'var(--info)';
  };

  return (
    <div className="fade-in medical-theme" style={{ padding: '0.5rem 0' }} id="medical-report">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--danger)' }}>Clinical Overview</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
            <Stethoscope size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem', color: 'var(--danger)' }} />
            Medical History
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Clinical baseline data, required diagnostics, and medication tracking.</p>
        </div>
        <button className="btn-primary no-print" onClick={() => window.print()}
          style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}>
          <Printer size={16} /> Export PDF
        </button>
      </div>

      {/* Warning Banner */}
      <div className="glass-card pulse-glow mb-lg" style={{ borderColor: 'var(--danger)', background: 'rgba(244,63,94,0.06)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <AlertCircle color="var(--danger)" size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ color: 'var(--danger)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Medical Warning</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
              At age {user?.age || 23} with symptomatic fatigue and low libido, clinical bloodwork is the #1 non-negotiable step.
              Do not attempt advanced supplementation without a baseline.
            </p>
          </div>
        </div>
      </div>

      {/* Health Timeline Visualizer (chart per vital type) */}
      <VitalsTimeline vitalsLogs={vitalsLogs} />

      {/* Required Tests + Log Vitals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Required Blood Panels */}
        <div className="glass-card">
          <span className="card-title">Required Blood Panels</span>
          {medicalData.testsRequired.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.75rem' }}>No required tests listed. Connect an API to populate from your health data.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.85rem' }}>
              {medicalData.testsRequired.map((test, i) => (
                <div key={i} style={{
                  padding: '0.85rem 1rem', background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${priorityColor(test.priority)}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{test.name}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                                   color: priorityColor(test.priority), padding: '2px 7px', borderRadius: '4px',
                                   background: `${priorityColor(test.priority)}15` }}>{test.priority}</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Frequency: {test.frequency}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Log Vitals */}
        <div className="glass-card">
          <span className="card-title">Log Vitals</span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <select value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value, unit: VITAL_META[e.target.value]?.unit || '' })}
              className="form-input" style={{ flex: '2 1 160px' }}>
              {VITAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" placeholder={`Value (${VITAL_META[logForm.type]?.unit || ''})`}
              value={logForm.value} onChange={e => setLogForm({ ...logForm, value: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addVital()}
              className="form-input" style={{ flex: '1 1 80px' }} />
            <input type="text" placeholder="Unit" value={logForm.unit}
              onChange={e => setLogForm({ ...logForm, unit: e.target.value })}
              className="form-input" style={{ flex: '1 1 80px' }} />
            <input type="date" value={logForm.date}
              onChange={e => setLogForm({ ...logForm, date: e.target.value })}
              className="form-input" style={{ flex: '1 1 110px' }} />
            <button onClick={addVital} className="btn-primary" title="Add vital">
              <Plus size={16} />
            </button>
          </div>

          {recentVitals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '300px', overflowY: 'auto' }}>
              {recentVitals.map((v, idx) => {
                const meta = VITAL_META[v.type] || {};
                const inRange = meta.normalRange
                  ? v.value >= meta.normalRange[0] && v.value <= meta.normalRange[1]
                  : null;
                return (
                  <div key={`${v.date}-${v.type}-${idx}`} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderLeft: `3px solid ${meta.color || 'var(--accent)'}`,
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {meta.icon} {v.type}: <span style={{ color: meta.color || 'var(--accent)' }}>{v.value}{v.unit ? ` ${v.unit}` : ''}</span>
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: '0.5rem' }}>{v.date}</span>
                    </div>
                    {inRange !== null && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700,
                        color: inRange ? '#10b981' : '#ef4444',
                        background: inRange ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        padding: '2px 6px', borderRadius: '4px',
                      }}>
                        {inRange ? 'Normal' : 'Alert'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <Activity size={36} style={{ color: 'var(--text-3)', opacity: 0.25, marginBottom: '0.5rem' }} />
              <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>No vitals logged yet.</p>
            </div>
          )}

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 700 }}>Pro-Tip:</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Purchase a home BP cuff (~₹1000) for morning/evening tracking.</p>
          </div>
        </div>
      </div>

      {/* Chronological Timeline */}
      <EventTimeline vitalsLogs={vitalsLogs} medications={medications} />

      {/* Medications tracker */}
      <div className="glass-card mb-lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="card-title">Medications &amp; Supplements</span>
          <Droplets size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Name (e.g., Vitamin D)" value={medForm.name}
            onChange={e => setMedForm({ ...medForm, name: e.target.value })}
            className="form-input" style={{ flex: 1, minWidth: 120 }} />
          <input type="text" placeholder="Dose (e.g., 1000 IU)" value={medForm.dose}
            onChange={e => setMedForm({ ...medForm, dose: e.target.value })}
            className="form-input" style={{ flex: 1, minWidth: 100 }} />
          <input type="text" placeholder="Frequency" value={medForm.frequency}
            onChange={e => setMedForm({ ...medForm, frequency: e.target.value })}
            className="form-input" style={{ flex: 1, minWidth: 100 }} />
          <input type="date" value={medForm.start_date}
            onChange={e => setMedForm({ ...medForm, start_date: e.target.value })}
            className="form-input" style={{ width: 'auto' }} />
          <input type="date" value={medForm.end_date}
            onChange={e => setMedForm({ ...medForm, end_date: e.target.value })}
            className="form-input" style={{ width: 'auto' }} />
          <button onClick={addMed} className="btn-primary"><Plus size={16} /></button>
        </div>
        {medications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {medications.map((m) => (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>💊 {m.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    {m.dose && <span>{m.dose}</span>}
                    {m.dose && m.frequency && <span> · </span>}
                    {m.frequency && <span>{m.frequency}</span>}
                    {(m.start_date || m.end_date) && (
                      <span style={{ marginLeft: '0.35rem' }}>
                        ({m.start_date || 'start'} – {m.end_date || 'ongoing'})
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDeleteMed(m)}
                  style={{ background: 'rgba(248,113,113,0.1)', border: 'none', color: 'var(--danger)',
                            cursor: 'pointer', padding: '5px', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', padding: '0.5rem 0' }}>
            No medications tracked yet.
          </p>
        )}
      </div>
    </div>
  );
}
