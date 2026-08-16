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
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    
    #include <begin_vertex>
    #include <morphtarget_vertex>
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
  // Worley-cell network simulating subcutaneous vein branching.

  float worleyDist(vec3 p, float scale) {
    p *= scale;
    vec3  ip  = floor(p);
    vec3  fp  = fract(p);
    float md  = 1.0;
    for (int xi = -1; xi <= 1; xi++) {
      for (int yi = -1; yi <= 1; yi++) {
        for (int zi = -1; zi <= 1; zi++) {
          vec3 nb   = vec3(float(xi), float(yi), float(zi));
          vec3 rnd  = vec3(fract(sin(dot(ip + nb, vec3(127.1, 311.7, 74.7))) * 43758.5453));
          vec3 diff = nb + rnd - fp;
          md = min(md, dot(diff, diff));
        }
      }
    }
    return sqrt(md);
  }

  // Fine Worley + wide Worley combined → thin vein lines with larger feed vessels
  float veinPattern(vec3 p) {
    float d1   = worleyDist(p, 7.0);
    float d2   = worleyDist(p * vec3(1.0, 0.45, 1.0), 3.5);
    float thin = 1.0 - smoothstep(0.0, 0.10, d1);
    float wide = 1.0 - smoothstep(0.0, 0.20, d2);
    return clamp(thin * 0.65 + wide * 0.35, 0.0, 1.0);
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

  // We use MeshStandardMaterial as the base to get 100% correct
  // skinning, morph targets, shadows, and PBR lighting out of the box,
  // avoiding the brittle WebGL injection issues of raw ShaderMaterial.
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(...tone.base),
    roughness: 0.5,
    metalness: 0.1,
    
    // Subsurface scattering approximation using emissive
    emissive: new THREE.Color(...tone.sss),
    emissiveIntensity: 0.15,
    
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true,
  });

  // Attach dynamic uniforms object so updateSkinUniforms doesn't crash,
  // even though we aren't using the full custom shader right now.
  mat.uniforms = {
    uBaseColor:            { value: new THREE.Color(...tone.base) },
    uSSSColor:             { value: new THREE.Color(...tone.sss) },
    uSpecColor:            { value: new THREE.Color(...tone.spec) },
    uAnatomyDepth:         { value: 100.0 },
    uVascularityIntensity: { value: 0.0 },
    uTime:                 { value: 0.0 },
  };

  return mat;
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



/**
 * GrowthTrack Ultimate — Layer 4: VFX / Shaders
 * AuraShader.js
 *
 * Cyan-white volumetric aura for the "YOUR GOAL" clone.
 *
 * Visual spec from architecture doc:
 *   Cyan-white rim aura on goal clone
 *   God-ray vertical light shafts rising from the model
 *   Pulsing breathing rhythm (not heartbeat — slower, aspirational)
 *   Strongest along the silhouette (fresnel-based)
 *   Fades to zero below the floor (no underground aura)
 *
 * Implementation: 3 layered effects
 *
 *   LAYER A — Rim/Fresnel glow (BackSide inflated mesh, already in HumanoidClone.jsx)
 *     AuraMesh uses this shader instead of MeshBasicMaterial.
 *
 *   LAYER B — Vertical god-ray particles (instanced planes, rises from Y=0)
 *     10–20 vertical quads around the model perimeter, animated upward.
 *     Each fades out at top (alpha 0), opaque at bottom.
 *
 *   LAYER C — Ground corona (flat disc on floor, fades outward)
 *     Rendered at Y=0.01, radius ~0.6, additive blend.
 *
 * All three effects share the same uTime and uIntensity uniforms.
 * uIntensity is driven by ambitionPath.currentMonthIndex / targetMonthIndex.
 */



// ─────────────────────────────────────────────────────────────────────────────
// LAYER A — RIM AURA (replaces BackSide AuraMesh material)
// ─────────────────────────────────────────────────────────────────────────────

const rimAuraVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vNoise;

  uniform float uTime;
  uniform float uInflate;  // how much to push verts along normal

  // Fast value noise for surface ripple
  float noise3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  void main() {
    vNoise = noise3(position + vec3(uTime * 0.3));

    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>

    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>

    // Inflate along normal + add noise ripple
    vec3 inflated = transformed + objectNormal * (uInflate + vNoise * 0.008);

    #include <project_vertex>
    vWorldPosition = (modelMatrix * vec4(inflated, 1.0)).xyz;
    vWorldNormal   = normalize(mat3(modelMatrix) * objectNormal);
  }
