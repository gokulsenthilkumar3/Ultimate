/**
 * constants/index.js — GrowthTrack Ultimate
 *
 * Single source of truth for all magic numbers, colours, strings,
 * timing values and asset paths that were previously scattered across
 * components as inline literals.
 *
 * USAGE:
 *   import { TIMING, COLORS, LAYOUT, BODY, ASSET_PATHS } from '../constants';
 *
 * SECTIONS:
 *   1. TIMING       — animation durations, polling intervals, debounce waits
 *   2. COLORS       — hex/rgba palette tokens used outside CSS variables
 *   3. LAYOUT       — pixel dimensions, breakpoints, z-indices
 *   4. BODY         — default biometric values, metric ranges
 *   5. ASSET_PATHS  — public asset URLs (respects Vite BASE_URL)
 *   6. THREEД       — Three.js / WebGL scene constants
 *   7. NOTIFICATION — badge limits, reminder intervals
 *   8. API          — health-check cadence
 */

// ─── 1. TIMING ───────────────────────────────────────────────────────────────
export const TIMING = {
  /** ms before Daily Check-In modal auto-shows after app load */
  DAILY_CHECKIN_DELAY_MS:   2_000,
  /** ms server health-check polling interval */
  SERVER_HEALTH_POLL_MS:   30_000,
  /** ms glitch effect duration on viewMode switch (PostProcessingStack) */
  GLITCH_DURATION_MS:          80,
  /** Canvas transition duration (Body3D zoom toggle) */
  CANVAS_TRANSITION:    '0.8s ease-in-out',
};

// ─── 2. COLORS ───────────────────────────────────────────────────────────────
// Raw hex / rgba used in JS (not via CSS custom-props) — e.g. Three.js materials
export const COLORS = {
  // Skin & biology
  SKIN_DEFAULT:         '#C68642',
  SKIN_ATTENUATION:     '#ff9966',
  SKIN_SHEEN:           '#ffddcc',
  MUSCLE_BASE:          0xf43f5e,
  MUSCLE_EMISSIVE:      0x440000,

  // UI accent palette
  ACCENT_CYAN:          '#22d3ee',
  ACCENT_CYAN_HEX:      0x22d3ee,
  ACCENT_GREEN:         '#22c55e',
  ACCENT_GREEN_HEX:     0x22c55e,
  ACCENT_ORANGE:        '#f97316',
  ACCENT_ORANGE_HEX:    0xf97316,
  ACCENT_RED:           '#ef4444',
  ACCENT_RED_HEX:       0xef4444,
  ACCENT_YELLOW:        '#eab308',
  ACCENT_YELLOW_HEX:    0xeab308,

  // Scene / canvas
  SCENE_BG:             '#050810',
  SCENE_BG_HEX:         0x050810,
  SCENE_FOG_NEAR:       6,
  SCENE_FOG_FAR:        14,
  FLOOR_COLOR:          '#050810',
  GRID_PRIMARY:         0x1d2d44,
  GRID_SECONDARY:       0x0a0f1a,
  AMBIENT_COLOR:        '#1a1a2e',

  // Lighting rig
  LIGHT_KEY_COLOR:      '#fff5e8',
  LIGHT_FILL_COLOR:     '#d6e8ff',
  LIGHT_RIM_COLOR:      '#88aaff',
  LIGHT_BOUNCE_COLOR:   '#ffcc88',

  // Organ map
  ORGAN_HEART:          0xdd2233,
  ORGAN_LUNG:           0xcc7755,
  ORGAN_LIVER:          0xc85020,
  ORGAN_GUT:            0xb07070,
  ORGAN_KIDNEY:         0xaa2222,
  ORGAN_HORMONE:        0x9966ee,
  ORGAN_IMMUNE:         0x4488ff,

  // Server status
  STATUS_ONLINE_BG:     'rgba(52,211,153,0.1)',
  STATUS_ONLINE_BORDER: 'rgba(52,211,153,0.25)',
  STATUS_OFFLINE_BG:    'rgba(248,113,113,0.1)',
  STATUS_OFFLINE_BORDER:'rgba(248,113,113,0.25)',

  // Nav badge
  NAV_BADGE_BG:         '#ef4444',
  NAV_BADGE_SHADOW:     'rgba(239,68,68,0.6)',

  // Onboarding / DailyCheckIn alert banner
  ALERT_BANNER_BG:      'rgba(234,179,8,0.12)',
  ALERT_BANNER_BORDER:  'rgba(234,179,8,0.35)',
  ALERT_BANNER_COLOR:   '#fde047',
};

