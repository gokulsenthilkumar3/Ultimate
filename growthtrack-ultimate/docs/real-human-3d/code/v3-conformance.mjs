#!/usr/bin/env node
// "Is this GLB the v3 human?" A conformance check run on the JSON that `scripts/analyze-human-model.mjs` writes, so the
// same measurements that showed the gaps in the shipped model become the acceptance gate for its replacement.
//
//   node scripts/analyze-human-model.mjs path/to/model.glb --out /tmp/audit
//   node docs/real-human-3d/code/v3-conformance.mjs /tmp/audit/glb-audit.model.json [--profile core|full] [--md]
//
// Profiles: `full` = every part and texture tile in one assembled file (the S2 gate); `core` = the small first-paint file
// (rig, body, morphs, low-resolution textures; parts and tiles arrive separately).
import { readFileSync } from 'node:fs';
import { FACE_BLENDSHAPES, RIG_GROUPS, RIG_JOINT_BUDGET, TILE_MIN_TEXELS } from './anatomy-spec.mjs';

const FACE_REGIONS = new Set(['Head', 'Neck', 'Neck1', 'Jaw', 'LeftEye', 'RightEye', 'Tongue0', 'Tongue1', 'Tongue2']);
const MIB = 1048576;

export const BUDGETS = Object.freeze({ coreBytes: 3 * MIB, fullBytes: 28 * MIB, coreTriangles: 30000, fullTriangles: 120000, morphTargets: 160, headEdgeMm: 3.5, handEdgeMm: 2.0 });

const names = (list) => list.map((j) => j.name);
const check = (id, level, title, pass, detail) => ({ id, level, title, pass, detail });

