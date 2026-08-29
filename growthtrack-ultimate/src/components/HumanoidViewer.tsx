/**
 * HumanoidViewer.tsx — Mirror Chamber v3.0
 *
 * Improvements over v2.0:
 * ─ Goal sliders added to Metrics tab (NOW + GOAL dual rows)
 * ─ All 14 morph weight sliders surfaced (trap, pec, oblique, vasc, glute, ham, ankle…)
 * ─ VFX panel expanded: HEAT, VASC, XRAY, AURA toggles
 * ─ Timeline playback auto-scrub button + date labels
 * ─ ChamberSettings drawer: skin tone, eye color, scene env, posture, post-FX
 * ─ Overall Progress Score KPI ring card (weighted metric completion)
 * ─ Direction-aware progress bars (decrease = lower is better for body fat/waist)
 * ─ Ambition Path milestone click → tooltip with "Set as Goal" action
 * ─ View mode keyboard shortcuts: 1–6
 * ─ Camera compass icons (↑ Front, ← Left, ↓ Back, → Right)
 */

import React, {
  useState, useMemo, useCallback, useEffect,
  useRef, Suspense, lazy,
} from 'react';
import TabErrorBoundary from './TabErrorBoundary';
import {
  Rotate3D, Eye, Layers, Zap, Shirt, Ruler, Camera, Download,
  ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle,
  Target, Maximize2, Minimize2, Settings,
  Activity, Heart, Dumbbell, Star,
  Play, Pause, SlidersHorizontal, Palette, Globe,
  FlaskConical, Share2,
} from 'lucide-react';
import SocialShareModal from './SocialShareModal';
import PhysiqueDataPanel from './PhysiqueDataPanel';
import use3DStore, { CINEMATIC_PRESETS } from '../store/use3DStore';
import useStore from '../store/useStore';
import { BODY_APPEARANCE_FIELDS, bodyProfileToGoals, bodyProfileToMetrics, calculateGoalProgress, getBaselineMetrics, mergeBodyProfileSources, metricLogsToSnapshots, metricsToBodyProfile } from '../lib/physiqueProfile';
import { buildRendererQualityGate } from '../lib/rendererQualityGate';
import { USER, BODY_PARTS, STATUS } from '../data/userData';
import { useToast } from '../hooks/useToast';
import { trackEvent } from '../lib/analytics';

// Lazy load the heavy 3D canvas
const ChamberCanvas = lazy(() => import('./ChamberCanvas'));
const Sprite3DViewer = lazy(() => import('./Sprite3DViewer'));

const EMPTY_OBJECT = {};
const EMPTY_ARRAY: never[] = [];


// ── Metric labels
const METRIC_LABELS: Record<string, { label: string; unit: string; icon: React.ElementType; direction: 'increase' | 'decrease' }> = {
  weight:    { label: 'Weight',    unit: 'kg', icon: Activity, direction: 'increase' },
  bodyFat:   { label: 'Body Fat',  unit: '%',  icon: Zap,      direction: 'decrease' },
  chest:     { label: 'Chest',     unit: 'cm', icon: Dumbbell, direction: 'increase' },
  shoulders: { label: 'Shoulders', unit: 'cm', icon: Dumbbell, direction: 'increase' },
  waist:     { label: 'Waist',     unit: 'cm', icon: Target,   direction: 'decrease' },
  arms:      { label: 'Arms',      unit: 'cm', icon: Dumbbell, direction: 'increase' },
  thighs:    { label: 'Thighs',    unit: 'cm', icon: Activity, direction: 'increase' },
  neck:      { label: 'Neck',      unit: 'cm', icon: Activity, direction: 'increase' },
  calves:    { label: 'Calves',    unit: 'cm', icon: Activity, direction: 'increase' },
  hips:      { label: 'Hips',      unit: 'cm', icon: Activity, direction: 'increase' },
};
// ── Extra morph sliders not backed by a metric (pure blend shape weights exposed via dimensions)
const MORPH_WEIGHT_GROUPS = [
  {
    group: 'Upper Body',
    items: [
      { id: 'trap_swell',     label: 'Trap Swell',     metricKey: 'shoulders', scale: 0.6  },
      { id: 'pec_thickness',  label: 'Pec Thickness',  metricKey: 'chest',     scale: 0.85 },
      { id: 'oblique_def',    label: 'Oblique Def',    metricKey: 'waist',     scale: 0.7  },
      { id: 'trap_rise',      label: 'Trap Rise',      metricKey: 'neck',      scale: 0.5  },
    ],
  },
  {
    group: 'Arms',
    items: [
      { id: 'bicep_peak',     label: 'Bicep Peak',     metricKey: 'arms',      scale: 1.0  },
      { id: 'tricep_horse',   label: 'Tricep Horse',   metricKey: 'arms',      scale: 0.9  },
      { id: 'forearm_girth',  label: 'Forearm Girth',  metricKey: 'forearm',   scale: 0.85 },
    ],
  },
  {
    group: 'Lower Body',
    items: [
      { id: 'glute_volume',   label: 'Glute Volume',   metricKey: 'hips',      scale: 1.0  },
      { id: 'quad_sweep',     label: 'Quad Sweep',     metricKey: 'thighs',    scale: 0.9  },
      { id: 'ham_thickness',  label: 'Ham Thickness',  metricKey: 'thighs',    scale: 0.8  },
      { id: 'calf_diamond',   label: 'Calf Diamond',   metricKey: 'calves',    scale: 0.9  },
      { id: 'ankle_width',    label: 'Ankle Width',    metricKey: 'calves',    scale: 0.5  },
    ],
  },
  {
    group: 'Shader',
    items: [
      { id: 'vascularity_intensity', label: 'Vascularity', metricKey: 'bodyFat', scale: -0.4, offset: 1 },
    ],
  },
];

const VIEW_MODES = [
  { id: 'SOLO',     label: 'Solo',     key: '1' },
  { id: 'DUAL',     label: 'Dual',     key: '2' },
  { id: 'GHOST',    label: 'Ghost',    key: '3' },
  { id: 'SPLIT',    label: 'Split',    key: '4' },
  { id: 'DELTA',    label: 'Delta',    key: '5' },
  { id: 'TIMELINE', label: 'Timeline', key: '6' },
];

const CAMERA_PRESETS = [
  { id: 'FRONT', label: '↑ Front' },
  { id: 'LEFT',  label: '← Left'  },
  { id: 'BACK',  label: '↓ Back'  },
  { id: 'RIGHT', label: '→ Right' },
];

const WARDROBE_OPTIONS = [
  { id: 'GYM',        label: 'Gym',        icon: '🏋️' },
  { id: 'CASUAL',     label: 'Casual',     icon: '👕' },
  { id: 'UNDERWEAR',  label: 'Underwear',  icon: '🩲' },
  { id: 'ANATOMICAL', label: 'Anatomical', icon: '🔬' },
];

const QUALITY_OPTIONS = ['LOW', 'MED', 'HIGH'];

const FITZPATRICK_SWATCHES = [
  { id: 'I',   hex: '#FFF0E0', label: 'Very Light' },
  { id: 'II',  hex: '#F5D5B0', label: 'Light'      },
  { id: 'III', hex: '#E8B88A', label: 'Medium'     },
  { id: 'IV',  hex: '#C68642', label: 'Olive'      },
  { id: 'V',   hex: '#8D5524', label: 'Brown'      },
  { id: 'VI',  hex: '#4A2912', label: 'Dark'       },
];

const POSTURE_PRESETS = [
  { id: 'relaxed',     label: 'Relaxed',     posture: { headTiltAngle: 8,  pelvicTilt: 12, shoulderRounding: 15 } },
  { id: 'attention',   label: 'Attention',   posture: { headTiltAngle: 0,  pelvicTilt: 2,  shoulderRounding: 2  } },
  { id: 'bodybuilder', label: 'BB Pose',     posture: { headTiltAngle: -2, pelvicTilt: 5,  shoulderRounding: -8 } },
];

const SCENE_ENVS = [
  { id: 'studio',  label: '🎬 Studio'   },
  { id: 'outdoor', label: '🌅 Outdoor'  },
  { id: 'night',   label: '🌃 Night'    },
];

