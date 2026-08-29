/**
 * GrowthTrack Ultimate — Layer 1: Data Binding Engine
 * use3DStore.js
 *
 * Zustand 5 store with subscribeWithSelector middleware.
 * The 3D canvas only re-renders when 3D-specific slices change.
 * React UI panels subscribe independently — zero cross-contamination.
 *
 * Install deps:
 *   npm install zustand@5
 */

import { create } from "zustand";
import { subscribeWithSelector, devtools } from "zustand/middleware";
import { constrainMorphWeights } from "../components/morphEngine/morphMath";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const VIEW_MODES = {
  SOLO: "SOLO",         // Single model, full viewport
  DUAL: "DUAL",         // YOU NOW (left) vs YOUR GOAL (right) — default
  GHOST: "GHOST",       // Both at same position; goal is translucent cyan ghost
  SPLIT: "SPLIT",       // Draggable vertical divider, left=current / right=goal
  DELTA: "DELTA",       // Single model with growth/loss regions color-coded
  TIMELINE: "TIMELINE", // Scrubable timeline — morph across logged snapshots
};

export const CAMERA_PRESETS = {
  FRONT:    { azimuth: 0,    elevation: 0,   label: "Front" },
  LEFT:     { azimuth: 90,   elevation: 0,   label: "Left" },
  BACK:     { azimuth: 180,  elevation: 0,   label: "Back" },
  RIGHT:    { azimuth: 270,  elevation: 0,   label: "Right" },
  OVERHEAD: { azimuth: 0,    elevation: 85,  label: "Top" },
  GROUND:   { azimuth: 0,    elevation: -30, label: "Worm-Eye" },
  CUSTOM:   { azimuth: null, elevation: null, label: "Custom" },
};

export const WARDROBE_PRESETS = {
  GYM:        "GYM",        // Compression shorts + tank top
  CASUAL:     "CASUAL",     // Joggers + hoodie
  FORMAL:     "FORMAL",     // Dress shirt + trousers
  SWIMWEAR:   "SWIMWEAR",   // Board shorts
  UNDERWEAR:  "UNDERWEAR",  // Boxer briefs only
  ANATOMICAL: "ANATOMICAL", // Clinically nude (measurements)
  BODY_COMP:  "BODY_COMP",  // Nude + heatmap/vascularity overlays
};

export const ANATOMY_LAYERS = {
  SKIN:     100, // fully opaque skin (default)
  MUSCLE:   60,  // skin fades, muscle visible
  SKELETON: 30,  // muscle fades, skeleton phosphor-glow
  ORGANS:   0,   // full X-ray, organs visible
};

export const VFX_DEFAULTS = {
  heatmap:    false, // body-comp fat/lean gradient overlay
  vascularity: false, // procedural vein shader (triggers auto at BF <15%)
  delta:      false, // growth/loss color-coded glow regions
  aura:       true,  // cyan-white rim aura on goal clone
};

export const GPU_TIERS = {
  HIGH: "HIGH", // RTX / M-Series — 4096 shadows, 50k poly, full post-FX
  MED:  "MED",  // GTX / Iris     — 2048 shadows, 25k poly, bloom+vignette
  LOW:  "LOW",  // Mobile / Intel — shadows off, 8k poly, no post-FX
};

export const CINEMATIC_PRESETS = Object.freeze({
  PORTRAIT: Object.freeze({
    preset: "PORTRAIT",
    sceneEnvironment: "studio",
    bloom: true,
    vignette: true,
    chromaticAberration: false,
    depthOfField: true,
    filmGrain: true,
    cameraMotion: true,
    exposure: 1.08,
  }),
  ANALYTIC: Object.freeze({
    preset: "ANALYTIC",
    sceneEnvironment: "studio",
    bloom: false,
    vignette: false,
    chromaticAberration: false,
    depthOfField: false,
    filmGrain: false,
    cameraMotion: false,
    exposure: 1.0,
  }),
  NEON: Object.freeze({
    preset: "NEON",
    sceneEnvironment: "night",
    bloom: true,
    vignette: true,
    chromaticAberration: true,
    depthOfField: true,
    filmGrain: true,
    cameraMotion: true,
    exposure: 1.16,
  }),
  SUNSET: Object.freeze({
    preset: "SUNSET",
    sceneEnvironment: "outdoor",
    bloom: true,
    vignette: true,
    chromaticAberration: false,
    depthOfField: true,
    filmGrain: true,
    cameraMotion: true,
    exposure: 1.12,
  }),
});

