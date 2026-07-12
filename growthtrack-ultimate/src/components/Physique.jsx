import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap, Target, Layers, Activity,
  ChevronRight, ArrowUpRight, Shield, Flame, Plus, Save, Edit3, X, ToggleLeft, ToggleRight
} from 'lucide-react';
import useStore, { selectSetActiveTab, selectPhysiqueTargets, selectUpdatePhysiqueTargets } from '../store/useStore';
import use3DStore from '../store/use3DStore';
import toast from 'react-hot-toast';
import PhysiqueRoadmap from './PhysiqueRoadmap';

function calculateBodyFat(gender, waist, neck, height, hip = 0) {
  const w = parseFloat(waist), n = parseFloat(neck), h = parseFloat(height), hi = parseFloat(hip);
  if (!w || !n || !h || (gender === 'F' && !hi)) return null;
  
  if (gender === 'M') {
    if (w - n <= 0) return null;
    return (495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h))) - 450;
  } else {
    if (w + hi - n <= 0) return null;
    return (495 / (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.22100 * Math.log10(h))) - 450;
  }
}

function SilhouetteGuide({ activeMeasurement }) {
  const points = { neck: { y: 25 }, waist: { y: 85 }, hip: { y: 110 }, height: { y: 10 } };
  const activeY = points[activeMeasurement]?.y;
  return (
    <svg viewBox="0 0 100 200" width="100%" height="200" style={{ maxWidth: '120px', margin: '0 auto', display: 'block' }}>
      <path d="M 50 10 C 60 10 60 30 50 30 C 40 30 40 10 50 10 Z" fill="var(--text-3)" />
      <path d="M 50 30 L 50 90 M 50 40 L 20 80 M 50 40 L 80 80 M 50 90 L 30 190 M 50 90 L 70 190" stroke="var(--text-3)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {activeY && (
        <line x1="10" y1={activeY} x2="90" y2={activeY} stroke="var(--accent)" strokeWidth="4" strokeDasharray="4 2" />
      )}
    </svg>
  );
}

const DEFAULT_ZONES = [
  { name: 'Core Anterior',   status: 'Cutting',      progress: 68, color: 'var(--accent)', icon: '\u26a1' },
  { name: 'Posterior Chain', status: 'Maintenance',   progress: 85, color: '#3b82f6',       icon: '\u26d3\ufe0f' },
  { name: 'Upper Extremity', status: 'Hypertrophy',   progress: 42, color: '#8b5cf6',       icon: '\ud83d\udcaa' },
  { name: 'Anatomical Base', status: 'Power',         progress: 91, color: '#10b981',       icon: '\ud83e\uddb5' },
];

const DEFAULT_TARGETS = [
  { label: 'Weight',    current: '63kg', target: '76.5kg', progress: 82, type: 'Hypertrophy' },
  { label: 'Shoulders', current: '107.5cm', target: '123cm', progress: 87, type: 'Hypertrophy' },
  { label: 'Chest',     current: '86.5cm', target: '104.5cm', progress: 82, type: 'Hypertrophy' },
  { label: 'Waist',     current: '82cm',  target: '75cm', progress: 90, type: 'Reduction' },
  { label: 'Arms',      current: '30cm', target: '40.5cm', progress: 74, type: 'Hypertrophy' },
  { label: 'Forearms',  current: '27cm', target: '33.5cm', progress: 80, type: 'Hypertrophy' },
  { label: 'Thighs',    current: '53cm', target: '59cm', progress: 89, type: 'Hypertrophy' },
  { label: 'Calves',    current: '35cm', target: '40cm', progress: 87, type: 'Hypertrophy' },
];

// Unit conversion helpers
const CM_TO_IN = 0.393701;
function convertValue(val, toIn) {
  if (!val) return val;
  // Extract numeric part and unit suffix
  const match = String(val).match(/^([\d.]+)(cm|in)?$/);
  if (!match) return val;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return val;
  if (toIn) return `${(num * CM_TO_IN).toFixed(1)}in`;
  // to cm: if value came in as inches, convert back
  const suffix = match[2];
  if (suffix === 'in') return `${(num / CM_TO_IN).toFixed(1)}cm`;
  return val;
}

