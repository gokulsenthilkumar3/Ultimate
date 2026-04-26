/**
 * HumanoidViewer.jsx — Mirror Chamber v2.0
 * 
 * Complete rewrite implementing the $10M architecture:
 * - Zustand 3D store (use3DStore)
 * - 6 viewport modes: SOLO, DUAL, SPLIT, GHOST, DELTA, TIMELINE
 * - Full parametric morph engine
 * - Wardrobe system (gym, casual, anatomical, underwear)
 * - Ambition Path with milestone beacons
 * - Body part click → camera focus → health panel
 * - 360° orbit with camera presets
 * - VFX toggles (heatmap, vascularity, delta, aura)
 */

import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import {
  Rotate3D, Eye, Layers, Zap, Shirt, Ruler, Camera, Download,
  ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle,
  Target, TrendingUp, Maximize2, Minimize2, Settings,
  Activity, Heart, Dumbbell, ArrowRight, Star, Flag,
} from 'lucide-react';
import use3DStore from '../store/use3DStore';
import { USER, BODY_PARTS, STATUS } from '../data/userData';
import { useToast } from '../hooks/useToast';

// Lazy load the heavy 3D canvas
const ChamberCanvas = lazy(() => import('./ChamberCanvas'));

// ── Metric labels
const METRIC_LABELS = {
  height: { label: 'Height', unit: 'cm', icon: Ruler },
  weight: { label: 'Weight', unit: 'kg', icon: Activity },
  bodyFat: { label: 'Body Fat', unit: '%', icon: Zap },
  chest: { label: 'Chest', unit: 'cm', icon: Dumbbell },
  shoulders: { label: 'Shoulders', unit: 'cm', icon: Dumbbell },
  waist: { label: 'Waist', unit: 'cm', icon: Target },
  arms: { label: 'Arms', unit: 'cm', icon: Dumbbell },
  thighs: { label: 'Thighs', unit: 'cm', icon: Activity },
  neck: { label: 'Neck', unit: 'cm', icon: Activity },
  calves: { label: 'Calves', unit: 'cm', icon: Activity },
  hips: { label: 'Hips', unit: 'cm', icon: Activity },
  dLength: { label: 'D Length', unit: 'in', icon: Ruler },
  dGirth: { label: 'D Girth', unit: 'in', icon: Ruler },
};

const VIEW_MODES = [
  { id: 'SOLO', label: 'Solo' },
  { id: 'DUAL', label: 'Dual' },
  { id: 'GHOST', label: 'Ghost' },
  { id: 'SPLIT', label: 'Split' },
  { id: 'DELTA', label: 'Delta' },
  { id: 'TIMELINE', label: 'Timeline' },
];

const CAMERA_PRESETS = ['FRONT', 'LEFT', 'BACK', 'RIGHT'];

const WARDROBE_OPTIONS = [
  { id: 'gym', label: 'Gym', icon: '🏋️' },
  { id: 'casual', label: 'Casual', icon: '👕' },
  { id: 'underwear', label: 'Underwear', icon: '🩲' },
  { id: 'anatomical', label: 'Anatomical', icon: '🔬' },
];

const QUALITY_OPTIONS = ['LOW', 'MED', 'HIGH'];

// ── Spinner
function ChamberSpinner() {
  return (
    <div className="chamber-spinner">
      <div className="chamber-spinner__ring" />
      <span className="chamber-spinner__text">INITIALIZING DIGITAL TWIN</span>
    </div>
  );
}

