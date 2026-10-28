// Checks behind the v4 plan page's 3D human (see growthtrack-ultimate/docs/3d-plans/).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { decodePreview } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/decode.mjs';
import { buildModel, fitEntries, measureAll, FITTED_KEYS } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/fit.mjs';
import { applyMorphs, loopExtent, loopLength, pickLoop, planeSection, vertexNormals, weldMap } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/geometry.mjs';
import { buildEyes, eyeCentres } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/eyelayout.mjs';
import { createSkinIndex } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/skinindex.mjs';
import { LM } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/face.mjs';
import { FACE_DEFAULTS, FACE_PARAMS, bindLid, bindMeasurements, buildFaceChannels, faceWeights, measureFace, solveFaceParam } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/faceparams.mjs';
import { growBrows, growLashes, growScalpHair, hairWeight, lidMargin, strandPositions } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/hairgrow.mjs';
import { HAIR_SHADES, HAIR_STYLES, HAIR_TEXTURES, resolveHair } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/hairstyles.mjs';
import { SKIN_TONES, UNDERTONES } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/palettes.mjs';
import { bound } from '../growthtrack-ultimate/docs/3d-plans/plan-assets/src/skinindex.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const glbPath = path.join(root, 'growthtrack-ultimate/public/assets/models/humanoid-base.glb');

function loadPreview() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'growthtrack-ultimate/docs/3d-plans/plan-assets/human-preview.js'), 'utf8'), sandbox);
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
  assert.equal(preview.source.sha256, hash, 'humanoid-base.glb changed: run growthtrack-ultimate/scripts/plan-preview/build-model.mjs and rebuild the viewer');
  assert.deepEqual(Object.keys(preview.parts).sort(), ['brows', 'eyes', 'lashes'], 'the photo hair cards are not shipped: hair is grown in the browser');
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

// ---- face, eyes and hair -------------------------------------------------------------------------------------------------
let shared = null;
async function face() {
  if (shared) return shared;
  const D = await decodePreview(loadPreview());
  const weld = weldMap(D.body.pos);
  const normals = vertexNormals(D.body.pos, D.body.idx, weld, new Float32Array(D.body.count * 3));
  const skin = createSkinIndex(D.body.pos, D.body.idx, t => D.body.pos[D.body.idx[t * 3] * 3 + 1] > 0.55 && D.body.pos[D.body.idx[t * 3 + 1] * 3 + 1] > 0.55);
  const eyes = buildEyes(D.parts.eyes);
  const channels = buildFaceChannels(D, skin, eyes);
  const bindings = bindMeasurements(skin, channels.points);
  bindLid(bindings, lidMargin({ skin, normals, pos: D.body.pos, idx: D.body.idx }, eyes[0], 180));
  const ctx = { pos: D.body.pos, idx: D.body.idx, normals, skin, LM, browGuide: D.parts.brows.pos, eyes };
  const measureWith = values => {
    const weights = faceWeights(values); const body = new Float32Array(D.body.pos.length); const eyePos = new Float32Array(D.parts.eyes.pos.length);
    applyMorphs(D.body.pos, { ...D.body.morphs, ...channels.body }, weights, body); applyMorphs(D.parts.eyes.pos, { ...D.parts.eyes.morphs, ...channels.eyes }, weights, eyePos);
    return measureFace(bindings, D.body.idx, body, eyeCentres(eyes, D.parts.eyes.pos, eyePos));
  };
  shared = { D, skin, eyes, channels, bindings, ctx, measureWith };
  return shared;
}
const zero = Object.fromEntries(FACE_PARAMS.map(p => [p.key, 0]));

