import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap, Target, Layers, Activity,
  Shield, Save, Edit3, X, ToggleLeft, ToggleRight, TrendingDown, TrendingUp,
} from 'lucide-react';
import useStore, { selectSetActiveTab, selectPhysiqueTargets, selectUpdatePhysiqueTargets } from '../store/useStore';
import use3DStore from '../store/use3DStore';
import { useToast } from '../hooks/useToast';
import PhysiqueRoadmap from './PhysiqueRoadmap';

// ── Body-fat formulas ─────────────────────────────────────────────────────
function calcNavyBF(gender, waist, neck, height, hip = 0) {
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

function calcBMI(weight, height) {
  const w = parseFloat(weight), h = parseFloat(height);
  if (!w || !h) return null;
  return w / ((h / 100) ** 2);
}

// ── BF% categories ────────────────────────────────────────────────────────
const BF_CATEGORIES = {
  M: [
    { label: 'Essential', max: 6,  color: '#a78bfa', desc: 'Minimum for physiological function' },
    { label: 'Athletes',  max: 14, color: '#10b981', desc: 'Elite athletic range' },
    { label: 'Fitness',   max: 18, color: '#0ea5e9', desc: 'Lean & healthy' },
    { label: 'Average',   max: 25, color: '#f59e0b', desc: 'Typical healthy adult' },
    { label: 'Obese',     max: 100, color: '#ef4444', desc: 'Above healthy range' },
  ],
  F: [
    { label: 'Essential', max: 14, color: '#a78bfa', desc: 'Minimum for physiological function' },
    { label: 'Athletes',  max: 21, color: '#10b981', desc: 'Elite athletic range' },
    { label: 'Fitness',   max: 25, color: '#0ea5e9', desc: 'Lean & healthy' },
    { label: 'Average',   max: 32, color: '#f59e0b', desc: 'Typical healthy adult' },
    { label: 'Obese',     max: 100, color: '#ef4444', desc: 'Above healthy range' },
  ],
};

function getBFCategory(bf, gender) {
  const cats = BF_CATEGORIES[gender] || BF_CATEGORIES.M;
  return cats.find(c => bf <= c.max) || cats[cats.length - 1];
}

// ── Body Fat Gauge (horizontal scale) ────────────────────────────────────
function BFGauge({ bf, gender }) {
  const cats = BF_CATEGORIES[gender] || BF_CATEGORIES.M;
  const maxScale = gender === 'M' ? 35 : 45;
  const cat = getBFCategory(bf, gender);
  const pct = Math.min(100, (bf / maxScale) * 100);

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Category bands */}
      <div style={{ display: 'flex', height: '10px', borderRadius: '999px', overflow: 'hidden', marginBottom: '6px' }}>
        {cats.map((c, i) => {
          const prev = i === 0 ? 0 : cats[i - 1].max;
          const w = ((Math.min(c.max, maxScale) - prev) / maxScale) * 100;
          return (
            <div key={c.label} style={{
              width: `${Math.max(0, w)}%`, background: c.color,
              opacity: cat.label === c.label ? 1 : 0.35,
            }} />
          );
        })}
      </div>

      {/* Needle indicator */}
      <div style={{ position: 'relative', height: '20px', marginBottom: '4px' }}>
        <div style={{
          position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: `8px solid ${cat.color}`,
        }} />
      </div>

      {/* Category labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        {cats.map(c => (
          <span key={c.label} style={{
            fontSize: '0.58rem', fontWeight: 700, color: cat.label === c.label ? c.color : 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>{c.label}</span>
        ))}
      </div>
    </div>
  );
}

// ── Body Silhouette (with measurement highlight) ──────────────────────────
function SilhouetteGuide({ activeMeasurement }) {
  const points = { neck: { y: 25 }, waist: { y: 85 }, hip: { y: 110 }, height: { y: 10 } };
  const activeY = points[activeMeasurement]?.y;
  return (
    <svg viewBox="0 0 100 200" width="100%" height="200" style={{ maxWidth: '110px', margin: '0 auto', display: 'block' }}>
      <path d="M 50 10 C 60 10 60 30 50 30 C 40 30 40 10 50 10 Z" fill="var(--text-3)" />
      <path d="M 50 30 L 50 90 M 50 40 L 20 80 M 50 40 L 80 80 M 50 90 L 30 190 M 50 90 L 70 190"
        stroke="var(--text-3)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {activeY && (
        <line x1="5" y1={activeY} x2="95" y2={activeY}
          stroke="var(--accent)" strokeWidth="3.5" strokeDasharray="5 2" />
      )}
    </svg>
  );
}

const DEFAULT_ZONES = [
  { name: 'Core Anterior',   status: 'Cutting',    progress: 68, color: 'var(--accent)', icon: '⚡' },
  { name: 'Posterior Chain', status: 'Maintenance', progress: 85, color: '#3b82f6',      icon: '⛓️' },
  { name: 'Upper Extremity', status: 'Hypertrophy', progress: 42, color: '#8b5cf6',      icon: '💪' },
  { name: 'Anatomical Base', status: 'Power',       progress: 91, color: '#10b981',      icon: '🦵' },
];

const DEFAULT_TARGETS = [
  { label: 'Weight',    current: '63kg',    target: '76.5kg', progress: 82, type: 'Hypertrophy' },
  { label: 'Shoulders', current: '107.5cm', target: '123cm',  progress: 87, type: 'Hypertrophy' },
  { label: 'Chest',     current: '86.5cm',  target: '104.5cm',progress: 82, type: 'Hypertrophy' },
  { label: 'Waist',     current: '82cm',    target: '75cm',   progress: 90, type: 'Reduction'   },
  { label: 'Arms',      current: '30cm',    target: '40.5cm', progress: 74, type: 'Hypertrophy' },
  { label: 'Forearms',  current: '27cm',    target: '33.5cm', progress: 80, type: 'Hypertrophy' },
  { label: 'Thighs',    current: '53cm',    target: '59cm',   progress: 89, type: 'Hypertrophy' },
  { label: 'Calves',    current: '35cm',    target: '40cm',   progress: 87, type: 'Hypertrophy' },
];

const CM_TO_IN = 0.393701;
function convertValue(val, toIn) {
  if (!val) return val;
  const match = String(val).match(/^([\d.]+)(cm|in)?$/);
  if (!match) return val;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return val;
  if (toIn) return `${(num * CM_TO_IN).toFixed(1)}in`;
  if (match[2] === 'in') return `${(num / CM_TO_IN).toFixed(1)}cm`;
  return val;
}

export default function Physique({ user }) {
  const toast = useToast();
  const setActiveTab = useStore(selectSetActiveTab);
  const physiqueTargets = useStore(selectPhysiqueTargets);
  const updatePhysiqueTargets = useStore(selectUpdatePhysiqueTargets);
  const updateUser = useStore(s => s.updateUser);

  // Sync user profile metrics to 3D store
  useEffect(() => {
    if (!user) return;
    const metrics = {
      weight: parseFloat(user.weight), bodyFat: parseFloat(user.bodyFat),
      chest: parseFloat(user.chest), shoulders: parseFloat(user.shoulders),
      waist: parseFloat(user.waist), arms: parseFloat(user.arms),
      thighs: parseFloat(user.thighs), calves: parseFloat(user.calves),
      neck: parseFloat(user.neck), forearm: parseFloat(user.forearm),
      hips: parseFloat(user.hips), glutes: parseFloat(user.glutes),
      ankle: parseFloat(user.ankle),
    };
    const validMetrics = Object.fromEntries(Object.entries(metrics).filter(([, v]) => !isNaN(v)));
    if (Object.keys(validMetrics).length > 0) use3DStore.getState().setCurrentMetrics(validMetrics);
  }, [user?.weight, user?.bodyFat, user?.chest, user?.shoulders, user?.waist,
      user?.arms, user?.thighs, user?.calves, user?.neck, user?.forearm, user?.hips, user?.glutes, user?.ankle]);

  const zones   = physiqueTargets?.zones   || DEFAULT_ZONES;
  const targets = physiqueTargets?.targets || DEFAULT_TARGETS;

  useEffect(() => {
    if (targets?.length > 0 && targets[0].label === 'Chest Width') {
      updatePhysiqueTargets({ ...(physiqueTargets || {}), targets: DEFAULT_TARGETS });
    }
  }, [targets]);

  const [activeZone,    setActiveZone]    = useState(zones[0]?.name || '');
  const [editingTarget, setEditingTarget] = useState(null);
  const [targetDraft,   setTargetDraft]   = useState({});
  const [unitMode,      setUnitMode]      = useState('cm');

  // ── Body-fat calculator state ─────────────────────────────────────────
  const [bfGender, setBfGender] = useState(user?.gender || 'M');
  const [bfHeight, setBfHeight] = useState(user?.height || '');
  const [bfWeight, setBfWeight] = useState(user?.weight || '');
  const [bfNeck,   setBfNeck]   = useState('');
  const [bfWaist,  setBfWaist]  = useState('');
  const [bfHip,    setBfHip]    = useState('');
  const [activeMeas, setActiveMeas] = useState('');

  const bfRaw = useMemo(
    () => calcNavyBF(bfGender, bfWaist, bfNeck, bfHeight, bfHip),
    [bfGender, bfWaist, bfNeck, bfHeight, bfHip]
  );
  const bfPercent = bfRaw && bfRaw > 0 && bfRaw < 70 ? bfRaw : null;
  const bfCategory = bfPercent ? getBFCategory(bfPercent, bfGender) : null;

  const bmi = useMemo(() => calcBMI(bfWeight, bfHeight), [bfWeight, bfHeight]);
  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: '#a78bfa' };
    if (bmi < 25)   return { label: 'Normal',      color: '#10b981' };
    if (bmi < 30)   return { label: 'Overweight',  color: '#f59e0b' };
    return                 { label: 'Obese',        color: '#ef4444' };
  }, [bmi]);

  // Lean / fat mass
  const leanMass = bfPercent && bfWeight
    ? ((1 - bfPercent / 100) * parseFloat(bfWeight)).toFixed(1)
    : null;
  const fatMass = bfPercent && bfWeight
    ? (bfPercent / 100 * parseFloat(bfWeight)).toFixed(1)
    : null;

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

  const handleZoneClick = (zone, idx) => {
    setActiveZone(zone.name);
    const statuses = ['Cutting', 'Maintenance', 'Hypertrophy', 'Power', 'Recomp'];
    const next = statuses[(statuses.indexOf(zone.status) + 1) % statuses.length];
    const updated = zones.map((z, i) => i === idx ? { ...z, status: next } : z);
    updatePhysiqueTargets({ ...(physiqueTargets || {}), zones: updated });
  };

  const saveToProfile = () => {
    if (!bfPercent) return;
    updateUser({ bodyFat: parseFloat(bfPercent.toFixed(1)) });
    toast.success(`Body fat ${bfPercent.toFixed(1)}% saved to profile`);
  };

  const displayVal = (val) => unitMode === 'in' ? convertValue(val, true) : convertValue(val, false);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Architectural Blueprint</p>
          <h2 className="text-display" style={{ fontSize: '2rem' }}>Physique Matrix</h2>
          <p className="text-secondary">Precision morphing targets and regional dominance tracking. Click a zone to cycle its phase.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setUnitMode(m => m === 'cm' ? 'in' : 'cm')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.78rem', fontWeight: 700,
            }}
          >
            {unitMode === 'cm' ? <ToggleLeft size={16} color="var(--accent)" /> : <ToggleRight size={16} color="var(--accent)" />}
            {unitMode === 'cm' ? 'cm' : 'in'}
          </button>
          <button className="btn-primary" onClick={() => setActiveTab('humanoid')}>
            <Layers size={18} /> VIEW 3D MODEL
          </button>
        </div>
      </div>

      {/* Zone cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {zones.map((zone, idx) => (
          <div key={idx} className="glass-card" style={{
            padding: '1.5rem', borderLeft: `4px solid ${zone.color}`,
            cursor: 'pointer', transition: 'all 0.3s ease',
            background: activeZone === zone.name ? 'var(--bg-elevated)' : 'var(--bg-card)',
          }} onClick={() => handleZoneClick(zone, idx)} title="Click to cycle training phase">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{zone.icon}</span>
              <span className="badge" style={{ background: `${zone.color}22`, color: zone.color }}>{zone.status}</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>{zone.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${zone.progress}%`, height: '100%', background: zone.color, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-2)' }}>{zone.progress}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Metric Targets + Body Fat Calculator */}
      <div className="dual-grid mb-lg">
        {/* Metric Targets */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {targets.map((t, i) => (
              <div key={i} style={{ padding: '1.1rem', background: 'var(--bg-dark)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t.label}</p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>{t.type}</span>
                    {editingTarget !== i && (
                      <button onClick={() => { setEditingTarget(i); setTargetDraft({ current: t.current, target: t.target }); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '2px' }}>
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
                    <button onClick={() => { setEditingTarget(null); setTargetDraft({}); }}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)', padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <X size={12} /> Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                        {displayVal(t.current)} / <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{displayVal(t.target)}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.type === 'Reduction' ? '#10b981' : 'var(--accent)' }}>
                        {t.progress}%
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${t.progress}%`, height: '100%', background: t.type === 'Reduction' ? '#10b981' : 'var(--accent)', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body Fat Calculator */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={24} color="var(--accent)" />
            <h3 className="text-display" style={{ fontSize: '1.5rem', margin: 0 }}>Body Fat % Calculator</h3>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Silhouette */}
            <div style={{ flex: '0 0 auto', width: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <SilhouetteGuide activeMeasurement={activeMeas} />
              {bfPercent !== null ? (
                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: bfCategory?.color, lineHeight: 1 }}>
                    {bfPercent.toFixed(1)}%
                  </span>
                  <p style={{ fontSize: '0.65rem', color: bfCategory?.color, fontWeight: 700, textTransform: 'uppercase',
                               letterSpacing: '0.06em', marginTop: '2px' }}>
                    {bfCategory?.label}
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-3)' }}>—</span>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>Enter all values</p>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '5px' }}>Gender</label>
                <select className="form-input" value={bfGender} onChange={e => setBfGender(e.target.value)}>
                  <option value="M">Male</option><option value="F">Female</option>
                </select>
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '5px' }}>Height (cm)</label>
                <input className="form-input" type="number" value={bfHeight}
                  onChange={e => setBfHeight(e.target.value)}
                  onFocus={() => setActiveMeas('height')} onBlur={() => setActiveMeas('')} />
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '5px' }}>Weight (kg)</label>
                <input className="form-input" type="number" value={bfWeight}
                  onChange={e => setBfWeight(e.target.value)} placeholder="For lean mass" />
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '5px' }}>Neck (cm)</label>
                <input className="form-input" type="number" value={bfNeck}
                  onChange={e => setBfNeck(e.target.value)}
                  onFocus={() => setActiveMeas('neck')} onBlur={() => setActiveMeas('')} />
              </div>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '5px' }}>Waist (cm)</label>
                <input className="form-input" type="number" value={bfWaist}
                  onChange={e => setBfWaist(e.target.value)}
                  onFocus={() => setActiveMeas('waist')} onBlur={() => setActiveMeas('')} />
              </div>
              {bfGender === 'F' && (
                <div>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '5px' }}>Hips (cm)</label>
                  <input className="form-input" type="number" value={bfHip}
                    onChange={e => setBfHip(e.target.value)}
                    onFocus={() => setActiveMeas('hip')} onBlur={() => setActiveMeas('')} />
                </div>
              )}
            </div>
          </div>

          {/* Gauge */}
          {bfPercent !== null && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '1rem' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>
                Category Scale — {bfCategory?.desc}
              </p>
              <BFGauge bf={bfPercent} gender={bfGender} />
            </div>
          )}

          {/* Lean / Fat mass breakdown */}
          {bfPercent !== null && leanMass && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ padding: '0.85rem', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                <p className="label-caps" style={{ fontSize: '0.6rem', color: '#10b981', marginBottom: '4px' }}>Lean Mass</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>{leanMass} kg</p>
                <p style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>muscle, bone, organs</p>
              </div>
              <div style={{ padding: '0.85rem', background: 'rgba(245,158,11,0.08)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
                <p className="label-caps" style={{ fontSize: '0.6rem', color: '#f59e0b', marginBottom: '4px' }}>Fat Mass</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>{fatMass} kg</p>
                <p style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{bfPercent.toFixed(1)}% of body weight</p>
              </div>
            </div>
          )}

          {/* BMI */}
          {bmi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
              <div>
                <p className="label-caps" style={{ fontSize: '0.6rem', marginBottom: '2px' }}>BMI</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 900, color: bmiCategory?.color }}>{bmi.toFixed(1)}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: bmiCategory?.color }}>{bmiCategory?.label}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Body Mass Index (kg/m²)</p>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { label: '<18.5', color: '#a78bfa' },
                  { label: '18.5–25', color: '#10b981' },
                  { label: '25–30', color: '#f59e0b' },
                  { label: '>30', color: '#ef4444' },
                ].map(b => (
                  <span key={b.label} style={{ fontSize: '0.55rem', color: b.color, background: `${b.color}18`,
                    borderRadius: '4px', padding: '2px 5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Save to profile */}
          {bfPercent !== null && (
            <button className="btn-primary btn-full" onClick={saveToProfile} style={{ marginTop: 'auto' }}>
              <Save size={14} /> Save {bfPercent.toFixed(1)}% to Profile
            </button>
          )}

          {/* Method info */}
          <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <h4 style={{ color: 'var(--text-1)', fontWeight: 800, fontSize: '0.85rem', marginBottom: '4px' }}>U.S. Navy Method</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
              Estimates body fat from neck, waist, and hip circumferences. Measure at the widest part of the waist/hips and the narrowest part of the neck.
              Accuracy: ±3–4% for most adults.
            </p>
          </div>
        </div>
      </div>

      {/* Physique Roadmap */}
      <PhysiqueRoadmap targets={targets} user={user} />
    </div>
  );
}
