#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Box3, Matrix4, Quaternion, Vector3 } from 'three';

const JSON_CHUNK = 0x4E4F534A;
const BIN_CHUNK = 0x004E4942;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ASSETS = [
  path.resolve(__dirname, '../public/assets/models/humanoid-base.glb'),
  path.resolve(__dirname, '../public/assets/models/humanoid-base-lite.glb'),
];

function parseGlb(filePath) {
  const buffer = readFileSync(filePath);
  const chunks = [];
  for (let offset = 12; offset < buffer.length;) {
    const byteLength = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    chunks.push({ type, data: Buffer.from(buffer.subarray(offset + 8, offset + 8 + byteLength)) });
    offset += 8 + byteLength;
  }
  const jsonChunk = chunks.find((chunk) => chunk.type === JSON_CHUNK);
  const binaryChunk = chunks.find((chunk) => chunk.type === BIN_CHUNK);
  if (!jsonChunk || !binaryChunk) throw new Error(`${path.basename(filePath)} is missing GLB chunks`);
  return {
    chunks,
    binary: binaryChunk.data,
    json: JSON.parse(jsonChunk.data.toString('utf8').replace(/[\u0000\u0020]+$/u, '')),
  };
}

function writeGlb(filePath, parsed) {
  const jsonBytes = Buffer.from(JSON.stringify(parsed.json), 'utf8');
  const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc((4 - jsonBytes.length % 4) % 4, 0x20)]);
  const chunks = parsed.chunks.map((chunk) => chunk.type === JSON_CHUNK ? { ...chunk, data: paddedJson } : chunk);
  const totalLength = 12 + chunks.reduce((sum, chunk) => sum + 8 + chunk.data.length, 0);
  const output = Buffer.alloc(totalLength);
  output.write('glTF', 0, 'ascii');
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  let offset = 12;
  chunks.forEach((chunk) => {
    output.writeUInt32LE(chunk.data.length, offset);
    output.writeUInt32LE(chunk.type, offset + 4);
    chunk.data.copy(output, offset + 8);
    offset += 8 + chunk.data.length;
  });
  writeFileSync(filePath, output);
}

function localMatrix(node) {
  if (node.matrix) return new Matrix4().fromArray(node.matrix);
  return new Matrix4().compose(
    new Vector3().fromArray(node.translation ?? [0, 0, 0]),
    new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
    new Vector3().fromArray(node.scale ?? [1, 1, 1]),
  );
}

function parentMap(nodes) {
  const result = new Map();
  nodes.forEach((node, parentIndex) => (node.children ?? []).forEach((child) => result.set(child, parentIndex)));
  return result;
}

function worldMatrix(nodes, parents, index, cache = new Map()) {
  if (cache.has(index)) return cache.get(index).clone();
  const parent = parents.get(index);
  const world = parent == null ? localMatrix(nodes[index]) : worldMatrix(nodes, parents, parent, cache).multiply(localMatrix(nodes[index]));
  cache.set(index, world.clone());
  return world;
}

function positionAccessor(json, meshIndex) {
  const accessorIndex = json.meshes?.[meshIndex]?.primitives?.[0]?.attributes?.POSITION;
  return accessorIndex == null ? null : json.accessors?.[accessorIndex];
}

function accessorPoints(json, binary, accessor) {
  if (!accessor || accessor.componentType !== 5126 || accessor.type !== 'VEC3') throw new Error('Expected FLOAT VEC3 position accessor');
  const view = json.bufferViews[accessor.bufferView];
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? 12;
  const points = [];
  for (let index = 0; index < accessor.count; index += 1) {
    const offset = start + index * stride;
    points.push(new Vector3(binary.readFloatLE(offset), binary.readFloatLE(offset + 4), binary.readFloatLE(offset + 8)));
  }
  return points;
}

function accessorWorldBox(accessor, matrix) {
  const box = new Box3();
  for (const x of [accessor.min[0], accessor.max[0]]) {
    for (const y of [accessor.min[1], accessor.max[1]]) {
      for (const z of [accessor.min[2], accessor.max[2]]) box.expandByPoint(new Vector3(x, y, z).applyMatrix4(matrix));
    }
  }
  return box;
}

function translateNodeWorldZ(node, parentWorld, shiftZ) {
  const local = localMatrix(node);
  const parentInverse = parentWorld.clone().invert();
  const localOffset = new Vector3(0, 0, shiftZ)
    .applyMatrix4(parentInverse)
    .sub(new Vector3(0, 0, 0).applyMatrix4(parentInverse));
  local.elements[12] += localOffset.x;
  local.elements[13] += localOffset.y;
  local.elements[14] += localOffset.z;
  node.matrix = local.toArray().map((value) => Number(value.toFixed(10)));
  delete node.translation;
  delete node.rotation;
  delete node.scale;
}

