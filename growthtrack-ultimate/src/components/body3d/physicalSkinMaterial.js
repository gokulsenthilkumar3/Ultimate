import * as THREE from 'three';
import { SKIN_APPEARANCE_PRESETS } from '../../lib/skinAppearancePresets';
import {resolveSkinAppearance,skinLayerMultiplier,skinOpticsGLSL} from './skinAppearance';
import { resolveTanPattern, tanLineUniforms, TAN_LINES_GLSL } from './skinTanLines';
import { freckleUniforms, FRECKLES_GLSL } from './skinFreckles';
import {HUMAN_SURFACE,microStrength} from '../../lib/humanSurface';
import {resolveHumanRealism} from '../../lib/appearanceDetail';

export const FITZPATRICK_TABLE = Object.freeze(SKIN_APPEARANCE_PRESETS.map(({hex}) => ({
  base: [1,3,5].map(start => parseInt(hex.slice(start,start+2),16)/255),
  sss: [0.88,0.44,0.35], spec: [1,1,1],
})));

// Median linear colour of the body albedo (MakeHuman young_lightskinned_male,
// measured from the CC0 source). The texture already carries a tan skin tone,
// so multiplying it by a full Fitzpatrick colour applied the tone twice and
// rendered saturated orange. Textured skin is tinted relative to this instead.
export const BODY_ALBEDO_REFERENCE = Object.freeze([0.776, 0.429, 0.27]);
// Wide enough to reach type VI (≈0.03× the texture's blue) and type I.
const TINT_RANGE = Object.freeze([0.02, 2.5]);

/** Material colour for a target tone: the tone itself without a texture, or
    the per-channel ratio to the texture's own tone (clamped) with one. */
