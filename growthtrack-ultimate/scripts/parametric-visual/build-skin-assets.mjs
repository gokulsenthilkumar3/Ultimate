import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { png } from '../human75/micro.mjs';

// Technical UV/data-map bake. Authored albedo and project micro-normal are
// copied byte-for-byte; these masks do not claim measured skin properties.
const out = 'public/assets/parametric/skin';
const sourceAlbedo = '.tmp/makehuman-cc0-assets/skins/young_caucasian_male/young_lightskinned_male_diffuse.png';
const sourceMaterial = '.tmp/makehuman-cc0-assets/skins/young_caucasian_male/young_caucasian_male.mhmat';
const sourceObj = '.tmp/makehuman-v1.3.0/makehuman/data/3dobjs/base.obj';
const sourceGlb = 'public/assets/models/parametric-base-v1.glb';
const sourceNormal = 'public/assets/models/skin-micro-normal.png';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const checked = async (file, expected) => { const bytes = await readFile(file); if (sha(bytes) !== expected) throw new Error(`${file}: source hash mismatch.`); return bytes; };
const albedo = await checked(sourceAlbedo, '862a26e335e958b70534cb5f0d7c47ef30ab148a56c42b3e9da969cf76f12963');
const base = await checked(sourceGlb, '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18');
const obj = await checked(sourceObj, '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c');
const normal = await checked(sourceNormal, '102ed420eadf41245d6b6c2a8df0b24d263ed681acb6e1a1fe637ad7cd51e716');
const size = 1024, jsonSize = base.readUInt32LE(12), gltf = JSON.parse(base.subarray(20, 20 + jsonSize));
const binary = base.subarray(28 + jsonSize), view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
function accessor(id) {
  const a = gltf.accessors[id], v = gltf.bufferViews[a.bufferView], components = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
  const bytes = { 5123: 2, 5125: 4, 5126: 4 }[a.componentType], method = { 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
  if (!components || !bytes || a.sparse) throw new Error('Unsupported authoring accessor.');
  const values = new Float64Array(a.count * components);
  for (let i = 0; i < a.count; i++) for (let c = 0; c < components; c++) values[i * components + c] = view[method]((v.byteOffset || 0) + (a.byteOffset || 0) + i * (v.byteStride || bytes * components) + c * bytes, true);
  return values;
}
const primitive = gltf.meshes.find(mesh => mesh.name === 'Body').primitives[0];
const positions = accessor(primitive.attributes.POSITION), uvs = accessor(primitive.attributes.TEXCOORD_0), indices = accessor(primitive.indices);
const sourcePositions = [], sourceUvs = [], sourceCorners = [];
for (const line of obj.toString('utf8').split(/\r?\n/)) {
  const [kind, ...parts] = line.trim().split(/\s+/);
  if (kind === 'v') sourcePositions.push(parts.map(Number));
  if (kind === 'vt') sourceUvs.push(parts.map(Number));
  if (kind === 'f') {
    const corners = parts.map(part => part.split('/').map(value => Number(value) - 1));
    if (corners.every(([v]) => v < 13380)) for (let i = 1; i < corners.length - 1; i++) sourceCorners.push(corners[0], corners[i], corners[i + 1]);
  }
}
if (indices.length !== sourceCorners.length) throw new Error('Body topology differs from the verified HM08 face sequence.');
let maxUvError = 0, maxPositionError = 0;
const sourceIds = new Map();
for (let i = 0; i < indices.length; i++) {
  const target = indices[i], [original, texture] = sourceCorners[i], p = sourcePositions[original], uv = sourceUvs[texture];
  if (sourceIds.has(target) && sourceIds.get(target) !== original) throw new Error('Inconsistent body vertex correspondence.');
  sourceIds.set(target, original);
  maxUvError = Math.max(maxUvError, Math.hypot(uvs[target * 2] - uv[0], uvs[target * 2 + 1] - (1 - uv[1])));
  maxPositionError = Math.max(maxPositionError, Math.hypot(positions[target * 3] - p[0] * 0.1, positions[target * 3 + 1] - p[1] * 0.1 - 0.818305, positions[target * 3 + 2] - p[2] * 0.1));
}
if (sourceIds.size !== 14517 || maxUvError > 1e-6 || maxPositionError > 1e-6) throw new Error('Exact body/skin UV correspondence was not established.');

// Rasterize neutral body coordinates into the source atlas. glTF V is already
// inverted from the OBJ V; PNG row y therefore equals glTF V (flipY=false).
const coordinates = new Float32Array(size * size * 3), occupied = new Uint8Array(size * size);
for (let t = 0; t < indices.length; t += 3) {
  const vertices = [indices[t], indices[t + 1], indices[t + 2]], points = vertices.map(i => [uvs[i * 2] * size, uvs[i * 2 + 1] * size]);
  const [[ax, ay], [bx, by], [cx, cy]] = points, den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(den) < 1e-10) continue;
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / den;
    const b = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / den, c = 1 - a - b;
    if (a < -1e-6 || b < -1e-6 || c < -1e-6) continue;
    const pixel = y * size + x; occupied[pixel] = 1;
    for (let axis = 0; axis < 3; axis++) coordinates[pixel * 3 + axis] = positions[vertices[0] * 3 + axis] * a + positions[vertices[1] * 3 + axis] * b + positions[vertices[2] * 3 + axis] * c;
  }
}
const gaussian = (x, y, z, centre, radius) => Math.exp(-(((x - centre[0]) / radius[0]) ** 2 + ((y - centre[1]) / radius[1]) ** 2 + ((z - centre[2]) / radius[2]) ** 2));
const roughness = new Uint8Array(size * size * 4), scatter = new Uint8Array(roughness.length);
for (let pixel = 0; pixel < occupied.length; pixel++) {
  const [x, y, z] = coordinates.subarray(pixel * 3, pixel * 3 + 3), ax = Math.abs(x);
  const head = gaussian(x, y, z, [0, 1.51, 0.06], [0.12, 0.17, 0.18]);
  const nose = gaussian(x, y, z, [0, 1.51, 0.16], [0.022, 0.04, 0.05]);
  const forehead = gaussian(x, y, z, [0, 1.59, 0.11], [0.06, 0.035, 0.06]);
  const lips = gaussian(x, y, z, [0, 1.45, 0.14], [0.033, 0.014, 0.04]);
  const ears = gaussian(ax, y, z, [0.085, 1.51, 0.015], [0.025, 0.055, 0.045]);
  const hands = gaussian(ax, y, z, [0.65, 0.93, 0.04], [0.12, 0.13, 0.16]);
  const r = occupied[pixel] ? Math.max(0.35, Math.min(0.8, 0.68 - 0.1 * head - 0.1 * nose - 0.07 * forehead - 0.17 * lips + 0.05 * hands)) : 0.68;
  const s = occupied[pixel] ? Math.min(1, 0.22 + 0.18 * head + 0.3 * nose + 0.5 * ears + 0.27 * lips + 0.25 * hands) : 0.22;
  roughness.set([r * 255, r * 255, r * 255, 255], pixel * 4); scatter.set([s * 255, s * 255, s * 255, 255], pixel * 4);
}
// Four-pixel deterministic edge padding prevents background values bleeding
// into UV islands when filtered. This is not a physical-thickness calculation.
for (let pass = 0; pass < 4; pass++) {
  const next = occupied.slice();
  for (let pixel = 0; pixel < occupied.length; pixel++) if (!occupied[pixel]) {
    const x = pixel % size, y = Math.floor(pixel / size);
    const neighbour = [x ? pixel - 1 : -1, x < size - 1 ? pixel + 1 : -1, y ? pixel - size : -1, y < size - 1 ? pixel + size : -1].find(index => index >= 0 && occupied[index]);
    if (neighbour !== undefined) { roughness.copyWithin(pixel * 4, neighbour * 4, neighbour * 4 + 4); scatter.copyWithin(pixel * 4, neighbour * 4, neighbour * 4 + 4); next[pixel] = 1; }
  }
  occupied.set(next);
}