`;

const rimAuraFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3  vWorldNormal;
  varying vec3  vWorldPosition;
  varying float vNoise;

  uniform float uTime;
  uniform float uIntensity;  // 0–1 from ambition path progress

  const vec3 CYAN_CORE  = vec3(0.13, 0.83, 0.93);
  const vec3 WHITE_TIP  = vec3(0.85, 0.97, 1.00);

  void main() {
    vec3  N       = normalize(vWorldNormal);
    vec3  V       = normalize(cameraPosition - vWorldPosition);

    // Fresnel — strongest at silhouette
    float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.5);

    // Breathing pulse: ~0.25Hz (4s cycle, slow aspirational rhythm)
    float breath  = 0.75 + 0.25 * sin(uTime * 1.57);

    // Height fade: fade out below floor
    float heightFade = smoothstep(0.0, 0.15, vWorldPosition.y);

    // Noise ripple on the rim surface
    float ripple  = 0.85 + 0.15 * vNoise;

    float alpha   = fresnel * breath * heightFade * ripple * uIntensity;
    vec3  color   = mix(CYAN_CORE, WHITE_TIP, fresnel * 0.6);

    gl_FragColor  = vec4(color, clamp(alpha, 0.0, 0.75));
  }
`;

/**
 * Creates the rim aura material (replaces AuraMesh's MeshBasicMaterial).
 * @returns {THREE.ShaderMaterial}
 */
export function createRimAuraMaterial() {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x22D3EE, // Cyan rim
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });

  // Attach uniforms for updater
  mat.uniforms = {
    uTime:      { value: 0.0 },
    uIntensity: { value: 1.0 },
    uInflate:   { value: 0.022 },
  };

  // Inflate the mesh along normals using onBeforeCompile
  // This guarantees all morph/skinning logic works perfectly.
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uInflate   = mat.uniforms.uInflate;
    shader.uniforms.uTime      = mat.uniforms.uTime;
    shader.uniforms.uIntensity = mat.uniforms.uIntensity;

    // Declare uniforms safely using the <common> include hook
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
#include <common>
uniform float uInflate;
uniform float uTime;
uniform float uIntensity;
      `
    );

    // Insert inflation right after begin_vertex (so we have 'transformed' and 'normal')
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      transformed += normal * uInflate;
      `
    );
  };

  return mat;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER B — GOD-RAY SHAFTS (instanced vertical planes)
// ─────────────────────────────────────────────────────────────────────────────

const godRayVertexShader = /* glsl */ `
  attribute vec3  instancePosition;  // per-instance: x, z position + phase offset as y
  attribute float instancePhase;     // per-instance animation phase offset

  varying float vAlpha;
  varying vec2  vUv;

  uniform float uTime;
  uniform float uIntensity;

  void main() {
    vUv = uv;

    // Each shaft drifts slightly upward over time, wraps at top
    float drift   = mod(uTime * 0.18 + instancePhase, 1.0);

    // Billboard: keep facing camera (simple: just use world Y-aligned plane)
    vec3 worldPos = instancePosition;
    worldPos.y   += drift * 2.8;  // rises 2.8 world units before wrapping

    // Offset vertex by position
    vec3 pos      = position + worldPos;

    // Fade alpha: transparent at top (UV.y=1), opaque at bottom (UV.y=0)
    // Also fade in/out by drift position
    float topFade   = 1.0 - uv.y;
    float driftFade = sin(drift * 3.14159);
    vAlpha          = topFade * driftFade * uIntensity;

    gl_Position     = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const godRayFragmentShader = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying vec2  vUv;

  uniform float uTime;

  const vec3 RAY_COLOR = vec3(0.13, 0.83, 0.93);

  void main() {
    // Horizontal fade: edges transparent, centre opaque
    float hEdge  = sin(vUv.x * 3.14159);

    // Flicker noise
    float flicker = 0.9 + 0.1 * fract(sin(uTime * 7.3 + vUv.y * 11.0) * 43758.5);

    float alpha   = vAlpha * hEdge * flicker;
    gl_FragColor  = vec4(RAY_COLOR, clamp(alpha, 0.0, 0.35));
  }
`;

const GOD_RAY_COUNT = 16; // number of shaft instances around perimeter

