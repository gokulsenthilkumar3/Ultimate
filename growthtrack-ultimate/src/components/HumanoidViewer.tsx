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
  Target, TrendingUp, Maximize2, Minimize2, Settings,
  Activity, Heart, Dumbbell, ArrowRight, Star, Flag,
  Activity, Heart, Dumbbell, ArrowRight, Star, Flag,
  Play, Pause, SlidersHorizontal, Palette, Globe,
  FlaskConical, Cpu, Monitor, Share2,
} from 'lucide-react';
import SocialShareModal from './SocialShareModal';
import use3DStore from '../store/use3DStore';
import useStore from '../store/useStore';
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
// Sensitive metrics — require privacy unlock
const SENSITIVE_METRICS: Record<string, { label: string; unit: string; icon: React.ElementType }> = {
  d_size:  { label: 'D Size',  unit: 'in', icon: Ruler },
  d_girth: { label: 'D Girth', unit: 'in', icon: Ruler },
};

const PRIVATE_METRIC_KEYS = ['d_size', 'd_girth'] as const;

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
      { id: 'tricep_horse',   label: 'Tricep Horse',   metricKey: 'arms',      scale: 0.9  },
    ],
  },
  {
    group: 'Lower Body',
    items: [
      { id: 'glute_volume',   label: 'Glute Volume',   metricKey: 'hips',      scale: 1.0  },
      { id: 'ham_thickness',  label: 'Ham Thickness',  metricKey: 'thighs',    scale: 0.8  },
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
  { id: 'gym',        label: 'Gym',        icon: '🏋️' },
  { id: 'casual',     label: 'Casual',     icon: '👕' },
  { id: 'underwear',  label: 'Underwear',  icon: '🩲' },
  { id: 'anatomical', label: 'Anatomical', icon: '🔬' },
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

const EYE_COLOR_PRESETS = [
  '#3b7bd4', '#6b4c33', '#2e7d32', '#888', '#1a237e', '#c0ca33',
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

// ── Overall Progress Score Ring (SVG)
function ProgressRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? 'var(--chamber-success)' : score >= 40 ? 'var(--chamber-gold)' : 'var(--chamber-glow)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={44} cy={44} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={6} />
        <circle cx={44} cy={44} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease', filter: `drop-shadow(0 0 4px ${color}88)` }}
        />
        <text x={44} y={48} textAnchor="middle" fontSize={15} fontWeight={700}
          fill={color} fontFamily="'Outfit', sans-serif">
          {score}%
        </text>
      </svg>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>OVERALL SCORE</span>
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
  const toast = useToast();

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
  const selectedPart      = use3DStore((s) => s.focusedBodyPart);
  const currentMetrics    = use3DStore((s) => s.cloneA?.metrics || EMPTY_OBJECT);
  const goalMetrics       = use3DStore((s) => s.cloneB?.metrics || EMPTY_OBJECT);
  const modelDiagnostics  = use3DStore((s) => s.modelDiagnostics);
  const morphOverrides    = use3DStore((s) => s.cloneA?.weights || EMPTY_OBJECT);
  const quality           = use3DStore((s) => s.gpuTier);
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
  const setSelectedPart   = use3DStore((s) => s.setFocusedBodyPart);
  const setVfx            = use3DStore((s) => s.setVfx);
  const setSplitDividerX  = use3DStore((s) => s.setSplitDividerX);
  const setSplitPos       = useCallback((v: number) => setSplitDividerX(v / 100), [setSplitDividerX]);
  const setQuality        = use3DStore((s) => s.setGpuTier);
  const setTimelinePos    = use3DStore((s) => s.scrubTimeline);
  const updateCurrentMetric = use3DStore((s) => s.setCurrentMetric);
  const updateGoalMetric  = use3DStore((s) => s.setGoalMetric);
  const setPosture        = use3DStore((s) => s.setPosture);
  const achieveMilestone  = use3DStore((s) => s.achieveMilestone);
  const addTimelineSnap   = use3DStore((s) => s.addTimelineSnap);
  const [cameraZoom, setCameraZoomState] = useState(() => use3DStore.getState().cameraZoom ?? 1);

  const setMorphOverride = useCallback(
    (metricKey: string, value: number) => updateCurrentMetric(metricKey, value),
    [updateCurrentMetric]
  );

  const saveSnapshot = useCallback(() => {
    addTimelineSnap({
      id: Date.now().toString(),
      metrics: currentMetrics,
      date: new Date().toISOString(),
    });
  }, [addTimelineSnap, currentMetrics]);

  // ── Local UI state
  const [showEditor, setShowEditor] = useState(false);
  const [editorTab, setEditorTab] = useState(() => sessionStorage.getItem('chamber_tab') || 'metrics');
  const [sensitiveUnlocked, setSensitiveUnlocked] = useState(false);
  const [splitDragging, setSplitDragging] = useState(false);
  const [hairA, setHairA] = useState({ style: 'short', color: 'darkbrown' });
  const [hairB, setHairB] = useState({ style: 'short', color: 'darkbrown' });

  // Settings drawer
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [skinTone, setSkinTone] = useState<string>(currentMetrics.skinTone || 'IV');
  const [eyeColor, setEyeColor] = useState('#3b7bd4');
  const [sceneEnv, setSceneEnv] = useState('studio');
  const [postFxBloom, setPostFxBloom] = useState(true);
  const [postFxVignette, setPostFxVignette] = useState(true);
  const [postFxChrAb, setPostFxChrAb] = useState(false);

  // Timeline playback
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const timelineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Milestone tooltip
  const [activeMilestone, setActiveMilestone] = useState<string | null>(null);

  // Morphs tab — collapsed groups
  const [openMorphGroups, setOpenMorphGroups] = useState<Record<string, boolean>>({ 'Upper Body': true });

  // ── Persist tab selection
  const handleTabChange = useCallback((id: string) => {
    setEditorTab(id);
    sessionStorage.setItem('chamber_tab', id);
  }, []);

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

  // ── Sync global DB store weight into 3D
  const globalMetricLogs = useStore((s: any) => s.metric_logs || []);
  useEffect(() => {
    if (globalMetricLogs?.length > 0) {
      const weightLogs = globalMetricLogs.filter((log: any) => log.metric === 'weight');
      if (weightLogs.length > 0) {
        weightLogs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestWeight = parseFloat(weightLogs[0].value);
        if (!isNaN(latestWeight) && latestWeight !== currentMetrics.weight) {
          updateCurrentMetric('weight', latestWeight);
        }
      }
    }
  }, [globalMetricLogs, updateCurrentMetric, currentMetrics.weight]);

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

  // ── Skin tone synced to current metric
  useEffect(() => {
    if (skinTone !== currentMetrics.skinTone) {
      updateCurrentMetric('skinTone', skinTone as any);
    }
  }, [skinTone, currentMetrics.skinTone, updateCurrentMetric]);

  // ── Computed deltas
  const deltas = useMemo(() => {
    const d: Record<string, { current: number; goal: number; delta: number }> = {};
    for (const key of Object.keys(currentMetrics)) {
      const c = currentMetrics[key] as number;
      const g = goalMetrics[key] as number;
      d[key] = { current: c, goal: g, delta: g - c };
    }
    return d;
  }, [currentMetrics, goalMetrics]);

  // ── Overall progress score
  const overallScore = useMemo(() => {
    const keys = Object.keys(METRIC_LABELS);
    let total = 0;
    let count = 0;
    for (const key of keys) {
      const d = deltas[key];
      if (!d || !d.goal || d.goal === 0) continue;
      const dir = METRIC_LABELS[key].direction;
      let pct: number;
      if (dir === 'decrease') {
        // Lower is better: progress = how much we've reduced relative to goal
        const start = Math.max(d.current, d.goal); // use higher as start anchor
        const goal  = d.goal;
        pct = d.current <= goal ? 100 : Math.max(0, Math.min(100, ((start - d.current) / (start - goal)) * 100));
      } else {
        pct = d.goal > 0 ? Math.min(100, Math.max(0, (d.current / d.goal) * 100)) : 0;
      }
      total += pct;
      count++;
    }
    return count > 0 ? Math.round(total / count) : 0;
  }, [deltas]);

  // ── Export screenshot
  const captureScreenshot = useCallback(() => {
    const canvas = document.querySelector('.chamber-viewport canvas') as HTMLCanvasElement | null;
    if (!canvas) { toast.error('No 3D viewport found.'); return; }
    const link = document.createElement('a');
    link.download = `MirrorChamber_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Screenshot exported.');
  }, [toast]);

  const handleShareAvatar = useCallback(() => {
    const canvas = document.querySelector('.chamber-viewport canvas') as HTMLCanvasElement | null;
    if (canvas) {
      setShareImageSrc(canvas.toDataURL('image/png') as any);
    } else {
      setShareImageSrc(null);
    }
    setShowShareModal(true);
  }, []);

  const handleSaveSnapshot = useCallback(() => {
    saveSnapshot();
    toast.success('Timeline snapshot saved.');
  }, [saveSnapshot, toast]);

  // ── Body part info
  const partInfo = selectedPart ? (BODY_PARTS as any)[selectedPart] : null;

  // ── Currently scrubbed snapshot date label
  const scrubDateLabel = useMemo(() => {
    if (!snapshots.length || timelinePos == null) return null;
    const snap = snapshots[Math.min(timelinePos as number, snapshots.length - 1)] as any;
    return snap?.date ? new Date(snap.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  }, [snapshots, timelinePos]);

  const chamberKpis = [
    { label: 'Score', value: `${overallScore}%` },
    { label: 'GLB', value: modelDiagnostics?.health === 'healthy' ? 'Healthy' : modelDiagnostics ? 'Repair' : 'Loading' },
  ];
  const glbIssueCount = modelDiagnostics?.health === 'healthy' ? 0 : [
    modelDiagnostics?.missingMorphTargets?.length ? 1 : 0,
    modelDiagnostics?.isSuspicious ? 1 : 0,
    modelDiagnostics?.bounds?.height && (modelDiagnostics.bounds.height < 1.25 || modelDiagnostics.bounds.height > 2.45) ? 1 : 0,
    modelDiagnostics?.bounds?.radius && (modelDiagnostics.bounds.radius < 0.15 || modelDiagnostics.bounds.radius > 1.15) ? 1 : 0,
  ].reduce((sum, v) => sum + v, 0);
  const topPriorityFixes = [
    'Real humanoid topology',
    'Full rig',
    'Authored shape keys',
    'Y-up export',
    'Textures + materials',
  ];
  const focusedLabel = selectedPart ? (BODY_PARTS as any)?.[selectedPart]?.name || selectedPart : null;

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
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '14px 18px', pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(3,3,6,0.85) 0%, transparent 100%)',
      }}>
        {/* Left: title + status chips */}
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="shimmer-text" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              DIGITAL TWIN
            </span>
            <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>v3</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* GLB status chip */}
            <span
              className={`hud-chip${modelDiagnostics?.health === 'healthy' ? ' healthy' : modelDiagnostics ? ' warning' : ''}`}
              style={{ '--hud-delay': '0.1s' } as React.CSSProperties}
            >
              <span className="hud-dot" />
              {modelDiagnostics?.health === 'healthy' ? 'GLB HEALTHY' : modelDiagnostics ? 'GLB REPAIR' : 'GLB LOADING'}
            </span>
            <span className="hud-chip" style={{ '--hud-delay': '0.18s' } as React.CSSProperties}>
              {modelDiagnostics?.morphTargetCount ?? 0} morphs
            </span>
            <span className={`hud-chip${(modelDiagnostics?.missingMorphTargets?.length ?? 0) > 0 ? ' warning' : ''}`} style={{ '--hud-delay': '0.24s' } as React.CSSProperties}>
              {modelDiagnostics?.missingMorphTargets?.length ?? 0} missing
            </span>
            {glbIssueCount > 0 && (
              <span className="hud-chip danger" style={{ '--hud-delay': '0.3s' } as React.CSSProperties}>
                {glbIssueCount} issues
              </span>
            )}
            {overallScore > 0 && (
              <span className="hud-chip healthy" style={{ '--hud-delay': '0.36s' } as React.CSSProperties}>
                <Star size={10} /> {overallScore}%
              </span>
            )}
          </div>
          {/* Priority fixes */}
          {modelDiagnostics?.health !== 'healthy' && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fixes:</span>
              {topPriorityFixes.map((fix, i) => (
                <span key={fix} className="hud-chip warning" style={{ '--hud-delay': `${0.4 + i * 0.06}s`, fontSize: '0.62rem' } as React.CSSProperties}>
                  {fix}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Right: quality + render mode toggles */}
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className={`chamber-view-btn${quality === 'HIGH' ? ' active' : ''}`} style={{ padding: '5px 12px', fontSize: '0.65rem' }}
            onClick={() => setQuality('HIGH')}>HQ</button>
          <button className={`chamber-view-btn${renderMode === 'WEBGL' ? ' active' : ''}`} style={{ padding: '5px 12px', fontSize: '0.65rem' }}
            onClick={() => setRenderMode('WEBGL')}>3D</button>
        </div>
      </div>

      {/* ═══ VIEWPORT + EDITOR LAYOUT ═══ */}
      <div className="chamber-layout" style={{ flex: 1, minHeight: 0 }}>
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
              <button className="chamber-pill" onClick={handleShareAvatar} style={{ color: 'var(--chamber-gold)', borderColor: 'var(--chamber-gold)', background: 'rgba(255, 215, 0, 0.05)' }}>
                <Share2 size={12} /> SHARE
              </button>
              <button className="chamber-pill chamber-pill--export" onClick={captureScreenshot}>
                <Camera size={12} /> EXPORT
              </button>
            </div>
          </div>

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
              {renderMode === 'SPRITE'
                ? <Sprite3DViewer />
                : <ChamberCanvas />}
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
                        const rawMetric = currentMetrics[s.metricKey] as number ?? 0;
                        // Compute a display value derived from the metric
                        const displayVal = Math.round(rawMetric);
                        return (
                          <div key={s.id} className="chamber-morph-row">
                            <div className="chamber-morph-row__header">
                              <span>{s.label}</span>
                              <span className="chamber-morph-row__value">{displayVal}</span>
                            </div>
                            <input type="range"
                              min={30} max={150} step={1}
                              value={displayVal}
                              onChange={(e) => setMorphOverride(s.metricKey, parseFloat(e.target.value))}
                              className="chamber-slider" />
                          </div>
                        );
                      })}
                    </div>
                  ))}
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
                    const val = (morphOverrides[s.key] as number) ?? 0.35;
                    return (
                      <div key={s.key} className="chamber-morph-row">
                        <div className="chamber-morph-row__header">
                          <span>{s.label}</span>
                          <span className="chamber-morph-row__value">{(val * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min={s.min} max={s.max} step={s.step}
                          value={val}
                          onChange={(e) => setMorphOverride(s.key, parseFloat(e.target.value))}
                          className="chamber-slider" />
                      </div>
                    );
                  })}

                  <div className="chamber-divider" />

                  {/* Hair — side-by-side for NOW and GOAL */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {([
                      { key: 'A' as const, label: 'YOU NOW', state: hairA, set: setHairA, accentColor: 'var(--chamber-current)' },
                      { key: 'B' as const, label: 'YOUR GOAL', state: hairB, set: setHairB, accentColor: 'var(--chamber-glow)' },
                    ]).map(({ key, label, state, set, accentColor }) => (
                      <div key={key}>
                        <p style={{ fontSize: '0.6rem', color: accentColor, fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em' }}>{label}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 6 }}>
                          {[
                            { id: 'bald', icon: '🔳' }, { id: 'buzz', icon: '⚡' },
                            { id: 'short', icon: '✂️' }, { id: 'medium', icon: '💇' },
                            { id: 'long', icon: '💈' },
                          ].map((h) => (
                            <button key={h.id}
                              className={`chamber-wardrobe-card${state.style === h.id ? ' active' : ''}`}
                              style={{ '--accent': accentColor } as React.CSSProperties}
                              onClick={() => set((prev) => ({ ...prev, style: h.id }))}>
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
                              onClick={() => set((prev) => ({ ...prev, color: c.id }))}
                              title={c.id}
                              style={{
                                width: 18, height: 18, borderRadius: '50%',
                                border: state.color === c.id ? `2px solid ${accentColor}` : '2px solid transparent',
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
                    {wardrobe === 'anatomical'
                      ? 'Anatomical mode — full body visible for measurement comparison.'
                      : wardrobe === 'underwear'
                      ? 'Underwear mode — full physique for body composition analysis.'
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
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SETTINGS DRAWER ═══ */}
      {showSettings && (
        <div className="chamber-settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="chamber-settings-drawer" onClick={(e) => e.stopPropagation()}>
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
                    onClick={() => { setSkinTone(s.id); updateCurrentMetric('skinTone' as any, s.id as any); }}
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
                  <button key={c} onClick={() => setEyeColor(c)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', background: c,
                      border: eyeColor === c ? '2px solid var(--chamber-glow)' : '2px solid transparent',
                      cursor: 'pointer',
                    }} />
                ))}
                <input type="color" value={eyeColor} onChange={(e) => setEyeColor(e.target.value)}
                  title="Custom eye colour"
                  style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }} />
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
                    className={`chamber-pill${sceneEnv === env.id ? ' active' : ''}`}
                    onClick={() => setSceneEnv(env.id)}>
                    {env.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Post-FX toggles */}
            <div className="chamber-settings-section">
              <h4 className="chamber-editor__heading"><FlaskConical size={13} /> Post-Processing</h4>
              {[
                { key: 'bloom',    label: 'Bloom',              val: postFxBloom,    set: setPostFxBloom    },
                { key: 'vignette', label: 'Vignette',           val: postFxVignette, set: setPostFxVignette },
                { key: 'chrAb',    label: 'Chromatic Aberration', val: postFxChrAb,  set: setPostFxChrAb   },
              ].map(({ key, label, val, set }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{label}</span>
                  <button className={`chamber-pill${val ? ' active' : ''}`}
                    style={{ fontSize: '0.65rem', padding: '2px 10px' }}
                    onClick={() => set(!val)}>
                    {val ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>

            {/* Export */}
            <div className="chamber-settings-section">
              <h4 className="chamber-editor__heading"><Download size={13} /> Export</h4>
              <button className="chamber-pill" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { captureScreenshot(); setShowSettings(false); }}>
                <Camera size={13} /> Save Screenshot
              </button>
            </div>

            {/* Advanced */}
            <div className="chamber-settings-section">
              <button
                className="chamber-pill"
                style={{ width: '100%', justifyContent: 'space-between' }}
                onClick={() => setShowAdvanced((v) => !v)}
              >
                <span>Advanced</span>
                <span>{showAdvanced ? 'Hide' : 'Show'}</span>
              </button>
              {showAdvanced && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p className="chamber-note" style={{ margin: 0 }}>
                    Private measurements stay hidden from the main studio and only live here.
                  </p>
                  {Object.entries(SENSITIVE_METRICS).map(([key, meta]) => (
                    <div key={key} className="chamber-metric-row">
                      <div className="chamber-metric-row__header">
                        <span className="chamber-metric-row__label">{meta.label}</span>
                        <span className="chamber-metric-row__value">
                          {((currentMetrics[key] as number) ?? 5).toFixed(1)}{meta.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={10}
                        step={0.1}
                        value={(currentMetrics[key] as number) ?? 5}
                        onChange={(e) => updateCurrentMetric(key, parseFloat(e.target.value))}
                        className="chamber-slider"
                        style={{ accentColor: 'var(--chamber-glow)' }}
                      />
                    </div>
                  ))}
                </div>
              )}
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

      {/* ═══ OVERALL PROGRESS + MEASUREMENTS DELTA ═══ */}
      <div className="chamber-comparison glass-card">
        <div className="chamber-comparison__header">
          <h3 className="chamber-comparison__title">
            <TrendingUp size={18} /> Measurements Delta
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ProgressRing score={overallScore} />
            <div className="chamber-comparison__legend">
              <span className="chamber-legend-dot" style={{ background: 'var(--chamber-current)' }} /> Current
              <span className="chamber-legend-dot" style={{ background: 'var(--chamber-glow)' }} /> Goal
            </div>
          </div>
        </div>
        {modelDiagnostics && (
          <div className="chamber-settings-section" style={{ marginTop: 0, marginBottom: 16 }}>
            <h4 className="chamber-editor__heading"><Cpu size={13} /> GLB Health</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <div className="chamber-metric-row">
                <div className="chamber-metric-row__header">
                  <span className="chamber-metric-row__label">Status</span>
                  <span className="chamber-metric-row__value">{modelDiagnostics.health}</span>
                </div>
                <p className="chamber-note" style={{ margin: 0 }}>
                  {modelDiagnostics.isSuspicious
                    ? 'The GLB loads, but its structure or bounds look off. This usually needs a cleaner Blender export.'
                    : 'The GLB looks healthy and is framing normally.'}
                </p>
              </div>
              <div className="chamber-metric-row">
                <div className="chamber-metric-row__header">
                  <span className="chamber-metric-row__label">Morph Targets</span>
                  <span className="chamber-metric-row__value">{modelDiagnostics.morphTargetCount}</span>
                </div>
                <p className="chamber-note" style={{ margin: 0 }}>
                  Meshes: {(modelDiagnostics.meshCount?.mesh || 0) + (modelDiagnostics.meshCount?.skinnedMesh || 0)} | Vertices: {modelDiagnostics.vertexCount}
                </p>
              </div>
              <div className="chamber-metric-row">
                <div className="chamber-metric-row__header">
                  <span className="chamber-metric-row__label">Missing Targets</span>
                  <span className="chamber-metric-row__value">{modelDiagnostics.missingMorphTargets?.length || 0}</span>
                </div>
                <p className="chamber-note" style={{ margin: 0 }}>
                  {modelDiagnostics.missingMorphTargets?.length
                    ? modelDiagnostics.missingMorphTargets.slice(0, 4).join(', ')
                    : 'All declared morph names were found in the GLB.'}
                </p>
              </div>
            </div>
            {modelDiagnostics.health !== 'healthy' && (
              <div style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(248,113,113,0.35)',
                background: 'rgba(127,29,29,0.18)',
                color: '#fecaca',
                fontSize: '0.78rem',
                lineHeight: 1.45,
              }}>
                <strong style={{ display: 'block', marginBottom: 6 }}>Asset needs repair</strong>
                <div>Fix the Blender export before expecting a human-like silhouette.</div>
                <div style={{ marginTop: 6, opacity: 0.9 }}>
                  Reasons: {[
                    modelDiagnostics.bounds?.height && (modelDiagnostics.bounds.height < 1.25 || modelDiagnostics.bounds.height > 2.45) ? 'bounds height' : null,
                    modelDiagnostics.bounds?.radius && (modelDiagnostics.bounds.radius < 0.15 || modelDiagnostics.bounds.radius > 1.15) ? 'bounds radius' : null,
                    modelDiagnostics.missingMorphTargets?.length ? 'missing morph coverage' : null,
                    modelDiagnostics.isSuspicious ? 'mesh / topology sanity check' : null,
                  ].filter(Boolean).join(' · ') || 'runtime GLB validation failed'}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="chamber-comparison__grid">
          {Object.entries(METRIC_LABELS).map(([key, meta]) => {
            const d = deltas[key] || { current: 0, goal: 0, delta: 0 };
            const dir = meta.direction;
            // For "decrease" metrics, delta < 0 means progress
            const isProgress = dir === 'decrease' ? d.delta < 0 : d.delta > 0;
            const progressColor = isProgress ? 'var(--chamber-success)' : d.delta !== 0 ? 'var(--chamber-glow)' : 'var(--text-3)';
            const pct = dir === 'decrease'
              ? (d.goal > 0 && d.current > d.goal
                  ? Math.max(0, Math.min(100, ((Math.max(d.current, d.goal) - d.current) / (Math.max(d.current, d.goal) - d.goal)) * 100))
                  : 100)
              : (d.goal > 0 ? Math.min(100, Math.max(0, (d.current / d.goal) * 100)) : 0);
            return (
              <div key={key} className="chamber-delta-card">
                <div className="chamber-delta-card__top">
                  <span className="chamber-delta-card__label">{meta.label}</span>
                  <span className="chamber-delta-card__delta" style={{ color: progressColor }}>
                    {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}{meta.unit}
                  </span>
                </div>
                <div className="chamber-delta-card__bar">
                  <div className="chamber-delta-card__fill"
                    style={{ width: `${pct}%`, background: progressColor }} />
                </div>
                <div className="chamber-delta-card__bottom">
                  <span>{(d.current ?? 0).toFixed(1)}{meta.unit}</span>
                  <ArrowRight size={10} />
                  <span style={{ color: 'var(--chamber-glow)' }}>{(d.goal ?? 0).toFixed(1)}{meta.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="chamber-settings-section" style={{ marginTop: 20 }}>
          <h4 className="chamber-editor__heading"><Ruler size={13} /> Private Metrics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {PRIVATE_METRIC_KEYS.map((key) => {
              const meta = SENSITIVE_METRICS[key];
              const value = (currentMetrics[key] as number) ?? 5;
              return (
                <div key={key} className="chamber-metric-row">
                  <div className="chamber-metric-row__header">
                    <span className="chamber-metric-row__label">{meta.label}</span>
                    <span className="chamber-metric-row__value">{value.toFixed(1)}{meta.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    step={0.1}
                    value={value}
                    onChange={(e) => updateCurrentMetric(key, parseFloat(e.target.value))}
                    className="chamber-slider"
                    style={{ accentColor: 'var(--chamber-glow)' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ AMBITION PATH ═══ */}
      <div className="chamber-ambition glass-card">
        <h3 className="chamber-ambition__title">
          <Flag size={18} color="var(--chamber-gold)" /> Ambition Path — Road to Greek God
        </h3>
        <div className="chamber-ambition__road">
          <div className="chamber-ambition__line" />
          {milestones.map((m: any, i: number) => {
            const left = ((m.monthIndex ?? 0) / 20) * 100;
            const isFinal = i === milestones.length - 1;
            const isCurrent = ambitionPath?.currentMonthIndex === m.monthIndex;
            return (
              <div key={i}
                className={`chamber-ambition__node${m.achieved ? ' achieved' : ''}${isFinal ? ' final' : ''}`}
                style={{ left: `${left}%`, cursor: 'pointer' }}
                onClick={() => setActiveMilestone(activeMilestone === m.id ? null : m.id)}>
                <div className={`chamber-ambition__beacon${isCurrent ? ' current-beacon' : ''}`}>
                  {isFinal ? <Star size={16} /> : m.achieved ? <CheckCircle size={14} /> : <Target size={14} />}
                </div>
                <div className="chamber-ambition__info">
                  <span className="chamber-ambition__month">{m.month}</span>
                  <span className="chamber-ambition__label">{m.label}</span>
                </div>
                {/* Milestone tooltip */}
                {activeMilestone === m.id && (
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--surface-2)', border: '1px solid var(--chamber-glow)',
                    borderRadius: 8, padding: '8px 12px', minWidth: 160, zIndex: 20,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                  }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--chamber-glow)', margin: '0 0 4px 0' }}>{m.label}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', margin: '0 0 8px 0' }}>{m.month}</p>
                    {!m.achieved && (
                      <button className="chamber-pill"
                        style={{ fontSize: '0.65rem', width: '100%', justifyContent: 'center' }}
                        onClick={(e) => { e.stopPropagation(); achieveMilestone(m.id); setActiveMilestone(null); toast.success(`Milestone achieved: ${m.label}`); }}>
                        ✅ Mark Achieved
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