// Read source bytes solely to calculate a chest-patch colour reference; no
// painting, recolouring, or resampling of the authored albedo takes place.
function pngRgb(bytes) {
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), channels = { 2: 3, 6: 4 }[bytes[25]], chunks = [];
  if (bytes[24] !== 8 || !channels || bytes[28]) throw new Error('Unsupported source PNG.');
  for (let at = 8; at < bytes.length;) { const length = bytes.readUInt32BE(at); if (bytes.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(bytes.subarray(at + 8, at + 8 + length)); at += length + 12; }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels, decoded = new Uint8Array(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) { const i = y * stride + x, a = x >= channels ? decoded[i - channels] : 0, b = y ? decoded[i - stride] : 0, c = y && x >= channels ? decoded[i - stride - channels] : 0; decoded[i] = raw[y * (stride + 1) + 1 + x] + [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter]; }
  }
  return { width, height, channels, decoded };
}
const pixels = pngRgb(albedo), chest = [[], [], []];
for (let i = 0; i < positions.length / 3; i++) if (Math.abs(positions[i * 3]) > 0.025 && Math.abs(positions[i * 3]) < 0.11 && positions[i * 3 + 1] > 1.12 && positions[i * 3 + 1] < 1.28 && positions[i * 3 + 2] > 0.07) {
  const x = Math.min(pixels.width - 1, Math.floor(uvs[i * 2] * pixels.width)), y = Math.min(pixels.height - 1, Math.floor(uvs[i * 2 + 1] * pixels.height));
  for (let c = 0; c < 3; c++) chest[c].push(pixels.decoded[(y * pixels.width + x) * pixels.channels + c] / 255);
}
if (chest[0].length < 20) throw new Error('Not enough valid chest samples for skin colour normalization.');
const medians = chest.map(values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]), linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
await mkdir(out, { recursive: true });
const files = { 'albedo.png': albedo, 'normal.png': normal, 'roughness.png': png(size, roughness), 'scatter-mask.png': png(size, scatter) };
for (const [name, bytes] of Object.entries(files)) await writeFile(`${out}/${name}`, bytes);
const sourceNotice = `# Parametric skin source and data-map bake\n\nAuthored albedo: MakeHuman system CC0 asset pack, skins/young_caucasian_male/young_lightskinned_male_diffuse.png. Copied byte-for-byte at 2048 x 2048; source SHA-256 ${sha(albedo)}. The local material release header and full CC0 text accompany this file.\n\nCanonical skin UV correspondence: all 14517 exported body vertices map to the original 13380 HM08 body vertices; OBJ-to-GLB UV is [u,1-v], maximum coordinate error ${maxUvError}. Position transform is original * 0.1 + [0,0.818305,0], maximum error ${maxPositionError} metres. No texture reprojection is used. Load these PNGs with flipY=false.\n\nroughness.png is a project-authored neutral-geometry regional estimate (face/T-zone/lips/hands), not measured regional roughness. scatter-mask.png is a project-authored relative scattering weight, not a measured physiological thickness/SSS map. normal.png copies the project-authored periodic pore tile produced by scripts/human75/micro.mjs (seed 76123); it is not a scanned pore map. Its UV repeat is an artistic approximation, not calibrated pore scale.\n\nThe source is generic skin, not this user's likeness or a commissioned portrait texture. Baked shading/body hair in the original albedo remain and require art review; it is not certified as a delit capture. The tile and estimated masks improve inputs but do not certify lifelike output or skin tone fidelity.\n\nPrimary source catalog: https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html\nSource pack SHA-256: b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107. Archived hashes: docs/licenses/makehuman-system-assets-cc0-extract-manifest.json.\n`;
const licenses = { 'SKIN-SOURCE.md': Buffer.from(sourceNotice), 'SKIN-CC0.txt': await readFile('docs/licenses/makehuman-v1.3.0-LICENSE.ASSETS.md'), 'SKIN-MATERIAL.txt': await checked(sourceMaterial, '6eda60b07ff2afbde078a2535ef3913593d84e9de92b2eb76c30f396a181fe2e') };
for (const [name, bytes] of Object.entries(licenses)) await writeFile(`${out}/${name}`, bytes);
const map = (name, colorSpace, detail = {}) => ({ path: `assets/parametric/skin/${name}`, sha256: sha(files[name]), bytes: files[name].length, width: files[name].readUInt32BE(16), height: files[name].readUInt32BE(20), colorSpace, flipY: false, ...detail });
const manifest = {
  version: 1, assetFamily: 'threews-parametric-v1', label: 'Generic CC0 skin study',
  albedoReference: medians.map(linear), albedoReferenceSrgb: medians,
  referenceMethod: { region: 'neutral chest skin, excluding central sternum and axilla', samples: chest[0].length, statistic: 'independent-channel median' },
  maps: {
    albedo: map('albedo.png', 'srgb', { origin: 'authored-source-byte-copy', license: 'CC0-1.0' }),
    roughness: map('roughness.png', 'linear', { origin: 'project-estimated-neutral-geometry-regions' }),
    normal: map('normal.png', 'linear', { origin: 'project-seeded-pore-microtile', repeat: [64, 64], wrap: 'repeat' }),
    scatterMask: map('scatter-mask.png', 'linear', { origin: 'project-estimated-relative-scattering-weight', physiologicalThickness: false }),
  },
  uvVerification: { vertices: sourceIds.size, sourceVertices: new Set(sourceIds.values()).size, triangles: indices.length / 3, maxUvError, maxPositionErrorMetres: maxPositionError, sourceToMetres: 0.1, sourceTranslationMetres: [0, 0.818305, 0] },
  sourceFiles: [{ path: sourceAlbedo, sha256: sha(albedo), license: 'CC0-1.0' }, { path: sourceObj, sha256: sha(obj), license: 'CC0-1.0' }, { path: sourceNormal, sha256: sha(normal), license: 'project-authored' }],
  licenseFiles: Object.entries(licenses).map(([name, bytes]) => ({ path: `assets/parametric/skin/${name}`, sha256: sha(bytes), bytes: bytes.length })),
  limitations: ['Generic source skin; personal likeness is not inferred.', 'Auxiliary maps are estimated/procedural, not measured or scanned.', 'Source albedo retains baked shading/body hair; removal of baked illumination is not certified.', 'Regional masks use neutral body coordinates and deform through UVs; no pose-dependent skin simulation.', 'No physical-device or visual acceptance is implied.'],
};
const manifestText = JSON.stringify(manifest, null, 2) + '\n';
await writeFile(`${out}/manifest.json`, manifestText);
await writeFile('src/config/parametricSkin.json', manifestText);
console.log(JSON.stringify({ maps: manifest.maps, albedoReference: manifest.albedoReference, uvVerification: manifest.uvVerification, totalMapBytes: Object.values(files).reduce((sum, bytes) => sum + bytes.length, 0) }, null, 2));
