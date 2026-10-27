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
import MeasurementInput from './ui/MeasurementInput';
import { progressToward } from '../lib/metricEntry';
import { displayMetricValue } from '../lib/measurementEntry';
import AvatarCreationWizard from './AvatarCreationWizard';
import {
  Rotate3D, Eye, Layers, Zap, Shirt, Ruler, Camera, Download,
  ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle,
  Target, Maximize2, Minimize2, Settings,
  Activity, Heart, Dumbbell, Star,
  Play, Pause, SlidersHorizontal, Palette, Globe,
  FlaskConical, Share2, MoreHorizontal, Save, ZoomIn, ZoomOut, UserRound, Scissors, Sun, ShieldCheck,
} from 'lucide-react';
import SocialShareModal from './SocialShareModal';
import PhysiqueDataPanel from './PhysiqueDataPanel';
import use3DStore, { CINEMATIC_PRESETS } from '../store/use3DStore';
import useStore from '../store/useStore';
import { BODY_APPEARANCE_FIELDS, BODY_METRIC_GROUPS, BODY_METRIC_MAP, BODY_METRICS, bodyProfileToGoals, bodyProfileToMetrics, calculateGoalProgress, getBaselineMetrics, getInvalidBodyProfileMeasurements, mergeBodyProfileSources, metricLogsToSnapshots, metricsToBodyProfile, publicBodyMetrics } from '../lib/physiqueProfile';
import { avatarMetricSupport } from '../lib/avatarMetricSupport';
import { BODY_METRIC_RANGES, validateBodyMetric } from '../lib/bodyMetricContract';
import { buildRendererQualityGate } from '../lib/rendererQualityGate';
import { getMetricCompleteness, resolveBodyMetrics } from '../lib/bodyMetricFallbacks';
import { useToast } from '../hooks/useToast';
import { useAnatomyEligibility } from './morphEngine/useAnatomyEligibility';
import { anatomyMorphWeights, resolveAnatomyCm } from './morphEngine/anatomyCalibration';
import AnatomyCustomizationPanel from './physique/AnatomyCustomizationPanel';
import BodyPartNavigator from './physique/BodyPartNavigator';
import { BODY_PART_DRAG_TYPE, readDroppedBodyPart, focusInspectionPart } from './physique/bodyPartDrag';
import { BODY_PART_MAP } from './morphEngine/bodyRegions';
import MeasurementHelp from './physique/MeasurementHelp';
import ModelMeasurementCheck from './physique/ModelMeasurementCheck';
import { getBodyMeasurementDefinition } from '../lib/bodyMeasurementDefinitions';
import { createAnatomyCustomization } from '../lib/anatomyCustomization';
import { AvatarParameterMatrix, computeHeightScale } from './morphEngine/metricsToBlendshapes';
import { trackEvent } from '../lib/analytics';
import AvatarEvidence from './physique/AvatarEvidence';
import AvatarViewOptions from './physique/AvatarViewOptions';
import WardrobeOptions from './physique/WardrobeOptions';
import SkinLayerControls from './physique/SkinLayerControls';
import SurfaceDetailControls from './physique/SurfaceDetailControls';
import FreckleControls from './physique/FreckleControls';
import HairDetailControls from './physique/HairDetailControls';
import EyeAppearanceControls from './physique/EyeAppearanceControls';
import SpeechControls from './physique/SpeechControls';
import LikenessControls from './physique/LikenessControls';
import HeadFeatureControls from './physique/HeadFeatureControls';
import {HEAD_FEATURES,headExpressionCapability,supportedHeadMorphKeys} from '../lib/headFeatureRegistry';
import AvatarPeopleWorkspace from './physique/AvatarPeopleWorkspace';
import AvatarComparisonSummary from './physique/AvatarComparisonSummary';
import useAvatarRecord from '../hooks/useAvatarRecord';
import PoseStudioControls from './physique/PoseStudioControls';
import CameraBookmarkControls from './physique/CameraBookmarkControls';
import { patchPose,POSE_STUDIO } from '../lib/poseStudio';
import {HUMAN_SURFACE,microStrength} from '../lib/humanSurface';
import { inspectAvatarSurfaces } from './morphEngine/captureRuntime';
import { readBookmarkCamera } from './morphEngine/cameraBookmarkRuntime';
import { APPEARANCE_DETAIL, resolveHumanRealism } from '../lib/appearanceDetail';
import { RESET_SKIN_LAYERS } from './body3d/skinTanLines';
import {preloadWardrobeAsset} from './morphEngine/useWardrobeAsset';
import useWardrobePreferences from '../hooks/useWardrobePreferences';
import useAvatarPresentation from '../hooks/useAvatarPresentation';
import { SKIN_APPEARANCE_PRESETS } from '../lib/skinAppearancePresets';
import useAvatarPresentationMode from '../hooks/useAvatarPresentationMode';
import {captureAvatarImage} from './morphEngine/captureRuntime';
import {safeFilename} from '../lib/avatarCapturePolicy';
import AnimationPanel from './morphEngine/AnimationPanel';
import { AVATAR_EXPOSURE } from '../lib/avatarPresentation';
import { buildAvatarEvidence } from '../lib/avatarEvidence';
import '../styles/avatar-workspace.css';
import '../styles/parametric-studio.css';
import { formatDate, formatMeasurement, formatNumber, getMeasurementUnit } from '../utils/userFormatters';

// Lazy load the heavy 3D canvas
const ChamberCanvas = lazy(() => import('./PhysiqueRenderer'));
const Sprite3DViewer = lazy(() => import('./Sprite3DViewer'));
const ParametricAvatarStudio = lazy(() => import('./physique/ParametricAvatarStudio'));

const EMPTY_OBJECT = {};
const EMPTY_ARRAY: never[] = [];

const VIEW_MODES = [
  { key: '1', id: 'SOLO' },
  { key: '2', id: 'DUAL' },
  { key: '3', id: 'GHOST' },
  { key: '4', id: 'SPLIT' },
  { key: '5', id: 'DELTA' },
  { key: '6', id: 'TIMELINE' },
] as const;


// ── Metric labels
const METRIC_LABELS: Record<string, { label: string; unit: string; icon: React.ElementType; direction: 'increase' | 'decrease' }> = {
  height:    { label: 'Height',    unit: 'cm', icon: Ruler,    direction: 'increase' },
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

const CAMERA_PRESETS = [
  { id: 'FRONT', label: 'Front' },
  { id: 'LEFT',  label: 'Side'  },
  { id: 'BACK',  label: 'Back'  },
];

const PRIVATE_METRIC_LABELS: Record<string, string> = { anatomyLengthCm: 'Resting length', anatomyGirthCm: 'Mid-shaft circumference' };

const WARDROBE_OPTIONS = [
  { id: 'ANATOMICAL', label: 'Anatomical', icon: UserRound },
  { id: 'UNDERWEAR',  label: 'Underwear',  icon: ShieldCheck },
  { id: 'GYM',        label: 'Gym',        icon: Dumbbell },
  { id: 'CASUAL',     label: 'Casual',     icon: Shirt },
  { id: 'FORMAL',     label: 'Formal',     icon: Shirt },
  { id: 'SWIMWEAR',   label: 'Swimwear',   icon: Globe },
];

const QUALITY_OPTIONS = ['LOW', 'MED', 'HIGH'];

const FITZPATRICK_SWATCHES = SKIN_APPEARANCE_PRESETS;

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
  return <AvatarPeopleWorkspace><AvatarWorkspaceSelector /></AvatarPeopleWorkspace>;
}

function AvatarWorkspaceSelector() {
  const record = useAvatarRecord();
  const [mode, setMode] = useState('tracker');
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const switchMode = async (next: string) => {
    if (switching || mode === next) return;
    setSwitching(true); setError('');
    try { await record.flushEdits(); setMode(next); }
    catch (cause: any) { setError(cause.message || 'Save the current edits before switching editors.'); }
    finally { setSwitching(false); }
  };
  return <>
    <div className="avatar-workspace-picker" role="group" aria-label="Avatar workspace">
      <button className="chamber-pill" type="button" aria-pressed={mode === 'tracker'} disabled={switching} onClick={() => switchMode('tracker')}>Body tracker</button>
      <button className="chamber-pill" type="button" aria-pressed={mode === 'parametric'} disabled={switching} onClick={() => switchMode('parametric')}>Parametric human editor</button>
      {switching && <span role="status">Saving current edits…</span>}
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="avatar-workspace-content" inert={switching || undefined}>{mode === 'tracker' ? <PersonViewer /> : <TabErrorBoundary tabName="Parametric editor"><Suspense fallback={<p role="status">Opening parametric editor…</p>}><ParametricAvatarStudio /></Suspense></TabErrorBoundary>}</div>
  </>;
}