test('each eye is a sphere of about 12.7 mm with its own glass shell, one on each side', async () => {
  const { eyes, D } = await face();
  assert.equal(eyes.length, 2);
  assert.ok(eyes[0].center[0] > 0 && eyes[1].center[0] < 0, 'left eye at +x, right at -x');
  assert.ok(Math.abs(eyes[0].center[0] + eyes[1].center[0]) < 1e-3 && Math.abs(eyes[0].center[1] - eyes[1].center[1]) < 1e-3, 'the eyes mirror each other');
  for (const eye of eyes) {
    assert.ok(eye.radius > 0.0120 && eye.radius < 0.0135, `eyeball radius ${eye.radius}`);
    assert.ok(eye.shellRadius > eye.radius && eye.shellRadius < 0.017, `shell radius ${eye.shellRadius}`);
    assert.ok(Math.hypot(...eye.shellOffset) < 0.003, 'the shell is nearly concentric');
  }
  const layers = new Set(D.parts.eyes.layer); assert.deepEqual([...layers].sort(), [0, 1]);
});

test('the landmarks the face controls rely on lie on the skin of this asset', async () => {
  const { skin } = await face();
  for (const name of ['nasion', 'glabella', 'pronasale', 'subnasale', 'upperLip', 'stomion', 'lowerLip', 'menton', 'gonion', 'ear']) {
    const hit = skin.nearest(LM[name], 0.03); assert.ok(hit, name); assert.ok(hit.dist < 0.0025, `${name} is ${(hit.dist * 1000).toFixed(2)} mm from the skin`);
  }
});

test('generated face channels are small, local and symmetric where they should be', async () => {
  const { channels, D } = await face();
  const head = v => D.body.group[v] === 4 || D.body.group[v] === 5;
  for (const [name, ch] of Object.entries(channels.body)) {
    assert.ok(ch.index.length > 20, `${name} moves some vertices`);
    let max = 0; for (let i = 0; i < ch.index.length; i += 1) { assert.ok(head(ch.index[i]), `${name} touches only head and neck`); max = Math.max(max, Math.hypot(ch.delta[i * 3], ch.delta[i * 3 + 1], ch.delta[i * 3 + 2])); }
    assert.ok(max < 0.0015, `${name} moves skin by at most ${(max * 1000).toFixed(2)} mm per unit`);
  }
  for (const name of ['f_eye_spacing', 'f_nose_width', 'f_mouth_width', 'f_jaw_width', 'f_cheek_width']) {
    const ch = channels.body[name]; let left = 0; let right = 0;
    for (let i = 0; i < ch.index.length; i += 1) { const x = D.body.pos[ch.index[i] * 3]; if (x > 0.002) left += ch.delta[i * 3]; else if (x < -0.002) right += ch.delta[i * 3]; }
    assert.ok(left > 0 && right < 0 && Math.abs(left + right) < 0.12 * left, `${name} widens both sides about equally (${left.toFixed(4)} / ${right.toFixed(4)})`);
  }
  assert.ok(channels.eyes.f_eye_spacing, 'the eyeballs move with eye spacing');
  assert.ok(!channels.eyes.f_eye_open, 'lid channels leave the eyeballs alone');
});

test('face sizes are measured on the drawn face and respond to their sliders in the right direction', async () => {
  const { measureWith } = await face();
  const base = measureWith(zero);
  assert.ok(base.eyeSpacing > 55 && base.eyeSpacing < 60, `eye spacing ${base.eyeSpacing}`);
  assert.ok(base.mouthWidth > 50 && base.mouthWidth < 58 && base.noseWidth > 28 && base.noseWidth < 36);
  for (const p of FACE_PARAMS.filter(q => q.measure)) {
    const up = measureWith({ ...zero, [p.key]: 3 })[p.measure]; const down = measureWith({ ...zero, [p.key]: -3 })[p.measure];
    const gain = (up - down) / 6;
    assert.ok(gain > 0.3 && gain < 1.4, `${p.key}: ${gain.toFixed(2)} ${p.unit} per unit`);
  }
});

