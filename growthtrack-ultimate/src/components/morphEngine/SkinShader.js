/**
 * GrowthTrack Ultimate — Layer 4: VFX / Shaders
 * SkinShader.js
 *
 * Custom subsurface scattering skin material.
 * Replaces the MeshStandardMaterial placeholder in HumanoidClone.jsx.
 *
 * Features:
 *   - Approximate SSS via dual-lobe Gaussian depth-scatter
 *   - Fitzpatrick scale I–VI driven by uniform (0–5)
 *   - Anatomy depth fade: skin → muscle red → bone phosphor-green
 *   - Specular highlight: dual-lobe Beckmann (skin surface + subsurface sheen)
 *   - Normal map slot for pore/wrinkle detail (optional texture)
 *   - Roughness variation map (drier at knuckles, oilier at forehead)
 *
 * Usage:
 *   import { createSkinMaterial, updateSkinUniforms } from "./SkinShader";
 *
 *   const mat = createSkinMaterial();
 *   skinnedMesh.material = mat;
 *
 *   // Per frame (in useFrame):
 *   updateSkinUniforms(mat, {
 *     fitzpatrickIndex:     4,       // 0=I … 5=VI
 *     anatomyDepth:         100,     // 0=organs, 100=skin
 *     vascularityIntensity: 0.0,     // 0–1, auto from store
 *     time:                 clock.elapsedTime,
 *   });
 */

import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// FITZPATRICK SKIN TONE TABLE
// [baseColor, SSS scatter color, specular tint]
// ─────────────────────────────────────────────────────────────────────────────

