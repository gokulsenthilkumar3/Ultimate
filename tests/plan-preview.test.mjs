// Checks behind the v4 plan page's 3D human (see plan-assets/ and v4Plan_3DModel.html).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { decodePreview } from '../plan-assets/src/decode.mjs';
import { buildModel, fitEntries, measureAll, FITTED_KEYS } from '../plan-assets/src/fit.mjs';
import { loopExtent, loopLength, pickLoop, planeSection, weldMap } from '../plan-assets/src/geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const glbPath = path.join(root, 'growthtrack-ultimate/public/assets/models/humanoid-base-lite.glb');

function loadPreview() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'plan-assets/human-preview.js'), 'utf8'), sandbox);
  return sandbox.window.PLAN_HUMAN_PREVIEW;
}

/** A closed cylinder of radius r and height h, centred on the y axis. */
function cylinder(r, h, segments = 64, rings = 8) {
  const pos = []; const idx = [];
  for (let j = 0; j <= rings; j += 1) for (let i = 0; i < segments; i += 1) { const a = (i / segments) * Math.PI * 2; pos.push(Math.cos(a) * r, (j / rings) * h, Math.sin(a) * r); }
  for (let j = 0; j < rings; j += 1) for (let i = 0; i < segments; i += 1) {
    const a = j * segments + i; const b = j * segments + ((i + 1) % segments); const c = (j + 1) * segments + i; const d = (j + 1) * segments + ((i + 1) % segments);
    idx.push(a, c, b, b, c, d);
  }
  return { pos: Float32Array.from(pos), idx: Uint16Array.from(idx) };
}

test('a level slice of a cylinder is one closed loop with the right girth', () => {
  const { pos, idx } = cylinder(0.1, 1);
  const weld = weldMap(pos);
  const loops = planeSection(pos, idx, weld, [0, 0.43, 0], [0, 1, 0]);
  assert.equal(loops.length, 1);
  assert.ok(loops[0].closed);
  // Perimeter of a 64-gon inscribed in a circle of radius 0.1.
  const expected = 64 * 2 * 0.1 * Math.sin(Math.PI / 64);
  assert.ok(Math.abs(loopLength(loops[0]) - expected) < 1e-4);
  const ex = loopExtent(loops[0], [1, 0, 0], [0, 0, 1]);
  assert.ok(Math.abs(ex.width - 0.2) < 2e-3 && Math.abs(ex.depth - 0.2) < 2e-3);
});

test('an oblique slice and a loop picker ignore other parts', () => {
  const a = cylinder(0.05, 1); const b = cylinder(0.05, 1);
  for (let i = 0; i < b.pos.length; i += 3) b.pos[i] += 0.5; // a second, separate cylinder
  const pos = Float32Array.from([...a.pos, ...b.pos]);
  const idx = Uint16Array.from([...a.idx, ...Array.from(b.idx, v => v + a.pos.length / 3)]);
  const loops = planeSection(pos, idx, weldMap(pos), [0, 0.5, 0], [0, 1, 0]);
  assert.equal(loops.length, 2);
  const near = pickLoop(loops, [0.5, 0.5, 0], 0.1);
  assert.ok(Math.abs(near[0] - 0.5) < 0.06 || Math.abs(near[3] - 0.5) < 0.06);
});

test('the embedded preview was built from the current humanoid GLB and holds no private anatomy', async () => {
  const preview = loadPreview();
  const hash = crypto.createHash('sha256').update(fs.readFileSync(glbPath)).digest('hex');
  assert.equal(preview.source.sha256, hash, 'humanoid-base-lite.glb changed: run growthtrack-ultimate/scripts/plan-preview/build-model.mjs and rebuild the viewer');
  assert.deepEqual(Object.keys(preview.parts).sort(), ['brows', 'eyes', 'hair', 'lashes']);
  const decoded = await decodePreview(preview);
  assert.equal(decoded.body.count, 16001); // the body mesh only; the 4,803-vertex private mesh is not shipped
  assert.ok(!('d_length' in decoded.body.morphs) && !('d_girth' in decoded.body.morphs));
});

test('the fit matches every entry it can reach, and says so when it cannot', async () => {
  const model = buildModel(await decodePreview(loadPreview()));
  const entries = { height: 178, weight: 78, bodyFat: 18, waist: 84, hips: 100, chest: 100, neck: 38, shoulders: 124, arms: 33, thighs: 56, calves: 37 };
  const fit = fitEntries(model, entries);
  for (const key of FITTED_KEYS) {
    assert.equal(fit.report[key].status, 'fitted', key);
    assert.ok(Math.abs(fit.report[key].achieved - entries[key]) <= 0.5, `${key}: ${fit.report[key].achieved}`);
  }
  assert.ok(Math.abs(fit.scale - 178 / (model.height * 100)) < 1e-9);
  // Measuring the finished body independently agrees with the report.
  const measured = measureAll(model, fit);
  for (const key of FITTED_KEYS) assert.ok(Math.abs(measured[key] - entries[key]) <= 0.5, key);
  const impossible = fitEntries(model, { waist: 190 });
  assert.equal(impossible.report.waist.status, 'limit');
  assert.equal(impossible.report.waist.limit, 'max');
  assert.ok(impossible.report.waist.achieved < 190);
});

test('blank entries leave the body generic and unknown values are not guessed', async () => {
  const model = buildModel(await decodePreview(loadPreview()));
  const none = fitEntries(model, {});
  assert.deepEqual(none.weights, {});
  assert.equal(none.scale, 1);
  assert.deepEqual(none.report, {});
  const ignored = fitEntries(model, { waist: '', hips: 0, chest: -4, neck: NaN });
  assert.deepEqual(ignored.weights, {});
});
