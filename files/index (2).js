/**
 * GrowthTrack Ultimate — Layer 7: Ambition Path Engine
 * index.js — Barrel export + Master system wiring guide
 *
 * LAYER 7 FILE MANIFEST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  AmbitionPathFloor.jsx   Golden path spine from origin → destination.
 *                          Animated flow shader, month markers (instanced),
 *                          edge rails, destination glow disc.
 *                          Exports PATH_LENGTH constant.
 *
 *  MilestoneBeacons.jsx    Per-milestone beacon columns. Unachieved=cyan,
 *                          next-target=amber (fast pulse + bob),
 *                          achieved=gold (permanent glow + burst).
 *                          One-shot AchievementBurst ring on achieve.
 *
 *  ParticleEngine.jsx      3 systems: PathDust (800 gold motes, path-density
 *                          weighted), AuraOrbit (120 cyan particles around
 *                          current clone), MilestoneBurstPool (300-particle
 *                          pre-allocated explosion pool).
 *                          Exports triggerMilestoneBurst(position).
 *
 *  GreekGodClone.jsx       Goal clone at [0,0,-PATH_LENGTH]. Full gold aura,
 *                          vertical bob, destination beam, ground halo,
 *                          floating stats badge with deadline countdown.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTEGRATION: HumanoidViewer.jsx — CanvasScene final form
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Replace the CanvasScene function in HumanoidViewer.jsx with:
 *
 *   import { CloneEngine }            from "../morphEngine";
 *   import { BodyPartInteraction }    from "../morphEngine/BodyPartInteraction";
 *   import { TimelineTrails }         from "../comparison/TimelineScrubber";
 *   import AmbitionPathFloor         from "../ambitionPath/AmbitionPathFloor";
 *   import MilestoneBeacons          from "../ambitionPath/MilestoneBeacons";
 *   import ParticleEngine            from "../ambitionPath/ParticleEngine";
 *   import GreekGodClone             from "../ambitionPath/GreekGodClone";
 *   import use3DStore, { VIEW_MODES } from "../store/use3DStore";
 *
 *   function CanvasScene({ lodConfig }) {
 *     const viewMode = use3DStore((s) => s.viewMode);
 *
 *     return (
 *       <>
 *         <AdaptiveDpr pixelated />
 *         <AdaptiveEvents />
 *
 *         <Suspense fallback={null}><SceneEnvironment /></Suspense>
 *         <StudioLighting lodConfig={lodConfig} />
 *         <Suspense fallback={null}><ChamberFloor /></Suspense>
 *         <CameraRig />
 *
 *         {/* ── Layer 7: Ambition Path ── *\/}
 *         <AmbitionPathFloor />
 *         <MilestoneBeacons />
 *         <ParticleEngine />
 *
 *         {/* ── Layer 7: Greek God at destination ── *\/}
 *         <Suspense fallback={null}>
 *           <GreekGodClone />
 *         </Suspense>
 *
 *         {/* ── Layer 3: Current/Goal clone(s) ── *\/}
 *         <Suspense fallback={null}>
 *           <CloneEngine />
 *           {(viewMode === VIEW_MODES.SOLO || viewMode === VIEW_MODES.DUAL) && (
 *             <BodyPartInteraction clonePosition={[0, 0, 0]} />
 *           )}
 *           {viewMode === VIEW_MODES.TIMELINE && <TimelineTrails />}
 *         </Suspense>
 *
 *         {/* ── Layer 4: Post-processing ── *\/}
 *         {lodConfig.postFx !== "NONE" && (
 *           <PostProcessingStack mode={lodConfig.postFx} />
 *         )}
 *
 *         {process.env.NODE_ENV === "development" && <Stats />}
 *         <Preload all />
 *       </>
 *     );
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTEGRATION: Full page layout (App.jsx / viewer page)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   import { preloadHumanoidModel }  from "./morphEngine/useModelLoader";
 *   import { useVascularitySync }    from "./store/use3DStore.usage";
 *   import { ModeTransitionProvider, TransitionOverlay, ModeLabelFlash }
 *                                    from "./comparison/ModeTransitionEngine";
 *   import { LensFlareOverlay }      from "./comparison/ExportSystem";
 *   import BodyPartInfoPanel         from "./comparison/BodyPartInfoPanel";
 *   import TimelineScrubber          from "./comparison/TimelineScrubber";
 *   import HumanoidViewer            from "./render/HumanoidViewer";
 *   import use3DStore, { VIEW_MODES } from "./store/use3DStore";
 *
 *   // Boot: preload model + start vascularity subscriber
 *   preloadHumanoidModel();
 *
 *   export default function GrowthTrackPage() {
 *     useEffect(() => useVascularitySync(), []);
 *     const viewMode = use3DStore((s) => s.viewMode);
 *
 *     return (
 *       <ModeTransitionProvider>
 *         <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
 *
 *           {/* 3D Canvas *\/}
 *           <HumanoidViewer style={{ width: "100%", height: "100%" }} />
 *
 *           {/* Transition VFX *\/}
 *           <TransitionOverlay />
 *           <ModeLabelFlash />
 *           <LensFlareOverlay />
 *
 *           {/* Panels *\/}
 *           <BodyPartInfoPanel />
 *           {viewMode === VIEW_MODES.TIMELINE && <TimelineScrubber />}
 *
 *           {/* Your UI controls: mode switcher, sliders, wardrobe, export *\/}
 *           <YourControlsUI />
 *
 *         </div>
 *       </ModeTransitionProvider>
 *     );
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FILE STRUCTURE — complete project layout
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   src/
 *   ├── store/
 *   │   ├── use3DStore.js               Layer 1: Zustand store
 *   │   └── use3DStore.usage.js         Layer 1: hooks + subscribers
 *   │
 *   ├── render/
 *   │   ├── HumanoidViewer.jsx          Layer 2: R3F Canvas root
 *   │   ├── StudioLighting.jsx          Layer 2: 5-light rig
 *   │   ├── ChamberFloor.jsx            Layer 2: reflective floor
 *   │   ├── SceneEnvironment.jsx        Layer 2: HDRI
 *   │   ├── CameraRig.jsx               Layer 2: orbit + presets + focus
 *   │   └── PostProcessingStack.jsx     Layer 2+4: EffectComposer
 *   │
 *   ├── morphEngine/
 *   │   ├── useModelLoader.js           Layer 3: GLB + Draco loader
 *   │   ├── MorphInterpolator.js        Layer 3: cubic-bezier interpolator
 *   │   ├── PostureRig.jsx              Layer 3: bone rotations
 *   │   ├── HumanoidClone.jsx           Layer 3: single clone component
 *   │   ├── CloneEngine.jsx             Layer 3: 6-mode orchestrator
 *   │   ├── SplitStencilPass.jsx        Layer 3: stencil split
 *   │   ├── BodyPartInteraction.jsx     Layer 3: hit zones
 *   │   └── index.js                   Layer 3: barrel export
 *   │
 *   ├── vfx/
 *   │   ├── SkinShader.js              Layer 4: SSS skin
 *   │   ├── VascularityShader.js       Layer 4: Worley vein network
 *   │   ├── DeltaHeatmapShader.js      Layer 4: growth/loss regions
 *   │   ├── AuraShader.js              Layer 4: 3-layer god-ray aura
 *   │   ├── WardrobeShader.js          Layer 4: PBR cloth
 *   │   └── index.js                  Layer 4: barrel export
 *   │
 *   ├── comparison/
 *   │   ├── ComparisonHUD.jsx          Layer 6: floating delta cards
 *   │   ├── ModeTransitionEngine.jsx   Layer 6: cross-dissolve + label flash
 *   │   ├── TimelineScrubber.jsx       Layer 6: scrubber + auto-play
 *   │   ├── BodyPartInfoPanel.jsx      Layer 6: slide-in info panel
 *   │   ├── ExportSystem.js            Layer 6: PNG/card/WebM export
 *   │   └── index.js                  Layer 6: barrel export
 *   │
 *   ├── ambitionPath/
 *   │   ├── AmbitionPathFloor.jsx      Layer 7: golden road
 *   │   ├── MilestoneBeacons.jsx       Layer 7: beacon columns
 *   │   ├── ParticleEngine.jsx         Layer 7: 3 particle systems
 *   │   ├── GreekGodClone.jsx          Layer 7: destination figure
 *   │   └── index.js                  Layer 7: barrel export (this file)
 *   │
 *   └── assets/
 *       ├── models/humanoid-base.glb   Draco-compressed base mesh
 *       └── hdri/studio-softbox.hdr    Custom studio HDRI
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPLETE SYSTEM DATA FLOW — all 7 layers end to end
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  USER ACTION (slider / click / mode switch)
 *    │
 *    ▼  LAYER 1 — use3DStore
 *       setCurrentMetric / setViewMode / achieveMilestone / scrubTimeline
 *       computeMorphWeights() → 24 normalised blend-shape weights
 *       getDeltas() → per-measurement goal difference map
 *       getProgressPercent() → 0–100 journey completion
 *    │
 *    ▼  LAYER 3 — MorphInterpolator
 *       setTargets(weights) → per-weight cubic-bezier(0.16,1,0.3,1) animation
 *       PostureRig → bone Euler rotations (head, hips, shoulders)
 *       CloneEngine → routes to correct 1/2/ghost/split/delta/timeline layout
 *    │
 *    ▼  LAYER 3 — useFrame (60fps)
 *       interpolator.tick(delta) → advances all 24 weights
 *       applyToMesh() → writes morphTargetInfluences to SkinnedMesh
 *    │
 *    ▼  LAYER 4 — Shader uniforms (same useFrame)
 *       updateSkinUniforms: anatomyDepth, fitzpatrickIndex, vascularityIntensity
 *       updateDeltaUniforms: signs[8] + mags[8] per body region
 *       updateAuraUniforms: time + ambitionPath intensity
 *       WardrobeShader: coverage bands, weave type (on preset change)
 *    │
 *    ▼  THREE.js GPU pipeline
 *       Skinning pass: bone matrices × morph deltas → deformed geometry
 *       Fragment shading: SSS skin / vascularity / delta heatmap / cloth
 *    │
 *    ▼  LAYER 2 — Render pipeline
 *       StudioLighting: key[2.2] + fill[0.7] + rim[1.2] + sub[0.5] + ambient[0.08]
 *       ChamberFloor: MeshReflectorMaterial blur[400,200] mixStrength 0.6
 *       CameraRig: lerp-to-preset / free-orbit / body-part-focus / auto-rotate
 *       FogExp2: density 0.018 — naturally shrouds Greek God at 10 units
 *    │
 *    ▼  LAYER 4 — EffectComposer
 *       SSAO → Bloom(0.85) → ChromaticAberration(0.0005) → Vignette → ACES → Glitch(80ms)
 *    │
 *    ▼  LAYER 7 — Ambition Path (concurrent render)
 *       AmbitionPathFloor: animated gold flow + progress fill + month markers
 *       MilestoneBeacons: per-milestone columns + burst on achieve
 *       ParticleEngine: 1220 total particles (dust + orbit + burst pool)
 *       GreekGodClone: bob + god-ray aura + stats badge at [0,0,-10]
 *    │
 *    ▼  LAYER 6 — HTML overlay layer
 *       ComparisonHUD: floating delta cards (DUAL mode)
 *       TransitionOverlay: cross-dissolve on mode switch
 *       ModeLabelFlash: cinematic mode name flash (900ms)
 *       BodyPartInfoPanel: slide-in from right on click
 *       TimelineScrubber: amber scrubber bar (TIMELINE mode)
 *    │
 *    ▼  SCREEN @ 60fps
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PERFORMANCE BUDGET (HIGH GPU tier target: stable 60fps)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Draw calls:         ~18–24 (2 clones × 3 material layers + path + particles)
 *  Shadow map:         1 pass × 4096 (key light only)
 *  Reflection:         1 pass × 1024 (MeshReflectorMaterial)
 *  Particle verts:     1220 point sprites (GPU-resident, zero JS alloc per frame)
 *  Morph targets:      24 per mesh × 2 clones = 48 active influences
 *  Post-processing:    6 passes (SSAO 16spp, Bloom mipmap, ChromAb, Vignette, ACES, Glitch)
 *  JS budget per frame:~0.4ms (interpolator tick + uniform writes, no allocations)
 *
 *  MED GPU fallback:   Bloom + Vignette only, 2048 shadow, no SSAO → ~35–40 draw calls at 60fps
 *  LOW GPU fallback:   No shadows, no post-FX, 0.75× DPR → stable 30fps on integrated GPU
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPENDENCY INSTALL COMMAND
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   npm install \
 *     @react-three/fiber@8 \
 *     @react-three/drei@9 \
 *     @react-three/postprocessing@2 \
 *     postprocessing@6 \
 *     three@0.165 \
 *     zustand@5 \
 *     draco3d
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Barrel exports ──────────────────────────────────────────────────────────

export { default as AmbitionPathFloor, PATH_LENGTH }  from "./AmbitionPathFloor";
export { default as MilestoneBeacons }                from "./MilestoneBeacons";
export {
  default as ParticleEngine,
  triggerMilestoneBurst,
}                                                      from "./ParticleEngine";
export { default as GreekGodClone }                   from "./GreekGodClone";