test('a typed size is reached, or the limit is reported instead', async () => {
  const { measureWith } = await face();
  const read = p => values => measureWith(values)[p.measure];
  for (const [key, target] of [['eyeSpacing', 62], ['noseWidth', 36], ['mouthWidth', 51], ['upperLip', 12]]) {
    const p = FACE_PARAMS.find(q => q.key === key); const res = solveFaceParam(p, target, { ...FACE_DEFAULTS }, read(p));
    assert.ok(res.ok && Math.abs(res.reached - target) < 0.25, `${key} -> ${res.reached}`);
  }
  const p = FACE_PARAMS.find(q => q.key === 'mouthWidth'); const res = solveFaceParam(p, 120, { ...FACE_DEFAULTS }, read(p));
  assert.equal(res.ok, false); assert.equal(res.value, p.range[1]); assert.ok(res.reached < 120);
});

test('hair grows only on the scalp: not on the face or ears, and down to the nape', () => {
  const none = { height: 0, recession: 0 };
  for (const [name, point] of [['forehead', [0, 0.84, 0.15]], ['cheek', [0.04, 0.76, 0.12]], ['nose', [0, 0.76, 0.16]], ['left ear', [LM.ear[0], LM.ear[1], LM.ear[2]]], ['right ear', [-LM.ear[0], LM.ear[1], LM.ear[2]]]]) {
    assert.equal(hairWeight(point, none, LM), 0, name);
  }
  for (const [name, point] of [['crown', [0, 0.9, 0.03]], ['back', [0, 0.82, -0.04]], ['nape', [0, 0.75, -0.035]], ['sideburn', [0.072, 0.83, 0.07]]]) assert.ok(hairWeight(point, none, LM) > 0.9, name);
  assert.ok(hairWeight([0.02, 0.886, 0.1], { height: 10, recession: 0 }, LM) < hairWeight([0.02, 0.886, 0.1], { height: -10, recession: 0 }, LM), 'a higher hairline leaves less hair');
});

