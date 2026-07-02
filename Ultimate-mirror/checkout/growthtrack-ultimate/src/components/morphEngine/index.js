/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * index.js — Barrel export + full wiring guide
 *
 * LAYER 3 FILE MANIFEST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  useModelLoader.js       GLB + Draco loader, morph target name map,
 *                          dev fallback capsule mesh.
 *
 *  MorphInterpolator.js    Per-frame cubic-bezier(0.16,1,0.3,1) interpolator.
 *                          MorphInterpolator class + useMorphInterpolator hook.
 *
 *  PostureRig.jsx          Bone-level posture corrections via skeleton rotation.
 *                          Head tilt, pelvic tilt, shoulder rounding.
 *
 *  HumanoidClone.jsx       Single rendered clone. Composes model loader,
 *                          interpolator, posture rig, and skin material.
 *                          Accepts: cloneKey, position, opacity, renderMode,
 *                          snapWeights, visible, showAura.
 *
 *  CloneEngine.jsx         Orchestrator. Reads viewMode from store and
 *                          renders the correct combination of clones across
 *                          all 6 view modes (SOLO/DUAL/GHOST/SPLIT/DELTA/TIMELINE).
 *
 *  SplitStencilPass.jsx    True stencil-buffer split for SPLIT mode.
 *                          Replaces the naive two-clone approach.
 *
 *  BodyPartInteraction.jsx  Invisible hit zones for click-to-focus.
 *                          Reads BODY_PART_REGIONS map, fires store actions.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTEGRATION GUIDE — How Layer 3 plugs into Layer 2 (HumanoidViewer.jsx)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * In HumanoidViewer.jsx, the CanvasScene function currently has a placeholder:
 *
 *   {* 3D Model goes here (Layer 3 output) *}
 *   <Suspense fallback={null}>
 *     {* <CloneEngine /> *}
 *   </Suspense>
 *
 * Replace it with:
 *
 *   import { CloneEngine, BodyPartInteraction } from "../morphEngine";
 *   import use3DStore, { VIEW_MODES }           from "../../store/use3DStore";
 *
 *   function CanvasScene({ lodConfig }) {
 *     const viewMode = use3DStore((s) => s.viewMode);
 *
 *     return (
 *       <>
 *         ...lights, floor, camera...
 *         <Suspense fallback={null}>
 *           <CloneEngine />
 *
 *           // Body part hit zones — only in SOLO/DUAL (not GHOST/DELTA)
 *           {(viewMode === VIEW_MODES.SOLO || viewMode === VIEW_MODES.DUAL) && (
 *             <BodyPartInteraction clonePosition={[0, 0, 0]} />
 *           )}
 *         </Suspense>
 *         ...post-processing...
 *       </>
 *     );
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTEGRATION GUIDE — SplitStencilPass in CloneEngine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CloneEngine.jsx SPLIT case currently uses a naive two-clone approach.
 * To upgrade it to true stencil masking, update the SPLIT case:
 *
 *   import SplitStencilScene from "./SplitStencilPass";
 *
 *   case VIEW_MODES.SPLIT:
 *     return <SplitStencilScene dividerX={splitDividerX} />;
 *
 * Also hook up the drag interaction for the divider in your UI layer:
 *
 *   // In your React UI (outside Canvas):
 *   const { splitDividerX, setSplitDividerX } = use3DStore(
 *     useShallow((s) => ({ splitDividerX: s.splitDividerX, setSplitDividerX: s.setSplitDividerX }))
 *   );
 *
 *   const handleDrag = (e) => {
 *     const x = e.clientX / window.innerWidth; // 0–1
 *     setSplitDividerX(x);
 *   };
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTEGRATION GUIDE — Body Part Focus → Camera Rig
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CameraRig.jsx (Layer 2) needs one addition to respond to focusedBodyPart:
 *
 *   import { BODY_PART_MAP } from "../morphEngine/BodyPartInteraction";
 *
 *   // Inside CameraRig component, add this effect:
 *   const focusedBodyPart = use3DStore((s) => s.focusedBodyPart);
 *
 *   useEffect(() => {
 *     if (!focusedBodyPart) return;
 *     const region = BODY_PART_MAP[focusedBodyPart];
 *     if (!region?.cameraHint) return;
 *
 *     const { azimuth, elevation, distance } = region.cameraHint;
 *     const spherical = new THREE.Spherical(
 *       distance,
 *       THREE.MathUtils.degToRad(90 - elevation),
 *       THREE.MathUtils.degToRad(azimuth)
 *     );
 *     targetSpherical.current   = spherical;
 *     isAnimatingPreset.current = true;
 *   }, [focusedBodyPart]);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTEGRATION GUIDE — GLB Asset Requirements
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The GLB file at /public/assets/models/humanoid-base.glb must have:
 *
 *   1. A SkinnedMesh named "Body" (or containing "body" case-insensitive)
 *
 *   2. Exactly 24 morph targets with these exact names (see MORPH_TARGET_NAMES):
 *        overall_mass, gut_volume, face_roundness, chest_depth, pec_thickness,
 *        deltoid_width, trap_swell, waist_narrow, oblique_def, bicep_peak,
 *        tricep_horse, forearm_girth, glute_volume, hip_width, quad_sweep,
 *        ham_thickness, calf_diamond, ankle_width, neck_thickness, trap_rise,
 *        d_length, d_girth, vascularity_intensity, fitzpatrick_index
 *
 *   3. A Mixamo/ReadyPlayerMe compatible skeleton with bones:
 *        Head, Neck, Hips, Spine, Spine1, Spine2,
 *        LeftShoulder, RightShoulder
 *        (or their mixamorigXxx prefixed variants)
 *
 *   4. Draco compression (use gltfpack or Blender's GLTF exporter with Draco)
 *      Install Draco loader: `npm install draco3d`
 *      Configure drei's DRACOLoader path: /draco/gltf/
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTEGRATION GUIDE — App Root Setup
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * In your app root (App.jsx or _app.jsx):
 *
 *   import { preloadHumanoidModel }  from "./morphEngine/useModelLoader";
 *   import { useVascularitySync }    from "./store/use3DStore.usage";
 *   import { useEffect }             from "react";
 *
 *   // Start loading GLB immediately on app boot
 *   preloadHumanoidModel();
 *
 *   export default function App() {
 *     // Vascularity auto-sync subscriber
 *     useEffect(() => useVascularitySync(), []);
 *
 *     return <HumanoidViewer />;
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DATA FLOW SUMMARY (Layers 1–3 combined)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  UI Slider (React)
 *    │
 *    │  setCurrentMetric("chest", 104)
 *    ▼
 *  use3DStore (Layer 1)
 *    │  computeMorphWeights() → { chest_depth: 0.87, pec_thickness: 0.74, ... }
 *    │  cloneA.weights updated
 *    ▼
 *  MorphInterpolator (Layer 3)
 *    │  setTargets(weights) → animates toward new values
 *    │  cubic-bezier(0.16,1,0.3,1) easing
 *    ▼
 *  useFrame tick (60fps)
 *    │  interpolator.tick(delta) → current[] advances toward target[]
 *    │  interpolator.applyToMesh(skinnedMesh, morphIndexMap)
 *    ▼
 *  SkinnedMesh.morphTargetInfluences[idx] = weight
 *    │
 *    ▼
 *  Three.js GPU skinning pass → deformed geometry
 *    │
 *    ▼
 *  Layer 2 Render Pipeline → Stage lights → PostProcessing → Screen
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Barrel exports ──────────────────────────────────────────────────────────

export { default as CloneEngine }          from "./CloneEngine";
export { default as HumanoidClone }        from "./HumanoidClone";
export { default as PostureRig }           from "./PostureRig";
export { default as SplitStencilScene }    from "./SplitStencilPass";
export { default as BodyPartInteraction }  from "./BodyPartInteraction";

export {
  useModelLoader,
  preloadHumanoidModel,
  buildMorphIndexMap,
  MODEL_PATH,
} from "./useModelLoader";

export {
  MORPH_TARGET_NAMES,
} from "./constants";

export {
  MorphInterpolator,
  useMorphInterpolator,
} from "./MorphInterpolator";

export {
  BODY_PART_REGIONS,
  BODY_PART_MAP,
} from "./BodyPartInteraction";

export {
  applyStencilRead,
} from "./SplitStencilPass";
