#!/usr/bin/env node
/** Refine local pelvis topology and replace generated anatomy without
 * rebuilding the already baked skin images or moving accessory bindings.
 * Usage: node scripts/refine-pelvis-assets.mjs INPUT OUTPUT anatomy.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';

const TYPES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const ARRAYS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const vector = (values, index) => new THREE.Vector3().fromArray(values, index * 3);

export function smoothNormals(positions, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(Array.from(indices)); geometry.computeVertexNormals();
  const normals = geometry.attributes.normal.array;
  // UV islands duplicate vertices. Average their normals in rest space so a
  // texture seam cannot become a hard lighting edge on the gluteal surface.
  const groups = new Map();
  for (let index = 0; index < positions.length / 3; index += 1) {
    const key = [0, 1, 2].map(axis => Math.round(positions[index * 3 + axis] * 1e6)).join(':');
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(index);
  }
  for (const group of groups.values()) {
    const normal = group.reduce((sum, index) => sum.add(vector(normals, index)), new THREE.Vector3()).normalize();
    group.forEach(index => normal.toArray(normals, index * 3));
  }
  geometry.dispose(); return Float32Array.from(normals);
}

/** Adaptive, conforming Phong subdivision. Existing vertices, morph values,
 * UVs and bone weights are retained; only rear-pelvis edges receive midpoints.
 * Neighbouring triangles split on the same edge, avoiding cracks/T junctions.
 */
export function refinePelvisMesh(attributes, indices, morphs) {
  const positions = attributes.POSITION.values;
  const originalCount = positions.length / 3;
  const normals = smoothNormals(positions, indices);
  const bounds = new THREE.Box3().setFromBufferAttribute(new THREE.Float32BufferAttribute(positions, 3));
  const stature = bounds.max.y - bounds.min.y;
  const centre = bounds.getCenter(new THREE.Vector3());
  const edges = new Map();
  const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
  const out = Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, { ...value, values: Array.from(value.values) }]));
  const targets = morphs.map(morph => Array.from(morph));
  const midpoint = (a, b) => {
    const key = edgeKey(a, b); if (edges.has(key)) return edges.get(key);
    const pa = vector(positions, a); const pb = vector(positions, b);
    const mid = pa.clone().add(pb).multiplyScalar(.5);
    const h = (mid.y - bounds.min.y) / stature;
    if (h < .34 || h > .55 || mid.z > centre.z - stature * .025 || Math.abs(mid.x - centre.x) > stature * .17 || pa.distanceTo(pb) < stature * .009) return null;
    const na = vector(normals, a); const nb = vector(normals, b);
    const projectedA = mid.clone().addScaledVector(na, -mid.clone().sub(pa).dot(na));
    const projectedB = mid.clone().addScaledVector(nb, -mid.clone().sub(pb).dot(nb));
    const offset = projectedA.add(projectedB).multiplyScalar(.5).sub(mid);
    offset.clampLength(0, stature * .002); mid.addScaledVector(offset, .8);
    const index = out.POSITION.values.length / 3;
    const skinWeights = new Map();
    if (attributes.JOINTS_0 && attributes.WEIGHTS_0) for (const vertex of [a, b]) for (let slot = 0; slot < 4; slot += 1) {
      const joint = attributes.JOINTS_0.values[vertex * 4 + slot];
      skinWeights.set(joint, (skinWeights.get(joint) || 0) + attributes.WEIGHTS_0.values[vertex * 4 + slot] * .5);
    }
    const ranked = [...skinWeights].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const totalWeight = ranked.reduce((sum, pair) => sum + pair[1], 0) || 1;
    for (const [name, attribute] of Object.entries(attributes)) {
      if (name === 'POSITION') out[name].values.push(...mid.toArray());
      else if (name === 'JOINTS_0') out[name].values.push(...Array.from({ length: 4 }, (_, slot) => ranked[slot]?.[0] || 0));
      else if (name === 'WEIGHTS_0') out[name].values.push(...Array.from({ length: 4 }, (_, slot) => (ranked[slot]?.[1] || 0) / totalWeight));
      else for (let axis = 0; axis < attribute.size; axis += 1) out[name].values.push((attribute.values[a * attribute.size + axis] + attribute.values[b * attribute.size + axis]) * .5);
    }
    targets.forEach((target, morph) => { for (let axis = 0; axis < 3; axis += 1) target.push((morphs[morph][a * 3 + axis] + morphs[morph][b * 3 + axis]) * .5); });
    edges.set(key, index); return index;
  };
  const triangles = [];
  for (let offset = 0; offset < indices.length; offset += 3) {
    const vertices = Array.from(indices.slice(offset, offset + 3));
    const mids = vertices.map((a, index) => midpoint(a, vertices[(index + 1) % 3]));
    const marked = mids.filter(value => value !== null).length;
    if (!marked) triangles.push(...vertices);
    else if (marked === 3) {
      const [a, b, c] = vertices; const [ab, bc, ca] = mids;
      triangles.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    } else if (marked === 1) {
      const i = mids.findIndex(value => value !== null);
      const [a, b, c] = [vertices[i], vertices[(i + 1) % 3], vertices[(i + 2) % 3]];
      triangles.push(a, mids[i], c, mids[i], b, c);
    } else {
      const missing = mids.findIndex(value => value === null);
      const i = (missing + 2) % 3;
      const [a, b, c] = [vertices[i], vertices[(i + 1) % 3], vertices[(i + 2) % 3]];
      const ab = mids[i]; const ca = mids[(i + 2) % 3];
      triangles.push(a, ab, ca, ab, b, c, ab, c, ca);
    }
  }
  out.NORMAL = { size: 3, values: smoothNormals(out.POSITION.values, triangles) };
  return { attributes: out, indices: triangles, morphs: targets, addedVertices: out.POSITION.values.length / 3 - originalCount };
}

