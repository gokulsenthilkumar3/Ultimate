import React, { useMemo, useState } from 'react';
import useStore, {
  selectMedicalData,
  selectVitalsLogs,
  selectAddVitalLog,
  selectMedications,
  selectAddMedication,
  selectDeleteMedication,
} from '../store/useStore';
import { AlertCircle, Activity, Droplets, Stethoscope, Plus, Trash2, Printer } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Medical({ user }) {
  const dbMedical = useStore(selectMedicalData);
  const medicalData = dbMedical || { testsRequired: [] };

  const vitalsLogs = useStore(selectVitalsLogs) || [];
  const addVitalLog = useStore(selectAddVitalLog);

  const medications = useStore(selectMedications) || [];
  const addMedication = useStore(selectAddMedication);
  const deleteMedication = useStore(selectDeleteMedication);

  const [logForm, setLogForm] = useState({
    type: 'Blood Pressure',
    value: '',
    unit: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [medForm, setMedForm] = useState({
    name: '',
    dose: '',
    frequency: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
  });

  const recentVitals = useMemo(
    () => [...vitalsLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [vitalsLogs]
  );

  const toast = useToast();

  const addVital = async () => {
    if (!logForm.value.trim()) return toast.error('Please enter a value for this vital reading.');
    try {
      await addVitalLog({
        date: logForm.date,
        type: logForm.type,
        value: Number(logForm.value) || null,
        unit: logForm.unit || null,
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
      setMedForm({
        name: '',
        dose: '',
        frequency: '',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: '',
      });
      toast.success(`${medForm.name} added to your medication list.`);
    } catch {
      toast.error('Failed to save medication.');
    }
  };

  const handleDeleteMed = (m) => {
    deleteMedication(m.id);
    toast.info(`${m.name} removed`, 5000, {
      action: { label: 'Undo', onClick: () => addMedication(m) }
    });
  };

  const priorityColor = (p) => {
    const s = p?.toLowerCase();
    if (s === 'critical' || s === 'urgent') return 'var(--danger)';
    if (s === 'high') return 'var(--warning)';
    return 'var(--info)';
  };

  return (
    <div className="fade-in medical-theme" style={{ padding: '0.5rem 0' }} id="medical-report">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--danger)' }}>Clinical Overview</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem', color: 'var(--text-1)' }}>
            <Stethoscope size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem', color: 'var(--danger)' }} />
            Medical History
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Clinical baseline data, required diagnostics, and medication tracking.</p>
        </div>
        <button className="btn-primary no-print" onClick={() => window.print()} style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}>
          <Printer size={16} /> Export PDF
        </button>
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
            {medicalData.testsRequired.map((test, i) => (
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

        {/* Vitals Log — Supabase-backed */}
        <div className="glass-card">
          <span className="card-title">Log Vitals</span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <select
              value={logForm.type}
              onChange={e => setLogForm({ ...logForm, type: e.target.value })}
              className="form-input"
              style={{ width: 'auto' }}
            >
              {['Blood Pressure', 'Heart Rate', 'Blood Sugar', 'SpO2', 'Temperature', 'Weight'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Value"
              value={logForm.value}
              onChange={e => setLogForm({ ...logForm, value: e.target.value })}
              className="form-input"
              style={{ flex: 1 }}
            />
            <input
              type="text"
              placeholder="Unit (mmHg, bpm, mg/dL)"
              value={logForm.unit}
              onChange={e => setLogForm({ ...logForm, unit: e.target.value })}
              className="form-input"
              style={{ width: 'auto' }}
            />
            <input
              type="date"
              value={logForm.date}
              onChange={e => setLogForm({ ...logForm, date: e.target.value })}
              className="form-input"
              style={{ width: 'auto' }}
            />
            <button onClick={addVital} className="btn-primary" title="Add vital reading">
              <Plus size={16} />
            </button>
          </div>

          {recentVitals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {recentVitals.map((v, idx) => (
                <div
                  key={`${v.date}-${v.type}-${idx}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>
                      {v.type}: {v.value}{v.unit ? ` ${v.unit}` : ''}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: '0.5rem' }}>{v.date}</span>
                  </div>
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

      {/* Medications tracker */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="card-title">Medications</span>
          <Droplets size={18} style={{ color: 'var(--accent)' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Name (e.g., Vitamin D)"
            value={medForm.name}
            onChange={e => setMedForm({ ...medForm, name: e.target.value })}
            className="form-input"
            style={{ flex: 1, minWidth: 120 }}
          />
          <input
            type="text"
            placeholder="Dose (e.g., 1000 IU)"
            value={medForm.dose}
            onChange={e => setMedForm({ ...medForm, dose: e.target.value })}
            className="form-input"
            style={{ flex: 1, minWidth: 120 }}
          />
          <input
            type="text"
            placeholder="Frequency (e.g., Daily)"
            value={medForm.frequency}
            onChange={e => setMedForm({ ...medForm, frequency: e.target.value })}
            className="form-input"
            style={{ flex: 1, minWidth: 120 }}
          />
          <input
            type="date"
            value={medForm.start_date}
            onChange={e => setMedForm({ ...medForm, start_date: e.target.value })}
            className="form-input"
            style={{ width: 'auto' }}
          />
          <input
            type="date"
            value={medForm.end_date}
            onChange={e => setMedForm({ ...medForm, end_date: e.target.value })}
            className="form-input"
            style={{ width: 'auto' }}
          />
          <button onClick={addMed} className="btn-primary" title="Add medication">
            <Plus size={16} />
          </button>
        </div>

        {medications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {medications.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>{m.name}</div>
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
                <button
                  onClick={() => handleDeleteMed(m)}
                  style={{
                    background: 'rgba(248,113,113,0.1)',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                  }}
                  title="Remove medication"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '1.25rem 0 0.25rem', fontSize: '0.82rem', color: 'var(--text-3)' }}>
            No medications tracked yet. Use this to log prescriptions and key supplements.
          </div>
        )}
      </div>
    </div>
  );
}
