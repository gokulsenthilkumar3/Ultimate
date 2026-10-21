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
import { BODY_APPEARANCE_FIELDS, bodyProfileToGoals, bodyProfileToMetrics, calculateGoalProgress, getBaselineMetrics, getInvalidBodyProfileMeasurements, mergeBodyProfileSources, metricLogsToSnapshots, metricsToBodyProfile, publicBodyMetrics } from '../lib/physiqueProfile';
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
import { getBodyMeasurementDefinition } from '../lib/bodyMeasurementDefinitions';
import { createAnatomyCustomization } from '../lib/anatomyCustomization';
import { computeHeightScale } from './morphEngine/metricsToBlendshapes';
import { trackEvent } from '../lib/analytics';
import AvatarEvidence from './physique/AvatarEvidence';
import AvatarViewOptions from './physique/AvatarViewOptions';
import WardrobeOptions from './physique/WardrobeOptions';
import {preloadWardrobeAsset} from './morphEngine/useWardrobeAsset';
import useWardrobePreferences from '../hooks/useWardrobePreferences';
import useAvatarPresentation from '../hooks/useAvatarPresentation';
import useAvatarPresentationMode from '../hooks/useAvatarPresentationMode';
import {captureAvatarImage} from './morphEngine/captureRuntime';
import {safeFilename} from '../lib/avatarCapturePolicy';
import AnimationPanel from './morphEngine/AnimationPanel';
import { AVATAR_EXPOSURE, DEFAULT_AVATAR_PRESENTATION } from '../lib/avatarPresentation';
import { buildAvatarEvidence } from '../lib/avatarEvidence';
import '../styles/avatar-workspace.css';
import { formatDate, formatMeasurement, formatNumber, getMeasurementUnit } from '../utils/userFormatters';

