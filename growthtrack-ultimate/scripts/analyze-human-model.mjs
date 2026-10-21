#!/usr/bin/env node
// Audits a humanoid GLB for the real-human 3D plan (docs/real-human-3d/).
//
//   node scripts/analyze-human-model.mjs [path/to/model.glb] [--out docs/real-human-3d/data]
//
// It reports what the file really contains, so the plan can say what is missing rather than guess:
//  - structure: nodes, meshes, vertex and triangle counts, vertex attributes, materials, extensions;
//  - rig: joint list and hierarchy, and which joint families exist (fingers, toes, jaw, eyes, twist, clavicle...);
//  - resolution per body region: vertices, surface area, mean edge length (mm), vertices per cm2, and the skin
//    texture's pixels per cm, i.e. how far a region can be zoomed before it breaks into pixels or facets;
//  - morph targets: affected vertices, largest displacement (mm) and the nearest joint;
//  - textures: pixel size and encoded bytes;
//  - a coverage check against a catalogue of human anatomy (what exists as geometry, what is only part of the
//    skin surface, what is absent), from names plus the numbers above.
// Writes glb-audit.json and glb-audit.md next to --out (default: docs/real-human-3d/data). No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlb, readAccessor } from './plan-preview/glb.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outDir = path.resolve(appRoot, outIndex >= 0 ? args[outIndex + 1] : 'docs/real-human-3d/data');
const outValueIndex = outIndex >= 0 ? outIndex + 1 : -1;
const file = path.resolve(args.find((a, i) => !a.startsWith('--') && i !== outValueIndex) || path.join(appRoot, 'public/assets/models/humanoid-base.glb'));

const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const glb = readGlb(file); const { json } = glb;

// ---- image sizes (PNG header) ------------------------------------------------------------------------------
function imageSize(index) {
  const view = json.bufferViews[json.images[index].bufferView];
  const bytes = glb.bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  if (bytes.readUInt32BE(0) === 0x89504e47) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: view.byteLength, mime: 'image/png' };
  return { width: null, height: null, bytes: view.byteLength, mime: json.images[index].mimeType };
}
const images = json.images.map((image, i) => ({ name: image.name, ...imageSize(i) }));

// ---- structure -----------------------------------------------------------------------------------------------
const parent = {}; json.nodes.forEach((node, i) => (node.children || []).forEach(child => { parent[child] = i; }));
const skin = json.skins?.[0];
const jointNodes = skin ? skin.joints : [];
const jointName = jointNodes.map(i => json.nodes[i].name);
const world = i => { const n = json.nodes[i]; const t = n.translation || [0, 0, 0]; const p = parent[i] != null ? world(parent[i]) : [0, 0, 0]; return [p[0] + t[0], p[1] + t[1], p[2] + t[2]]; };
const nonIdentity = jointNodes.filter(i => { const n = json.nodes[i]; return (n.rotation && n.rotation.some((v, k) => Math.abs(v - [0, 0, 0, 1][k]) > 1e-6)) || (n.scale && n.scale.some(v => Math.abs(v - 1) > 1e-6)); }).length;
const joints = jointNodes.map((i, j) => ({ name: jointName[j], parent: parent[i] != null && jointNodes.includes(parent[i]) ? json.nodes[parent[i]].name : null, position_cm: world(i).map(v => round(v * 100, 1)) }));
const jointFamilies = {
  fingers: jointName.filter(n => /thumb|index|middle|ring|pinky|finger/i.test(n)).length,
  toes: jointName.filter(n => /toe/i.test(n)).length,
  jaw: jointName.filter(n => /jaw/i.test(n)).length,
  eyes: jointName.filter(n => /eye/i.test(n)).length,
  twist: jointName.filter(n => /twist/i.test(n)).length,
  clavicle: jointName.filter(n => /shoulder|clavicle/i.test(n)).length,
  spine: jointName.filter(n => /spine/i.test(n)).length,
};

