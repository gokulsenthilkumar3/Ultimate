import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, autoRotate, cameraPosition, constrain, createCameraState, drag, shortestTurn, snapTo, zoom } from './viewer-camera.mjs';

// Small deterministic generator, so a failure can be replayed.
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32); }

test('the camera never goes below the floor, whatever the drags, zooms and targets', () => {
  const rand = rng(7);
  for (const mode of [MODES.ORBIT, MODES.TURNTABLE, MODES.TOP]) {
    let s = createCameraState({ target: [0, 1 + rand(), 0], distance: 2 });
    for (let i = 0; i < 4000; i += 1) {
      const options = { mode, floorY: 0, floorMargin: 0.06 };
      s = rand() < 0.2 ? zoom(s, 0.5 + rand() * 1.5, options) : drag(s, (rand() - 0.5) * 900, (rand() - 0.5) * 900, 600, options);
      if (rand() < 0.02) s = { ...s, target: [0, rand() * 2.2, 0] };           // a focus change (face, hand, foot)
      s = constrain(s, options);
      assert.ok(cameraPosition(s)[1] >= 0.06 - 1e-9 || s.polar <= 0.0201, `${mode} step ${i}: y=${cameraPosition(s)[1]}`);
    }
  }
});

test('TURNTABLE changes azimuth only, any amount, and never the height angle', () => {
  const options = { mode: MODES.TURNTABLE };
  let s = constrain(createCameraState(), options);
  const polar = s.polar;
  for (let i = 0; i < 200; i += 1) s = drag(s, 37, 91, 700, options);
  assert.equal(s.polar, polar);
});

test('a drag of one viewport height turns the camera a full circle', () => {
  const s = createCameraState({ azimuth: 1 });
  const turned = drag(s, 600, 0, 600, { mode: MODES.TURNTABLE });
  assert.ok(Math.abs(shortestTurn(s.azimuth, turned.azimuth)) < 1e-9);          // 360 degrees lands where it began
});

test('ORBIT reaches the top view; TOP is straight down', () => {
  let s = createCameraState({ polar: Math.PI / 2 });
  s = drag(s, 0, 5000, 600, { mode: MODES.ORBIT, floorY: 0 });
  assert.ok(s.polar <= 0.021);
  assert.ok(constrain(createCameraState(), { mode: MODES.TOP }).polar <= 0.021);
});

test('HANGING can look from below, with no floor', () => {
  const options = { mode: MODES.HANGING, floorY: null };
  let s = createCameraState({ polar: Math.PI / 2 });
  s = drag(s, 0, -5000, 600, options);
  assert.ok(s.polar > Math.PI - 0.03);
  assert.ok(cameraPosition(s)[1] < s.target[1]);
});

test('on a floor, BOTTOM is clamped to a level view of the sole', () => {
  const s = snapTo(createCameraState({ target: [0, 0.9, 0], distance: 3 }), 'BOTTOM', { mode: MODES.ORBIT, floorY: 0, floorMargin: 0.06 });
  assert.ok(cameraPosition(s)[1] >= 0.06 - 1e-9);
});

test('the model is never part of the camera state', () => {
  const s = drag(createCameraState(), 200, 200, 600);
  assert.deepEqual(Object.keys(s).sort(), ['azimuth', 'distance', 'polar', 'target']);
});

test('zoom is clamped and exponential', () => {
  const options = { minDistance: 0.3, maxDistance: 8 };
  assert.equal(zoom(createCameraState({ distance: 1 }), 0.001, options).distance, 0.3);
  assert.equal(zoom(createCameraState({ distance: 1 }), 1000, options).distance, 8);
  const a = zoom(zoom(createCameraState({ distance: 4 }), 0.9, options), 0.9, options);
  assert.ok(Math.abs(a.distance - 4 * 0.81) < 1e-9);
});

test('auto-rotate speed does not depend on frame rate and ignores stalled frames', () => {
  const options = { mode: MODES.TURNTABLE };
  let a = createCameraState(); let b = createCameraState();
  for (let i = 0; i < 60; i += 1) a = autoRotate(a, 1 / 60, { degPerSec: 12 }, options);
  for (let i = 0; i < 30; i += 1) b = autoRotate(b, 1 / 30, { degPerSec: 12 }, options);
  assert.ok(Math.abs(a.azimuth - b.azimuth) < 1e-9);
  const stalled = autoRotate(createCameraState(), 5, { degPerSec: 12 }, options);
  assert.ok(stalled.azimuth < 0.03);                                             // clamped to one 0.1 s step
});

test('snaps take the short way round', () => {
  assert.ok(Math.abs(shortestTurn(0.1, Math.PI * 2 - 0.1) + 0.2) < 1e-9);
});
