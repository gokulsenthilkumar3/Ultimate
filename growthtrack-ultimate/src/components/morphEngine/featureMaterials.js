import * as THREE from 'three';

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
export function createHairCardMaterial(source, hairColor) {
  return new THREE.MeshPhysicalMaterial({
    map: source?.map || null,
    normalMap: source?.normalMap || null,
    color: new THREE.Color().setRGB(...hairAlbedoTint(hairColor)),
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
}

// Eyebrow and eyelash textures are soft strand masks (eyebrow001 alpha has a
// median of 0.33), so alpha testing them left dashed fragments. They are
// blended, coloured by the material and use the texture only for coverage.
const STRAND_SETTINGS = Object.freeze({
  eyebrows: Object.freeze({ shade: 0.85, alphaBoost: 2.2 }),
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
