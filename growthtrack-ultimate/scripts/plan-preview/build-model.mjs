#!/usr/bin/env node
// Builds docs/3d-plans/plan-assets/human-preview.js from the app's bundled
// humanoid GLB so the v4 plan page can show a real 3D human without a server.
//
//   node scripts/plan-preview/build-model.mjs [path/to/humanoid-base.glb]
//
// The preview keeps only what the plan needs: the body surface and a 2048px skin
// colour map; the eyeballs with their iris/sclera map; the brow and lash meshes
// (positions only, used as guides to grow real hair strands); a list of sparse
// shape morphs; a per-vertex body region id. Hair is generated in the browser, so
// the source's hair cards are not copied, and neither is the external-anatomy
// mesh. Skeleton data is reduced to joint positions.
//
// Image resizing needs `sharp`. It is deliberately not an app dependency:
// run `npm install --no-save sharp` in the directory you run this from.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readGlb, readAccessor, readImage, meshByName } from './glb.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '../..');
const repoRoot = path.resolve(appRoot, '..');
const source = path.resolve(process.argv[2] || path.join(appRoot, 'public/assets/models/humanoid-base.glb'));
const output = path.join(appRoot, 'docs/3d-plans/plan-assets/human-preview.js');

// Shape morphs driven by the plan's docs/3d-plans/plan-assets/src/fit.mjs.
const MORPHS = [
  'overall_mass', 'gut_volume', 'face_roundness', 'chest_depth', 'pec_thickness', 'ribcage_depth',
  'waist_narrow', 'bicep_peak', 'tricep_horse', 'forearm_girth', 'glute_volume', 'hip_width',
  'quad_sweep', 'ham_thickness', 'calf_diamond', 'neck_thickness', 'clavicle_width',
  // Face: the few the plan's face controls drive (the rest of the face shape is generated, see faceparams.mjs)
  'brow_depth', 'nose_bridge_width', 'nose_tip_size', 'ear_prominence', 'jaw_angle',
];
// [key, mesh, image used to tell eyeball from glass (or null), texture size to store (0 = none)].
// The eyes' own photo texture is not stored: the iris is drawn procedurally. Brows and lashes
// are only guides for the strand generator.
const ACCESSORIES = [
  ['eyes', 'GrowthTrackEyes', 'EyeBrown_IrisSclera', 0],
  ['brows', 'GrowthTrackEyebrows', null, 0],
  ['lashes', 'GrowthTrackEyelashes', null, 0],
];
const SKIN_IMAGE = 'SkinAlbedo_YoungMale';

const require = createRequire(path.join(process.cwd(), 'noop.js'));
let sharp;
try { sharp = require('sharp'); } catch { throw new Error('This script needs `sharp`. Run `npm install --no-save sharp` in your working directory, then retry.'); }

const glb = readGlb(source);
const { json } = glb;
const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');

// ---- binary packing ---------------------------------------------------------
const chunks = []; let size = 0;
function put(array, kind) {
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const entry = { o: size, n: bytes.length, t: kind };
  chunks.push(bytes);
  const pad = (4 - (bytes.length % 4)) % 4;
  if (pad) chunks.push(Buffer.alloc(pad));
  size += bytes.length + pad;
  return entry;
}
const quantMorph = (index, delta) => {
  let max = 0; for (const v of delta) max = Math.max(max, Math.abs(v));
  const scale = max / 32767 || 1;
  const q = new Int16Array(delta.length); for (let i = 0; i < delta.length; i += 1) q[i] = Math.round(delta[i] / scale);
  return { idx: put(Uint16Array.from(index), 'u16'), d: put(q, 'i16'), scale, count: index.length };
};
function sparseMorphs(mesh, vertexCount) {
  const names = mesh.extras.targetNames; const out = {};
  for (const name of MORPHS) {
    const at = names.indexOf(name);
    if (at < 0) throw new Error(`morph ${name} missing in ${mesh.name}`);
    const full = readAccessor(glb, mesh.primitives[0].targets[at].POSITION).data;
    const index = []; for (let v = 0; v < vertexCount; v += 1) if (full[v * 3] || full[v * 3 + 1] || full[v * 3 + 2]) index.push(v);
    if (!index.length) continue;
    const delta = new Float32Array(index.length * 3);
    index.forEach((v, k) => delta.set(full.subarray(v * 3, v * 3 + 3), k * 3));
    out[name] = quantMorph(index, delta);
  }
  return out;
}
const imageIndex = name => json.images.findIndex(image => image.name === name);

// ---- skeleton joint positions ----------------------------------------------
const parent = {}; json.nodes.forEach((node, i) => (node.children || []).forEach(child => { parent[child] = i; }));
const world = i => { const t = json.nodes[i].translation || [0, 0, 0]; const p = parent[i] != null ? world(parent[i]) : [0, 0, 0]; return [p[0] + t[0], p[1] + t[1], p[2] + t[2]]; };
const joints = {}; const jointOrder = json.skins[0].joints.map(j => json.nodes[j].name);
json.skins[0].joints.forEach(j => { joints[json.nodes[j].name] = world(j).map(v => Math.round(v * 1e4) / 1e4); });

