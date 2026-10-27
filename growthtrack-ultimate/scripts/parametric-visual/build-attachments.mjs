// Reuse the CC0 authored MakeHuman short02 and casual-tee patterns. The
// parametric body is the exact HM08 visible surface, with exported UV seams.
// Hidden helper anchors have no morph bank here: project them once onto the
// visible surface and preserve their neutral offset, explicitly approximately.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { BufferGeometry, Float32BufferAttribute, Triangle, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { readGlb, readAccessor } from '../plan-preview/glb.mjs';

const output = 'public/assets/parametric/attachments';
fs.mkdirSync(output, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(file);
const sourceBase = '.tmp/makehuman-v1.3.0/makehuman/data/3dobjs/base.obj';
const bodyPath = 'public/assets/models/parametric-base-v1.glb';
const bodyHash = '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18';
if (hash(read(bodyPath)) !== bodyHash) throw new Error('The attachment basis must match the pinned parametric human.');
const extracted = JSON.parse(fs.readFileSync('docs/licenses/makehuman-system-assets-cc0-extract-manifest.json', 'utf8'));
const wardrobe = JSON.parse(fs.readFileSync('public/assets/wardrobe/manifest.json', 'utf8'));
const archiveHash = 'b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107';
if (extracted.zipSha256 !== archiveHash || wardrobe.archiveSha256 !== archiveHash) throw new Error('The verified CC0 archive identities changed.');
function verifySource(file, member) {
  const entry = [...extracted.members, ...wardrobe.inputs].find(entry => entry.member === member);
  if (!entry || entry.sha256 !== hash(read(file))) throw new Error(`The CC0 source hash does not match its licence ledger: ${member}.`);
}

function obj(file) {
  const vertices = [], uv = [], faces = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const [kind, ...parts] = line.trim().split(/\s+/);
    if (kind === 'v') vertices.push(parts.slice(0, 3).map(Number));
    if (kind === 'vt') uv.push(parts.slice(0, 2).map(Number));
    if (kind === 'f') faces.push(parts.map(part => part.split('/').slice(0, 2).map(value => Number(value) - 1)));
  }
  return { vertices, uv, faces };
}
const base = obj(sourceBase), bodyGlb = readGlb(bodyPath), bodyPrimitive = bodyGlb.json.meshes[0].primitives[0];
const positions = readAccessor(bodyGlb, bodyPrimitive.attributes.POSITION).data;
const uvs = readAccessor(bodyGlb, bodyPrimitive.attributes.TEXCOORD_0).data;
const indices = readAccessor(bodyGlb, bodyPrimitive.indices).data;
const mapping = new Map();
const shiftY = positions[1] - base.vertices[4848][1] * 0.1;
let cursor = 0;
for (const face of base.faces.filter(face => face.every(([vertex]) => vertex < 13380))) {
  for (let k = 1; k < face.length - 1; k++) for (const [original, uv] of [face[0], face[k], face[k + 1]]) {
    const target = indices[cursor++], expected = base.vertices[original];
    const error = Math.max(...expected.map((value, axis) => Math.abs(value * 0.1 + (axis === 1 ? shiftY : 0) - positions[target * 3 + axis])));
    const uvError = Math.max(Math.abs(base.uv[uv][0] - uvs[target * 2]), Math.abs(1 - base.uv[uv][1] - uvs[target * 2 + 1]));
    if (error > 1e-6 || uvError > 1e-6) throw new Error('HM08 body/UV correspondence changed.');
    if (!mapping.has(original)) mapping.set(original, target);
  }
}
if (mapping.size !== 13380 || cursor !== indices.length) throw new Error('Incomplete HM08 visible-body correspondence.');
const geometry = new BufferGeometry();
geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
geometry.setIndex(Array.from(indices));
geometry.computeVertexNormals();
const bvh = new MeshBVH(geometry, { indirect: true });
const point = new Vector3(), bary = new Vector3(), triangle = new Triangle();
function nearest(point) {
  const result = bvh.closestPointToPoint(point);
  const ids = [0, 1, 2].map(k => geometry.index.getX(result.faceIndex * 3 + k));
  triangle.set(...ids.map(id => new Vector3().fromBufferAttribute(geometry.attributes.position, id)));
  triangle.getBarycoord(result.point, bary);
  return { indices: ids, weights: bary.toArray(), offset: point.clone().sub(result.point).toArray(), distance: result.distance };
}

