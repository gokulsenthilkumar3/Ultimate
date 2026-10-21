/**
 * GrowthTrack Ultimate — Layer 6: Comparison & Clone Engine
 * index.js — Barrel export + full wiring guide
 *
 * LAYER 6 FILE MANIFEST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  ComparisonHUD.jsx        Floating 3D delta cards (inside Canvas via <Html>).
 *                           Progress ring, clone nameplates, per-measurement
 *                           gain/loss cards with staggered entry animation.
 *
 *  ModeTransitionEngine.jsx Cross-dissolve overlay + mode label flash on switch.
 *                           ModeTransitionProvider context, TransitionOverlay,
 *                           ModeLabelFlash, getCameraHintForMode().
 *
 *  TimelineScrubber.jsx     HTML scrubber bar + auto-play engine.
 *                           Milestone markers, snapshot ticks, draggable thumb.
 *                           TimelineTrails: ghost clones inside Canvas.
 *
 *  BodyPartInfoPanel.jsx    Slide-in right panel on body part click.
 *                           Delta bar, health status, issues, fixes, exercises.
 *                           Auto-adjusts anatomyDepth for clicked part.
 *
 *  ExportSystem.js          3 export types: PNG snapshot (watermarked),
 *                           1080×1080 comparison card (Canvas2D), WebM reel
 *                           (MediaRecorder). LensFlareOverlay VFX component.
 *                           useExportSystem() hook for UI buttons.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FULL PAGE LAYOUT — how all Layer 6 components mount together
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  <ModeTransitionProvider>
 *    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
 *
 *      {/* The 3D canvas ─────────────────────────────────────────────── *\/}
 *      <HumanoidViewer />
 *
 *      {/* Transition VFX (HTML layer) ──────────────────────────────── *\/}
 *      <TransitionOverlay />
 *      <ModeLabelFlash />
 *
 *      {/* Export lens flare ─────────────────────────────────────────── *\/}
 *      <LensFlareOverlay />
 *
 *      {/* Body part info panel (slides from right) ──────────────────── *\/}
 *      <BodyPartInfoPanel />
 *
 *      {/* Timeline scrubber (shown only in TIMELINE mode) ───────────── *\/}
 *      {viewMode === VIEW_MODES.TIMELINE && <TimelineScrubber />}
 *
 *      {/* Export toolbar ────────────────────────────────────────────── *\/}
 *      <ExportToolbar />
 *
 *    </div>
 *  </ModeTransitionProvider>
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INSIDE CANVAS — CloneEngine updates (add to CanvasScene in HumanoidViewer.jsx)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  import { ComparisonHUD }   from "../comparison";
 *  import { TimelineTrails }  from "../comparison/TimelineScrubber";
 *  import { VIEW_MODES }      from "../store/use3DStore";
 *  import use3DStore          from "../store/use3DStore";
 *
 *  // In CloneEngine DUAL case:
 *  case VIEW_MODES.DUAL:
 *    return (
 *      <>
 *        <HumanoidClone cloneKey="A" position={[-0.9,0,0]} ... />
 *        <HumanoidClone cloneKey="B" position={[ 0.9,0,0]} snapWeights ... />
 *        <ComparisonHUD cloneASeparation={0.9} />    // ← ADD THIS
 *        <BodyPartInteraction clonePosition={[-0.9,0,0]} />
 *      </>
 *    );
 *
 *  // In CloneEngine TIMELINE case:
 *  case VIEW_MODES.TIMELINE:
 *    return (
 *      <>
 *        <TimelineClone />
 *        <TimelineTrails />                          // ← ADD THIS
 *      </>
 *    );
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CAMERARIG EXTENSION — respond to mode transitions
 * Add this useEffect inside CameraRig.jsx:
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  import { getCameraHintForMode } from "../comparison/ModeTransitionEngine";
 *
 *  // Inside CameraRig component:
 *  useEffect(() => {
 *    return use3DStore.subscribe(
 *      (s) => s.viewMode,
 *      (newMode) => {
 *        const hint    = getCameraHintForMode(newMode);
 *        const spherical = new THREE.Spherical(
 *          hint.distance,
 *          THREE.MathUtils.degToRad(90 - hint.elevation),
 *          THREE.MathUtils.degToRad(hint.azimuth)
 *        );
 *        targetSpherical.current   = spherical;
 *        isAnimatingPreset.current = true;
 *      }
 *    );
 *  }, []);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXPORT TOOLBAR COMPONENT EXAMPLE
 * Drop this anywhere in your HTML layout.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  function ExportToolbar() {
 *    const { snapshot, comparisonCard, timelineReel, loading, reelProgress } =
 *      useExportSystem();
 *
 *    return (
 *      <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 8 }}>
 *        <button onClick={snapshot}       disabled={!!loading}>📸 Snapshot</button>
 *        <button onClick={comparisonCard} disabled={!!loading}>🃏 Card</button>
 *        <button onClick={timelineReel}   disabled={!!loading}>
 *          {loading === "reel" ? `⏺ ${reelProgress}%` : "🎬 Reel"}
 *        </button>
 *      </div>
 *    );
 *  }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAYERS 1–6 COMPLETE SYSTEM SUMMARY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Layer 1 — use3DStore.js
 *    Zustand store: cloneA/B metrics, morph weights, view mode, VFX state,
 *    timeline snaps, ambition path, camera presets, GPU tier.
 *
 *  Layer 2 — HumanoidViewer.jsx
 *    R3F Canvas: WebGL2, ACESFilmic, PCFSoft shadows, adaptive DPR.
 *    5-light studio rig, reflective floor, HDRI, camera rig, post-FX.
 *
 *  Layer 3 — CloneEngine + MorphInterpolator + PostureRig
 *    GLB loader, 24 morph targets, cubic-bezier(0.16,1,0.3,1) interpolation,
 *    6 view modes, stencil split, body part hit zones, posture bone rigs.
 *
 *  Layer 4 — SkinShader + VascularityShader + DeltaHeatmapShader + AuraShader + WardrobeShader
 *    SSS skin, Worley vein network, delta heatmap, god-ray aura (3 layers),
 *    PBR cloth with 4 weave types and coverage bands.
 *
 *  Layer 6 — ComparisonHUD + ModeTransitionEngine + TimelineScrubber
 *            + BodyPartInfoPanel + ExportSystem
 *    Floating delta cards, mode cross-dissolve, timeline auto-play,
 *    body part info panel with health context, 3 export formats.
 *
 *  Layer 7 — (next) AmbitionPathEngine
 *    Floor path visualization, milestone beacons + particles,
 *    Greek God target model, month counter, deadline countdown.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Barrel exports ──────────────────────────────────────────────────────────

export { default as ComparisonHUD }        from "./ComparisonHUD";

export {
  default as ModeTransitionEngine,
  ModeTransitionProvider,
  TransitionOverlay,
  ModeLabelFlash,
  useModeTransition,
  getCameraHintForMode,
  cloneTransitionOpacity,
  MODE_CONFIG,
}                                           from "./ModeTransitionEngine";

export {
  default as TimelineScrubber,
  TimelineTrails,
  useTimelinePlayback,
}                                           from "./TimelineScrubber";

export { default as BodyPartInfoPanel }    from "./BodyPartInfoPanel";

export {
  exportQuickSnapshot,
  exportComparisonCard,
  exportTimelineReel,
  LensFlareOverlay,
  triggerLensFlareFlash,
  useExportSystem,
}                                           from "./ExportSystem";
