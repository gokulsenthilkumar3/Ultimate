#!/usr/bin/env node

/**
 * Add required POSITION min/max metadata to sparse morph accessors.
 *
 * Three.js uses these bounds to size the renderable object. The authored
 * humanoid export intentionally stores morph deltas sparsely, but the first
 * export omitted bounds, which produces loader warnings and can make culling
 * unreliable. This repair only changes the JSON chunk; vertex data is kept
 * byte-for-byte intact.
 */

import fs from 'node:fs';
import path from 'node:path';

const JSON_CHUNK = 0x4E4F534A;
const BIN_CHUNK = 0x004E4942;
const COMPONENT_BYTES = Object.freeze({
  5126: 4, // FLOAT
});
const COMPONENTS = Object.freeze({ VEC3: 3 });

function parseGlb(filePath) {
  const payload = fs.readFileSync(filePath);
  if (payload.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${filePath} is not a GLB`);

  const chunks = [];
  let offset = 12;
  while (offset < payload.length) {
    const length = payload.readUInt32LE(offset);
    const type = payload.readUInt32LE(offset + 4);
    chunks.push({ type, data: payload.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }

  const jsonChunk = chunks.find((chunk) => chunk.type === JSON_CHUNK);
  const binChunk = chunks.find((chunk) => chunk.type === BIN_CHUNK);
  if (!jsonChunk || !binChunk) throw new Error(`${filePath} is missing JSON or BIN chunks`);

  const json = JSON.parse(jsonChunk.data.toString('utf8').replace(/[\u0000 ]+$/, ''));
  return { chunks, jsonChunk, binChunk, json, binary: binChunk.data };
}

function readPositionBounds(json, binary, accessor) {
  if (accessor.type !== 'VEC3' || accessor.componentType !== 5126) return null;

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const include = (x, y, z) => {
    min[0] = Math.min(min[0], x); min[1] = Math.min(min[1], y); min[2] = Math.min(min[2], z);
    max[0] = Math.max(max[0], x); max[1] = Math.max(max[1], y); max[2] = Math.max(max[2], z);
  };

  const sparse = accessor.sparse;
  if (sparse) {
    // Sparse morph targets use zero as the implicit base value.
    include(0, 0, 0);
    const view = json.bufferViews[sparse.values.bufferView];
    const start = (view.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
    const stride = view.byteStride ?? COMPONENT_BYTES[accessor.componentType] * COMPONENTS[accessor.type];
    for (let i = 0; i < sparse.count; i += 1) {
      const valueOffset = start + i * stride;
      include(
        binary.readFloatLE(valueOffset),
        binary.readFloatLE(valueOffset + 4),
        binary.readFloatLE(valueOffset + 8),
      );
    }
  } else if (accessor.bufferView !== undefined) {
    const view = json.bufferViews[accessor.bufferView];
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const stride = view.byteStride ?? COMPONENT_BYTES[accessor.componentType] * COMPONENTS[accessor.type];
    for (let i = 0; i < accessor.count; i += 1) {
      const valueOffset = start + i * stride;
      include(
        binary.readFloatLE(valueOffset),
        binary.readFloatLE(valueOffset + 4),
        binary.readFloatLE(valueOffset + 8),
      );
    }
  } else {
    include(0, 0, 0);
  }

  return { min, max };
}

function collectPositionAccessors(json) {
  const indices = new Set();
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      for (const target of primitive.targets ?? []) {
        if (target.POSITION !== undefined) indices.add(target.POSITION);
      }
    }
  }
  return [...indices];
}

function encodeGlb(parsed) {
  const jsonPayload = Buffer.from(JSON.stringify(parsed.json));
  const paddedJson = Buffer.concat([
    jsonPayload,
    Buffer.alloc((4 - (jsonPayload.length % 4)) % 4, 0x20),
  ]);
  parsed.jsonChunk.data = paddedJson;

  const body = Buffer.concat(parsed.chunks.flatMap(({ type, data }) => {
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.writeUInt32LE(data.length, 0);
    chunkHeader.writeUInt32LE(type, 4);
    return [chunkHeader, data];
  }));
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 4, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([header, body]);
}

function repair(filePath) {
  const parsed = parseGlb(filePath);
  const accessors = parsed.json.accessors ?? [];
  let repaired = 0;

  for (const index of collectPositionAccessors(parsed.json)) {
    const accessor = accessors[index];
    if (!accessor || (accessor.min && accessor.max)) continue;
    const bounds = readPositionBounds(parsed.json, parsed.binary, accessor);
    if (!bounds) continue;
    accessor.min = bounds.min;
    accessor.max = bounds.max;
    repaired += 1;
  }

  if (!repaired) {
    console.log(`• ${path.basename(filePath)}: bounds already present`);
    return;
  }

  parsed.json.asset = parsed.json.asset ?? {};
  parsed.json.asset.extras = {
    ...(parsed.json.asset.extras ?? {}),
    positionAccessorBoundsRepaired: true,
  };

  const output = encodeGlb(parsed);
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, output);
  fs.renameSync(temporary, filePath);
  console.log(`✓ ${path.basename(filePath)}: repaired ${repaired} POSITION accessors`);
}

const inputs = process.argv.slice(2);
if (!inputs.length) {
  inputs.push(
    'public/assets/models/humanoid-base.glb',
    'public/assets/models/humanoid-base-lite.glb',
  );
}

for (const input of inputs) repair(path.resolve(input));