const CINEMATIC_LOOKS = [
  { id: 'PORTRAIT', label: 'Portrait', note: 'Natural skin, soft focus and restrained grain.' },
  { id: 'ANALYTIC', label: 'Analytic', note: 'Neutral, crisp and distraction-free for measurements.' },
  { id: 'NEON', label: 'Neon', note: 'Cool rim light, stronger bloom and subtle lens separation.' },
  { id: 'SUNSET', label: 'Sunset', note: 'Warm key light with rose and amber atmosphere.' },
];

const EYE_COLOR_PRESETS = [
  '#3b7bd4', '#6b4c33', '#2e7d32', '#888', '#1a237e', '#c0ca33',
];

const ADVANCED_MORPH_CONTROLS = [
  { key: 'torso_length', label: 'Torso length' },
  { key: 'shoulder_slope', label: 'Shoulder slope' },
  { key: 'clavicle_width', label: 'Clavicle width' },
  { key: 'ribcage_depth', label: 'Ribcage depth' },
  { key: 'pelvis_width', label: 'Pelvis width' },
  { key: 'neck_length', label: 'Neck length' },
  { key: 'upper_arm_length', label: 'Upper arm length' },
  { key: 'forearm_length', label: 'Forearm length' },
  { key: 'leg_length', label: 'Leg length' },
  { key: 'hand_length', label: 'Hand length' },
  { key: 'foot_length', label: 'Foot length' },
];

// ── Spinner
function ChamberSpinner() {
  return (
    <div className="chamber-spinner">
      <div className="chamber-spinner__ring" />
      <span className="chamber-spinner__text">INITIALIZING DIGITAL TWIN</span>
    </div>
  );
}

