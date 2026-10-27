import * as THREE from 'three';

// Procedural bump map for the external anatomy. The converter lays out UVs as
// v < 0.5 for the shaft (u around, v along) and v >= 0.5 for the scrotum
// (u around from the figure's left, v from the attachment down to the lowest
// point). The scrotum gets transverse folds (rugae) and the median raphe; the
// shaft stays smooth apart from a faint skin grain.
export const ANATOMY_SURFACE_SIZE = 512;
// GLB coordinates are metres. Relief is a fraction of a millimetre, not a
// displacement comparable with the figure's stature.
export const ANATOMY_BUMP_SCALE = 0.0009;

const fract = value => value - Math.floor(value);
const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function valueNoise(x, y) {
  const ix = Math.floor(x); const iy = Math.floor(y);
  const fx = x - ix; const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx); const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy); const b = hash(ix + 1, iy); const c = hash(ix, iy + 1); const d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Height (0..1, 0.5 = flat) at a UV coordinate. */
export function anatomySurfaceHeight(u, v) {
  const angle = u * Math.PI * 2;
  const periodicNoise = (frequency, latitude) => valueNoise(Math.cos(angle) * frequency + latitude, Math.sin(angle) * frequency + latitude * 0.73);
  if (v < 0.5) {
    const t=Math.max(0,(v-.02)/.46);
    const grain=.025*(periodicNoise(28,t*85)-.5);
    const skinFold=.008*Math.sin(t*165+.8*Math.sin(angle*3)+periodicNoise(4,t*6)*3)
      *smoothstep(.03,.13,t)*(1-smoothstep(.62,.72,t));
    return .5+grain+skinFold;
  }
  const lat = (v - 0.5) * 2;
  // Folds run around the sac, wavy and irregular, fading out where the skin
  // joins the body and at the lowest point.
  const wave = Math.sin(2 * Math.PI * (lat * 11 + 0.45 * Math.sin(angle * 3 + lat * 5) + 1.3 * periodicNoise(5, lat * 9)));
  const envelope = smoothstep(0.12, 0.3, lat) * (1 - smoothstep(0.88, 1, lat));
  const folds = wave * (0.45 + 0.55 * periodicNoise(8, lat * 18)) * envelope;
  // Median raphe: a thin ridge at the front (u = 0.25) and back (u = 0.75).
  const raphe = Math.max(Math.exp(-(((u - 0.25) / 0.012) ** 2)), Math.exp(-(((u - 0.75) / 0.012) ** 2))) * smoothstep(0.15, 0.35, lat);
  return Math.min(1, Math.max(0, 0.5 + 0.18 * folds + 0.12 * raphe * envelope + 0.035 * (periodicNoise(32, lat * 35) - 0.5) * envelope));
}

let sharedTexture = null;

/** One shared bump texture; materials reference it and never dispose it. */
export function getAnatomySurfaceTexture() {
  if (sharedTexture) return sharedTexture;
  const size = ANATOMY_SURFACE_SIZE;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = Math.round(anatomySurfaceHeight((x + 0.5) / size, (y + 0.5) / size) * 255);
      const offset = (y * size + x) * 4;
      data[offset] = value; data[offset + 1] = value; data[offset + 2] = value; data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  sharedTexture = texture;
  return texture;
}

