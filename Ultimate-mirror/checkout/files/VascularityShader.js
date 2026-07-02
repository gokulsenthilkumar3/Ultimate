/**
 * GrowthTrack Ultimate — Layer 4: VFX / Shaders
 * VascularityShader.js
 *
 * Procedural vascular vein network shader.
 * Auto-activates when bodyFat < 15% (driven by store's vfxState.vascularity).
 *
 * Features:
 *   - Multi-octave Worley noise vein network (no texture required)
 *   - Anatomically concentrated: forearms, biceps, hands, temples, neck
 *     — achieved by masking via world-space Y + limb proximity
 *   - Vein depth: surface (blue-green) vs near-surface (purple-red)
 *   - Pulsing animation driven by uTime (simulates heartbeat at ~72bpm)
 *   - Intensity 0–1 mapped from (15% BF → 0) to (5% BF → 1)
 *
 * Implementation:
 *   This shader is designed to be composed ON TOP of SkinShader.js.
 *   Two integration paths:
 *
 *   PATH A — Separate overlay mesh (simplest):
 *     Render a second copy of the body mesh at renderOrder+1 with this
 *     material, depth test = EQUAL, blendMode = MULTIPLY.
 *
 *   PATH B — Inline in SkinShader (best performance):
 *     Import the GLSL functions below and call vascularityOverlay()
 *     inside skinFragmentShader before gl_FragColor. Already stubbed in
 *     SkinShader's veinPattern().
 *
 *   PATH A is what this file implements (standalone material).
 *   For PATH B, use the exported GLSL snippets directly.
 */

import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// GLSL SNIPPET — importable into other shaders (PATH B)
// ─────────────────────────────────────────────────────────────────────────────