const meshes = json.meshes.map((mesh, index) => {
  const prim = mesh.primitives[0];
  const position = json.accessors[prim.attributes.POSITION];
  const triangles = prim.indices != null ? json.accessors[prim.indices].count / 3 : position.count / 3;
  return {
    index, name: mesh.name, primitives: mesh.primitives.length, vertices: position.count, triangles, morphTargets: prim.targets?.length || 0,
    attributes: Object.keys(prim.attributes), material: prim.material != null ? json.materials[prim.material].name : null,
    bounds_cm: { min: position.min.map(v => round(v * 100, 1)), max: position.max.map(v => round(v * 100, 1)) }, extras: mesh.extras ? { keys: Object.keys(mesh.extras).filter(k => k !== 'targetNames'), sensitive: !!mesh.extras.sensitive, growthtrack: mesh.extras.growthtrack ? Object.keys(mesh.extras.growthtrack) : [] } : null,
  };
});
const materials = json.materials.map(m => {
  const pbr = m.pbrMetallicRoughness || {}; const tex = ref => (ref ? images[json.textures[ref.index].source]?.name : null);
  return { name: m.name, baseColorTexture: tex(pbr.baseColorTexture), normalTexture: tex(m.normalTexture), occlusionTexture: tex(m.occlusionTexture), metallicRoughnessTexture: tex(pbr.metallicRoughnessTexture), alphaMode: m.alphaMode || 'OPAQUE', doubleSided: !!m.doubleSided, extensions: Object.keys(m.extensions || {}) };
});

// ---- body mesh: regions, resolution -----------------------------------------------------------------------------
const bodyMesh = meshes.find(m => m.name === 'GrowthTrackBody');
const prim = json.meshes[bodyMesh.index].primitives[0];
const pos = readAccessor(glb, prim.attributes.POSITION).data; const uv = readAccessor(glb, prim.attributes.TEXCOORD_0).data;
const idx = readAccessor(glb, prim.indices).data; const jointIds = readAccessor(glb, prim.attributes.JOINTS_0).data; const weights = readAccessor(glb, prim.attributes.WEIGHTS_0).data;
const count = bodyMesh.vertices;
const dominant = new Int32Array(count); let maxInfluences = 0; const influenceHistogram = [0, 0, 0, 0, 0];
for (let v = 0; v < count; v += 1) {
  let best = 0; let bw = -1; let used = 0;
  for (let k = 0; k < 4; k += 1) { if (weights[v * 4 + k] > 0.001) used += 1; if (weights[v * 4 + k] > bw) { bw = weights[v * 4 + k]; best = jointIds[v * 4 + k]; } }
  dominant[v] = best; maxInfluences = Math.max(maxInfluences, used); influenceHistogram[used] += 1;
}
const albedo = images.find(i => /albedo/i.test(i.name)) || images[0];
const regionOf = j => jointName[j] || `joint${j}`;
const stats = new Map();
const region = name => { if (!stats.has(name)) stats.set(name, { vertices: 0, triangles: 0, area_cm2: 0, uv_px: 0, edge_mm: 0, edges: 0, min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] }); return stats.get(name); };
for (let v = 0; v < count; v += 1) { const r = region(regionOf(dominant[v])); r.vertices += 1; for (let k = 0; k < 3; k += 1) { r.min[k] = Math.min(r.min[k], pos[v * 3 + k]); r.max[k] = Math.max(r.max[k], pos[v * 3 + k]); } }
for (let t = 0; t < idx.length; t += 3) {
  const a = idx[t]; const b = idx[t + 1]; const c = idx[t + 2];
  const votes = [dominant[a], dominant[b], dominant[c]]; const j = votes[0] === votes[1] || votes[0] === votes[2] ? votes[0] : votes[1] === votes[2] ? votes[1] : votes[0];
  const r = region(regionOf(j)); r.triangles += 1;
  const ux = pos[b * 3] - pos[a * 3]; const uy = pos[b * 3 + 1] - pos[a * 3 + 1]; const uz = pos[b * 3 + 2] - pos[a * 3 + 2]; const vx = pos[c * 3] - pos[a * 3]; const vy = pos[c * 3 + 1] - pos[a * 3 + 1]; const vz = pos[c * 3 + 2] - pos[a * 3 + 2];
  r.area_cm2 += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) * 1e4;
  const uvArea = 0.5 * Math.abs((uv[b * 2] - uv[a * 2]) * (uv[c * 2 + 1] - uv[a * 2 + 1]) - (uv[c * 2] - uv[a * 2]) * (uv[b * 2 + 1] - uv[a * 2 + 1]));
  r.uv_px += uvArea * (albedo.width || 2048) * (albedo.height || 2048);
  r.edge_mm += (Math.hypot(ux, uy, uz) + Math.hypot(vx, vy, vz) + Math.hypot(pos[c * 3] - pos[b * 3], pos[c * 3 + 1] - pos[b * 3 + 1], pos[c * 3 + 2] - pos[b * 3 + 2])) * 1000; r.edges += 3;
}
const regions = [...stats.entries()].map(([name, r]) => ({
  region: name, vertices: r.vertices, triangles: r.triangles, area_cm2: round(r.area_cm2, 0), mean_edge_mm: round(r.edge_mm / Math.max(1, r.edges), 1),
  vertices_per_cm2: round(r.vertices / Math.max(1, r.area_cm2), 2), skin_px_per_cm: round(Math.sqrt(r.uv_px / Math.max(1, r.area_cm2)), 1),
  extent_cm: r.max.map((m, k) => round((m - r.min[k]) * 100, 1)),
})).sort((a, b) => b.vertices - a.vertices);

