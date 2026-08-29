#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Matrix4, Quaternion, Vector3 } from 'three';

const JSON_CHUNK = 0x4E4F534A;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ASSETS = [
  path.resolve(__dirname, '../public/assets/models/humanoid-base.glb'),
  path.resolve(__dirname, '../public/assets/models/humanoid-base-lite.glb'),
];

function parseGlb(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${filePath} is not a GLB`);

  const chunks = [];
  for (let offset = 12; offset < buffer.length;) {
    const byteLength = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const data = Buffer.from(buffer.subarray(offset + 8, offset + 8 + byteLength));
    chunks.push({ type, data });
    offset += 8 + byteLength;
  }

  const jsonChunk = chunks.find((chunk) => chunk.type === JSON_CHUNK);
  if (!jsonChunk) throw new Error(`${filePath} has no JSON chunk`);
  const json = JSON.parse(jsonChunk.data.toString('utf8').replace(/[\u0000\u0020]+$/u, ''));
  return { buffer, chunks, json };
}

function nodeLocalMatrix(node) {
  if (node.matrix) return new Matrix4().fromArray(node.matrix);
  return new Matrix4().compose(
    new Vector3().fromArray(node.translation ?? [0, 0, 0]),
    new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
    new Vector3().fromArray(node.scale ?? [1, 1, 1]),
  );
}

function buildParentMap(nodes) {
  const parents = new Map();
  nodes.forEach((node, parentIndex) => {
    (node.children ?? []).forEach((childIndex) => parents.set(childIndex, parentIndex));
  });
  return parents;
}

function nodeWorldMatrix(nodes, parents, nodeIndex, cache = new Map()) {
  if (cache.has(nodeIndex)) return cache.get(nodeIndex).clone();
  const local = nodeLocalMatrix(nodes[nodeIndex]);
  const parentIndex = parents.get(nodeIndex);
  const world = parentIndex == null
    ? local
    : nodeWorldMatrix(nodes, parents, parentIndex, cache).multiply(local);
  cache.set(nodeIndex, world.clone());
  return world;
}

function roundedMatrix(matrix) {
  return matrix.toArray().map((value) => Math.abs(value) < 1e-10 ? 0 : Number(value.toFixed(10)));
}

function writeGlb(filePath, parsed) {
  const jsonBytes = Buffer.from(JSON.stringify(parsed.json), 'utf8');
  const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
  const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)]);
  const chunks = parsed.chunks.map((chunk) => (
    chunk.type === JSON_CHUNK ? { type: chunk.type, data: paddedJson } : chunk
  ));
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

function repairFile(filePath) {
  const parsed = parseGlb(filePath);
  const { json } = parsed;
  const nodes = json.nodes ?? [];
  const headIndex = nodes.findIndex((node) => node.name === 'Head');
  if (headIndex < 0) throw new Error(`${path.basename(filePath)} has no Head joint`);

  const parents = buildParentMap(nodes);
  const worldCache = new Map();
  const headWorld = nodeWorldMatrix(nodes, parents, headIndex, worldCache);
  const featureNames = ['GrowthTrackEyes', 'GrowthTrackHair'];
  const featureIndices = featureNames.map((name) => {
    const index = nodes.findIndex((node) => node.name === name);
    if (index < 0) throw new Error(`${path.basename(filePath)} has no ${name} node`);
    return index;
  });
  const featureWorldMatrices = new Map(
    featureIndices.map((index) => [index, nodeWorldMatrix(nodes, parents, index, worldCache)]),
  );

  // Detach from the former scene/parent before binding to Head. The new local
  // matrix preserves the authored rest-pose world transform exactly.
  nodes.forEach((node) => {
    if (!node.children) return;
    node.children = node.children.filter((childIndex) => !featureIndices.includes(childIndex));
    if (node.children.length === 0) delete node.children;
  });
  (json.scenes ?? []).forEach((scene) => {
    scene.nodes = (scene.nodes ?? []).filter((nodeIndex) => !featureIndices.includes(nodeIndex));
  });

  const head = nodes[headIndex];
  head.children = [...new Set([...(head.children ?? []), ...featureIndices])];
  const inverseHeadWorld = headWorld.clone().invert();

  featureIndices.forEach((featureIndex) => {
    const node = nodes[featureIndex];
    const local = inverseHeadWorld.clone().multiply(featureWorldMatrices.get(featureIndex));
    node.matrix = roundedMatrix(local);
    delete node.translation;
    delete node.rotation;
    delete node.scale;
    node.extras = {
      ...(node.extras ?? {}),
      headBound: true,
      headJoint: 'Head',
      bindMode: 'parent-preserve-world',
    };
  });

  json.asset = json.asset ?? { version: '2.0' };
  json.asset.extras = {
    ...(json.asset.extras ?? {}),
    featureRig: 'eyes-hair-parented-to-head',
  };
  writeGlb(filePath, parsed);
  console.log(`✓ ${path.basename(filePath)}: Eyes and Hair parented to Head with rest pose preserved`);
}

const inputs = process.argv.slice(2);
const files = inputs.length ? inputs.map((input) => path.resolve(process.cwd(), input)) : DEFAULT_ASSETS;
files.forEach(repairFile);
