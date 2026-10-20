import * as THREE from 'three';

export const FITZPATRICK_TABLE = Object.freeze([
  { base: [1.00, 0.91, 0.84], sss: [1.00, 0.72, 0.64], spec: [0.95, 0.85, 0.80] },
  { base: [0.96, 0.82, 0.68], sss: [0.98, 0.62, 0.52], spec: [0.90, 0.80, 0.72] },
  { base: [0.91, 0.72, 0.54], sss: [0.92, 0.55, 0.42], spec: [0.85, 0.72, 0.60] },
  { base: [0.78, 0.52, 0.26], sss: [0.85, 0.40, 0.25], spec: [0.72, 0.58, 0.40] },
  { base: [0.55, 0.34, 0.16], sss: [0.70, 0.28, 0.15], spec: [0.58, 0.42, 0.28] },
  { base: [0.30, 0.18, 0.08], sss: [0.50, 0.18, 0.08], spec: [0.40, 0.28, 0.18] },
]);

// Median linear colour of the body albedo (MakeHuman young_lightskinned_male,
// measured from the CC0 source). The texture already carries a tan skin tone,
// so multiplying it by a full Fitzpatrick colour applied the tone twice and
// rendered saturated orange. Textured skin is tinted relative to this instead.
export const BODY_ALBEDO_REFERENCE = Object.freeze([0.776, 0.429, 0.27]);
// Wide enough to reach type VI (≈0.03× the texture's blue) and type I.
const TINT_RANGE = Object.freeze([0.02, 2.5]);

/** Material colour for a target tone: the tone itself without a texture, or
    the per-channel ratio to the texture's own tone (clamped) with one. */
export function skinAlbedoTint(base, textured) {
  if (!textured) return base;
  return base.map((value, channel) => Math.min(TINT_RANGE[1], Math.max(TINT_RANGE[0], value / BODY_ALBEDO_REFERENCE[channel])));
}

// The table is written in display (sRGB) values; materials, the texture
// reference and hex colours are all linear. Comparing the two directly kept
// the texture's own light tone for every type and shifted it towards green.
const toLinear = rgb => {
  const color = new THREE.Color().setRGB(...rgb, THREE.SRGBColorSpace);
  return [color.r, color.g, color.b];
};
const FITZPATRICK_LINEAR = Object.freeze(FITZPATRICK_TABLE.map(tone => Object.freeze({
  base: toLinear(tone.base),
  sss: toLinear(tone.sss),
  spec: toLinear(tone.spec),
})));

function toneFrom(toneOrColor) {
  if (typeof toneOrColor === 'number') {
    return FITZPATRICK_LINEAR[Math.max(0, Math.min(5, Math.round(toneOrColor)))];
  }

  const baseColor = new THREE.Color(toneOrColor || '#C68642');
  const scatterColor = baseColor.clone().lerp(new THREE.Color('#ff8068'), 0.34);
  const specularColor = baseColor.clone().lerp(new THREE.Color('#fff2e8'), 0.58);
  return {
    base: baseColor.toArray(),
    sss: scatterColor.toArray(),
    spec: specularColor.toArray(),
  };
}

// Pubic hair density for the profile's body-hair pattern; unset reads as natural.
const PUBIC_HAIR_BY_PATTERN = Object.freeze({ none: 0, light: 0.5, natural: 0.9, defined: 1 });
export function pubicHairDensity(pattern) {
  return PUBIC_HAIR_BY_PATTERN[String(pattern || 'natural').toLowerCase()] ?? PUBIC_HAIR_BY_PATTERN.natural;
}