/** Give a skin material the anatomy's pigment (vertex colours) and surface relief. */
export function applyAnatomySurface(material) {
  material.vertexColors = true;
  material.bumpMap = getAnatomySurfaceTexture();
  material.bumpScale = ANATOMY_BUMP_SCALE;
  const compile=material.onBeforeCompile;
  const cacheKey=material.customProgramCacheKey();
  const coverage={value:0};
  const corona={value:.73};
  const realism={value:1};
  material.userData.anatomyCoverage=coverage;
  material.userData.anatomyCorona=corona;
  material.userData.anatomyRealism=realism;
  material.onBeforeCompile=(shader,...args)=> {
    compile.call(material,shader,...args);
    shader.uniforms.uAnatomyCoverage=coverage;
    shader.uniforms.uAnatomyCorona=corona;
    shader.uniforms.uAnatomyRealism=realism;
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec2 vAnatomyUv; attribute float _mucosa; varying float vAnatomyMucosa;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvAnatomyUv = uv; vAnatomyMucosa = _mucosa;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        uniform float uAnatomyCoverage;
        uniform float uAnatomyCorona;
        uniform float uAnatomyRealism;
        varying vec2 vAnatomyUv;
        varying float vAnatomyMucosa;
        float anatomyHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float anatomyNoise(vec2 p) {
          vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
          return mix(mix(anatomyHash(i),anatomyHash(i+vec2(1.0,0.0)),f.x),mix(anatomyHash(i+vec2(0.0,1.0)),anatomyHash(i+vec2(1.0)),f.x),f.y);
        }
        float anatomyPeriodic(float frequency,float latitude) {
          float angle=vAnatomyUv.x*6.2831853;
          return anatomyNoise(vec2(cos(angle),sin(angle))*frequency+vec2(latitude,latitude*.73));
        }`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        // Multiscale pigment variation with a periodic seam; no borrowed body
        // atlas because its UV coordinates describe different anatomy.
        float anatomyJoin=smoothstep(0.015,0.09,vAnatomyUv.y);
        float anatomyMottle=(anatomyPeriodic(6.0,vAnatomyUv.y*22.0)-.5)*.10
          +(anatomyPeriodic(18.0,vAnatomyUv.y*67.0)-.5)*.035;
        diffuseColor.rgb *= vec3(1.0)+vec3(anatomyMottle,anatomyMottle*.78,anatomyMottle*.70)*anatomyJoin*uAnatomyRealism;
        float anatomyPigment=step(.5,vAnatomyUv.y)*smoothstep(.54,.65,vAnatomyUv.y);
        diffuseColor.rgb *= mix(vec3(1.0),vec3(.96,.90,.88),anatomyPigment*anatomyJoin*uAnatomyRealism);`)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        float anatomyT = clamp((vAnatomyUv.y - 0.02) / 0.46, 0.0, 1.0);
        float skinEdge = mix(uAnatomyCorona-.03, 1.0, uAnatomyCoverage);
        float skinCover = uAnatomyCoverage > 0.0 ? smoothstep(uAnatomyCorona-.07, uAnatomyCorona, anatomyT) * (1.0 - smoothstep(skinEdge - 0.025, skinEdge + 0.015, anatomyT)) : 0.0;
        float glansSurface = (1.0 - step(0.5, vAnatomyUv.y)) * smoothstep(uAnatomyCorona-.035, uAnatomyCorona+.04, anatomyT) * (1.0 - skinCover);
        roughnessFactor = mix(roughnessFactor, 0.48, glansSurface*uAnatomyRealism);
        roughnessFactor = mix(roughnessFactor, 0.71, step(0.5, vAnatomyUv.y)*uAnatomyRealism);
        roughnessFactor = mix(roughnessFactor, 0.43, vAnatomyMucosa*uAnatomyRealism);
        roughnessFactor = clamp(roughnessFactor+(anatomyPeriodic(24.0,vAnatomyUv.y*80.0)-.5)*.075*uAnatomyRealism,.38,.82);`);
  };
  // Compose with the physical skin shader instead of replacing its detail.
  material.customProgramCacheKey=()=>`${cacheKey}-anatomy-v5`;
  material.needsUpdate = true;
  return material;
}

export function updateAnatomySurface(material,evidence) {
  const coverage=material?.userData?.anatomyCoverage;
  if(coverage) coverage.value=evidence?.foreskinCoverage ?? 0;
  if(material?.userData?.anatomyCorona) material.userData.anatomyCorona.value=evidence?.landmarks?.coronaT ?? .73;
  const detail=Math.max(0,Math.min(1,(material?.userData?.humanRealismPercent ?? 100)/100));
  if(material?.userData?.anatomyRealism) material.userData.anatomyRealism.value=detail;
  if(material) material.bumpScale=ANATOMY_BUMP_SCALE*detail;
}
