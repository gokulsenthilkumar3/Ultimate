// Minimal glTF 2.0 binary reader used by the plan-preview build. It understands
// exactly what the bundled humanoid GLBs use: interleaved-free accessors,
// sparse morph-target accessors and embedded PNG images.
import fs from 'node:fs';

const COMPONENTS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const WIDTH = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a GLB file`);
  let offset = 12; let json = null; let bin = null;
  while (offset < buf.length) {
    const length = buf.readUInt32LE(offset); const type = buf.readUInt32LE(offset + 4);
    const chunk = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    else if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
  }
  return { json, bin };
}

function viewBytes({ json, bin }, index) {
  const view = json.bufferViews[index];
  return bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
}

function typed(Type, bytes, count) {
  // Copy so the result is aligned regardless of the chunk offset.
  const copy = new Uint8Array(bytes.subarray(0, count * Type.BYTES_PER_ELEMENT));
  return new Type(copy.buffer);
}

export function readAccessor(glb, index) {
  const { json } = glb;
  const accessor = json.accessors[index];
  const Type = COMPONENTS[accessor.componentType];
  const width = WIDTH[accessor.type];
  const out = new Type(accessor.count * width);
  if (accessor.bufferView != null) {
    const view = json.bufferViews[accessor.bufferView];
    const bytes = viewBytes(glb, accessor.bufferView).subarray(accessor.byteOffset || 0);
    const stride = view.byteStride || width * Type.BYTES_PER_ELEMENT;
    if (stride === width * Type.BYTES_PER_ELEMENT) out.set(typed(Type, bytes, accessor.count * width));
    else for (let i = 0; i < accessor.count; i += 1) out.set(typed(Type, bytes.subarray(i * stride), width), i * width);
  }
  if (accessor.sparse) {
    const { count, indices, values } = accessor.sparse;
    const IndexType = COMPONENTS[indices.componentType];
    const at = typed(IndexType, viewBytes(glb, indices.bufferView).subarray(indices.byteOffset || 0), count);
    const vals = typed(Type, viewBytes(glb, values.bufferView).subarray(values.byteOffset || 0), count * width);
    for (let i = 0; i < count; i += 1) for (let c = 0; c < width; c += 1) out[at[i] * width + c] = vals[i * width + c];
  }
  return { data: out, width, count: accessor.count, accessor };
}

export function readImage(glb, imageIndex) {
  return Buffer.from(viewBytes(glb, glb.json.images[imageIndex].bufferView));
}

export function meshByName(glb, name) {
  const index = glb.json.meshes.findIndex(mesh => mesh.name === name);
  if (index < 0) throw new Error(`mesh ${name} not found`);
  return glb.json.meshes[index];
}