function calibrate(filePath) {
  const parsed = parseGlb(filePath);
  const { json, binary } = parsed;
  const nodes = json.nodes ?? [];
  const parents = parentMap(nodes);
  const cache = new Map();
  const bodyIndex = nodes.findIndex((node) => node.name === 'Body');
  const headIndex = nodes.findIndex((node) => node.name === 'Head');
  const eyesIndex = nodes.findIndex((node) => node.name === 'GrowthTrackEyes');
  const hairIndex = nodes.findIndex((node) => node.name === 'GrowthTrackHair');
  if ([bodyIndex, headIndex, eyesIndex, hairIndex].some((index) => index < 0)) throw new Error(`${path.basename(filePath)} is missing required feature nodes`);

  const bodyNode = nodes[bodyIndex];
  const bodyMatrix = worldMatrix(nodes, parents, bodyIndex, cache);
  const bodyPoints = accessorPoints(json, binary, positionAccessor(json, bodyNode.mesh)).map((point) => point.applyMatrix4(bodyMatrix));
  const headWorld = worldMatrix(nodes, parents, headIndex, cache);

  const featureInfo = (index) => {
    const node = nodes[index];
    const matrix = worldMatrix(nodes, parents, index, cache);
    return { node, box: accessorWorldBox(positionAccessor(json, node.mesh), matrix) };
  };
  const eyes = featureInfo(eyesIndex);
  const hair = featureInfo(hairIndex);

  const eyeHalfWidth = Math.max(Math.abs(eyes.box.min.x), Math.abs(eyes.box.max.x)) * 1.5;
  const facePoints = bodyPoints.filter((point) => point.y >= eyes.box.min.y && point.y <= eyes.box.max.y && Math.abs(point.x) <= eyeHalfWidth);
  if (!facePoints.length) throw new Error(`${path.basename(filePath)} has no body samples behind the eye asset`);
  const faceFront = Math.max(...facePoints.map((point) => point.z));
  const eyeShiftZ = faceFront + 0.008 - eyes.box.max.z;

  const hairHalfWidth = Math.max(Math.abs(hair.box.min.x), Math.abs(hair.box.max.x)) * 1.15;
  const scalpPoints = bodyPoints.filter((point) => point.y >= hair.box.min.y && point.y <= hair.box.max.y && Math.abs(point.x) <= hairHalfWidth);
  if (!scalpPoints.length) throw new Error(`${path.basename(filePath)} has no body samples behind the hair asset`);
  const scalpMinZ = Math.min(...scalpPoints.map((point) => point.z));
  const scalpMaxZ = Math.max(...scalpPoints.map((point) => point.z));
  const scalpCenterZ = (scalpMinZ + scalpMaxZ) * 0.5;
  const hairCenterZ = (hair.box.min.z + hair.box.max.z) * 0.5;
  const hairShiftZ = scalpCenterZ - hairCenterZ;

  const eyeAlignmentOffsetZ = Number(eyes.node.extras?.alignmentOffsetZ ?? 0) + eyeShiftZ;
  const hairAlignmentOffsetZ = Number(hair.node.extras?.alignmentOffsetZ ?? 0) + hairShiftZ;
  translateNodeWorldZ(eyes.node, headWorld, eyeShiftZ);
  translateNodeWorldZ(hair.node, headWorld, hairShiftZ);
  eyes.node.extras = { ...(eyes.node.extras ?? {}), alignment: 'body-surface-calibrated', alignmentOffsetZ: Number(eyeAlignmentOffsetZ.toFixed(6)) };
  hair.node.extras = { ...(hair.node.extras ?? {}), alignment: 'body-surface-calibrated', alignmentOffsetZ: Number(hairAlignmentOffsetZ.toFixed(6)) };
  json.asset.extras = {
    ...(json.asset.extras ?? {}),
    featureAlignment: { method: 'body-surface-bounds', calibrated: true },
  };

  writeGlb(filePath, parsed);
  console.log(`✓ ${path.basename(filePath)}: eyes ${eyeShiftZ.toFixed(4)}m · hair ${hairShiftZ.toFixed(4)}m on Z`);
}

const inputs = process.argv.slice(2);
(inputs.length ? inputs.map((input) => path.resolve(process.cwd(), input)) : DEFAULT_ASSETS).forEach(calibrate);