// ---- morph targets ------------------------------------------------------------------------------------------------
const targetNames = json.meshes[bodyMesh.index].extras?.targetNames || [];
// Share of a morph's moved vertices per region (several joints can map to one region), largest first, 1% and over.
function regionShares(votes, total) {
  const byRegion = new Map();
  for (const [joint, n] of votes) byRegion.set(regionOf(joint), (byRegion.get(regionOf(joint)) || 0) + n);
  return Object.fromEntries([...byRegion.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => [r, round(n / Math.max(1, total), 2)]).filter(([, share]) => share >= 0.01));
}
const morphs = (prim.targets || []).map((target, i) => {
  const delta = readAccessor(glb, target.POSITION).data; let n = 0; let max = 0; const c = [0, 0, 0]; const votes = new Map();
  for (let v = 0; v < count; v += 1) { const d = Math.hypot(delta[v * 3], delta[v * 3 + 1], delta[v * 3 + 2]); if (d < 1e-7) continue; n += 1; max = Math.max(max, d); for (let k = 0; k < 3; k += 1) c[k] += pos[v * 3 + k]; votes.set(dominant[v], (votes.get(dominant[v]) || 0) + 1); }
  const centroid = c.map(v => v / Math.max(1, n)); const top = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
  return { name: targetNames[i] || `target${i}`, vertices: n, max_mm: round(max * 1000, 1), centre_cm: centroid.map(v => round(v * 100, 1)), main_region: top ? regionOf(top[0]) : null, main_region_share: top ? round(top[1] / n, 2) : null, region_shares: regionShares(votes, n) };
});

// ---- measurements in the rest pose ---------------------------------------------------------------------------------
const byName = name => joints.find(j => j.name === name)?.position_cm;
const height_cm = round((bodyMesh.bounds_cm.max[1] - bodyMesh.bounds_cm.min[1]), 1);
const ext = name => regions.find(r => r.region === name)?.extent_cm;
const measures = {
  height_cm, bodyBounds_cm: bodyMesh.bounds_cm,
  armSpan_cm: round(bodyMesh.bounds_cm.max[0] - bodyMesh.bounds_cm.min[0], 1),
  shoulderJointWidth_cm: byName('LeftUpperArm') && byName('RightUpperArm') ? round(Math.abs(byName('LeftUpperArm')[0] - byName('RightUpperArm')[0]), 1) : null,
  handRegionExtent_cm: { left: ext('LeftHand'), right: ext('RightHand') }, footRegionExtent_cm: { left: ext('LeftFoot'), right: ext('RightFoot') }, headRegionExtent_cm: ext('Head'),
};

