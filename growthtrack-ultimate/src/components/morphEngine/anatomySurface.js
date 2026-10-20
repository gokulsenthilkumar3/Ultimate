import * as THREE from 'three';

// Procedural bump map for the external anatomy. The converter lays out UVs as
// v < 0.5 for the shaft (u around, v along) and v >= 0.5 for the scrotum
// (u around from the figure's left, v from the attachment down to the lowest
// point). The scrotum gets transverse folds (rugae) and the median raphe; the
// shaft stays smooth apart from a faint skin grain.
export const ANATOMY_SURFACE_SIZE = 256;
// GLB coordinates are metres. Relief is a fraction of a millimetre, not a
// displacement comparable with the figure's stature.
export const ANATOMY_BUMP_SCALE = 0.00065;

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
  if (v < 0.5) return 0.5 + 0.025 * (periodicNoise(20, v * 65) - 0.5);
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
  material.needsUpdate = true;
  return material;
}
