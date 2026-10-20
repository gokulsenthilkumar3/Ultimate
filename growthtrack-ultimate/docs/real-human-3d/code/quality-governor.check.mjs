import test from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, TIER_ORDER, createGovernor, observe, tierLabel } from './quality-governor.mjs';

function run(state, frameMs, frames, startMs = 0, stepMs = frameMs) {
  const changes = []; let t = startMs;
  for (let i = 0; i < frames; i += 1) { const r = observe(state, frameMs, t); state = r.state; if (r.change) changes.push({ ...r.change, at: t }); t += stepMs; }
  return { state, changes, t };
}

test('the tiers differ in every setting that costs frame time', () => {
  for (const key of ['dprCap', 'msaa', 'shadowMap', 'hairStrands', 'anisotropy']) {
    const values = TIER_ORDER.map(tier => TIERS[tier][key]);
    assert.ok(values[0] < values[1] && values[1] < values[2], `${key}: ${values}`);
  }
});

test('a sustained slow window steps down, and only one tier at a time', () => {
  const { state, changes } = run(createGovernor('AUTO', 'HIGH'), 30, 400);
  assert.equal(changes[0].from, 'HIGH'); assert.equal(changes[0].to, 'BALANCED');
  assert.equal(state.tier, 'LOW');                                           // 30 ms stays over budget, so it keeps stepping down
  assert.equal(run(createGovernor('AUTO', 'LOW'), 30, 400).state.tier, 'LOW');   // and stops at the bottom
});

test('isolated spikes and stalled frames do not change the tier', () => {
  let state = createGovernor('AUTO', 'HIGH'); let t = 0;
  for (let i = 0; i < 600; i += 1) { const ms = i % 40 === 0 ? 60 : 9; const r = observe(state, ms, t); state = r.state; assert.equal(r.change, undefined); t += 9; }
  assert.equal(observe(state, 5000, t).state.tier, 'HIGH');
});

test('it steps up only after repeated calm windows and the cooldown', () => {
  const start = createGovernor('AUTO', 'LOW');
  const early = run(start, 6, 300);                                          // calm, but too soon after the start
  assert.equal(early.state.tier, 'LOW');
  const later = run(early.state, 6, 400, 20000);
  assert.equal(later.changes[0]?.to, 'BALANCED');
});

test('a step up that fails is not retried straight away', () => {
  let r = run(createGovernor('AUTO', 'LOW'), 6, 600, 20000);                 // goes up to BALANCED
  assert.equal(r.state.tier, 'BALANCED');
  r = run(r.state, 40, 200, r.t);                                            // the heavier tier is too slow: back down
  assert.equal(r.state.tier, 'LOW');
  const retry = run(r.state, 6, 800, r.t + 11000);                           // calm again, but inside the penalty period
  assert.equal(retry.changes.length, 0);
  const much = run(retry.state, 6, 800, r.t + 130000);
  assert.equal(much.changes[0]?.to, 'BALANCED');
});

test('a tier the user chose is never overridden', () => {
  const { state, changes } = run(createGovernor('HIGH'), 80, 800);
  assert.equal(state.tier, 'HIGH'); assert.equal(changes.length, 0);
});

test('labels', () => {
  assert.equal(tierLabel(createGovernor('AUTO', 'HIGH')), 'Automatic (High)');
  assert.equal(tierLabel(createGovernor('LOW')), 'Low');
});