// ─── 3. LAYOUT ───────────────────────────────────────────────────────────────
export const LAYOUT = {
  /** 3D viewport height in px */
  VIEWPORT_HEIGHT_PX:        650,
  /** Editor sidebar width in px */
  EDITOR_WIDTH_PX:           360,
  /** Camera near / far clip planes */
  CAMERA_NEAR:               0.1,
  CAMERA_FAR:               100,
  /** Default FOV for 3D canvas */
  CAMERA_FOV_DEFAULT:         40,
  CAMERA_FOV_ZOOMED:          25,
  /** Camera positions [x,y,z] */
  CAMERA_POS_DEFAULT:         [0, 0.9, 3.8],
  CAMERA_POS_ZOOMED:          [0, 1.2, 1.5],
  /** OrbitControls distance limits */
  ORBIT_MIN_DISTANCE:          2,
  ORBIT_MAX_DISTANCE:          6,
  /** Reflector floor resolution */
  FLOOR_REFLECTION_RES:      512,
  /** Grid divisions */
  GRID_DIVISIONS:             40,
  /** Nav badge max display number before "9+" */
  BADGE_MAX:                   9,
  /** Server status pill z-index */
  STATUS_PILL_ZINDEX:       9999,
};

// ─── 4. BODY (Biometric defaults & ranges) ───────────────────────────────────
export const BODY = {
  DEFAULT_HEIGHT_CM:   182,
  DEFAULT_WEIGHT_KG:    63,
  DEFAULT_BODY_FAT_PCT: 22,
  DEFAULT_STRESS_LVL:    0,

  HEIGHT_MIN:  150,  HEIGHT_MAX:  210,
  WEIGHT_MIN:   45,  WEIGHT_MAX:  130,
  BODY_FAT_MIN:  5,  BODY_FAT_MAX: 40,

  /** Morph slider range */
  MORPH_MIN:  0.7,
  MORPH_MAX:  1.5,
  MORPH_DEFAULT: 1.0,

  /** Anatomy depth default (100 = full skin) */
  ANATOMY_DEPTH_DEFAULT: 100,

  /** Vascularity kicks in below this body-fat % */
  VASCULARITY_BF_THRESHOLD: 20,
  VASCULARITY_BF_RANGE:     15,

  /** Dual-model x-offset in scene units */
  MODEL_OFFSET_X:  1.2,
};

// ─── 5. ASSET PATHS ──────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL; // "/Ultimate/" on GH Pages, "/" locally

export const ASSET_PATHS = {
  /** Primary humanoid GLB (current physique) */
  GLB_CURRENT:  `${BASE}assets/models/humanoid-base.glb`,
  /** Goal physique GLB (same model, separate instance) */
  GLB_GOAL:     `${BASE}assets/models/humanoid-base.glb`,
  /** Fallback GLB for dev environments without local model */
  GLB_FALLBACK: 'https://threejs.org/examples/models/gltf/Soldier.glb',
  /** App favicon (used in Notification API) */
  FAVICON:      `${BASE}favicon.ico`,
};

// ─── 6. THREE.JS / SCENE ─────────────────────────────────────────────────────
export const THREE_SCENE = {
  /** Auto-rotate speed (radians per second) */
  AUTO_ROTATE_SPEED:  0.4,
  /** Float animation amplitude */
  FLOAT_AMPLITUDE:    0.01,
  /** Emissive intensity at rest */
  EMISSIVE_REST:      0.35,
  /** Heatmap emissive base + pulse amplitude */
  HEATMAP_EMISSIVE_BASE:  0.8,
  HEATMAP_EMISSIVE_PULSE: 0.2,
  HEATMAP_PULSE_SPEED:    2,
  /** Delta mode emissive */
  DELTA_EMISSIVE_BASE:    0.6,
  DELTA_EMISSIVE_PULSE:   0.3,
  DELTA_PULSE_SPEED:      3,
  /** Skin / muscle transition thresholds (0-1 normalised depth) */
  SKIN_DEPTH_UPPER:   0.7,
  SKIN_DEPTH_LOWER:   0.3,
  MUSCLE_DEPTH_UPPER: 0.4,
  MUSCLE_DEPTH_LOWER: 0.1,
  /** Organ fade transition */
  ORGAN_DEPTH_THRESHOLD: 30,   // anatomy depth % below which organs show
  /** Reflector floor blurs */
  FLOOR_BLUR_X: 200,
  FLOOR_BLUR_Y: 100,
};

// ─── 7. NOTIFICATION ─────────────────────────────────────────────────────────
export const NOTIFICATION = {
  /** Days within deadline that triggers a goal-deadline alert */
  GOAL_DEADLINE_WARN_DAYS: 7,
  /** Notification body text */
  CHECKIN_NOTIF_TITLE: 'Daily Check-In Reminder',
  CHECKIN_NOTIF_BODY:  'Time to log your daily workouts, weight, and water intake!',
};

// ─── 8. API ──────────────────────────────────────────────────────────────────
export const API = {
  /** Vite env — falls back to localhost in dev */
  BASE_URL: import.meta.env.VITE_API_BASE || 'http://localhost:3001/api',
};