// ---- body --------------------------------------------------------------------
const bodyMesh = meshByName(glb, 'GrowthTrackBody'); const bodyPrim = bodyMesh.primitives[0];
const pos = readAccessor(glb, bodyPrim.attributes.POSITION).data;
const uv = readAccessor(glb, bodyPrim.attributes.TEXCOORD_0).data;
const idx32 = readAccessor(glb, bodyPrim.indices).data;
const jointIds = readAccessor(glb, bodyPrim.attributes.JOINTS_0).data; const weights = readAccessor(glb, bodyPrim.attributes.WEIGHTS_0).data;
const count = pos.length / 3;
if (count > 65535) throw new Error('Body has too many vertices for 16-bit indices');
const group = new Uint8Array(count);
for (let v = 0; v < count; v += 1) { let best = 0; let bw = -1; for (let k = 0; k < 4; k += 1) if (weights[v * 4 + k] > bw) { bw = weights[v * 4 + k]; best = jointIds[v * 4 + k]; } group[v] = best; }
let minY = Infinity; let maxY = -Infinity; for (let v = 0; v < count; v += 1) { minY = Math.min(minY, pos[v * 3 + 1]); maxY = Math.max(maxY, pos[v * 3 + 1]); }
const uv16 = new Uint16Array(uv.length); for (let i = 0; i < uv.length; i += 1) uv16[i] = Math.round(Math.min(1, Math.max(0, uv[i])) * 65535);
const body = {
  count, pos: put(pos, 'f32'), uv: put(uv16, 'u16'), idx: put(Uint16Array.from(idx32), 'u16'), group: put(group, 'u8'),
  morphs: sparseMorphs(bodyMesh, count),
};

// ---- textures ------------------------------------------------------------------
async function texture(name, size, mode) {
  const png = readImage(glb, imageIndex(name));
  let image = sharp(png).resize(size, size, { fit: 'fill' });
  const bytes = mode === 'jpeg' ? await image.jpeg({ quality: 82, mozjpeg: true }).toBuffer() : await image.webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  return { ...put(new Uint8Array(bytes), 'bytes'), mime: mode === 'jpeg' ? 'image/jpeg' : 'image/webp' };
}
const textures = { skin: await texture(SKIN_IMAGE, 2048, 'jpeg') };

// Average albedo under the body's UV layout: the shader divides by this so a
// chosen skin colour lands on the colour the person picked.
const raw = await sharp(readImage(glb, imageIndex(SKIN_IMAGE))).resize(512, 512, { fit: 'fill' }).removeAlpha().raw().toBuffer();
const mean = [0, 0, 0];
for (let v = 0; v < count; v += 1) {
  const x = Math.min(511, Math.floor(uv[v * 2] * 512)); const y = Math.min(511, Math.floor(uv[v * 2 + 1] * 512));
  for (let c = 0; c < 3; c += 1) mean[c] += raw[(y * 512 + x) * 3 + c] / 255;
}
const meanAlbedo = mean.map(v => Math.round((v / count) * 1e4) / 1e4);

// ---- accessories ------------------------------------------------------------------
const parts = {};
for (const [key, meshName, imageName, textureSize] of ACCESSORIES) {
  const mesh = meshByName(glb, meshName); const prim = mesh.primitives[0];
  const p = readAccessor(glb, prim.attributes.POSITION).data; const n = readAccessor(glb, prim.attributes.NORMAL).data;
  const t = readAccessor(glb, prim.attributes.TEXCOORD_0).data; const ix = readAccessor(glb, prim.indices).data;
  const n8 = new Int8Array(n.length); for (let i = 0; i < n.length; i += 1) n8[i] = Math.round(Math.max(-1, Math.min(1, n[i])) * 127);
  const t16 = new Uint16Array(t.length); for (let i = 0; i < t.length; i += 1) t16[i] = Math.round(Math.min(1, Math.max(0, t[i])) * 65535);
  // The eye mesh holds an opaque eyeball and a transparent glass shell; the texture's alpha tells them apart.
  let layer = null;
  if (key === 'eyes') {
    const rgba = await sharp(readImage(glb, imageIndex(imageName))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    layer = new Uint8Array(p.length / 3);
    for (let v = 0; v < layer.length; v += 1) {
      const x = Math.min(rgba.info.width - 1, Math.round(t[v * 2] * rgba.info.width)); const y = Math.min(rgba.info.height - 1, Math.round(t[v * 2 + 1] * rgba.info.height));
      layer[v] = rgba.data[(y * rgba.info.width + x) * 4 + 3] > 128 ? 0 : 1;
    }
  }
  parts[key] = {
    count: p.length / 3, pos: put(p, 'f32'), nrm: put(n8, 'i8'), uv: put(t16, 'u16'), idx: put(Uint16Array.from(ix), 'u16'),
    ...(layer ? { layer: put(layer, 'u8') } : {}),
    morphs: sparseMorphs(mesh, p.length / 3), ...(textureSize ? { texture: await texture(imageName, textureSize, 'webp') } : {}),
  };
}

const binary = Buffer.concat(chunks);
const gz = zlib.gzipSync(binary, { level: 9 });
const meta = {
  version: 1,
  source: { file: 'public/assets/models/humanoid-base.glb', sha256: sourceHash, licence: 'CC0 1.0 Universal (MakeHuman community assets); see growthtrack-ultimate/public/assets/models/MAKEHUMAN-ASSET-NOTICE.txt' },
  units: 'metres', floorY: minY, topY: maxY, height: maxY - minY, meanAlbedo, jointOrder, joints,
  morphNames: MORPHS, body, parts, textures, bytes: binary.length,
};
const banner = `/* Generated by growthtrack-ultimate/scripts/plan-preview/build-model.mjs - do not edit.
 * Source: ${meta.source.file} (sha256 ${sourceHash}).
 * ${meta.source.licence}
 * Contains no external-anatomy geometry. */\n`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${banner}window.PLAN_HUMAN_PREVIEW = ${JSON.stringify({ ...meta, data: gz.toString('base64') })};\n`);
console.log(`wrote ${path.relative(repoRoot, output)}  raw ${(binary.length / 1024).toFixed(0)} KB  gzip ${(gz.length / 1024).toFixed(0)} KB  file ${(fs.statSync(output).size / 1024).toFixed(0)} KB`);