export function checkConformance(audit, { profile = 'full' } = {}) {
  const joints = new Set(names(audit.rig.list));
  const body = audit.meshes.find((m) => m.name === 'GrowthTrackBody');
  const morphNames = new Set(audit.morphs.map((m) => m.name));
  const meshNames = audit.meshes.map((m) => m.name);
  const triangles = body?.triangles ?? 0;
  const out = [];

  // ---- skeleton
  const missing = Object.entries(RIG_GROUPS).map(([group, list]) => [group, list.filter((j) => !joints.has(j))]).filter(([, list]) => list.length);
  out.push(check('rig-joints', 'must', 'Every v3 joint exists (core, face, arms and twist, fingers, legs and twist, toes)', missing.length === 0,
    missing.length ? `missing ${missing.map(([g, l]) => `${g} ${l.length}`).join(', ')} of ${Object.values(RIG_GROUPS).flat().length}` : 'all present'));
  out.push(check('rig-budget', 'must', `At most ${RIG_JOINT_BUDGET} joints`, audit.rig.joints <= RIG_JOINT_BUDGET, `${audit.rig.joints} joints`));
  out.push(check('rig-influences', 'must', 'At most 4 influences per vertex', audit.rig.maxInfluencesPerVertex <= 4, `${audit.rig.maxInfluencesPerVertex}`));

  // ---- face shapes
  const missingShapes = FACE_BLENDSHAPES.filter((n) => !morphNames.has(n));
  out.push(check('face-shapes', 'must', 'The 52 ARKit face blendshapes exist on the body mesh', missingShapes.length === 0, missingShapes.length ? `${missingShapes.length} of 52 missing` : 'all 52 present'));
  const present = audit.morphs.filter((m) => FACE_BLENDSHAPES.includes(m.name));
  const offFace = present.filter((m) => { const shares = m.region_shares || {}; const inside = Object.entries(shares).filter(([r]) => FACE_REGIONS.has(r)).reduce((s, [, v]) => s + v, 0); return inside < 0.98; });
  out.push(check('face-scope', 'must', 'Every face shape moves face vertices only (at least 98% inside the head, neck, jaw, eyes, tongue)',
    present.length === 0 ? null : offFace.length === 0, present.length === 0 ? 'no face shapes to check' : offFace.length ? `${offFace.length} outside: ${offFace.map((m) => m.name).join(', ')}` : 'all inside'));

  // ---- body morph contract
  const declared = new Set((body?.extras?.growthtrack) ?? []);
  out.push(check('morph-regions', 'must', 'Each body morph declares its region of influence (extras.growthtrack.morphRegions)', declared.has('morphRegions'), declared.has('morphRegions') ? 'declared' : 'not declared'));
  out.push(check('joint-offsets', 'must', 'Morphs carry joint offsets so the skeleton follows the shape (extras.growthtrack.jointOffsets)', declared.has('jointOffsets'), declared.has('jointOffsets') ? 'present' : 'absent'));
  out.push(check('morph-budget', 'must', `At most ${BUDGETS.morphTargets} morph targets`, (body?.morphTargets ?? 0) <= BUDGETS.morphTargets, `${body?.morphTargets ?? 0}`));
  out.push(check('empty-morphs', 'should', 'No morph target that moves nothing', audit.morphs.every((m) => m.vertices > 0), audit.morphs.filter((m) => m.vertices === 0).map((m) => m.name).join(', ') || 'none'));

  // ---- mesh data
  const attrs = new Set(body?.attributes ?? []);
  const needAttrs = ['TANGENT', '_TILE', '_REGION', '_MICROSCALE'];
  const missingAttrs = needAttrs.filter((a) => !attrs.has(a));
  out.push(check('attributes', 'must', 'The body mesh has TANGENT, _TILE, _REGION and _MICROSCALE', missingAttrs.length === 0, missingAttrs.length ? `missing ${missingAttrs.join(', ')}` : 'present'));
  const triLimit = profile === 'core' ? BUDGETS.coreTriangles : BUDGETS.fullTriangles;
  out.push(check('triangles', 'must', `Body mesh within ${triLimit.toLocaleString('en')} triangles (${profile})`, triangles <= triLimit, `${triangles.toLocaleString('en')}`));
  const region = (n) => audit.regions.find((r) => r.region === n);
  const head = region('Head'); const hand = region('RightHand');
  out.push(check('head-edge', 'should', `Head mesh edges at most ${BUDGETS.headEdgeMm} mm`, profile === 'core' ? null : (head?.mean_edge_mm ?? Infinity) <= BUDGETS.headEdgeMm, `${head?.mean_edge_mm ?? '?'} mm`));
  out.push(check('hand-edge', 'should', `Hand mesh edges at most ${BUDGETS.handEdgeMm} mm`, profile === 'core' ? null : (hand?.mean_edge_mm ?? Infinity) <= BUDGETS.handEdgeMm, `${hand?.mean_edge_mm ?? '?'} mm`));

  // ---- textures
  const density = (n) => region(n)?.skin_px_per_cm ?? 0;
  const bodyDensity = Math.min(...audit.regions.filter((r) => !/Head|Hand|Foot/.test(r.region)).map((r) => r.skin_px_per_cm));
  const dens = [['Head', density('Head'), TILE_MIN_TEXELS.HEAD], ['Hand', density('RightHand'), TILE_MIN_TEXELS.HANDS], ['Foot', density('RightFoot'), TILE_MIN_TEXELS.FEET], ['Body', bodyDensity, TILE_MIN_TEXELS.BODY]];
  const thin = dens.filter(([, got, need]) => got < need);
  out.push(check('texel-density', profile === 'core' ? 'should' : 'must', 'Skin texture density meets the tile minimums (head 90, hands 45, feet 35, body 30 texels/cm)', profile === 'core' ? null : thin.length === 0,
    thin.length ? thin.map(([n, got, need]) => `${n} ${got} < ${need}`).join('; ') : 'all met'));
  out.push(check('micro-tile', 'must', 'A tiling micro-detail texture is present', profile === 'core' ? null : audit.images.some((i) => /micro/i.test(i.name)), audit.images.some((i) => /micro/i.test(i.name)) ? 'present' : 'absent'));
  out.push(check('ktx2', 'should', 'Textures are KTX2 (GPU-compressed)', audit.images.every((i) => /ktx2/i.test(i.mime ?? '')), `${audit.images.filter((i) => !/ktx2/i.test(i.mime ?? '')).length} of ${audit.images.length} are not`));
  out.push(check('meshopt', 'should', 'Geometry is meshopt-compressed', (audit.extensionsUsed ?? []).includes('EXT_meshopt_compression'), (audit.extensionsUsed ?? []).join(', ') || 'no extensions'));
  const sizeLimit = profile === 'core' ? BUDGETS.coreBytes : BUDGETS.fullBytes;
  out.push(check('file-size', 'must', `File within ${(sizeLimit / MIB).toFixed(0)} MiB (${profile})`, audit.bytes <= sizeLimit, `${(audit.bytes / MIB).toFixed(1)} MiB`));

  // ---- parts (only when everything is assembled in one file)
  if (profile === 'full') {
    // The eight parts of the existing v2 contract (src/components/morphEngine/digitalHumanV2.js) plus the parts v3 adds.
    const parts = ['eyes', 'cornea', 'tearline', 'teeth', 'gums', 'tongue', 'scalp', 'nails', 'hair', 'eyebrows', 'eyelashes'];
    for (const part of parts) {
      const found = meshNames.filter((n) => n.toLowerCase().includes(part.replace(/s$/, '')) && !(part === 'eyes' && /brow|lash/i.test(n)));
      out.push(check(`part-${part}`, 'must', `A mesh for ${part}`, found.length > 0, found.join(', ') || 'absent'));
    }
  }
  return { profile, results: out, summary: summarise(out) };
}

function summarise(results) {
  const applicable = results.filter((r) => r.pass !== null);
  const must = applicable.filter((r) => r.level === 'must'); const should = applicable.filter((r) => r.level === 'should');
  return { mustPassed: must.filter((r) => r.pass).length, mustTotal: must.length, shouldPassed: should.filter((r) => r.pass).length, shouldTotal: should.length };
}

export function toMarkdown(report, file = '') {
  const { summary: s } = report;
  const rows = report.results.map((r) => `| ${r.pass === null ? 'n/a' : r.pass ? 'pass' : '**FAIL**'} | ${r.level} | ${r.title} | ${r.detail} |`);
  return [`# GLB v3 conformance: ${file}`, '', `Profile **${report.profile}**: ${s.mustPassed} of ${s.mustTotal} required checks pass, ${s.shouldPassed} of ${s.shouldTotal} recommended checks pass.`, '',
    '| Result | Level | Check | Detail |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = process.argv.slice(2); const file = args.find((a) => !a.startsWith('--'));
  if (!file) { console.error('usage: v3-conformance.mjs <audit.json> [--profile core|full] [--md]'); process.exit(2); }
  const profile = args.includes('--profile') ? args[args.indexOf('--profile') + 1] : 'full';
  const report = checkConformance(JSON.parse(readFileSync(file, 'utf8')), { profile });
  console.log(args.includes('--md') ? toMarkdown(report, file) : JSON.stringify(report, null, 2));
  process.exit(report.summary.mustPassed === report.summary.mustTotal ? 0 : 1);
}