function installSurfaceDetailShader(material) {
  material.customProgramCacheKey = () => 'growthtrack-physical-skin-v5';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uVascularityIntensity = material.uniforms.uVascularityIntensity;
    shader.uniforms.uBodyHairIntensity = material.uniforms.uBodyHairIntensity;
    shader.uniforms.uPubicHair = material.uniforms.uPubicHair;
    shader.uniforms.uPubicHairColor = material.uniforms.uPubicHairColor;
    shader.uniforms.uPubicOrigin = material.uniforms.uPubicOrigin;
    shader.uniforms.uUnitsPerCm = material.uniforms.uUnitsPerCm;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vGrowthTrackBasePosition;
         varying vec2 vGrowthTrackSkinUv;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vGrowthTrackBasePosition = position;
         vGrowthTrackSkinUv = uv;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uVascularityIntensity;
         uniform float uBodyHairIntensity;
         uniform float uPubicHair;
         uniform vec3 uPubicHairColor;
         uniform vec3 uPubicOrigin;
         uniform float uUnitsPerCm;
         varying vec3 vGrowthTrackBasePosition;
         varying vec2 vGrowthTrackSkinUv;

         float growthTrackHash(vec2 p) {
           return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
         }

         // Smoothly interpolated value noise: continuous, so it never renders
         // as per-texel dots the way thresholded hash cells did.
         float growthTrackValueNoise(vec2 p) {
           vec2 i = floor(p);
           vec2 f = fract(p);
           f = f * f * (3.0 - 2.0 * f);
           float a = growthTrackHash(i);
           float b = growthTrackHash(i + vec2(1.0, 0.0));
           float c = growthTrackHash(i + vec2(0.0, 1.0));
           float d = growthTrackHash(i + vec2(1.0, 1.0));
           return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
         }

         // Fine hair is below screen resolution at viewing distance; render
         // its density as soft shading in hair-bearing regions, not as dots.
         float growthTrackBodyHair(vec3 p, vec2 uv) {
           float torso = smoothstep(0.10, 0.22, p.y) * (1.0 - smoothstep(0.53, 0.66, p.y))
             * (1.0 - smoothstep(0.16, 0.31, abs(p.x)));
           float limbs = smoothstep(0.16, 0.30, abs(p.x)) * (1.0 - smoothstep(0.53, 0.72, abs(p.x)));
           float legs = (1.0 - smoothstep(-0.20, 0.02, p.y)) * smoothstep(0.07, 0.16, abs(p.x));
           float region = clamp(torso * 0.72 + limbs * 0.30 + legs * 0.38, 0.0, 1.0);
           float density = 0.65 + 0.35 * growthTrackValueNoise(uv * 38.0);
           return region * density;
         }

         // Pubic hair over the mons pubis and into the groin folds, in cm
         // from the skin junction at the shaft root (x lateral, y up, z
         // forward), with a ragged border and uneven density.
         float growthTrackPubicHair(vec3 p, vec2 uv) {
           float jitter = growthTrackValueNoise(uv * 140.0) - 0.5;
           float top = 8.5 + 1.4 * (growthTrackValueNoise(vec2(p.x * 0.35, 3.0)) - 0.5);
           float halfWidth = mix(3.0, 8.0, smoothstep(-1.5, 7.0, p.y));
           float lateral = 1.0 - smoothstep(halfWidth - 1.6, halfWidth + 1.0, abs(p.x) + jitter * 1.5);
           float vertical = smoothstep(-4.0, -1.0, p.y + jitter) * (1.0 - smoothstep(top - 1.8, top + 0.6, p.y + jitter * 1.2));
           float crease = (1.0 - smoothstep(0.0, 2.2, abs(abs(p.x) - 4.5 + p.y * 0.3)))
             * smoothstep(-6.0, -1.0, p.y) * (1.0 - smoothstep(-1.0, 1.0, p.y)) * 0.6;
           // A sparse midline trail fading out towards the navel.
           float trail = (1.0 - smoothstep(0.6, 1.6, abs(p.x) + jitter)) * smoothstep(6.0, 8.5, p.y)
             * (1.0 - smoothstep(11.0, 15.0, p.y + jitter * 2.0)) * 0.45;
           float front = smoothstep(-7.0, -3.5, p.z);
           float density = 0.72 + 0.28 * growthTrackValueNoise(uv * 60.0);
           return clamp(max(max(lateral * vertical, crease), trail) * front * density, 0.0, 1.0);
         }

         // Sub-millimetre curled strands where the camera can resolve them;
         // fade to their average coverage at a distance instead of aliasing
         // into dots or painting the entire region with the hair colour.
         float growthTrackPubicStrands(vec2 p) {
           vec2 cell = p * vec2(10.0, 6.0);
           float bend = 0.35 * sin(cell.y * 1.4 + growthTrackValueNoise(vec2(floor(cell.x), 3.0)) * 6.28318);
           float lineDistance = abs(fract(cell.x + bend) - 0.5);
           float footprint = max(fwidth(cell.x + bend), 0.001);
           float strands = 1.0 - smoothstep(0.055, 0.055 + footprint * 0.75, lineDistance);
           float breakup = smoothstep(0.2, 0.6, growthTrackValueNoise(cell * vec2(0.8, 0.3)));
           float resolved = 1.0 - smoothstep(0.35, 1.2, footprint);
           return mix(0.14, strands * breakup * 0.68, resolved);
         }

         // Thin continuous ridges of smooth noise read as superficial veins.
         float growthTrackVeins(vec2 uv) {
           float n = growthTrackValueNoise(uv * 22.0) * 0.65 + growthTrackValueNoise(uv * 47.0) * 0.35;
           float ridge = 1.0 - abs(2.0 * n - 1.0);
           return smoothstep(0.86, 0.97, ridge);
         }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float vein = growthTrackVeins(vGrowthTrackSkinUv) * clamp(uVascularityIntensity, 0.0, 1.0);
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.80, 0.85, 0.95), vein * 0.32);
         float bodyHair = growthTrackBodyHair(vGrowthTrackBasePosition, vGrowthTrackSkinUv)
           * clamp(uBodyHairIntensity, 0.0, 1.0);
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.78, 0.74, 0.72), bodyHair * 0.35);
         if (uPubicHair > 0.0 && uUnitsPerCm > 0.0) {
           vec3 regionPosition = (vGrowthTrackBasePosition - uPubicOrigin) / uUnitsPerCm;
           float pubic = growthTrackPubicHair(regionPosition, vGrowthTrackSkinUv);
           float coverage = growthTrackPubicStrands(regionPosition.xy);
           diffuseColor.rgb = mix(diffuseColor.rgb, uPubicHairColor, pubic * coverage * clamp(uPubicHair, 0.0, 1.0));
         }`,
      );
  };
}

export function createPhysicalSkinMaterial(toneOrColor = 3, mapOrMaterial = null, options = {}) {
  const tone = toneFrom(/^#[0-9a-f]{6}$/i.test(String(options.skinColorHex || '')) ? String(options.skinColorHex) : toneOrColor);
  const sourceMaterial = mapOrMaterial?.isMaterial ? mapOrMaterial : null;
  const map = sourceMaterial?.map || (mapOrMaterial?.isTexture ? mapOrMaterial : null);
  const surfaceDetail = Boolean(sourceMaterial && options.surfaceDetail !== false);
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(...skinAlbedoTint(tone.base, Boolean(map))),
    roughness: THREE.MathUtils.clamp(sourceMaterial?.roughness ?? 0.56, 0.44, 0.72),
    metalness: 0,
    map,
    normalMap: sourceMaterial?.normalMap || null,
    normalScale: sourceMaterial?.normalScale?.clone?.() || new THREE.Vector2(0.52, 0.52),
    roughnessMap: sourceMaterial?.roughnessMap || null,
    metalnessMap: sourceMaterial?.metalnessMap || null,
    // Improved SSS simulation:
    // clearcoat = wet micro-film on skin surface (sweat, oil)
    clearcoat: 0.08,
    clearcoatRoughness: 0.50,
    // sheen = back-scatter approximation (fibrous skin texture)
    sheen: 0.22,
    sheenColor: new THREE.Color(...tone.sss).offsetHSL(0.02, 0.08, 0.06),
    sheenRoughness: 0.62,
    // Warm emissive simulates indirect subsurface light bleeding through skin
    emissive: new THREE.Color(...tone.sss),
    emissiveIntensity: 0.028,
    // Skin is opaque. Transmission made the body look waxy and added an
    // unnecessary full-scene refraction render for every figure.
    transmission: 0,
    thickness: 0.18,
    attenuationColor: new THREE.Color(...tone.sss),
    attenuationDistance: 0.62,
    ior: 1.42,
    specularIntensity: 0.38,
    specularColor: new THREE.Color('#fff3e8'),  // warm specular tint for skin
    envMapIntensity: sourceMaterial?.envMapIntensity ?? 1.18,
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true,
    vertexColors: options.vertexColors ?? sourceMaterial?.vertexColors ?? false,
  });

  // AO is deliberately not copied: this asset has only TEXCOORD_0, while
  // Three.js samples aoMap from UV2. The export pipeline bakes AO into albedo.
  material.userData = {
    ...(material.userData ?? {}),
    growthTrackSkinMaterial: true,
    aoStrategy: 'baked-base-color',
    // Shown only while the anatomy is revealed (HumanoidClone sets uPubicHair).
    pubicHairDensity: options.pubicRegion ? pubicHairDensity(options.pubicRegion.pattern) : 0,
  };
  material.uniforms = {
    uBaseColor: { value: new THREE.Color(...tone.base) },
    uSSSColor: { value: new THREE.Color(...tone.sss) },
    uSpecColor: { value: new THREE.Color(...tone.spec) },
    uAnatomyDepth: { value: 100 },
    uVascularityIntensity: { value: Number(options.vascularityIntensity) || 0 },
    uBodyHairIntensity: { value: Number(options.bodyHairIntensity) || 0 },
    // Off until the anatomy is revealed; the density is kept in userData.
    uPubicHair: { value: 0 },
    uPubicHairColor: { value: new THREE.Color(options.pubicRegion?.color || '#2c1a0a') },
    uPubicOrigin: { value: new THREE.Vector3(...(options.pubicRegion?.origin || [0, 0, 0])) },
    uUnitsPerCm: { value: Number(options.pubicRegion?.unitsPerCm) || 0 },
    uTime: { value: 0 },
  };
  if (surfaceDetail) installSurfaceDetailShader(material);
  return material;
}

export function updatePhysicalSkinMaterial(material, {
  fitzpatrickIndex = 3,
  skinColorHex = null,
  anatomyDepth = 100,
  vascularityIntensity = 0,
  bodyHairIntensity = 0,
  time = 0,
} = {}) {
  // Delta, aura and other diagnostic ShaderMaterials also expose `uniforms`.
  // Only mutate materials created by this factory; otherwise a missing skin
  // uniform can throw once per animation frame and stall mode transitions.
  if (!material?.userData?.growthTrackSkinMaterial || !material?.uniforms) return;
  const tone = /^#[0-9a-f]{6}$/i.test(String(skinColorHex || ''))
    ? toneFrom(String(skinColorHex))
    : toneFrom(fitzpatrickIndex);
  material.color?.setRGB(...skinAlbedoTint(tone.base, Boolean(material.map)));
  material.emissive?.setRGB(...tone.sss);
  material.attenuationColor?.setRGB(...tone.sss);
  material.sheenColor?.setRGB(...tone.sss);
  material.specularColor?.set('#fff5ef');
  material.uniforms.uBaseColor.value.setRGB(...tone.base);
  material.uniforms.uSSSColor.value.setRGB(...tone.sss);
  material.uniforms.uSpecColor.value.setRGB(...tone.spec);
  material.uniforms.uAnatomyDepth.value = anatomyDepth;
  material.uniforms.uVascularityIntensity.value = vascularityIntensity;
  material.uniforms.uBodyHairIntensity.value = bodyHairIntensity;
  material.uniforms.uTime.value = time;
}