// Lazy load the heavy 3D canvas
const ChamberCanvas = lazy(() => import('./PhysiqueRenderer'));
const Sprite3DViewer = lazy(() => import('./Sprite3DViewer'));

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
  const user = useStore((state: any) => state.user);
  const toast: any = useToast();
  const legacyUser = useStore((s: any) => s.user || EMPTY_OBJECT);

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
    Number.isFinite(Number((currentMetrics as any)[key]))
    && Number.isFinite(Number((goalMetrics as any)[key]))
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
  const [anatomyDraft, setAnatomyDraft] = useState(() => createAnatomyCustomization(persistedPhysiqueState?.anatomyV2));
  const anatomyDraftRef=useRef(anatomyDraft);
  const anatomyPendingRef=useRef(false);
  const profileSaveRevisionRef=useRef(0);
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
  const prefersReducedMotion = useStore((s: any) => s.reducedMotion) || rendererTelemetry.reducedMotion;
  const presentation = useAvatarPresentationMode(viewportRef, Boolean(prefersReducedMotion));
  const updateBodyProfile = useStore((s: any) => s.updateBodyProfile);
  const updatePhysiqueTargets = useStore((s: any) => s.updatePhysiqueTargets);
  const saveMetricLog = useStore((s: any) => s.saveMetricLog);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProfileSaveRef=useRef<null|(()=>Promise<void>)>(null);
  const renderPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueProfileSave = useCallback((nextCurrent: any, nextGoal: any, nextMorphOverrides: any = manualMorphOverrides, nextAnatomy: any = anatomyDraft) => {
    const sequence=++profileSaveRevisionRef.current;
    const saveOwnerId=useStore.getState().user?.id;
    setAvatarWorkspace({ saveStatus: 'saving' });
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    const saveDraft=async () => {
      if(pendingProfileSaveRef.current===saveDraft) pendingProfileSaveRef.current=null;
      if(useStore.getState().user?.id!==saveOwnerId) return;
      try {
        const appearanceMetrics = Object.fromEntries(BODY_APPEARANCE_FIELDS.flatMap(([key]) => (
          nextCurrent?.[key] === undefined || nextCurrent?.[key] === null || nextCurrent?.[key] === ''
            ? []
            : [[key, nextCurrent[key]]]
        )));
        await updateBodyProfile(metricsToBodyProfile(nextCurrent, nextGoal));
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
          },
          anatomyV2: createAnatomyCustomization(nextAnatomy),
        }));
        if(sequence===profileSaveRevisionRef.current) { anatomyPendingRef.current=false;setAvatarWorkspace({ saveStatus: 'saved' }); }
      } catch {
        if(sequence===profileSaveRevisionRef.current) { setAvatarWorkspace({ saveStatus: 'error' });toast.error('Could not save physique measurements.'); }
      }
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

  const queueRenderSettingsSave = useCallback((nextSettings: any) => {
    if (renderPersistTimerRef.current) clearTimeout(renderPersistTimerRef.current);
    renderPersistTimerRef.current = setTimeout(async () => {
      try {
        await updatePhysiqueTargets((latest: any) => ({ ...(latest || {}), renderSettings: nextSettings }));
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
    queueProfileSave(next, goalMetrics, manualMorphOverrides);
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
    queueProfileSave(currentMetrics, next, manualMorphOverrides);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, setAvatarWorkspace, setViewMode, toast, updateGoalMetric, viewMode]);

  const updateCurrentAppearance = useCallback((key: string, value: string | number) => {
    const next = { ...currentMetrics, [key]: value };
    updateCurrentMetric(key as any, value as any);
    queueProfileSave(next, goalMetrics, manualMorphOverrides);
  }, [currentMetrics, goalMetrics, manualMorphOverrides, queueProfileSave, updateCurrentMetric]);

  const selectSkinTone = (tone: string, context = 'current') => {
    const next = { ...(context === 'goal' ? goalMetrics : currentMetrics), skinTone: tone, skinColor: FITZPATRICK_SWATCHES.find(s => s.id === tone)?.hex || '#bc8970' };
    if (context === 'goal') {setGoalMetrics(next); queueProfileSave(currentMetrics, next, manualMorphOverrides);}
    else {setCurrentMetrics(next); queueProfileSave(next, goalMetrics, manualMorphOverrides);}
  };

  const updateGoalAppearance = useCallback((key: string, value: string | number) => {
    const next = { ...goalMetrics, [key]: value };
    updateGoalMetric(key as any, value as any);
    queueProfileSave(currentMetrics, next, manualMorphOverrides);
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
    addTimelineSnap(snapshot);
    await saveMetricLog({ date: snapshot.date.slice(0, 10), metric: 'physique_snapshot', source: 'physique', metrics: snapshot.metrics, label: snapshot.label });
  }, [addTimelineSnap, currentMetrics, saveMetricLog]);

  // ── Local UI state
  const showEditor = avatarWorkspace.inspectorOpen;
  const setShowEditor = useCallback((open: boolean) => setAvatarWorkspace({ inspectorOpen: open }), [setAvatarWorkspace]);
  const [exportingAvatar, setExportingAvatar] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const editorTab = avatarWorkspace.inspectorSection;
  const sensitiveUnlocked = wardrobe === 'ANATOMICAL';
  const [splitDragging, setSplitDragging] = useState(false);
  const [storyStage, setStoryStage] = useState('current');
  const showSettings = false;
  const setShowSettings = (_open: boolean) => {};

  const skinTone = currentMetrics.skinTone || 'IV';
  const skinEditorMetrics = avatarWorkspace.avatarContext === 'goal' ? {...currentMetrics,...goalMetrics} : currentMetrics;
  const skinEditorTone = skinEditorMetrics.skinTone || 'IV';
  const updateSkinAppearance = avatarWorkspace.avatarContext === 'goal' ? updateGoalAppearance : updateCurrentAppearance;
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

  const updateUser = useStore((s: any) => s.updateUser);
  const [dobDraft, setDobDraft] = useState('');
  const [savingDob, setSavingDob] = useState(false);
  const saveDateOfBirth = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dobDraft)) { toast.error('Enter your date of birth.'); return; }
    setSavingDob(true);
    try { await updateUser({ dob: dobDraft }); toast.success('Date of birth saved.'); }
    catch (error: any) { toast.error(error?.message || 'Date of birth could not be saved.'); }
    finally { setSavingDob(false); }
  }, [dobDraft, toast, updateUser]);

  // Timeline playback
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const timelineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Milestone tooltip

  // Morphs tab — collapsed groups
  const [openMorphGroups, setOpenMorphGroups] = useState<Record<string, boolean>>({ 'Upper Body': true });

  // ── Persist tab selection
  const handleTabChange = useCallback((id: string) => {
    setAvatarWorkspace({ inspectorSection: id });
    sessionStorage.setItem('chamber_tab', id);
  }, [setAvatarWorkspace]);

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
    if (persistedPhysique.renderSettings) setCinematicState(persistedPhysique.renderSettings);
  }, [persistedPhysique.renderSettings,setCinematicState]);

  // ── Hydrate the renderer cache from persisted physique records.
  useEffect(() => {
    const persistedCurrent = {
      ...(persistedModelRecords?.privateMetrics || {}),
      ...(persistedModelRecords?.appearanceMetrics || {}),
      ...bodyProfileToMetrics(normalizedBodyProfile),
    };
    const persistedGoal = bodyProfileToGoals(normalizedBodyProfile, persistedModelRecords);
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
    setMorphOverrides(persistedMorphOverrides);
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
    <div className="chamber fade-in chamber-fullscreen-wrap" data-presentation={presentation.active ? 'on' : 'off'} data-density={avatarWorkspace.density} data-interface-effects={avatarWorkspace.interfaceEffects ? 'on' : 'off'} style={{ '--avatar-inspector-width': `${avatarWorkspace.inspectorWidth}px` } as React.CSSProperties}>
      <header className="chamber-topbar">
        <div className="chamber-topbar__brand">
          <div className="chamber-topbar__title-row">
            <h2 className="chamber-topbar__title">My avatar</h2>
            <span className="chamber-context-label">{avatarWorkspace.avatarContext === 'goal' ? 'Goal' : 'Current'}</span>
          </div>
          <div className="chamber-topbar__chips">
            <span className={`workspace-status workspace-status--${avatarWorkspace.saveStatus}`}>{avatarWorkspace.saveStatus}</span>
            <button className="workspace-model-status" onClick={() => handleTabChange('view')}>
              <Activity size={14} /> {modelEvidence.assetLabel}
            </button>
          </div>
        </div>
        <div className="chamber-render-controls chamber-topbar__controls">
          <button className="chamber-pill chamber-pill--primary" onClick={saveSnapshot}>
            <Save size={16} /> Save check-in
          </button>
          <button className="chamber-pill" onClick={captureScreenshot}><Download size={16} /> Export</button>
          <details className="workspace-overflow"><summary aria-label="More avatar actions"><MoreHorizontal size={18} /></summary><div>
            <button onClick={() => setShowWizard(true)}>Create or replace avatar</button>
            <button onClick={handleShareAvatar}>Share protected view</button>
            <button onClick={() => handleTabChange('view')}>Model diagnostics</button>
            <button onClick={resetAdvancedMorphs}>Reset body adjustments</button>
          </div></details>
        </div>
      </header>

      <AvatarEvidence metrics={currentMetrics} diagnostics={modelDiagnostics} qualityGate={qualityGate} />
      <BodyPartNavigator privateAllowed={sensitiveUnlocked && anatomy.allowed && !captureRedacted} dropTargetRef={modelDropTarget}
        disabled={renderMode === 'SPRITE' || rendererTelemetry.status === 'context-lost'} />
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
          <div className="chamber-overlay-top">
            <div className="chamber-view-modes" role="group" aria-label="Comparison mode">
              {(['current', 'goal', 'compare', 'timeline'] as const).map((mode) => {
                const available = mode === 'timeline' ? hasTimelineData : mode !== 'compare' || hasGoalComparison;
                return <button key={mode} className={`chamber-pill${avatarWorkspace.workspaceMode === mode ? ' active' : ''}`}
                  aria-pressed={avatarWorkspace.workspaceMode === mode} disabled={!available}
                  title={available ? undefined : mode === 'timeline' ? modeUnavailableReason('TIMELINE') : modeUnavailableReason('DUAL')}
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
          <div className="chamber-editor">
            {/* Editor tabs */}
            <div className="chamber-editor__tabs" role="tablist" aria-label="Avatar editor" onKeyDown={event => {
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
            </div>

            <div className="chamber-editor__body" id="avatar-editor-panel" role="tabpanel" aria-labelledby={`avatar-editor-tab-${editorTab}`} tabIndex={0}>

              {/* ── METRICS TAB ── */}
              {editorTab === 'measurements' && (
                <div className="chamber-editor__section">
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
                  <details className="chamber-note">
                    <summary>Model fit</summary>
                    <p>Entered measurements drive the shape; missing values use render-only estimates. Circumferences are not yet verified against the deformed mesh, so achieved measurements and fit errors are unavailable. Measurement completeness is not anatomical accuracy.</p>
                  </details>
                  <div className="chamber-metric-list">
                    <p id="avatar-measurement-hint" className="chamber-note">Type a value or include units, such as 98,5 cm, 5 ft 10 in, or 180 lb. Enter or leave the field to apply. Arrow keys adjust; Shift makes a larger step; Escape cancels.</p>
                    <MeasurementHelp key={guideMetric} definition={getBodyMeasurementDefinition(guideMetric)} label={METRIC_LABELS[guideMetric]?.label || guideMetric} onInspect={focusInspectionPart} />
                    {Object.entries(METRIC_LABELS).map(([key, meta]) => {
                      const currentIsMeasured = currentMetricResolution.suppliedKeys.includes(key);
                      const goalIsMeasured = goalMetricResolution.suppliedKeys.includes(key);
                      const cur = Number((currentMetricResolution.metrics as any)[key]) || 0;
                      const goal = Number((goalMetricResolution.metrics as any)[key]) || cur;
                      const goalSource = (goalMetricResolution.sourceByKey as any)[key] === 'inherited'
                        ? 'Current'
                        : goalIsMeasured ? 'Goal' : 'Estimated';
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
                          <div className="chamber-metric-row__header">
                            <span className="chamber-metric-row__label">
                              {meta.label}
                              <button type="button" className="chamber-pill" aria-label={`How to measure ${meta.label}`} onClick={() => { setGuideMetric(key); focusInspectionPart(getBodyMeasurementDefinition(key).region); }}>Show me</button>
                              <small className={`chamber-metric-source${currentIsMeasured ? ' is-measured' : ''}`}>
                                {currentIsMeasured ? 'Entered' : 'Estimated'}
                              </small>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="chamber-metric-row__value">
                                {meta.unit === 'kg' || meta.unit === 'cm'
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
                            GOAL · {goalSource.toUpperCase()} <span style={{ float: 'right' }}>{meta.unit === 'kg' || meta.unit === 'cm'
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
                </div>
              )}

              {editorTab === 'hair' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading"><Scissors size={14} /> Hair</h4>
                  <p className="chamber-note">Only validated assets can be selected. Hair fit is checked with head and stature changes.</p>
                  <div className="chamber-wardrobe-grid">
                    {['bald', 'buzz', 'short', 'medium', 'long'].map((style) => {
                      const available = ['bald', 'short'].includes(style);
                      return <button key={style} disabled={!available} className={`chamber-wardrobe-card${hairA.style === style ? ' active' : ''}`}
                        onClick={() => updateCurrentAppearance('hairStyle', style)}><Scissors size={18} /><span>{style}</span><small>{available ? 'Ready' : 'Asset required'}</small></button>;
                    })}
                  </div>
                  <label className="workspace-field"><span>Hair color</span><input type="color" value={hairA.color} onChange={(e) => updateCurrentAppearance('hairColor', e.target.value)} /></label>
                  <div className="workspace-unavailable"><span>Density, greying and facial hair</span><strong>Planned · compatible assets required</strong></div>
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
                  <label className="workspace-field"><span>Undertone</span><select aria-label="Skin undertone" value={['cool','neutral','warm'].includes(String(skinEditorMetrics.skinUndertone)) ? String(skinEditorMetrics.skinUndertone) : 'neutral'} onChange={event=>updateSkinAppearance('skinUndertone',event.target.value)}><option value="cool">Cool / pink</option><option value="neutral">Neutral</option><option value="warm">Warm / golden</option></select></label>
                  {[{key:'skinTan',label:'Tan amount',help:'Adds pigment to sun-exposed regions. Palms, inner arms and covered regions receive less.'},{key:'skinFlush',label:'Skin flush',help:'Adds a subtle blood-color layer; it does not infer stress or health.'}].map(layer=><label className="avatar-range-field" key={layer.key}><span>{layer.label}<output>{Math.round(Number(skinEditorMetrics[layer.key] || 0)*100)}%</output></span><input type="range" aria-label={layer.label} min="0" max="1" step=".01" value={Number(skinEditorMetrics[layer.key] || 0)} onChange={event=>updateSkinAppearance(layer.key,Number(event.target.value))}/><small>{layer.help}</small></label>)}
                  <p className="chamber-note">Regional exposure is an approximation from the mesh. Matching tan lines to specific garments still needs authored texture masks.</p>
                  <button className="chamber-pill" onClick={() => handleCinematicPreset('ANALYTIC')}><Sun size={15} /> Lock neutral inspection lighting</button>
                  <div className="workspace-unavailable"><span>Freckles, scars and detailed pigment maps</span><strong>Planned · authored texture masks required</strong></div>
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
                        <input type="range" aria-label={s.label} min={s.min} max={s.max} step={s.step}
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
                        <input type="range" aria-label={s.label} min={0} max={1} step={0.01} value={val}
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

              {editorTab === 'view' && (
                <div className="chamber-editor__section">
                  <h4 className="chamber-editor__heading"><Sun size={14} /> View</h4>
                  <AvatarViewOptions preferences={avatarWorkspace} onChange={presentationPreferences.change} cinematic={cinematic}
                    onEffectChange={handleCinematicSetting} gpuTier={quality} reducedMotion={Boolean(prefersReducedMotion)}
                    onReset={() => presentationPreferences.change(DEFAULT_AVATAR_PRESENTATION)} saveStatus={presentationPreferences.saveStatus} />
                  <label className="workspace-field"><span>Quality</span><select value={avatarWorkspace.qualityPreference} onChange={(e) => {
                    const preference = e.target.value; presentationPreferences.change({ qualityPreference: preference });
                    if (preference !== 'automatic') setQuality({ performance: 'LOW', balanced: 'MED', high: 'HIGH' }[preference]);
                  }}><option value="automatic">Automatic ({quality})</option><option value="performance">Performance</option><option value="balanced">Balanced</option><option value="high">High</option></select></label>
                  <label className="workspace-field"><span>Renderer</span><select value={renderMode} onChange={(e) => setRenderMode(e.target.value)}><option value="WEBGL">Interactive 3D</option><option value="SPRITE">2D fallback</option></select></label>
                  <div className="avatar-motion-options"><p className="chamber-note">Preview poses and motion. Measurement and anatomy editors use a neutral pose. Selecting a motion starts playback.</p><AnimationPanel inline/></div>
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

      {showWizard || !currentMetrics.height ? (
        <AvatarCreationWizard onComplete={() => setShowWizard(false)} />
      ) : null}

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