export default function HumanoidViewer() {
  const toast = useToast();
  
  // ── Store
  const viewMode = use3DStore((s) => s.viewMode);
  const renderMode = use3DStore((s) => s.renderMode);
  const cameraPreset = use3DStore((s) => s.cameraPreset);
  const autoRotate = use3DStore((s) => s.autoRotate);
  const isZoomed = use3DStore((s) => s.isZoomed);
  const wardrobe = use3DStore((s) => s.wardrobe);
  const anatomyDepth = use3DStore((s) => s.anatomyDepth);
  const selectedPart = use3DStore((s) => s.selectedPart);
  const currentMetrics = use3DStore((s) => s.currentMetrics);
  const goalMetrics = use3DStore((s) => s.goalMetrics);
  const morphOverrides = use3DStore((s) => s.morphOverrides);
  const quality = use3DStore((s) => s.quality);
  const heatmapMode = use3DStore((s) => s.heatmapMode);
  const splitPos = use3DStore((s) => s.splitPos);
  const milestones = use3DStore((s) => s.milestones);
  const snapshots = use3DStore((s) => s.snapshots);
  const timelinePos = use3DStore((s) => s.timelinePos);
  const stressLevel = use3DStore((s) => s.stressLevel);

  // ── Actions
  const setViewMode = use3DStore((s) => s.setViewMode);
  const setRenderMode = use3DStore((s) => s.setRenderMode);
  const setCameraPreset = use3DStore((s) => s.setCameraPreset);
  const setAutoRotate = use3DStore((s) => s.setAutoRotate);
  const setIsZoomed = use3DStore((s) => s.setIsZoomed);
  const setWardrobe = use3DStore((s) => s.setWardrobe);
  const setAnatomyDepth = use3DStore((s) => s.setAnatomyDepth);
  const setSelectedPart = use3DStore((s) => s.setSelectedPart);
  const setHeatmapMode = use3DStore((s) => s.setHeatmapMode);
  const setSplitPos = use3DStore((s) => s.setSplitPos);
  const setQuality = use3DStore((s) => s.setQuality);
  const setStressLevel = use3DStore((s) => s.setStressLevel);
  const setTimelinePos = use3DStore((s) => s.setTimelinePos);
  const updateCurrentMetric = use3DStore((s) => s.updateCurrentMetric);
  const updateGoalMetric = use3DStore((s) => s.updateGoalMetric);
  const setMorphOverride = use3DStore((s) => s.setMorphOverride);
  const syncMorphsFromMetrics = use3DStore((s) => s.syncMorphsFromMetrics);
  const saveSnapshot = use3DStore((s) => s.saveSnapshot);

  const [showEditor, setShowEditor] = useState(true);
  const [editorTab, setEditorTab] = useState('metrics'); // metrics | morphs | wardrobe | vfx

  // ── Computed deltas
  const deltas = useMemo(() => {
    const d = {};
    for (const key of Object.keys(currentMetrics)) {
      const c = currentMetrics[key];
      const g = goalMetrics[key];
      d[key] = { current: c, goal: g, delta: g - c };
    }
    return d;
  }, [currentMetrics, goalMetrics]);

  // ── Export screenshot
  const captureScreenshot = useCallback(() => {
    const canvas = document.querySelector('.chamber-viewport canvas');
    if (!canvas) { toast.error('No 3D viewport found.'); return; }
    const link = document.createElement('a');
    link.download = `MirrorChamber_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Screenshot exported.');
  }, [toast]);

  // ── Save snapshot
  const handleSaveSnapshot = useCallback(() => {
    saveSnapshot();
    toast.success('Timeline snapshot saved.');
  }, [saveSnapshot, toast]);

  // ── Selected body part info
  const partInfo = selectedPart ? BODY_PARTS[selectedPart] : null;

  return (
    <div className="chamber fade-in">
      {/* ═══ HEADER ═══ */}
      <div className="chamber-header">
        <div className="chamber-header__left">
          <p className="label-caps" style={{ color: 'var(--chamber-glow)' }}>MIRROR CHAMBER</p>
          <h2 className="chamber-title">
            <Rotate3D size={28} /> Digital Twin Engine
          </h2>
          <p className="chamber-subtitle">
            Photorealistic parametric body with real-time morphing &amp; 360° comparison
          </p>
        </div>
        <div className="chamber-header__right">
          {/* Quality selector */}
          <div className="chamber-pill-group">
            {QUALITY_OPTIONS.map((q) => (
              <button key={q} className={`chamber-pill${quality === q ? ' active' : ''}`}
                onClick={() => setQuality(q)}>{q}</button>
            ))}
          </div>
          {/* Render mode */}
          <div className="chamber-pill-group">
            <button className={`chamber-pill${renderMode === 'WEBGL' ? ' active' : ''}`}
              onClick={() => setRenderMode('WEBGL')}>WEBGL</button>
            <button className={`chamber-pill${renderMode === 'SPRITE' ? ' active' : ''}`}
              onClick={() => setRenderMode('SPRITE')}>SPRITE</button>
          </div>
        </div>
      </div>

      {/* ═══ VIEWPORT + EDITOR LAYOUT ═══ */}
      <div className="chamber-layout">
        {/* ── VIEWPORT ── */}
        <div className="chamber-viewport">
          {/* Top overlay bar */}
          <div className="chamber-overlay-top">
            <div className="chamber-overlay-row">
              {/* View mode pills */}
              <div className="chamber-pill-group">
                {VIEW_MODES.map((m) => (
                  <button key={m.id} className={`chamber-pill${viewMode === m.id ? ' active' : ''}`}
                    onClick={() => setViewMode(m.id)}>{m.label}</button>
                ))}
              </div>
              {/* VFX toggles */}
              <div className="chamber-pill-group">
                <button className={`chamber-pill${heatmapMode ? ' active' : ''}`}
                  onClick={() => setHeatmapMode(!heatmapMode)}>
                  {heatmapMode ? '🔥 HEAT' : 'HEAT'}
                </button>
              </div>
            </div>
            <div className="chamber-overlay-row">
              {/* Camera presets */}
              <div className="chamber-pill-group">
                {CAMERA_PRESETS.map((p) => (
                  <button key={p} className={`chamber-pill${cameraPreset === p ? ' active' : ''}`}
                    onClick={() => setCameraPreset(p)}>{p}</button>
                ))}
              </div>
              {/* Auto rotate */}
              <button className={`chamber-pill${autoRotate ? ' active' : ''}`}
                onClick={() => setAutoRotate(!autoRotate)}>
                {autoRotate ? '360°' : 'PAUSED'}
              </button>
              {/* Export */}
              <button className="chamber-pill chamber-pill--export" onClick={captureScreenshot}>
                <Camera size={12} /> EXPORT
              </button>
            </div>
          </div>

          {/* 3D Canvas */}
          <Suspense fallback={<ChamberSpinner />}>
            <ChamberCanvas />
          </Suspense>

          {/* Bottom labels */}
          <div className="chamber-viewport-labels">
            {(viewMode === 'DUAL' || viewMode === 'SPLIT' || viewMode === 'GHOST') && (
              <>
                <span className="chamber-label chamber-label--current">YOU NOW</span>
                <span className="chamber-label chamber-label--goal">YOUR GOAL</span>
              </>
            )}
            {viewMode === 'DELTA' && (
              <span className="chamber-label chamber-label--delta">DELTA VISUALIZATION</span>
            )}
            {viewMode === 'SOLO' && (
              <span className="chamber-label chamber-label--current">MIRROR VIEW</span>
            )}
          </div>

          {/* Split divider slider */}
          {viewMode === 'SPLIT' && (
            <div className="chamber-split-slider">
              <span className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--chamber-glow)' }}>
                SPLIT {splitPos}%
              </span>
              <input type="range" min="10" max="90" value={splitPos}
                onChange={(e) => setSplitPos(parseInt(e.target.value))}
                style={{ width: '260px', accentColor: 'var(--chamber-glow)' }} />
            </div>
          )}

          {/* Timeline scrubber */}
          {viewMode === 'TIMELINE' && (
            <div className="chamber-timeline">
              <div className="chamber-timeline__track">
                {milestones.map((m, i) => (
                  <div key={i} className={`chamber-milestone${m.achieved ? ' achieved' : ''}`}
                    style={{ left: `${(m.month / 20) * 100}%` }}
                    title={m.label}>
                    <div className="chamber-milestone__dot" />
                    <span className="chamber-milestone__label">{m.label.split('—')[0]}</span>
                  </div>
                ))}
                <input type="range" min="0" max="100" value={timelinePos}
                  onChange={(e) => setTimelinePos(parseInt(e.target.value))}
                  className="chamber-timeline__slider" />
              </div>
              <div className="chamber-timeline__ends">
                <span>Apr 2026</span>
                <span style={{ color: 'var(--chamber-gold)' }}>Dec 2026 — GREEK GOD</span>
              </div>
            </div>
          )}

          {/* Floating action buttons */}
          <div className="chamber-fab-row">
            <button className="chamber-fab" onClick={() => setShowEditor(!showEditor)}
              title={showEditor ? 'Hide editor' : 'Show editor'}>
              <Settings size={16} />
            </button>
            <button className="chamber-fab" onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? 'Reset zoom' : 'Focus zoom'}>
              {isZoomed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className="chamber-fab" onClick={handleSaveSnapshot} title="Save snapshot">
              <Camera size={16} />
            </button>
          </div>
        </div>

        {/* ── EDITOR SIDEBAR ── */}
        {showEditor && (
          <div className="chamber-editor">
            {/* Editor tabs */}
            <div className="chamber-editor__tabs">
              {[
                { id: 'metrics', label: 'Metrics', icon: Ruler },
                { id: 'morphs', label: 'Morphs', icon: Zap },
                { id: 'wardrobe', label: 'Outfit', icon: Shirt },
                { id: 'anatomy', label: 'Anatomy', icon: Layers },
              ].map((tab) => (
                <button key={tab.id}
                  className={`chamber-editor__tab${editorTab === tab.id ? ' active' : ''}`}
                  onClick={() => setEditorTab(tab.id)}>
                  <tab.icon size={13} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="chamber-editor__body">
              {/* ── METRICS TAB ── */}
              {editorTab === 'metrics' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading">
                    <Ruler size={14} /> Body Metrics
                  </h4>
                  <div className="chamber-metric-list">
                    {Object.entries(METRIC_LABELS).map(([key, meta]) => (
                      <div key={key} className="chamber-metric-row">
                        <div className="chamber-metric-row__header">
                          <span className="chamber-metric-row__label">{meta.label}</span>
                          <span className="chamber-metric-row__value">
                            {currentMetrics[key]}{meta.unit}
                            <span className="chamber-metric-row__delta"
                              style={{ color: deltas[key].delta > 0 ? 'var(--chamber-success)' : deltas[key].delta < 0 ? 'var(--chamber-glow)' : 'var(--text-3)' }}>
                              {deltas[key].delta > 0 ? '+' : ''}{deltas[key].delta.toFixed(1)}
                            </span>
                          </span>
                        </div>
                        <input type="range"
                          min={key.includes('d') ? 2 : key === 'bodyFat' ? 5 : 30}
                          max={key.includes('d') ? 10 : key === 'bodyFat' ? 40 : key === 'height' ? 210 : key === 'weight' ? 130 : 150}
                          step={key.includes('d') ? 0.1 : 1}
                          value={currentMetrics[key]}
                          onChange={(e) => updateCurrentMetric(key, parseFloat(e.target.value))}
                          className="chamber-slider" />
                        <div className="chamber-metric-row__target">
                          <Target size={10} />
                          <span>Goal: {goalMetrics[key]}{meta.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-primary btn-full" style={{ marginTop: '1rem' }}
                    onClick={() => { syncMorphsFromMetrics(); toast.success('Morphs synced from metrics'); }}>
                    Sync Morphs from Metrics
                  </button>
                </div>
              )}

              {/* ── MORPHS TAB ── */}
              {editorTab === 'morphs' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading">
                    <Zap size={14} /> Manual Morph Control
                  </h4>
                  {[
                    { id: 'shoulders', label: 'Shoulder Span' },
                    { id: 'chest', label: 'Chest Girth' },
                    { id: 'waist', label: 'Waist (Vacuum)' },
                    { id: 'arms', label: 'Arm Sweep' },
                  ].map((s) => (
                    <div key={s.id} className="chamber-morph-row">
                      <div className="chamber-morph-row__header">
                        <span>{s.label}</span>
                        <span className="chamber-morph-row__value">
                          {morphOverrides[s.id].toFixed(2)}x
                        </span>
                      </div>
                      <input type="range" min="0.6" max="1.6" step="0.01"
                        value={morphOverrides[s.id]}
                        onChange={(e) => setMorphOverride(s.id, parseFloat(e.target.value))}
                        className="chamber-slider" />
                    </div>
                  ))}
                  <div className="chamber-divider" />
                  <h4 className="chamber-editor__heading">
                    <Activity size={14} /> Bio-Feedback
                  </h4>
                  <div className="chamber-morph-row">
                    <div className="chamber-morph-row__header">
                      <span>Stress Level</span>
                      <span className="chamber-morph-row__value" style={{ color: stressLevel > 60 ? '#ef4444' : 'var(--text-2)' }}>
                        {stressLevel}%
                      </span>
                    </div>
                    <input type="range" min="0" max="100" value={stressLevel}
                      onChange={(e) => setStressLevel(parseInt(e.target.value))}
                      className="chamber-slider" style={{ accentColor: '#ef4444' }} />
                  </div>
                </div>
              )}

              {/* ── WARDROBE TAB ── */}
              {editorTab === 'wardrobe' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading">
                    <Shirt size={14} /> Wardrobe
                  </h4>
                  <div className="chamber-wardrobe-grid">
                    {WARDROBE_OPTIONS.map((w) => (
                      <button key={w.id}
                        className={`chamber-wardrobe-card${wardrobe === w.id ? ' active' : ''}`}
                        onClick={() => setWardrobe(w.id)}>
                        <span className="chamber-wardrobe-card__icon">{w.icon}</span>
                        <span className="chamber-wardrobe-card__label">{w.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="chamber-note">
                    {wardrobe === 'anatomical'
                      ? 'Anatomical mode — full body visible for measurement comparison including all regions.'
                      : wardrobe === 'underwear'
                      ? 'Underwear mode — reveals full physique for body composition analysis.'
                      : `${wardrobe.charAt(0).toUpperCase() + wardrobe.slice(1)} outfit applied.`}
                  </p>
                </div>
              )}

              {/* ── ANATOMY TAB ── */}
              {editorTab === 'anatomy' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading">
                    <Layers size={14} /> Anatomical Peel
                  </h4>
                  <div className="chamber-anatomy-visual">
                    <div className="chamber-anatomy-layers">
                      <div className={`chamber-anatomy-layer${anatomyDepth > 70 ? ' active' : ''}`}>
                        <Eye size={12} /> Skin
                      </div>
                      <div className={`chamber-anatomy-layer${anatomyDepth <= 70 && anatomyDepth > 30 ? ' active' : ''}`}>
                        <Dumbbell size={12} /> Muscle
                      </div>
                      <div className={`chamber-anatomy-layer${anatomyDepth <= 30 ? ' active' : ''}`}>
                        <Heart size={12} /> Organs
                      </div>
                    </div>
                    <input type="range" min="0" max="100" value={anatomyDepth}
                      onChange={(e) => setAnatomyDepth(parseInt(e.target.value))}
                      className="chamber-slider" style={{ accentColor: 'var(--chamber-glow)' }} />
                    <div className="chamber-anatomy-scale">
                      <span>Organs</span>
                      <span>{anatomyDepth}%</span>
                      <span>Skin</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SELECTED BODY PART DETAIL ═══ */}
      {partInfo && (
        <div className="chamber-part-detail glass-card"
          style={{ borderColor: STATUS[partInfo.status]?.color || 'var(--border)' }}>
          <div className="chamber-part-detail__header">
            <div className="chamber-part-detail__title-row">
              <span className="chamber-part-detail__icon">{partInfo.icon}</span>
              <div>
                <h3>{partInfo.name}</h3>
                <span className="label-caps" style={{ color: STATUS[partInfo.status]?.color }}>
                  {STATUS[partInfo.status]?.label} STATUS
                </span>
              </div>
            </div>
            <button className="chamber-pill" onClick={() => setSelectedPart(null)}>
              <X size={14} /> Close
            </button>
          </div>
          <div className="chamber-part-detail__grid">
            <div>
              <p className="label-caps chamber-part-detail__label">
                <AlertTriangle size={12} /> Identified Issues
              </p>
              <ul className="chamber-part-detail__list chamber-part-detail__list--issues">
                {partInfo.issues?.map((iss, i) => <li key={i}>{iss}</li>)}
              </ul>
            </div>
            <div>
              <p className="label-caps chamber-part-detail__label">
                <CheckCircle size={12} /> Restoration Plan
              </p>
              <ul className="chamber-part-detail__list chamber-part-detail__list--fixes">
                {partInfo.fixes?.map((fix, i) => <li key={i}>{fix}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MEASUREMENTS COMPARISON TABLE ═══ */}
      <div className="chamber-comparison glass-card">
        <div className="chamber-comparison__header">
          <h3 className="chamber-comparison__title">
            <TrendingUp size={18} /> Measurements Delta
          </h3>
          <div className="chamber-comparison__legend">
            <span className="chamber-legend-dot" style={{ background: 'var(--chamber-current)' }} /> Current
            <span className="chamber-legend-dot" style={{ background: 'var(--chamber-glow)' }} /> Goal
          </div>
        </div>
        <div className="chamber-comparison__grid">
          {Object.entries(METRIC_LABELS).map(([key, meta]) => {
            const d = deltas[key];
            const isGrowth = d.delta > 0;
            const isLoss = d.delta < 0;
            const pctComplete = d.goal !== 0 ? Math.min(100, Math.max(0, (d.current / d.goal) * 100)) : 0;
            return (
              <div key={key} className="chamber-delta-card">
                <div className="chamber-delta-card__top">
                  <span className="chamber-delta-card__label">{meta.label}</span>
                  <span className="chamber-delta-card__delta"
                    style={{ color: isGrowth ? 'var(--chamber-success)' : isLoss ? 'var(--chamber-glow)' : 'var(--text-3)' }}>
                    {isGrowth ? '+' : ''}{d.delta.toFixed(1)}{meta.unit}
                  </span>
                </div>
                <div className="chamber-delta-card__bar">
                  <div className="chamber-delta-card__fill"
                    style={{ width: `${pctComplete}%`, background: isGrowth ? 'var(--chamber-success)' : 'var(--chamber-glow)' }} />
                </div>
                <div className="chamber-delta-card__bottom">
                  <span>{d.current.toFixed(1)}{meta.unit}</span>
                  <ArrowRight size={10} />
                  <span style={{ color: 'var(--chamber-glow)' }}>{d.goal.toFixed(1)}{meta.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ AMBITION PATH ═══ */}
      <div className="chamber-ambition glass-card">
        <h3 className="chamber-ambition__title">
          <Flag size={18} color="var(--chamber-gold)" /> Ambition Path — Road to Greek God
        </h3>
        <div className="chamber-ambition__road">
          <div className="chamber-ambition__line" />
          {milestones.map((m, i) => {
            const left = (m.month / 20) * 100;
            const isFinal = i === milestones.length - 1;
            return (
              <div key={i} className={`chamber-ambition__node${m.achieved ? ' achieved' : ''}${isFinal ? ' final' : ''}`}
                style={{ left: `${left}%` }}>
                <div className="chamber-ambition__beacon">
                  {isFinal ? <Star size={16} /> : m.achieved ? <CheckCircle size={14} /> : <Target size={14} />}
                </div>
                <div className="chamber-ambition__info">
                  <span className="chamber-ambition__month">Month {m.month}</span>
                  <span className="chamber-ambition__label">{m.label}</span>
                  <span className="chamber-ambition__weight">{m.weight}kg · {m.bodyFat}% BF</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
