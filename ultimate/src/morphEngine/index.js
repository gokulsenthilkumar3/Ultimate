/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * index.js — Barrel export + full wiring guide
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
  MORPH_TARGET_NAMES,
  MODEL_PATH,
} from "./useModelLoader";

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
