#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_GLB = path.resolve(__dirname, '../public/assets/models/humanoid-base.glb');
const GLB_PATH = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_GLB;

const SHADER_ONLY = new Set(['vascularity_intensity', 'fitzpatrick_index']);

function readGlb(filePath) {
  const buf = readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a GLB file');
  const jsonChunkLength = buf.readUInt32LE(12);
  const jsonChunkType = buf.toString('ascii', 16, 20);
  if (jsonChunkType !== 'JSON') throw new Error('Missing JSON chunk');
  const jsonStart = 20;
  const json = JSON.parse(buf.subarray(jsonStart, jsonStart + jsonChunkLength).toString('utf8'));
  return { json, buffer: buf };
}

function getMorphNames() {
  const names = [];
  for (const key of [
    'overall_mass', 'gut_volume', 'face_roundness', 'chest_depth', 'pec_thickness',
    'deltoid_width', 'trap_swell', 'waist_narrow', 'oblique_def', 'bicep_peak',
    'tricep_horse', 'forearm_girth', 'glute_volume', 'hip_width', 'quad_sweep',
    'ham_thickness', 'calf_diamond', 'ankle_width', 'neck_thickness', 'trap_rise',
    'torso_length', 'shoulder_slope', 'clavicle_width', 'ribcage_depth', 'pelvis_width',
    'neck_length', 'upper_arm_length', 'forearm_length', 'hand_length', 'leg_length',
    'foot_length', 'head_circumference', 'brow_depth', 'nose_bridge_width',
    'nose_tip_size', 'ear_prominence', 'jaw_width', 'chin_projection', 'lip_fullness',
    'eye_size', 'cheekbone_width', 'forehead_height', 'temple_narrowing',
    'nose_length', 'jaw_angle', 'shoulder_drop', 'd_length', 'd_girth',
    'knee_spacing', 'ankle_taper', 'hand_splay', 'foot_arch',
    'corrective_abdomen_waist', 'corrective_pec_ribcage', 'corrective_shoulder_arm',
    'blink', 'smile', 'jaw_open',
    'vascularity_intensity', 'fitzpatrick_index',
  ]) names.push(key);
  return names;
}

function check(cond, label, detail, failures) {
  if (!cond) failures.push({ label, detail });
}

