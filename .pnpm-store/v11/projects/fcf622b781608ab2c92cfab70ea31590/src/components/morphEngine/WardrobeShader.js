/**
 * GrowthTrack Ultimate — Layer 4: VFX / Shaders
 * WardrobeShader.js
 *
 * PBR cloth material system for all 7 wardrobe presets.
 * Replaces the body mesh material when wardrobeState !== ANATOMICAL.
 *
 * WARDROBE_PRESETS (from Layer 1):
 *   GYM        — compression shorts + tank top (dark navy/charcoal)
 *   CASUAL     — joggers + hoodie (heather grey)
 *   FORMAL     — dress shirt + trousers (white/charcoal)
 *   SWIMWEAR   — board shorts (bold pattern)
 *   UNDERWEAR  — boxer briefs (minimal dark grey)
 *   ANATOMICAL — nude (no cloth shader, falls back to SkinShader)
 *   BODY_COMP  — nude + heatmap overlay (SkinShader + VascularityShader)
 *
 * Each preset defines:
 *   - Primary/secondary colour
 *   - Roughness (cotton = 0.9, synthetic = 0.55, silk = 0.35)
 *   - Sheen amount (fabric micro-fibre gloss)
 *   - Coverage map: which Y-ranges are covered by cloth vs exposed skin
 *   - Procedural weave pattern type: "smooth"|"knit"|"denim"|"jersey"
 *
 * The coverage map is used by ClothCoveragePass to blend the cloth
 * material with the skin material at boundaries (neckline, sleeve edges, etc.).
 *
 * Usage:
 *   import { createClothMaterial, updateClothUniforms, WARDROBE_CONFIGS }
 *     from "./WardrobeShader";
 *
 *   const mat = createClothMaterial("GYM");
 *   mesh.material = mat;
 */

import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// WARDROBE CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const WARDROBE_CONFIGS = {

  GYM: {
    name:          "GYM",
    primaryColor:  [0.06, 0.07, 0.12],   // dark navy
    secondaryColor:[0.80, 0.82, 0.85],   // silver trim
    roughness:     0.65,                 // synthetic compression fabric
    metalness:     0.0,
    sheen:         0.4,
    sheenColor:    [0.5, 0.55, 0.65],
    weaveType:     0,                    // 0 = smooth/compression
    coverage: {
      // regions covered by fabric: [yMin, yMax]
      torso:  [1.00, 1.65],   // tank top
      lower:  [0.62, 0.96],   // compression shorts
    },
    exposedRegions: ["arms", "legs", "head", "neck"],
  },

  CASUAL: {
    name:          "CASUAL",
    primaryColor:  [0.55, 0.55, 0.55],   // heather grey
    secondaryColor:[0.30, 0.30, 0.32],   // dark grey drawstring
    roughness:     0.88,                 // cotton fleece
    metalness:     0.0,
    sheen:         0.15,
    sheenColor:    [0.6, 0.6, 0.6],
    weaveType:     1,                    // 1 = knit/fleece
    coverage: {
      torso:  [0.90, 1.72],   // hoodie (covers neck)
      lower:  [0.05, 0.95],   // joggers (near-full leg)
    },
    exposedRegions: ["hands", "head"],
  },

  FORMAL: {
    name:          "FORMAL",
    primaryColor:  [0.94, 0.94, 0.95],   // white dress shirt
    secondaryColor:[0.12, 0.12, 0.14],   // charcoal trousers
    roughness:     0.72,                 // poplin cotton
    metalness:     0.0,
    sheen:         0.25,
    sheenColor:    [0.9, 0.9, 0.9],
    weaveType:     2,                    // 2 = woven/poplin
    coverage: {
      torso:  [0.98, 1.70],
      lower:  [0.05, 0.98],
    },
    exposedRegions: ["hands", "head", "neck"],
  },

  SWIMWEAR: {
    name:          "SWIMWEAR",
    primaryColor:  [0.05, 0.35, 0.75],   // ocean blue
    secondaryColor:[1.00, 0.60, 0.10],   // orange stripe
    roughness:     0.55,                 // quick-dry nylon
    metalness:     0.0,
    sheen:         0.55,
    sheenColor:    [0.3, 0.6, 0.9],
    weaveType:     0,                    // smooth nylon
    coverage: {
      lower:  [0.68, 0.96],   // board shorts only
    },
    exposedRegions: ["torso", "arms", "legs", "head", "neck"],
  },

  UNDERWEAR: {
    name:          "UNDERWEAR",
    primaryColor:  [0.10, 0.10, 0.12],   // near-black
    secondaryColor:[0.25, 0.25, 0.30],   // grey waistband
    roughness:     0.70,
    metalness:     0.0,
    sheen:         0.3,
    sheenColor:    [0.4, 0.4, 0.45],
    weaveType:     1,                    // jersey knit
    coverage: {
      lower: [0.72, 0.97],
    },
    exposedRegions: ["torso", "arms", "legs", "head", "neck"],
  },

  // ANATOMICAL + BODY_COMP: no cloth shader (skin shader takes over)
  ANATOMICAL: null,
  BODY_COMP:  null,
};

