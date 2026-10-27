import * as THREE from 'three';
import { APPEARANCE_DETAIL, APPEARANCE_HASH_GLSL, resolveHairDetail } from '../../lib/appearanceDetail';

// Linear median of the opaque texels of the MakeHuman short02 hair-card albedo
// (measured from the CC0 source). The texture already carries brown hair, so
// multiplying the chosen colour onto it rendered near-black cards whose
// clearcoat glints read as grey patches. The colour is applied relative to it.
export const HAIR_ALBEDO_REFERENCE = Object.freeze([0.068, 0.044, 0.03]);
const HAIR_TINT_RANGE = Object.freeze([0.05, 10]);

/** Material colour (linear) that renders the hair texture at `hex` on average. */
export function hairAlbedoTint(hex) {
  const target = new THREE.Color(hex);
  return [target.r, target.g, target.b].map((value, channel) => (
    Math.min(HAIR_TINT_RANGE[1], Math.max(HAIR_TINT_RANGE[0], value / HAIR_ALBEDO_REFERENCE[channel]))
  ));
}

/** Hair cards: opaque alpha-tested strands. Sorted transparency drew back
    cards over front ones and left holes; hair has no clearcoat. */
export function createHairCardMaterial(source, hairColor, metrics = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    map: source?.map || null,
    normalMap: source?.normalMap || null,
    color: source?.map?new THREE.Color().setRGB(...hairAlbedoTint(hairColor)):new THREE.Color(hairColor),
    roughness: 0.58,
    metalness: 0,
    specularIntensity: 0.45,
    sheen: 0.4,
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color(hairColor).offsetHSL(0, 0, 0.12),
    transparent: false,
    alphaTest: 0.5,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
  });
  const detail = resolveHairDetail(metrics);
  const hairUniform = { value: new THREE.Vector3(detail.density, detail.grey, detail.seed) };
  material.userData.hairDetail = hairUniform;
  const grey = new THREE.Color(APPEARANCE_DETAIL.hair.greyColor);
  const greyTint = source?.map?new THREE.Color().setRGB(...grey.toArray().map((value, channel) => value / HAIR_ALBEDO_REFERENCE[channel])):grey;
  const install = (target, shaded) => {
    target.customProgramCacheKey = () => `growthtrack-seeded-hair-v1-${shaded}`;
    target.onBeforeCompile = shader => {
      shader.uniforms.uHairDetail = hairUniform;
      shader.uniforms.uHairSilverTint = { value: greyTint };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vHairPatternUv;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairPatternUv = uv;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform vec3 uHairDetail;
          uniform vec3 uHairSilverTint;
          varying vec2 vHairPatternUv;
          ${APPEARANCE_HASH_GLSL}
          uint hairPatternHash(uint offset) {
            return appearanceHash(ivec2(floor(vHairPatternUv.x * ${APPEARANCE_DETAIL.hair.strandColumns.toFixed(1)}), 0), uint(uHairDetail.z) + offset);
          }`)
        .replace('#include <alphatest_fragment>', `
          float retained = float(hairPatternHash(0u) & 65535u) / 65536.0;
          if (retained >= uHairDetail.x) discard;
          #include <alphatest_fragment>`);
      if (shaded) shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float silver = float(hairPatternHash(1u) & 65535u) / 65536.0 < uHairDetail.y ? 1.0 : 0.0;
        #ifdef USE_MAP
          diffuseColor.rgb = mix(diffuseColor.rgb, sampledDiffuseColor.rgb * uHairSilverTint, silver);
        #else
          diffuseColor.rgb = mix(diffuseColor.rgb, uHairSilverTint, silver);
        #endif`);
    };
  };
  install(material, true);
  // Shadow passes use the identical seeded cutout, including alpha from the
  // authored cards. Otherwise removed strands would still cast a full wig.
  const shadowOptions = { map: source?.map || null, alphaTest: material.alphaTest, side: THREE.DoubleSide };
  const depth = new THREE.MeshDepthMaterial({ ...shadowOptions, depthPacking: THREE.RGBADepthPacking });
  const distance = new THREE.MeshDistanceMaterial(shadowOptions);
  install(depth, false); install(distance, false);
  material.userData.depthMaterial = depth;
  material.userData.distanceMaterial = distance;
  return material;
}

// Eyebrow and eyelash textures are soft strand masks (eyebrow001 alpha has a
// median of 0.33), so alpha testing them left dashed fragments. They are
// blended, coloured by the material and use the texture only for coverage.
const STRAND_SETTINGS = Object.freeze({
  eyebrows: Object.freeze({ shade: 0.85, alphaBoost: 1.35 }),
  eyelashes: Object.freeze({ shade: 0.55, alphaBoost: 1 }),
});

export function createStrandMaterial(feature, source, hairColor) {
  const { shade, alphaBoost } = STRAND_SETTINGS[feature];
  const material = new THREE.MeshStandardMaterial({
    map: source?.map || null,
    color: new THREE.Color(hairColor).multiplyScalar(shade),
    roughness: 0.82,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb = diffuse;
      diffuseColor.a = clamp(diffuseColor.a * ${alphaBoost.toFixed(2)}, 0.0, 1.0);`);
  };
  material.customProgramCacheKey = () => `growthtrack-strand-${alphaBoost}`;
  return material;
}

export const STRAND_FEATURES = Object.freeze(Object.keys(STRAND_SETTINGS));

// Scalp hairline as fractions of stature below the crown, on the rest pose:
// about 4.8 cm (front) and 14.7 cm (nape) on a 173 cm figure. Under hair cards
// the layer reaches a little lower so gaps between cards show hair, not scalp.
const HAIRLINE = Object.freeze({
  buzz: Object.freeze({ front: 0.028, back: 0.085 }),
  cards: Object.freeze({ front: 0.0315, back: 0.092 }),
});

/** Hairline heights for the body geometry's rest positions (morphs ignored). */
export function scalpHairline(geometry, hairStyle) {
  const position = geometry?.attributes?.position;
  if (!position) return null;
  const box = new THREE.Box3().setFromBufferAttribute(position);
  const stature = box.max.y - box.min.y;
  const { front, back } = HAIRLINE[hairStyle === 'buzz' ? 'buzz' : 'cards'];
  return { front: box.max.y - front * stature, back: box.max.y - back * stature, stature };
}