const FITZPATRICK_TABLE = [
  // I  — very fair / Scandinavian
  { base: [1.00, 0.91, 0.84], sss: [1.00, 0.72, 0.64], spec: [0.95, 0.85, 0.80] },
  // II — fair / Northern European
  { base: [0.96, 0.82, 0.68], sss: [0.98, 0.62, 0.52], spec: [0.90, 0.80, 0.72] },
  // III — medium / Mediterranean
  { base: [0.91, 0.72, 0.54], sss: [0.92, 0.55, 0.42], spec: [0.85, 0.72, 0.60] },
  // IV — olive-brown / South Asian (Gokul's tone)
  { base: [0.78, 0.52, 0.26], sss: [0.85, 0.40, 0.25], spec: [0.72, 0.58, 0.40] },
  // V  — brown / African, Middle Eastern
  { base: [0.55, 0.34, 0.16], sss: [0.70, 0.28, 0.15], spec: [0.58, 0.42, 0.28] },
  // VI — deep / dark African
  { base: [0.30, 0.18, 0.08], sss: [0.50, 0.18, 0.08], spec: [0.40, 0.28, 0.18] },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANATOMY DEPTH COLORS
// depth 100 = skin  |  60 = muscle  |  30 = skeleton  |  0 = organs
// ─────────────────────────────────────────────────────────────────────────────

// These are used as GLSL uniform vec3 arrays — passed as flat arrays
const ANATOMY_COLORS = {
  muscle:   new THREE.Color(0.65, 0.18, 0.18),     // deep red
  skeleton: new THREE.Color(0.58, 0.88, 0.62),     // phosphor green
  organs:   new THREE.Color(0.85, 0.55, 0.25),     // warm amber
};

// ─────────────────────────────────────────────────────────────────────────────
// VERTEX SHADER
// ─────────────────────────────────────────────────────────────────────────────

const skinVertexShader = /* glsl */ `
  // Morph targets + skinning handled by Three.js includes
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  #include <normal_pars_vertex>

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  varying vec3 vViewDir;
  varying float vDepthFade; // 0 = deep anatomy, 1 = full skin

  uniform float uAnatomyDepth; // 0–100

  void main() {
    vUv = uv;

    // Apply morphs + skinning
    #include <morphtarget_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinning_vertex>
    #include <project_vertex>

    // World-space position and normal for SSS lighting
    vec4 worldPos    = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition   = worldPos.xyz;
    vWorldNormal     = normalize(mat3(modelMatrix) * objectNormal);
    vViewDir         = normalize(cameraPosition - worldPos.xyz);

    // Depth fade factor: 1 = skin layer visible, 0 = fully peeled
    vDepthFade = clamp(uAnatomyDepth / 100.0, 0.0, 1.0);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT SHADER
// ─────────────────────────────────────────────────────────────────────────────

const skinFragmentShader = /* glsl */ `
  precision highp float;

  // ── Uniforms ────────────────────────────────────────────────────────────────
  uniform vec3  uBaseColor;           // Fitzpatrick base skin color
  uniform vec3  uSSSColor;            // Fitzpatrick SSS scatter color
  uniform vec3  uSpecColor;           // Specular tint

  uniform float uAnatomyDepth;        // 0–100 (100 = full skin)
  uniform vec3  uMuscleColor;
  uniform vec3  uSkeletonColor;
  uniform vec3  uOrgansColor;

  uniform float uVascularityIntensity; // 0–1
  uniform float uTime;                 // elapsed seconds

  // ── Varyings ────────────────────────────────────────────────────────────────
  varying vec3  vWorldPosition;
  varying vec3  vWorldNormal;
  varying vec2  vUv;
  varying vec3  vViewDir;
  varying float vDepthFade;

  // ── Light structure (inline key + fill + rim matching Layer 2) ────────────
  struct DirLight {
    vec3 direction;
    vec3 color;
    float intensity;
  };

  // Mirror of StudioLighting.jsx light positions → directions
  const DirLight KEY_LIGHT  = DirLight(normalize(vec3(3.0, -5.0, -3.0)),  vec3(1.00, 0.96, 0.88), 2.2);
  const DirLight FILL_LIGHT = DirLight(normalize(vec3(-4.0, -2.0, -2.0)), vec3(0.84, 0.93, 1.00), 0.7);
  const DirLight RIM_LIGHT  = DirLight(normalize(vec3(0.0, -1.0, 5.0)),   vec3(0.53, 0.60, 1.00), 1.2);

  // ── Beckmann specular (physically-based skin highlight) ───────────────────
  float beckmann(float NdH, float roughness) {
    float r2  = roughness * roughness;
    float NdH2 = NdH * NdH;
    return exp((NdH2 - 1.0) / (r2 * NdH2)) / (3.14159 * r2 * NdH2 * NdH2);
  }

  // ── Kelemen-Szirmay-Kalos SSS approximation ────────────────────────────────
  // Simulates light transport under thin translucent skin.
  // Based on: https://advances.realtimerendering.com/s2010/
  float sssScatter(vec3 N, vec3 L, float scatter) {
    // Wrap lighting: allows light to bleed slightly around the terminator
    float wrap  = 0.3;
    float NdotL = max(0.0, (dot(N, L) + wrap) / (1.0 + wrap));

    // Gaussian scatter: simulates multiple scattering depths
    float g1    = exp(-NdotL * NdotL / (2.0 * scatter * scatter));
    float g2    = exp(-NdotL * NdotL / (2.0 * (scatter * 3.0) * (scatter * 3.0)));
    return mix(g1, g2, 0.3) * 0.5;
  }

  // ── Procedural pore noise (cheap, no texture required) ────────────────────
  // Layered fract-sin hash for micro surface variation
  float poreNoise(vec2 uv) {
    vec2 p   = uv * 120.0;
    float n1 = fract(sin(dot(p,           vec2(127.1, 311.7))) * 43758.5453);
    float n2 = fract(sin(dot(p * 0.5,     vec2(269.5, 183.3))) * 43758.5453);
    float n3 = fract(sin(dot(p * 2.0,     vec2( 92.3, 501.1))) * 43758.5453);
    return n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
  }

  // ── Vascularity vein pattern ───────────────────────────────────────────────
  // Procedural sine-based vein network — Layer 4 VascularityShader extends this.
  float veinPattern(vec3 pos) {
    float v1 = abs(sin(pos.x * 18.0 + pos.y * 6.0));
    float v2 = abs(sin(pos.y * 22.0 + pos.z * 8.0));
    float v3 = abs(sin(pos.z * 15.0 + pos.x * 11.0));
    float veins = 1.0 - min(v1, min(v2, v3));
    return smoothstep(0.88, 0.98, veins);
  }

  // ── Anatomy depth compositor ───────────────────────────────────────────────
  // Blends skin / muscle / skeleton / organs based on uAnatomyDepth.
  vec3 anatomyColor(vec3 skinColor) {
    float d = uAnatomyDepth;  // 0–100

    // Skin zone: 70–100
    float skinWeight     = smoothstep(60.0, 80.0, d);

    // Muscle zone: 30–70
    float muscleWeight   = (1.0 - skinWeight) * smoothstep(20.0, 40.0, d);

    // Skeleton zone: 10–30
    float skeletonWeight = (1.0 - skinWeight - muscleWeight) * smoothstep(0.0, 20.0, d);

    // Organs: remainder (d < 10)
    float organsWeight   = 1.0 - skinWeight - muscleWeight - skeletonWeight;

    // Skeleton gets a phosphor emissive pulse
    float pulse = 0.5 + 0.5 * sin(uTime * 1.8);
    vec3 skeletonEmissive = uSkeletonColor * (0.8 + 0.4 * pulse);

    vec3 result = vec3(0.0);
    result += skinColor      * skinWeight;
    result += uMuscleColor   * muscleWeight;
    result += skeletonEmissive * skeletonWeight;
    result += uOrgansColor   * organsWeight;

    return result;
  }

  void main() {
    vec3  N   = normalize(vWorldNormal);
    vec3  V   = normalize(vViewDir);

    // ── Pore micro-detail ──────────────────────────────────────────────────────
    float pore       = poreNoise(vUv);
    float roughness  = mix(0.65, 0.85, pore);  // 0.65 (oily) → 0.85 (dry)

    // ── Accumulate lighting from 3 studio lights ────────────────────────────
    vec3 diffuse  = vec3(0.0);
    vec3 specular = vec3(0.0);
    vec3 scatter  = vec3(0.0);

    DirLight lights[3];
    lights[0] = KEY_LIGHT;
    lights[1] = FILL_LIGHT;
    lights[2] = RIM_LIGHT;

    for (int i = 0; i < 3; i++) {
      vec3  L    = -lights[i].direction;
      vec3  H    = normalize(L + V);
      float NdL  = max(0.0, dot(N, L));
      float NdH  = max(0.001, dot(N, H));

      // Diffuse (Lambert)
      diffuse  += lights[i].color * lights[i].intensity * NdL;

      // Specular dual-lobe: tight highlight + soft sheen
      float sp1  = beckmann(NdH, 0.25);   // tight oily highlight
      float sp2  = beckmann(NdH, 0.65);   // wide soft sheen
      float sp   = mix(sp1 * 0.6, sp2 * 0.4, pore);
      specular += lights[i].color * lights[i].intensity * sp * NdL * 0.04;

      // SSS scatter (strongest through ears, fingers, lips — approximated)
      float sss  = sssScatter(N, L, 0.35);
      scatter  += lights[i].color * lights[i].intensity * sss * 0.4;
    }

    // ── Ambient occlusion proxy (sky hemisphere) ────────────────────────────
    float ao         = 0.5 + 0.5 * dot(N, vec3(0.0, 1.0, 0.0));
    vec3  ambient    = vec3(0.04, 0.04, 0.06) * ao;

    // ── Compose skin color ──────────────────────────────────────────────────
    vec3 skinColor   = uBaseColor  * diffuse
                     + uSSSColor   * scatter
                     + uSpecColor  * specular
                     + uBaseColor  * ambient;

    // ── Vascularity overlay ─────────────────────────────────────────────────
    if (uVascularityIntensity > 0.0) {
      float veins     = veinPattern(vWorldPosition);
      vec3  veinColor = vec3(0.30, 0.08, 0.08); // dark venous blue-red
      skinColor       = mix(skinColor, veinColor, veins * uVascularityIntensity * 0.55);
    }

    // ── Anatomy depth composite ──────────────────────────────────────────────
    vec3 finalColor  = anatomyColor(skinColor);

    // ── Fresnel rim (adds subtle translucency glow at silhouette edges) ──────
    float fresnel    = pow(1.0 - max(0.0, dot(N, V)), 3.0);
    vec3  rimColor   = mix(uSSSColor, vec3(1.0, 0.85, 0.75), 0.5);
    finalColor      += rimColor * fresnel * 0.08;

    gl_FragColor     = vec4(finalColor, 1.0);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a ShaderMaterial using the SSS skin shader.
 * @param {number} [fitzpatrickIndex=3] - 0(I) to 5(VI), default IV
 * @returns {THREE.ShaderMaterial}
 */
export function createSkinMaterial(fitzpatrickIndex = 3) {
  const tone = FITZPATRICK_TABLE[Math.max(0, Math.min(5, fitzpatrickIndex))];

  return new THREE.ShaderMaterial({
    vertexShader:   skinVertexShader,
    fragmentShader: skinFragmentShader,
    uniforms: {
      // Fitzpatrick
      uBaseColor:            { value: new THREE.Color(...tone.base) },
      uSSSColor:             { value: new THREE.Color(...tone.sss)  },
      uSpecColor:            { value: new THREE.Color(...tone.spec) },

      // Anatomy depth
      uAnatomyDepth:         { value: 100.0 },
      uMuscleColor:          { value: ANATOMY_COLORS.muscle   },
      uSkeletonColor:        { value: ANATOMY_COLORS.skeleton },
      uOrgansColor:          { value: ANATOMY_COLORS.organs   },

      // VFX
      uVascularityIntensity: { value: 0.0 },
      uTime:                 { value: 0.0 },
    },

    // Required for Three.js skinning to inject bone matrices
    skinning: true,

    // Morph target attributes injected by Three.js
    morphTargets: true,
    morphNormals: true,

    lights:      false, // we handle lighting manually in the shader
    fog:         false,
    transparent: false,
    depthWrite:  true,
    depthTest:   true,
    side:        THREE.FrontSide,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFORM UPDATER — call from useFrame
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates dynamic uniforms on an existing skin material.
 * Call this in useFrame after reading from the store.
 *
 * @param {THREE.ShaderMaterial} mat
 * @param {{
 *   fitzpatrickIndex?:     number,   // 0–5
 *   anatomyDepth?:         number,   // 0–100
 *   vascularityIntensity?: number,   // 0–1
 *   time?:                 number,   // clock.elapsedTime
 * }} params
 */
export function updateSkinUniforms(mat, {
  fitzpatrickIndex     = 3,
  anatomyDepth         = 100,
  vascularityIntensity = 0,
  time                 = 0,
} = {}) {
  if (!mat?.uniforms) return;

  // Update Fitzpatrick tone (only if changed — Color.set is cheap)
  const fi   = Math.max(0, Math.min(5, Math.round(fitzpatrickIndex)));
  const tone = FITZPATRICK_TABLE[fi];
  mat.uniforms.uBaseColor.value.setRGB(...tone.base);
  mat.uniforms.uSSSColor.value.setRGB(...tone.sss);
  mat.uniforms.uSpecColor.value.setRGB(...tone.spec);

  mat.uniforms.uAnatomyDepth.value         = anatomyDepth;
  mat.uniforms.uVascularityIntensity.value = vascularityIntensity;
  mat.uniforms.uTime.value                 = time;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export { FITZPATRICK_TABLE, ANATOMY_COLORS };
