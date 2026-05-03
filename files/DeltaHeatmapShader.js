/**
 * GrowthTrack Ultimate — Layer 4: VFX / Shaders
 * DeltaHeatmapShader.js
 *
 * DELTA view mode shader — maps growth/loss regions onto the body mesh.
 *
 * Visual spec from architecture doc:
 *   Green glow regions  → measurements LARGER in goal vs current (muscle gain)
 *   Red glow regions    → measurements SMALLER in goal vs current (fat loss)
 *   White/neutral       → no significant change (<1% delta)
 *   Pulsing edge bloom  → strongest at maximum change regions
 *   Scanline overlay    → subtle sci-fi diagnostic aesthetic
 *
 * Implementation:
 *   Body regions are defined as Y-range + radial masks in world space.
 *   Each region samples a "delta sign" uniform (+1 = gain, -1 = loss, 0 = none).
 *   No UV unwrap needed — all masks are 3D world-space.
 *
 * Delta uniforms are computed in the React layer by comparing
 * cloneA.metrics vs cloneB.metrics (from store.getDeltas()).
 *
 * Usage:
 *   import { createDeltaMaterial, updateDeltaUniforms } from "./DeltaHeatmapShader";
 *
 *   // In HumanoidClone.jsx when renderMode === "delta":
 *   const mat = createDeltaMaterial();
 *   mesh.material = mat;
 *
 *   // In useFrame:
 *   updateDeltaUniforms(mat, { deltas, time: clock.elapsedTime });
 */

import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// REGION DEFINITIONS
// Maps body region names → world space masks
// Each region: { yMin, yMax, radial: bool, side: "both"|"left"|"right" }
// ─────────────────────────────────────────────────────────────────────────────

export const DELTA_REGIONS = {
  chest:     { yMin: 1.28, yMax: 1.58, radial: false, xRange: 0.18 },
  shoulders: { yMin: 1.48, yMax: 1.62, radial: false, xRange: 0.30 },
  waist:     { yMin: 0.88, yMax: 1.18, radial: false, xRange: 0.16 },
  arms:      { yMin: 1.05, yMax: 1.55, radial: false, xRange: null, armBand: true },
  thighs:    { yMin: 0.50, yMax: 0.90, radial: false, xRange: 0.16 },
  glutes:    { yMin: 0.85, yMax: 1.10, radial: false, xRange: 0.18, zSign: -1 },
  calves:    { yMin: 0.10, yMax: 0.48, radial: false, xRange: 0.14 },
  neck:      { yMin: 1.58, yMax: 1.72, radial: false, xRange: 0.07 },
};

// Ordered list of region names that match the uniform array order in the shader
const REGION_NAMES = Object.keys(DELTA_REGIONS);

// ─────────────────────────────────────────────────────────────────────────────
// VERTEX SHADER
// ─────────────────────────────────────────────────────────────────────────────

const deltaVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    #include <morphtarget_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinning_vertex>
    #include <project_vertex>

    vec4 worldPos  = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal   = normalize(mat3(modelMatrix) * objectNormal);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT SHADER
// ─────────────────────────────────────────────────────────────────────────────

const deltaFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  // Region delta signs: +1 = gain (green), -1 = loss (red), 0 = neutral
  // Array index matches REGION_NAMES order:
  // [chest, shoulders, waist, arms, thighs, glutes, calves, neck]
  uniform float uDeltaSigns[8];
  uniform float uDeltaMags[8];    // magnitude 0–1 (normalised delta amount)

  uniform float uTime;
  uniform float uPulseSpeed;      // default 1.4
  uniform float uScanlineOpacity; // default 0.08

  // ── Palette ────────────────────────────────────────────────────────────────
  const vec3 GAIN_COLOR    = vec3(0.10, 0.95, 0.55);  // vibrant green
  const vec3 LOSS_COLOR    = vec3(1.00, 0.22, 0.35);  // vibrant red-pink
  const vec3 NEUTRAL_COLOR = vec3(0.20, 0.22, 0.28);  // dark neutral base
  const vec3 SCAN_COLOR    = vec3(0.55, 0.85, 1.00);  // cyan scanlines

  // ── Smooth band mask: returns 0–1 for a Y-range band ─────────────────────
  float yBand(float y, float yMin, float yMax, float feather) {
    return smoothstep(yMin, yMin + feather, y) *
           (1.0 - smoothstep(yMax - feather, yMax, y));
  }

  // ── X-range mask: bilateral (both sides) ─────────────────────────────────
  float xBand(float x, float xRange, float feather) {
    return smoothstep(0.0, feather, xRange - abs(x));
  }

  // ── Region masks (8 regions, inline for GLSL compat) ─────────────────────
  float regionMask(int idx, vec3 wp) {
    float y = wp.y;
    float x = wp.x;
    float z = wp.z;
    float m = 0.0;

    if (idx == 0) // chest: front, mid-chest height, bilateral
      m = yBand(y, 1.28, 1.58, 0.07) * xBand(x, 0.18, 0.05) * smoothstep(0.0, 0.08, z);

    else if (idx == 1) // shoulders: top-wide, bilateral
      m = yBand(y, 1.48, 1.62, 0.05) * (1.0 - smoothstep(0.14, 0.30, abs(x)));

    else if (idx == 2) // waist: full ring, centre
      m = yBand(y, 0.88, 1.18, 0.07) * xBand(x, 0.16, 0.05);

    else if (idx == 3) { // arms: lateral strips (|x| > 0.22)
      float armX = smoothstep(0.22, 0.30, abs(x)) * (1.0 - smoothstep(0.40, 0.48, abs(x)));
      m = yBand(y, 1.05, 1.55, 0.08) * armX;
    }

    else if (idx == 4) // thighs: bilateral lower body
      m = yBand(y, 0.50, 0.90, 0.08) * xBand(x, 0.16, 0.05);

    else if (idx == 5) // glutes: posterior
      m = yBand(y, 0.85, 1.10, 0.07) * xBand(x, 0.18, 0.06) * smoothstep(0.0, 0.08, -z);

    else if (idx == 6) // calves: bilateral lower leg
      m = yBand(y, 0.10, 0.48, 0.06) * xBand(x, 0.14, 0.05);

    else if (idx == 7) // neck: centre column
      m = yBand(y, 1.58, 1.72, 0.04) * xBand(x, 0.07, 0.03);

    return clamp(m, 0.0, 1.0);
  }

  // ── Scanline overlay ───────────────────────────────────────────────────────
  float scanline(vec2 uv, float time) {
    float line = fract(uv.y * 120.0 - time * 0.4);
    return smoothstep(0.0, 0.1, line) * (1.0 - smoothstep(0.1, 0.5, line));
  }

  // ── Pulse wave (radiating outward from region centroid) ───────────────────
  float pulse(float mask, float time, float speed) {
    return mask * (0.7 + 0.3 * sin(time * speed + mask * 12.0));
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);

    // ── Accumulate region contributions ────────────────────────────────────
    vec3  regionColor = NEUTRAL_COLOR;
    float regionWeight = 0.0;

    for (int i = 0; i < 8; i++) {
      float mask  = regionMask(i, vWorldPosition);
      float sign  = uDeltaSigns[i];
      float mag   = uDeltaMags[i];

      if (mask < 0.001 || abs(sign) < 0.001) continue;

      vec3 color  = sign > 0.0 ? GAIN_COLOR : LOSS_COLOR;
      float p     = pulse(mask, uTime, uPulseSpeed);
      float w     = mask * mag * p;

      regionColor  = mix(regionColor, color, w);
      regionWeight = max(regionWeight, w);
    }

    // ── Fresnel rim glow (emits at silhouette edges) ─────────────────────
    float fresnel   = pow(1.0 - max(0.0, dot(N, V)), 2.0);
    regionColor    += mix(GAIN_COLOR, LOSS_COLOR, 0.5) * fresnel * regionWeight * 0.3;

    // ── Scanline sci-fi overlay ────────────────────────────────────────────
    float scan      = scanline(vUv, uTime);
    regionColor    += SCAN_COLOR * scan * uScanlineOpacity;

    // ── Subtle edge outline (depth-based) ────────────────────────────────
    float edge      = 1.0 - max(0.0, dot(N, V));
    regionColor    += vec3(0.3, 0.7, 0.9) * pow(edge, 4.0) * 0.15;

    gl_FragColor    = vec4(regionColor, 1.0);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// DELTA SIGN + MAGNITUDE CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps store delta values to per-region shader uniforms.
 * @param {Object} deltas - from store.getDeltas()
 * @returns {{ signs: Float32Array, mags: Float32Array }}
 */
export function computeDeltaUniforms(deltas) {
  // Delta thresholds: below these we treat the change as neutral (white)
  const THRESHOLDS = {
    chest:     2.0,   // cm
    shoulders: 2.0,
    waist:     1.5,
    arms:      1.0,
    thighs:    2.0,
    glutes:    2.0,
    calves:    1.0,
    neck:      1.0,
  };

  // Max expected deltas for normalising magnitude
  const MAX_DELTAS = {
    chest:     25.0,
    shoulders: 25.0,
    waist:     20.0,
    arms:      15.0,
    thighs:    20.0,
    glutes:    20.0,
    calves:    10.0,
    neck:      8.0,
  };

  const signs = new Float32Array(8);
  const mags  = new Float32Array(8);

  REGION_NAMES.forEach((name, i) => {
    const d = deltas[name] ?? 0;
    const t = THRESHOLDS[name] ?? 1.0;
    const m = MAX_DELTAS[name] ?? 10.0;

    if (Math.abs(d) < t) {
      signs[i] = 0;
      mags[i]  = 0;
    } else {
      signs[i] = Math.sign(d);
      mags[i]  = Math.min(1.0, Math.abs(d) / m);
    }
  });

  return { signs, mags };
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the delta heatmap material.
 * @returns {THREE.ShaderMaterial}
 */
export function createDeltaMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader:   deltaVertexShader,
    fragmentShader: deltaFragmentShader,
    uniforms: {
      uDeltaSigns:     { value: new Float32Array(8) },
      uDeltaMags:      { value: new Float32Array(8) },
      uTime:           { value: 0.0 },
      uPulseSpeed:     { value: 1.4 },
      uScanlineOpacity:{ value: 0.08 },
    },
    skinning:     true,
    morphTargets: true,
    morphNormals: true,
    transparent:  false,
    depthWrite:   true,
    side:         THREE.FrontSide,
  });
}

/**
 * Update delta uniforms per frame.
 * @param {THREE.ShaderMaterial} mat
 * @param {{ deltas: Object, time: number }} params
 */
export function updateDeltaUniforms(mat, { deltas = {}, time = 0 } = {}) {
  if (!mat?.uniforms) return;

  const { signs, mags } = computeDeltaUniforms(deltas);
  mat.uniforms.uDeltaSigns.value = signs;
  mat.uniforms.uDeltaMags.value  = mags;
  mat.uniforms.uTime.value       = time;
}
