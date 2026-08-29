#!/usr/bin/env node
/**
 * Bake the embedded GrowthTrackBody geometry into the skin surface maps.
 *
 * This is deliberately an offline asset step. It does not generate tiled
 * noise. The normal map is rasterised from the body's actual UVs, positions,
 * face normals, and vertex normals. The red AO channel is ray-traced against
 * the same triangle topology through a MeshBVH and then baked back into each
 * skin albedo because the body has no UV2 channel.
 *
 * A higher-resolution sculpt can be supplied by a future Blender export, but
 * the current GLBs now contain a reproducible geometry-correlated bake rather
 * than a misleading procedural placeholder.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_ASSETS = [
  path.join(ROOT, 'public/assets/models/humanoid-base.glb'),
  path.join(ROOT, 'public/assets/models/humanoid-base-lite.glb'),
];
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const NORMAL_NAME = 'SkinNormal_GeometryBaked';
const PACKED_NAME = 'SkinAO_Roughness_GeometryBaked';
const ALBEDO_NAMES = ['SkinAlbedo_YoungMale', 'SkinAlbedo_Light', 'SkinAlbedo_Deep'];
const AO_STRENGTH = 0.62;
const DEFAULT_RAY_COUNT = 12;
const EPSILON = 0.0018;
const LEGACY_NORMAL_NAME = 'SkinNormal_ProceduralMicrodetail';
const LEGACY_PACKED_NAME = 'SkinAO_Roughness';

function parseArgs() {
  const values = { assets: [], rays: DEFAULT_RAY_COUNT, resolution: null, repackAlbedo: false };
  for (const argument of process.argv.slice(2)) {
    if (argument.startsWith('--rays=')) values.rays = Math.max(4, Number(argument.slice(7)) || DEFAULT_RAY_COUNT);
    else if (argument.startsWith('--resolution=')) values.resolution = Math.max(128, Number(argument.slice(13)) || 1024);
    else if (argument === '--repack-albedo') values.repackAlbedo = true;
    else values.assets.push(path.resolve(argument));
  }
  return values;
}

function parseGlb(filePath) {
  const payload = fs.readFileSync(filePath);
  if (payload.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${filePath} is not a GLB`);
  const chunks = [];
  let offset = 12;
  while (offset < payload.length) {
    const length = payload.readUInt32LE(offset);
    const kind = payload.readUInt32LE(offset + 4);
    chunks.push({ kind, data: payload.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  const jsonIndex = chunks.findIndex((chunk) => chunk.kind === JSON_CHUNK);
  const binIndex = chunks.findIndex((chunk) => chunk.kind === BIN_CHUNK);
  if (jsonIndex < 0 || binIndex < 0) throw new Error(`${filePath} is missing JSON or BIN chunk`);
  return {
    chunks,
    jsonIndex,
    binIndex,
    document: JSON.parse(chunks[jsonIndex].data.toString('utf8').trim()),
    binary: chunks[binIndex].data,
  };
}

function componentInfo(componentType) {
  const info = {
    5120: { bytes: 1, read: (view, offset) => view.readInt8(offset) },
    5121: { bytes: 1, read: (view, offset) => view.readUInt8(offset) },
    5122: { bytes: 2, read: (view, offset) => view.readInt16LE(offset) },
    5123: { bytes: 2, read: (view, offset) => view.readUInt16LE(offset) },
    5125: { bytes: 4, read: (view, offset) => view.readUInt32LE(offset) },
    5126: { bytes: 4, read: (view, offset) => view.readFloatLE(offset) },
  }[componentType];
  if (!info) throw new Error(`Unsupported GLB component type ${componentType}`);
  return info;
}

function componentCount(type) {
  return { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }[type];
}

function readAccessor(document, binary, accessorIndex) {
  const accessor = document.accessors[accessorIndex];
  const count = accessor.count;
  const components = componentCount(accessor.type);
  const info = componentInfo(accessor.componentType);
  const output = new Float64Array(count * components);
  const view = accessor.bufferView === undefined ? null : document.bufferViews[accessor.bufferView];
  const viewStart = view ? (view.byteOffset || 0) : 0;
  const viewBytes = view ? binary.subarray(viewStart, viewStart + view.byteLength) : null;
  const stride = view?.byteStride || info.bytes * components;
  const normalized = Boolean(accessor.normalized);

  for (let index = 0; index < count; index += 1) {
    const rowStart = index * stride;
    for (let component = 0; component < components; component += 1) {
      let value = viewBytes ? info.read(viewBytes, rowStart + component * info.bytes) : 0;
      if (normalized) {
        if (accessor.componentType === 5120) value = Math.max(value / 127, -1);
        else if (accessor.componentType === 5121) value /= 255;
        else if (accessor.componentType === 5122) value = Math.max(value / 32767, -1);
        else if (accessor.componentType === 5123) value /= 65535;
      }
      output[index * components + component] = value;
    }
  }

  if (accessor.sparse) {
    throw new Error(`Sparse base accessor ${accessorIndex} is not supported by the surface baker`);
  }
  return { values: output, count, components };
}

function getImageBytes(document, binary, image) {
  const view = document.bufferViews[image.bufferView];
  const start = view.byteOffset || 0;
  return binary.subarray(start, start + view.byteLength);
}

function paeth(a, b, c) {
  const estimate = a + b - c;
  const pa = Math.abs(estimate - a);
  const pb = Math.abs(estimate - b);
  const pc = Math.abs(estimate - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(payload) {
  if (payload.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error('Expected PNG image data');
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const compressed = [];
  let offset = 8;
  while (offset < payload.length) {
    const length = payload.readUInt32BE(offset);
    const type = payload.toString('ascii', offset + 4, offset + 8);
    const data = payload.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8) throw new Error(`Only 8-bit PNGs are supported, got ${bitDepth}`);
      if (![0, 2, 4, 6].includes(colorType)) throw new Error(`Unsupported PNG color type ${colorType}`);
    } else if (type === 'IDAT') compressed.push(data);
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const rowBytes = width * channels;
  const inflated = inflateSync(Buffer.concat(compressed));
  const pixels = new Uint8Array(width * height * channels);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset++];
    const rowStart = y * rowBytes;
    const previousStart = (y - 1) * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = inflated[sourceOffset++];
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const above = y > 0 ? pixels[previousStart + x] : 0;
      const upperLeft = y > 0 && x >= channels ? pixels[previousStart + x - channels] : 0;
      let value = raw;
      if (filter === 1) value += left;
      else if (filter === 2) value += above;
      else if (filter === 3) value += Math.floor((left + above) / 2);
      else if (filter === 4) value += paeth(left, above, upperLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      pixels[rowStart + x] = value & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

function pngChunk(type, data) {
  const kind = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([kind, data]);
  let crc = 0xffffffff;
  for (const byte of crcInput) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const checksum = Buffer.allocUnsafe(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(data.length, 0);
  return Buffer.concat([length, kind, data, checksum]);
}

function encodePng(width, height, channels, pixels) {
  if (![3, 4].includes(channels)) throw new Error(`PNG encoder expects RGB/RGBA, got ${channels}`);
  const rowBytes = width * channels;
  const scanlines = Buffer.alloc((rowBytes + 1) * height);
  const previous = new Uint8Array(rowBytes);
  for (let y = 0; y < height; y += 1) {
    const source = pixels.subarray(y * rowBytes, (y + 1) * rowBytes);
    const candidates = [];
    for (let filter = 0; filter <= 4; filter += 1) {
      const encoded = new Uint8Array(rowBytes);
      let score = 0;
      for (let x = 0; x < rowBytes; x += 1) {
        const left = x >= channels ? source[x - channels] : 0;
        const above = previous[x];
        const upperLeft = x >= channels ? previous[x - channels] : 0;
        let predictor = 0;
        if (filter === 1) predictor = left;
        else if (filter === 2) predictor = above;
        else if (filter === 3) predictor = Math.floor((left + above) / 2);
        else if (filter === 4) predictor = paeth(left, above, upperLeft);
        const delta = (source[x] - predictor + 256) & 0xff;
        encoded[x] = delta;
        score += Math.abs(delta < 128 ? delta : delta - 256);
      }
      candidates.push({ filter, encoded, score });
    }
    candidates.sort((a, b) => a.score - b.score || a.filter - b.filter);
    const best = candidates[0];
    const destination = y * (rowBytes + 1);
    scanlines[destination] = best.filter;
    Buffer.from(best.encoded).copy(scanlines, destination + 1);
    previous.set(source);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(vector, amount) {
  return [vector[0] * amount, vector[1] * amount, vector[2] * amount];
}

function getVec(values, index, width) {
  const start = index * width;
  return [values[start], values[start + 1], values[start + 2]];
}

function getUv(values, index) {
  const start = index * 2;
  return [values[start], values[start + 1]];
}

function createBodyData(document, binary) {
  const mesh = document.meshes.find((item) => item.name === 'GrowthTrackBody');
  if (!mesh) throw new Error('GrowthTrackBody mesh is missing');
  const primitive = mesh.primitives[0];
  const positions = readAccessor(document, binary, primitive.attributes.POSITION).values;
  const normals = readAccessor(document, binary, primitive.attributes.NORMAL).values;
  const uvs = readAccessor(document, binary, primitive.attributes.TEXCOORD_0).values;
  const indicesAccessor = readAccessor(document, binary, primitive.indices);
  const indices = Uint32Array.from(indicesAccessor.values);
  if (positions.length / 3 !== normals.length / 3 || positions.length / 3 !== uvs.length / 2) {
    throw new Error('Body position, normal, and UV counts do not match');
  }
  return { positions, normals, uvs, indices, vertexCount: positions.length / 3 };
}

function buildBvh(body) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(body.positions), 3));
  geometry.setIndex(new THREE.BufferAttribute(body.indices, 1));
  return new MeshBVH(geometry, { maxLeafTris: 8, verbose: false });
}

function chooseTangent(normal) {
  const helper = Math.abs(normal[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  return normalize(cross(helper, normal));
}

function bakeVertexAo(body, bvh, rayCount) {
  const ao = new Float32Array(body.vertexCount);
  const bounds = new THREE.Box3();
  for (let index = 0; index < body.vertexCount; index += 1) bounds.expandByPoint(new THREE.Vector3(...getVec(body.positions, index, 3)));
  const size = bounds.getSize(new THREE.Vector3());
  const rayLength = Math.max(0.12, Math.max(size.x, size.y, size.z) * 0.22);
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const ray = new THREE.Ray();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let vertex = 0; vertex < body.vertexCount; vertex += 1) {
    const position = getVec(body.positions, vertex, 3);
    const normal = normalize(getVec(body.normals, vertex, 3));
    const tangent = chooseTangent(normal);
    const bitangent = normalize(cross(normal, tangent));
    origin.set(position[0] + normal[0] * EPSILON, position[1] + normal[1] * EPSILON, position[2] + normal[2] * EPSILON);
    let hits = 0;

    for (let sample = 0; sample < rayCount; sample += 1) {
      const radialSample = (sample + 0.5) / rayCount;
      const z = Math.sqrt(1 - radialSample);
      const radius = Math.sqrt(radialSample);
      const phi = sample * goldenAngle;
      const localX = Math.cos(phi) * radius;
      const localY = Math.sin(phi) * radius;
      const worldDirection = add(add(scale(tangent, localX), scale(bitangent, localY)), scale(normal, z));
      direction.set(worldDirection[0], worldDirection[1], worldDirection[2]).normalize();
      ray.origin.copy(origin);
      ray.direction.copy(direction);
      if (bvh.raycastFirst(ray, THREE.DoubleSide, EPSILON * 1.25, rayLength)) hits += 1;
    }
    ao[vertex] = clamp01(1 - (hits / rayCount) * 0.92);
    if ((vertex + 1) % 2000 === 0) console.log(`  AO rays: ${vertex + 1}/${body.vertexCount}`);
  }
  return ao;
}

function rasterizeSurface(body, vertexAo, resolution) {
  const normalPixels = new Uint8Array(resolution * resolution * 3);
  const packedPixels = new Uint8Array(resolution * resolution * 3);
  const filled = new Uint8Array(resolution * resolution);
  normalPixels.fill(128);
  for (let pixel = 0; pixel < resolution * resolution; pixel += 1) {
    normalPixels[pixel * 3 + 2] = 255;
    packedPixels[pixel * 3] = 255;
    packedPixels[pixel * 3 + 1] = 184;
  }

  const putPixel = (x, y, barycentric, triangle) => {
    const pixelIndex = y * resolution + x;
    if (filled[pixelIndex]) return;
    const [a, b, c] = triangle;
    const point = [
      body.positions[a * 3] * barycentric[0] + body.positions[b * 3] * barycentric[1] + body.positions[c * 3] * barycentric[2],
      body.positions[a * 3 + 1] * barycentric[0] + body.positions[b * 3 + 1] * barycentric[1] + body.positions[c * 3 + 1] * barycentric[2],
      body.positions[a * 3 + 2] * barycentric[0] + body.positions[b * 3 + 2] * barycentric[1] + body.positions[c * 3 + 2] * barycentric[2],
    ];
    const vertexNormal = normalize([
      body.normals[a * 3] * barycentric[0] + body.normals[b * 3] * barycentric[1] + body.normals[c * 3] * barycentric[2],
      body.normals[a * 3 + 1] * barycentric[0] + body.normals[b * 3 + 1] * barycentric[1] + body.normals[c * 3 + 1] * barycentric[2],
      body.normals[a * 3 + 2] * barycentric[0] + body.normals[b * 3 + 2] * barycentric[1] + body.normals[c * 3 + 2] * barycentric[2],
    ]);
    const p0 = getVec(body.positions, a, 3);
    const p1 = getVec(body.positions, b, 3);
    const p2 = getVec(body.positions, c, 3);
    const uv0 = getUv(body.uvs, a);
    const uv1 = getUv(body.uvs, b);
    const uv2 = getUv(body.uvs, c);
    const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const faceNormal = normalize(cross(edge1, edge2));
    if (dot(faceNormal, vertexNormal) < 0) faceNormal[0] *= -1, faceNormal[1] *= -1, faceNormal[2] *= -1;
    const duv1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
    const duv2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];
    const determinant = duv1[0] * duv2[1] - duv1[1] * duv2[0];
    if (Math.abs(determinant) < 1e-8) return;
    const tangent = normalize(scale([
      edge1[0] * duv2[1] - edge2[0] * duv1[1],
      edge1[1] * duv2[1] - edge2[1] * duv1[1],
      edge1[2] * duv2[1] - edge2[2] * duv1[1],
    ], 1 / determinant));
    const handedBitangent = scale(normalize(cross(vertexNormal, tangent)), dot(cross(vertexNormal, tangent), normalize(scale([
      edge2[0] * duv1[0] - edge1[0] * duv2[0],
      edge2[1] * duv1[0] - edge1[1] * duv2[0],
      edge2[2] * duv1[0] - edge1[2] * duv2[0],
    ], 1 / determinant))) < 0 ? -1 : 1);
    const detailNormal = normalize([
      vertexNormal[0] * 0.78 + faceNormal[0] * 0.22,
      vertexNormal[1] * 0.78 + faceNormal[1] * 0.22,
      vertexNormal[2] * 0.78 + faceNormal[2] * 0.22,
    ]);
    const tx = dot(detailNormal, tangent);
    const ty = dot(detailNormal, handedBitangent);
    const tz = Math.max(0, dot(detailNormal, vertexNormal));
    const normalOffset = pixelIndex * 3;
    normalPixels[normalOffset] = Math.round(clamp01(tx * 0.5 + 0.5) * 255);
    normalPixels[normalOffset + 1] = Math.round(clamp01(ty * 0.5 + 0.5) * 255);
    normalPixels[normalOffset + 2] = Math.round(clamp01(tz * 0.5 + 0.5) * 255);

    const head = clamp01((point[1] - 1.55) / 0.38);
    const torso = clamp01(1 - Math.abs(point[1] - 1.14) / 0.48);
    const faceOil = head * 0.20;
    const torsoOil = torso * clamp01((point[2] + 0.02) / 0.20) * 0.06;
    const roughness = clamp01(0.72 - faceOil - torsoOil);
    const packedOffset = pixelIndex * 3;
    packedPixels[packedOffset] = Math.round(clamp01(vertexAo[a] * barycentric[0] + vertexAo[b] * barycentric[1] + vertexAo[c] * barycentric[2]) * 255);
    packedPixels[packedOffset + 1] = Math.round(roughness * 255);
    packedPixels[packedOffset + 2] = 0;
    filled[pixelIndex] = 1;
  };

  for (let index = 0; index < body.indices.length; index += 3) {
    const triangle = [body.indices[index], body.indices[index + 1], body.indices[index + 2]];
    const uv = triangle.map((vertex) => getUv(body.uvs, vertex));
    if (uv.some(([u, v]) => !Number.isFinite(u) || !Number.isFinite(v))) continue;
    const minX = Math.max(0, Math.floor(Math.min(...uv.map(([u]) => u)) * resolution));
    const maxX = Math.min(resolution - 1, Math.ceil(Math.max(...uv.map(([u]) => u)) * resolution));
    const minY = Math.max(0, Math.floor((1 - Math.max(...uv.map(([, v]) => v))) * resolution));
    const maxY = Math.min(resolution - 1, Math.ceil((1 - Math.min(...uv.map(([, v]) => v))) * resolution));
    const ax = uv[0][0] * resolution;
    const ay = (1 - uv[0][1]) * resolution;
    const bx = uv[1][0] * resolution;
    const by = (1 - uv[1][1]) * resolution;
    const cx = uv[2][0] * resolution;
    const cy = (1 - uv[2][1]) * resolution;
    const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(denominator) < 1e-8) continue;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denominator;
        const w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denominator;
        const w2 = 1 - w0 - w1;
        if (w0 >= -1e-5 && w1 >= -1e-5 && w2 >= -1e-5) putPixel(x, y, [w0, w1, w2], triangle);
      }
    }
  }

  // UV padding prevents filtered samples at island edges from falling into a
  // neutral black/blue texel. The padding copies the nearest covered pixel in
  // the four cardinal directions for a few texels and stays deterministic.
  for (let pass = 0; pass < 3; pass += 1) {
    for (let y = 1; y < resolution - 1; y += 1) {
      for (let x = 1; x < resolution - 1; x += 1) {
        const pixelIndex = y * resolution + x;
        if (filled[pixelIndex]) continue;
        const neighbors = [pixelIndex - 1, pixelIndex + 1, pixelIndex - resolution, pixelIndex + resolution];
        const source = neighbors.find((candidate) => filled[candidate]);
        if (source === undefined) continue;
        for (let channel = 0; channel < 3; channel += 1) {
          normalPixels[pixelIndex * 3 + channel] = normalPixels[source * 3 + channel];
          packedPixels[pixelIndex * 3 + channel] = packedPixels[source * 3 + channel];
        }
        filled[pixelIndex] = 1;
      }
    }
  }
  return { normalPixels, packedPixels, filledCount: filled.reduce((sum, value) => sum + value, 0) };
}

function sampleChannel(image, u, v, channel) {
  const x = clamp01(u) * (image.width - 1);
  const y = clamp01(1 - v) * (image.height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(image.width - 1, x0 + 1);
  const y1 = Math.min(image.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const get = (px, py) => image.pixels[(py * image.width + px) * image.channels + Math.min(channel, image.channels - 1)] / 255;
  return get(x0, y0) * (1 - tx) * (1 - ty) + get(x1, y0) * tx * (1 - ty) + get(x0, y1) * (1 - tx) * ty + get(x1, y1) * tx * ty;
}

function bakeAlbedo(sourcePayload, oldPackedImage, bakedAoImage) {
  const source = decodePng(sourcePayload);
  const output = new Uint8Array(source.width * source.height * 4);
  const hasAlpha = source.channels === 4 || source.channels === 2;
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (y * source.width + x) * source.channels;
      const outputIndex = (y * source.width + x) * 4;
      const oldAo = sampleChannel(oldPackedImage, (x + 0.5) / source.width, 1 - (y + 0.5) / source.height, 0);
      const newAo = sampleChannel(bakedAoImage, (x + 0.5) / source.width, 1 - (y + 0.5) / source.height, 0);
      const oldOcclusion = Math.max(0.22, 1 - 0.65 * (1 - oldAo));
      const newOcclusion = 1 - AO_STRENGTH * (1 - newAo);
      for (let channel = 0; channel < 3; channel += 1) {
        const raw = source.pixels[sourceIndex + Math.min(channel, source.channels - 1)] / 255;
        const srgb = clamp01(raw);
        const linear = srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
        const restored = clamp01(linear / oldOcclusion) * newOcclusion;
        const encoded = restored <= 0.0031308 ? restored * 12.92 : 1.055 * (restored ** (1 / 2.4)) - 0.055;
        output[outputIndex + channel] = Math.round(clamp01(encoded) * 255);
      }
      output[outputIndex + 3] = hasAlpha ? source.pixels[sourceIndex + source.channels - 1] : 255;
    }
  }
  return encodePng(source.width, source.height, 4, output);
}

function rebuildBinary(document, oldBinary, replacements) {
  const pieces = [];
  let offset = 0;
  for (let index = 0; index < document.bufferViews.length; index += 1) {
    const view = document.bufferViews[index];
    const oldStart = view.byteOffset || 0;
    const data = replacements.get(index) || oldBinary.subarray(oldStart, oldStart + view.byteLength);
    const padding = (4 - (offset % 4)) % 4;
    if (padding) {
      pieces.push(Buffer.alloc(padding));
      offset += padding;
    }
    view.byteOffset = offset;
    view.byteLength = data.length;
    pieces.push(data);
    offset += data.length;
  }
  const finalPadding = (4 - (offset % 4)) % 4;
  if (finalPadding) {
    pieces.push(Buffer.alloc(finalPadding));
    offset += finalPadding;
  }
  document.buffers[0].byteLength = offset;
  return Buffer.concat(pieces);
}

function encodeGlb(parsed, document, binary) {
  const json = Buffer.from(JSON.stringify(document));
  const jsonPadding = (4 - (json.length % 4)) % 4;
  const jsonChunk = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
  parsed.chunks[parsed.jsonIndex].data = jsonChunk;
  parsed.chunks[parsed.binIndex].data = binary;
  const body = Buffer.concat(parsed.chunks.map(({ kind, data }) => {
    const header = Buffer.alloc(8);
    header.writeUInt32LE(data.length, 0);
    header.writeUInt32LE(kind, 4);
    return Buffer.concat([header, data]);
  }));
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([header, body]);
}

function bakeFile(filePath, rayCount, requestedResolution, repackAlbedo) {
  const parsed = parseGlb(filePath);
  const { document, binary } = parsed;
  const images = Object.fromEntries(document.images.map((image) => [image.name, image]));
  const normalImage = images[NORMAL_NAME] || images[LEGACY_NORMAL_NAME];
  const packedImage = images[PACKED_NAME] || images[LEGACY_PACKED_NAME];
  for (const name of [...ALBEDO_NAMES]) {
    if (!images[name]) throw new Error(`${path.basename(filePath)} has no ${name} image`);
  }
  if (!normalImage || !packedImage) throw new Error(`${path.basename(filePath)} has no skin surface maps`);
  const normalSource = decodePng(getImageBytes(document, binary, normalImage));
  const packedSource = decodePng(getImageBytes(document, binary, packedImage));
  const resolution = requestedResolution || normalSource.width;
  if (resolution !== normalSource.width || resolution !== packedSource.width || normalSource.width !== normalSource.height || packedSource.width !== packedSource.height) {
    throw new Error(`Surface bake expects square maps at one resolution; got normal ${normalSource.width}x${normalSource.height}, packed ${packedSource.width}x${packedSource.height}`);
  }

  console.log(`\n${path.basename(filePath)} — baking ${resolution}² maps from GrowthTrackBody`);
  const body = createBodyData(document, binary);
  console.log(`  body: ${body.vertexCount} vertices / ${body.indices.length / 3} triangles`);
  const bvh = buildBvh(body);
  const vertexAo = bakeVertexAo(body, bvh, rayCount);
  const baked = rasterizeSurface(body, vertexAo, resolution);
  const bakedNormal = encodePng(resolution, resolution, 3, baked.normalPixels);
  const bakedPacked = encodePng(resolution, resolution, 3, baked.packedPixels);
  const bakedAoImage = { width: resolution, height: resolution, channels: 3, pixels: baked.packedPixels };
  const replacements = new Map();
  const alreadyGeometryBaked = Boolean(document.asset?.extras?.geometrySurfaceBake);
  replacements.set(normalImage.bufferView, bakedNormal);
  replacements.set(packedImage.bufferView, bakedPacked);
  normalImage.name = NORMAL_NAME;
  packedImage.name = PACKED_NAME;
  for (const name of ALBEDO_NAMES) {
    const image = images[name];
    if (!alreadyGeometryBaked) {
      replacements.set(image.bufferView, bakeAlbedo(getImageBytes(document, binary, image), packedSource, bakedAoImage));
    } else if (repackAlbedo) {
      const source = decodePng(getImageBytes(document, binary, image));
      const rgba = new Uint8Array(source.width * source.height * 4);
      for (let index = 0; index < source.width * source.height; index += 1) {
        const sourceIndex = index * source.channels;
        const outputIndex = index * 4;
        rgba[outputIndex] = source.pixels[sourceIndex];
        rgba[outputIndex + 1] = source.pixels[sourceIndex + Math.min(1, source.channels - 1)];
        rgba[outputIndex + 2] = source.pixels[sourceIndex + Math.min(2, source.channels - 1)];
        rgba[outputIndex + 3] = source.channels === 4 ? source.pixels[sourceIndex + 3] : 255;
      }
      replacements.set(image.bufferView, encodePng(source.width, source.height, 4, rgba));
    }
    image.extras = { ...(image.extras || {}), aoBaked: true, aoBakeMethod: 'GrowthTrackBody ray-traced topology' };
  }
  normalImage.extras = { ...(normalImage.extras || {}), mapType: 'tangent-space surface normal', bakeMethod: 'GrowthTrackBody UV raster + face/vertex normals' };
  packedImage.extras = { ...(packedImage.extras || {}), mapType: 'R=AO G=roughness B=metalness', bakeMethod: 'GrowthTrackBody vertex hemisphere ray trace' };
  if (document.extras?.pbrTextureSet) {
    document.extras.pbrTextureSet.normal = NORMAL_NAME;
    document.extras.pbrTextureSet.metallicRoughness = PACKED_NAME;
  }
  document.asset = document.asset || {};
  document.asset.extras = {
    ...(document.asset.extras || {}),
    aoBakedIntoAlbedo: {
      source: PACKED_NAME,
      strength: AO_STRENGTH,
      colorSpace: 'linear',
      bakeMethod: 'GrowthTrackBody topology ray trace',
    },
    geometrySurfaceBake: {
      sourceMesh: 'GrowthTrackBody',
      normal: 'uv-rasterized vertex/face surface normals',
      ao: 'vertex hemisphere ray trace against embedded triangles',
      resolution,
      raysPerVertex: rayCount,
      coveredUvTexels: baked.filledCount,
      sculptDetail: false,
    },
  };
  const output = encodeGlb(parsed, document, rebuildBinary(document, binary, replacements));
  const temporary = `${filePath}.surface-bake.tmp`;
  fs.writeFileSync(temporary, output);
  fs.renameSync(temporary, filePath);
  console.log(`  covered UV texels: ${baked.filledCount}/${resolution * resolution}`);
  console.log(`  wrote ${Math.round(output.length / 1024 / 1024 * 100) / 100} MiB`);
}

const args = parseArgs();
const files = args.assets.length ? args.assets : DEFAULT_ASSETS;
for (const filePath of files) bakeFile(filePath, args.rays, args.resolution, args.repackAlbedo);
