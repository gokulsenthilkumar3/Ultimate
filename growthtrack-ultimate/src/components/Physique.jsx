import React, { useState, useMemo } from 'react';
import {
  Zap, Target, Layers, Activity,
  ChevronRight, ArrowUpRight, Shield, Flame, Plus, Save, Edit3
} from 'lucide-react';
import useStore, { selectSetActiveTab, selectPhysiqueTargets, selectUpdatePhysiqueTargets } from '../store/useStore';
import { useToast } from '../hooks/useToast';

const DEFAULT_ZONES = [
  { name: 'Core Anterior',   status: 'Cutting',      progress: 68, color: 'var(--accent)', icon: '⚡' },
  { name: 'Posterior Chain', status: 'Maintenance',   progress: 85, color: '#3b82f6',       icon: '⛓️' },
  { name: 'Upper Extremity', status: 'Hypertrophy',   progress: 42, color: '#8b5cf6',       icon: '💪' },
  { name: 'Anatomical Base', status: 'Power',         progress: 91, color: '#10b981',       icon: '🦵' },
];

const DEFAULT_TARGETS = [
  { label: 'Chest Width',    current: '104cm', target: '112cm', progress: 45, type: 'Hypertrophy' },
  { label: 'Waist Diameter', current: '78cm',  target: '72cm',  progress: 82, type: 'Reduction'   },
  { label: 'Quad Volume',    current: '62cm',  target: '68cm',  progress: 30, type: 'Hypertrophy' },
  { label: 'Bicep Peak',     current: '41cm',  target: '44cm',  progress: 55, type: 'Peak'        },
];

export default function Physique({ user }) {
  const toast = useToast();
  const setActiveTab = useStore(selectSetActiveTab);
  const physiqueTargets = useStore(selectPhysiqueTargets);
  const updatePhysiqueTargets = useStore(selectUpdatePhysiqueTargets);

  // Use store data if available, fall back to defaults
  const zones = physiqueTargets?.zones || DEFAULT_ZONES;
  const targets = physiqueTargets?.targets || DEFAULT_TARGETS;

  const [activeZone, setActiveZone] = useState(zones[0]?.name || '');
  const [editingTarget, setEditingTarget] = useState(null);
  const [targetDraft, setTargetDraft] = useState({});

  const handleSaveTarget = (idx) => {
    const updated = targets.map((t, i) => i === idx ? { ...t, ...targetDraft } : t);
    const progress = targetDraft.current && targetDraft.target
      ? Math.min(100, Math.round((parseFloat(targetDraft.current) / parseFloat(targetDraft.target)) * 100))
      : targets[idx].progress;
    updated[idx] = { ...updated[idx], progress };
    updatePhysiqueTargets({ ...(physiqueTargets || {}), targets: updated });
    setEditingTarget(null);
    toast.success('Target updated');
  };

  const handleZoneClick = (zone, idx) => {
    setActiveZone(zone.name);
    // Cycle through statuses on click
    const statuses = ['Cutting', 'Maintenance', 'Hypertrophy', 'Power', 'Recomp'];
    const next = statuses[(statuses.indexOf(zone.status) + 1) % statuses.length];
    const updated = zones.map((z, i) => i === idx ? { ...z, status: next } : z);
    updatePhysiqueTargets({ ...(physiqueTargets || {}), zones: updated });
  };
  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Architectural Blueprint</p>
          <h2 className="text-display" style={{ fontSize: '2rem' }}>Physique Matrix</h2>
          <p className="text-secondary">Precision morphing targets and regional dominance tracking. Click a zone to cycle its phase.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={() => setActiveTab('humanoid')}>
            <Layers size={18} /> VIEW 3D MODEL
          </button>
        </div>
      </div>

      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {zones.map((zone, idx) => (
          <div key={idx} className="glass-card" style={{
            padding: '1.5rem', borderLeft: `4px solid ${zone.color}`,
            cursor: 'pointer', transition: 'all 0.3s ease',
            background: activeZone === zone.name ? 'var(--bg-elevated)' : 'var(--bg-card)'
          }} onClick={() => handleZoneClick(zone, idx)} title="Click to cycle training phase">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{zone.icon}</span>
              <span className="badge" style={{ background: `${zone.color}22`, color: zone.color }}>{zone.status}</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>{zone.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${zone.progress}%`, height: '100%', background: zone.color }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-2)' }}>{zone.progress}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dual-grid">
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
             <Target size={24} color="var(--accent)" />
             <h3 className="text-display" style={{ fontSize: '1.5rem', margin: 0 }}>Metric Targets</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {targets.map((t, i) => (
              <div key={i} style={{ padding: '1.25rem', background: 'var(--bg-dark)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t.label}</p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>{t.type}</span>
                    <button onClick={() => { setEditingTarget(i); setTargetDraft({ current: t.current, target: t.target }); }}
                      title="Edit target" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '2px' }}>
                      <Edit3 size={12} />
                    </button>
                  </div>
                </div>
                {editingTarget === i ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input placeholder="Current (e.g. 104cm)" value={targetDraft.current || ''}
                      onChange={e => setTargetDraft(d => ({ ...d, current: e.target.value }))}
                      className="form-input" style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem' }} />
                    <span style={{ color: 'var(--text-3)' }}>→</span>
                    <input placeholder="Goal (e.g. 112cm)" value={targetDraft.target || ''}
                      onChange={e => setTargetDraft(d => ({ ...d, target: e.target.value }))}
                      className="form-input" style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem' }} />
                    <button className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleSaveTarget(i)}>
                      <Save size={12} /> Save
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{t.current} / <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{t.target}</span></div>
                    <div style={{ width: '150px', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${t.progress}%`, height: '100%', background: 'var(--accent)' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={24} color="var(--success)" />
              <h3 className="text-display" style={{ fontSize: '1.5rem', margin: 0 }}>Anatomic Strategy</h3>
           </div>
           <p className="text-secondary">Current focus is on creating a tapered silhouette by prioritizing shoulder width (medial deltoids) and reducing abdominal circumference.</p>
           
           <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'var(--accent-soft)', borderRadius: '16px', border: '1px solid var(--border-glow)' }}>
              <h4 style={{ color: 'var(--accent)', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} /> Strategic Leverage
              </h4>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>Increase training frequency for lagging muscle groups to 3x per week while maintaining a caloric deficit of 250kcal.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
