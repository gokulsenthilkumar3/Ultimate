/**
 * GrowthTrack Ultimate — Layer 4: VFX / Shaders
 * index.js — Barrel export + full wiring guide
 *
 * LAYER 4 FILE MANIFEST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  SkinShader.js           Custom SSS skin material. Fitzpatrick I–VI,
 *                          anatomy depth fade (skin→muscle→skeleton→organs),
 *                          dual-lobe Beckmann specular, procedural pore noise.
 *
 *  VascularityShader.js    Worley-noise vein network. Multi-octave (major
 *                          veins + branches + capillaries), anatomical mask,
 *                          heartbeat pulse at 72bpm. Auto-triggers at BF<15%.
 *
 *  DeltaHeatmapShader.js   DELTA view mode. 8 body regions with green/red
 *                          glow driven by per-measurement goal deltas.
 *                          Pulsing scanline sci-fi aesthetic.
 *
 *  AuraShader.js           3-layer goal clone aura: rim fresnel (BackSide
 *                          inflated mesh), instanced god-ray shafts rising
 *                          from floor, ground corona disc. Breathing pulse.
 *
 *  WardrobeShader.js       PBR cloth for 7 wardrobe presets. Oren-Nayar
 *                          diffuse + Ashikhmin sheen. 4 weave types (smooth,
 *                          knit, woven, jersey). Coverage bands with edge feather.
 *
 *  PostProcessingStack.jsx Full EffectComposer pipeline (now complete):
 *                          SSAO → Bloom → ChromaticAberration → Vignette
 *                          → ToneMapping → Glitch. Lives in Layer 2 file,
 *                          driven by Layer 4 VFX state from store.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTEGRATION: HumanoidClone.jsx PATCH
 * Replace the placeholder material factories in Layer 3 with Layer 4 shaders.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. IMPORTS TO ADD at top of HumanoidClone.jsx:
 *
 *   import { createSkinMaterial, updateSkinUniforms }         from "../vfx/SkinShader";
 *   import { createVascularityMaterial, updateVascularityUniforms }
 *                                                              from "../vfx/VascularityShader";
 *   import { createDeltaMaterial, updateDeltaUniforms }       from "../vfx/DeltaHeatmapShader";
 *   import { createRimAuraMaterial, createGodRayMesh,
 *             createGroundCorona, updateAuraUniforms }         from "../vfx/AuraShader";
 *   import { createClothMaterial, switchWardrobePreset,
 *             isClothPreset }                                  from "../vfx/WardrobeShader";
 *
 * 2. STORE SLICES TO ADD inside HumanoidClone's use3DStore selector:
 *
 *   const { weights, metrics, posture, anatomyDepth, vfxState, wardrobeState } =
 *     use3DStore(useShallow((s) => {
 *       const clone = cloneKey === "B" ? s.cloneB : s.cloneA;
 *       return {
 *         weights:       clone.weights,
 *         metrics:       clone.metrics,
 *         posture:       clone.posture,
 *         anatomyDepth:  s.anatomyDepth,
 *         vfxState:      s.vfxState,
 *         wardrobeState: s.wardrobeState,
 *       };
 *     }));
 *
 * 3. MATERIAL SELECTION — replace the existing useMemo:
 *
 *   const { skinMat, clothMat, deltaMat, vascMat, rimAuraMat } = useMemo(() => {
 *     const fi = ["I","II","III","IV","V","VI"].indexOf(metrics.skinTone);
 *     return {
 *       skinMat:    createSkinMaterial(fi),
 *       clothMat:   isClothPreset(wardrobeState) ? createClothMaterial(wardrobeState) : null,
 *       deltaMat:   renderMode === "delta" ? createDeltaMaterial() : null,
 *       vascMat:    createVascularityMaterial(),
 *       rimAuraMat: showAura ? createRimAuraMaterial() : null,
 *     };
 *   }, [metrics.skinTone, wardrobeState, renderMode, showAura]);
 *
 *   // Refs for imperative objects
 *   const godRaysRef   = useRef(createGodRayMesh());
 *   const coronaRef    = useRef(createGroundCorona());
 *
 * 4. WARDROBE SWITCH — sync cloth preset when wardrobeState changes:
 *
 *   useEffect(() => {
 *     if (clothMat) switchWardrobePreset(clothMat, wardrobeState);
 *   }, [clothMat, wardrobeState]);
 *
 * 5. useFrame PATCH — replace the existing useFrame with:
 *
 *   useFrame(({ clock }, delta) => {
 *     if (!meshRef.current || !bodyMesh) return;
 *     const time = clock.elapsedTime;
 *     const fi   = ["I","II","III","IV","V","VI"].indexOf(metrics.skinTone);
 *
 *     // Advance morph interpolator
 *     interpolator.tick(delta);
 *     interpolator.applyToMesh(meshRef.current, morphIndexMap);
 *
 *     // Update skin uniforms
 *     updateSkinUniforms(skinMat, {
 *       fitzpatrickIndex:     fi,
 *       anatomyDepth,
 *       vascularityIntensity: vfxState.vascularity
 *                               ? interpolator.getWeight("vascularity_intensity")
 *                               : 0,
 *       time,
 *     });
 *
 *     // Update vascularity overlay
 *     if (vascMat) {
 *       updateVascularityUniforms(vascMat, {
 *         intensity: vfxState.vascularity
 *                      ? interpolator.getWeight("vascularity_intensity")
 *                      : 0,
 *         time,
 *       });
 *       // Also apply morph weights to the vascular mesh if separate geometry
 *       if (vascMeshRef.current) {
 *         interpolator.applyToMesh(vascMeshRef.current, morphIndexMap);
 *       }
 *     }
 *
 *     // Update delta shader
 *     if (deltaMat && renderMode === "delta") {
 *       const deltas = use3DStore.getState().getDeltas();
 *       updateDeltaUniforms(deltaMat, { deltas, time });
 *     }
 *
 *     // Update aura (goal clone only)
 *     if (showAura) {
 *       const progress = use3DStore.getState().getProgressPercent() / 100;
 *       updateAuraUniforms(
 *         { rimMat: rimAuraMat, godRays: godRaysRef.current, corona: coronaRef.current },
 *         { time, intensity: 0.5 + progress * 0.5 }
 *       );
 *     }
 *   });
 *
 * 6. JSX PATCH — update the returned group:
 *
 *   return (
 *     <group ref={groupRef} position={position} name={`clone-${cloneKey}`}>
 *
 *       {/* Primary body — skin (always rendered in anatomical coverage areas) *\/}
 *       <skinnedMesh ref={meshRef}
 *         geometry={bodyMesh.geometry}
 *         material={renderMode === "delta" ? deltaMat : skinMat}
 *         skeleton={skeleton}
 *         castShadow={renderMode === "normal"}
 *       />
 *
 *       {/* Cloth layer — rendered on top of skin in covered regions *\/}
 *       {clothMat && renderMode === "normal" && (
 *         <skinnedMesh ref={clothMeshRef}
 *           geometry={bodyMesh.geometry}
 *           material={clothMat}
 *           skeleton={skeleton}
 *           castShadow
 *           renderOrder={1}
 *         />
 *       )}
 *
 *       {/* Vascularity overlay mesh *\/}
 *       {vascMat && vfxState.vascularity && (
 *         <skinnedMesh ref={vascMeshRef}
 *           geometry={bodyMesh.geometry}
 *           material={vascMat}
 *           skeleton={skeleton}
 *           renderOrder={2}
 *         />
 *       )}
 *
 *       {/* Aura rim (BackSide inflated, uses rimAuraMat) *\/}
 *       {showAura && rimAuraMat && (
 *         <skinnedMesh
 *           geometry={bodyMesh.geometry}
 *           material={rimAuraMat}
 *           skeleton={skeleton}
 *           morphTargetDictionary={bodyMesh.morphTargetDictionary}
 *           morphTargetInfluences={meshRef.current?.morphTargetInfluences}
 *           scale={1.022}
 *           renderOrder={3}
 *         />
 *       )}
 *
 *       {/* God rays + ground corona (imperative Three.js objects) *\/}
 *       {showAura && (
 *         <>
 *           <primitive object={godRaysRef.current} />
 *           <primitive object={coronaRef.current} />
 *         </>
 *       )}
 *
 *       <PostureRig skeleton={skeleton} posture={posture} />
 *     </group>
 *   );
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SHADER UNIFORM DEPENDENCY MAP
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Shader                Source of truth              Update frequency
 *  ────────────────────────────────────────────────────────────────────────────
 *  SkinShader            store: anatomyDepth,          useFrame (every frame)
 *                        cloneX.metrics.skinTone,
 *                        vfxState.vascularity,
 *                        cloneX.weights.vascularity_intensity
 *
 *  VascularityShader     cloneX.weights               useFrame (every frame)
 *                        .vascularity_intensity,
 *                        vfxState.vascularity
 *
 *  DeltaHeatmapShader    store.getDeltas()             useFrame in DELTA mode
 *
 *  AuraShader            store.getProgressPercent()    useFrame (goal clone)
 *                        clock.elapsedTime
 *
 *  WardrobeShader        wardrobeState                 useEffect on preset change
 *
 *  PostProcessingStack   vfxState (bloom, vignette),   useEffect on vfxState change
 *                        viewMode (glitch trigger)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FULL LAYERS 1–4 DATA FLOW (complete picture)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  User slides "Chest" slider to 108cm
 *    │
 *    ▼  use3DStore.setCurrentMetric("chest", 108)
 *    │  → computeMorphWeights() recalculates all 24 weights
 *    │  → cloneA.weights.chest_depth = 0.87
 *    │
 *    ▼  MorphInterpolator.setTargets(weights)
 *    │  → _progress["chest_depth"] resets to 0 (starts new animation)
 *    │
 *    ▼  useFrame (every 16ms at 60fps)
 *    │  → interpolator.tick(delta) — cubic-bezier(0.16,1,0.3,1) easing
 *    │  → interpolator.applyToMesh() — writes to morphTargetInfluences
 *    │  → updateSkinUniforms() — anatomyDepth / vascularity / tone
 *    │  → updateVascularityUniforms() — intensity from weights
 *    │
 *    ▼  Three.js GPU pass
 *    │  → skinning: bone matrices × morph deltas → deformed geometry
 *    │  → SkinShader fragment: SSS + Beckmann specular + pore noise
 *    │  → VascularityShader fragment: Worley vein network (if active)
 *    │  → WardrobeShader fragment: cloth in coverage bands (if dressed)
 *    │
 *    ▼  Layer 2 Render Pipeline
 *    │  → StudioLighting: 5-light rig
 *    │  → MeshReflectorMaterial: floor reflection
 *    │  → EffectComposer: SSAO → Bloom → ChromAb → Vignette → ACES → Glitch
 *    │
 *    ▼  Screen output at 60fps
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Barrel exports ──────────────────────────────────────────────────────────

// SkinShader
export {
  createSkinMaterial,
  updateSkinUniforms,
  FITZPATRICK_TABLE,
  ANATOMY_COLORS,
} from "./SkinShader";

// VascularityShader
export {
  createVascularityMaterial,
  updateVascularityUniforms,
  VASCULARITY_GLSL,
} from "./VascularityShader";

// DeltaHeatmapShader
export {
  createDeltaMaterial,
  updateDeltaUniforms,
  computeDeltaUniforms,
  DELTA_REGIONS,
} from "./DeltaHeatmapShader";

// AuraShader
export {
  createRimAuraMaterial,
  createGodRayMesh,
  createGroundCorona,
  updateAuraUniforms,
} from "./AuraShader";

// WardrobeShader
export {
  createClothMaterial,
  switchWardrobePreset,
  isClothPreset,
  getExposedRegions,
  WARDROBE_CONFIGS,
} from "./WardrobeShader";