function proxy(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('explicitly released as CC0')) throw new Error('Only the verified CC0 archive variant may be reused.');
  const rows = [], scales = [];
  let reading = false;
  for (const line of text.split(/\r?\n/)) {
    const tokens = line.trim().split(/\s+/);
    if (/^[xyz]_scale$/.test(tokens[0])) scales['xyz'.indexOf(tokens[0][0])] = tokens.slice(1).map(Number);
    if (tokens[0] === 'verts') { reading = true; continue; }
    if (!reading) continue;
    if (!/^\d+$/.test(tokens[0])) break;
    const row = tokens.map(Number);
    if (row.length === 1) rows.push([row[0], row[0], row[0], 1, 0, 0, 0, 0, 0]);
    else if (row.length === 9) rows.push(row);
    else throw new Error('Unsupported proxy binding row.');
  }
  return { rows, scales, notice: text.split('uuid ')[0] };
}
const manifest = { version: 1, basisSha256: bodyHash, bodyVertexCount: positions.length / 3, sourceBaseSha256: hash(read(sourceBase)),
  license: 'CC0-1.0', source: 'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',
  archiveSha256: 'b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107',
  fitting: 'HM08 proxy interpolation; hidden-helper anchors approximated by visible-surface barycentric displacement', assets: {} };
