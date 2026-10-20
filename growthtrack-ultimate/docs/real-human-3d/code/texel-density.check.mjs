import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_LIMIT, closestDistance, magnification, minDistanceForTexelDensity, screenPxPerCm, texelsPerCmNeeded } from './texel-density.mjs';
import { tileDensity } from './anatomy-spec.mjs';

const camera = { fovDeg: 30, viewportHeightPx: 580, dpr: 1 };

test('doubling the distance halves the pixels per centimetre', () => {
  const near = screenPxPerCm({ ...camera, distanceM: 0.5 });
  const far = screenPxPerCm({ ...camera, distanceM: 1 });
  assert.ok(Math.abs(near / far - 2) < 1e-9);
});

test('minDistance and magnification agree', () => {
  const texelsPerCm = 23;
  const d = minDistanceForTexelDensity({ texelsPerCm, ...camera });
  assert.ok(Math.abs(magnification({ texelsPerCm, distanceM: d, ...camera }) - 1.25) < 1e-9);
  assert.ok(magnification({ texelsPerCm, distanceM: d * 0.9, ...camera }) > 1.25);
});

test('texelsPerCmNeeded inverts minDistance', () => {
  const need = texelsPerCmNeeded({ distanceM: 0.2, ...camera });
  const d = minDistanceForTexelDensity({ texelsPerCm: need, ...camera });
  assert.ok(Math.abs(d - 0.2) < 1e-9);
});

test('rejects a non-positive distance', () => {
  assert.throws(() => screenPxPerCm({ distanceM: 0, ...camera }), RangeError);
});

// The measured state of the shipped model (docs/real-human-3d/data/glb-audit.humanoid-base.md), at the closest
// distances the live viewer allows (docs/real-human-3d/01-findings.md): head 0.337 m, hand 0.363 m, 580 px canvas, dpr 1.
test('today the head is stretched 1.4x and the hand 2.9x at maximum zoom', () => {
  const head = magnification({ texelsPerCm: 23, distanceM: 0.337, ...camera });
  const hand = magnification({ texelsPerCm: 10.3, distanceM: 0.363, ...camera });
  assert.ok(head > 1.35 && head < 1.5, `head ${head}`);
  assert.ok(hand > 2.8 && hand < 3.0, `hand ${hand}`);
});

test('the detail ladder lets the planned tiles get much closer than today\'s texture does', () => {
  const view = { fovDeg: 30, viewportHeightPx: 900, dpr: 2 };
  const micro = tileDensity('MICRO');
  const today = closestDistance({ baseTexelsPerCm: 10.3, ...view });                                // the shipped hand, no micro layer
  const planned = closestDistance({ baseTexelsPerCm: tileDensity('HANDS'), microTexelsPerCm: micro, ...view });
  assert.ok(planned < today / 3, `planned ${planned.toFixed(2)} m vs today ${today.toFixed(2)} m`);
  assert.ok(planned < 0.4, `a hand can be viewed from ${planned.toFixed(2)} m`);
  assert.ok(BASE_LIMIT > 1.25);
});

test('nails can be approached closer than skin, because their atlas is denser', () => {
  const view = { fovDeg: 30, viewportHeightPx: 900, dpr: 2 };
  assert.ok(closestDistance({ baseTexelsPerCm: tileDensity('NAILS'), ...view }) < closestDistance({ baseTexelsPerCm: tileDensity('HANDS'), ...view }));
});