// ── Anatomy SVG peel layers
function AnatomySVG({ depth }: { depth: number }) {
  // depth 100=skin, ~66=muscle, ~33=skeleton, 0=organs
  const skinOpacity   = Math.min(1, Math.max(0, (depth - 30) / 40));
  const muscleOpacity = Math.min(1, Math.max(0, depth > 30 ? 1 - (depth - 30) / 40 : 1));
  const organOpacity  = Math.min(1, Math.max(0, 1 - depth / 33));

  return (
    <svg viewBox="0 0 80 200" width={80} height={200} style={{ display: 'block', margin: '0 auto' }}>
      {/* Organ layer */}
      <g opacity={organOpacity} style={{ transition: 'opacity 0.4s' }}>
        <ellipse cx={40} cy={80} rx={18} ry={22} fill="#ef4444" opacity={0.7} />
        <ellipse cx={32} cy={95} rx={9}  ry={14} fill="#f97316" opacity={0.8} />
        <ellipse cx={48} cy={95} rx={9}  ry={14} fill="#f97316" opacity={0.8} />
        <rect x={32} y={110} width={16} height={30} rx={4} fill="#a3e635" opacity={0.6} />
      </g>
      {/* Muscle layer */}
      <g opacity={muscleOpacity} style={{ transition: 'opacity 0.4s' }}>
        <ellipse cx={40} cy={85} rx={22} ry={28} fill="#dc2626" opacity={0.5} />
        <rect x={28} y={115} width={10} height={40} rx={3} fill="#b91c1c" opacity={0.5} />
        <rect x={42} y={115} width={10} height={40} rx={3} fill="#b91c1c" opacity={0.5} />
        <rect x={28} y={160} width={10} height={32} rx={3} fill="#b91c1c" opacity={0.4} />
        <rect x={42} y={160} width={10} height={32} rx={3} fill="#b91c1c" opacity={0.4} />
      </g>
      {/* Skin layer / silhouette */}
      <g opacity={skinOpacity} style={{ transition: 'opacity 0.4s' }}>
        <ellipse cx={40} cy={30} rx={14} ry={16} fill="var(--chamber-glow)" opacity={0.18} stroke="var(--chamber-glow)" strokeWidth={1} />
        <rect x={24} y={50} width={32} height={55} rx={10} fill="var(--chamber-glow)" opacity={0.12} stroke="var(--chamber-glow)" strokeWidth={1} />
        <rect x={22} y={110} width={14} height={55} rx={6} fill="var(--chamber-glow)" opacity={0.10} stroke="var(--chamber-glow)" strokeWidth={1} />
        <rect x={44} y={110} width={14} height={55} rx={6} fill="var(--chamber-glow)" opacity={0.10} stroke="var(--chamber-glow)" strokeWidth={1} />
        <rect x={26} y={165} width={10} height={32} rx={4} fill="var(--chamber-glow)" opacity={0.08} stroke="var(--chamber-glow)" strokeWidth={1} />
        <rect x={44} y={165} width={10} height={32} rx={4} fill="var(--chamber-glow)" opacity={0.08} stroke="var(--chamber-glow)" strokeWidth={1} />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function HumanoidViewer() {
  const toast: any = useToast();
  const legacyUser = useStore((s: any) => s.user || EMPTY_OBJECT);

  // ── Store
  const viewMode          = use3DStore((s) => s.viewMode);
  const renderMode        = use3DStore((s) => s.renderMode);
  const cameraPreset      = use3DStore((s) => s.cameraPreset);
  const autoRotate        = use3DStore((s) => s.autoRotate);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageSrc, setShareImageSrc] = useState(null);
  
  useEffect(() => {
    trackEvent('Viewed Avatar', { score: 100 }); // Score gets evaluated, we will just pass a generic or default value because calculating overallScore here creates circular dependencies
  }, []);
  const wardrobe          = use3DStore((s) => s.wardrobeState);
  const anatomyDepth      = use3DStore((s) => s.anatomyDepth);
  const privateAnatomyVisible = use3DStore((s) => s.privateAnatomyVisible);
  const selectedPart      = use3DStore((s) => s.focusedBodyPart);
  const currentMetrics    = use3DStore((s) => s.cloneA?.metrics || EMPTY_OBJECT);
  const goalMetrics       = use3DStore((s) => s.cloneB?.metrics || EMPTY_OBJECT);
  const modelDiagnostics  = use3DStore((s) => s.modelDiagnostics);
  const rendererTelemetry = use3DStore((s) => s.rendererQualityTelemetry);
  const morphOverrides    = use3DStore((s) => s.cloneA?.weights || EMPTY_OBJECT);
  const manualMorphOverrides = use3DStore((s) => s.morphOverrides?.current || EMPTY_OBJECT);
  const quality           = use3DStore((s) => s.gpuTier);
  const cinematic         = use3DStore((s) => s.cinematicState);
  const heatmapMode       = use3DStore((s) => s.vfxState?.heatmap);
  const vascMode          = use3DStore((s) => s.vfxState?.vascularity);
  const auraMode          = use3DStore((s) => s.vfxState?.aura);
  const splitPos          = use3DStore((s) => (s.splitDividerX || 0.5) * 100);
  const milestones        = use3DStore((s) => s.ambitionPath?.milestones || EMPTY_ARRAY);
  const snapshots         = use3DStore((s) => s.timelineSnaps || EMPTY_ARRAY);
  const timelinePos       = use3DStore((s) => s.timelineScrubIndex || 0);
  const stressLevel       = use3DStore((s) => s.stressLevel);
  const ambitionPath      = use3DStore((s) => s.ambitionPath);

  // ── Actions
  const setViewMode       = use3DStore((s) => s.setViewMode);
  const setRenderMode     = use3DStore((s) => s.setRenderMode);
  const setCameraPreset   = use3DStore((s) => s.setCameraPreset);
  const setCameraZoom     = use3DStore((s) => s.setCameraZoom);
  const resetCameraZoom   = use3DStore((s) => s.resetCameraZoom);
  const fitCameraToBody   = use3DStore((s) => s.fitCameraToBody);
  const setAutoRotate     = use3DStore((s) => s.setAutoRotate);
  const setStressLevel    = use3DStore((s) => s.setStressLevel);
  const setWardrobe       = use3DStore((s) => s.setWardrobe);
  const setAnatomyDepth   = use3DStore((s) => s.setAnatomyDepth);
  const setPrivateAnatomyVisible = use3DStore((s) => s.setPrivateAnatomyVisible);
  const setSelectedPart   = use3DStore((s) => s.setFocusedBodyPart);
  const setVfx            = use3DStore((s) => s.setVfx);
  const setSplitDividerX  = use3DStore((s) => s.setSplitDividerX);
  const setSplitPos       = useCallback((v: number) => setSplitDividerX(v / 100), [setSplitDividerX]);
  const setQuality        = use3DStore((s) => s.setGpuTier);
  const setCinematicSetting = use3DStore((s) => s.setCinematicSetting);
  const setCinematicState = use3DStore((s) => s.setCinematicState);
  const applyCinematicPreset = use3DStore((s) => s.applyCinematicPreset);
  const setTimelinePos    = use3DStore((s) => s.scrubTimeline);
  const updateCurrentMetric = use3DStore((s) => s.setCurrentMetric);
  const updateGoalMetric  = use3DStore((s) => s.setGoalMetric);
  const setPosture        = use3DStore((s) => s.setPosture);
  const addTimelineSnap   = use3DStore((s) => s.addTimelineSnap);
  const setTimelineSnaps  = use3DStore((s) => s.setTimelineSnaps);
  const setCurrentMetrics = use3DStore((s) => s.setCurrentMetrics);
  const setGoalMetrics    = use3DStore((s) => s.setGoalMetrics);
  const setMorphOverrideAction = use3DStore((s) => s.setMorphOverride);
  const setMorphOverrides = use3DStore((s) => s.setMorphOverrides);
  const clearMorphOverrides = use3DStore((s) => s.clearMorphOverrides);
  const setMilestones     = use3DStore((s) => s.setMilestones);
  const [cameraZoom, setCameraZoomState] = useState(() => use3DStore.getState().cameraZoom ?? 1);

  const bodyProfileState = useStore((s: any) => s.bodyProfile);
  const metricLogsState = useStore((s: any) => s.metric_logs);
  const persistedPhysiqueState = useStore((s: any) => s.physiqueTargets);
  const bodyProfile = bodyProfileState || EMPTY_OBJECT;
  const globalMetricLogs = metricLogsState || EMPTY_ARRAY;
  const persistedPhysique = persistedPhysiqueState || EMPTY_OBJECT;
  const qualityGate = useMemo(() => buildRendererQualityGate({
    diagnostics: modelDiagnostics,
    telemetry: rendererTelemetry,
    renderMode,
    cinematicState: cinematic,
    gpuTier: quality,
    settingsPersisted: Boolean(persistedPhysique?.renderSettings),
  }), [cinematic, modelDiagnostics, persistedPhysique?.renderSettings, quality, renderMode, rendererTelemetry]);
  const updateBodyProfile = useStore((s: any) => s.updateBodyProfile);
  const updatePhysiqueTargets = useStore((s: any) => s.updatePhysiqueTargets);
  const saveMetricLog = useStore((s: any) => s.saveMetricLog);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueProfileSave = useCallback((nextCurrent: any, nextGoal: any, nextMorphOverrides: any = manualMorphOverrides) => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      try {
        const appearanceMetrics = Object.fromEntries(BODY_APPEARANCE_FIELDS.flatMap(([key]) => (
          nextCurrent?.[key] === undefined || nextCurrent?.[key] === null || nextCurrent?.[key] === ''
            ? []
            : [[key, nextCurrent[key]]]
        )));
        await updateBodyProfile(metricsToBodyProfile(nextCurrent, nextGoal));
        await updatePhysiqueTargets({
          ...(persistedPhysique || {}),
          goalMetrics: nextGoal,
          appearanceMetrics: {
            ...(persistedPhysique?.appearanceMetrics || {}),
            ...appearanceMetrics,
          },
          privateMetrics: {
            ...(Number.isFinite(Number(nextCurrent?.d_size)) ? { d_size: Number(nextCurrent.d_size) } : {}),
            ...(Number.isFinite(Number(nextCurrent?.d_girth)) ? { d_girth: Number(nextCurrent.d_girth) } : {}),
          },
          morphOverrides: {
            ...(persistedPhysique?.morphOverrides || {}),
            current: nextMorphOverrides,
          },
        });
      } catch {
        toast.error('Could not save physique measurements.');
      }
    }, 650);
  }, [manualMorphOverrides, persistedPhysique, toast, updateBodyProfile, updatePhysiqueTargets]);

  const setAdvancedMorph = useCallback((key: string, value: number) => {
    const nextOverrides = { ...manualMorphOverrides, [key]: value };
    setMorphOverrideAction('current', key, value);
    queueProfileSave(currentMetrics, goalMetrics, nextOverrides);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, setMorphOverrideAction]);

  const resetAdvancedMorphs = useCallback(() => {
    clearMorphOverrides('current');
    queueProfileSave(currentMetrics, goalMetrics, {});
  }, [clearMorphOverrides, currentMetrics, goalMetrics, queueProfileSave]);

  const queueRenderSettingsSave = useCallback((nextSettings: any) => {
    if (renderPersistTimerRef.current) clearTimeout(renderPersistTimerRef.current);
    renderPersistTimerRef.current = setTimeout(async () => {
      try {
        const latest = useStore.getState().physiqueTargets || {};
        await updatePhysiqueTargets({ ...latest, renderSettings: nextSettings });
      } catch {
        toast.error('Could not save cinematic settings.');
      }
    }, 450);
  }, [toast, updatePhysiqueTargets]);

  const handleCinematicSetting = useCallback((key: string, value: any) => {
    setCinematicSetting(key, value);
    const next = { ...cinematic, [key]: value, preset: key === 'preset' ? value : 'CUSTOM' };
    queueRenderSettingsSave(next);
  }, [cinematic, queueRenderSettingsSave, setCinematicSetting]);

  const handleCinematicPreset = useCallback((preset: string) => {
    const next = (CINEMATIC_PRESETS as any)[preset];
    if (!next) return;
    applyCinematicPreset(preset);
    queueRenderSettingsSave(next);
  }, [applyCinematicPreset, queueRenderSettingsSave]);

  const handleCurrentValue = useCallback((key: string, rawValue: string) => {
    if (rawValue.trim() === '') return;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const next = { ...currentMetrics, [key]: value };
    updateCurrentMetric(key, value);
    queueProfileSave(next, goalMetrics, manualMorphOverrides);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, updateCurrentMetric]);

  const handleGoalValue = useCallback((key: string, rawValue: string) => {
    if (rawValue.trim() === '') return;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const next = { ...goalMetrics, [key]: value };
    updateGoalMetric(key, value);
    queueProfileSave(currentMetrics, next, manualMorphOverrides);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, updateGoalMetric]);

  const updateCurrentAppearance = useCallback((key: string, value: string | number) => {
    const next = { ...currentMetrics, [key]: value };
    updateCurrentMetric(key as any, value as any);
    queueProfileSave(next, goalMetrics, manualMorphOverrides);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, updateCurrentMetric]);

  const updateGoalAppearance = useCallback((key: string, value: string | number) => {
    const next = { ...goalMetrics, [key]: value };
    updateGoalMetric(key as any, value as any);
    queueProfileSave(currentMetrics, next, manualMorphOverrides);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, updateGoalMetric]);

  const saveSnapshot = useCallback(async () => {
    const snapshot = { id: Date.now().toString(), metrics: { ...currentMetrics }, date: new Date().toISOString(), label: 'Physique check-in' };
    addTimelineSnap(snapshot);
    await saveMetricLog({ date: snapshot.date.slice(0, 10), metric: 'physique_snapshot', source: 'physique', metrics: snapshot.metrics, label: snapshot.label });
  }, [addTimelineSnap, currentMetrics, saveMetricLog]);

  // ── Local UI state
  const [showEditor, setShowEditor] = useState(false);
  const [editorTab, setEditorTab] = useState(() => sessionStorage.getItem('chamber_tab') || 'metrics');
  const [sensitiveUnlocked, setSensitiveUnlocked] = useState(false);
  const [splitDragging, setSplitDragging] = useState(false);
  const [storyStage, setStoryStage] = useState('current');

  // Settings drawer
  const [showSettings, setShowSettings] = useState(false);
  const skinTone = currentMetrics.skinTone || 'IV';
  const eyeColor = currentMetrics.eyeColor || '#6b3b20';
  const hairA = { style: currentMetrics.hairStyle || 'short', color: currentMetrics.hairColor || '#2c1a0a' };
  const hairB = { style: goalMetrics.hairStyle || 'short', color: goalMetrics.hairColor || '#2c1a0a' };

  const toggleSensitiveAnatomy = useCallback(() => {
    const next = !sensitiveUnlocked;
    setSensitiveUnlocked(next);
    setPrivateAnatomyVisible(next);
    if (next) setWardrobe('ANATOMICAL');
  }, [sensitiveUnlocked, setPrivateAnatomyVisible, setWardrobe]);

  // Timeline playback
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const timelineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Milestone tooltip

  // Morphs tab — collapsed groups
  const [openMorphGroups, setOpenMorphGroups] = useState<Record<string, boolean>>({ 'Upper Body': true });

  // ── Persist tab selection
  const handleTabChange = useCallback((id: string) => {
    setEditorTab(id);
    sessionStorage.setItem('chamber_tab', id);
  }, []);

  const handleStoryStage = useCallback((stage: string) => {
    setStoryStage(stage);
    if (stage === 'baseline') {
      setViewMode('TIMELINE');
      setTimelinePos(0);
    } else if (stage === 'current') {
      setViewMode('SOLO');
    } else if (stage === 'goal') {
      setViewMode('GHOST');
    } else {
      setViewMode('TIMELINE');
      setTimelinePos(Math.max(0, snapshots.length - 1));
    }
  }, [setTimelinePos, setViewMode, snapshots.length]);

  // ── Keyboard shortcuts: 1–6 for view modes, Escape for settings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const mode = VIEW_MODES.find((m) => m.key === e.key);
      if (mode) setViewMode(mode.id);
      if (e.key === 'Escape') setShowSettings(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setViewMode]);

  // ── Hydrate the renderer cache from persisted physique records.
  useEffect(() => {
    const normalizedProfile = mergeBodyProfileSources(bodyProfile, legacyUser);
    const persistedCurrent = {
      ...(persistedPhysique?.privateMetrics || {}),
      ...(persistedPhysique?.appearanceMetrics || {}),
      ...bodyProfileToMetrics(normalizedProfile),
    };
    const persistedGoal = bodyProfileToGoals(normalizedProfile, persistedPhysique);
    const persistedSnapshots = metricLogsToSnapshots(globalMetricLogs);
    const persistedMilestones = Array.isArray(persistedPhysique?.milestones) ? persistedPhysique.milestones : [];
    const persistedMorphOverrides = persistedPhysique?.morphOverrides && typeof persistedPhysique.morphOverrides === 'object'
      ? persistedPhysique.morphOverrides
      : { current: {}, goal: {} };
    if (persistedPhysique?.renderSettings && typeof persistedPhysique.renderSettings === 'object') {
      setCinematicState(persistedPhysique.renderSettings);
    }
    setMorphOverrides(persistedMorphOverrides);
    setCurrentMetrics(persistedCurrent);
    setGoalMetrics(persistedGoal);
    setTimelineSnaps(persistedSnapshots);
    setMilestones(persistedMilestones);
  }, [bodyProfile, globalMetricLogs, legacyUser, persistedPhysique, setCinematicState, setCurrentMetrics, setGoalMetrics, setMilestones, setMorphOverrides, setTimelineSnaps]);

  useEffect(() => () => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    if (renderPersistTimerRef.current) clearTimeout(renderPersistTimerRef.current);
    setPrivateAnatomyVisible(false);
  }, [setPrivateAnatomyVisible]);

  // ── Timeline playback auto-scrub
  useEffect(() => {
    if (timelinePlaying && snapshots.length > 1) {
      timelineIntervalRef.current = setInterval(() => {
        const next = ((timelinePos as number) + 1) % snapshots.length;
        setTimelinePos(next);
        if (next === snapshots.length - 1) setTimelinePlaying(false);
      }, 1200);
    } else if (timelineIntervalRef.current) {
      clearInterval(timelineIntervalRef.current);
    }
    return () => { if (timelineIntervalRef.current) clearInterval(timelineIntervalRef.current); };
  }, [timelinePlaying, timelinePos, snapshots.length, setTimelinePos]);

  // ── Overall progress score
  const baselineMetrics = useMemo(() => getBaselineMetrics(snapshots, currentMetrics), [currentMetrics, snapshots]);
  const progressSummary = useMemo(() => calculateGoalProgress({ baseline: baselineMetrics, current: currentMetrics, goal: goalMetrics }), [baselineMetrics, currentMetrics, goalMetrics]);
  const overallScore = progressSummary.score ?? 0;

  // ── Export screenshot
  const waitForProtectedRedraw = useCallback(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }), []);

  const captureScreenshot = useCallback(async () => {
    const canvas = document.querySelector('.chamber-viewport canvas') as HTMLCanvasElement | null;
    if (!canvas) { toast.error('No 3D viewport found.'); return; }
    const restoreSensitiveView = privateAnatomyVisible;
    try {
      if (restoreSensitiveView) {
        setPrivateAnatomyVisible(false);
        await waitForProtectedRedraw();
      }
      const link = document.createElement('a');
      link.download = `MirrorChamber_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Screenshot exported with private anatomy hidden.');
    } finally {
      if (restoreSensitiveView) setPrivateAnatomyVisible(true);
    }
  }, [privateAnatomyVisible, setPrivateAnatomyVisible, toast, waitForProtectedRedraw]);

  const handleShareAvatar = useCallback(async () => {
    const canvas = document.querySelector('.chamber-viewport canvas') as HTMLCanvasElement | null;
    const restoreSensitiveView = privateAnatomyVisible;
    try {
      if (restoreSensitiveView) {
        setPrivateAnatomyVisible(false);
        await waitForProtectedRedraw();
      }
      setShareImageSrc(canvas ? canvas.toDataURL('image/png') as any : null);
      setShowShareModal(true);
    } finally {
      if (restoreSensitiveView) setPrivateAnatomyVisible(true);
    }
  }, [privateAnatomyVisible, setPrivateAnatomyVisible, waitForProtectedRedraw]);

  const handleSaveSnapshot = useCallback(async () => {
    try {
      await saveSnapshot();
      toast.success('Timeline snapshot saved.');
    } catch {
      toast.error('Could not save the snapshot.');
    }
  }, [saveSnapshot, toast]);

  const handleToggleMilestone = useCallback(async (milestone: any) => {
    const next = milestones.map((item: any) => item.id === milestone.id ? { ...item, achieved: !item.achieved } : item);
    setMilestones(next);
    try {
      await updatePhysiqueTargets({ ...(persistedPhysique || {}), milestones: next });
    } catch {
      setMilestones(milestones);
      toast.error('Could not update the milestone.');
    }
  }, [milestones, persistedPhysique, setMilestones, toast, updatePhysiqueTargets]);

  // ── Body part info
  const partInfo = selectedPart ? (BODY_PARTS as any)[selectedPart] : null;

  // ── Currently scrubbed snapshot date label
  const scrubDateLabel = useMemo(() => {
    if (!snapshots.length || timelinePos == null) return null;
    const snap = snapshots[Math.min(timelinePos as number, snapshots.length - 1)] as any;
    return snap?.date ? new Date(snap.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  }, [snapshots, timelinePos]);

  useEffect(() => {
    const unsubscribe = use3DStore.subscribe(
      (state) => state.cameraZoom,
      (zoom) => setCameraZoomState(zoom ?? 1)
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    setCameraZoom(isZoomed ? 1.65 : 1.0);
  }, [isZoomed, setCameraZoom]);

  return (
    <>
    <div className="chamber fade-in chamber-fullscreen-wrap">
      {/* ═══ SCAN BOOT EFFECT + OVERLAYS ═══ */}
      <div className="chamber-scan-boot" />
      <div className="chamber-scanlines" />

      {/* ═══ FLOATING HUD TOP BAR ═══ */}
      <div className="chamber-topbar">
        {/* Left: title + status chips */}
        <div className="chamber-topbar__brand">
          <div className="chamber-topbar__title-row">
            <span className="shimmer-text chamber-topbar__title">
              DIGITAL TWIN
            </span>
            <span className="chamber-topbar__version">v5</span>
          </div>
          <div className="chamber-topbar__chips">
            {/* Render status — detailed model diagnostics live in Settings. */}
            <span
              className="hud-chip healthy"
              style={{ '--hud-delay': '0.1s' } as React.CSSProperties}
            >
              <span className="hud-dot" />
              {modelDiagnostics?.health === 'healthy' ? 'AUTHORED MODEL' : 'PROCEDURAL CG'}
            </span>
            <span className="hud-chip" style={{ '--hud-delay': '0.18s' } as React.CSSProperties}>
              REALTIME MORPHS
            </span>
            <span className="hud-chip cinematic" style={{ '--hud-delay': '0.26s' } as React.CSSProperties}>
              <Camera size={10} /> {cinematic.preset === 'CUSTOM' ? 'CUSTOM GRADE' : `${cinematic.preset} GRADE`}
            </span>
            <span
              className={`hud-chip quality-gate quality-gate--${qualityGate.status}`}
              style={{ '--hud-delay': '0.32s' } as React.CSSProperties}
              title={`${qualityGate.passed} of ${qualityGate.total} quality checks passing`}
            >
              {qualityGate.releaseReady ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
              {qualityGate.releaseReady ? 'QUALITY GATE READY' : qualityGate.status === 'pending' ? 'QUALITY CHECKING' : 'QUALITY BLOCKED'}
            </span>
            {overallScore > 0 && (
              <span className="hud-chip healthy" style={{ '--hud-delay': '0.36s' } as React.CSSProperties}>
                <Star size={10} /> {overallScore}%
              </span>
            )}
          </div>
        </div>
        {/* Right: quality + render mode toggles */}
        <div className="chamber-render-controls chamber-topbar__controls">
          <div className="chamber-quality-switch" aria-label="Render quality">
            {QUALITY_OPTIONS.map((level) => (
              <button key={level} className={`chamber-view-btn${quality === level ? ' active' : ''}`}
                aria-pressed={quality === level} onClick={() => setQuality(level)}>{level === 'MED' ? 'BAL' : level}</button>
            ))}
          </div>
          <div className="chamber-quality-switch" aria-label="Renderer">
            <button className={`chamber-view-btn${renderMode === 'WEBGL' ? ' active' : ''}`}
              aria-pressed={renderMode === 'WEBGL'} onClick={() => setRenderMode('WEBGL')}>3D</button>
            <button className={`chamber-view-btn${renderMode === 'SPRITE' ? ' active' : ''}`}
              aria-pressed={renderMode === 'SPRITE'} onClick={() => setRenderMode('SPRITE')}>2D</button>
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
              {/* Camera presets */}
              <div className="chamber-pill-group">
                {CAMERA_PRESETS.map((p) => (
                  <button key={p.id} className={`chamber-pill${cameraPreset === p.id ? ' active' : ''}`}
                    onClick={() => setCameraPreset(p.id)}>{p.label}</button>
                ))}
              </div>
              <div className="chamber-pill-group">
                <button className="chamber-pill" onClick={() => { fitCameraToBody(); setIsZoomed(false); }}>
                  Fit
                </button>
                <button className="chamber-pill" onClick={() => { resetCameraZoom(); setIsZoomed(false); }}>
                  Reset
                </button>
                <button className={`chamber-pill${isZoomed ? ' active' : ''}`} onClick={() => setIsZoomed((z) => !z)}>
                  Zoom {isZoomed ? 'In' : 'Out'}
                </button>
              </div>
              {/* Export */}
              <button className="chamber-pill chamber-pill--share" onClick={handleShareAvatar}>
                <Share2 size={12} /> SHARE
              </button>
              <button className="chamber-pill chamber-pill--export" onClick={captureScreenshot}>
                <Camera size={12} /> EXPORT
              </button>
            </div>
          </div>

          <aside className="chamber-intelligence-rail" aria-label="Digital twin readout">
            <div className="chamber-readout__label">LIVE READOUT</div>
            <div className="chamber-readout__focus">
              <span className="chamber-readout__pulse" />
              <strong>{selectedPart?.label || 'Full-body scan'}</strong>
              <span>{viewMode === 'DUAL' ? 'Now vs destination' : `${viewMode} inspection`}</span>
            </div>
            <div className="chamber-readout__metrics">
              <div><span>Weight</span><strong>{Number(currentMetrics.weight ?? 0).toFixed(1)}<small> kg</small></strong></div>
              <div><span>Body fat</span><strong>{Number(currentMetrics.bodyFat ?? 0).toFixed(1)}<small>%</small></strong></div>
              <div><span>Goal delta</span><strong className={Number(goalMetrics.weight ?? 0) - Number(currentMetrics.weight ?? 0) >= 0 ? 'positive' : 'negative'}>{(Number(goalMetrics.weight ?? 0) - Number(currentMetrics.weight ?? 0) >= 0 ? '+' : '')}{(Number(goalMetrics.weight ?? 0) - Number(currentMetrics.weight ?? 0)).toFixed(1)}<small> kg</small></strong></div>
            </div>
            <div className="chamber-readout__footer"><span>SCAN RESOLUTION</span><strong>{quality === 'HIGH' ? '12.4M' : quality === 'MED' ? '6.2M' : '2.8M'} pts</strong></div>
          </aside>

          <div className="chamber-stage-badge">
            <span>ADVANCED MODE</span>
            <small>PARAMETRIC BODY ANALYSIS</small>
          </div>

          <nav className="chamber-storyline" aria-label="Transformation story">
            <span className="chamber-storyline__title">TRANSFORMATION STORY</span>
            {[
              ['baseline', 'Baseline'],
              ['current', 'Current'],
              ['goal', 'Goal'],
              ['forecast', 'Forecast'],
            ].map(([id, label], index) => (
              <React.Fragment key={id}>
                {index > 0 && <span className="chamber-storyline__connector" aria-hidden="true" />}
                <button className={storyStage === id ? 'active' : ''} aria-pressed={storyStage === id} onClick={() => handleStoryStage(id)}>{label}</button>
              </React.Fragment>
            ))}
          </nav>

          {/* 3D Canvas */}
          <TabErrorBoundary
            tabName="Digital Twin 3D Engine"
            fallback={
              <div className="chamber-spinner">
                <div style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                  <strong>3D Engine Error</strong>
                  <div style={{ opacity: 0.7, marginTop: '0.25rem', fontSize: '0.75rem' }}>Reload the page to retry</div>
                </div>
              </div>
            }
          >
            <Suspense fallback={<ChamberSpinner />}>
              <div className="chamber-canvas-wrap">
                {renderMode === 'SPRITE'
                  ? <Sprite3DViewer />
                  : <ChamberCanvas />}
              </div>
            </Suspense>
          </TabErrorBoundary>

          {/* ── TIMELINE SCRUBBER ── */}
          {viewMode === 'TIMELINE' && (() => {
            const firstSnap = snapshots[0] as any;
            const lastSnap  = snapshots[snapshots.length - 1] as any;
            const startLabel = firstSnap
              ? new Date(firstSnap.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
              : 'Start';
            const endLabel = lastSnap
              ? new Date(lastSnap.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
              : 'Goal';
            return (
              <div className="chamber-timeline">
                {/* Playback row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <button className="chamber-fab" style={{ width: 28, height: 28 }}
                    onClick={() => setTimelinePlaying((p) => !p)}
                    title={timelinePlaying ? 'Pause' : 'Play timeline'}>
                    {timelinePlaying ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  {scrubDateLabel && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--chamber-gold)', fontWeight: 600 }}>
                      {scrubDateLabel}
                    </span>
                  )}
                </div>
                <div className="chamber-timeline__track">
                  {milestones.map((m: any, i: number) => (
                    <div key={i} className={`chamber-milestone${m.achieved ? ' achieved' : ''}`}
                      style={{ left: `${((m.monthIndex ?? 0) / 20) * 100}%` }}
                      title={m.label}>
                      <div className="chamber-milestone__dot" />
                      <span className="chamber-milestone__label">{m.label.split('—')[0]}</span>
                    </div>
                  ))}
                  <input type="range" min="0" max={Math.max(snapshots.length - 1, 1)} value={timelinePos as number}
                    onChange={(e) => { setTimelinePos(parseInt(e.target.value)); setTimelinePlaying(false); }}
                    className="chamber-timeline__slider" />
                </div>
                <div className="chamber-timeline__ends">
                  <span>{startLabel}</span>
                  <span style={{ color: 'var(--chamber-gold)' }}>{endLabel} — DESTINATION</span>
                </div>
              </div>
            );
          })()}

          {/* Floating action buttons */}
          <div className="chamber-fab-row">
            <button className={`chamber-fab${autoRotate ? ' active' : ''}`} onClick={() => setAutoRotate(!autoRotate)} title={autoRotate ? 'Pause cinematic orbit' : 'Cinematic orbit'} aria-pressed={autoRotate}>
              <Rotate3D size={16} />
            </button>
            <button className={`chamber-fab${showEditor ? ' active' : ''}`} onClick={() => setShowEditor(!showEditor)} title="Open body editor" aria-expanded={showEditor}>
              <SlidersHorizontal size={16} />
            </button>
            <button className="chamber-fab" onClick={() => setShowSettings(!showSettings)} title="Settings">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* ── EDITOR SIDEBAR ── */}
        {showEditor && (
          <div className="chamber-editor">
            {/* Editor tabs */}
            <div className="chamber-editor__tabs">
              {[
                { id: 'metrics',  label: 'Metrics', icon: Ruler   },
                { id: 'morphs',   label: 'Morphs',  icon: Zap     },
                { id: 'face',     label: 'Face',     icon: Eye     },
                { id: 'wardrobe', label: 'Outfit',   icon: Shirt   },
                { id: 'anatomy',  label: 'Anatomy',  icon: Layers  },
              ].map((tab) => (
                <button key={tab.id}
                  aria-label={tab.label}
                  className={`chamber-editor__tab${editorTab === tab.id ? ' active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}>
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
                    {Object.entries(METRIC_LABELS).map(([key, meta]) => {
                      const cur = currentMetrics[key] as number ?? 0;
                      const goal = goalMetrics[key] as number ?? 0;
                      const dir = meta.direction;
                      const pctRaw = goal > 0 ? (dir === 'decrease'
                        ? cur <= goal ? 100 : Math.max(0, Math.min(100, ((Math.max(cur, goal) - cur) / (Math.max(cur, goal) - goal)) * 100))
                        : Math.min(100, Math.max(0, (cur / goal) * 100))
                      ) : 0;
                      const pct = Math.round(pctRaw);
                      const progressColor = pct >= 75 ? 'var(--chamber-success)' : pct >= 40 ? 'var(--chamber-gold)' : 'var(--chamber-glow)';
                      return (
                        <div key={key} className="chamber-metric-row">
                          <div className="chamber-metric-row__header">
                            <span className="chamber-metric-row__label">{meta.label}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="chamber-metric-row__value">
                                {cur}{meta.unit}
                              </span>
                              <span style={{
                                fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px',
                                borderRadius: 4, background: progressColor + '22',
                                color: progressColor,
                              }}>{pct}%</span>
                            </span>
                          </div>
                          {/* NOW slider */}
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: 2 }}>NOW</div>
                          <input type="range"
                            min={key === 'bodyFat' ? 5 : 30}
                            max={key === 'bodyFat' ? 40 : key === 'weight' ? 130 : 150}
                            step={1} value={cur}
                            onChange={(e) => updateCurrentMetric(key, parseFloat(e.target.value))}
                            className="chamber-slider" />
                          {/* GOAL slider */}
                          <div style={{ fontSize: '0.6rem', color: 'var(--chamber-glow)', marginBottom: 2, marginTop: 4 }}>
                            GOAL <span style={{ float: 'right' }}>{goal}{meta.unit}</span>
                          </div>
                          <input type="range"
                            min={key === 'bodyFat' ? 5 : 30}
                            max={key === 'bodyFat' ? 40 : key === 'weight' ? 130 : 150}
                            step={1} value={goal}
                            onChange={(e) => updateGoalMetric(key, parseFloat(e.target.value))}
                            className="chamber-slider"
                            style={{ accentColor: 'var(--chamber-glow)', opacity: 0.75 }} />
                          {/* Progress bar */}
                          <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: progressColor, borderRadius: 2, transition: 'width 0.3s ease' }} />
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              )}

              {/* ── MORPHS TAB ── */}
              {editorTab === 'morphs' && (
                <div className="chamber-editor__section">
                  {/* Bio-Feedback */}
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
                    <p style={{ fontSize: '0.68rem', color: stressLevel > 60 ? '#ef4444' : 'var(--text-3)', marginTop: '4px' }}>
                      {stressLevel > 80 ? '🔴 High cortisol — face flush active' : stressLevel > 40 ? '🟡 Moderate stress' : '🟢 Relaxed state'}
                    </p>
                  </div>

                  <div className="chamber-divider" />

                  {/* Morph weight groups */}
                  {MORPH_WEIGHT_GROUPS.map((grp) => (
                    <div key={grp.group} style={{ marginBottom: 8 }}>
                      <button
                        onClick={() => setOpenMorphGroups((o) => ({ ...o, [grp.group]: !o[grp.group] }))}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none',
                          border: 'none', cursor: 'pointer',
                          color: 'var(--text-2)', fontSize: '0.7rem',
                          fontWeight: 700, letterSpacing: '0.06em',
                          padding: '4px 0', display: 'flex', justifyContent: 'space-between',
                        }}>
                        {grp.group.toUpperCase()}
                        <span style={{ fontSize: '0.8rem' }}>{openMorphGroups[grp.group] ? '▲' : '▼'}</span>
                      </button>
                      {openMorphGroups[grp.group] && grp.items.map((s) => {
                        const value = Number.isFinite(Number(manualMorphOverrides[s.id]))
                          ? Number(manualMorphOverrides[s.id])
                          : Number.isFinite(Number(morphOverrides[s.id]))
                            ? Number(morphOverrides[s.id])
                            : 0;
                        return (
                          <div key={s.id} className="chamber-morph-row">
                            <div className="chamber-morph-row__header">
                              <span>{s.label}</span>
                              <span className="chamber-morph-row__value">{Math.round(value * 100)}%</span>
                            </div>
                            <input type="range"
                              min={0} max={1} step={0.01}
                              value={value}
                              onChange={(e) => setAdvancedMorph(s.id, parseFloat(e.target.value))}
                              className="chamber-slider" />
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  <div className="chamber-divider" />
                  <h4 className="chamber-editor__heading"><SlidersHorizontal size={14} /> Advanced shape mixer</h4>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.45, margin: '-2px 0 8px' }}>
                    Fine-tune proportion channels without changing the measured values. The engine keeps the result within anatomical constraints.
                  </p>
                  {ADVANCED_MORPH_CONTROLS.map(({ key, label }) => {
                    const value = (manualMorphOverrides[key] as number) ?? (morphOverrides[key] as number) ?? 0;
                    return (
                      <div key={key} className="chamber-morph-row">
                        <div className="chamber-morph-row__header">
                          <span>{label}</span>
                          <span className="chamber-morph-row__value">{Math.round(value * 100)}%</span>
                        </div>
                        <input type="range" min={0} max={1} step={0.01} value={value}
                          onChange={(e) => setAdvancedMorph(key, parseFloat(e.target.value))}
                          className="chamber-slider" />
                      </div>
                    );
                  })}
                  <button className="chamber-pill" onClick={resetAdvancedMorphs} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                    Reset manual shape overrides
                  </button>
                </div>
              )}

              {/* ── FACE TAB ── */}
              {editorTab === 'face' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading"><Eye size={14} /> Facial Anatomy</h4>
                  {[
                    { key: 'eye_size',          label: 'Eye Size',        min: 0, max: 1, step: 0.01 },
                    { key: 'brow_depth',        label: 'Brow Ridge',      min: 0, max: 1, step: 0.01 },
                    { key: 'nose_bridge_width', label: 'Nose Bridge',     min: 0, max: 1, step: 0.01 },
                    { key: 'nose_tip_size',     label: 'Nose Tip',        min: 0, max: 1, step: 0.01 },
                    { key: 'lip_fullness',      label: 'Lip Fullness',    min: 0, max: 1, step: 0.01 },
                    { key: 'ear_prominence',    label: 'Ear Prominence',  min: 0, max: 1, step: 0.01 },
                    { key: 'jaw_width',         label: 'Jaw Width',       min: 0, max: 1, step: 0.01 },
                    { key: 'chin_projection',   label: 'Chin Projection', min: 0, max: 1, step: 0.01 },
                  ].map((s) => {
                    const val = (manualMorphOverrides[s.key] as number) ?? (morphOverrides[s.key] as number) ?? 0.35;
                    return (
                      <div key={s.key} className="chamber-morph-row">
                        <div className="chamber-morph-row__header">
                          <span>{s.label}</span>
                          <span className="chamber-morph-row__value">{(val * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min={s.min} max={s.max} step={s.step}
                          value={val}
                          onChange={(e) => setAdvancedMorph(s.key, parseFloat(e.target.value))}
                          className="chamber-slider" />
                      </div>
                      );
                    })}

                  <div className="chamber-divider" />
                  <h4 className="chamber-editor__heading"><Zap size={14} /> Expressions</h4>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.45, margin: '-2px 0 8px' }}>
                    Preview the production expression channels. These controls are saved as shape overrides and never alter measurements.
                  </p>
                  {[
                    { key: 'blink', label: 'Blink' },
                    { key: 'smile', label: 'Smile' },
                    { key: 'jaw_open', label: 'Jaw open' },
                  ].map((s) => {
                    const val = Number(manualMorphOverrides[s.key] ?? morphOverrides[s.key] ?? 0);
                    return (
                      <div key={s.key} className="chamber-morph-row">
                        <div className="chamber-morph-row__header">
                          <span>{s.label}</span>
                          <span className="chamber-morph-row__value">{Math.round(val * 100)}%</span>
                        </div>
                        <input type="range" min={0} max={1} step={0.01} value={val}
                          onChange={(e) => setAdvancedMorph(s.key, parseFloat(e.target.value))}
                          className="chamber-slider" />
                      </div>
                    );
                  })}

                  <div className="chamber-divider" />

                  {/* Hair — side-by-side for NOW and GOAL */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {([
                      { key: 'A' as const, label: 'YOU NOW', state: hairA, update: updateCurrentAppearance, accentColor: 'var(--chamber-current)' },
                      { key: 'B' as const, label: 'YOUR GOAL', state: hairB, update: updateGoalAppearance, accentColor: 'var(--chamber-glow)' },
                    ]).map(({ key, label, state, update, accentColor }) => (
                      <div key={key}>
                        <p style={{ fontSize: '0.6rem', color: accentColor, fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em' }}>{label}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 6 }}>
                          {[
                            { id: 'bald', icon: '○' },
                            { id: 'short', icon: '✦' },
                          ].map((h) => (
                            <button key={h.id}
                              className={`chamber-wardrobe-card${state.style === h.id ? ' active' : ''}`}
                              style={{ '--accent': accentColor } as React.CSSProperties}
                              onClick={() => update('hairStyle', h.id)}>
                              <span style={{ fontSize: '1rem' }}>{h.icon}</span>
                              <span className="chamber-wardrobe-card__label" style={{ fontSize: '0.58rem' }}>{h.id}</span>
                            </button>
                          ))}
                        </div>
                        {/* Colour swatches */}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {[
                            { id: 'black', hex: '#110a05' }, { id: 'darkbrown', hex: '#2c1a0a' },
                            { id: 'brown', hex: '#6b3a1a' }, { id: 'auburn', hex: '#8b3a2a' },
                            { id: 'blonde', hex: '#c8a04a' }, { id: 'grey', hex: '#888880' },
                            { id: 'white', hex: '#d8d8d4' },
                          ].map((c) => (
                            <button key={c.id}
                              onClick={() => update('hairColor', c.hex)}
                              title={c.id}
                              style={{
                                width: 18, height: 18, borderRadius: '50%',
                                border: state.color === c.hex ? `2px solid ${accentColor}` : '2px solid transparent',
                                background: c.hex, cursor: 'pointer', flexShrink: 0,
                              }} />
                          ))}
                        </div>
                      </div>
                    ))}
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
                    {wardrobe === 'ANATOMICAL'
                      ? 'Anatomical mode — full body visible for measurement comparison.'
                      : wardrobe === 'UNDERWEAR'
                      ? 'Underwear mode — full physique for body composition analysis.'
                      : `${wardrobe.charAt(0).toUpperCase() + wardrobe.slice(1).toLowerCase()} outfit applied.`}
                  </p>
                </div>
              )}

              {/* ── ANATOMY TAB ── */}
              {editorTab === 'anatomy' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading">
                    <Layers size={14} /> Anatomical Peel
                  </h4>
                  {/* Animated SVG */}
                  <AnatomySVG depth={anatomyDepth} />

                  <div className="chamber-anatomy-visual" style={{ marginTop: 12 }}>
                    <div className="chamber-anatomy-layers">
                      <div className={`chamber-anatomy-layer${anatomyDepth > 70 ? ' active' : ''}`}>
                        <Eye size={12} /> Skin
                      </div>
                      <div className={`chamber-anatomy-layer${anatomyDepth <= 70 && anatomyDepth > 30 ? ' active' : ''}`}>
                        <Dumbbell size={12} /> Muscle
                      </div>
                      <div className={`chamber-anatomy-layer${anatomyDepth <= 30 && anatomyDepth > 10 ? ' active' : ''}`}>
                        <Heart size={12} /> Skeleton
                      </div>
                      <div className={`chamber-anatomy-layer${anatomyDepth <= 10 ? ' active' : ''}`}>
                        <Heart size={12} fill="red" /> Organs
                      </div>
                    </div>
                    {/* Depth markers */}
                    <div style={{ position: 'relative', height: 16, margin: '6px 0' }}>
                      {[0, 33, 66, 100].map((mark) => (
                        <button key={mark}
                          onClick={() => setAnatomyDepth(mark)}
                          style={{
                            position: 'absolute', left: `${mark}%`, transform: 'translateX(-50%)',
                            width: 8, height: 8, borderRadius: '50%', padding: 0,
                            background: anatomyDepth <= mark + 5 && anatomyDepth >= mark - 5
                              ? 'var(--chamber-glow)' : 'var(--surface-3)',
                            border: '1px solid var(--chamber-glow)',
                            cursor: 'pointer',
                          }} />
                      ))}
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

                  <div className="chamber-sensitive-card">
                    <div className="chamber-sensitive-card__head">
                      <div>
                        <h4><Eye size={13} /> Private anatomy</h4>
                        <p>Hidden by default and automatically removed from screenshots and sharing.</p>
                      </div>
                      <button
                        className={`chamber-pill${sensitiveUnlocked ? ' active' : ''}`}
                        aria-pressed={sensitiveUnlocked}
                        disabled={!modelDiagnostics?.hasPrivateAnatomy}
                        onClick={toggleSensitiveAnatomy}
                      >
                        {sensitiveUnlocked ? 'Hide' : modelDiagnostics?.hasPrivateAnatomy ? 'Reveal for session' : 'Asset unavailable'}
                      </button>
                    </div>

                    {sensitiveUnlocked && modelDiagnostics?.hasPrivateAnatomy && (
                      <div className="chamber-sensitive-grid">
                        {[
                          { key: 'd_size', label: 'Length', min: 3, max: 9 },
                          { key: 'd_girth', label: 'Girth', min: 3, max: 7 },
                        ].map((metric) => (
                          <div key={metric.key} className="chamber-sensitive-field">
                            <strong>{metric.label}</strong>
                            <label>
                              <span>Current</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={metric.min}
                                max={metric.max}
                                step="0.1"
                                value={(currentMetrics as any)[metric.key] ?? ''}
                                placeholder="Not set"
                                onChange={(event) => handleCurrentValue(metric.key, event.target.value)}
                              />
                              <em>in</em>
                            </label>
                            <label>
                              <span>Goal</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={metric.min}
                                max={metric.max}
                                step="0.1"
                                value={(goalMetrics as any)[metric.key] ?? ''}
                                placeholder="Not set"
                                onChange={(event) => handleGoalValue(metric.key, event.target.value)}
                              />
                              <em>in</em>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SETTINGS DRAWER ═══ */}
      {showSettings && (
        <div className="chamber-settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="chamber-settings-drawer soft-neumorphism glassmorphism" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: '1rem' }}>
                <Settings size={16} color="var(--chamber-glow)" /> Chamber Settings
              </h3>
              <button className="chamber-pill" onClick={() => setShowSettings(false)}>
                <X size={14} /> Close
              </button>
            </div>

            {/* Appearance */}
            <div className="chamber-settings-section">
              <h4 className="chamber-editor__heading"><Palette size={13} /> Appearance</h4>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 8 }}>Skin Tone (Fitzpatrick)</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {FITZPATRICK_SWATCHES.map((s) => (
                  <button key={s.id} title={s.label}
                    onClick={() => updateCurrentAppearance('skinTone', s.id)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: s.hex,
                      border: skinTone === s.id ? '2px solid var(--chamber-glow)' : '2px solid var(--border)',
                      cursor: 'pointer', transition: 'transform 0.15s',
                    }} />
                ))}
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 6 }}>Eye Colour</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                {EYE_COLOR_PRESETS.map((c) => (
                  <button key={c} onClick={() => updateCurrentAppearance('eyeColor', c)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', background: c,
                      border: eyeColor === c ? '2px solid var(--chamber-glow)' : '2px solid transparent',
                      cursor: 'pointer',
                    }} />
                ))}
                <input type="color" value={eyeColor} onChange={(e) => updateCurrentAppearance('eyeColor', e.target.value)}
                  title="Custom eye colour"
                  style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }} />
              </div>
              <div className="chamber-morph-row" style={{ marginBottom: 4 }}>
                <div className="chamber-morph-row__header">
                  <span>Body hair detail</span>
                  <span className="chamber-morph-row__value">{Math.round(Number(currentMetrics.bodyHairDensity ?? 0.18) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={Number(currentMetrics.bodyHairDensity ?? 0.18)}
                  onChange={(event) => updateCurrentAppearance('bodyHairDensity', Number(event.target.value))}
                  className="chamber-slider"
                  aria-label="Body hair detail"
                />
              </div>
            </div>

            {/* Posture */}
            <div className="chamber-settings-section">
              <h4 className="chamber-editor__heading"><Activity size={13} /> Posture Preset</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {POSTURE_PRESETS.map((p) => (
                  <button key={p.id} className="chamber-pill"
                    onClick={() => setPosture('current', p.posture)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scene */}
            <div className="chamber-settings-section">
              <h4 className="chamber-editor__heading"><Globe size={13} /> Scene Environment</h4>
              <div className="chamber-pill-group" style={{ flexWrap: 'wrap' }}>
                {SCENE_ENVS.map((env) => (
                  <button key={env.id}
                    className={`chamber-pill${cinematic.sceneEnvironment === env.id ? ' active' : ''}`}
                    onClick={() => handleCinematicSetting('sceneEnvironment', env.id)}>
                    {env.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="chamber-settings-section">
              <h4 className="chamber-editor__heading"><Camera size={13} /> Cinematic Look</h4>
              <div className="chamber-look-grid">
                {CINEMATIC_LOOKS.map((look) => (
                  <button key={look.id}
                    className={`chamber-look-card${cinematic.preset === look.id ? ' active' : ''}`}
                    aria-pressed={cinematic.preset === look.id}
                    onClick={() => handleCinematicPreset(look.id)}>
                    <strong>{look.label}</strong>
                    <span>{look.note}</span>
                  </button>
                ))}
              </div>
              <label className="chamber-exposure-control">
                <span>Exposure <strong>{cinematic.exposure.toFixed(2)}</strong></span>
                <input type="range" min="0.72" max="1.35" step="0.01" value={cinematic.exposure}
                  onChange={(e) => handleCinematicSetting('exposure', parseFloat(e.target.value))}
                  className="chamber-slider" />
              </label>
            </div>

            {/* Post-FX toggles */}
            <div className="chamber-settings-section">
              <h4 className="chamber-editor__heading"><FlaskConical size={13} /> Post-Processing</h4>
              {[
                { key: 'bloom', label: 'Bloom', val: cinematic.bloom },
                { key: 'vignette', label: 'Vignette', val: cinematic.vignette },
                { key: 'chromaticAberration', label: 'Chromatic Aberration', val: cinematic.chromaticAberration },
                { key: 'depthOfField', label: 'Depth of Field', val: cinematic.depthOfField },
                { key: 'filmGrain', label: 'Film Grain', val: cinematic.filmGrain },
                { key: 'cameraMotion', label: 'Cinematic Camera', val: cinematic.cameraMotion },
              ].map(({ key, label, val }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{label}</span>
                  <button className={`chamber-pill${val ? ' active' : ''}`}
                    style={{ fontSize: '0.65rem', padding: '2px 10px' }}
                    onClick={() => handleCinematicSetting(key, !val)}>
                    {val ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>

            {/* Export */}
            <div className="chamber-settings-section chamber-quality-gate" aria-live="polite">
              <div className="chamber-quality-gate__header">
                <div>
                  <h4 className="chamber-editor__heading"><CheckCircle size={13} /> Phase 5 Quality Gate</h4>
                  <p>{qualityGate.releaseReady ? 'Runtime release checks are clear.' : 'A release-blocking check needs attention.'}</p>
                </div>
                <strong className={`quality-gate-badge quality-gate-badge--${qualityGate.status}`}>
                  {qualityGate.passed}/{qualityGate.total}
                </strong>
              </div>
              <div className="chamber-quality-gate__checks">
                {qualityGate.checks.map((item) => (
                  <div key={item.id} className={`quality-check quality-check--${item.status}`}>
                    {item.status === 'pass' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export */}
            <div className="chamber-settings-section">
              <h4 className="chamber-editor__heading"><Download size={13} /> Export</h4>
              <button className="chamber-pill" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { captureScreenshot(); setShowSettings(false); }}>
                <Camera size={13} /> Save Screenshot
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ═══ SELECTED BODY PART DETAIL ═══ */}
      {partInfo && (
        <div className="chamber-part-detail glass-card"
          style={{ borderColor: (STATUS as any)[partInfo.status]?.color || 'var(--border)' }}>
          <div className="chamber-part-detail__header">
            <div className="chamber-part-detail__title-row">
              <span className="chamber-part-detail__icon">{partInfo.icon}</span>
              <div>
                <h3>{partInfo.name}</h3>
                <span className="label-caps" style={{ color: (STATUS as any)[partInfo.status]?.color }}>
                  {(STATUS as any)[partInfo.status]?.label} STATUS
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
                {partInfo.issues?.map((iss: string, i: number) => <li key={i}>{iss}</li>)}
              </ul>
            </div>
            <div>
              <p className="label-caps chamber-part-detail__label">
                <CheckCircle size={12} /> Restoration Plan
              </p>
              <ul className="chamber-part-detail__list chamber-part-detail__list--fixes">
                {partInfo.fixes?.map((fix: string, i: number) => <li key={i}>{fix}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <PhysiqueDataPanel
        current={currentMetrics}
        goal={goalMetrics}
        baseline={baselineMetrics}
        snapshots={snapshots}
        milestones={milestones}
        progress={progressSummary}
        diagnostics={modelDiagnostics}
        onCurrentChange={handleCurrentValue}
        onGoalChange={handleGoalValue}
        onSaveSnapshot={handleSaveSnapshot}
        onToggleMilestone={handleToggleMilestone}
      />

    </div>
      {showShareModal && (
        <SocialShareModal 
          onClose={() => setShowShareModal(false)}
          imageSrc={shareImageSrc}
          score={overallScore}
        />
      )}
    </>
  );
}