function build(name, objectPath, proxyPath, textureSources, topOnly) {
  const memberRoot = topOnly ? 'clothes/male_casualsuit04/' : 'hair/short02/';
  verifySource(objectPath, memberRoot + path.basename(objectPath));
  verifySource(proxyPath, memberRoot + path.basename(proxyPath));
  const source = obj(objectPath), fit = proxy(proxyPath), anchors = [], anchorIds = new Map();
  if (source.vertices.length !== fit.rows.length) throw new Error(`${name}: proxy/object vertex count mismatch.`);
  function anchor(original) {
    if (anchorIds.has(original)) return anchorIds.get(original);
    let record;
    if (mapping.has(original)) record = { indices: [mapping.get(original)], weights: [1], offset: [0, 0, 0] };
    else {
      point.fromArray(base.vertices[original]).multiplyScalar(0.1); point.y += shiftY;
      record = nearest(point);
    }
    const id = anchors.length; anchors.push({ original, ...record }); anchorIds.set(original, id); return id;
  }
  const proxies = fit.rows.map(row => [...row.slice(0, 3).map(anchor), ...row.slice(3)]);
  const scales = fit.scales.map(([a, b, reference]) => [anchor(a), anchor(b), reference]);
  const restAnchor = index => {
    const record = anchors[index], result = new Vector3().fromArray(record.offset);
    record.indices.forEach((id, k) => result.addScaledVector(new Vector3().fromArray(positions, id * 3), record.weights[k]));
    return result;
  };
  const axisScale = scales.map(([a, b, ref], axis) => Math.abs(restAnchor(a).getComponent(axis) - restAnchor(b).getComponent(axis)) / ref);
  const restPositions = proxies.map(row => {
    const result = new Vector3();
    for (let k = 0; k < 3; k++) result.addScaledVector(restAnchor(row[k]), row[k + 3]);
    for (let axis = 0; axis < 3; axis++) result.setComponent(axis, result.getComponent(axis) + row[axis + 6] * axisScale[axis]);
    return result;
  });
  // Keep the authored top as a real pattern with collar and sleeve openings.
  // The source outfit also contains trousers; components identify the top.
  const parents = source.vertices.map((_, i) => i);
  const find = id => parents[id] === id ? id : (parents[id] = find(parents[id]));
  for (const face of source.faces) for (let i = 1; i < face.length; i++) parents[find(face[i][0])] = find(face[0][0]);
  const bounds = new Map();
  restPositions.forEach((point, i) => { const id = find(i), bound = bounds.get(id) || { min: Infinity, max: -Infinity }; bound.min = Math.min(bound.min, point.y); bound.max = Math.max(bound.max, point.y); bounds.set(id, bound); });
  const selected = source.faces.filter(face => !topOnly || face.every(([id]) => { const b = bounds.get(find(id)); return b.min > 0.65 && (b.max > 1.15 || b.min > 1.05); }));
  const remap = new Map(), originalVertices = [], uv = [], triangles = [];
  for (const face of selected) {
    const ids = face.map(([vertex, texture]) => {
      const key = `${vertex}/${texture}`;
      if (!remap.has(key)) { remap.set(key, originalVertices.length); originalVertices.push(vertex); uv.push(source.uv[texture][0], 1 - source.uv[texture][1]); }
      return remap.get(key);
    });
    for (let i = 1; i < ids.length - 1; i++) triangles.push(ids[0], ids[i], ids[i + 1]);
  }
  if (!triangles.length) throw new Error(`${name}: no authored faces selected.`);
  const clearanceBindings = originalVertices.map(id => { const { indices, weights } = nearest(restPositions[id]); return { indices, weights }; });
  const textures = {};
  for (const [kind, sourcePath] of Object.entries(textureSources)) {
    if (topOnly) {
      const entry = wardrobe.outputs.find(entry => entry.file === path.basename(sourcePath));
      if (!entry || entry.sha256 !== hash(read(sourcePath))) throw new Error('The approved wardrobe texture hash changed.');
    } else verifySource(sourcePath, memberRoot + path.basename(sourcePath));
    const file = `${name}-${kind}.png`, bytes = read(sourcePath); fs.writeFileSync(path.join(output, file), bytes);
    textures[kind] = { file, sha256: hash(bytes), bytes: bytes.length, source: sourcePath };
  }
  const data = { version: 1, name, kind: topOnly ? 'garment' : 'hair', basisSha256: bodyHash, bodyVertexCount: positions.length / 3,
    anchors, proxies, scales, originalVertices, uv, indices: triangles, clearanceBindings,
    clearanceMetres: topOnly ? 0.006 : 0.0015,
    source: { object: objectPath, proxy: proxyPath, objectSha256: hash(read(objectPath)), proxySha256: hash(read(proxyPath)) },
    validation: 'finite-prototype-shape-matrix-only; no cloth simulation or collision guarantee' };
  const file = `${name}.json`, bytes = Buffer.from(JSON.stringify(data)); fs.writeFileSync(path.join(output, file), bytes);
  const notice = `${name}-CC0.txt`; fs.writeFileSync(path.join(output, notice), fit.notice);
  const helperAnchors = anchors.filter(record => record.original >= 13380);
  manifest.assets[name] = { file, sha256: hash(bytes), bytes: bytes.length, textures, notice, noticeSha256: hash(read(path.join(output, notice))),
    vertices: originalVertices.length, triangles: triangles.length / 3, exactBodyAnchors: anchors.length - helperAnchors.length,
    approximateHelperAnchors: helperAnchors.length, helperProjectionMaxDistanceMetres: Math.max(0, ...helperAnchors.map(record => record.distance)) };
  console.log(name, JSON.stringify(manifest.assets[name]));
}
build('short02', '.tmp/makehuman-cc0-assets/hair/short02/short02.obj', '.tmp/makehuman-cc0-assets/hair/short02/short02.mhclo', {
  albedo: '.tmp/makehuman-cc0-assets/hair/short02/short02_diffuse.png', normal: '.tmp/makehuman-cc0-assets/hair/short02/short02_normal.png',
}, false);
build('tee', '.tmp/wardrobe-cc0/male_casualsuit04/male_casualsuit04.obj', '.tmp/wardrobe-cc0/male_casualsuit04/male_casualsuit04.mhclo', {
  albedo: 'public/assets/wardrobe/tee_diffuse.png', normal: 'public/assets/wardrobe/tee_normal.png',
}, true);
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
geometry.dispose();
