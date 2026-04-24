import React, { useState } from 'react';
import { MEDICAL_DATA } from '../data/userData';
import { AlertCircle, Activity, Droplets, Stethoscope, Plus, Trash2 } from 'lucide-react';

export default function Medical({ user, setUser }) {
  const vitalsLog = user?.vitalsLog || [];
  const [logForm, setLogForm] = useState({ type: 'Blood Pressure', value: '', date: new Date().toISOString().slice(0, 10) });

  const addVital = () => {
    if (!logForm.value) return;
    const newLog = [...vitalsLog, { ...logForm, id: Date.now() }];
    setUser({ ...user, vitalsLog: newLog });
    setLogForm({ type: logForm.type, value: '', date: new Date().toISOString().slice(0, 10) });
  };

  const removeVital = (id) => setUser({ ...user, vitalsLog: vitalsLog.filter(v => v.id !== id) });

  const priorityColor = (p) => {
    const s = p?.toLowerCase();
    if (s === 'critical' || s === 'urgent') return 'var(--danger)';
    if (s === 'high') return 'var(--warning)';
    return 'var(--info)';
  };

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Medical</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
          <Stethoscope size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
          Medical & Bio-Vitals
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Clinical baseline data and required diagnostic testing.</p>
      </div>

      {/* Warning Banner */}
      <div className="glass-card pulse-glow" style={{ marginBottom: '1.5rem', borderColor: 'var(--danger)', background: 'rgba(244,63,94,0.06)' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Required Blood Panels */}
        <div className="glass-card">
          <span className="card-title">Required Blood Panels</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.85rem' }}>
            {MEDICAL_DATA.testsRequired.map((test, i) => (
              <div key={i} style={{
                padding: '0.85rem 1rem', background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${priorityColor(test.priority)}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{test.name}</span>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: priorityColor(test.priority),
                    padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                    background: `${priorityColor(test.priority)}15`,
                  }}>{test.priority}</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Frequency: {test.frequency}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vitals Log — Dynamic */}
        <div className="glass-card">
          <span className="card-title">Log Vitals</span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <select value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value })} className="form-input" style={{ width: 'auto' }}>
              {['Blood Pressure', 'Heart Rate', 'Blood Sugar', 'SpO2', 'Temperature', 'Weight'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" placeholder="Value" value={logForm.value}
              onChange={e => setLogForm({ ...logForm, value: e.target.value })} className="form-input" style={{ flex: 1 }} />
            <input type="date" value={logForm.date}
              onChange={e => setLogForm({ ...logForm, date: e.target.value })} className="form-input" style={{ width: 'auto' }} />
            <button onClick={addVital} className="btn-primary"><Plus size={16} /></button>
          </div>

          {vitalsLog.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[...vitalsLog].reverse().slice(0, 10).map(v => (
                <div key={v.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>{v.type}: {v.value}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: '0.5rem' }}>{v.date}</span>
                  </div>
                  <button onClick={() => removeVital(v.id)} style={{ background: 'rgba(248,113,113,0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '5px', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <Activity size={36} style={{ color: 'var(--text-3)', opacity: 0.25, marginBottom: '0.5rem' }} />
              <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>No vitals logged yet. Start tracking your health data.</p>
            </div>
          )}

          <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 700 }}>Pro-Tip:</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Purchase a home BP cuff (~₹1000) for morning/evening tracking.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
