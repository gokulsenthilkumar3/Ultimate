/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * MorphInterpolator.js
 *
 * Smooth per-frame morph weight interpolation system.
 *
 * Spec from architecture doc:
 *   - Lerp at 0.08 per frame
 *   - Easing: cubic-bezier(0.16, 1, 0.3, 1) mapped to frame delta
 *   - Goal model always shows TARGET state (no animation, instant)
 *   - Timeline snapshots interpolate between historical states on scrub
 *
 * Design:
 *   MorphInterpolator is a plain JS class (not a React hook) so it can
 *   live inside a useRef and be called from useFrame without re-renders.
 *   The React hook `useMorphInterpolator` wraps it for component use.
 *
 * cubic-bezier(0.16, 1, 0.3, 1) is an "expo-out" curve:
 *   - Starts with high velocity (responsive feel)
 *   - Decelerates sharply to the target (no overshoot)
 *   - Used for slider drag → model morph response
 */

import { useRef, useCallback } from "react";
import { MORPH_TARGET_NAMES }  from "./useModelLoader";

// ─────────────────────────────────────────────────────────────────────────────
// CUBIC BEZIER SOLVER
// Solves cubic-bezier(P1x, P1y, P2x, P2y) for a given t ∈ [0,1].
// Based on the W3C CSS spec algorithm.
// ─────────────────────────────────────────────────────────────────────────────

function cubicBezier(p1x, p1y, p2x, p2y) {
  const NEWTON_ITERATIONS = 8;
  const NEWTON_MIN_SLOPE  = 0.001;
  const SUBDIVISION_PRECISION = 1e-7;
  const SUBDIVISION_MAX_ITER  = 10;
  const kSplineTableSize      = 11;
  const kSampleStepSize       = 1.0 / (kSplineTableSize - 1.0);

  function A(a1, a2) { return 1.0 - 3.0 * a2 + 3.0 * a1; }
  function B(a1, a2) { return 3.0 * a2 - 6.0 * a1; }
  function C(a1)     { return 3.0 * a1; }

  function calcBezier(t, a1, a2) {
    return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
  }

  function getSlope(t, a1, a2) {
    return 3.0 * A(a1, a2) * t * t + 2.0 * B(a1, a2) * t + C(a1);
  }

  // Pre-compute sample table for x component
  const sampleValues = new Float32Array(kSplineTableSize);
  if (p1x !== p1y || p2x !== p2y) {
    for (let i = 0; i < kSplineTableSize; ++i) {
      sampleValues[i] = calcBezier(i * kSampleStepSize, p1x, p2x);
    }
  }

  function getTForX(aX) {
    let intervalStart      = 0.0;
    let currentSample      = 1;
    const lastSample       = kSplineTableSize - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;

    const dist = (aX - sampleValues[currentSample]) /
                 (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    let guessForT = intervalStart + dist * kSampleStepSize;

    const initialSlope = getSlope(guessForT, p1x, p2x);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
        const currentSlope = getSlope(guessForT, p1x, p2x);
        if (currentSlope === 0.0) break;
        const currentX = calcBezier(guessForT, p1x, p2x) - aX;
        guessForT -= currentX / currentSlope;
      }
      return guessForT;
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      let aB = intervalStart + kSampleStepSize;
      let currentT, currentX;
      let i = 0;
      do {
        currentT = intervalStart + (aB - intervalStart) / 2.0;
        currentX = calcBezier(currentT, p1x, p2x) - aX;
        if (currentX > 0.0) aB = currentT;
        else intervalStart = currentT;
      } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITER);
      return currentT;
    }
  }

  return function ease(x) {
    if (p1x === p1y && p2x === p2y) return x; // linear
    if (x === 0 || x === 1) return x;
    return calcBezier(getTForX(x), p1y, p2y);
  };
}

/** cubic-bezier(0.16, 1, 0.3, 1) — expo-out, as specified */
const easeExpoOut = cubicBezier(0.16, 1, 0.3, 1);

// ─────────────────────────────────────────────────────────────────────────────
// MORPH INTERPOLATOR CLASS
// ─────────────────────────────────────────────────────────────────────────────

/** Base lerp factor per frame at 60fps (spec: 0.08) */
const BASE_LERP = 0.08;

/**
 * Frame-rate-independent lerp factor.
 * Converts the per-frame lerp to a delta-time-based factor.
 * @param {number} delta - seconds since last frame
 * @returns {number} frame-rate-independent lerp factor
 */
function adaptiveLerp(delta) {
  // At 60fps: delta = 0.0167s → factor = 0.08
  // Scales naturally for other frame rates
  const targetDelta = 1 / 60;
  const frames      = delta / targetDelta;
  return 1 - Math.pow(1 - BASE_LERP, frames);
}