export const CINEMATIC_DEFAULTS = Object.freeze({ ...CINEMATIC_PRESETS.PORTRAIT });

const sanitizeCinematicState = (value = {}) => {
  const merged = { ...CINEMATIC_DEFAULTS, ...value };
  const preset = (Object.prototype.hasOwnProperty.call(CINEMATIC_PRESETS, merged.preset) || merged.preset === "CUSTOM")
    ? merged.preset
    : CINEMATIC_DEFAULTS.preset;
  const sceneEnvironment = ["studio", "outdoor", "night"].includes(merged.sceneEnvironment)
    ? merged.sceneEnvironment
    : CINEMATIC_DEFAULTS.sceneEnvironment;
  const exposure = Math.max(0.72, Math.min(1.35, Number(merged.exposure) || CINEMATIC_DEFAULTS.exposure));
  return {
    preset,
    sceneEnvironment,
    bloom: Boolean(merged.bloom),
    vignette: Boolean(merged.vignette),
    chromaticAberration: Boolean(merged.chromaticAberration),
    depthOfField: Boolean(merged.depthOfField),
    filmGrain: Boolean(merged.filmGrain),
    cameraMotion: Boolean(merged.cameraMotion),
    exposure,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES / SHAPE DOCUMENTATION (JSDoc for IDE autocomplete)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BodyMetrics
 * @property {number} weight       - kg (45–130)
 * @property {number} bodyFat      - % (5–40)
 * @property {number} chest        - cm (80–130)
 * @property {number} shoulders    - cm (90–140)
 * @property {number} waist        - cm (65–110)
 * @property {number} arms         - cm (28–55)
 * @property {number} forearm      - cm
  * @property {number} thighs       - cm (45–75)
  * @property {number} hips         - cm (80–115)
  * @property {number} glutes       - cm
  * @property {number} calves       - cm (30–50)
  * @property {number} neck         - cm (32–48)
 * @property {number} torsoLength   - cm
 * @property {number} upperArm      - cm
 * @property {number} lowerArm      - cm
 * @property {number} handLength    - cm
 * @property {number} legLength     - cm
 * @property {number} footLength    - cm
 * @property {number} headCirc      - cm
 * @property {number} brow_depth    - facial feature morph (0–1)
 * @property {number} nose_bridge_width - facial feature morph (0–1)
 * @property {number} nose_tip_size  - facial feature morph (0–1)
 * @property {number} ear_prominence - facial feature morph (0–1)
 * @property {number} jaw_width      - facial feature morph (0–1)
 * @property {number} chin_projection - facial feature morph (0–1)
 * @property {number} lip_fullness   - facial feature morph (0–1)
 * @property {number} eye_size       - facial feature morph (0–1)
  * @property {number} d_size       - inches (3–9)
  * @property {number} d_girth      - inches
 * @property {number} ankle        - cm
 * @property {string} skinTone     - Fitzpatrick scale: "I"|"II"|"III"|"IV"|"V"|"VI"
 * @property {string} eyeColor     - CSS color for the authored iris material
 * @property {string} hairColor    - CSS color for the authored hair material
 * @property {'bald'|'short'} hairStyle - available authored hairstyle state
 * @property {number} bodyHairDensity - procedural skin-detail intensity (0–1)
 */

/**
 * @typedef {Object} PostureMetrics
 * @property {number} headTiltAngle     - degrees forward head tilt
 * @property {number} pelvicTilt        - degrees anterior pelvic tilt
 * @property {number} shoulderRounding  - degrees shoulder forward rotation
 */

/**
 * @typedef {Object} TimelineSnapshot
 * @property {string}      id        - unique snapshot id
 * @property {string}      date      - ISO date string
 * @property {string}      label     - e.g. "Month 0", "Month 3"
 * @property {BodyMetrics} metrics   - measurements at this point in time
 * @property {string}      [note]    - optional user note
 */

/**
 * @typedef {Object} Milestone
 * @property {string} id
 * @property {string} label     - e.g. "Visible abs"
 * @property {string} month     - "Month 3"
 * @property {number} monthIndex
 * @property {BodyMetrics} [targetMetrics]
 * @property {boolean} achieved
 */

/**
 * @typedef {Object} AmbitionPath
 * @property {number}      currentMonthIndex - 0-based index into journey
 * @property {number}      targetMonthIndex  - total journey months
 * @property {string}      deadline          - ISO date of goal deadline
 * @property {Milestone[]} milestones
 */

/**
 * @typedef {Object} MorphState
 * @property {BodyMetrics}   metrics  - raw measurement values
 * @property {PostureMetrics} posture - posture offsets
 * @property {Object}        weights  - computed blend shape weights (0–1)
 */

// ─────────────────────────────────────────────────────────────────────────────
// MORPH WEIGHT CALCULATOR
// Converts raw measurements → normalised blend shape weights (0–1)
// ─────────────────────────────────────────────────────────────────────────────

const MORPH_RANGES = {
  weight:    { min: 45,  max: 130 },
  bodyFat:   { min: 5,   max: 40  },
  chest:     { min: 80,  max: 130 },
  shoulders: { min: 90,  max: 140 },
  waist:     { min: 65,  max: 110 },
  arms:      { min: 28,  max: 55  },
  forearm:   { min: 22,  max: 40  },
  thighs:    { min: 45,  max: 75  },
  hips:      { min: 80,  max: 115 },
  glutes:    { min: 80,  max: 120 },
  calves:    { min: 30,  max: 50  },
  neck:      { min: 32,  max: 48  },
  torsoLength:{ min: 44,  max: 58  },
  upperArm:  { min: 28,  max: 40  },
  lowerArm:  { min: 24,  max: 35  },
  handLength:{ min: 17,  max: 22  },
  legLength: { min: 82,  max: 98  },
  footLength:{ min: 24,  max: 31  },
  headCirc:  { min: 52,  max: 62  },
  brow_depth: { min: 0, max: 1 },
  nose_bridge_width: { min: 0, max: 1 },
  nose_tip_size: { min: 0, max: 1 },
  ear_prominence: { min: 0, max: 1 },
  jaw_width: { min: 0, max: 1 },
  chin_projection: { min: 0, max: 1 },
  lip_fullness: { min: 0, max: 1 },
  eye_size: { min: 0, max: 1 },
  d_size:    { min: 3,   max: 9   },
  d_girth:   { min: 3,   max: 7   },
  ankle:     { min: 18,  max: 28  },
};

/**
 * Maps a raw measurement value to a normalised 0–1 morph weight.
 * Clamps at boundaries.
 */
const normalise = (value, key) => {
  const range = MORPH_RANGES[key];
  const numericValue = Number(value);
  if (!range || !Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(1, (numericValue - range.min) / (range.max - range.min)));
};

/**
 * Computes the canonical body and shader channel weights from a BodyMetrics
 * object. Geometry channels map to authored/procedural morph targets; shader
 * channels are consumed by the material layer.
 *
 * @param {BodyMetrics} metrics
 * @returns {Object} blend shape weights
 */
export const computeMorphWeights = (metrics) => constrainMorphWeights({
  // MASS / FAT
  overall_mass:    normalise(metrics.weight,    "weight"),
  gut_volume:      Math.max(
                     normalise(metrics.weight,  "weight") * 0.6,
                     normalise(metrics.bodyFat, "bodyFat") * 0.4
                   ),
  face_roundness:  normalise(metrics.bodyFat,   "bodyFat") * 0.7,

  // CHEST / UPPER BODY
  chest_depth:     normalise(metrics.chest,     "chest"),
  pec_thickness:   normalise(metrics.chest,     "chest") * 0.85,

  // SHOULDERS
  deltoid_width:   normalise(metrics.shoulders, "shoulders"),
  trap_swell:      normalise(metrics.shoulders, "shoulders") * 0.6,

  // WAIST / CORE
  waist_narrow:    1 - normalise(metrics.waist, "waist"), // inverted: smaller waist = more narrow
  oblique_def:     1 - normalise(metrics.waist, "waist") * 0.7,

  // ARMS
  bicep_peak:      normalise(metrics.arms,      "arms"),
  tricep_horse:    normalise(metrics.arms,      "arms") * 0.9,
  forearm_girth:   normalise(metrics.forearm,   "forearm"),

  // HIPS / GLUTES
  glute_volume:    normalise(metrics.glutes,    "glutes"),
  hip_width:       normalise(metrics.hips,      "hips"),

  // THIGHS / LOWER
  quad_sweep:      normalise(metrics.thighs,    "thighs"),
  ham_thickness:   normalise(metrics.thighs,    "thighs") * 0.8,

  // CALVES
  calf_diamond:    normalise(metrics.calves,    "calves"),
  ankle_width:     normalise(metrics.ankle,     "ankle"),

  // NECK
  neck_thickness:  normalise(metrics.neck,      "neck"),
  trap_rise:       normalise(metrics.neck,      "neck") * 0.5,
  torso_length:    normalise(metrics.torsoLength ?? (metrics.height ? metrics.height * 0.28 : 50), "torsoLength"),
  shoulder_slope:   normalise(metrics.shoulders, "shoulders") * 0.5,
  clavicle_width:   normalise(metrics.shoulders, "shoulders") * 0.8,
  ribcage_depth:    normalise(metrics.chest,     "chest") * 0.75,
  pelvis_width:     normalise(metrics.hips,      "hips") * 0.85,
  neck_length:      normalise(metrics.neck,      "neck") * 0.45,
  upper_arm_length: normalise(metrics.upperArm ?? 34, "upperArm"),
  forearm_length:   normalise(metrics.lowerArm ?? 29, "lowerArm"),
  hand_length:      normalise(metrics.handLength ?? 19, "handLength"),
  leg_length:       normalise(metrics.legLength ?? (metrics.height ? metrics.height * 0.52 : 90), "legLength"),
  foot_length:      normalise(metrics.footLength ?? 27, "footLength"),
  head_circumference: normalise(metrics.headCirc ?? 57, "headCirc"),
  brow_depth:        normalise(metrics.brow_depth ?? 0.35, "brow_depth"),
  nose_bridge_width: normalise(metrics.nose_bridge_width ?? 0.32, "nose_bridge_width"),
  nose_tip_size:     normalise(metrics.nose_tip_size ?? 0.33, "nose_tip_size"),
  ear_prominence:    normalise(metrics.ear_prominence ?? 0.38, "ear_prominence"),
  jaw_width:         normalise(metrics.jaw_width ?? 0.36, "jaw_width"),
  chin_projection:   normalise(metrics.chin_projection ?? 0.30, "chin_projection"),
  lip_fullness:      normalise(metrics.lip_fullness ?? 0.42, "lip_fullness"),
  eye_size:          normalise(metrics.eye_size ?? 0.40, "eye_size"),
  cheekbone_width:   normalise(metrics.bodyFat,   "bodyFat") * 0.35 + normalise(metrics.shoulders, "shoulders") * 0.15,
  forehead_height:   normalise(metrics.headCirc ?? 57, "headCirc") * 0.25,
  temple_narrowing:  1 - normalise(metrics.headCirc ?? 57, "headCirc") * 0.15,
  nose_length:       normalise(metrics.bodyFat,   "bodyFat") * 0.18 + 0.15,
  jaw_angle:         normalise(metrics.bodyFat,   "bodyFat") * 0.2,
  shoulder_drop:     1 - normalise(metrics.shoulders, "shoulders") * 0.3,
  knee_spacing:     normalise(metrics.hips,      "hips") * 0.22,
  ankle_taper:      1 - normalise(metrics.ankle, "ankle") * 0.3,
  hand_splay:       normalise(metrics.handLength ?? 19, "handLength") * 0.25,
  foot_arch:        normalise(metrics.footLength ?? 27, "footLength") * 0.2,

  // PRIVATE (rendered in anatomical/underwear mode only)
  d_length:        normalise(metrics.d_length ?? metrics.d_size, "d_size"),
  d_girth:         normalise(metrics.d_girth,   "d_girth"),

  // VASCULARITY (auto-triggered when bodyFat < 15%)
  vascularity_intensity: metrics.bodyFat < 15
    ? Math.max(0, (15 - metrics.bodyFat) / 10)
    : 0,

  // SKIN TONE — passed to shader as Fitzpatrick index 0–5
  fitzpatrick_index: ["I","II","III","IV","V","VI"].indexOf(metrics.skinTone),
});

const buildMorphWeights = (metrics = {}, overrides = {}) => constrainMorphWeights({
  ...computeMorphWeights(metrics),
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty initial state: persisted profile metrics are hydrated by the viewer.
// ─────────────────────────────────────────────────────────────────────────────

/** Build a clone's render state from persisted metrics and posture. */
const buildMorphState = (metrics = {}, posture = {}, overrides = {}) => ({
  metrics,
  posture,
  weights: buildMorphWeights(metrics, overrides),
});

export const computeFitCameraZoom = (radius) => {
  const safeRadius = Math.max(Number(radius) || 0, 0.6);
  return Math.max(0.45, Math.min(1.8, 1.72 / safeRadius));
};

// ─────────────────────────────────────────────────────────────────────────────
// STORE DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

const use3DStore = create(
  devtools(
    subscribeWithSelector((set, get) => ({

      // ───────────────────────────────────────────────────────────────────────
      // 3D CORE STATE
      // ───────────────────────────────────────────────────────────────────────

      /** MorphState for the "YOU NOW" clone */
      cloneA: buildMorphState({}, {}),

      /** MorphState for the "YOUR GOAL" clone */
      cloneB: buildMorphState({}, {}),

      /** Optional hand-tuned shape channels layered over measured values. */
      morphOverrides: {
        current: {},
        goal: {},
      },

      /** Logged progress snapshots for TIMELINE mode */
      timelineSnaps: [],

      /** Index into timelineSnaps currently being scrubbed to (null = live) */
      timelineScrubIndex: null,

      /** Current viewport comparison mode */
      viewMode: VIEW_MODES.DUAL,

      /** Wardrobe / surface state */
      wardrobeState: WARDROBE_PRESETS.GYM,

      /** Camera preset name key */
      cameraPreset: "FRONT",

      /** Human-view framing multiplier; 1 = default fit */
      cameraZoom: 1,
      /** Actual model bounds from the loaded GLB / procedural fallback */
      modelFrame: null,
      /** Loader diagnostics for the active humanoid asset */
      modelDiagnostics: null,

      /** Runtime evidence consumed by the Phase 5 quality gate. */
      rendererQualityTelemetry: {
        status: 'initializing',
        contextLost: false,
        contextLossCount: 0,
        frames: 0,
        fps: 0,
        frameTimeP95: 0,
        accessibleName: true,
        reducedMotionSupported: true,
        visibilityPauseSupported: true,
        intersectionPauseSupported: true,
        lastUpdated: null,
      },

      /**
       * Anatomy depth: 100 = full skin, 0 = full X-ray skeleton.
       * Drives shader fade skin→muscle→skeleton→organs.
       */
      anatomyDepth: 100,

      /**
       * Sensitive authored anatomy is session-only and hidden by default.
       * This flag is deliberately not persisted with renderer preferences.
       */
      privateAnatomyVisible: false,

      /** Ambition path data */
      ambitionPath: {
        currentMonthIndex: 0,
        targetMonthIndex:  0,
        deadline:          null,
        milestones:        [],
      },

      /** Active post-processing / visual effects flags */
      vfxState: { ...VFX_DEFAULTS },

      /** Detected GPU tier — set on mount via capability detection */
      gpuTier: GPU_TIERS.HIGH,

      /** Shared, database-hydratable cinematic renderer configuration. */
      cinematicState: { ...CINEMATIC_DEFAULTS },

      /** Split-mode divider position (0–1, fraction of viewport width) */
      splitDividerX: 0.5,

      /** Currently clicked / focused body part (null = none) */
      focusedBodyPart: null,

      /** Auto-rotate the scene (pauses on hover) */
      autoRotate: true,

      /** Render mode: 'WEBGL' = 3D canvas | 'SPRITE' = 2D sprite viewer */
      renderMode: 'WEBGL',

      /** Stress/cortisol level 0–100 — drives face-flush bio-feedback on model */
      stressLevel: 0,

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — VIEW MODE
      // ───────────────────────────────────────────────────────────────────────

      setViewMode: (mode) => {
        if (!Object.values(VIEW_MODES).includes(mode)) {
          console.warn(`[use3DStore] Unknown viewMode: ${mode}`);
          return;
        }
        set({ viewMode: mode }, false, "setViewMode");
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — METRICS / MORPH
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Update a single metric on the CURRENT clone (cloneA).
       * Recomputes morph weights immediately.
       * @param {keyof BodyMetrics} key
       * @param {number} value
       */
      setCurrentMetric: (key, value) => {
        const prev = get().cloneA;
        const updatedMetrics = { ...prev.metrics, [key]: value };
        set(
          {
            cloneA: {
              ...prev,
              metrics: updatedMetrics,
              weights: buildMorphWeights(updatedMetrics, get().morphOverrides.current),
            },
          },
          false,
          `setCurrentMetric:${key}`
        );
      },

      /**
       * Update a single metric on the GOAL clone (cloneB).
       * @param {keyof BodyMetrics} key
       * @param {number} value
       */
      setGoalMetric: (key, value) => {
        const prev = get().cloneB;
        const updatedMetrics = { ...prev.metrics, [key]: value };
        set(
          {
            cloneB: {
              ...prev,
              metrics: updatedMetrics,
              weights: buildMorphWeights(updatedMetrics, get().morphOverrides.goal),
            },
          },
          false,
          `setGoalMetric:${key}`
        );
      },

      /**
       * Bulk-replace all current metrics at once (e.g. from API sync).
       * @param {BodyMetrics} metrics
       */
      setCurrentMetrics: (metrics) => {
        const prev = get().cloneA;
        set(
          {
            cloneA: {
              ...prev,
              metrics,
              weights: buildMorphWeights(metrics, get().morphOverrides.current),
            },
          },
          false,
          "setCurrentMetrics"
        );
      },

      /**
       * Bulk-replace all goal metrics.
       * @param {BodyMetrics} metrics
       */
      setGoalMetrics: (metrics) => {
        const prev = get().cloneB;
        set(
          {
            cloneB: {
              ...prev,
              metrics,
              weights: buildMorphWeights(metrics, get().morphOverrides.goal),
            },
          },
          false,
          "setGoalMetrics"
        );
      },

      /**
       * Apply a hand-tuned morph channel on top of measured data. These are
       * renderer controls, not measurements, so they never overwrite metrics.
       * @param {"current"|"goal"} target
       * @param {string} key
       * @param {number} value
       */
      setMorphOverride: (target, key, value) => {
        const cloneKey = target === "goal" ? "cloneB" : "cloneA";
        const overrideKey = target === "goal" ? "goal" : "current";
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return;
        set((state) => {
          const overrides = {
            ...state.morphOverrides[overrideKey],
            [key]: numericValue,
          };
          const clone = state[cloneKey];
          return {
            morphOverrides: { ...state.morphOverrides, [overrideKey]: overrides },
            [cloneKey]: {
              ...clone,
              weights: buildMorphWeights(clone.metrics, overrides),
            },
          };
        }, false, `setMorphOverride:${overrideKey}:${key}`);
      },

      setMorphOverrides: (overrides = {}) => {
        const current = overrides?.current && typeof overrides.current === "object" ? overrides.current : {};
        const goal = overrides?.goal && typeof overrides.goal === "object" ? overrides.goal : {};
        set((state) => ({
          morphOverrides: { current, goal },
          cloneA: { ...state.cloneA, weights: buildMorphWeights(state.cloneA.metrics, current) },
          cloneB: { ...state.cloneB, weights: buildMorphWeights(state.cloneB.metrics, goal) },
        }), false, "setMorphOverrides");
      },

      clearMorphOverrides: (target) => {
        const cloneKey = target === "goal" ? "cloneB" : "cloneA";
        const overrideKey = target === "goal" ? "goal" : "current";
        set((state) => ({
          morphOverrides: { ...state.morphOverrides, [overrideKey]: {} },
          [cloneKey]: {
            ...state[cloneKey],
            weights: buildMorphWeights(state[cloneKey].metrics),
          },
        }), false, `clearMorphOverrides:${overrideKey}`);
      },

      /**
       * Update posture for current or goal clone.
       * @param {"current"|"goal"} target
       * @param {Partial<PostureMetrics>} posture
       */
      setPosture: (target, posture) => {
        const key = target === "goal" ? "cloneB" : "cloneA";
        const prev = get()[key];
        set(
          { [key]: { ...prev, posture: { ...prev.posture, ...posture } } },
          false,
          `setPosture:${target}`
        );
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — TIMELINE
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Add a new snapshot to the timeline.
       * @param {TimelineSnapshot} snap
       */
      addTimelineSnap: (snap) => {
        set(
          (state) => ({ timelineSnaps: [...state.timelineSnaps, snap] }),
          false,
          "addTimelineSnap"
        );
      },

      /**
       * Scrub to a specific snapshot index.
       * Pass null to return to live (current) state.
       * @param {number|null} index
       */
      scrubTimeline: (index) => {
        set({ timelineScrubIndex: index }, false, "scrubTimeline");
      },

      /**
       * Returns the MorphState for the currently scrubbed timeline position.
       * Interpolates between adjacent snapshots when index is fractional.
       * @param {number} index - can be fractional for lerp
       * @returns {MorphState}
       */
      getScrubbedMorphState: () => {
        const { timelineSnaps, timelineScrubIndex, cloneA } = get();
        if (timelineScrubIndex === null) return cloneA;

        const i     = Math.floor(timelineScrubIndex);
        const t     = timelineScrubIndex - i;
        const snapA = timelineSnaps[Math.min(i, timelineSnaps.length - 1)];
        const snapB = timelineSnaps[Math.min(i + 1, timelineSnaps.length - 1)];

        if (!snapA) return cloneA;
        if (!snapB || t === 0) return buildMorphState(snapA.metrics, cloneA.posture);

        // Linear interpolate every metric between two adjacent snapshots
        const lerpMetrics = Object.fromEntries(
          Object.keys(snapA.metrics).map((key) => {
            const a = snapA.metrics[key];
            const b = snapB.metrics[key];
            if (typeof a === "number") return [key, a + (b - a) * t];
            return [key, a]; // non-numeric (e.g. skinTone) — no lerp
          })
        );

        return buildMorphState(lerpMetrics, cloneA.posture);
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — CAMERA
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Snap camera to a named preset.
       * @param {keyof typeof CAMERA_PRESETS} preset
       */
      setCameraPreset: (preset) => {
        set({ cameraPreset: preset }, false, `setCameraPreset:${preset}`);
      },

      setTimelineSnaps: (snaps) => {
        set({ timelineSnaps: Array.isArray(snaps) ? snaps : [] }, false, "setTimelineSnaps");
      },

      setCameraZoom: (zoom) => {
        const next = Math.max(0.35, Math.min(3.4, zoom));
        set({ cameraZoom: next }, false, "setCameraZoom");
      },

      resetCameraZoom: () => {
        set({ cameraZoom: 1 }, false, "resetCameraZoom");
      },

      fitCameraToBody: () => {
        const frame = get().modelFrame;
        const height = frame?.height || 1.92;
        const radius = frame?.radius || 0.72;
        const zoom = computeFitCameraZoom(radius);
        const preset = height > 2.05 ? "FRONT" : "FRONT";
        set({ cameraPreset: preset, cameraZoom: zoom }, false, "fitCameraToBody");
      },

      setModelFrame: (frame) => {
        if (!frame) return;
        set({ modelFrame: frame }, false, "setModelFrame");
      },

      setModelDiagnostics: (diagnostics) => {
        set({ modelDiagnostics: diagnostics || null }, false, "setModelDiagnostics");
      },

      setRendererQualityTelemetry: (telemetry = {}) => {
        set((state) => ({
          rendererQualityTelemetry: {
            ...state.rendererQualityTelemetry,
            ...telemetry,
            lastUpdated: Date.now(),
          },
        }), false, "setRendererQualityTelemetry");
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — WARDROBE
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Switch outfit / surface mode.
       * @param {keyof typeof WARDROBE_PRESETS} preset
       */
      setWardrobe: (preset) => {
        const normalized = String(preset || '').toUpperCase();
        if (!Object.prototype.hasOwnProperty.call(WARDROBE_PRESETS, normalized)) return;
        const value = WARDROBE_PRESETS[normalized];
        set({ wardrobeState: value }, false, `setWardrobe:${value}`);
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — ANATOMY DEPTH
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Set anatomy peel depth (0–100).
       * 100 = skin, 60 = muscle, 30 = skeleton, 0 = organs.
       * @param {number} depth
       */
      setAnatomyDepth: (depth) => {
        set(
          { anatomyDepth: Math.max(0, Math.min(100, depth)) },
          false,
          "setAnatomyDepth"
        );
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — VFX
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Toggle a single VFX flag.
       * @param {keyof typeof VFX_DEFAULTS} key
       * @param {boolean} [value] — if omitted, toggles current value
       */
      setVfx: (key, value) => {
        set(
          (state) => ({
            vfxState: {
              ...state.vfxState,
              [key]: value !== undefined ? value : !state.vfxState[key],
            },
          }),
          false,
          `setVfx:${key}`
        );
      },

      /**
       * Auto-enable vascularity VFX when bodyFat drops below 15%.
       * Call this inside a useEffect or Zustand subscriber after metrics update.
       */
      syncVascularityVfx: () => {
        const { cloneA, vfxState } = get();
        const shouldShow = cloneA.metrics.bodyFat < 15;
        if (shouldShow !== vfxState.vascularity) {
          set(
            (state) => ({
              vfxState: { ...state.vfxState, vascularity: shouldShow },
            }),
            false,
            "syncVascularityVfx"
          );
        }
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — GPU TIER
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Set detected GPU tier (run once on canvas mount).
       * @param {keyof typeof GPU_TIERS} tier
       */
      setGpuTier: (tier) => {
        if (get().gpuTier === tier) return;
        set({ gpuTier: tier }, false, `setGpuTier:${tier}`);
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — SPLIT MODE
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Move the SPLIT mode divider.
       * @param {number} x — fraction 0–1 of viewport width
       */
      setSplitDividerX: (x) => {
        set(
          { splitDividerX: Math.max(0.05, Math.min(0.95, x)) },
          false,
          "setSplitDividerX"
        );
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — BODY PART FOCUS
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Set the currently focused body part (for info panel + camera lerp).
       * @param {string|null} partName — e.g. "chest", "biceps", null to clear
       */
      setFocusedBodyPart: (partName) => {
        set({ focusedBodyPart: partName }, false, `setFocusedBodyPart:${partName}`);
      },

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — AUTO-ROTATE
      // ───────────────────────────────────────────────────────────────────────

      setAutoRotate: (val) =>
        set({ autoRotate: val }, false, "setAutoRotate"),

      /** Toggle between 3D WebGL canvas and 2D sprite viewer */
      setRenderMode: (mode) =>
        set({ renderMode: mode }, false, `setRenderMode:${mode}`),

      /** Update bio-feedback stress level (0–100) */
      setStressLevel: (level) =>
        set({ stressLevel: Math.max(0, Math.min(100, level)) }, false, "setStressLevel"),

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — AMBITION PATH
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Mark a milestone as achieved.
       * @param {string} milestoneId
       */
      achieveMilestone: (milestoneId) => {
        set(
          (state) => ({
            ambitionPath: {
              ...state.ambitionPath,
              milestones: state.ambitionPath.milestones.map((m) =>
                m.id === milestoneId ? { ...m, achieved: true } : m
              ),
            },
          }),
          false,
          `achieveMilestone:${milestoneId}`
        );
      },

      setPrivateAnatomyVisible: (visible) => {
        set(
          { privateAnatomyVisible: visible === true },
          false,
          "setPrivateAnatomyVisible"
        );
      },

      setCinematicSetting: (key, value) => {
        if (!Object.prototype.hasOwnProperty.call(CINEMATIC_DEFAULTS, key)) return;
        set((state) => ({
          cinematicState: sanitizeCinematicState({
            ...state.cinematicState,
            [key]: value,
            ...(key === "preset" ? {} : { preset: "CUSTOM" }),
          }),
        }), false, `setCinematicSetting:${key}`);
      },

      setCinematicState: (settings = {}) => {
        set({ cinematicState: sanitizeCinematicState(settings) }, false, "setCinematicState");
      },

      applyCinematicPreset: (preset) => {
        const next = CINEMATIC_PRESETS[preset];
        if (!next) return;
        set({ cinematicState: { ...next } }, false, `applyCinematicPreset:${preset}`);
      },

      setMilestones: (milestones) => {
        const rows = Array.isArray(milestones) ? milestones : [];
        const targetMonthIndex = rows.reduce((max, milestone) => Math.max(max, Number(milestone.monthIndex) || 0), 0);
        set((state) => ({ ambitionPath: { ...state.ambitionPath, milestones: rows, targetMonthIndex } }), false, "setMilestones");
      },

      /**
       * Advance current month in the ambition path.
       * @param {number} monthIndex
       */
      setCurrentMonthIndex: (monthIndex) => {
        set(
          (state) => ({
            ambitionPath: {
              ...state.ambitionPath,
              currentMonthIndex: monthIndex,
            },
          }),
          false,
          "setCurrentMonthIndex"
        );
      },

      // ───────────────────────────────────────────────────────────────────────
      // SELECTORS — convenience derived values
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Computes per-measurement deltas: goal − current.
       * @returns {Object} e.g. { weight: +19, waist: -2, chest: +20, … }
       */
      getDeltas: () => {
        const { cloneA, cloneB } = get();
        return Object.fromEntries(
          Object.keys(cloneA.metrics).map((key) => {
            const a = cloneA.metrics[key];
            const b = cloneB.metrics[key];
            return [key, typeof a === "number" ? parseFloat((b - a).toFixed(1)) : null];
          })
        );
      },

      /**
       * Returns overall progress percentage toward the goal deadline.
       * Based on current month index vs target month index.
       * @returns {number} 0–100
       */
      getProgressPercent: () => {
        const { ambitionPath } = get();
        return Math.min(
          100,
          Math.round(
            (ambitionPath.currentMonthIndex / ambitionPath.targetMonthIndex) * 100
          )
        );
      },
    })),
    { name: "GrowthTrack_3DStore" }
  )
);

export default use3DStore;