// Fingers cannot be separated by joint, so estimate them geometrically: vertices of a hand region beyond 45% of its
// length from the wrist form the fingers, divided across five digits.
function fingerEstimate(side) {
  const wrist = byName(`${side}Hand`); if (!wrist) return null;
  const ids = []; for (let v = 0; v < count; v += 1) if (regionOf(dominant[v]) === `${side}Hand`) ids.push(v);
  if (!ids.length) return null;
  const dist = ids.map(v => Math.hypot(pos[v * 3] * 100 - wrist[0], pos[v * 3 + 1] * 100 - wrist[1], pos[v * 3 + 2] * 100 - wrist[2]));
  const max = Math.max(...dist); const fingers = dist.filter(d => d > max * 0.55).length;
  return { handLength_cm: round(max, 1), fingerRegionVertices: fingers, verticesPerFinger: round(fingers / 5, 0) };
}
measures.fingerEstimate = { left: fingerEstimate('Left'), right: fingerEstimate('Right') };

// ---- catalogue of human anatomy: what exists in the file --------------------------------------------------------------
const allNames = [...json.nodes.map(n => n.name), ...json.meshes.map(m => m.name), ...json.materials.map(m => m.name), ...images.map(i => i.name), ...targetNames].filter(Boolean);
const has = re => allNames.filter(n => re.test(n));
const regionVerts = names => names.reduce((s, n) => s + (regions.find(r => r.region === n)?.vertices || 0), 0);
const handVerts = regionVerts(['LeftHand', 'RightHand']); const footVerts = regionVerts(['LeftFoot', 'RightFoot']);
const bodyMeshNames = new Set(meshes.map(m => m.name));
const separate = (re, label) => { const found = meshes.filter(m => re.test(m.name)); return found.length ? { status: 'separate mesh', evidence: found.map(m => `${m.name} (${m.vertices} verts)`).join(', ') } : { status: 'absent', evidence: `no ${label} mesh, node or material` }; };
const garments = has(/cloth|garment|brief|\bshorts?\b|shirt|shoe|sock|trouser|jacket/i).filter(n => !/hair/i.test(n));
const surfaceOnly = note => ({ status: 'part of the skin surface', evidence: note });
const catalogue = [
  ['Head', 'Skull and face', 'Skin surface', surfaceOnly(`Head region: ${regionVerts(['Head'])} vertices; no separate skull, jaw or neck-muscle geometry`)],
  ['Hair (scalp)', 'Hair', 'Strands in the browser (plan page); photo cards in the GLB', separate(/hair/i, 'hair')],
  ['Eyebrows', 'Hair', 'Strands in the browser; card mesh in the GLB', separate(/eyebrow/i, 'eyebrow')],
  ['Eyelashes', 'Hair', 'Strands in the browser; card mesh in the GLB', separate(/eyelash/i, 'eyelash')],
  ['Eyes (eyeball, iris, cornea)', 'Eyes', 'Eyeball + clear shell', separate(/eyes/i, 'eye')],
  ['Eyelids', 'Eyes', 'Skin surface', morphs.some(m => /blink/i.test(m.name)) ? surfaceOnly('Part of the face skin; a "blink" morph exists but moves the whole face region, so lids cannot close independently') : surfaceOnly('Part of the face skin; no blink morph')],
  ['Eye bones (gaze)', 'Eyes', 'Rig', jointFamilies.eyes ? { status: 'present', evidence: `${jointFamilies.eyes} eye joints` } : { status: 'absent', evidence: 'no eye joints: gaze is faked in the browser by rotating the eyeball meshes' }],
  ['Tear line, caruncle, wet line', 'Eyes', 'Surface', { status: 'absent', evidence: 'no mesh or material' }],
  ['Nose', 'Face', 'Skin surface', surfaceOnly('Part of the head skin; nostril interiors are painted, not modelled')],
  ['Ears', 'Face', 'Skin surface', surfaceOnly('Part of the head skin')],
  ['Lips', 'Face', 'Skin surface', surfaceOnly('Part of the head skin; closed mouth, lip colour painted in the albedo')],
  ['Teeth, gums, tongue, mouth interior', 'Face', 'Separate meshes', has(/teeth|tooth|tongue|gum|mouth/i).length ? { status: 'present', evidence: has(/teeth|tooth|tongue|gum|mouth/i).join(', ') } : { status: 'absent', evidence: 'no teeth, gums, tongue or mouth cavity' }],
  ['Jaw (articulation)', 'Face', 'Rig', jointFamilies.jaw ? { status: 'present', evidence: `${jointFamilies.jaw} jaw joint` } : { status: 'absent', evidence: 'no jaw joint: the mouth cannot open' }],
  ['Neck', 'Body', 'Skin surface', surfaceOnly(`Neck region: ${regionVerts(['Neck'])} vertices`)],
  ['Shoulders and clavicles', 'Body', 'Skin surface + rig', jointFamilies.clavicle ? surfaceOnly(`${jointFamilies.clavicle} shoulder/clavicle joints`) : { status: 'absent', evidence: 'no clavicle joint' }],
  ['Chest, ribcage, spine', 'Body', 'Skin surface + rig', surfaceOnly(`${jointFamilies.spine} spine joints`)],
  ['Nipples, navel', 'Body', 'Skin surface', surfaceOnly('Sculpted into the body mesh and painted; cannot be verified by name')],
  ['Arms (upper arm, forearm)', 'Body', 'Skin surface + rig', jointFamilies.twist ? surfaceOnly(`${jointFamilies.twist} twist joints`) : { status: 'partial', evidence: 'no forearm or upper-arm twist joints: wrist rotation will collapse the forearm skin (candy-wrapper)' }],
  ['Hands and fingers', 'Body', 'Skin surface + rig', jointFamilies.fingers ? { status: 'present', evidence: `${jointFamilies.fingers} finger joints` } : { status: 'partial', evidence: `${handVerts} vertices for both hands (about ${measures.fingerEstimate.left?.verticesPerFinger ?? '?'} per finger), no finger joints: fingers cannot bend or grip` }],
  ['Fingernails and toenails', 'Body', 'Separate meshes or decals', has(/nail/i).length ? { status: 'present', evidence: has(/nail/i).join(', ') } : { status: 'absent', evidence: 'no nail mesh or material' }],
  ['Hips, glutes, pelvis', 'Body', 'Skin surface + rig', surfaceOnly('Rear pelvis subdivided locally (see pelvisRefinement in the asset extras)')],
  ['Thighs, knees, calves', 'Body', 'Skin surface + rig', surfaceOnly('Knee: one joint, no patella or tendon relief')],
  ['Feet, ankles, toes', 'Body', 'Skin surface + rig', jointFamilies.toes ? { status: 'present', evidence: `${jointFamilies.toes} toe joints` } : { status: 'partial', evidence: `${footVerts} vertices for both feet including toes, no toe joints: toes cannot bend` }],
  ['Body hair (chest, arms, legs, underarm, pubic)', 'Hair', 'Strands or fuzz', has(/body.?hair|pubic|chest.?hair|underarm|armpit/i).length ? { status: 'present', evidence: has(/body.?hair|pubic|chest.?hair|underarm|armpit/i).join(', ') } : { status: 'absent', evidence: 'none in the GLB (the anatomy mesh draws pubic hair procedurally at runtime)' }],
  ['Facial hair (beard, moustache, stubble)', 'Hair', 'Strands or fuzz', has(/beard|moustache|mustache|stubble/i).length ? { status: 'present', evidence: has(/beard|moustache|mustache|stubble/i).join(', ') } : { status: 'absent', evidence: 'none (stubble texture detail only, if painted in the albedo)' }],
  ['Skin: base colour', 'Skin', 'Textures', { status: 'partial', evidence: `${images.filter(i => /skin.*albedo/i.test(i.name)).length} albedo variants (${images.filter(i => /skin.*albedo/i.test(i.name)).map(i => i.name).join(', ')}); tone is a tint of one photo-like map` }],
  ['Skin: pores, wrinkles, scars, moles, veins', 'Skin', 'Normal/detail maps', { status: 'partial', evidence: `one baked normal map (${images.find(i => /normal/i.test(i.name))?.width}px), no micro-detail or masks for wrinkles, scars, moles or veins` }],
  ['Skin: tan, regional pigment, hyper-pigmentation', 'Skin', 'Masks', { status: 'absent', evidence: 'done at runtime from vertex attributes (the plan page), not authored masks' }],
  ['Clothing (briefs, shorts, shirt, shoes)', 'Wear', 'Garment meshes', garments.length ? { status: 'present', evidence: garments.join(', ') } : { status: 'absent', evidence: 'no garment meshes: briefs are a runtime shader on a copy of the body' }],
  ['Adult external anatomy', 'Private', 'Gated mesh', separate(/private|anatomy/i, 'anatomy')],
  ['Skeleton, muscles, fat (underlay)', 'Anatomy', 'Layers', { status: 'absent', evidence: 'no underlying layers' }],
].map(([part, group, technique, result]) => ({ part, group, existingTechnique: technique, ...result }));

