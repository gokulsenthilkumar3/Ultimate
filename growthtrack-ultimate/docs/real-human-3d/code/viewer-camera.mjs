// Camera model for the Physique 3D viewer: a pure, dependency-free state machine that three/R3F code can drive.
//
// Three rules the viewer must hold, and this module is where they are enforced and tested:
//   1. The model never moves. Every interaction changes the camera (azimuth, polar, distance, target), never the model.
//   2. TURNTABLE only circles the body; ORBIT can go over the top and down to the floor; HANGING can go anywhere.
//   3. On a floor, the camera never goes below it, at any distance, drag speed or viewport.
//
// Angles are radians. azimuth 0 looks at the front (+z) and grows counter-clockwise seen from above. polar 0 is straight
// above the target, PI/2 is level with it, PI is straight below. Y is up.

export const MODES = Object.freeze({ TURNTABLE: 'TURNTABLE', ORBIT: 'ORBIT', TOP: 'TOP', HANGING: 'HANGING' });

const TAU = Math.PI * 2;
const POLE = 0.02;                     // keeps the camera off the exact pole so the up vector stays defined

export const DEFAULTS = Object.freeze({
  mode: MODES.ORBIT,
  floorY: 0,                           // world height of the floor; null when the model hangs free
  floorMargin: 0.06,                   // the camera stays at least this far above the floor (metres)
  turntablePolar: Math.PI / 2 - 0.12,  // slightly above the eye line, a natural product-turntable angle
  minDistance: 0.3,
  maxDistance: 8,
  rotateSpeed: 1,                      // 1 = a drag across the full viewport height turns the camera 360 degrees
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createCameraState(partial = {}) {
  return { target: [0, 1, 0], azimuth: 0, polar: Math.PI / 2 - 0.12, distance: 4, ...partial };
}

/** World position of the camera. */
export function cameraPosition(state) {
  const sinP = Math.sin(state.polar);
  return [
    state.target[0] + state.distance * sinP * Math.sin(state.azimuth),
    state.target[1] + state.distance * Math.cos(state.polar),
    state.target[2] + state.distance * sinP * Math.cos(state.azimuth),
  ];
}

/** Largest polar angle that keeps the camera above the floor at the current distance and target height. */
export function floorPolarLimit(state, { floorY, floorMargin }) {
  const c = (floorY + floorMargin - state.target[1]) / state.distance;
  if (c <= -1) return Math.PI - POLE;        // the floor is so far below that no limit applies
  if (c >= 1) return POLE;                    // target is at or below the floor line: only a top-down view is above it
  return Math.min(Math.acos(c), Math.PI - POLE);
}

/** Apply every constraint of the active mode. Always returns a new, valid state. */
export function constrain(state, options = {}) {
  const o = { ...DEFAULTS, ...options };
  let { azimuth, polar, distance } = state;
  distance = clamp(distance, o.minDistance, o.maxDistance);
  azimuth = ((azimuth % TAU) + TAU) % TAU;
  if (o.mode === MODES.TURNTABLE) polar = o.turntablePolar;
  else if (o.mode === MODES.TOP) polar = POLE;
  else polar = clamp(polar, POLE, Math.PI - POLE);
  const next = { ...state, azimuth, polar, distance };
  if (o.floorY !== null && o.mode !== MODES.HANGING) next.polar = Math.min(next.polar, floorPolarLimit(next, o));
  return next;
}

/** Convert a pointer drag in pixels into a new camera state. */
export function drag(state, dxPx, dyPx, viewportHeightPx, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const radPerPx = (TAU * o.rotateSpeed) / viewportHeightPx;
  const next = { ...state, azimuth: state.azimuth - dxPx * radPerPx };
  if (o.mode === MODES.ORBIT || o.mode === MODES.HANGING) next.polar = state.polar - dyPx * radPerPx;
  return constrain(next, o);
}

/** Dolly by a factor (above 1 moves away). Zooming is exponential so a wheel notch feels the same at any range. */
export function zoom(state, factor, options = {}) {
  return constrain({ ...state, distance: state.distance * factor }, options);
}

/** Auto-rotate: azimuth only, scaled by elapsed time so it looks the same at 30, 60 and 144 fps. */
export function autoRotate(state, dtSec, { degPerSec = 12, direction = 1 } = {}, options = {}) {
  const dt = clamp(dtSec, 0, 0.1);           // a stalled frame must not throw the view
  return constrain({ ...state, azimuth: state.azimuth + direction * (degPerSec * Math.PI / 180) * dt }, options);
}

/** ViewCube / preset snaps. */
export const VIEW_PRESETS = Object.freeze({
  FRONT: { azimuth: 0, polar: Math.PI / 2 },
  RIGHT: { azimuth: Math.PI / 2, polar: Math.PI / 2 },
  BACK: { azimuth: Math.PI, polar: Math.PI / 2 },
  LEFT: { azimuth: -Math.PI / 2, polar: Math.PI / 2 },
  TOP: { azimuth: 0, polar: POLE },
  BOTTOM: { azimuth: 0, polar: Math.PI - POLE },   // only reachable when the model hangs free
});

export function snapTo(state, name, options = {}) {
  const preset = VIEW_PRESETS[name];
  if (!preset) throw new RangeError(`unknown view ${name}`);
  return constrain({ ...state, ...preset }, options);
}

/** Shortest signed turn from one azimuth to another, so animated snaps never spin the long way round. */
export function shortestTurn(from, to) {
  return ((((to - from) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
}
