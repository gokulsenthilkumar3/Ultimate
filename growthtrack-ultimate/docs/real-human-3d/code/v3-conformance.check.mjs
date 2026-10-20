import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FACE_BLENDSHAPES, RIG_GROUPS } from './anatomy-spec.mjs';
import { checkConformance, toMarkdown } from './v3-conformance.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SHIPPED = resolve(here, '../data/glb-audit.humanoid-base.json');
const shipped = () => JSON.parse(readFileSync(SHIPPED, 'utf8'));
const byId = (report, id) => report.results.find((r) => r.id === id);

/** An audit of an imaginary asset that meets every requirement, built from the spec itself. */
function passingAudit() {
  const joints = Object.values(RIG_GROUPS).flat().map((name) => ({ name, parent: null, position_cm: [0, 0, 0] }));
  const regions = ['Head', 'RightHand', 'LeftHand', 'RightFoot', 'LeftFoot', 'Spine1', 'RightLeg'].map((region) => ({ region, mean_edge_mm: region === 'Head' ? 2.8 : region.includes('Hand') ? 1.5 : 6, skin_px_per_cm: region === 'Head' ? 94 : region.includes('Hand') ? 50 : region.includes('Foot') ? 38 : 31 }));
  return {
    bytes: 20 * 1048576, extensionsUsed: ['EXT_meshopt_compression', 'KHR_texture_basisu'],
    rig: { joints: joints.length, maxInfluencesPerVertex: 4, list: joints },
    meshes: [
      { name: 'GrowthTrackBody', triangles: 90000, morphTargets: 110, attributes: ['POSITION', 'NORMAL', 'TANGENT', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0', '_TILE', '_REGION', '_MICROSCALE'], extras: { growthtrack: ['morphRegions', 'jointOffsets'] } },
      ...['GrowthTrackEyes', 'GrowthTrackCornea', 'GrowthTrackTearline', 'GrowthTrackTeeth', 'GrowthTrackGums', 'GrowthTrackTongue', 'GrowthTrackScalp', 'GrowthTrackNails', 'GrowthTrackHair', 'GrowthTrackEyebrows', 'GrowthTrackEyelashes'].map((name) => ({ name, triangles: 1000, morphTargets: 0, attributes: [] })),
    ],
    morphs: [...FACE_BLENDSHAPES.map((name) => ({ name, vertices: 300, region_shares: { Head: 0.97, Jaw: 0.03 } })), { name: 'waist_narrow', vertices: 900, region_shares: { Spine1: 1 } }],
    regions, images: [{ name: 'Head_albedo', mime: 'image/ktx2' }, { name: 'SkinMicro_normal', mime: 'image/ktx2' }],
  };
}

test('an asset that meets the spec passes every required and recommended check', () => {
  const report = checkConformance(passingAudit(), { profile: 'full' });
  const failed = report.results.filter((r) => r.pass === false).map((r) => `${r.id}: ${r.detail}`);
  assert.deepEqual(failed, []);
  assert.equal(report.summary.mustPassed, report.summary.mustTotal);
  assert.equal(report.summary.shouldPassed, report.summary.shouldTotal);
});

test('the shipped asset fails exactly where the audit said it would', () => {
  const report = checkConformance(shipped(), { profile: 'full' });
  for (const id of ['rig-joints', 'face-shapes', 'morph-regions', 'joint-offsets', 'attributes', 'texel-density', 'micro-tile', 'part-cornea', 'part-tearline', 'part-teeth', 'part-gums', 'part-tongue', 'part-scalp', 'part-nails', 'head-edge', 'hand-edge', 'ktx2', 'meshopt', 'empty-morphs']) assert.equal(byId(report, id).pass, false, id);
  for (const id of ['rig-budget', 'rig-influences', 'morph-budget', 'triangles', 'file-size', 'part-eyes', 'part-hair', 'part-eyebrows', 'part-eyelashes']) assert.equal(byId(report, id).pass, true, id);
  assert.match(byId(report, 'rig-joints').detail, /fingers 30/);
  assert.match(byId(report, 'texel-density').detail, /Head 23 < 90/);
  assert.match(byId(report, 'empty-morphs').detail, /d_length/);
});

test('a face shape that moves the arms is flagged', () => {
  const audit = passingAudit(); audit.morphs[0] = { ...audit.morphs[0], region_shares: { Head: 0.5, RightUpperArm: 0.5 } };
  const report = checkConformance(audit); assert.equal(byId(report, 'face-scope').pass, false); assert.match(byId(report, 'face-scope').detail, new RegExp(audit.morphs[0].name));
});

test('the core profile skips tile and part checks and enforces the first-paint budgets', () => {
  const audit = passingAudit(); audit.bytes = 4 * 1048576; audit.meshes[0].triangles = 25000;
  const report = checkConformance(audit, { profile: 'core' });
  assert.equal(byId(report, 'file-size').pass, false);                         // 4 MiB is over the 3 MiB core budget
  assert.equal(byId(report, 'texel-density').pass, null); assert.equal(byId(report, 'micro-tile').pass, null); assert.equal(byId(report, 'part-teeth'), undefined);
  assert.equal(byId(report, 'triangles').pass, true);
});

test('markdown report and command-line exit code', () => {
  const md = toMarkdown(checkConformance(shipped()), 'shipped');
  assert.match(md, /required checks pass/); assert.match(md, /\*\*FAIL\*\*/);
  const run = spawnSync(process.execPath, [resolve(here, 'v3-conformance.mjs'), SHIPPED, '--md'], { encoding: 'utf8' });
  assert.equal(run.status, 1); assert.match(run.stdout, /Every v3 joint exists/);
});