const audit = {
  file: path.relative(appRoot, file), bytes: fs.statSync(file).size, generator: json.asset?.generator, extensionsUsed: json.extensionsUsed || [],
  totals: { nodes: json.nodes.length, meshes: json.meshes.length, materials: json.materials.length, images: images.length, textureBytes: images.reduce((s, i) => s + i.bytes, 0), vertices: meshes.reduce((s, m) => s + m.vertices, 0), triangles: meshes.reduce((s, m) => s + m.triangles, 0), animations: json.animations?.length || 0 },
  meshes, materials, images, rig: { joints: joints.length, families: jointFamilies, jointNodesWithRotationOrScale: nonIdentity, maxInfluencesPerVertex: maxInfluences, influenceHistogram, list: joints },
  regions, morphs, measures, catalogue,
};

fs.mkdirSync(outDir, { recursive: true });
const stem = path.basename(file, '.glb');
fs.writeFileSync(path.join(outDir, `glb-audit.${stem}.json`), `${JSON.stringify(audit, null, 2)}\n`);
const table = (head, rows) => `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${rows.map(r => `| ${r.join(' | ')} |`).join('\n')}\n`;
const md = `# GLB audit: ${audit.file}

Generated by \`scripts/analyze-human-model.mjs\`. ${audit.bytes} bytes, ${audit.totals.vertices} vertices, ${audit.totals.triangles} triangles, ${audit.rig.joints} joints, ${audit.morphs.length} body morphs, ${audit.totals.images} images (${(audit.totals.textureBytes / 1048576).toFixed(1)} MiB).

## Meshes
${table(['Mesh', 'Vertices', 'Triangles', 'Morphs', 'Material', 'Attributes'], meshes.map(m => [m.name, m.vertices, m.triangles, m.morphTargets, m.material, m.attributes.join(' ')]))}
## Rig
Joint families: ${Object.entries(jointFamilies).map(([k, v]) => `${k} ${v}`).join(', ')}. Max influences per vertex: ${maxInfluences}.

## Resolution per body region (dominant joint)
Texture density is for \`${albedo.name}\` (${albedo.width}x${albedo.height}).

${table(['Region', 'Vertices', 'Area cm²', 'Mean edge mm', 'Verts / cm²', 'Skin px / cm'], regions.map(r => [r.region, r.vertices, r.area_cm2, r.mean_edge_mm, r.vertices_per_cm2, r.skin_px_per_cm]))}
## Textures
${table(['Image', 'Size', 'Bytes'], images.map(i => [i.name, `${i.width}x${i.height}`, i.bytes]))}
## Morph targets
${table(['Morph', 'Vertices', 'Max mm', 'Main region (share of moved vertices)'], morphs.map(m => [m.name, m.vertices, m.max_mm, m.main_region ? `${m.main_region} (${Math.round(m.main_region_share * 100)}%)` : '']))}
## Anatomy coverage
${table(['Part', 'Group', 'Status', 'Evidence'], catalogue.map(c => [c.part, c.group, c.status, c.evidence.replace(/\|/g, '/')]))}`;
fs.writeFileSync(path.join(outDir, `glb-audit.${stem}.md`), md);
console.log(`${audit.file}: ${audit.totals.vertices} vertices, ${audit.rig.joints} joints, ${audit.morphs.length} morphs; wrote ${path.relative(process.cwd(), path.join(outDir, `glb-audit.${stem}.{json,md}`))}`);
