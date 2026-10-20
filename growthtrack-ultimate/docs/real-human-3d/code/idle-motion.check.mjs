import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdle } from './idle-motion.mjs';

test('the same seed gives the same person, a different seed a different one', () => {
  const a = createIdle(5); const b = createIdle(5); const c = createIdle(6);
  for (const t of [0.3, 4.1, 17.9, 60]) assert.deepEqual(a.sample(t), b.sample(t));
  assert.notDeepEqual(a.blinkTimes(60), c.blinkTimes(60));
});

test('the answer does not depend on the order or rate of asking', () => {
  const a = createIdle(9); const b = createIdle(9);
  const late = a.sample(120);                                // asked first
  for (let t = 0; t < 120; t += 1 / 60) b.sample(t);         // asked frame by frame
  assert.deepEqual(late, b.sample(120));
});

test('blink rate is human: 12 to 24 a minute, and each blink fully closes then fully opens', () => {
  const idle = createIdle(3); const minutes = 10;
  const rate = idle.blinkTimes(minutes * 60).length / minutes;
  assert.ok(rate > 12 && rate < 24, `${rate.toFixed(1)} blinks a minute`);
  let max = 0; let min = 1;
  for (let t = 0; t < 120; t += 0.005) { const v = idle.sample(t).blink; max = Math.max(max, v); min = Math.min(min, v); assert.ok(v >= 0 && v <= 1); }
  assert.equal(max, 1); assert.equal(min, 0);
});

test('a blink closes faster than it opens', () => {
  const idle = createIdle(3); const start = idle.blinkTimes(30)[0];
  const at = (dt) => idle.sample(start + dt).blink;
  assert.ok(at(0.04) > 1 - at(0.11 + 0.04), 'closing is further along at 40 ms than opening is at 150 ms');
});

test('breathing is 12 to 16 a minute with a shorter inhale', () => {
  const idle = createIdle(2); let peaks = 0; let prev = idle.sample(0).breath; let rising = false; let up = 0; let down = 0;
  for (let t = 0.01; t < 120; t += 0.01) { const v = idle.sample(t).breath; if (v > prev) { up += 0.01; if (!rising) rising = true; } else if (v < prev) { down += 0.01; if (rising) { peaks += 1; rising = false; } } prev = v; }
  const perMin = peaks / 2;
  assert.ok(perMin >= 12 && perMin <= 16, `${perMin} breaths a minute`);
  assert.ok(up < down, 'inhale is shorter than exhale');
});

test('gaze stays within a degree or two of rest and moves in jumps', () => {
  const idle = createIdle(4); let maxYaw = 0; let jumps = 0; let last = idle.sample(0).gaze.yaw;
  for (let t = 0; t < 60; t += 0.005) { const g = idle.sample(t).gaze; maxYaw = Math.max(maxYaw, Math.abs(g.yaw)); if (Math.abs(g.yaw - last) > 0.002) jumps += 1; last = g.yaw; }
  assert.ok(maxYaw < 0.03 && maxYaw > 0.005, `${(maxYaw * 180 / Math.PI).toFixed(2)} degrees`);
  assert.ok(jumps > 20);
});
