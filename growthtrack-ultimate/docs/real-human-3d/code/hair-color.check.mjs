import test from 'node:test';
import assert from 'node:assert/strict';
import { GREY_ALBEDO, HAIR_PRESETS, fibreAlbedo, hairColor, luminance, toHex } from './hair-color.mjs';
import { linearToLab } from './skin-layers.mjs';

const hexToLinear = (hex) => [1, 3, 5].map((i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const dE = (a, b) => Math.hypot(...linearToLab(a).map((v, i) => v - linearToLab(b)[i]));

const REFERENCE = { black: '#1b1512', darkBrown: '#3b2415', brown: '#5e3a1c', lightBrown: '#8a6038', auburn: '#7a3a1e', red: '#a4491d', blonde: '#c8a461', platinum: '#e8d9b8' };

test('every preset is close to a typical colour for that shade', () => {
  let total = 0;
  for (const [name, hex] of Object.entries(REFERENCE)) { const e = dE(hairColor({ preset: name }).fibre, hexToLinear(hex)); assert.ok(e < 12, `${name}: ${e.toFixed(1)}`); total += e; }
  assert.ok(total / Object.keys(REFERENCE).length < 8);
});

test('shades get lighter in the order people expect', () => {
  const order = ['black', 'darkBrown', 'brown', 'lightBrown', 'blonde', 'platinum'];
  const y = order.map((n) => luminance(hairColor({ preset: n }).fibre));
  for (let i = 1; i < y.length; i += 1) assert.ok(y[i] > y[i - 1], `${order[i]} should be lighter than ${order[i - 1]}`);
});

test('red hair is red: strong red over green over blue', () => {
  const [r, g, b] = hairColor({ preset: 'red' }).fibre;
  assert.ok(r > g * 1.5 && g > b * 1.5);
});

test('more eumelanin always darkens, more pheomelanin always warms', () => {
  assert.ok(luminance(fibreAlbedo({ eumelanin: 0.6, pheomelanin: 0.2 })) < luminance(fibreAlbedo({ eumelanin: 0.3, pheomelanin: 0.2 })));
  const cool = fibreAlbedo({ eumelanin: 0.2, pheomelanin: 0.05 }); const warm = fibreAlbedo({ eumelanin: 0.2, pheomelanin: 0.8 });
  assert.ok(warm[2] / warm[0] < cool[2] / cool[0]);
});

test('grey is a fraction of white fibres, not a mid-tone blend of the pigment', () => {
  const none = hairColor({ preset: 'darkBrown', grey: 0 }); const half = hairColor({ preset: 'darkBrown', grey: 0.5 });
  assert.deepEqual(half.fibre, none.fibre);
  assert.deepEqual(half.greyFibre, [...GREY_ALBEDO]);
  assert.ok(luminance(half.mean) > luminance(none.mean));
  assert.equal(half.greyFraction, 0.5);
});

test('custom pigment, a dye and unknown presets', () => {
  assert.match(toHex(hairColor({ eumelanin: 0.3, pheomelanin: 0.3 }).fibreSrgb), /^#[0-9a-f]{6}$/);
  assert.deepEqual(hairColor({ preset: 'brown', dye: [0.1, 0.2, 0.9] }).fibre, [0.1, 0.2, 0.9]);
  assert.throws(() => hairColor({ preset: 'purple' }), RangeError);
  assert.equal(Object.keys(HAIR_PRESETS).length, 8);
});
