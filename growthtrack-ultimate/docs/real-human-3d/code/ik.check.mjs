import test from 'node:test';
import assert from 'node:assert/strict';
import { dist, footLock, solveFabrik, solveTwoBone } from './ik.mjs';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32); }

// A real arm from the audited GLB (docs/real-human-3d/data/glb-audit.humanoid-base.md): shoulder (18.6, 56.1, 1.8) cm,
// elbow (35.2, 37.1, 1.6), wrist (48.7, 24.2, 20.8).
const shoulder = [0.186, 0.561, 0.018]; const elbow = [0.352, 0.371, 0.016]; const wrist = [0.487, 0.242, 0.208];
const l1 = dist(shoulder, elbow); const l2 = dist(elbow, wrist);

test('the wrist reaches any reachable target and the bones keep their length', () => {
  const rand = rng(11);
  for (let i = 0; i < 2000; i += 1) {
    const t = [shoulder[0] + (rand() - 0.5) * 0.9, shoulder[1] + (rand() - 0.5) * 0.9, shoulder[2] + (rand() - 0.5) * 0.9];
    const r = solveTwoBone({ root: shoulder, l1, l2, target: t, pole: [0.3, 0.3, -0.5] });
    near(dist(shoulder, r.mid), l1); near(dist(r.mid, r.end), l2);
    if (r.reached) assert.ok(dist(r.end, t) < 1e-6, `miss ${dist(r.end, t)}`);
  }
});

test('an out-of-range target straightens the arm toward it', () => {
  const t = [shoulder[0] + 2, shoulder[1], shoulder[2]];
  const r = solveTwoBone({ root: shoulder, l1, l2, target: t, pole: [0, 0, -1] });
  assert.equal(r.reached, false); assert.ok(r.stretch > 1);
  near(dist(shoulder, r.end), l1 + l2, 1e-3);
  assert.ok(r.end[0] > shoulder[0] && Math.abs(r.end[1] - shoulder[1]) < 1e-3);
});

test('the elbow bends toward the pole', () => {
  const t = [shoulder[0] + 0.25, shoulder[1] - 0.2, shoulder[2]];
  const back = solveTwoBone({ root: shoulder, l1, l2, target: t, pole: [shoulder[0], shoulder[1], -1] });
  const front = solveTwoBone({ root: shoulder, l1, l2, target: t, pole: [shoulder[0], shoulder[1], 1] });
  assert.ok(back.mid[2] < 0 && front.mid[2] > 0);
});

test('a target at the shoulder cannot fold the arm past its flexion limit', () => {
  const r = solveTwoBone({ root: shoulder, l1, l2, target: shoulder, pole: [0, 0, -1], maxFlexRad: 2.5 });
  const a = [shoulder[0] - r.mid[0], shoulder[1] - r.mid[1], shoulder[2] - r.mid[2]];
  const b = [r.end[0] - r.mid[0], r.end[1] - r.mid[1], r.end[2] - r.mid[2]];
  const interior = Math.acos((a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b)));
  assert.ok(interior >= Math.PI - 2.5 - 1e-6, `interior ${interior}`);
});

test('FABRIK reaches the target with the root pinned, and keeps bone lengths', () => {
  const chain = [[0, 0, 0], [0, 0.15, 0], [0, 0.3, 0.02], [0, 0.45, 0.02], [0, 0.6, 0]];
  const lengths = chain.slice(1).map((p, i) => dist(p, chain[i]));
  const out = solveFabrik(chain, [0.2, 0.35, 0.1]);
  assert.ok(dist(out[4], [0.2, 0.35, 0.1]) < 1e-3);
  assert.deepEqual(out[0], [0, 0, 0]);
  out.slice(1).forEach((p, i) => near(dist(p, out[i]), lengths[i], 1e-9));
});

test('FABRIK straightens toward an unreachable target', () => {
  const chain = [[0, 0, 0], [0, 0.2, 0], [0, 0.4, 0]];
  const out = solveFabrik(chain, [5, 0, 0]);
  near(out[2][0], 0.4, 1e-9); near(out[2][1], 0, 1e-9);
});

test('foot lock holds until the leg would overstretch', () => {
  assert.equal(footLock([0, 0, 0], [0, 0.8, 0], 0.9), true);
  assert.equal(footLock([0, 0, 0], [0, 0.95, 0], 0.9), false);
});
