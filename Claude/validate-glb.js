#!/usr/bin/env node
/**
 * validate-glb.js
 *
 * Fails the build if the humanoid GLB regresses to placeholder quality.
 * Zero external dependencies — parses the GLB binary container and glTF
 * JSON chunk directly, so this runs anywhere `node` runs (local, CI, git
 * pre-commit hook) with no install step.
 *
 * Checks enforced (see docs/BLENDER_HUMANOID_CHECKLIST.md for the spec
 * these numbers come from):
 *   1. Vertex count meets the real-time-human floor
 *   2. Every name in MORPH_TARGET_NAMES exists as a morph target in the mesh
 *   3. Skin has enough joints to be a real rig, not a single-bone stub
 *   4. No orphaned bufferViews (dead data not referenced by any accessor
 *      that's actually used by a mesh primitive, skin, or animation)
 *   5. The material has real PBR textures, not just a flat color factor
 *
 * Usage:
 *   node scripts/validate-glb.js [path-to-glb]
 *   node scripts/validate-glb.js                # defaults to the app's model
 *   node scripts/validate-glb.js --min-verts 500 # override a threshold
 *
 * Exit code 0 = pass, 1 = fail (safe to wire into `npm run build` or CI).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — thresholds from docs/BLENDER_HUMANOID_CHECKLIST.md
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  glbPath: path.resolve(__dirname, '../public/assets/models/humanoid-base.glb'),
  minVerts: 8000,      // floor for a real-time game-res human (checklist §2)
  minTris: 15000,
  minJoints: 40,        // standard humanoid rigs run ~55-70; 40 is a hard floor
  requireTextures: true,
};

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  const positional = argv.filter((a) => !a.startsWith('--'));
  if (positional[0]) opts.glbPath = path.resolve(process.cwd(), positional[0]);

  const flag = (name) => {
    const idx = argv.indexOf(`--${name}`);
    return idx !== -1 ? argv[idx + 1] : undefined;
  };
  if (flag('min-verts')) opts.minVerts = Number(flag('min-verts'));
  if (flag('min-tris')) opts.minTris = Number(flag('min-tris'));
  if (flag('min-joints')) opts.minJoints = Number(flag('min-joints'));
  return opts;
}

// ─────────────────────────────────────────────────────────────────────────────
// MORPH_TARGET_NAMES — loaded from the app's own source of truth.
// Falls back to an inline copy if the import path changes/moves, so this
// script never silently no-ops that check.
// ─────────────────────────────────────────────────────────────────────────────

async function loadMorphTargetNames() {
  try {
    const mod = await import(
      path.resolve(__dirname, '../src/components/morphEngine/constants.js')
    );
    if (Array.isArray(mod.MORPH_TARGET_NAMES) && mod.MORPH_TARGET_NAMES.length) {
      return mod.MORPH_TARGET_NAMES;
    }
  } catch (err) {
    console.warn(
      `⚠  Could not import MORPH_TARGET_NAMES from constants.js (${err.message}).\n` +
      `   Falling back to a hardcoded copy — keep this in sync manually.`
    );
  }
  // Fallback copy — keep in sync with src/components/morphEngine/constants.js
  return [
    'overall_mass', 'gut_volume', 'face_roundness', 'chest_depth', 'pec_thickness',
    'deltoid_width', 'trap_swell', 'waist_narrow', 'oblique_def', 'bicep_peak',
    'tricep_horse', 'forearm_girth', 'glute_volume', 'hip_width', 'quad_sweep',
    'ham_thickness', 'calf_diamond', 'ankle_width', 'neck_thickness', 'trap_rise',
    'torso_length', 'shoulder_slope', 'clavicle_width', 'ribcage_depth', 'pelvis_width',
    'neck_length', 'upper_arm_length', 'forearm_length', 'hand_length', 'leg_length',
    'foot_length', 'brow_depth', 'nose_bridge_width', 'nose_tip_size', 'ear_prominence',
    'jaw_width', 'chin_projection', 'lip_fullness', 'eye_size', 'cheekbone_width',
    'forehead_height', 'temple_narrowing', 'nose_length', 'jaw_angle', 'shoulder_drop',
    'd_length', 'd_girth', 'knee_spacing', 'ankle_taper', 'hand_splay', 'foot_arch',
    'vascularity_intensity', 'fitzpatrick_index',
  ];
}

// Shader-only uniforms — must NOT appear as geometry morph targets.
const SHADER_ONLY_NAMES = new Set(['vascularity_intensity', 'fitzpatrick_index']);

// ─────────────────────────────────────────────────────────────────────────────
// GLB binary container parsing (no deps)
// ─────────────────────────────────────────────────────────────────────────────

function parseGlb(buffer) {
  const magic = buffer.toString('ascii', 0, 4);
  if (magic !== 'glTF') {
    throw new Error(`Not a valid GLB file (bad magic: "${magic}")`);
  }
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);

  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
    const chunkData = buffer.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === 'JSON') json = JSON.parse(chunkData.toString('utf8'));
    else if (chunkType === 'BIN\0') bin = chunkData;
    offset += 8 + chunkLength;
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return { version, json, bin };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKS
// ─────────────────────────────────────────────────────────────────────────────

function checkVertexAndTriCount(gltf, opts, results) {
  const posAccessorIdx = gltf.meshes?.[0]?.primitives?.[0]?.attributes?.POSITION;
  const idxAccessorIdx = gltf.meshes?.[0]?.primitives?.[0]?.indices;
  const verts = posAccessorIdx != null ? gltf.accessors[posAccessorIdx].count : 0;
  const indices = idxAccessorIdx != null ? gltf.accessors[idxAccessorIdx].count : 0;
  const tris = Math.floor(indices / 3);

  results.push({
    name: 'Vertex count',
    pass: verts >= opts.minVerts,
    detail: `${verts} verts (need ≥ ${opts.minVerts})`,
  });
  results.push({
    name: 'Triangle count',
    pass: tris >= opts.minTris,
    detail: `${tris} tris (need ≥ ${opts.minTris})`,
  });
}

function checkMorphTargets(gltf, morphTargetNames, results) {
  const mesh = gltf.meshes?.[0];
  const primitive = mesh?.primitives?.[0];
  const targetNames = mesh?.extras?.targetNames ?? [];
  const declaredTargets = primitive?.targets ?? [];

  if (!declaredTargets.length) {
    results.push({
      name: 'Morph targets present',
      pass: false,
      detail: `0 morph targets found in mesh (primitive.targets is empty/absent)`,
    });
    return;
  }

  const present = new Set(targetNames);
  const geometryNames = morphTargetNames.filter((n) => !SHADER_ONLY_NAMES.has(n));
  const missing = geometryNames.filter((n) => !present.has(n));

  results.push({
    name: 'Morph target coverage',
    pass: missing.length === 0,
    detail: missing.length === 0
      ? `all ${geometryNames.length} declared geometry morph targets present`
      : `${missing.length}/${geometryNames.length} missing: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''}`,
  });

  // Shader-only names should NOT be authored as shape keys.
  const wronglyGeometry = [...SHADER_ONLY_NAMES].filter((n) => present.has(n));
  results.push({
    name: 'Shader-only names not baked as shape keys',
    pass: wronglyGeometry.length === 0,
    detail: wronglyGeometry.length === 0
      ? 'vascularity_intensity / fitzpatrick_index correctly absent from geometry'
      : `found as shape keys (should be shader uniforms only): ${wronglyGeometry.join(', ')}`,
  });
}

function checkSkinJointCount(gltf, opts, results) {
  const skin = gltf.skins?.[0];
  const jointCount = skin?.joints?.length ?? 0;
  results.push({
    name: 'Skeleton joint count',
    pass: jointCount >= opts.minJoints,
    detail: `${jointCount} joints (need ≥ ${opts.minJoints})`,
  });
}

function checkInertMorphTargets(gltf, bin, results) {
  const mesh = gltf.meshes?.[0];
  const primitive = mesh?.primitives?.[0];
  const targetNames = mesh?.extras?.targetNames ?? [];
  const targets = primitive?.targets ?? [];
  if (!targets.length) return; // handled by checkMorphTargets

  // A shape key whose POSITION deltas are all near-zero is structurally
  // present but not actually sculpted — catches exactly the kind of
  // placeholder data this file previously shipped with.
  const posAccessorIdx = primitive.attributes?.POSITION;
  // Use the largest bounding-box span rather than assuming Y is up — see
  // checkUpAxis(), this file has shipped Z-up before.
  let bodyHeight = 1;
  if (posAccessorIdx != null) {
    const acc = gltf.accessors[posAccessorIdx];
    const spans = [0, 1, 2].map((i) => (acc.max?.[i] ?? 0) - (acc.min?.[i] ?? 0));
    bodyHeight = Math.max(...spans) || 1;
  }
  const inertThreshold = bodyHeight * 0.01; // <1% of longest dimension = not meaningfully sculpted

  const inert = [];
  targets.forEach((target, i) => {
    const accIdx = target.POSITION;
    if (accIdx == null) return;
    const acc = gltf.accessors[accIdx];
    const maxAbs = Math.max(
      ...(acc.min ?? [0]).map(Math.abs),
      ...(acc.max ?? [0]).map(Math.abs)
    );
    if (maxAbs < inertThreshold) {
      inert.push(targetNames[i] ?? `target[${i}]`);
    }
  });

  results.push({
    name: 'Morph targets are meaningfully sculpted',
    pass: inert.length === 0,
    detail: inert.length === 0
      ? 'no near-zero/inert deltas detected'
      : `${inert.length} target(s) have <1% body-height displacement (placeholder-grade, not sculpted): ${inert.slice(0, 8).join(', ')}${inert.length > 8 ? ', …' : ''}`,
  });
}

function checkUpAxis(gltf, results) {
  const posAccessorIdx = gltf.meshes?.[0]?.primitives?.[0]?.attributes?.POSITION;
  if (posAccessorIdx == null) return;
  const acc = gltf.accessors[posAccessorIdx];
  const spans = [0, 1, 2].map((i) => (acc.max?.[i] ?? 0) - (acc.min?.[i] ?? 0));
  const [spanX, spanY, spanZ] = spans;
  const dominantAxis = ['X', 'Y', 'Z'][spans.indexOf(Math.max(...spans))];

  // glTF spec requires +Y up. If Y isn't the largest span for a standing
  // humanoid, the file was likely authored/exported Z-up (Blender's native
  // axis) without conversion, and will render lying on its side — and any
  // code that reads bounding-box `size.y` as "height" (useModelLoader.js
  // does exactly this) will scale off the wrong axis.
  results.push({
    name: 'Y-up orientation',
    pass: dominantAxis === 'Y',
    detail: dominantAxis === 'Y'
      ? `Y is the dominant span (${spanY.toFixed(3)}) — correctly Y-up`
      : `dominant span is on ${dominantAxis} (${Math.max(...spans).toFixed(3)}), Y span is only ${spanY.toFixed(3)} — ` +
        `file appears Z-up, not glTF-spec Y-up. Will likely render on its side and mis-scale in useModelLoader.js (which measures size.y as height).`,
  });
}

function checkOrphanedBufferViews(gltf, results) {
  // NOTE: this only catches *unreferenced* bufferViews. A morph target can
  // be referenced (so it passes this check) while still being placeholder-
  // grade data — that's what checkInertMorphTargets() is for. The previous
  // manual review of this file conflated "24 buffer regions contain near-
  // zero data" with "unreferenced" — they weren't unreferenced, they were
  // referenced-but-inert morph targets. Keep these two checks separate.
  const usedAccessors = new Set();
  const collect = (idx) => { if (idx != null) usedAccessors.add(idx); };

  for (const mesh of gltf.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      Object.values(prim.attributes ?? {}).forEach(collect);
      collect(prim.indices);
      for (const target of prim.targets ?? []) {
        Object.values(target).forEach(collect);
      }
    }
  }
  for (const skin of gltf.skins ?? []) collect(skin.inverseBindMatrices);
  for (const anim of gltf.animations ?? []) {
    for (const sampler of anim.samplers ?? []) {
      collect(sampler.input);
      collect(sampler.output);
    }
  }

  const usedBufferViews = new Set(
    [...usedAccessors].map((i) => gltf.accessors[i]?.bufferView).filter((v) => v != null)
  );
  const totalBufferViews = gltf.bufferViews?.length ?? 0;
  const orphaned = [];
  for (let i = 0; i < totalBufferViews; i++) {
    if (!usedBufferViews.has(i)) orphaned.push(i);
  }
  const orphanedBytes = orphaned.reduce((sum, i) => sum + (gltf.bufferViews[i]?.byteLength ?? 0), 0);
  const totalBytes = (gltf.bufferViews ?? []).reduce((sum, bv) => sum + (bv.byteLength ?? 0), 0);
  const pct = totalBytes ? Math.round((orphanedBytes / totalBytes) * 100) : 0;

  results.push({
    name: 'No orphaned buffer data',
    pass: orphaned.length === 0,
    detail: orphaned.length === 0
      ? 'all bufferViews referenced'
      : `${orphaned.length}/${totalBufferViews} bufferViews unused (${orphanedBytes} bytes, ${pct}% of binary payload) — indices: [${orphaned.join(', ')}]`,
  });
}

function checkMaterialTextures(gltf, opts, results) {
  if (!opts.requireTextures) return;
  const materials = gltf.materials ?? [];
  if (!materials.length) {
    results.push({ name: 'PBR textures present', pass: false, detail: 'no materials in file' });
    return;
  }
  const missingTextures = [];
  materials.forEach((mat, i) => {
    const pbr = mat.pbrMetallicRoughness ?? {};
    const hasBaseColor = !!pbr.baseColorTexture;
    const hasNormal = !!mat.normalTexture;
    if (!hasBaseColor || !hasNormal) {
      missingTextures.push(
        `material[${i}] "${mat.name ?? 'unnamed'}": ${!hasBaseColor ? 'no baseColorTexture ' : ''}${!hasNormal ? 'no normalTexture' : ''}`.trim()
      );
    }
  });
  results.push({
    name: 'PBR textures present',
    pass: missingTextures.length === 0,
    detail: missingTextures.length === 0
      ? `all ${materials.length} material(s) have baseColor + normal textures`
      : missingTextures.join('; '),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const morphTargetNames = await loadMorphTargetNames();

  console.log(`\nValidating: ${opts.glbPath}\n`);

  let buffer;
  try {
    buffer = readFileSync(opts.glbPath);
  } catch (err) {
    console.error(`✗ Could not read file: ${err.message}`);
    process.exit(1);
  }

  let gltf, bin;
  try {
    ({ json: gltf, bin } = parseGlb(buffer));
  } catch (err) {
    console.error(`✗ Could not parse GLB: ${err.message}`);
    process.exit(1);
  }

  const results = [];
  checkVertexAndTriCount(gltf, opts, results);
  checkMorphTargets(gltf, morphTargetNames, results);
  checkInertMorphTargets(gltf, bin, results);
  checkUpAxis(gltf, results);
  checkSkinJointCount(gltf, opts, results);
  checkOrphanedBufferViews(gltf, results);
  checkMaterialTextures(gltf, opts, results);

  const width = Math.max(...results.map((r) => r.name.length)) + 2;
  let allPassed = true;
  for (const r of results) {
    if (!r.pass) allPassed = false;
    const icon = r.pass ? '✓' : '✗';
    console.log(`${icon} ${r.name.padEnd(width)} ${r.detail}`);
  }

  console.log(
    `\n${allPassed ? '✓ PASS' : '✗ FAIL'} — ${results.filter((r) => r.pass).length}/${results.length} checks passed\n`
  );

  process.exit(allPassed ? 0 : 1);
}

main();