test('styles resolve to usable numbers and a shaved head grows nothing', async () => {
  for (const key of Object.keys(HAIR_STYLES)) {
    const r = resolveHair({ style: key });
    assert.ok(r.points >= 5 && r.points <= 22, key); assert.ok(Object.values(r.len).every(v => v >= 0 && v < 0.5), key);
  }
  assert.equal(resolveHair({ style: 'bald' }).bald, true);
  assert.equal(resolveHair({ style: 'afro' }).textureName, 'coily');
  assert.equal(resolveHair({ style: 'afro', texture: 'straight' }).curl.amp, 0);
  assert.ok(Object.keys(HAIR_TEXTURES).length === 4 && Object.keys(HAIR_SHADES).length >= 10);
  assert.ok(Object.values(HAIR_SHADES).every(hex => /^#[0-9a-f]{6}$/i.test(hex)));
  const { ctx } = await face();
  assert.equal(growScalpHair(ctx, resolveHair({ style: 'bald' })), null);
});

test('scalp hair is the same every time, sits on the skin and respects the length map', async () => {
  const { ctx } = await face();
  const r = resolveHair({ style: 'crop' });
  const a = growScalpHair(ctx, r, { budget: 200000 }); const b = growScalpHair(ctx, r, { budget: 200000 });
  assert.ok(a.count > 3000, `${a.count} strands`);
  assert.equal(crypto.createHash('sha1').update(Buffer.from(a.base.buffer)).digest('hex'), crypto.createHash('sha1').update(Buffer.from(b.base.buffer)).digest('hex'), 'seeded: no randomness between runs');
  const cur = [0, 0, 0]; let longest = 0;
  for (let g = 0; g < a.guideCount; g += 1) {
    bound(ctx.pos, ctx.idx, a.guideTri[g * 4], [a.guideTri[g * 4 + 1], a.guideTri[g * 4 + 2], a.guideTri[g * 4 + 3]], cur);
    assert.ok(hairWeight(cur, { height: 0, recession: 0 }, LM) > 0, 'every root is inside the hair region');
  }
  for (let i = 0; i < a.count; i += 1) { const o = i * a.P * 3; longest = Math.max(longest, Math.hypot(a.base[o + (a.P - 1) * 3] - a.base[o], a.base[o + (a.P - 1) * 3 + 1] - a.base[o + 1], a.base[o + (a.P - 1) * 3 + 2] - a.base[o + 2])); }
  assert.ok(longest < 0.05, `a short crop never grows past 5 cm (longest ${(longest * 100).toFixed(1)} cm)`);
  const long = growScalpHair(ctx, resolveHair({ style: 'long' }), { budget: 200000 }); let reach = 0;
  for (let i = 0; i < long.count; i += 1) { const o = i * long.P * 3; reach = Math.max(reach, Math.hypot(long.base[o + (long.P - 1) * 3 + 1] - long.base[o + 1])); }
  assert.ok(reach > 0.15, 'long hair hangs well below its roots');
});

test('strands follow the skin when the head moves', async () => {
  const { ctx, D } = await face();
  const hair = growScalpHair(ctx, resolveHair({ style: 'crop' }), { budget: 120000 });
  const moved = D.body.pos.slice(); for (let v = 0; v < D.body.count; v += 1) moved[v * 3] += 0.005;
  const out = new Float32Array(hair.count * hair.P * 6); strandPositions(hair, D.body.idx, moved, out);
  for (const probe of [0, 17, hair.count - 1]) { const o = probe * hair.P * 6; assert.ok(Math.abs(out[o] - (hair.base[probe * hair.P * 3] + 0.005)) < 1e-5); assert.equal(out[o], out[o + 3], 'the two ribbon vertices share a point'); }
});

test('brows grow on the skin above the eyes and lashes along the lid edge', async () => {
  const { ctx, D } = await face();
  const brows = growBrows(ctx, {}); assert.ok(brows.count > 400, `${brows.count} brow hairs`);
  const cur = [0, 0, 0];
  for (let g = 0; g < brows.guideCount; g += 1) { bound(ctx.pos, ctx.idx, brows.guideTri[g * 4], [brows.guideTri[g * 4 + 1], brows.guideTri[g * 4 + 2], brows.guideTri[g * 4 + 3]], cur); assert.ok(cur[1] > 0.805 && cur[1] < 0.835 && Math.abs(cur[0]) > 0.009 && Math.abs(cur[0]) < 0.066, `brow root ${cur}`); }
  const lifted = growBrows(ctx, { lift: 0.003 }); let sumA = 0; let sumB = 0;
  for (let g = 0; g < brows.guideCount; g += 1) sumA += brows.guideRoot[g * 3 + 1]; for (let g = 0; g < lifted.guideCount; g += 1) sumB += lifted.guideRoot[g * 3 + 1];
  assert.ok(sumB / lifted.guideCount > sumA / brows.guideCount + 0.002, 'lifting the brows raises them');
  for (const eye of ctx.eyes) {
    const margin = lidMargin(ctx, eye); assert.ok(margin.length > 150, `lid margin found around ${margin.length}/180 of the eye`);
    for (const m of margin) { const d = Math.hypot(m.p[0] - eye.center[0], m.p[1] - eye.center[1], m.p[2] - eye.center[2]); assert.ok(d > eye.radius - 0.001 && d < eye.radius + 0.004, `the lid edge is where the skin meets the eyeball (${((d - eye.radius) * 1000).toFixed(2)} mm off)`); }
  }
  const lashes = growLashes(ctx, {}); assert.ok(lashes.count > 200 && lashes.count < 300, `${lashes.count} lashes`);
  assert.ok(D.parts.lashes.pos.length > 0);
});

test('colour choices are ordered and small', () => {
  const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
  for (let i = 1; i < SKIN_TONES.length; i += 1) assert.ok(lum(SKIN_TONES[i].hex) < lum(SKIN_TONES[i - 1].hex), `tone ${SKIN_TONES[i].id} is deeper than ${SKIN_TONES[i - 1].id}`);
  assert.equal(SKIN_TONES.length, 10);
  for (const v of Object.values(UNDERTONES)) assert.ok(v.every(c => c >= 0.9 && c <= 1.06), 'undertones are small shifts');
});
