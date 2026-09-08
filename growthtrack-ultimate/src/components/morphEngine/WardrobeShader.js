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
export function createClothMaterial(preset = 'GYM', geometry = null) {
  const config = WARDROBE_CONFIGS[preset];
  if (!config) return null;
  geometry?.computeBoundingBox();
  const box = geometry?.boundingBox;
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(...config.primaryColor), roughness: Math.max(.8, config.roughness),
    metalness: 0, sheen: .06, sheenRoughness: .85, clearcoat: 0, envMapIntensity: .3,
    side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const uniforms = {
    uClothMin: { value: box?.min.y ?? -.81676 },
    uClothScale: { value: 1.92 / Math.max(.1, box ? box.max.y-box.min.y : 1.66589) },
    uTorsoBand: { value: new THREE.Vector2(...(config.coverage.torso || [-1,-1])) },
    uLowerBand: { value: new THREE.Vector2(...(config.coverage.lower || [-1,-1])) },
    uTorsoWidth: { value: preset === 'GYM' ? .245 : .53 },
    uLowerColor: { value: new THREE.Color(...(preset === 'FORMAL' ? config.secondaryColor : config.primaryColor)) },
  };
  material.customProgramCacheKey = () => 'cloth-pbr-' + preset;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vClothPosition;\nuniform float uClothMin;\nuniform float uClothScale;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvClothPosition = vec3(position.x * uClothScale, (position.y-uClothMin) * uClothScale, position.z * uClothScale);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vClothPosition;\nuniform vec2 uTorsoBand;\nuniform vec2 uLowerBand;\nuniform float uTorsoWidth;\nuniform vec3 uLowerColor;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        bool lowerCloth = vClothPosition.y >= uLowerBand.x && vClothPosition.y <= uLowerBand.y;
        bool torsoCloth = vClothPosition.y >= uTorsoBand.x && vClothPosition.y <= uTorsoBand.y && abs(vClothPosition.x) < uTorsoWidth;
        if (!lowerCloth && !torsoCloth) discard;
        if (lowerCloth) diffuseColor.rgb = uLowerColor;
        diffuseColor.rgb *= .97 + .03 * abs(sin(vClothPosition.y * 700.0));`);
  };
  return material;
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
  if (!config || !mat) return;

  // Cloth materials are rebuilt when the body geometry changes, but this
  // helper remains safe for callers that want to update an existing material.
  // MeshPhysicalMaterial keeps its visible colour on `color`; shader uniforms
  // are only available after `onBeforeCompile` has run.
  if (mat.color?.setRGB) mat.color.setRGB(...config.primaryColor);
  mat.userData = { ...mat.userData, wardrobePreset: preset, wardrobeConfig: config };
  if (!mat.uniforms) return;

  const bands = Object.values(config.coverage ?? {});
  const band1 = bands[0] ? new THREE.Vector2(bands[0][0], bands[0][1]) : new THREE.Vector2(-1, -1);
  const band2 = bands[1] ? new THREE.Vector2(bands[1][0], bands[1][1]) : new THREE.Vector2(-1, -1);

  mat.uniforms.uPrimaryColor?.value?.setRGB?.(...config.primaryColor);
  mat.uniforms.uSecondaryColor?.value?.setRGB?.(...config.secondaryColor);
  if (mat.uniforms.uRoughness) mat.uniforms.uRoughness.value = config.roughness;
  if (mat.uniforms.uSheen) mat.uniforms.uSheen.value = config.sheen;
  mat.uniforms.uSheenColor?.value?.setRGB?.(...config.sheenColor);
  if (mat.uniforms.uWeaveType) mat.uniforms.uWeaveType.value = config.weaveType;
  mat.uniforms.uCovBand1?.value?.copy?.(band1);
  mat.uniforms.uCovBand2?.value?.copy?.(band2);
  if (mat.uniforms.uStripeStrength) mat.uniforms.uStripeStrength.value = preset === "SWIMWEAR" ? 0.4 : 0.0;
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