function PersonViewer() {
  const avatarRecord = useAvatarRecord();
  const user = useStore((state: any) => state.user);
  const toast: any = useToast();
  const legacyUser = avatarRecord.legacyUser;

  // ── Store
  const viewMode          = use3DStore((s) => s.viewMode);
  const avatarWorkspace   = use3DStore((s) => s.avatarWorkspace);
  const renderMode        = use3DStore((s) => s.renderMode);
  const cameraPreset      = use3DStore((s) => s.cameraPreset);
  const autoRotate        = use3DStore((s) => s.autoRotate);
  const modelDropTarget = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const captureBusy = useRef(false);
  const [partDragOver, setPartDragOver] = useState(false);
  const [guideMetric, setGuideMetric] = useState('chest');
  const [showMeasurementGuide, setShowMeasurementGuide] = useState(false);
  const [metricGroup, setMetricGroup] = useState('essentials');
  const [metricSearch, setMetricSearch] = useState('');
  const shownMetrics = (metricSearch.trim() || metricGroup === 'all' ? BODY_METRICS
    : metricGroup === 'essentials' ? Object.keys(METRIC_LABELS).map(key => BODY_METRIC_MAP[key])
      : BODY_METRIC_GROUPS.find(group => group.id === metricGroup)?.metrics || [])
    .filter(metric => `${metric.label} ${metric.key}`.toLowerCase().includes(metricSearch.trim().toLowerCase()));
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageSrc, setShareImageSrc] = useState(null);
  
  useEffect(() => {
    trackEvent('Viewed Avatar');
  }, []);
  const wardrobe          = use3DStore((s) => s.wardrobeState);
  const wardrobePreferences=use3DStore(s=>s.wardrobePreferences);
  const wardrobeControls=useWardrobePreferences();
  useEffect(()=>{if(wardrobe!=='ANATOMICAL')preloadWardrobeAsset(wardrobe,wardrobePreferences.outfits[wardrobe]).catch(()=>{});},[wardrobe,wardrobePreferences]);
  const anatomyDepth      = use3DStore((s) => s.anatomyDepth);
  const captureRedacted = use3DStore((s) => s.captureRedacted);
  const selectedPart      = use3DStore((s) => s.focusedBodyPart);
  const currentMetrics    = use3DStore((s) => s.cloneA?.metrics || EMPTY_OBJECT);
  const goalMetrics       = use3DStore((s) => s.cloneB?.metrics || EMPTY_OBJECT);
  const modelDiagnostics  = use3DStore((s) => s.modelDiagnostics);
  // Adult owner, matching body base and a declared asset; enforced again in the renderer.
  const anatomy = useAnatomyEligibility(modelDiagnostics);
  const rendererTelemetry = use3DStore((s) => s.rendererQualityTelemetry);
  const morphOverrides    = use3DStore((s) => s.cloneA?.weights || EMPTY_OBJECT);
  const manualMorphOverrides = use3DStore((s) => s.morphOverrides?.current || EMPTY_OBJECT);
  const faceOverrides = use3DStore((s) => s.morphOverrides?.[s.avatarWorkspace.avatarContext] || EMPTY_OBJECT);
  const faceWeights = use3DStore((s) => (s.avatarWorkspace.avatarContext==='goal'?s.cloneB:s.cloneA)?.weights || EMPTY_OBJECT);
  const quality           = use3DStore((s) => s.gpuTier);
  const cinematic         = use3DStore((s) => s.cinematicState);
  const anatomyPreview = use3DStore(s=>s.anatomyPreview);
  const anatomyEvidence = use3DStore(s=>s.anatomyEvidence[s.avatarWorkspace.avatarContext==='goal'?'B':'A']);
  const heatmapMode       = use3DStore((s) => s.vfxState?.heatmap);
  const vascMode          = use3DStore((s) => s.vfxState?.vascularity);
  const auraMode          = use3DStore((s) => s.vfxState?.aura);
  const splitPos          = use3DStore((s) => (s.splitDividerX || 0.5) * 100);
  const milestones        = use3DStore((s) => s.ambitionPath?.milestones || EMPTY_ARRAY);
  const snapshots         = use3DStore((s) => s.timelineSnaps || EMPTY_ARRAY);
  const timelinePos       = use3DStore((s) => s.timelineScrubIndex || 0);
  const stressLevel       = use3DStore((s) => s.stressLevel);
  const ambitionPath      = use3DStore((s) => s.ambitionPath);
  const hasGoalComparison = useMemo(() => Object.keys(METRIC_LABELS).some((key) => (
    validateBodyMetric(key, (currentMetrics as any)[key], { allowEmpty: false }).valid
    && validateBodyMetric(key, (goalMetrics as any)[key], { allowEmpty: false }).valid
  )), [currentMetrics, goalMetrics]);
  const hasTimelineData = snapshots.length > 0;
  const canUseViewMode = useCallback((mode: string) => {
    if (['DUAL', 'GHOST', 'SPLIT', 'DELTA'].includes(mode)) return hasGoalComparison;
    if (mode === 'TIMELINE') return hasTimelineData;
    return true;
  }, [hasGoalComparison, hasTimelineData]);
  const modeUnavailableReason = useCallback((mode: string) => (
    mode === 'TIMELINE'
      ? 'Save a physique snapshot to unlock Timeline.'
      : ['DUAL', 'GHOST', 'SPLIT', 'DELTA'].includes(mode)
        ? 'Add at least one goal measurement to unlock comparison.'
        : ''
  ), []);

  // ── Actions
  const setViewMode       = use3DStore((s) => s.setViewMode);
  const setAvatarWorkspace = use3DStore((s) => s.setAvatarWorkspace);
  const setRenderMode     = use3DStore((s) => s.setRenderMode);
  const setCameraPreset   = use3DStore((s) => s.setCameraPreset);
  const setCameraZoom     = use3DStore((s) => s.setCameraZoom);
  const resetCameraZoom   = use3DStore((s) => s.resetCameraZoom);
  const fitCameraToBody   = use3DStore((s) => s.fitCameraToBody);
  const setAutoRotate     = use3DStore((s) => s.setAutoRotate);
  const setStressLevel    = use3DStore((s) => s.setStressLevel);
  const setWardrobe       = use3DStore((s) => s.setWardrobe);
  const setAnatomyDepth   = use3DStore((s) => s.setAnatomyDepth);
  const setCaptureRedacted = use3DStore((s) => s.setCaptureRedacted);
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
  const setTimelineSnaps  = use3DStore((s) => s.setTimelineSnaps);
  const setCurrentMetrics = use3DStore((s) => s.setCurrentMetrics);
  const setGoalMetrics    = use3DStore((s) => s.setGoalMetrics);
  const setMorphOverrideAction = use3DStore((s) => s.setMorphOverride);
  const setMorphOverrides = use3DStore((s) => s.setMorphOverrides);
  const clearMorphOverrides = use3DStore((s) => s.clearMorphOverrides);
  const setMilestones     = use3DStore((s) => s.setMilestones);
  const [cameraZoom, setCameraZoomState] = useState(() => use3DStore.getState().cameraZoom ?? 1);

  const bodyProfileState = avatarRecord.bodyProfile;
  const metricLogsState = avatarRecord.metricLogs;
  const persistedPhysiqueState = avatarRecord.physiqueTargets;
  const bodyProfile = bodyProfileState || EMPTY_OBJECT;
  const globalMetricLogs = metricLogsState || EMPTY_ARRAY;
  const persistedPhysique = persistedPhysiqueState || EMPTY_OBJECT;
  const [anatomyDraft, setAnatomyDraft] = useState(() => createAnatomyCustomization(persistedPhysiqueState?.anatomyV2));
  const anatomyDraftRef=useRef(anatomyDraft);
  const anatomyPendingRef=useRef(false);
  const profileSaveRevisionRef=useRef(0);
  const profileDraftRef=useRef<null|{ownerId:string|undefined,current:any,goal:any,morphOverrides:any,goalMorphOverrides:any}>(null);
  const normalizedBodyProfile = useMemo(() => mergeBodyProfileSources(bodyProfile, legacyUser), [bodyProfile, legacyUser]);
  const invalidProfileMeasurements = useMemo(
    () => getInvalidBodyProfileMeasurements(normalizedBodyProfile, persistedPhysique),
    [normalizedBodyProfile, persistedPhysique],
  );
  const qualityGate = useMemo(() => buildRendererQualityGate({
    diagnostics: modelDiagnostics,
    telemetry: rendererTelemetry,
    renderMode,
    cinematicState: cinematic,
    gpuTier: quality,
    settingsPersisted: Boolean(persistedPhysique?.renderSettings),
  }), [cinematic, modelDiagnostics, persistedPhysique?.renderSettings, quality, renderMode, rendererTelemetry]);
  const modelEvidence = useMemo(() => buildAvatarEvidence({ diagnostics:modelDiagnostics, metrics:currentMetrics, qualityGate }), [modelDiagnostics,currentMetrics,qualityGate]);
  const presentationPreferences = useAvatarPresentation();
  const selectPoseJoint=useCallback((jointId: string)=>{use3DStore.setState({poseDragJoint:jointId});},[]);
  useEffect(()=>{
    const changeTarget=(event: Event)=>{
      const detail=(event as CustomEvent).detail,state=use3DStore.getState();
      if(!(event.target instanceof HTMLCanvasElement) || !modelDropTarget.current?.contains(event.target) || detail?.ownerId!==useStore.getState().user?.id)return;
      const jointDrag=POSE_STUDIO.joints.some((joint: any)=>joint.id===detail?.jointId);
      if(!['current','goal'].includes(detail?.context) || !jointDrag && !POSE_STUDIO.limbs.some((limb: any)=>limb.id===detail?.limbId))return;
      if(detail.phase!=='cancel' && (state.viewMode!=='SOLO' || state.avatarWorkspace.avatarContext!==detail.context || !state.avatarWorkspace.poseStudio[detail.context].enabled))return;
      if(detail.target!==null && (!Array.isArray(detail.target) || detail.target.length!==3 || !detail.target.every((value: any)=>typeof value==='number' && Number.isFinite(value))))return;
      const current=state.avatarWorkspace.poseStudio[detail.context],key=jointDrag?'joints':'targets',id=jointDrag?detail.jointId:detail.limbId,values={...current[key]};
      if(detail.target===null){if(detail.phase!=='cancel')return;delete values[id];}else values[id]=detail.target;
      presentationPreferences.change({poseStudio:patchPose(state.avatarWorkspace.poseStudio,detail.context,{...current,[key]:values})});
    };
    window.addEventListener(HUMAN_SURFACE.drag.event,changeTarget);return()=>window.removeEventListener(HUMAN_SURFACE.drag.event,changeTarget);
  },[presentationPreferences.change]);
  const prefersReducedMotion = useStore((s: any) => s.reducedMotion) || rendererTelemetry.reducedMotion;
  const presentation = useAvatarPresentationMode(viewportRef, Boolean(prefersReducedMotion));
  const updateBodyProfile = avatarRecord.updateBodyProfile;
  const updatePhysiqueTargets = avatarRecord.updatePhysiqueTargets;
  const saveMetricLog = avatarRecord.saveMetricLog;
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProfileSaveRef=useRef<null|(()=>Promise<void>)>(null);
  const profileSaveChainRef=useRef<Promise<void>>(Promise.resolve());
  const renderPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRenderSaveRef = useRef<null|(() => Promise<void>)>(null);
  const renderSaveChainRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => avatarRecord.registerFlush(async () => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    await pendingProfileSaveRef.current?.();
    await profileSaveChainRef.current;
    if (profileDraftRef.current) throw new Error('Measurements could not be saved. Use Retry physique save before switching people.');
    if (renderPersistTimerRef.current) clearTimeout(renderPersistTimerRef.current);
    await pendingRenderSaveRef.current?.();
    await renderSaveChainRef.current;
    if (pendingRenderSaveRef.current) throw new Error('Lighting settings could not be saved. Try switching again.');
  }), [avatarRecord.registerFlush]);

  const queueProfileSave = useCallback((nextCurrent: any, nextGoal: any, nextMorphOverrides: any = manualMorphOverrides, nextAnatomy: any = anatomyDraft) => {
    const sequence=++profileSaveRevisionRef.current;
    const saveOwnerId=useStore.getState().user?.id;
    const nextGoalMorphOverrides=use3DStore.getState().morphOverrides.goal;
    profileDraftRef.current={ownerId:saveOwnerId,current:nextCurrent,goal:nextGoal,morphOverrides:nextMorphOverrides,goalMorphOverrides:nextGoalMorphOverrides};
    setAvatarWorkspace({ saveStatus: 'saving' });
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    const persistDraft=async () => {
      if(sequence!==profileSaveRevisionRef.current || useStore.getState().user?.id!==saveOwnerId) return;
      try {
        const appearanceMetrics = Object.fromEntries(BODY_APPEARANCE_FIELDS.flatMap(([key]) => (
          nextCurrent?.[key] === undefined || nextCurrent?.[key] === null || nextCurrent?.[key] === ''
            ? []
            : [[key, nextCurrent[key]]]
        )));
        const profilePayload=metricsToBodyProfile(nextCurrent,nextGoal);
        if(nextCurrent.avatarAsset===''){profilePayload.avatarAsset=null;appearanceMetrics.avatarAsset=null;}
        await updateBodyProfile(profilePayload);
        // A later edit owns the draft. An older body-profile response must not
        // continue publishing an obsolete appearance/goal snapshot.
        if(sequence!==profileSaveRevisionRef.current || useStore.getState().user?.id!==saveOwnerId)return;
        await updatePhysiqueTargets((latest: any) => ({
          ...(latest || {}),
          goalMetrics: nextGoal,
          appearanceMetrics: {
            ...(latest?.appearanceMetrics || {}),
            ...appearanceMetrics,
          },
          privateMetrics: {
            // Retired inch values stay as recorded; new entries are centimetres.
            ...Object.fromEntries(['d_size', 'd_girth', 'anatomyLengthCm', 'anatomyGirthCm']
              .filter((key) => nextCurrent?.[key] !== '' && nextCurrent?.[key] != null && Number.isFinite(Number(nextCurrent[key])))
              .map((key) => [key, Number(nextCurrent[key])])),
          },
          morphOverrides: {
            ...(latest?.morphOverrides || {}),
            current: nextMorphOverrides,
            goal: nextGoalMorphOverrides,
          },
          anatomyV2: createAnatomyCustomization(nextAnatomy),
        }));
        if(sequence===profileSaveRevisionRef.current && useStore.getState().user?.id===saveOwnerId) { profileDraftRef.current=null;anatomyPendingRef.current=false;setAvatarWorkspace({ saveStatus: 'saved' }); }
      } catch {
        if(sequence===profileSaveRevisionRef.current && useStore.getState().user?.id===saveOwnerId) { setAvatarWorkspace({ saveStatus: 'error' });toast.error('Could not save physique changes.'); }
      }
    };
    const saveDraft=() => {
      if(pendingProfileSaveRef.current===saveDraft) pendingProfileSaveRef.current=null;
      // Keep network writes ordered as well as render-cache hydration. A slow
      // older response must never arrive after a newer profile was saved.
      const queued=profileSaveChainRef.current.then(persistDraft,persistDraft);
      profileSaveChainRef.current=queued;
      return queued;
    };
    pendingProfileSaveRef.current=saveDraft;
    persistTimerRef.current = setTimeout(saveDraft,650);
  }, [anatomyDraft, manualMorphOverrides, persistedPhysique, setAvatarWorkspace, toast, updateBodyProfile, updatePhysiqueTargets]);

  const setAdvancedMorph = useCallback((key: string, value: number) => {
    const nextOverrides = { ...manualMorphOverrides, [key]: value };
    setMorphOverrideAction('current', key, value);
    queueProfileSave(currentMetrics, goalMetrics, nextOverrides);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, setMorphOverrideAction]);

  const resetAdvancedMorphs = useCallback(() => {
    clearMorphOverrides('current');
    queueProfileSave(currentMetrics, goalMetrics, {});
  }, [clearMorphOverrides, currentMetrics, goalMetrics, queueProfileSave]);

  const applyFaceChanges = (patch: Record<string,number>) => {
    const state=use3DStore.getState(),context=state.avatarWorkspace.avatarContext;
    const next={...state.morphOverrides,[context]:{...state.morphOverrides[context],...patch}};
    if(state.viewMode==='TIMELINE')setViewMode('SOLO');
    setMorphOverrides(next);queueProfileSave(currentMetrics,goalMetrics,next.current);
  };
  const resetFaceToMeasurements=()=>{
    const state=use3DStore.getState(),context=state.avatarWorkspace.avatarContext;
    const matrix=new AvatarParameterMatrix(context==='goal'?state.cloneB.metrics:state.cloneA.metrics,state.morphOverrides[context],context==='goal'?state.cloneA.metrics:{}).withoutFaceOverrides();
    const next={...state.morphOverrides,[context]:matrix.overrides};
    setMorphOverrides(next);queueProfileSave(currentMetrics,goalMetrics,next.current);
  };
  const resetFaceRegionToMeasurements=(keys:string[])=>{
    const state=use3DStore.getState(),context=state.avatarWorkspace.avatarContext;
    const supported=new Set(HEAD_FEATURES.map(feature=>feature.key).filter(key=>keys.includes(key)));
    const next={...state.morphOverrides,[context]:Object.fromEntries(Object.entries(state.morphOverrides[context] || {}).filter(([key])=>!supported.has(key)))};
    setMorphOverrides(next);queueProfileSave(currentMetrics,goalMetrics,next.current);
  };
  const beginMotion = () => {
    const state=use3DStore.getState(),context=state.avatarWorkspace.avatarContext;
    setViewMode('SOLO');
    presentationPreferences.change({poseStudio:patchPose(state.avatarWorkspace.poseStudio,context,{...state.avatarWorkspace.poseStudio[context],enabled:false})});
  };

  const queueRenderSettingsSave = useCallback((nextSettings: any) => {
    if (renderPersistTimerRef.current) clearTimeout(renderPersistTimerRef.current);
    const save = async () => {
      try {
        await updatePhysiqueTargets((latest: any) => ({ ...(latest || {}), renderSettings: nextSettings }));
        if (pendingRenderSaveRef.current === flush) pendingRenderSaveRef.current = null;
      } catch {
        toast.error('Could not save cinematic settings.');
      }
    };
    const flush = () => { renderSaveChainRef.current = renderSaveChainRef.current.then(save, save); return renderSaveChainRef.current; };
    pendingRenderSaveRef.current = flush;
    renderPersistTimerRef.current = setTimeout(flush, 450);
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
    const validation = validateBodyMetric(key, rawValue, { allowEmpty: false });
    if (!validation.valid) {
      toast.error(`${PRIVATE_METRIC_LABELS[key] || key}: ${validation.reason || 'Enter a valid measurement.'}`);
      return;
    }
    const value = validation.value as number;
    const next = { ...currentMetrics, [key]: value };
    // Timeline renders a historical snapshot by design, so live metric edits
    // would otherwise update the store while leaving the visible model frozen.
    if (viewMode === 'TIMELINE') setViewMode('SOLO');
    setAvatarWorkspace({ avatarContext: 'current', workspaceMode: 'current' });
    updateCurrentMetric(key, value);
    queueProfileSave(next, goalMetrics, use3DStore.getState().morphOverrides.current);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, setAvatarWorkspace, setViewMode, toast, updateCurrentMetric, viewMode]);

  const handleGoalValue = useCallback((key: string, rawValue: string) => {
    if (rawValue.trim() === '') return;
    const validation = validateBodyMetric(key, rawValue, { allowEmpty: false });
    if (!validation.valid) {
      toast.error(`${PRIVATE_METRIC_LABELS[key] || key}: ${validation.reason || 'Enter a valid goal measurement.'}`);
      return;
    }
    const value = validation.value as number;
    const next = { ...goalMetrics, [key]: value };
    if (viewMode === 'TIMELINE') setViewMode('SOLO');
    setAvatarWorkspace({ avatarContext: 'goal', workspaceMode: 'goal' });
    updateGoalMetric(key, value);
    queueProfileSave(currentMetrics, next, use3DStore.getState().morphOverrides.current);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, setAvatarWorkspace, setViewMode, toast, updateGoalMetric, viewMode]);

  const updateCurrentAppearance = useCallback((key: string, value: string | number | boolean) => {
    const next = { ...currentMetrics, [key]: value };
    updateCurrentMetric(key as any, value as any);
    queueProfileSave(next, goalMetrics, use3DStore.getState().morphOverrides.current);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, updateCurrentMetric]);

  const selectSkinTone = (tone: string, context = 'current') => {
    const next = { ...(context === 'goal' ? goalMetrics : currentMetrics), skinTone: tone, skinColor: FITZPATRICK_SWATCHES.find(s => s.id === tone)?.hex || '#bc8970' };
    if (context === 'goal') {setGoalMetrics(next); queueProfileSave(currentMetrics, next, manualMorphOverrides);}
    else {setCurrentMetrics(next); queueProfileSave(next, goalMetrics, manualMorphOverrides);}
  };

  const updateGoalAppearance = useCallback((key: string, value: string | number | boolean) => {
    const next = { ...goalMetrics, [key]: value };
    updateGoalMetric(key as any, value as any);
    queueProfileSave(currentMetrics, next, use3DStore.getState().morphOverrides.current);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, updateGoalMetric]);

  const saveAnatomyDraft = useCallback((nextAnatomy: any) => {
    anatomyDraftRef.current=nextAnatomy;anatomyPendingRef.current=true;
    use3DStore.getState().setAnatomyCustomization(nextAnatomy);
    const nextCurrent = { ...currentMetrics };
    const nextGoal = { ...goalMetrics };
    const currentRest = nextAnatomy?.current?.penis?.resting?.measurements || {};
    const goalRest = nextAnatomy?.goal?.penis?.resting?.measurements || {};
    const currentMap: Record<string, string> = { lengthCm: 'anatomyLengthCm', midCircumferenceCm: 'anatomyGirthCm' };
    for (const [field, metric] of Object.entries(currentMap)) {
      const value = currentRest[field];
      if (value === null || Number.isFinite(value)) {
        nextCurrent[metric] = value;
        if (value === null || validateBodyMetric(metric, value).valid) updateCurrentMetric(metric as any, value as any);
      }
      const goalValue = goalRest[field];
      if (goalValue === null || Number.isFinite(goalValue)) {
        nextGoal[metric] = goalValue;
        if (goalValue === null || validateBodyMetric(metric, goalValue).valid) updateGoalMetric(metric as any, goalValue as any);
      }
    }
    setAnatomyDraft(nextAnatomy);
    queueProfileSave(nextCurrent, nextGoal, manualMorphOverrides, nextAnatomy);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, updateCurrentMetric, updateGoalMetric]);

  const saveSnapshot = useCallback(async () => {
    const snapshot = { id: Date.now().toString(), metrics: publicBodyMetrics(currentMetrics), date: new Date().toISOString(), label: 'Physique check-in' };
    await saveMetricLog({ date: snapshot.date.slice(0, 10), metric: 'physique_snapshot', source: 'physique', metrics: snapshot.metrics, label: snapshot.label });
    // The record hook publishes acknowledged logs. The hydration effect owns
    // the selected person's timeline, including if they switch while saving.
  }, [currentMetrics, saveMetricLog]);

  // ── Local UI state
  const showEditor = avatarWorkspace.inspectorOpen;
  const setShowEditor = useCallback((open: boolean) => setAvatarWorkspace({ inspectorOpen: open }), [setAvatarWorkspace]);
  const [exportingAvatar, setExportingAvatar] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const editorTab = avatarWorkspace.inspectorSection;
  const [studioOpen, setStudioOpen] = useState(() => editorTab !== 'measurements');
  const sensitiveUnlocked = wardrobe === 'ANATOMICAL';
  const [splitDragging, setSplitDragging] = useState(false);
  const [storyStage, setStoryStage] = useState('current');
  const showSettings = false;
  const setShowSettings = (_open: boolean) => {};

  const skinTone = currentMetrics.skinTone || 'IV';
  const skinEditorMetrics = avatarWorkspace.avatarContext === 'goal' ? {...currentMetrics,...goalMetrics} : currentMetrics;
  const skinEditorTone = skinEditorMetrics.skinTone || 'IV';
  const surfaceDetailStatus = renderMode === 'SPRITE' ? 'Pore detail needs interactive 3D.'
    : !modelDiagnostics || modelDiagnostics.health !== 'healthy' ? 'Checking skin detail availability…'
      : quality === 'LOW' ? 'Pore detail paused by Performance quality.'
        : resolveHumanRealism(skinEditorMetrics) > 0 && microStrength(skinEditorMetrics.skinMicroDetail) > 0 ? 'Pore detail on · inspect skin close up.' : 'Pore detail off · adjust it in Skin detail.';
  const updateSkinAppearance = avatarWorkspace.avatarContext === 'goal' ? updateGoalAppearance : updateCurrentAppearance;
  const resetSkinLayers = () => {
    if (avatarWorkspace.avatarContext === 'goal') {
      const next = { ...goalMetrics, ...RESET_SKIN_LAYERS };
      setGoalMetrics(next); queueProfileSave(currentMetrics, next, manualMorphOverrides);
    } else {
      const next = { ...currentMetrics, ...RESET_SKIN_LAYERS };
      setCurrentMetrics(next); queueProfileSave(next, goalMetrics, manualMorphOverrides);
    }
  };
  const eyeColor = currentMetrics.eyeColor || '#6b3b20';
  const hairA = { style: currentMetrics.hairStyle || 'short', color: currentMetrics.hairColor || '#2c1a0a' };
  const hairB = { style: goalMetrics.hairStyle || 'short', color: goalMetrics.hairColor || '#2c1a0a' };

  const toggleSensitiveAnatomy = useCallback(() => {
    if (!sensitiveUnlocked && !anatomy.allowed) return;
    setWardrobe(sensitiveUnlocked ? 'UNDERWEAR' : 'ANATOMICAL');
  }, [anatomy.allowed, sensitiveUnlocked, setWardrobe]);

  // A loaded model that may not show anatomy never stays in Anatomical mode.
  useEffect(() => {
    if (modelDiagnostics && sensitiveUnlocked && !anatomy.allowed) setWardrobe('UNDERWEAR');
  }, [anatomy.allowed, modelDiagnostics, sensitiveUnlocked, setWardrobe]);

  const updateDateOfBirth = avatarRecord.updateDateOfBirth;
  const [dobDraft, setDobDraft] = useState('');
  const [savingDob, setSavingDob] = useState(false);
  const saveDateOfBirth = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dobDraft)) { toast.error('Enter your date of birth.'); return; }
    setSavingDob(true);
    try { await updateDateOfBirth(dobDraft); toast.success('Date of birth saved.'); }
    catch (error: any) { toast.error(error?.message || 'Date of birth could not be saved.'); }
    finally { setSavingDob(false); }
  }, [dobDraft, toast, updateDateOfBirth]);

  // Timeline playback
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const timelineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Milestone tooltip

  // Morphs tab — collapsed groups
  const [openMorphGroups, setOpenMorphGroups] = useState<Record<string, boolean>>({ 'Upper Body': true });

  // ── Persist tab selection
  const handleTabChange = useCallback((id: string) => {
    if (id !== 'measurements') setStudioOpen(true);
    setAvatarWorkspace({ inspectorOpen: true, inspectorSection: id });
    sessionStorage.setItem('chamber_tab', id);
  }, [setAvatarWorkspace]);

  const openModelControls = useCallback((id: string) => {
    handleTabChange(id);
    requestAnimationFrame(() => {
      const panel = document.getElementById('avatar-editor-panel');
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
  }, [handleTabChange]);

  const openAnatomyEditor = useCallback(() => {
    setShowEditor(true);
    handleTabChange('anatomy');
  }, [handleTabChange]);

  const handleStoryStage = useCallback((stage: string) => {
    if ((stage === 'goal' && !hasGoalComparison) || (stage !== 'current' && stage !== 'goal' && !hasTimelineData)) return;
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
  }, [hasGoalComparison, hasTimelineData, setTimelinePos, setViewMode, snapshots.length]);

  // ── Keyboard shortcuts: 1–6 for view modes, Escape for settings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const mode = VIEW_MODES.find((m) => m.key === e.key);
      if (mode && canUseViewMode(mode.id)) setViewMode(mode.id);
      if (e.key === 'Escape') { setShowSettings(false); setShowEditor(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUseViewMode, setViewMode]);

  const persistedModelRecords = useMemo(() => ({
    privateMetrics: persistedPhysique.privateMetrics, appearanceMetrics: persistedPhysique.appearanceMetrics,
    goalMetrics: persistedPhysique.goalMetrics, anatomyV2: persistedPhysique.anatomyV2,
    milestones: persistedPhysique.milestones, morphOverrides: persistedPhysique.morphOverrides,
  }), [persistedPhysique.privateMetrics,persistedPhysique.appearanceMetrics,persistedPhysique.goalMetrics,persistedPhysique.anatomyV2,persistedPhysique.milestones,persistedPhysique.morphOverrides]);
  useEffect(() => {
    setCinematicState(persistedPhysique.renderSettings || {});
  }, [persistedPhysique.renderSettings,setCinematicState]);

  // ── Hydrate the renderer cache from persisted physique records.
  useEffect(() => {
    // Saving the body and appearance records is a two-request operation. Keep
    // the latest local edit while either response rehydrates the render cache.
    const draft=profileDraftRef.current?.ownerId===useStore.getState().user?.id?profileDraftRef.current:null;
    const persistedCurrent = {
      ...(persistedModelRecords?.privateMetrics || {}),
      ...(persistedModelRecords?.appearanceMetrics || {}),
      ...bodyProfileToMetrics(normalizedBodyProfile),
      ...(draft?.current || {}),
    };
    const persistedGoal = draft?.goal || bodyProfileToGoals(normalizedBodyProfile, persistedModelRecords);
    const migratedAnatomy = createAnatomyCustomization(anatomyPendingRef.current ? anatomyDraftRef.current : persistedModelRecords?.anatomyV2);
    const currentRestMeasurements = migratedAnatomy.current.penis.resting.measurements ||= {};
    const goalRestMeasurements = migratedAnatomy.goal.penis.resting.measurements ||= {};
    const legacyCurrentAnatomy = resolveAnatomyCm(persistedCurrent);
    const legacyGoalAnatomy = resolveAnatomyCm(persistedGoal);
    if (!Object.hasOwn(currentRestMeasurements,'lengthCm') && Number.isFinite(legacyCurrentAnatomy.lengthCm)) currentRestMeasurements.lengthCm = legacyCurrentAnatomy.lengthCm;
    if (!Object.hasOwn(currentRestMeasurements,'midCircumferenceCm') && Number.isFinite(legacyCurrentAnatomy.girthCm)) currentRestMeasurements.midCircumferenceCm = legacyCurrentAnatomy.girthCm;
    if (!Object.hasOwn(goalRestMeasurements,'lengthCm') && Number.isFinite(legacyGoalAnatomy.lengthCm)) goalRestMeasurements.lengthCm = legacyGoalAnatomy.lengthCm;
    if (!Object.hasOwn(goalRestMeasurements,'midCircumferenceCm') && Number.isFinite(legacyGoalAnatomy.girthCm)) goalRestMeasurements.midCircumferenceCm = legacyGoalAnatomy.girthCm;
    const buttockMeasurements = migratedAnatomy.current.buttocks.measurements ||= {};
    if (buttockMeasurements.hipCircumferenceCm == null && Number.isFinite(Number(persistedCurrent.glutes))) buttockMeasurements.hipCircumferenceCm = Number(persistedCurrent.glutes);
    const persistedSnapshots = metricLogsToSnapshots(globalMetricLogs);
    const persistedMilestones = Array.isArray(persistedModelRecords?.milestones) ? persistedModelRecords.milestones : [];
    const persistedMorphOverrides = persistedModelRecords?.morphOverrides && typeof persistedModelRecords.morphOverrides === 'object'
      ? persistedModelRecords.morphOverrides
      : { current: {}, goal: {} };
    setMorphOverrides(draft?{...persistedMorphOverrides,current:draft.morphOverrides,goal:draft.goalMorphOverrides}:persistedMorphOverrides);
    setAnatomyDraft(migratedAnatomy);
    if(!anatomyPendingRef.current) anatomyDraftRef.current=migratedAnatomy;
    use3DStore.getState().setAnatomyCustomization(migratedAnatomy);
    setCurrentMetrics(persistedCurrent);
    setGoalMetrics(persistedGoal);
    setTimelineSnaps(persistedSnapshots);
    setMilestones(persistedMilestones);
  }, [globalMetricLogs, normalizedBodyProfile, persistedModelRecords, setCurrentMetrics, setGoalMetrics, setMilestones, setMorphOverrides, setTimelineSnaps]);

  useEffect(() => () => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    pendingProfileSaveRef.current?.();
    if (renderPersistTimerRef.current) clearTimeout(renderPersistTimerRef.current);
    setCaptureRedacted(false);
  }, [setCaptureRedacted]);

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
  const metricCompleteness = useMemo(() => getMetricCompleteness(currentMetrics), [currentMetrics]);
  const currentMetricResolution = useMemo(() => resolveBodyMetrics(currentMetrics), [currentMetrics]);
  const goalMetricResolution = useMemo(
    () => resolveBodyMetrics(goalMetrics, currentMetrics),
    [currentMetrics, goalMetrics],
  );

  // ── Export screenshot
  const waitForProtectedRedraw = useCallback(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }), []);

  const captureScreenshot = useCallback(async () => {
    const canvas = viewportRef.current?.querySelector('canvas');
    if (!canvas) { toast.error('No 3D viewport found.'); return; }
    if (captureBusy.current) return;
    captureBusy.current = true;
    try {
      setCaptureRedacted(true);
      await waitForProtectedRedraw();
      const link = document.createElement('a');
      link.download = safeFilename('physique');
      link.href = captureAvatarImage(canvas, {scale:avatarWorkspace.captureScale});
      link.click();
      toast.success('Screenshot exported with private anatomy hidden.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The image could not be rendered. Try a smaller image resolution.');
    } finally {
      setCaptureRedacted(false);
      captureBusy.current = false;
    }
  }, [avatarWorkspace.captureScale, setCaptureRedacted, toast, waitForProtectedRedraw]);

  const handleShareAvatar = useCallback(async () => {
    const canvas = viewportRef.current?.querySelector('canvas');
    if (!canvas) { toast.error('No 3D viewport found.'); return; }
    if (captureBusy.current) return;
    captureBusy.current = true;
    try {
      setCaptureRedacted(true);
      await waitForProtectedRedraw();
      setShareImageSrc(captureAvatarImage(canvas, {scale:avatarWorkspace.captureScale}) as any);
      setShowShareModal(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The protected image could not be rendered.');
    } finally {
      setCaptureRedacted(false);
      captureBusy.current = false;
    }
  }, [avatarWorkspace.captureScale, setCaptureRedacted, toast, waitForProtectedRedraw]);

  const snapshotBusy = useRef(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const handleSaveSnapshot = useCallback(async () => {
    if (snapshotBusy.current) return;
    snapshotBusy.current = true;
    setSavingSnapshot(true);
    try {
      await saveSnapshot();
      toast.success('Timeline snapshot saved.');
    } catch {
      toast.error('Could not save the snapshot.');
    } finally {
      snapshotBusy.current = false;
      setSavingSnapshot(false);
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
  const partInfo = selectedPart ? BODY_PART_MAP[selectedPart] : null;

  // ── Currently scrubbed snapshot date label
  const scrubDateLabel = useMemo(() => {
    if (!snapshots.length || timelinePos == null) return null;
    const snap = snapshots[Math.min(timelinePos as number, snapshots.length - 1)] as any;
    return snap?.date ? formatDate(snap.date, user, { month: 'short' }) : null;
  }, [snapshots, timelinePos, user]);

  useEffect(() => {
    const unsubscribe = use3DStore.subscribe(
      (state) => state.cameraZoom,
      (zoom) => setCameraZoomState(zoom ?? 1)
    );
    return unsubscribe;
  }, []);

  return (
    <>
    <div className="chamber fade-in chamber-fullscreen-wrap" data-workspace={studioOpen ? 'studio' : 'tracking'} data-presentation={presentation.active ? 'on' : 'off'} data-inspector={showEditor ? 'open' : 'closed'} data-density={avatarWorkspace.density} data-interface-effects={avatarWorkspace.interfaceEffects ? 'on' : 'off'} style={{ '--avatar-inspector-width': `${avatarWorkspace.inspectorWidth}px` } as React.CSSProperties}>
      <header className="chamber-topbar">
        <div className="chamber-topbar__brand">
          <div className="chamber-topbar__title-row">
            <h2 className="chamber-topbar__title">{avatarRecord.name}</h2>
            <span className="chamber-context-label">{avatarWorkspace.avatarContext === 'goal' ? 'Goal' : 'Current'}</span>
          </div>
          <div className="chamber-topbar__chips">
            <span className={`workspace-status workspace-status--${avatarWorkspace.saveStatus}`}>{avatarWorkspace.saveStatus}</span>
            {avatarWorkspace.saveStatus === 'error' && <button className="chamber-pill" onClick={() => queueProfileSave(currentMetrics, goalMetrics, manualMorphOverrides)}>Retry physique save</button>}
            <button className="workspace-model-status" onClick={() => handleTabChange('view')}>
              <Activity size={14} /> {modelEvidence.assetLabel}
            </button>
          </div>
        </div>
            <div className="chamber-view-modes" role="group" aria-label="Comparison mode">
              {(['current', 'goal', 'compare'] as const).map((mode) => {
                const available = mode !== 'compare' || hasGoalComparison;
                return <button key={mode} className={`chamber-pill${avatarWorkspace.workspaceMode === mode ? ' active' : ''}`}
                  aria-pressed={avatarWorkspace.workspaceMode === mode} disabled={!available}
                  title={available ? undefined : modeUnavailableReason('DUAL')}
                  onClick={() => setAvatarWorkspace({ workspaceMode: mode, avatarContext: mode === 'goal' ? 'goal' : mode === 'current' ? 'current' : avatarWorkspace.avatarContext })}>
                  {mode[0].toUpperCase() + mode.slice(1)}
                </button>;
              })}
              {avatarWorkspace.workspaceMode === 'compare' && <select aria-label="Comparison style" value={avatarWorkspace.compareStyle}
                onChange={(event) => setAvatarWorkspace({ compareStyle: event.target.value })}>
                <option value="side-by-side">Side by side</option><option value="overlay">Overlay</option>
                <option value="split">Split</option><option value="difference">Difference</option>
              </select>}
            </div>
        <div className="chamber-render-controls chamber-topbar__controls">
          <button type="button" className="chamber-pill" aria-pressed={studioOpen} onClick={() => {
            if (studioOpen) { setStudioOpen(false); handleTabChange('measurements'); }
            else { setStudioOpen(true); handleTabChange('face'); }
          }}>{studioOpen ? 'Body comparison' : 'Appearance studio'}</button>
          <button className="chamber-pill" aria-expanded={showEditor} aria-controls="avatar-model-inspector" onClick={() => setShowEditor(!showEditor)}>
            <SlidersHorizontal size={16} /> {showEditor ? 'Close editor' : 'Edit avatar'}
          </button>
          <button className="chamber-pill chamber-pill--primary" onClick={handleSaveSnapshot} disabled={savingSnapshot} aria-busy={savingSnapshot}>
            <Save size={16} /> {savingSnapshot ? 'Saving check-in…' : 'Save check-in'}
          </button>
          <button className="chamber-pill" onClick={captureScreenshot}><Download size={16} /> Export</button>
          <details className="workspace-overflow"><summary aria-label="More avatar actions"><MoreHorizontal size={18} /></summary><div>
            <button onClick={() => { setAvatarWorkspace({ avatarContext: 'current', workspaceMode: 'current' }); setShowWizard(true); }}>Guided avatar setup</button>
            <button onClick={handleShareAvatar}>Share protected view</button>
            <button onClick={() => handleTabChange('view')}>Model diagnostics</button>
            <button onClick={resetAdvancedMorphs}>Reset body adjustments</button>
          </div></details>
        </div>
      </header>

      {/* ═══ VIEWPORT + EDITOR LAYOUT ═══ */}
      <div className="chamber-layout">
        {/* ── VIEWPORT ── */}
        <div ref={viewportRef} className="chamber-viewport" data-controls-idle={presentation.active && presentation.controlsIdle ? 'true' : 'false'}>
          {presentation.active && <div className="avatar-presentation-controls">
            <button className="chamber-pill" onClick={() => setAutoRotate(!autoRotate)} aria-label={autoRotate ? 'Pause presentation rotation' : 'Play presentation rotation'}>{autoRotate ? <Pause size={16}/> : <Play size={16}/>}</button>
            <button className="chamber-pill" onClick={captureScreenshot}><Download size={16}/> Save protected image</button>
            <span>Drag to orbit · Scroll to zoom · Space to pause</span>
          </div>}
          {presentation.active && <button className="chamber-pill avatar-presentation-exit" onClick={presentation.exit}><Minimize2 size={16}/> Exit presentation <kbd>Esc</kbd></button>}
          {/* Top overlay bar */}
          <aside className="chamber-intelligence-rail" aria-label="Digital twin readout">
            <div className="chamber-readout__label">LIVE READOUT</div>
            <div className="chamber-readout__focus">
              <span className="chamber-readout__pulse" />
              <strong>{BODY_PART_MAP[selectedPart]?.label || 'Body overview'}</strong>
              <span>{viewMode === 'DUAL' ? 'Now vs destination' : `${viewMode} inspection`}</span>
            </div>
            <div className="chamber-readout__metrics">
              <div><span>Weight</span><strong>{Number.isFinite(Number(currentMetrics.weight)) ? formatMeasurement(currentMetrics.weight, 'kg', user) : '—'}</strong></div>
              <div><span>Body fat</span><strong>{Number.isFinite(Number(currentMetrics.bodyFat)) ? formatNumber(currentMetrics.bodyFat, user, { maximumFractionDigits: 1 }) : '—'}{Number.isFinite(Number(currentMetrics.bodyFat)) && <small>%</small>}</strong></div>
              <div><span>Goal delta</span>{Number.isFinite(Number(goalMetrics.weight)) && Number.isFinite(Number(currentMetrics.weight)) ? (() => {
                const delta = Number(goalMetrics.weight) - Number(currentMetrics.weight);
                return <strong className={delta >= 0 ? 'positive' : 'negative'}>{delta >= 0 ? '+' : ''}{formatMeasurement(Math.abs(delta), 'kg', user)}</strong>;
              })() : <strong>—</strong>}</div>
            </div>
            <div className="chamber-readout__footer" title={metricCompleteness.missing.length ? `Add ${metricCompleteness.missing.join(', ')} for a more accurate digital twin.` : 'All high-value measurements are present.'}>
              <span>MEASUREMENTS ADDED</span><strong>{metricCompleteness.percent}%</strong>
            </div>
          </aside>

          <div className="chamber-stage-badge">
            <span>ADVANCED MODE</span>
            <small>PARAMETRIC BODY ANALYSIS</small>
          </div>

          {viewMode === 'DELTA' && (
            <div className="chamber-delta-legend" aria-label="Delta color legend">
              <span><i className="gain" /> Goal measurement is larger</span>
              <span><i className="loss" /> Goal measurement is smaller</span>
            </div>
          )}

          <nav className={`chamber-storyline${viewMode === 'TIMELINE' ? ' chamber-storyline--with-timeline' : ''}`} aria-label="Transformation story">
            <span className="chamber-storyline__title">TRANSFORMATION STORY</span>
            {[
              ['baseline', 'Baseline'],
              ['current', 'Current'],
              ['goal', 'Goal'],
              ['forecast', 'Forecast'],
            ].map(([id, label], index) => (
              <React.Fragment key={id}>
                {index > 0 && <span className="chamber-storyline__connector" aria-hidden="true" />}
                {(() => {
                  const unavailable = (id === 'goal' && !hasGoalComparison) || (id !== 'current' && id !== 'goal' && !hasTimelineData);
                  const reason = id === 'goal' && !hasGoalComparison
                    ? modeUnavailableReason('GHOST')
                    : id !== 'current' && id !== 'goal' && !hasTimelineData
                      ? modeUnavailableReason('TIMELINE')
                      : '';
                  return (
                    <button className={storyStage === id ? 'active' : ''} aria-pressed={storyStage === id}
                      aria-disabled={unavailable} aria-label={unavailable ? `${label} unavailable. ${reason}` : label}
                      title={reason || undefined}
                      onClick={() => { if (!unavailable) handleStoryStage(id); }}>{label}</button>
                  );
                })()}
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
              <div ref={modelDropTarget} className={`chamber-canvas-wrap${partDragOver ? ' is-part-drop-target' : ''}`}
                onDragOver={event => { if ([...event.dataTransfer.types].includes(BODY_PART_DRAG_TYPE)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setPartDragOver(true); } }}
                onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPartDragOver(false); }}
                onDrop={event => {
                  setPartDragOver(false);
                  const part = readDroppedBodyPart(event.dataTransfer, sensitiveUnlocked && anatomy.allowed && !captureRedacted);
                  if (!part || renderMode === 'SPRITE') return;
                  event.preventDefault();
                  focusInspectionPart(part);
                }}>
                {renderMode === 'SPRITE'
                  ? <Sprite3DViewer />
                  : <ChamberCanvas />}
              </div>
            </Suspense>
          </TabErrorBoundary>

          <div className="chamber-overlay-top">
            <div className="chamber-overlay-row">
              {/* Camera presets */}
              <div className="chamber-pill-group">
                {CAMERA_PRESETS.map((p) => (
                  <button key={p.id} className={`chamber-pill${cameraPreset === p.id ? ' active' : ''}`}
                    onClick={() => setCameraPreset(p.id, { preserveFocus: true })}>{p.label}</button>
                ))}
              </div>
              <div className="chamber-pill-group">
                <button className="chamber-pill" onClick={() => fitCameraToBody()}>
                  Full Body
                </button>
                <button className="chamber-pill" onClick={() => resetCameraZoom()}>
                  Reset
                </button>
                <button className="chamber-pill" onClick={() => { setViewMode('SOLO'); setSelectedPart('head'); }}>Face</button>
                <button className="chamber-pill chamber-icon-button" aria-label="Zoom in" title="Zoom in" onClick={() => setCameraZoom(cameraZoom / 1.2)}><ZoomIn size={16} /></button>
                <button className="chamber-pill chamber-icon-button" aria-label="Zoom out" title="Zoom out" onClick={() => setCameraZoom(cameraZoom * 1.2)}><ZoomOut size={16} /></button>
              </div>
            </div>
          </div>



          {/* ── TIMELINE SCRUBBER ── */}
          {viewMode === 'TIMELINE' && (() => {
            const firstSnap = snapshots[0] as any;
            const lastSnap  = snapshots[snapshots.length - 1] as any;
            const startLabel = firstSnap
              ? formatDate(firstSnap.date, user, { month: 'short' })
              : 'Start';
            const endLabel = lastSnap
              ? formatDate(lastSnap.date, user, { month: 'short' })
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
                    <div key={m.id} className={`chamber-milestone${m.achieved ? ' achieved' : ''}`}
                      style={{ left: `${((m.monthIndex ?? 0) / 20) * 100}%` }}
                      title={m.label}>
                      <div className="chamber-milestone__dot" />
                      <span className="chamber-milestone__label">{m.label.split('—')[0]}</span>
                    </div>
                  ))}
                  <input type="range" aria-label="Timeline position" min="0" max={Math.max(snapshots.length - 1, 1)} value={timelinePos as number}
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

        </div>

        {/* ── EDITOR SIDEBAR ── */}
        {showEditor && (
          <div className="chamber-editor" id="avatar-model-inspector">
            {/* Editor tabs */}
            {studioOpen && <div className="chamber-editor__tabs" role="tablist" aria-label="Avatar editor" onKeyDown={event => {
              const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
              const index = buttons.indexOf(event.target as HTMLButtonElement);
              if (index < 0 || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
              const step = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : (rtl ? 1 : -1);
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
              buttons[next].focus(); buttons[next].click();
            }}>
              {[
                { id: 'measurements', label: 'Measure', icon: Ruler },
                { id: 'face',     label: 'Face',     icon: Eye     },
                { id: 'hair', label: 'Hair', icon: Scissors },
                { id: 'skin', label: 'Skin', icon: Palette },
                { id: 'anatomy',  label: 'Anatomy',  icon: Layers  },
                { id: 'clothing', label: 'Clothing', icon: Shirt },
                { id: 'pose', label: 'Pose', icon: UserRound },
                { id: 'view', label: 'View', icon: Sun },
              ].map((tab) => (
                <button key={tab.id}
                  type="button" role="tab" id={`avatar-editor-tab-${tab.id}`} aria-controls="avatar-editor-panel"
                  aria-selected={editorTab === tab.id} tabIndex={editorTab === tab.id ? 0 : -1}
                  aria-label={tab.label}
                  className={`chamber-editor__tab${editorTab === tab.id ? ' active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}>
                  <tab.icon size={13} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>}

            <div className="chamber-editor__body" id="avatar-editor-panel" role={studioOpen ? 'tabpanel' : 'region'} aria-label={!studioOpen ? 'Body measurements' : undefined} aria-labelledby={studioOpen ? `avatar-editor-tab-${editorTab}` : undefined} tabIndex={0}>

              {/* ── METRICS TAB ── */}
              {editorTab === 'measurements' && (
                <div className="chamber-editor__section">
                  {avatarWorkspace.workspaceMode === 'compare' && <AvatarComparisonSummary current={currentMetrics} goal={goalMetrics} user={user} />}
                  {!hasGoalComparison && <p className="chamber-note" role="status">Add a goal measurement to compare it with Current. Choose Goal, then enter a measurement below.</p>}
                  <h4 className="chamber-editor__heading">
                    <Ruler size={14} /> Body Metrics
                  </h4>
                  <div className="workspace-context-switch" role="group" aria-label="Measurement context">
                    {(['current', 'goal'] as const).map((context) => <button key={context}
                      className={avatarWorkspace.avatarContext === context ? 'active' : ''}
                      aria-pressed={avatarWorkspace.avatarContext === context}
                      onClick={() => setAvatarWorkspace({ avatarContext: context, workspaceMode: context })}>
                      {context === 'current' ? 'Current measurements' : 'Goal measurements'}
                    </button>)}
                  </div>
                  <label className="workspace-field"><span>Measurement group</span><select aria-label="Measurement group" value={metricGroup} onChange={event => setMetricGroup(event.target.value)}>
                    <option value="essentials">Essentials</option><option value="all">All measurements ({BODY_METRICS.length})</option>
                    {BODY_METRIC_GROUPS.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}
                  </select></label>
                  <label className="workspace-field"><span>Find a measurement</span><input type="search" aria-label="Find a measurement" placeholder="Face, hand, waist…" value={metricSearch} onChange={event => setMetricSearch(event.target.value)} /></label>
                  <div className="chamber-metric-list">
                    <p id="avatar-measurement-hint" className="gt-foundation-sr-only">Type a value or include units. Enter or leave the field to apply. Arrow keys adjust; Shift makes a larger step; Escape cancels.</p>
                    {!shownMetrics.length && <p>No matching measurements. Try another name.</p>}
                    {shownMetrics.map(meta => {
                      const key = meta.key;
                      const currentIsMeasured = currentMetricResolution.suppliedKeys.includes(key);
                      const goalIsMeasured = goalMetricResolution.suppliedKeys.includes(key);
                      const cur = (currentMetricResolution.metrics as any)[key] ?? null;
                      const goal = (goalMetricResolution.metrics as any)[key] ?? cur;
                      const goalSource = (goalMetricResolution.sourceByKey as any)[key] === 'inherited'
                        ? 'Current'
                        : goalIsMeasured ? 'Goal' : goal === null ? 'Not recorded' : 'Estimated';
                      const unit = getMeasurementUnit(meta.unit, user);
                      const progress = progressToward({
                        baseline: snapshots.length ? (baselineMetrics as any)[key] : undefined,
                        current: currentIsMeasured ? (currentMetrics as any)[key] : undefined,
                        goal: goalIsMeasured ? (goalMetrics as any)[key] : undefined,
                        unit: meta.unit,
                      });
                      const pct = progress.percent ?? 0;
                      const progressLabel = progress.percent === null || progress.done ? progress.label
                        : `${pct}% there · ${displayMetricValue(Math.abs(progress.remaining), unit)} ${unit} to go${progress.wrongWay ? ' (moving away from the goal)' : ''}`;
                      const progressColor = pct >= 75 ? 'var(--chamber-success)' : pct >= 40 ? 'var(--chamber-gold)' : 'var(--chamber-glow)';
                      return (
                        <div key={key} className="chamber-metric-row">
                          <p className="chamber-note">{avatarMetricSupport(key)}</p>
                          <div className="chamber-metric-row__header">
                            <span className="chamber-metric-row__label">
                              {meta.label}
                              <button type="button" className="chamber-pill" aria-label={`How to measure ${meta.label}`} onClick={() => { setGuideMetric(key); setShowMeasurementGuide(true); focusInspectionPart(getBodyMeasurementDefinition(key).region); requestAnimationFrame(() => document.getElementById('avatar-measurement-guide')?.scrollIntoView({ block:'nearest' })); }}>Show me</button>
                              <small className={`chamber-metric-source${currentIsMeasured ? ' is-measured' : ''}`}>
                                {currentIsMeasured ? 'Entered' : cur === null ? 'Not recorded' : 'Estimated'}
                              </small>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="chamber-metric-row__value">
                                {cur === null ? 'Not recorded' : meta.unit === 'kg' || meta.unit === 'cm'
                                  ? formatMeasurement(cur, meta.unit, user)
                                  : `${cur}${meta.unit}`}
                              </span>
                              <span style={{
                                fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px',
                                borderRadius: 4, background: progressColor + '22',
                                color: progressColor,
                              }}>{progress.percent === null ? 'No goal progress' : `${pct}%`}</span>
                            </span>
                          </div>
                          <label className="workspace-field"><span>Current {meta.label} ({unit})</span>
                            <MeasurementInput metricKey={key} unit={unit} value={currentIsMeasured ? cur : null} aria-label={`Current ${meta.label} (${unit})`}
                              placeholder="Not recorded" aria-describedby="avatar-measurement-hint"
                              onFocus={() => { setGuideMetric(key); focusInspectionPart(getBodyMeasurementDefinition(key).region); }}
                              onCommit={value => handleCurrentValue(key, value)} />
                          </label>
                          {/* GOAL slider */}
                          <div style={{ fontSize: '0.6rem', color: 'var(--chamber-glow)', marginBottom: 2, marginTop: 4 }}>
                            GOAL · {goalSource.toUpperCase()} <span style={{ float: 'right' }}>{goal === null ? 'Not recorded' : meta.unit === 'kg' || meta.unit === 'cm'
                              ? formatMeasurement(goal, meta.unit, user)
                              : `${goal}${meta.unit}`}</span>
                          </div>
                          <label className="workspace-field"><span>Goal {meta.label} ({unit})</span>
                            <MeasurementInput metricKey={key} unit={unit} value={goalIsMeasured ? goal : null} aria-label={`Goal ${meta.label} (${unit})`}
                              placeholder="No goal set" aria-describedby="avatar-measurement-hint"
                              onFocus={() => setGuideMetric(key)} onCommit={value => handleGoalValue(key, value)} />
                          </label>
                          {/* Progress bar */}
                          <p className="chamber-note">{progressLabel}</p>
                          {progress.percent !== null && <progress max={100} value={pct} aria-label={`${meta.label} goal progress`} aria-valuetext={progressLabel} style={{ width: '100%', accentColor: progressColor }}>{pct}%</progress>}
                        </div>
                      );
                    })}
                  </div>
                  <details id="avatar-measurement-guide" className="avatar-secondary-tools" open={showMeasurementGuide} onToggle={event => setShowMeasurementGuide(event.currentTarget.open)}>
                    <summary>Measurement guide · {BODY_METRIC_MAP[guideMetric]?.label || guideMetric}</summary>
                    <p className="chamber-note">Use values such as 98,5 cm, 5 ft 10 in, or 180 lb. Enter or leave the field to apply; Escape cancels.</p>
                    <MeasurementHelp key={guideMetric} definition={getBodyMeasurementDefinition(guideMetric)} label={BODY_METRIC_MAP[guideMetric]?.label || guideMetric} onInspect={focusInspectionPart} />
                  </details>
                  <ModelMeasurementCheck context={avatarWorkspace.avatarContext === 'goal' ? 'B' : 'A'} readCanvas={() => modelDropTarget.current?.querySelector('canvas')} user={user} />
                </div>
              )}

              {editorTab === 'hair' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading"><Scissors size={14} /> Hair</h4>
                  <p className="chamber-note">Only validated assets can be selected. Hair fit is checked with head and stature changes.</p>
                  <div className="chamber-wardrobe-grid">
                    {APPEARANCE_DETAIL.hair.styles.map(({ id: style, available }) => {
                      return <button key={style} disabled={!available} aria-pressed={(skinEditorMetrics.hairStyle || 'short') === style} className={`chamber-wardrobe-card${(skinEditorMetrics.hairStyle || 'short') === style ? ' active' : ''}`}
                        onClick={() => updateSkinAppearance('hairStyle', style)}><Scissors size={18} /><span>{style}</span><small>{available ? 'Ready' : 'Asset required'}</small></button>;
                    })}
                  </div>
                  <HairDetailControls metrics={skinEditorMetrics} onChange={updateSkinAppearance} />
                  <div className="workspace-unavailable"><span>Facial hair styles</span><strong>Planned · compatible assets required</strong></div>
                </div>
              )}

              {editorTab === 'skin' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading"><Palette size={14} /> Skin</h4>
                  <p className="chamber-note">Appearance controls are visual. They do not infer ethnicity or a medical condition.</p>
                  <div className="workspace-swatch-row">{FITZPATRICK_SWATCHES.map((s) => <button key={s.id} title={s.label} aria-label={s.label}
                    className={skinEditorTone === s.id && (!skinEditorMetrics.skinColor || String(skinEditorMetrics.skinColor).toUpperCase() === s.hex.toUpperCase()) ? 'active' : ''} style={{ background: s.hex }} onClick={() => selectSkinTone(s.id,avatarWorkspace.avatarContext)} />)}</div>
                  <label className="workspace-field"><span>Base skin color</span><input aria-label="Base skin color" type="color" value={/^#[0-9a-f]{6}$/i.test(String(skinEditorMetrics.skinColor)) ? String(skinEditorMetrics.skinColor) : FITZPATRICK_SWATCHES.find(s => s.id === skinEditorTone)?.hex || '#bc8970'} onChange={event => updateSkinAppearance('skinColor', event.target.value)} /></label>
                  <p className="chamber-note">Choose the color of skin usually covered from the sun. Tan adds pigment separately, so it never replaces this base color. Appearance presets are not measured sun-response phototypes.</p>
                  <SkinLayerControls metrics={skinEditorMetrics} onChange={updateSkinAppearance} onReset={resetSkinLayers} />
                  <SurfaceDetailControls metrics={skinEditorMetrics} onChange={updateSkinAppearance}/>
                  <FreckleControls metrics={skinEditorMetrics} onChange={updateSkinAppearance} />
                  <button className="chamber-pill" onClick={() => handleCinematicPreset('ANALYTIC')}><Sun size={15} /> Lock neutral inspection lighting</button>
                  <div className="workspace-unavailable"><span>Scars and authored pigment maps</span><strong>Planned · authored texture masks required</strong></div>
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
                    <input type="range" aria-label="Stress Level" min="0" max="100" value={stressLevel}
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
                            <input type="range" aria-label={s.label}
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
                        <input type="range" aria-label={label} min={0} max={1} step={0.01} value={value}
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
                  <p className="chamber-note">Build an approximate face from your measurements, then refine its features. A parameter model cannot determine your exact identity without reference data. Edits update the avatar and new image exports; previously downloaded images remain snapshots.</p>
                  <details className="chamber-note"><summary>What controls this face?</summary><p>Face width, face height, nose length, nose width and head circumference influence the supported shapes. Missing values use estimates or defaults. Eye spacing, ear length and ear width are recorded measurements but do not yet deform this model independently.</p><p>Changing a measurement releases related manual shape overrides. Other custom features and expressions are retained. The sliders describe shape strength, not likeness accuracy.</p></details>
                  <button type="button" className="chamber-pill" onClick={resetFaceToMeasurements}>Use face measurements</button>
                  <LikenessControls key={`${user?.id}-${avatarWorkspace.avatarContext}`} context={avatarWorkspace.avatarContext} onPreset={applyFaceChanges} supportedKeys={supportedHeadMorphKeys(modelDiagnostics,renderMode!=='SPRITE')}/>
                  <SpeechControls key={`speech-${user?.id}-${avatarWorkspace.avatarContext}`} viewerRef={modelDropTarget} context={avatarWorkspace.avatarContext} ownerId={user?.id} available={viewMode==='SOLO' && renderMode!=='SPRITE' && modelDiagnostics?.health==='healthy'}/>
                  <EyeAppearanceControls metrics={skinEditorMetrics} onChange={updateSkinAppearance} />
                  <HeadFeatureControls key={`head-${user?.id}-${avatarWorkspace.avatarContext}`} overrides={faceOverrides} weights={faceWeights} diagnostics={modelDiagnostics} interactive={renderMode!=='SPRITE'} onChange={applyFaceChanges} onReset={resetFaceRegionToMeasurements}/>

                  <div className="chamber-divider" />
                  <h4 className="chamber-editor__heading"><Zap size={14} /> Expressions</h4>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.45, margin: '-2px 0 8px' }}>
                    Edit the selected face. These expressions are saved separately from measurements. Speech temporarily animates the mouth and restores your expression when it stops.
                  </p>
                  {[
                    { key: 'blink', label: 'Blink' },
                    { key: 'smile', label: 'Smile' },
                    { key: 'jaw_open', label: 'Jaw open' },
                  ].map((s) => {
                    const val = Number(faceOverrides[s.key] ?? faceWeights[s.key] ?? 0);
                    const capability=headExpressionCapability(s.key,modelDiagnostics,renderMode!=='SPRITE');
                    return (
                      <div key={s.key} className="chamber-morph-row">
                        <div className="chamber-morph-row__header">
                          <span>{s.label}</span>
                          <span className="chamber-morph-row__value">{Math.round(val * 100)}%</span>
                        </div>
                        <input type="range" aria-label={s.label} min={0} max={1} step={0.01} value={val} disabled={!capability.available} title={capability.reason}
                          onChange={(e) => applyFaceChanges({[s.key]:parseFloat(e.target.value)})}
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
                              aria-label={`${label === 'YOU NOW' ? 'Current' : 'Goal'} hair color ${c.id}`}
                              aria-pressed={state.color === c.hex}
                              className="workspace-hair-swatch"
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
              {editorTab === 'clothing' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading">
                    <Shirt size={14} /> Wardrobe
                  </h4>
                  <div className="chamber-wardrobe-grid">
                    {WARDROBE_OPTIONS.map((w) => (
                      <button key={w.id}
                        className={`chamber-wardrobe-card${wardrobe === w.id ? ' active' : ''}`}
                        aria-pressed={wardrobe === w.id}
                        disabled={w.id === 'ANATOMICAL' && !anatomy.allowed}
                        title={w.id === 'ANATOMICAL' && !anatomy.allowed ? anatomy.message || undefined : undefined}
                        onClick={() => w.id === 'ANATOMICAL' ? setWardrobe(w.id) : wardrobeControls.change({preset:w.id})}>
                        <span className="chamber-wardrobe-card__icon">{React.createElement(w.icon, { size: 20, 'aria-hidden': true })}</span>
                        <span className="chamber-wardrobe-card__label">{w.label}</span>
                      </button>
                    ))}
                  </div>
                  <WardrobeOptions preset={wardrobe} preferences={wardrobePreferences} onChange={wardrobeControls.change} status={wardrobeControls.status} onOpenAnatomy={()=>handleTabChange('anatomy')}/>
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
                    <Layers size={14} /> Anatomy guide
                  </h4>
                  <p className="chamber-note">This diagram is illustrative. The GLB contains external surfaces only; these controls do not reveal internal organs or a medical skeleton.</p>
                  <div className="workspace-anatomy-info"><UserRound size={22} /><div><strong>Adult anatomy preview</strong><p>External surfaces respond to your dimensions. Optional internal ellipsoids are schematic measurement guides.</p></div></div>

                  <div className="chamber-sensitive-card">
                    <div className="chamber-sensitive-card__head">
                      <div>
                        <h4><Eye size={13} /> Private anatomy</h4>
                        <p>Adults only. Off by default for every session; screenshots, sharing and exports keep it covered.</p>
                      </div>
                      <button
                        className={`chamber-pill${sensitiveUnlocked ? ' active' : ''}`}
                        aria-pressed={sensitiveUnlocked}
                        disabled={!sensitiveUnlocked && !anatomy.allowed}
                        onClick={toggleSensitiveAnatomy}
                      >
                        {sensitiveUnlocked ? 'Wear underwear' : anatomy.allowed ? 'Anatomical mode' : 'Unavailable'}
                      </button>
                    </div>

                    {!anatomy.allowed && anatomy.message && <p className="chamber-note" role="status">{anatomy.message}</p>}
                    {(anatomy.reason === 'missing-dob' || anatomy.reason === 'invalid-dob') && (
                      <div className="chamber-sensitive-field">
                        <label>
                          <span>Date of birth</span>
                          <input type="date" autoComplete="bday" value={dobDraft} max={new Date().toISOString().slice(0, 10)}
                            onChange={(event) => setDobDraft(event.target.value)} />
                        </label>
                        <button className="chamber-pill" disabled={savingDob || !dobDraft} onClick={saveDateOfBirth}>
                          {savingDob ? 'Saving…' : 'Save date of birth'}
                        </button>
                      </div>
                    )}

                    {sensitiveUnlocked && anatomy.allowed && <AnatomyCustomizationPanel value={anatomyDraft} onSave={saveAnatomyDraft} onInspect={(id: string)=>{focusInspectionPart(id);modelDropTarget.current?.scrollIntoView({block:'nearest'});}}
                      targetContext={avatarWorkspace.avatarContext} previewSupported={Boolean(modelDiagnostics?.privatePreview?.available)} preview={anatomyPreview} evidence={anatomyEvidence} onPreviewChange={(patch: any)=> {
                        const {target,...previewPatch}=patch;
                        use3DStore.getState().setAnatomyPreview(previewPatch);
                        if(target) setAvatarWorkspace({avatarContext:target,workspaceMode:target});
                      }} />}
                  </div>
                </div>
              )}

              {editorTab === 'pose' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading"><UserRound size={14}/> Pose · {avatarWorkspace.avatarContext === 'goal' ? 'Goal' : 'Current'}</h4>
                  <AnimationPanel inline onSelect={beginMotion}/>
                  <p className="chamber-note">Choose an action to start motion. Enable Use saved pose to drag the hand and foot handles or adjust individual joints.</p>
                  <PoseStudioControls key={`${user?.id}-${avatarWorkspace.avatarContext}`} value={avatarWorkspace.poseStudio[avatarWorkspace.avatarContext]} saveStatus={presentationPreferences.saveStatus}
                    onJointSelect={selectPoseJoint}
                    available={viewMode === 'SOLO' && renderMode !== 'SPRITE'}
                    readPose={() => inspectAvatarSurfaces(modelDropTarget.current?.querySelector('canvas'))?.surfaces.find((surface: any) => surface.eyelids)?.pose}
                    onChange={(pose: any) => presentationPreferences.change({poseStudio:patchPose(use3DStore.getState().avatarWorkspace.poseStudio,avatarWorkspace.avatarContext,pose)})}/>
                </div>
              )}

              {editorTab === 'view' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading"><Sun size={14} /> View</h4>
                  <AvatarViewOptions preferences={avatarWorkspace} onChange={presentationPreferences.change} cinematic={cinematic}
                    onEffectChange={handleCinematicSetting} gpuTier={quality} reducedMotion={Boolean(prefersReducedMotion)}
                    onReset={presentationPreferences.reset} saveStatus={presentationPreferences.saveStatus} />
                  <CameraBookmarkControls key={user?.id} value={avatarWorkspace.cameraBookmarks} saveStatus={presentationPreferences.saveStatus}
                    available={viewMode === 'SOLO' && renderMode !== 'SPRITE'}
                    readView={() => readBookmarkCamera(modelDropTarget.current?.querySelector('canvas'))}
                    onChange={(cameraBookmarks: any) => presentationPreferences.change({cameraBookmarks})}
                    onApply={(view: any) => use3DStore.getState().openCameraBookmark(view)}/>
                  <label className="workspace-field"><span>Quality</span><select aria-label="Model quality" value={avatarWorkspace.qualityPreference} onChange={(e) => {
                    const preference = e.target.value; presentationPreferences.change({ qualityPreference: preference });
                    if (preference !== 'automatic') setQuality({ performance: 'LOW', balanced: 'MED', high: 'HIGH' }[preference]);
                  }}><option value="automatic">Automatic ({quality})</option><option value="performance">Performance</option><option value="balanced">Balanced</option><option value="high">High</option></select></label>
                  <label className="workspace-field"><span>Renderer</span><select value={renderMode} onChange={(e) => setRenderMode(e.target.value)}><option value="WEBGL">Interactive 3D</option><option value="SPRITE">2D fallback</option></select></label>
                  <div className="avatar-motion-options"><p className="chamber-note">Preview poses and motion. Measurement and anatomy editors use a neutral pose. Selecting a motion starts playback.</p>
                    <AnimationPanel inline onSelect={beginMotion}/></div>
                  <div className="workspace-field"><span>Presentation<small>Full screen. Exit restores your view. Shortcut: P.</small></span><button className="chamber-pill" onClick={presentation.enter}><Maximize2 size={15}/> Enter presentation</button></div>
                  <label className="workspace-switch"><span>Auto rotate</span><input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} /></label>
                  <p className="chamber-note"><ShieldCheck size={14}/> Screenshots and shared images always cover private anatomy.</p>
                  <details className="chamber-note"><summary>Model diagnostics</summary><p>{modelEvidence.assetLabel}. {modelEvidence.missingParts.length ? `Features absent from the v2 inventory: ${modelEvidence.missingParts.join(', ')}.` : 'Visual realism requires a separate assessment of the rendered result.'}</p><p>Runtime: {modelDiagnostics?.health || 'Loading'} · {rendererTelemetry?.fps == null ? 'Collecting frame sample' : `${rendererTelemetry.fps} FPS`} · {quality} tier.</p></details>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <details className="avatar-secondary-tools"><summary>Model tools and body regions</summary>
      <section className="avatar-model-tools" aria-label="Model tools">
        <div className="avatar-model-tools__heading"><strong>Model tools</strong><span>{modelEvidence.assetLabel}</span></div>
        <div className="avatar-model-tools__actions" role="group" aria-label="Open model controls">
          <button type="button" className="chamber-pill" onClick={() => { setAvatarWorkspace({ avatarContext: 'current', workspaceMode: 'current' }); setShowWizard(true); }}><Ruler size={16} /> Guided setup</button>
          <button type="button" className="chamber-pill" onClick={() => openModelControls('pose')}><UserRound size={16} /> Pose controls</button>
          <button type="button" className="chamber-pill" onClick={() => openModelControls('skin')}><Palette size={16} /> Skin detail</button>
          <button type="button" className="chamber-pill" onClick={() => openModelControls('face')}><Eye size={16} /> Face controls</button>
          <button type="button" className="chamber-pill" onClick={() => openModelControls('view')}><Activity size={16} /> View model details</button>
          {modelDiagnostics?.modelAsset?.preset==='male' && <button type="button" className="chamber-pill" onClick={()=>{
            const next={...currentMetrics,modelVersion:currentMetrics.modelVersion==='human-r2'?'v2':'human-r2',avatarAsset:''};
            setCurrentMetrics(next);queueProfileSave(next,goalMetrics,manualMorphOverrides);
          }}>{currentMetrics.modelVersion==='human-r2'?'Use reviewed model':'Try human realism preview'}</button>}
        </div>
        <p>{!modelDiagnostics ? 'Checking model controls…' : renderMode === 'SPRITE' ? 'Interactive 3D is required for pose and surface previews.'
          : modelEvidence.capabilities.handsAndToes ? `Hands and toes available${modelEvidence.capabilities.eyeLayers ? ' · Separate eye layers' : ''}${modelEvidence.capabilities.nails ? ' · Attached nails' : ''}. Open Pose controls and enable Use saved pose to edit articulation.`
            : 'This model has no articulated hand and toe controls. Review your model choice in Profile → Body & measurements → 3D appearance & anatomy: Model asset preset, 3D model version and Avatar asset key.'}</p>
        <p className="avatar-model-tools__surface-status">{surfaceDetailStatus}</p>
        {modelDiagnostics?.modelAsset?.nativeFamily && <p className="chamber-note">Human realism preview. Visual and device acceptance are still in progress.</p>}
        {modelDiagnostics?.privateAssetStatus==='loading' && <p className="chamber-note" role="status">Loading anatomy…</p>}
        {modelDiagnostics?.privateAssetStatus==='error' && <p className="chamber-note" role="alert">Anatomy could not be loaded. Cover the model and reveal it again to retry.</p>}
        {modelDiagnostics?.modelAsset?.isBundled && modelDiagnostics.modelAsset.preset==='male' && !modelEvidence.capabilities.handsAndToes &&
          <button type="button" className="chamber-pill" onClick={()=>{
            const next={...currentMetrics,modelVersion:'v2',avatarAsset:''};setCurrentMetrics(next);queueProfileSave(next,goalMetrics,manualMorphOverrides);
          }}>Use articulated model</button>}
      </section>
      <BodyPartNavigator privateAllowed={sensitiveUnlocked && anatomy.allowed && !captureRedacted} dropTargetRef={modelDropTarget}
        disabled={renderMode === 'SPRITE' || rendererTelemetry.status === 'context-lost'} />
      </details>

      <details className="avatar-secondary-tools"><summary>Model information and readiness</summary><AvatarEvidence metrics={currentMetrics} diagnostics={modelDiagnostics} qualityGate={qualityGate} /></details>

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
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: 8 }}>Skin appearance preset</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {FITZPATRICK_SWATCHES.map((s) => (
                  <button key={s.id} title={s.label} aria-label={`Skin appearance: ${s.label}`} aria-pressed={skinTone === s.id}
                    className="avatar-color-swatch"
                    onClick={() => selectSkinTone(s.id)}
                    style={{
                      borderRadius: '50%', background: s.hex,
                      border: skinTone === s.id ? '2px solid var(--chamber-glow)' : '2px solid var(--border)',
                      cursor: 'pointer', transition: 'transform 0.15s',
                    }} />
                ))}
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 6 }}>Eye Colour</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                {EYE_COLOR_PRESETS.map((c) => (
                  <button key={c} aria-label={`Eye color ${c}`} aria-pressed={eyeColor === c} className="avatar-color-swatch" onClick={() => updateCurrentAppearance('eyeColor', c)}
                    style={{
                      borderRadius: '50%', background: c,
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
                    onClick={() => { const next = { ...currentMetrics, ...p.posture }; setCurrentMetrics(next); queueProfileSave(next, goalMetrics, manualMorphOverrides); }}>
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
                <input type="range" aria-label="Exposure" min={AVATAR_EXPOSURE.min} max={AVATAR_EXPOSURE.max} step={AVATAR_EXPOSURE.step} value={cinematic.exposure}
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

      {partInfo && (!partInfo.private || sensitiveUnlocked && anatomy.allowed && !captureRedacted) && (
        <section className="avatar-part-summary" aria-label="Selected part measurements">
          <div><h3>{partInfo.label}</h3><p>Your recorded values. The model's inspection bounds do not validate these measurements.</p></div>
          <dl>{partInfo.metrics.map((key: string) => {
            const validation = validateBodyMetric(key, currentMetrics[key], { allowEmpty: false });
            const unit = BODY_METRIC_RANGES[key]?.unit || 'cm';
            return <div key={key}><dt>{PRIVATE_METRIC_LABELS[key] || key}</dt><dd>{validation.valid ? formatMeasurement(validation.value, unit, user) : 'Not recorded'}</dd></div>;
          })}</dl>
          <button type="button" className="chamber-pill" onClick={() => setSelectedPart(null)}>Close part details</button>
        </section>
      )}

      {showWizard ? (
        <AvatarCreationWizard onComplete={() => setShowWizard(false)} onMetric={handleCurrentValue}
          onAppearance={updateCurrentAppearance} onMorph={setAdvancedMorph} onWardrobe={wardrobeControls.change} />
      ) : null}

      <details className="avatar-secondary-tools avatar-history">
        <summary>History, snapshots and measurements</summary>
        {!hasTimelineData && <p className="chamber-note">No snapshots yet. Save a check-in to begin your dated history.</p>}
        <button type="button" className="chamber-pill" disabled={!hasTimelineData} onClick={() => setAvatarWorkspace({ workspaceMode: 'timeline' })}>Open timeline</button>
      <PhysiqueDataPanel
        current={currentMetrics}
        goal={goalMetrics}
        baseline={baselineMetrics}
        snapshots={snapshots}
        milestones={milestones}
        progress={progressSummary}
        diagnostics={modelDiagnostics}
        onSaveSnapshot={handleSaveSnapshot}
        onToggleMilestone={handleToggleMilestone}
      />
      </details>

    </div>
      {showShareModal && (
        <SocialShareModal 
          onClose={() => setShowShareModal(false)}
          imageSrc={shareImageSrc}
        />
      )}
    </>
  );
}