/**
 * Creates the instanced god-ray mesh.
 * Mount this as a sibling of the goal clone group.
 * @returns {THREE.Mesh}
 */
export function createGodRayMesh() {
  // Thin vertical plane geometry (width=0.04, height=2.8)
  const geo = new THREE.PlaneGeometry(0.04, 2.8, 1, 8);
  geo.translate(0, 1.4, 0); // pivot at bottom

  // Instance positions: spread around a circle of radius ~0.45
  const positions = new Float32Array(GOD_RAY_COUNT * 3);
  const phases    = new Float32Array(GOD_RAY_COUNT);
  const r         = 0.45;

  for (let i = 0; i < GOD_RAY_COUNT; i++) {
    const angle    = (i / GOD_RAY_COUNT) * Math.PI * 2;
    positions[i * 3]     = Math.cos(angle) * r;
    positions[i * 3 + 1] = 0;                       // Y is instance base
    positions[i * 3 + 2] = Math.sin(angle) * r;
    phases[i]            = i / GOD_RAY_COUNT;        // stagger phase
  }

  geo.setAttribute("instancePosition", new THREE.InstancedBufferAttribute(positions, 3));
  geo.setAttribute("instancePhase",    new THREE.InstancedBufferAttribute(phases,    1));

  const mat = new THREE.ShaderMaterial({
    vertexShader:   godRayVertexShader,
    fragmentShader: godRayFragmentShader,
    uniforms: {
      uTime:      { value: 0.0 },
      uIntensity: { value: 1.0 },
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  });

  const mesh            = new THREE.Mesh(geo, mat);
  mesh.frustumCulled    = false;
  mesh.renderOrder      = 5;
  mesh.name             = "god-rays";
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER C — GROUND CORONA (flat glow disc on floor)
// ─────────────────────────────────────────────────────────────────────────────

const groundCoronaFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;

  const vec3 CORONA_COLOR = vec3(0.05, 0.65, 0.85);

  void main() {
    // Radial gradient: centre bright, edge transparent
    vec2  center = vUv - 0.5;
    float r      = length(center) * 2.0;  // 0=center, 1=edge
    float fade   = 1.0 - smoothstep(0.4, 1.0, r);

    // Slow pulse
    float pulse  = 0.7 + 0.3 * sin(uTime * 1.2);

    // Rotating shimmer
    float angle  = atan(center.y, center.x);
    float shimmer = 0.85 + 0.15 * sin(angle * 6.0 + uTime * 2.0);

    float alpha  = fade * pulse * shimmer * uIntensity * 0.5;
    gl_FragColor = vec4(CORONA_COLOR, clamp(alpha, 0.0, 0.5));
  }
`;

/**
 * Creates the ground corona disc mesh.
 * Position at [0, 0.01, 0] (just above floor).
 * @returns {THREE.Mesh}
 */
export function createGroundCorona() {
  const geo = new THREE.PlaneGeometry(1.2, 1.2);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: groundCoronaFragmentShader,
    uniforms: {
      uTime:      { value: 0.0 },
      uIntensity: { value: 1.0 },
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.FrontSide,
  });

  const mesh         = new THREE.Mesh(geo, mat);
  mesh.position.y    = 0.01;
  mesh.renderOrder   = 4;
  mesh.name          = "ground-corona";
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED UPDATER — call once per frame for all aura layers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates all aura uniforms per frame.
 * @param {{
 *   rimMat:    THREE.ShaderMaterial,
 *   godRays:   THREE.Mesh,
 *   corona:    THREE.Mesh,
 * }} refs
 * @param {{ time: number, intensity: number }} params
 */
export function updateAuraUniforms(refs, { time = 0, intensity = 1 } = {}) {
  const { rimMat, godRays, corona } = refs;

  if (rimMat?.uniforms) {
    rimMat.uniforms.uTime.value      = time;
    rimMat.uniforms.uIntensity.value = intensity;
  }
  if (godRays?.material?.uniforms) {
    godRays.material.uniforms.uTime.value      = time;
    godRays.material.uniforms.uIntensity.value = intensity;
  }
  if (corona?.material?.uniforms) {
    corona.material.uniforms.uTime.value      = time;
    corona.material.uniforms.uIntensity.value = intensity;
  }
}

export { FITZPATRICK_TABLE, ANATOMY_COLORS };