export const VASCULARITY_GLSL = /* glsl */ `
  // ── Worley distance to nearest point (Manhattan variant for vein sharpness)
  float worleyDist(vec3 p, float scale) {
    p *= scale;
    vec3  pi  = floor(p);
    vec3  pf  = fract(p);
    float minD = 1.0;

    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        for (int z = -1; z <= 1; z++) {
          vec3 neighbor = vec3(float(x), float(y), float(z));
          vec3 cell     = pi + neighbor;
          // Hash cell → random point
          vec3 hashIn   = cell + vec3(127.1, 311.7, 74.7);
          vec3 rnd      = fract(sin(vec3(
            dot(hashIn, vec3(127.1, 311.7, 74.7)),
            dot(hashIn, vec3(269.5, 183.3, 246.1)),
            dot(hashIn, vec3( 92.3, 501.1, 149.0))
          )) * 43758.5453);
          float d = length(pf - (neighbor + rnd));
          minD    = min(minD, d);
        }
      }
    }
    return minD;
  }

  // ── Multi-octave vein network
  // Returns 0 (no vein) → 1 (center of vein)
  float veinNetwork(vec3 worldPos, float intensity) {
    // Three scales for major veins, minor branches, capillaries
    float major = 1.0 - smoothstep(0.0, 0.18, worleyDist(worldPos, 3.5));
    float minor = 1.0 - smoothstep(0.0, 0.10, worleyDist(worldPos, 7.0));
    float cap   = 1.0 - smoothstep(0.0, 0.06, worleyDist(worldPos, 14.0));

    float veins = major * 0.60 + minor * 0.28 + cap * 0.12;
    return veins;
  }

  // ── Anatomical mask: where veins are visible
  // Concentrates on forearms (Y ≈ 0.9–1.2), biceps (Y ≈ 1.2–1.5),
  // and neck/temples (Y > 1.7).
  float veinAnatomyMask(vec3 worldPos) {
    float y = worldPos.y;

    // Forearm band
    float forearm  = smoothstep(0.75, 0.95, y) * (1.0 - smoothstep(1.15, 1.35, y));

    // Bicep band
    float bicep    = smoothstep(1.2, 1.35, y) * (1.0 - smoothstep(1.55, 1.65, y));

    // Neck / temple
    float neck     = smoothstep(1.68, 1.72, y);

    // Shin / tibialis
    float shin     = smoothstep(0.08, 0.18, y) * (1.0 - smoothstep(0.45, 0.55, y));

    return clamp(forearm * 0.9 + bicep * 1.0 + neck * 0.7 + shin * 0.5, 0.0, 1.0);
  }

  // ── Heartbeat pulse: ~72bpm = 1.2Hz → sin period = 0.833s
  float heartbeatPulse(float time) {
    float bpm   = 72.0;
    float freq  = bpm / 60.0;              // 1.2 Hz
    float phase = time * freq * 6.28318;   // radians
    // Double-peak waveform (systole + diastole)
    float s1    = smoothstep(0.0, 0.15, sin(phase));
    float s2    = smoothstep(0.0, 0.08, sin(phase - 1.2)) * 0.4;
    return clamp(s1 + s2, 0.0, 1.0);
  }

  // ── Full vascularity overlay composite
  // Returns (veinColor, veinAlpha) — caller mixes with skin.
  vec4 vascularityOverlay(vec3 worldPos, float intensity, float time) {
    if (intensity < 0.001) return vec4(0.0);

    float network = veinNetwork(worldPos, intensity);
    float mask    = veinAnatomyMask(worldPos);
    float pulse   = mix(1.0, 1.0 + 0.12 * heartbeatPulse(time), intensity);

    float veinAlpha = network * mask * intensity * pulse;

    // Near-surface veins: blue-green (arterial oxygen)
    // Deep veins: purple-blue (venous)
    float depth = fract(worldPos.y * 7.3 + worldPos.x * 3.1); // fake depth variation
    vec3  arterial = vec3(0.08, 0.22, 0.55);   // blue
    vec3  venous   = vec3(0.35, 0.10, 0.45);   // purple
    vec3  veinColor = mix(venous, arterial, depth);

    return vec4(veinColor, veinAlpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// STANDALONE VERTEX SHADER (PATH A — overlay mesh)
// ─────────────────────────────────────────────────────────────────────────────

const vascularityVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
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
// STANDALONE FRAGMENT SHADER (PATH A)
// ─────────────────────────────────────────────────────────────────────────────

const vascularityFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  uniform float uIntensity;  // 0–1
  uniform float uTime;

  ${VASCULARITY_GLSL}

  void main() {
    vec3  V       = normalize(cameraPosition - vWorldPosition);
    vec3  N       = normalize(vWorldNormal);
    float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.5);

    vec4 overlay  = vascularityOverlay(vWorldPosition, uIntensity, uTime);

    // Fresnel boost at silhouette edges (veins wrap around limb edges)
    overlay.a    *= (1.0 + fresnel * 0.5);

    gl_FragColor  = vec4(overlay.rgb, clamp(overlay.a, 0.0, 0.85));
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the vascularity overlay material.
 * Render this on a second copy of the body mesh at renderOrder + 1.
 *
 * @returns {THREE.ShaderMaterial}
 */
export function createVascularityMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader:   vascularityVertexShader,
    fragmentShader: vascularityFragmentShader,
    uniforms: {
      uIntensity: { value: 0.0 },
      uTime:      { value: 0.0 },
    },
    skinning:      true,
    morphTargets:  true,
    morphNormals:  true,
    transparent:   true,
    depthWrite:    false,
    depthTest:     true,
    blending:      THREE.MultiplyBlending,
    side:          THREE.FrontSide,
  });
}

/**
 * Update vascularity uniform per frame.
 * @param {THREE.ShaderMaterial} mat
 * @param {{ intensity: number, time: number }} params
 */
export function updateVascularityUniforms(mat, { intensity = 0, time = 0 } = {}) {
  if (!mat?.uniforms) return;
  mat.uniforms.uIntensity.value = intensity;
  mat.uniforms.uTime.value      = time;
}