export function refineAsset(input, output, anatomyFile) {
  const file = fs.readFileSync(input); const jsonSize = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonSize).toString('utf8'));
  const binary = file.subarray(28 + jsonSize); const chunks = [binary]; let byteLength = binary.length;
  const read = accessorIndex => {
    const accessor = json.accessors[accessorIndex]; const size = TYPES[accessor.type];
    const Type = ARRAYS[accessor.componentType]; const values = new Type(accessor.count * size);
    const bytes = (viewIndex, offset, count, Type) => {
      const view = json.bufferViews[viewIndex]; const start = (view.byteOffset || 0) + (offset || 0);
      return new Type(Uint8Array.from(binary.subarray(start, start + count * Type.BYTES_PER_ELEMENT)).buffer);
    };
    if (accessor.bufferView != null) values.set(bytes(accessor.bufferView, accessor.byteOffset, values.length, Type));
    if (accessor.sparse) {
      const sparse = accessor.sparse; const ids = bytes(sparse.indices.bufferView, sparse.indices.byteOffset, sparse.count, ARRAYS[sparse.indices.componentType]);
      const overrides = bytes(sparse.values.bufferView, sparse.values.byteOffset, sparse.count * size, Type);
      ids.forEach((id, index) => values.set(overrides.subarray(index * size, (index + 1) * size), id * size));
    }
    return { values, size };
  };
  const append = (values, size, integer = false) => {
    const padding = (4 - byteLength % 4) % 4; if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
    const typed = integer ? Uint16Array.from(values) : Float32Array.from(values);
    if (Array.from(typed).some(value => !Number.isFinite(value))) throw new Error('Refusing non-finite geometry');
    const buffer = Buffer.from(typed.buffer); const view = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: buffer.length }); chunks.push(buffer); byteLength += buffer.length;
    const accessor = { bufferView: view, componentType: integer ? 5123 : 5126, count: values.length / size, type: Object.keys(TYPES).find(key => TYPES[key] === size) };
    if (size === 3) {
      accessor.min = [Infinity, Infinity, Infinity]; accessor.max = [-Infinity, -Infinity, -Infinity];
      for (let index = 0; index < values.length; index += 1) { const axis = index % 3; accessor.min[axis] = Math.min(accessor.min[axis], values[index]); accessor.max[axis] = Math.max(accessor.max[axis], values[index]); }
    }
    json.accessors.push(accessor); return json.accessors.length - 1;
  };
  const appendIndices = values => {
    const typed = Uint32Array.from(values); const padding = (4 - byteLength % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
    const view = json.bufferViews.length; const buffer = Buffer.from(typed.buffer);
    json.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: buffer.length }); chunks.push(buffer); byteLength += buffer.length;
    json.accessors.push({ bufferView: view, componentType: 5125, count: values.length, type: 'SCALAR' }); return json.accessors.length - 1;
  };
  const appendMorph = values => {
    const ids = []; const deltas = [];
    for (let index = 0; index < values.length; index += 3) if (Math.max(Math.abs(values[index]), Math.abs(values[index + 1]), Math.abs(values[index + 2])) > 1e-8) {
      ids.push(index / 3); deltas.push(values[index], values[index + 1], values[index + 2]);
    }
    const accessor = { componentType: 5126, count: values.length / 3, type: 'VEC3' };
    if (ids.length) {
      const indices = json.accessors[appendIndices(ids)]; const data = json.accessors[append(deltas, 3)];
      accessor.sparse = { count: ids.length, indices: { bufferView: indices.bufferView, componentType: 5125 }, values: { bufferView: data.bufferView } };
    }
    json.accessors.push(accessor); return json.accessors.length - 1;
  };
  const body = json.meshes.find(mesh => mesh.name === 'GrowthTrackBody'); const primitive = body.primitives[0];
  let addedVertices = 0;
  if (!body.extras?.pelvisRefinement) {
    const refined = refinePelvisMesh(Object.fromEntries(Object.entries(primitive.attributes).map(([key, accessor]) => [key, read(accessor)])), read(primitive.indices).values, primitive.targets.map(target => read(target.POSITION).values));
    primitive.attributes = Object.fromEntries(Object.entries(refined.attributes).map(([key, attribute]) => [key, append(attribute.values, attribute.size, key === 'JOINTS_0')]));
    primitive.indices = appendIndices(refined.indices);
    primitive.targets = refined.morphs.map(values => ({ POSITION: appendMorph(values) }));
    addedVertices = refined.addedVertices;
    body.extras.pelvisRefinement = { method: 'conforming local Phong subdivision', addedVertices, originalVerticesPreserved: true };
    json.extras.vertexCount = refined.attributes.POSITION.values.length / 3;
  }
  const anatomy = JSON.parse(fs.readFileSync(anatomyFile, 'utf8'));
  const privateMesh = json.meshes.find(mesh => mesh.name === 'GrowthTrackPrivateAnatomy'); const p = privateMesh.primitives[0];
  const flat = key => anatomy[key].flat(); const count = anatomy.positions.length;
  p.attributes = { POSITION: append(flat('positions'), 3), NORMAL: append(flat('normals'), 3), COLOR_0: append(flat('colors'), 3), TEXCOORD_0: append(flat('uv_values'), 2), JOINTS_0: append(new Uint16Array(count * 4), 4, true), WEIGHTS_0: append(Array.from({ length: count * 4 }, (_, index) => index % 4 === 0 ? 1 : 0), 4) };
  p.indices = appendIndices(anatomy.indices);
  const names = Object.keys(anatomy.morphs); p.targets = names.map(name => ({ POSITION: appendMorph(anatomy.morphs[name].flat()) }));
  privateMesh.weights = names.map(() => 0); privateMesh.extras = { ...privateMesh.extras, targetNames: names, layout: anatomy.layout };
  json.extras.privateVertexCount = count;
  json.asset.extras = { ...json.asset.extras, pelvisRefinement: { version: 1, scrotum: 'continuous asymmetric envelope', topology: '64 radial segments', surface: 'submillimetre relief; pose-dependent runtime normals' } };

  // Drop replaced accessors and their binary storage, preserving embedded
  // images, all mesh primitives, skeletons, animations and feature metadata.
  const combined = Buffer.concat(chunks); const used = new Set();
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
    Object.values(primitive.attributes).forEach(index => used.add(index)); if (primitive.indices != null) used.add(primitive.indices);
    for (const target of primitive.targets || []) Object.values(target).forEach(index => used.add(index));
  }
  for (const skin of json.skins || []) if (skin.inverseBindMatrices != null) used.add(skin.inverseBindMatrices);
  for (const animation of json.animations || []) for (const sampler of animation.samplers) { used.add(sampler.input); used.add(sampler.output); }
  const accessors = [...used]; const accessorMap = new Map(accessors.map((old, index) => [old, index]));
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
    for (const key of Object.keys(primitive.attributes)) primitive.attributes[key] = accessorMap.get(primitive.attributes[key]);
    if (primitive.indices != null) primitive.indices = accessorMap.get(primitive.indices);
    for (const target of primitive.targets || []) for (const key of Object.keys(target)) target[key] = accessorMap.get(target[key]);
  }
  for (const skin of json.skins || []) if (skin.inverseBindMatrices != null) skin.inverseBindMatrices = accessorMap.get(skin.inverseBindMatrices);
  for (const animation of json.animations || []) for (const sampler of animation.samplers) { sampler.input = accessorMap.get(sampler.input); sampler.output = accessorMap.get(sampler.output); }
  json.accessors = accessors.map(index => json.accessors[index]);
  const views = new Set();
  for (const accessor of json.accessors) { if (accessor.bufferView != null) views.add(accessor.bufferView); if (accessor.sparse) { views.add(accessor.sparse.indices.bufferView); views.add(accessor.sparse.values.bufferView); } }
  for (const image of json.images || []) if (image.bufferView != null) views.add(image.bufferView);
  const compact = []; const viewMap = new Map(); const compactViews = []; let length = 0;
  for (const index of views) {
    const view = json.bufferViews[index]; const padding = (4 - length % 4) % 4; if (padding) { compact.push(Buffer.alloc(padding)); length += padding; }
    viewMap.set(index, compactViews.length); compactViews.push({ ...view, buffer: 0, byteOffset: length });
    compact.push(combined.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)); length += view.byteLength;
  }
  for (const accessor of json.accessors) { if (accessor.bufferView != null) accessor.bufferView = viewMap.get(accessor.bufferView); if (accessor.sparse) { accessor.sparse.indices.bufferView = viewMap.get(accessor.sparse.indices.bufferView); accessor.sparse.values.bufferView = viewMap.get(accessor.sparse.values.bufferView); } }
  for (const image of json.images || []) if (image.bufferView != null) image.bufferView = viewMap.get(image.bufferView);
  json.bufferViews = compactViews; json.buffers = [{ byteLength: length }];
  const jsonBytes = Buffer.from(JSON.stringify(json)); const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc((4 - jsonBytes.length % 4) % 4, 0x20)]);
  const binBytes = Buffer.concat([...compact, Buffer.alloc((4 - length % 4) % 4)]);
  const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + paddedJson.length + binBytes.length, 8); header.writeUInt32LE(paddedJson.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binBytes.length); binHeader.writeUInt32LE(0x004e4942, 4);
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, Buffer.concat([header, paddedJson, binHeader, binBytes]));
  console.log(JSON.stringify({ output, addedPelvisVertices: addedVertices, anatomyVertices: count, bytes: fs.statSync(output).size }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [input, output, anatomy] = process.argv.slice(2);
  if (!input || !output || !anatomy) throw new Error('Usage: refine-pelvis-assets.mjs INPUT OUTPUT anatomy.json');
  refineAsset(input, output, anatomy);
}