export default function Physique({ user }) {
  const toast = useToast();
  const setActiveTab = useStore(selectSetActiveTab);
  const physiqueTargets = useStore(selectPhysiqueTargets);
  const updatePhysiqueTargets = useStore(selectUpdatePhysiqueTargets);

  // Sync user profile metrics to 3D store
  React.useEffect(() => {
    if (!user) return;
    const metrics = {
      weight: parseFloat(user.weight),
      bodyFat: parseFloat(user.bodyFat),
      chest: parseFloat(user.chest),
      shoulders: parseFloat(user.shoulders),
      waist: parseFloat(user.waist),
      arms: parseFloat(user.arms),
      thighs: parseFloat(user.thighs),
      calves: parseFloat(user.calves),
      neck: parseFloat(user.neck),
      forearm: parseFloat(user.forearm),
      hips: parseFloat(user.hips),
      glutes: parseFloat(user.glutes),
      ankle: parseFloat(user.ankle),
      d_size: parseFloat(user.d_size),
      d_girth: parseFloat(user.d_girth),
    };
    
    // Filter out NaN values
    const validMetrics = {};
    Object.keys(metrics).forEach(k => {
      if (!isNaN(metrics[k])) validMetrics[k] = metrics[k];
    });

    if (Object.keys(validMetrics).length > 0) {
      use3DStore.getState().setCurrentMetrics(validMetrics);
    }
  }, [
    user?.weight, user?.bodyFat, user?.chest, user?.shoulders,
    user?.waist, user?.arms, user?.thighs, user?.calves, user?.neck,
    user?.forearm, user?.hips, user?.glutes, user?.ankle, user?.d_size, user?.d_girth
  ]);

  const zones = physiqueTargets?.zones || DEFAULT_ZONES;
  const targets = physiqueTargets?.targets || DEFAULT_TARGETS;

  // Auto-migrate old targets to the new Greek God Roadmap
  useEffect(() => {
    if (targets && targets.length > 0 && targets[0].label === 'Chest Width') {
      updatePhysiqueTargets({ ...(physiqueTargets || {}), targets: DEFAULT_TARGETS });
    }
  }, [targets, physiqueTargets, updatePhysiqueTargets]);

  // Auto-migrate user current stats to match the provided roadmap
  const updateUser = useStore(s => s.updateUser);
  useEffect(() => {
    if (user && user.weight !== 63 && user.shoulders !== 107.5) {
      updateUser({
        primaryGoal: 'Build Muscle',
        weight: 63,
        height: 182,
        shoulders: 107.5,
        chest: 86.5,
        waist: 82,
        arms: 30,
        forearm: 27,
        thighs: 53,
        calves: 35
      });
    }
  }, [user, updateUser]);

  const [activeZone, setActiveZone] = useState(zones[0]?.name || '');
  const [editingTarget, setEditingTarget] = useState(null);
  const [targetDraft, setTargetDraft] = useState({});
  const [unitMode, setUnitMode] = useState('cm');

  const [bfGender, setBfGender] = useState(user?.gender || 'M');
  const [bfHeight, setBfHeight] = useState(user?.height || '');
  const [bfNeck, setBfNeck] = useState('');
  const [bfWaist, setBfWaist] = useState('');
  const [bfHip, setBfHip] = useState('');
  const [activeMeas, setActiveMeas] = useState('');

  const bfPercent = useMemo(() => {
    const val = calculateBodyFat(bfGender, bfWaist, bfNeck, bfHeight, bfHip);
    return val && val > 0 && val < 60 ? val.toFixed(1) : '--';
  }, [bfGender, bfWaist, bfNeck, bfHeight, bfHip]);

  const displayVal = (val) => unitMode === 'in' ? convertValue(val, true) : convertValue(val, false);

  const handleSaveTarget = (idx) => {
    const updated = targets.map((t, i) => i === idx ? { ...t, ...targetDraft } : t);
    const progress = targetDraft.current && targetDraft.target
      ? Math.min(100, Math.round((parseFloat(targetDraft.current) / parseFloat(targetDraft.target)) * 100))
      : targets[idx].progress;
    updated[idx] = { ...updated[idx], progress };
    updatePhysiqueTargets({ ...(physiqueTargets || {}), targets: updated });
    setEditingTarget(null);
    setTargetDraft({});
    toast.success('Target updated');
  };

  const handleCancelEdit = () => {
    setEditingTarget(null);
    setTargetDraft({});
  };

  const handleZoneClick = (zone, idx) => {
    setActiveZone(zone.name);
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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* cm ↔ in unit toggle */}
          <button
            onClick={() => setUnitMode(m => m === 'cm' ? 'in' : 'cm')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.78rem', fontWeight: 700,
            }}
            title="Toggle unit"
          >
            {unitMode === 'cm' ? <ToggleLeft size={16} color="var(--accent)" /> : <ToggleRight size={16} color="var(--accent)" />}
            {unitMode === 'cm' ? 'cm' : 'in'}
          </button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Target size={24} color="var(--accent)" />
              <h3 className="text-display" style={{ fontSize: '1.5rem', margin: 0 }}>Metric Targets</h3>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: '6px' }}>
              Displaying in {unitMode}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {targets.map((t, i) => (
              <div key={i} style={{ padding: '1.25rem', background: 'var(--bg-dark)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t.label}</p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>{t.type}</span>
                    {editingTarget !== i && (
                      <button onClick={() => { setEditingTarget(i); setTargetDraft({ current: t.current, target: t.target }); }}
                        title="Edit target" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '2px' }}>
                        <Edit3 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {editingTarget === i ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input placeholder="Current (e.g. 104cm)" value={targetDraft.current || ''}
                      onChange={e => setTargetDraft(d => ({ ...d, current: e.target.value }))}
                      className="form-input" style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem' }} />
                    <span style={{ color: 'var(--text-3)' }}>&rarr;</span>
                    <input placeholder="Goal (e.g. 112cm)" value={targetDraft.target || ''}
                      onChange={e => setTargetDraft(d => ({ ...d, target: e.target.value }))}
                      className="form-input" style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem' }} />
                    <button className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleSaveTarget(i)}>
                      <Save size={12} /> Save
                    </button>
                    {/* Cancel button */}
                    <button
                      onClick={handleCancelEdit}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)', padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Cancel edit"
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex-between">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                      {displayVal(t.current)} / <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{displayVal(t.target)}</span>
                    </div>
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
            <Activity size={24} color="var(--accent)" />
            <h3 className="text-display" style={{ fontSize: '1.5rem', margin: 0 }}>Body Fat % Calculator</h3>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 120px' }}>
              <SilhouetteGuide activeMeasurement={activeMeas} />
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <span className="badge" style={{ background: 'var(--accent)', color: '#000', fontSize: '1.2rem', padding: '6px 16px' }}>{bfPercent}%</span>
              </div>
            </div>
            <div style={{ flex: '2 1 200px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Gender</label>
                <select className="form-input" value={bfGender} onChange={e => setBfGender(e.target.value)}>
                  <option value="M">Male</option><option value="F">Female</option>
                </select>
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Height (cm)</label>
                <input className="form-input" type="number" value={bfHeight} onChange={e => setBfHeight(e.target.value)} onFocus={() => setActiveMeas('height')} onBlur={() => setActiveMeas('')} />
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Neck (cm)</label>
                <input className="form-input" type="number" value={bfNeck} onChange={e => setBfNeck(e.target.value)} onFocus={() => setActiveMeas('neck')} onBlur={() => setActiveMeas('')} />
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Waist (cm)</label>
                <input className="form-input" type="number" value={bfWaist} onChange={e => setBfWaist(e.target.value)} onFocus={() => setActiveMeas('waist')} onBlur={() => setActiveMeas('')} />
              </div>
              {bfGender === 'F' && (
                <div>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Hips (cm)</label>
                  <input className="form-input" type="number" value={bfHip} onChange={e => setBfHip(e.target.value)} onFocus={() => setActiveMeas('hip')} onBlur={() => setActiveMeas('')} />
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h4 style={{ color: 'var(--text-1)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>U.S. Navy Method</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Estimates body fat percentage based on circumferences. Measure at the widest part of hips/waist, narrowest part of neck.</p>
          </div>
        </div>
      </div>

      {/* Render the transformation roadmap */}
      <PhysiqueRoadmap targets={targets} user={user} />
    </div>
  );
}