function main() {
  const { json } = readGlb(GLB_PATH);
  const failures = [];
  const mesh = json.meshes?.[0];
  const prim = mesh?.primitives?.[0];
  const posIdx = prim?.attributes?.POSITION;
  const posAcc = posIdx != null ? json.accessors?.[posIdx] : null;
  const targetNames = mesh?.extras?.targetNames ?? [];
  const skin = json.skins?.[0];
  const materials = json.materials ?? [];
  const images = json.images ?? [];
  const privateMeshIndex = (json.meshes ?? []).findIndex((item) => String(item?.name || '').toLowerCase().includes('privateanatomy'));
  const privateMesh = privateMeshIndex >= 0 ? json.meshes[privateMeshIndex] : null;
  const privatePrim = privateMesh?.primitives?.[0];
  const privatePosition = privatePrim?.attributes?.POSITION != null ? json.accessors?.[privatePrim.attributes.POSITION] : null;
  const privateTargetNames = privateMesh?.extras?.targetNames ?? [];
  const privateNode = (json.nodes ?? []).find((node) => node?.mesh === privateMeshIndex);
  const privateMorphChangedCount = (name) => {
    const targetIndex = privateTargetNames.indexOf(name);
    const accessorIndex = targetIndex >= 0 ? privatePrim?.targets?.[targetIndex]?.POSITION : null;
    return accessorIndex != null ? json.accessors?.[accessorIndex]?.sparse?.count ?? 0 : 0;
  };
  const bodyMorphChangedCount = (name) => {
    const targetIndex = targetNames.indexOf(name);
    const accessorIndex = targetIndex >= 0 ? prim?.targets?.[targetIndex]?.POSITION : null;
    return accessorIndex != null ? json.accessors?.[accessorIndex]?.sparse?.count ?? 0 : 0;
  };

  const verts = posAcc?.count ?? 0;
  const idxCount = prim?.indices != null ? json.accessors?.[prim.indices]?.count ?? 0 : 0;
  const tris = Math.floor(idxCount / 3);
  const spans = posAcc?.min && posAcc?.max
    ? posAcc.max.map((v, i) => v - posAcc.min[i])
    : [0, 0, 0];
  const dominantAxis = ['X', 'Y', 'Z'][spans.indexOf(Math.max(...spans))];

  const morphNames = getMorphNames();
  const geometryMorphNames = morphNames.filter((n) => !SHADER_ONLY.has(n));
  const missingMorphs = geometryMorphNames.filter((n) => !targetNames.includes(n));
  const wronglyBakedShaderMorphs = [...SHADER_ONLY].filter((n) => targetNames.includes(n));
  const imageNamed = (name) => images.find((image) => image?.name === name);
  const imageHasProductionResolution = (name, minimum = 512) => {
    const image = imageNamed(name);
    return (image?.extras?.width ?? 0) >= minimum && (image?.extras?.height ?? 0) >= minimum;
  };

  const usedAccessors = new Set();
  const usedBufferViews = new Set();
  const addAccessor = (idx) => {
    if (idx == null) return;
    const accessor = json.accessors?.[idx];
    if (!accessor) return;
    if (accessor.bufferView != null) usedBufferViews.add(accessor.bufferView);
    if (accessor.sparse?.indices?.bufferView != null) usedBufferViews.add(accessor.sparse.indices.bufferView);
    if (accessor.sparse?.values?.bufferView != null) usedBufferViews.add(accessor.sparse.values.bufferView);
  };
  for (const meshItem of json.meshes ?? []) {
    for (const primitive of meshItem.primitives ?? []) {
      Object.values(primitive.attributes ?? {}).forEach((v) => { usedAccessors.add(v); addAccessor(v); });
      if (primitive.indices != null) { usedAccessors.add(primitive.indices); addAccessor(primitive.indices); }
      for (const target of primitive.targets ?? []) {
        Object.values(target).forEach((v) => { usedAccessors.add(v); addAccessor(v); });
      }
    }
  }
  for (const anim of json.animations ?? []) {
    for (const sampler of anim.samplers ?? []) {
      if (sampler.input != null) { usedAccessors.add(sampler.input); addAccessor(sampler.input); }
      if (sampler.output != null) { usedAccessors.add(sampler.output); addAccessor(sampler.output); }
    }
  }
  if (skin?.inverseBindMatrices != null) { usedAccessors.add(skin.inverseBindMatrices); addAccessor(skin.inverseBindMatrices); }
  for (const image of json.images ?? []) {
    if (image.bufferView != null) usedBufferViews.add(image.bufferView);
  }
  const orphanedBufferViews = (json.bufferViews ?? []).map((_, idx) => idx).filter((idx) => !usedBufferViews.has(idx));

  check(verts >= 8000, 'Vertex count', `${verts} verts`, failures);
  check(tris >= 15000, 'Triangle count', `${tris} tris`, failures);
  check((skin?.joints?.length ?? 0) >= 20, 'Joint count', `${skin?.joints?.length ?? 0} joints`, failures);
  check(missingMorphs.length === 0, 'Morph coverage', `${missingMorphs.length} missing morphs`, failures);
  check(wronglyBakedShaderMorphs.length === 0, 'Shader-only targets', wronglyBakedShaderMorphs.join(', '), failures);
  check(dominantAxis === 'Y', 'Up axis', `dominant axis is ${dominantAxis}`, failures);
  check(orphanedBufferViews.length === 0, 'Orphaned bufferViews', `${orphanedBufferViews.length} unused`, failures);
  check(materials.length > 0 && materials.every((m) => m.pbrMetallicRoughness?.baseColorTexture && m.normalTexture), 'PBR textures', 'missing baseColorTexture or normalTexture', failures);
  check(materials[0]?.pbrMetallicRoughness?.metallicRoughnessTexture, 'Packed roughness/AO map', 'skin material has no metallicRoughnessTexture', failures);
  check(imageHasProductionResolution('SkinNormal_ProceduralMicrodetail'), 'Skin normal resolution', 'normal image is missing or still a placeholder', failures);
  check(imageHasProductionResolution('SkinAO_Roughness'), 'Skin roughness/AO resolution', 'roughness/AO image is missing or still a placeholder', failures);
  check((json.meshes ?? []).some((item) => item?.name === 'GrowthTrackEyes'), 'Eye asset', 'high-poly eye mesh is missing', failures);
  check((json.meshes ?? []).some((item) => item?.name === 'GrowthTrackHair'), 'Hair asset', 'hair-card mesh is missing', failures);
  check(privatePosition?.count >= 800, 'Private anatomy topology', `${privatePosition?.count ?? 0} verts`, failures);
  check(privateTargetNames.includes('d_length') && privateTargetNames.includes('d_girth'), 'Private anatomy morphs', privateTargetNames.join(', ') || 'none', failures);
  check(privateMorphChangedCount('d_length') > 0 && privateMorphChangedCount('d_girth') > 0, 'Private anatomy deformation', `length ${privateMorphChangedCount('d_length')} verts · girth ${privateMorphChangedCount('d_girth')} verts`, failures);
  check(privateNode?.extras?.sensitive === true && privateNode?.extras?.defaultVisible === false, 'Private anatomy guard', 'sensitive mesh must be marked hidden-by-default', failures);
  for (const name of ['oblique_def', 'bicep_peak', 'tricep_horse', 'glute_volume']) {
    check(bodyMorphChangedCount(name) > 0, `Body landmark deformation: ${name}`, `${bodyMorphChangedCount(name)} changed verts`, failures);
  }
  for (const name of ['corrective_abdomen_waist', 'corrective_pec_ribcage', 'corrective_shoulder_arm', 'blink', 'smile', 'jaw_open']) {
    check(bodyMorphChangedCount(name) > 0, `Generated channel deformation: ${name}`, `${bodyMorphChangedCount(name)} changed verts`, failures);
  }

  console.log(`Validating ${GLB_PATH}`);
  console.log(`Vertices: ${verts}, Tris: ${tris}, Joints: ${skin?.joints?.length ?? 0}, Morphs: ${targetNames.length}`);
  console.log(`Private anatomy: ${privatePosition?.count ?? 0} verts, Morphs: ${privateTargetNames.length}, Hidden by default: ${privateNode?.extras?.defaultVisible === false}`);
  if (failures.length) {
    for (const fail of failures) {
      console.error(`✗ ${fail.label}: ${fail.detail}`);
    }
    process.exit(1);
  }

  console.log('✓ GLB validation passed');
}

try {
  main();
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
