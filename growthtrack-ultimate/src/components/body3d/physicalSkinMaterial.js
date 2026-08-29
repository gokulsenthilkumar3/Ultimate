import * as THREE from 'three';

export const FITZPATRICK_TABLE = Object.freeze([
  { base: [1.00, 0.91, 0.84], sss: [1.00, 0.72, 0.64], spec: [0.95, 0.85, 0.80] },
  { base: [0.96, 0.82, 0.68], sss: [0.98, 0.62, 0.52], spec: [0.90, 0.80, 0.72] },
  { base: [0.91, 0.72, 0.54], sss: [0.92, 0.55, 0.42], spec: [0.85, 0.72, 0.60] },
  { base: [0.78, 0.52, 0.26], sss: [0.85, 0.40, 0.25], spec: [0.72, 0.58, 0.40] },
  { base: [0.55, 0.34, 0.16], sss: [0.70, 0.28, 0.15], spec: [0.58, 0.42, 0.28] },
  { base: [0.30, 0.18, 0.08], sss: [0.50, 0.18, 0.08], spec: [0.40, 0.28, 0.18] },
]);

function toneFrom(toneOrColor) {
  if (typeof toneOrColor === 'number') {
    return FITZPATRICK_TABLE[Math.max(0, Math.min(5, Math.round(toneOrColor)))];
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

function installSurfaceDetailShader(material) {
  material.customProgramCacheKey = () => 'growthtrack-physical-skin-v2';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uVascularityIntensity = material.uniforms.uVascularityIntensity;
    shader.uniforms.uBodyHairIntensity = material.uniforms.uBodyHairIntensity;
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
         varying vec3 vGrowthTrackBasePosition;
         varying vec2 vGrowthTrackSkinUv;

         float growthTrackHash(vec2 p) {
           return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
         }

         float growthTrackBodyHair(vec3 p, vec2 uv) {
           float torso = smoothstep(0.10, 0.22, p.y) * (1.0 - smoothstep(0.53, 0.66, p.y))
             * (1.0 - smoothstep(0.16, 0.31, abs(p.x)));
           float limbs = smoothstep(0.16, 0.30, abs(p.x)) * (1.0 - smoothstep(0.53, 0.72, abs(p.x)));
           float legs = (1.0 - smoothstep(-0.20, 0.02, p.y)) * smoothstep(0.07, 0.16, abs(p.x));
           float region = clamp(torso * 0.72 + limbs * 0.30 + legs * 0.38, 0.0, 1.0);
           vec2 strandUv = uv * vec2(420.0, 250.0);
           float cell = growthTrackHash(floor(strandUv));
           float strand = smoothstep(0.965, 0.995, cell)
             * smoothstep(0.12, 0.48, fract(strandUv.y));
           return strand * region;
         }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float veinNoise = growthTrackHash(floor(vGrowthTrackSkinUv * 110.0));
         float vein = smoothstep(0.82, 0.98, veinNoise) * clamp(uVascularityIntensity, 0.0, 1.0);
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.79, 0.88), vein * 0.22);
         float bodyHair = growthTrackBodyHair(vGrowthTrackBasePosition, vGrowthTrackSkinUv)
           * clamp(uBodyHairIntensity, 0.0, 1.0);
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.28, bodyHair * 0.58);`,
      );
  };
}

export function createPhysicalSkinMaterial(toneOrColor = 3, mapOrMaterial = null, options = {}) {
  const tone = toneFrom(/^#[0-9a-f]{6}$/i.test(String(options.skinColorHex || '')) ? String(options.skinColorHex) : toneOrColor);
  const sourceMaterial = mapOrMaterial?.isMaterial ? mapOrMaterial : null;
  const map = sourceMaterial?.map || (mapOrMaterial?.isTexture ? mapOrMaterial : null);
  const surfaceDetail = Boolean(sourceMaterial && options.surfaceDetail !== false);
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(...tone.base),
    roughness: Math.min(0.68, sourceMaterial?.roughness ?? 0.62),
    metalness: 0,
    map,
    normalMap: sourceMaterial?.normalMap || null,
    normalScale: sourceMaterial?.normalScale?.clone?.() || new THREE.Vector2(0.42, 0.42),
    roughnessMap: sourceMaterial?.roughnessMap || null,
    metalnessMap: sourceMaterial?.metalnessMap || null,
    clearcoat: 0.16,
    clearcoatRoughness: 0.46,
    sheen: 0.20,
    sheenColor: new THREE.Color(...tone.sss),
    sheenRoughness: 0.72,
    transmission: 0.018,
    thickness: 0.12,
    attenuationColor: new THREE.Color(...tone.sss),
    attenuationDistance: 0.72,
    ior: 1.4,
    specularIntensity: 0.38,
    specularColor: new THREE.Color(...tone.spec),
    emissive: new THREE.Color(...tone.sss),
    emissiveIntensity: 0.008,
    envMapIntensity: sourceMaterial?.envMapIntensity ?? 0.9,
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
  };
  material.uniforms = {
    uBaseColor: { value: new THREE.Color(...tone.base) },
    uSSSColor: { value: new THREE.Color(...tone.sss) },
    uSpecColor: { value: new THREE.Color(...tone.spec) },
    uAnatomyDepth: { value: 100 },
    uVascularityIntensity: { value: Number(options.vascularityIntensity) || 0 },
    uBodyHairIntensity: { value: Number(options.bodyHairIntensity) || 0 },
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
  if (!material?.uniforms) return;
  const tone = /^#[0-9a-f]{6}$/i.test(String(skinColorHex || ''))
    ? toneFrom(String(skinColorHex))
    : toneFrom(fitzpatrickIndex);
  material.color?.setRGB(...tone.base);
  material.emissive?.setRGB(...tone.sss);
  material.attenuationColor?.setRGB(...tone.sss);
  material.sheenColor?.setRGB(...tone.sss);
  material.specularColor?.setRGB(...tone.spec);
  material.uniforms.uBaseColor.value.setRGB(...tone.base);
  material.uniforms.uSSSColor.value.setRGB(...tone.sss);
  material.uniforms.uSpecColor.value.setRGB(...tone.spec);
  material.uniforms.uAnatomyDepth.value = anatomyDepth;
  material.uniforms.uVascularityIntensity.value = vascularityIntensity;
  material.uniforms.uBodyHairIntensity.value = bodyHairIntensity;
  material.uniforms.uTime.value = time;
}
