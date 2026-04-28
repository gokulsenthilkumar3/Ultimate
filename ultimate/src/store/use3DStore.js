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
 * @property {number} d_size       - inches (3–9)
 * @property {number} d_girth      - inches
 * @property {number} ankle        - cm
 * @property {string} skinTone     - Fitzpatrick scale: "I"|"II"|"III"|"IV"|"V"|"VI"
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
  if (!range) return 0;
  return Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
};

/**
 * Computes all 24 blend-shape weights from a BodyMetrics object.
 * Each key maps directly to a morph target name in the GLB file.
 *
 * @param {BodyMetrics} metrics
 * @returns {Object} blend shape weights
 */
export const computeMorphWeights = (metrics) => ({
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

  // PRIVATE (rendered in anatomical/underwear mode only)
  d_length:        normalise(metrics.d_size,    "d_size"),
  d_girth:         normalise(metrics.d_girth,   "d_girth"),

  // VASCULARITY (auto-triggered when bodyFat < 15%)
  vascularity_intensity: metrics.bodyFat < 15
    ? Math.max(0, (15 - metrics.bodyFat) / 10)
    : 0,

  // SKIN TONE — passed to shader as Fitzpatrick index 0–5
  fitzpatrick_index: ["I","II","III","IV","V","VI"].indexOf(metrics.skinTone),
});

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL SEED DATA — Gokul's current stats
// (Replace with real userData.js import in production)
// ─────────────────────────────────────────────────────────────────────────────

const CURRENT_METRICS = {
  weight:     63,
  bodyFat:    18,
  chest:      88,
  shoulders:  104,
  waist:      78,
  arms:       31,
  forearm:    27,
  thighs:     52,
  hips:       88,
  glutes:     92,
  calves:     35,
  neck:       36,
  d_size:     5.5,
  d_girth:    4.5,
  ankle:      22,
  skinTone:   "IV",
};

const GOAL_METRICS = {
  weight:     82,
  bodyFat:    10,
  chest:      108,
  shoulders:  124,
  waist:      76,
  arms:       43,
  forearm:    33,
  thighs:     62,
  hips:       96,
  glutes:     104,
  calves:     40,
  neck:       41,
  d_size:     5.5,   // unchanged
  d_girth:    4.5,   // unchanged
  ankle:      23,
  skinTone:   "IV",  // unchanged
};

const CURRENT_POSTURE = {
  headTiltAngle:    8,   // degrees forward
  pelvicTilt:       12,  // degrees APT
  shoulderRounding: 15,  // degrees forward
};

const GOAL_POSTURE = {
  headTiltAngle:    2,
  pelvicTilt:       4,
  shoulderRounding: 5,
};

/** Build a clone's full MorphState from metrics + posture */
const buildMorphState = (metrics, posture) => ({
  metrics,
  posture,
  weights: computeMorphWeights(metrics),
});

const INITIAL_TIMELINE = [
  {
    id:      "snap_0",
    date:    "2025-05-01",
    label:   "Month 0 — Start",
    metrics: { ...CURRENT_METRICS, weight: 61, bodyFat: 20, arms: 29 },
    note:    "Day one. Let's go.",
  },
  {
    id:      "snap_3",
    date:    "2025-08-01",
    label:   "Month 3",
    metrics: { ...CURRENT_METRICS, weight: 63, bodyFat: 18, arms: 31, chest: 88 },
    note:    "Consistency paying off.",
  },
];

const INITIAL_MILESTONES = [
  { id: "m1",  label: "Visible abs",            month: "Month 3",  monthIndex: 3,  achieved: false },
  { id: "m2",  label: "70kg — Lean mass",        month: "Month 6",  monthIndex: 6,  achieved: false },
  { id: "m3",  label: "Bench 80kg",              month: "Month 9",  monthIndex: 9,  achieved: false },
  { id: "m4",  label: "75kg — Halfway to Greek", month: "Month 12", monthIndex: 12, achieved: false },
  { id: "m5",  label: "15% BF — Vascularity",   month: "Month 15", monthIndex: 15, achieved: false },
  { id: "m6",  label: "82kg — DESTINATION",      month: "Month 20", monthIndex: 20, achieved: false },
];

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
      cloneA: buildMorphState(CURRENT_METRICS, CURRENT_POSTURE),

      /** MorphState for the "YOUR GOAL" clone */
      cloneB: buildMorphState(GOAL_METRICS, GOAL_POSTURE),

      /** Logged progress snapshots for TIMELINE mode */
      timelineSnaps: INITIAL_TIMELINE,

      /** Index into timelineSnaps currently being scrubbed to (null = live) */
      timelineScrubIndex: null,

      /** Current viewport comparison mode */
      viewMode: VIEW_MODES.DUAL,

      /** Wardrobe / surface state */
      wardrobeState: WARDROBE_PRESETS.GYM,

      /** Camera preset name key */
      cameraPreset: "FRONT",

      /**
       * Anatomy depth: 100 = full skin, 0 = full X-ray skeleton.
       * Drives shader fade skin→muscle→skeleton→organs.
       */
      anatomyDepth: 100,

      /** Ambition path data */
      ambitionPath: {
        currentMonthIndex: 3,
        targetMonthIndex:  20,
        deadline:          "2026-12-31",
        milestones:        INITIAL_MILESTONES,
      },

      /** Active post-processing / visual effects flags */
      vfxState: { ...VFX_DEFAULTS },

      /** Detected GPU tier — set on mount via capability detection */
      gpuTier: GPU_TIERS.HIGH,

      /** Split-mode divider position (0–1, fraction of viewport width) */
      splitDividerX: 0.5,

      /** Currently clicked / focused body part (null = none) */
      focusedBodyPart: null,

      /** Auto-rotate the scene (pauses on hover) */
      autoRotate: true,

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
              weights: computeMorphWeights(updatedMetrics),
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
              weights: computeMorphWeights(updatedMetrics),
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
              weights: computeMorphWeights(metrics),
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
              weights: computeMorphWeights(metrics),
            },
          },
          false,
          "setGoalMetrics"
        );
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
        if (!snapB || t === 0) return buildMorphState(snapA.metrics, CURRENT_POSTURE);

        // Linear interpolate every metric between two adjacent snapshots
        const lerpMetrics = Object.fromEntries(
          Object.keys(snapA.metrics).map((key) => {
            const a = snapA.metrics[key];
            const b = snapB.metrics[key];
            if (typeof a === "number") return [key, a + (b - a) * t];
            return [key, a]; // non-numeric (e.g. skinTone) — no lerp
          })
        );

        return buildMorphState(lerpMetrics, CURRENT_POSTURE);
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

      // ───────────────────────────────────────────────────────────────────────
      // ACTIONS — WARDROBE
      // ───────────────────────────────────────────────────────────────────────

      /**
       * Switch outfit / surface mode.
       * @param {keyof typeof WARDROBE_PRESETS} preset
       */
      setWardrobe: (preset) => {
        set({ wardrobeState: preset }, false, `setWardrobe:${preset}`);
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

      setAutoRotate: (val) => {
        set({ autoRotate: val }, false, "setAutoRotate");
      },

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