export function skinAlbedoTint(base, textured, reference=BODY_ALBEDO_REFERENCE) {
  if (!textured) return base;
  return base.map((value, channel) => Math.min(TINT_RANGE[1], Math.max(TINT_RANGE[0], value / reference[channel])));
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

  const baseColor = new THREE.Color(toneOrColor || SKIN_APPEARANCE_PRESETS[3].hex);
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

// Dimensionless angular broadening, not a mean-free-path or tissue thickness.
// This single-pass approximation redistributes direct diffuse light; it does
// not compute diffusion, transmission through ears, or screen-space transport.
export const SKIN_SCATTERING_DEFAULTS = Object.freeze({ strength: 0.22, wrap: 0.4 });
const SCATTERING_CHANNEL_SPREAD = Object.freeze([1, 0.35, 0.18]);

export function resolveSkinScattering(settings) {
  const bounded = (value, fallback) => Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : fallback;
  return {
    strength: settings === false ? 0 : bounded(settings?.strength, SKIN_SCATTERING_DEFAULTS.strength),
    wrap: bounded(settings?.wrap, SKIN_SCATTERING_DEFAULTS.wrap),
  };
}

function installSkinScatteringShader(material) {
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.customProgramCacheKey = () => `${previousKey}-normalized-skin-wrap-v1`;
  material.onBeforeCompile = (shader, ...args) => {
    previousCompile.call(material, shader, ...args);
    const anchor = '#include <lights_physical_pars_fragment>';
    if (!shader.fragmentShader.includes(anchor)) {
      material.userData.skinScattering.shaderStatus = 'unsupported-shader';
      return;
    }
    material.userData.skinScattering.shaderStatus = 'installed';
    shader.uniforms.uSkinScatteringStrength = material.uniforms.uSkinScatteringStrength;
    shader.uniforms.uSkinScatteringWrap = material.uniforms.uSkinScatteringWrap;
    shader.fragmentShader = shader.fragmentShader.replace(anchor, `${anchor}
      uniform float uSkinScatteringStrength;
      uniform vec3 uSkinScatteringWrap;

      // Keep the stock physical specular/clearcoat/sheen calculations. Only
      // redistribute the diffuse term, using the SAME shadow-attenuated light
      // that Three.js supplies to its direct-light equation.
      void RE_Direct_GrowthTrackSkin(
        const in IncidentLight directLight,
        const in vec3 geometryPosition,
        const in vec3 geometryNormal,
        const in vec3 geometryViewDir,
        const in vec3 geometryClearcoatNormal,
        const in PhysicalMaterial material,
        inout ReflectedLight reflectedLight
      ) {
        RE_Direct_Physical(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
        if (uSkinScatteringStrength > 0.0) {
          float cosine = dot(geometryNormal, directLight.direction);
          vec3 spread = uSkinScatteringWrap;
          // Integral over the sphere equals Lambert's pi for each channel:
          // integral[-w,1] (x+w)/(1+w)^2 dx = 1/2.
          // Red spreads farther than green/blue, without adding a red light.
          vec3 wrapped = max(vec3(cosine) + spread, vec3(0.0)) / ((vec3(1.0) + spread) * (vec3(1.0) + spread));
          float sheenCompensation = 1.0;
          #ifdef USE_SHEEN
            float skinSheenV = IBLSheenBRDF(geometryNormal, geometryViewDir, material.sheenRoughness);
            float skinSheenL = IBLSheenBRDF(geometryNormal, directLight.direction, material.sheenRoughness);
            sheenCompensation = 1.0 - max3(material.sheenColor) * max(skinSheenV, skinSheenL);
          #endif
          reflectedLight.directDiffuse += directLight.color * BRDF_Lambert(material.diffuseContribution)
            * (wrapped - vec3(max(cosine, 0.0))) * uSkinScatteringStrength * sheenCompensation;
        }
      }
      #undef RE_Direct
      #define RE_Direct RE_Direct_GrowthTrackSkin
    `);
  };
}

function installSurfaceDetailShader(material) {
  material.customProgramCacheKey = () => 'growthtrack-physical-skin-v12-human-realism';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uVascularityIntensity = material.uniforms.uVascularityIntensity;
    shader.uniforms.uBodyHairIntensity = material.uniforms.uBodyHairIntensity;
    shader.uniforms.uPubicHair = material.uniforms.uPubicHair;
    shader.uniforms.uPubicHairColor = material.uniforms.uPubicHairColor;
    shader.uniforms.uPubicOrigin = material.uniforms.uPubicOrigin;
    shader.uniforms.uUnitsPerCm = material.uniforms.uUnitsPerCm;
    shader.uniforms.uSkinLayers = material.uniforms.uSkinLayers;
    shader.uniforms.uSkinMicroDetail = material.uniforms.uSkinMicroDetail;
    shader.uniforms.uHumanRealism = material.uniforms.uHumanRealism;
    for(const key of ['uSkinMicroTile','uSkinMicroStrength','uSkinMicroReady'])shader.uniforms[key]=material.uniforms[key];
    shader.uniforms.uFreckles = material.uniforms.uFreckles;
    for(const key of ['uTanPattern','uTanLower','uTanTorso','uTanTank','uTanSleeves'])shader.uniforms[key]=material.uniforms[key];
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vGrowthTrackBasePosition;
         varying vec3 vFreckleNormal;
         varying vec2 vGrowthTrackSkinUv;
         attribute float skinExposure;
         attribute float skinBlood;
         attribute float skinRoughness;
         attribute vec4 skinTanRegions;
         attribute vec2 skinTanCoordinates;
         varying vec4 vSkinTanRegions;
         varying vec2 vSkinTanCoordinates;
         varying float vSkinRoughness;
         varying vec2 vSkinRegion;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vGrowthTrackBasePosition = position;
         vFreckleNormal = normal;
         vGrowthTrackSkinUv = uv;
         vSkinTanRegions = skinTanRegions;
         vSkinTanCoordinates = skinTanCoordinates;
         vSkinRoughness = skinRoughness;
         vSkinRegion=vec2(skinExposure,skinBlood);`,
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
         uniform vec3 uSkinLayers;
         uniform float uSkinMicroDetail;
         uniform float uHumanRealism;
         uniform sampler2D uSkinMicroTile;
         uniform float uSkinMicroStrength;
         uniform float uSkinMicroReady;
         varying vec2 vSkinRegion;
         varying float vSkinRoughness;
         ${skinOpticsGLSL()}
         ${TAN_LINES_GLSL}
         ${FRECKLES_GLSL}
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
         diffuseColor.rgb *= skinLayerMultiplier(uSkinLayers,vSkinRegion.x*skinSunCoverage(),vSkinRegion.y);
         diffuseColor.rgb *= 1.0 - skinFreckles(vGrowthTrackBasePosition, vSkinRegion.x);
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
      )
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        // Authored micro-roughness remains visible; regional oil changes its
        // mean without turning the entire body into glossy plastic.
        vec3 microP=vGrowthTrackBasePosition/${HUMAN_SURFACE.micro.tileMetres.toFixed(5)};
        vec3 microBlend=abs(normalize(vFreckleNormal));microBlend/=max(dot(microBlend,vec3(1.0)),.001);
        float microHeight=dot(vec3(texture2D(uSkinMicroTile,microP.yz).r,texture2D(uSkinMicroTile,microP.zx).r,texture2D(uSkinMicroTile,microP.xy).r),microBlend);
        roughnessFactor = mix(roughness,roughnessFactor,uHumanRealism);
        roughnessFactor = clamp(roughnessFactor * mix(1.0,max(vSkinRoughness, 0.75),uHumanRealism)+(microHeight-.5)*${HUMAN_SURFACE.micro.roughnessVariation.toFixed(5)}*uSkinMicroStrength*uSkinMicroReady*uSkinMicroDetail, 0.32, 0.85);
      `)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        if(uSkinMicroDetail>0.0){
          // Rest positions in glTF metres keep the grain continuous across UV
          // seams. Fade detail below a pixel rather than aliasing into dots.
          vec3 skinMm=vGrowthTrackBasePosition*1000.0;
          float footprint=max(length(dFdx(skinMm)),length(dFdy(skinMm)));
          float resolved=1.0-smoothstep(.35,1.2,footprint);
          float baseRelief=(growthTrackValueNoise(skinMm.xy*2.2)+growthTrackValueNoise(skinMm.yz*2.2)+growthTrackValueNoise(skinMm.zx*2.2)-1.5)*.000025;
          float relief=mix(baseRelief,(microHeight-.5)*${HUMAN_SURFACE.micro.heightMetres.toFixed(8)},uSkinMicroReady)*resolved*uSkinMicroStrength;
          vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
          vec3 r1=cross(sy,normal),r2=cross(normal,sx);
          float determinant=dot(sx,r1);
          vec3 gradient=sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2);
          if(abs(determinant)>1e-12)normal=normalize(abs(determinant)*normal-gradient);
        }
      `);
  };
}

export function createPhysicalSkinMaterial(toneOrColor = 3, mapOrMaterial = null, options = {}) {
  const tone = toneFrom(/^#[0-9a-f]{6}$/i.test(String(options.skinColorHex || '')) ? String(options.skinColorHex) : toneOrColor);
  const sourceMaterial = mapOrMaterial?.isMaterial ? mapOrMaterial : null;
  const map = sourceMaterial?.map || (mapOrMaterial?.isTexture ? mapOrMaterial : null);
  const albedoReference=sourceMaterial?.userData?.albedoReference || BODY_ALBEDO_REFERENCE;
  const surfaceDetail = options.surfaceDetail === true || Boolean(sourceMaterial && options.surfaceDetail !== false);
  const appearance=resolveSkinAppearance(options.skinAppearance);
  const humanRealismPercent=resolveHumanRealism(options.skinAppearance);
  const humanRealism=humanRealismPercent/100;
  const skinMicroStrength=microStrength(options.skinAppearance?.skinMicroDetail)*humanRealism;
  const skinScattering=resolveSkinScattering(options.skinScattering);
  const adjustedBase=surfaceDetail?tone.base:tone.base.map((channel,i)=>channel*skinLayerMultiplier({...appearance,exposure:0})[i]);
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(...skinAlbedoTint(adjustedBase, Boolean(map),albedoReference)),
    roughness: sourceMaterial?.userData?.nativeTissueMaps ? 1 : THREE.MathUtils.clamp(sourceMaterial?.roughness ?? 0.56, 0.44, 0.72),
    metalness: 0,
    map,
    normalMap: sourceMaterial?.normalMap || null,
    normalScale: (sourceMaterial?.normalScale?.clone?.() || new THREE.Vector2(0.52, 0.52)).multiplyScalar(humanRealism),
    roughnessMap: sourceMaterial?.roughnessMap || null,
    metalnessMap: sourceMaterial?.metalnessMap || null,
    // Small surface oil response. These lobes are not subsurface scattering.
    clearcoat: 0.03*humanRealism,
    clearcoatRoughness: 0.50,
    sheen: 0.06*humanRealism,
    sheenColor: new THREE.Color(...tone.sss).offsetHSL(0.02, 0.08, 0.06),
    sheenRoughness: 0.62,
    // Skin must go dark with the lights. Self-emission is not a substitute
    // for diffusion through tissue. The direct diffuse-wrap shader below is
    // an approximation; full subsurface transport remains open.
    emissive: new THREE.Color(0,0,0),
    emissiveIntensity: 0,
    // Skin is opaque. Transmission made the body look waxy and added an
    // unnecessary full-scene refraction render for every figure.
    transmission: 0,
    thickness: 0.18,
    attenuationColor: new THREE.Color(...tone.sss),
    attenuationDistance: 0.62,
    ior: 1.42,
    specularIntensity: 0.38,
    specularColor: new THREE.Color('#ffffff'),
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
    albedoReference,
    aoStrategy: 'baked-base-color',
    layeredSkinShader:surfaceDetail,
    skinAppearance:appearance,
    humanRealismPercent,
    tanPattern:resolveTanPattern(options.skinAppearance?.skinTanPattern).id,
    microDetail:{strength:skinMicroStrength,tile:Boolean(options.microTile),metres:HUMAN_SURFACE.micro.tileMetres},
    skinScattering:{
      model:'normalized-diffuse-wrap-v1',
      ...skinScattering,
      shaderStatus:'pending',
      thicknessMap:false,
      supportedLights:['directional','point','spot'],
      limitations:['no-thickness-transport','no-screen-space-diffusion','no-area-or-environment-scattering'],
    },
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
    uSkinLayers:{value:new THREE.Vector3(appearance.tan*appearance.capacity,appearance.undertone,appearance.flush)},
    uSkinMicroDetail:{value:1},
    uHumanRealism:{value:humanRealism},
    uSkinMicroTile:{value:options.microTile || null},
    uSkinMicroReady:{value:options.microTile?1:0},
    uSkinMicroStrength:{value:skinMicroStrength},
    uSkinScatteringStrength:{value:skinScattering.strength*humanRealism},
    uSkinScatteringWrap:{value:new THREE.Vector3(...SCATTERING_CHANNEL_SPREAD.map(channel=>channel*skinScattering.wrap))},
    ...tanLineUniforms(options.skinAppearance?.skinTanPattern),
    ...freckleUniforms(options.skinAppearance),
  };
  if (surfaceDetail) installSurfaceDetailShader(material);
  installSkinScatteringShader(material);
  return material;
}

export function updatePhysicalSkinMaterial(material, {
  fitzpatrickIndex = 3,
  skinColorHex = null,
  anatomyDepth = 100,
  vascularityIntensity = 0,
  bodyHairIntensity = 0,
  microDetail = true,
  skinScattering,
  time = 0,
} = {}) {
  // Delta, aura and other diagnostic ShaderMaterials also expose `uniforms`.
  // Only mutate materials created by this factory; otherwise a missing skin
  // uniform can throw once per animation frame and stall mode transitions.
  if (!material?.userData?.growthTrackSkinMaterial || !material?.uniforms) return;
  const tone = /^#[0-9a-f]{6}$/i.test(String(skinColorHex || ''))
    ? toneFrom(String(skinColorHex))
    : toneFrom(fitzpatrickIndex);
  const appearance=material.userData.skinAppearance;
  const multiplier=material.userData.layeredSkinShader?[1,1,1]:skinLayerMultiplier({...appearance,exposure:0});
  material.color?.setRGB(...skinAlbedoTint(tone.base.map((channel,i)=>channel*multiplier[i]), Boolean(material.map),material.userData.albedoReference));
  material.attenuationColor?.setRGB(...tone.sss);
  material.sheenColor?.setRGB(...tone.sss);
  material.specularColor?.set('#ffffff');
  material.uniforms.uBaseColor.value.setRGB(...tone.base);
  material.uniforms.uSSSColor.value.setRGB(...tone.sss);
  material.uniforms.uSpecColor.value.setRGB(...tone.spec);
  material.uniforms.uAnatomyDepth.value = anatomyDepth;
  material.uniforms.uVascularityIntensity.value = vascularityIntensity;
  material.uniforms.uBodyHairIntensity.value = bodyHairIntensity;
  material.uniforms.uTime.value = time;
  material.uniforms.uSkinMicroDetail.value = microDetail?1:0;
  if (skinScattering !== undefined) {
    const previous=material.userData.skinScattering;
    const settings=resolveSkinScattering(skinScattering===false ? false : {...previous,...skinScattering});
    Object.assign(previous,settings);
    material.uniforms.uSkinScatteringWrap.value.set(...SCATTERING_CHANNEL_SPREAD.map(channel=>channel*settings.wrap));
  }
  // Reuse the existing LOW-tier detail gate without changing the saved skin
  // identity. Restoring detail restores the selected scattering strength.
  material.uniforms.uSkinScatteringStrength.value = microDetail
    ? material.userData.skinScattering.strength*(material.userData.humanRealismPercent/100)
    : 0;
}
