/**
 * GrowthTrack Ultimate — Layer 1 Usage Guide
 * use3DStore.usage.js
 *
 * Examples of how every slice of use3DStore connects to
 * React UI panels and the R3F canvas — without cross-contamination.
 */

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import use3DStore, {
  VIEW_MODES,
  CAMERA_PRESETS,
  WARDROBE_PRESETS,
  GPU_TIERS,
  computeMorphWeights,
} from "./use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// 1. R3F CANVAS — subscribes ONLY to 3D-specific slices
//    The canvas never re-renders because a UI panel changed text.
// ─────────────────────────────────────────────────────────────────────────────

export function useCanvasState() {
  return use3DStore(
    useShallow((s) => ({
      cloneAWeights:    s.cloneA.weights,
      cloneBWeights:    s.cloneB.weights,
      cloneAMetrics:    s.cloneA.metrics,
      cloneBMetrics:    s.cloneB.metrics,
      cloneAPosture:    s.cloneA.posture,
      cloneBPosture:    s.cloneB.posture,
      viewMode:         s.viewMode,
      wardrobeState:    s.wardrobeState,
      anatomyDepth:     s.anatomyDepth,
      vfxState:         s.vfxState,
      gpuTier:          s.gpuTier,
      splitDividerX:    s.splitDividerX,
      autoRotate:       s.autoRotate,
      ambitionPath:     s.ambitionPath,
    }))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UI PANELS — subscribe to only what they need
// ─────────────────────────────────────────────────────────────────────────────

/** Metric slider panel — only re-renders when current metrics change */
export function useMetricSliders() {
  return use3DStore(
    useShallow((s) => ({
      metrics:          s.cloneA.metrics,
      goalMetrics:      s.cloneB.metrics,
      setCurrentMetric: s.setCurrentMetric,
      setGoalMetric:    s.setGoalMetric,
      getDeltas:        s.getDeltas,
    }))
  );
}

/** Wardrobe picker */
export function useWardrobe() {
  return use3DStore(
    useShallow((s) => ({
      wardrobeState: s.wardrobeState,
      setWardrobe:   s.setWardrobe,
    }))
  );
}

/** Camera preset pill buttons */
export function useCameraControls() {
  return use3DStore(
    useShallow((s) => ({
      cameraPreset:   s.cameraPreset,
      setCameraPreset: s.setCameraPreset,
      autoRotate:     s.autoRotate,
      setAutoRotate:  s.setAutoRotate,
    }))
  );
}

/** VFX toggle panel */
export function useVfxControls() {
  return use3DStore(
    useShallow((s) => ({
      vfxState: s.vfxState,
      setVfx:   s.setVfx,
    }))
  );
}

/** Anatomy depth slider */
export function useAnatomyDepth() {
  return use3DStore(
    useShallow((s) => ({
      anatomyDepth:    s.anatomyDepth,
      setAnatomyDepth: s.setAnatomyDepth,
    }))
  );
}

/** View mode switcher */
export function useViewMode() {
  return use3DStore(
    useShallow((s) => ({
      viewMode:    s.viewMode,
      setViewMode: s.setViewMode,
    }))
  );
}

/** Body part info panel */
export function useBodyPartFocus() {
  return use3DStore(
    useShallow((s) => ({
      focusedBodyPart:    s.focusedBodyPart,
      setFocusedBodyPart: s.setFocusedBodyPart,
    }))
  );
}

/** Timeline scrubber */
export function useTimeline() {
  return use3DStore(
    useShallow((s) => ({
      timelineSnaps:       s.timelineSnaps,
      timelineScrubIndex:  s.timelineScrubIndex,
      scrubTimeline:       s.scrubTimeline,
      addTimelineSnap:     s.addTimelineSnap,
      getScrubbedMorphState: s.getScrubbedMorphState,
    }))
  );
}

/** Ambition path / milestone display */
export function useAmbitionPath() {
  return use3DStore(
    useShallow((s) => ({
      ambitionPath:        s.ambitionPath,
      achieveMilestone:    s.achieveMilestone,
      setCurrentMonthIndex: s.setCurrentMonthIndex,
      getProgressPercent:  s.getProgressPercent,
    }))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SIDE-EFFECT SUBSCRIBERS (outside React — for canvas-level callbacks)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to morph weight changes for cloneA.
 * Call this inside your R3F useFrame loop or a useEffect in HumanoidViewer.
 * Returns unsubscribe fn.
 *
 * @example
 *   useEffect(() => {
 *     return subscribeToCloneAWeights((weights) => {
 *       skinnedMeshRef.current.morphTargetInfluences[0] = weights.overall_mass;
 *       // ... apply all 24 weights
 *     });
 *   }, []);
 */
export const subscribeToCloneAWeights = (callback) =>
  use3DStore.subscribe((s) => s.cloneA.weights, callback, { equalityFn: Object.is });

export const subscribeToCloneBWeights = (callback) =>
  use3DStore.subscribe((s) => s.cloneB.weights, callback, { equalityFn: Object.is });

export const subscribeToViewMode = (callback) =>
  use3DStore.subscribe((s) => s.viewMode, callback);

export const subscribeToVfxState = (callback) =>
  use3DStore.subscribe((s) => s.vfxState, callback, { equalityFn: Object.is });

// ─────────────────────────────────────────────────────────────────────────────
// 4. GPU TIER AUTO-DETECTION — call once on canvas mount
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects GPU tier via WebGL renderer info.
 * Call from HumanoidViewer.jsx on canvas creation.
 *
 * @param {THREE.WebGLRenderer} renderer
 */
export function detectAndSetGpuTier(renderer) {
  const { setGpuTier } = use3DStore.getState();

  try {
    const ext = renderer.getContext().getExtension("WEBGL_debug_renderer_info");
    if (!ext) return setGpuTier(GPU_TIERS.MED);

    const gpu = renderer
      .getContext()
      .getParameter(ext.UNMASKED_RENDERER_WEBGL)
      .toLowerCase();

    if (
      gpu.includes("rtx") ||
      gpu.includes("apple m") ||
      gpu.includes("radeon rx")
    ) {
      setGpuTier(GPU_TIERS.HIGH);
    } else if (gpu.includes("gtx") || gpu.includes("iris") || gpu.includes("amd")) {
      setGpuTier(GPU_TIERS.MED);
    } else {
      setGpuTier(GPU_TIERS.LOW);
    }
  } catch {
    setGpuTier(GPU_TIERS.MED);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. VASCULARITY AUTO-SYNC — attach as a subscriber in root component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Automatically toggles the vascularity VFX shader when bodyFat crosses 15%.
 * Mount this once at the app root.
 *
 * @example
 *   useEffect(() => useVascularitySync(), []);
 */
export const useVascularitySync = () =>
  use3DStore.subscribe(
    (s) => s.cloneA.metrics.bodyFat,
    () => use3DStore.getState().syncVascularityVfx()
  );

// ─────────────────────────────────────────────────────────────────────────────
// 6. METRIC → MORPH WEIGHT REFERENCE TABLE
// ─────────────────────────────────────────────────────────────────────────────

/*
  Blend Shape Name        Driven By                Mesh Region
  ──────────────────────────────────────────────────────────────
  overall_mass            weight                   Full body scale
  gut_volume              weight + bodyFat          Abdomen
  face_roundness          bodyFat                  Face
  chest_depth             chest                    Pectorals
  pec_thickness           chest                    Pectorals
  deltoid_width           shoulders                Deltoids
  trap_swell              shoulders                Trapezius
  waist_narrow            waist (inverted)         Waist
  oblique_def             waist (inverted)         Obliques
  bicep_peak              arms                     Biceps
  tricep_horse            arms                     Triceps
  forearm_girth           forearm                  Forearm
  glute_volume            glutes                   Glutes
  hip_width               hips                     Hip bones
  quad_sweep              thighs                   Quadriceps
  ham_thickness           thighs                   Hamstrings
  calf_diamond            calves                   Calves
  ankle_width             ankle                    Ankle
  neck_thickness          neck                     Neck
  trap_rise               neck                     Trap/neck junction
  d_length                d_size                   Private (anat. mode)
  d_girth                 d_girth                  Private (anat. mode)
  vascularity_intensity   bodyFat < 15%            Forearms/biceps shader
  fitzpatrick_index       skinTone string           Skin material uniform
*/