export class MorphInterpolator {
  /**
   * @param {string[]} morphNames - ordered list of morph target names
   */
  constructor(morphNames = MORPH_TARGET_NAMES) {
    this.morphNames  = morphNames;
    this.count       = morphNames.length;

    // Current interpolated weights (what's actually applied to the mesh)
    this.current = new Float32Array(this.count);

    // Target weights (driven by store)
    this.target  = new Float32Array(this.count);

    // Track per-weight animation progress for easing (0→1 journey)
    this._progress = new Float32Array(this.count).fill(1); // start converged
    this._from     = new Float32Array(this.count);

    this.converged = true;
  }

  /**
   * Update target weights from a computed weights object.
   * Only triggers re-animation for weights that actually changed.
   * @param {Object} weights - { [morphName]: 0-1 value }
   */
  setTargets(weights) {
    let anyChanged = false;
    for (let i = 0; i < this.count; i++) {
      const name  = this.morphNames[i];
      const value = weights[name] ?? 0;
      if (Math.abs(value - this.target[i]) > 0.0001) {
        this._from[i]     = this.current[i]; // snapshot current as new "from"
        this._progress[i] = 0;              // reset easing progress
        this.target[i]    = value;
        anyChanged        = true;
      }
    }
    if (anyChanged) this.converged = false;
  }

  /**
   * Called from useFrame. Advances interpolation by one tick.
   * @param {number} delta - time since last frame (seconds)
   * @returns {Float32Array} current weights (same reference, mutated in place)
   */
  tick(delta) {
    if (this.converged) return this.current;

    const lerpFactor = adaptiveLerp(delta);
    let   allDone    = true;

    for (let i = 0; i < this.count; i++) {
      const diff = Math.abs(this.target[i] - this.current[i]);

      if (diff < 0.0001) {
        this.current[i] = this.target[i];
        continue;
      }

      allDone = false;

      // Advance progress 0→1
      this._progress[i] = Math.min(1, this._progress[i] + lerpFactor);

      // Apply cubic-bezier easing to the progress
      const easedProgress = easeExpoOut(this._progress[i]);

      // Interpolate from stored "from" value to target
      this.current[i] = this._from[i] + (this.target[i] - this._from[i]) * easedProgress;
    }

    this.converged = allDone;
    return this.current;
  }

  /**
   * Instantly snap all weights to their targets (no animation).
   * Used for the goal clone, which always shows the target state.
   * @param {Object} weights
   */
  snapToTargets(weights) {
    for (let i = 0; i < this.count; i++) {
      const name       = this.morphNames[i];
      const value      = weights[name] ?? 0;
      this.current[i]  = value;
      this.target[i]   = value;
      this._from[i]    = value;
      this._progress[i] = 1;
    }
    this.converged = true;
  }

  /**
   * Apply current weights to a SkinnedMesh's morphTargetInfluences array.
   * @param {THREE.SkinnedMesh} mesh
   * @param {Object} morphIndexMap - { [name]: influenceIndex }
   * @param {boolean} [skipFitzpatrick] - skip shader-only targets
   */
  applyToMesh(mesh, morphIndexMap, skipFitzpatrick = true) {
    if (!mesh || !mesh.morphTargetInfluences) return;

    for (let i = 0; i < this.count; i++) {
      const name = this.morphNames[i];

      // Skip shader-only targets — they don't exist as geometry morphs
      if (skipFitzpatrick && (name === "fitzpatrick_index" || name === "vascularity_intensity")) {
        continue;
      }

      const idx = morphIndexMap[name];
      if (idx !== undefined) {
        mesh.morphTargetInfluences[idx] = this.current[i];
      }
    }
  }

  /**
   * Returns the current weight for a specific morph target by name.
   * @param {string} name
   */
  getWeight(name) {
    const i = this.morphNames.indexOf(name);
    return i >= 0 ? this.current[i] : 0;
  }

  /** Resets all weights to zero instantly. */
  reset() {
    this.current.fill(0);
    this.target.fill(0);
    this._from.fill(0);
    this._progress.fill(1);
    this.converged = true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a stable MorphInterpolator instance for use in a component.
 * The interpolator persists across renders inside a useRef.
 *
 * @param {boolean} [snapMode=false] - if true, weights snap instantly (goal clone)
 * @returns {{ interpolator: MorphInterpolator, updateWeights: Function }}
 */
export function useMorphInterpolator(snapMode = false) {
  const interpolatorRef = useRef(null);

  if (!interpolatorRef.current) {
    interpolatorRef.current = new MorphInterpolator();
  }

  const updateWeights = useCallback(
    (weights) => {
      if (snapMode) {
        interpolatorRef.current.snapToTargets(weights);
      } else {
        interpolatorRef.current.setTargets(weights);
      }
    },
    [snapMode]
  );

  return {
    interpolator:  interpolatorRef.current,
    updateWeights,
  };
}