// ─────────────────────────────────────────────────────────────────────────────
// VERTEX SHADER
// ─────────────────────────────────────────────────────────────────────────────

const clothVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>

  varying vec3  vWorldPosition;
  varying vec3  vWorldNormal;
  varying vec2  vUv;
  varying vec3  vViewDir;

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
    vViewDir       = normalize(cameraPosition - worldPos.xyz);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT SHADER
// ─────────────────────────────────────────────────────────────────────────────

const clothFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3  vWorldPosition;
  varying vec3  vWorldNormal;
  varying vec2  vUv;
  varying vec3  vViewDir;

  uniform vec3  uPrimaryColor;
  uniform vec3  uSecondaryColor;
  uniform float uRoughness;
  uniform float uSheen;
  uniform vec3  uSheenColor;
  uniform int   uWeaveType;      // 0=smooth, 1=knit, 2=woven, 3=jersey

  // Coverage uniforms: cloth only renders in these Y bands
  // Up to 2 covered bands (torso + lower, or just lower)
  uniform vec2  uCovBand1;    // [yMin, yMax], vec2(-1,-1) = unused
  uniform vec2  uCovBand2;    // [yMin, yMax]
  uniform float uEdgeFeather; // blend width at fabric edges

  // ── Micro-fabric weave patterns ────────────────────────────────────────────
  // Returns a surface variation value 0–1 that modulates roughness + color.

  // Type 0: Smooth/compression — minimal texture, subtle sheen lines
  float weaveSmooth(vec2 uv) {
    float lines = abs(sin(uv.y * 280.0)) * 0.04;
    return 1.0 - lines;
  }

  // Type 1: Knit/fleece — purl stitch loop pattern
  float weaveKnit(vec2 uv) {
    vec2  p   = uv * vec2(60.0, 90.0);
    float col = floor(p.x);
    float row = floor(p.y);
    vec2  f   = fract(p) - 0.5;
    // Offset alternate columns
    if (mod(col, 2.0) < 1.0) f.y = fract(p.y + 0.5) - 0.5;
    float loop = 1.0 - smoothstep(0.18, 0.30, length(f));
    return 0.88 + loop * 0.12;
  }

  // Type 2: Woven/poplin — tight crosshatch
  float weaveWoven(vec2 uv) {
    vec2  p   = uv * 160.0;
    float h   = abs(sin(p.x)) * abs(cos(p.y));
    float v   = abs(sin(p.y)) * abs(cos(p.x));
    float weave = max(h, v);
    return 0.90 + weave * 0.10;
  }

  // Type 3: Jersey — angled rib
  float weaveJersey(vec2 uv) {
    float rib = abs(sin((uv.x * 45.0 + uv.y * 15.0) * 3.14159));
    return 0.88 + rib * 0.12;
  }

  float sampleWeave(vec2 uv, int type) {
    if (type == 1) return weaveKnit(uv);
    if (type == 2) return weaveWoven(uv);
    if (type == 3) return weaveJersey(uv);
    return weaveSmooth(uv);
  }

  // ── Coverage alpha (1 = cloth, 0 = skin shows through) ───────────────────
  float coverageAlpha(float y) {
    float a1 = 0.0;
    float a2 = 0.0;

    if (uCovBand1.x > -0.5) {
      a1 = smoothstep(uCovBand1.x, uCovBand1.x + uEdgeFeather, y) *
           (1.0 - smoothstep(uCovBand1.y - uEdgeFeather, uCovBand1.y, y));
    }
    if (uCovBand2.x > -0.5) {
      a2 = smoothstep(uCovBand2.x, uCovBand2.x + uEdgeFeather, y) *
           (1.0 - smoothstep(uCovBand2.y - uEdgeFeather, uCovBand2.y, y));
    }

    return clamp(a1 + a2, 0.0, 1.0);
  }

  // ── Fabric lighting model ─────────────────────────────────────────────────
  // Cloth uses a simplified Oren-Nayar diffuse + Ashikhmin-Shirley sheen.

  float orenNayarDiffuse(vec3 N, vec3 L, vec3 V, float roughness) {
    float NdL   = max(0.0, dot(N, L));
    float NdV   = max(0.0, dot(N, V));
    float r2    = roughness * roughness;
    float A     = 1.0 - (0.5 * r2 / (r2 + 0.33));
    float B     = 0.45 * r2 / (r2 + 0.09);
    float gamma = dot(normalize(V - N * NdV), normalize(L - N * NdL));
    float C     = max(0.0, gamma) * max(sin(acos(NdV)), sin(acos(NdL)));
    return NdL * (A + B * C);
  }

  float sheenPeak(float NdH, float sheen) {
    return sheen * pow(1.0 - NdH, 5.0) * 4.0;
  }

  void main() {
    vec3  N   = normalize(vWorldNormal);
    vec3  V   = normalize(vViewDir);

    // ── Coverage check — discard fragments outside cloth bands ────────────
    float covAlpha = coverageAlpha(vWorldPosition.y);
    if (covAlpha < 0.01) discard;

    // ── Weave texture ──────────────────────────────────────────────────────
    float weave      = sampleWeave(vUv, uWeaveType);
    float roughFinal = clamp(uRoughness * (2.0 - weave), 0.3, 1.0);

    // ── Stripe pattern for swimwear secondary color ────────────────────────
    float stripe = step(0.82, fract(vUv.x * 6.0 + vUv.y * 2.0));
    vec3  baseColor = mix(uPrimaryColor, uSecondaryColor, stripe * 0.4);

    // ── Studio lights (mirror of Layer 2) ─────────────────────────────────
    vec3  lights[3];
    vec3  lightColors[3];
    float lightInts[3];
    lights[0]     = normalize(vec3(3.0, -5.0, -3.0));   // key
    lights[1]     = normalize(vec3(-4.0, -2.0, -2.0));  // fill
    lights[2]     = normalize(vec3(0.0, -1.0, 5.0));    // rim
    lightColors[0] = vec3(1.00, 0.96, 0.88);
    lightColors[1] = vec3(0.84, 0.93, 1.00);
    lightColors[2] = vec3(0.53, 0.60, 1.00);
    lightInts[0]  = 2.2;
    lightInts[1]  = 0.7;
    lightInts[2]  = 1.2;

    vec3 diffuse = vec3(0.0);
    vec3 sheen   = vec3(0.0);

    for (int i = 0; i < 3; i++) {
      vec3  L   = -lights[i];
      vec3  H   = normalize(L + V);
      float NdH = max(0.0, dot(N, H));
      float od  = orenNayarDiffuse(N, L, V, roughFinal);
      diffuse  += lightColors[i] * lightInts[i] * od;
      sheen    += lightColors[i] * uSheenColor * sheenPeak(NdH, uSheen) * lightInts[i] * 0.25;
    }

    // ── Ambient ────────────────────────────────────────────────────────────
    float ao      = 0.5 + 0.5 * dot(N, vec3(0.0, 1.0, 0.0));
    vec3  ambient = vec3(0.04, 0.04, 0.06) * ao;

    vec3 finalColor = baseColor * (diffuse + ambient) + sheen;

    // ── Edge seam darkening (fabric fold shadow at coverage boundary) ──────
    float seam  = 1.0 - smoothstep(0.85, 1.0, covAlpha);
    finalColor *= mix(1.0, 0.75, seam * 0.4);

    gl_FragColor = vec4(finalColor, covAlpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a cloth ShaderMaterial for the given wardrobe preset.
 * Returns null for ANATOMICAL and BODY_COMP (skin shader handles those).
 *
 * @param {string} preset - key from WARDROBE_PRESETS
 * @returns {THREE.ShaderMaterial | null}
 */
export function createClothMaterial(preset = "GYM") {
  const config = WARDROBE_CONFIGS[preset];
  if (!config) return null; // ANATOMICAL / BODY_COMP

  // Parse coverage bands
  const bands  = Object.values(config.coverage ?? {});
  const band1  = bands[0] ? new THREE.Vector2(bands[0][0], bands[0][1]) : new THREE.Vector2(-1, -1);
  const band2  = bands[1] ? new THREE.Vector2(bands[1][0], bands[1][1]) : new THREE.Vector2(-1, -1);

  return new THREE.ShaderMaterial({
    vertexShader:   clothVertexShader,
    fragmentShader: clothFragmentShader,
    uniforms: {
      uPrimaryColor:   { value: new THREE.Color(...config.primaryColor) },
      uSecondaryColor: { value: new THREE.Color(...config.secondaryColor) },
      uRoughness:      { value: config.roughness },
      uSheen:          { value: config.sheen },
      uSheenColor:     { value: new THREE.Color(...config.sheenColor) },
      uWeaveType:      { value: config.weaveType },
      uCovBand1:       { value: band1 },
      uCovBand2:       { value: band2 },
      uEdgeFeather:    { value: 0.04 },
    },
    skinning:     true,
    morphTargets: true,
    morphNormals: true,
    transparent:  true,   // needed for coverage alpha + edge fade
    depthWrite:   true,
    side:         THREE.FrontSide,
  });
}

/**
 * Switches wardrobe preset on an existing material by updating uniforms.
 * More efficient than destroying and recreating the material.
 *
 * @param {THREE.ShaderMaterial} mat
 * @param {string} preset
 */
export function switchWardrobePreset(mat, preset) {
  const config = WARDROBE_CONFIGS[preset];
  if (!config || !mat?.uniforms) return;

  const bands = Object.values(config.coverage ?? {});
  const band1 = bands[0] ? new THREE.Vector2(bands[0][0], bands[0][1]) : new THREE.Vector2(-1, -1);
  const band2 = bands[1] ? new THREE.Vector2(bands[1][0], bands[1][1]) : new THREE.Vector2(-1, -1);

  mat.uniforms.uPrimaryColor.value.setRGB(...config.primaryColor);
  mat.uniforms.uSecondaryColor.value.setRGB(...config.secondaryColor);
  mat.uniforms.uRoughness.value   = config.roughness;
  mat.uniforms.uSheen.value       = config.sheen;
  mat.uniforms.uSheenColor.value.setRGB(...config.sheenColor);
  mat.uniforms.uWeaveType.value   = config.weaveType;
  mat.uniforms.uCovBand1.value.copy(band1);
  mat.uniforms.uCovBand2.value.copy(band2);
}

/**
 * Returns whether a given wardrobe preset uses cloth (true)
 * or falls back to skin/anatomical shader (false).
 * @param {string} preset
 */
export function isClothPreset(preset) {
  return !!WARDROBE_CONFIGS[preset];
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE MAP HELPER
// Returns which body regions are exposed (skin shader) vs covered (cloth)
// Used by HumanoidClone to decide whether to render skin or cloth on each mesh.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the list of exposed region names for a given wardrobe preset.
 * @param {string} preset
 * @returns {string[]}
 */
export function getExposedRegions(preset) {
  return WARDROBE_CONFIGS[preset]?.exposedRegions ?? [];
}
