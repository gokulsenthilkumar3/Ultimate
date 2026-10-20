import test from 'node:test';
import assert from 'node:assert/strict';
import { FITZPATRICK_ITA, REGIONS, itaOfMelanin, melaninForIta, skinColor, toHex } from './skin-layers.mjs';

test('ITA falls monotonically as melanin rises, across the published range', () => {
  let previous = Infinity;
  for (let m = 0; m <= 1.2001; m += 0.05) { const v = itaOfMelanin(m); assert.ok(v < previous, `melanin ${m}`); previous = v; }
  assert.ok(itaOfMelanin(0) > 55, 'the lightest skin reaches "very light"');
  assert.ok(itaOfMelanin(1.2) < -30, 'the darkest skin reaches "dark"');
});

test('a Fitzpatrick type lands inside its ITA band and round-trips', () => {
  for (const [type, target] of Object.entries(FITZPATRICK_ITA)) {
    const color = skinColor({ tone: type, region: 'inner_arm' });
    const unexposedMelanin = melaninForIta(target);
    assert.ok(Math.abs(itaOfMelanin(unexposedMelanin) - target) < 0.2, `${type} round trip`);
    assert.ok(Number.isFinite(color.ita));
  }
  const bands = { I: [55, 90], II: [41, 55], III: [28, 41], IV: [10, 28], V: [-30, 10], VI: [-90, -30] };
  for (const [type, [lo, hi]] of Object.entries(bands)) { const v = itaOfMelanin(melaninForIta(FITZPATRICK_ITA[type])); assert.ok(v >= lo && v <= hi, `${type} ${v}`); }
});

test('tan darkens exposed skin and leaves the constitutive layer untouched (the separation)', () => {
  for (const type of Object.keys(FITZPATRICK_ITA)) {
    const none = skinColor({ tone: type, tan: 0, region: 'forearm' });
    const tanned = skinColor({ tone: type, tan: 1, region: 'forearm' });
    assert.equal(tanned.constitutiveMelanin, none.constitutiveMelanin);
    assert.ok(tanned.facultativeMelanin > none.facultativeMelanin);
    assert.ok(tanned.lab[0] < none.lab[0], `${type} gets darker`);
  }
});

test('unexposed skin does not tan: tan lines follow coverage and region', () => {
  const swim = skinColor({ tone: 'III', tan: 1, coverage: 0, region: 'thigh' });
  const bare = skinColor({ tone: 'III', tan: 1, coverage: 1, region: 'thigh' });
  const none = skinColor({ tone: 'III', tan: 0, region: 'thigh' });
  assert.deepEqual(swim.linear, none.linear);
  assert.ok(bare.lab[0] < swim.lab[0]);
  assert.ok(skinColor({ tone: 'III', tan: 1, region: 'palm' }).facultativeMelanin < skinColor({ tone: 'III', tan: 1, region: 'hand_dorsal' }).facultativeMelanin / 10);
});

test('skin type I tans far less than type IV', () => {
  const drop = (type) => skinColor({ tone: type, tan: 1 }).lab[0] - skinColor({ tone: type, tan: 0 }).lab[0];
  assert.ok(Math.abs(drop('I')) < Math.abs(drop('IV')) * 0.5);
});

test('a flush or sunburn changes redness without changing skin tone', () => {
  const calm = skinColor({ tone: 'II', region: 'face' });
  const flushed = skinColor({ tone: 'II', region: 'face', flush: 1 });
  const burnt = skinColor({ tone: 'II', region: 'face', burn: 1 });
  for (const other of [flushed, burnt]) {
    assert.equal(other.constitutiveMelanin, calm.constitutiveMelanin);
    assert.ok(other.lab[1] > calm.lab[1] + 1, 'redness (a*) rises');
    assert.ok(Math.abs(other.ita - calm.ita) < 25, 'the ITA of a flushed face stays in the same neighbourhood');
  }
});

test('regions differ the way anatomy says they should', () => {
  const at = (region) => skinColor({ tone: 'IV', region });
  assert.ok(at('palm').lab[0] > at('hand_dorsal').lab[0], 'palms are lighter than the back of the hand');
  assert.ok(at('sole').lab[0] > at('foot_dorsal').lab[0]);
  assert.ok(at('lips').lab[1] > at('forearm').lab[1] + 3, 'lips are redder');
  assert.ok(Object.keys(REGIONS).length >= 19);
});

test('colours are valid sRGB and hex strings', () => {
  for (const type of Object.keys(FITZPATRICK_ITA)) for (const region of Object.keys(REGIONS)) {
    const { srgb } = skinColor({ tone: type, region, tan: 0.5, flush: 0.3 });
    assert.ok(srgb.every(c => c >= 0 && c <= 1)); assert.match(toHex(srgb), /^#[0-9a-f]{6}$/);
  }
});

test('the shader constants are generated from the model', async () => {
  const { glslConstants, K_MEL, R0 } = await import('./skin-layers.mjs');
  const text = glslConstants();
  assert.match(text, /const vec3 SKIN_K_MEL = vec3\(1\.0, 1\.41\d*, 2\.46\d*\);/);
  for (const [, inner] of text.matchAll(/vec3\(([^)]*)\)/g)) for (const token of inner.split(',')) assert.ok(token.includes('.'), `"${token.trim()}" must be a float literal`);
  assert.ok(text.includes(String(Number(R0[0].toPrecision(6)))));
  assert.equal(K_MEL.length, 3);
});
