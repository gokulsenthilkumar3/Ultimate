import test from 'node:test';
import assert from 'node:assert/strict';
import { cmToIn, formatLength, parseLength, parseMass, progressToward, rangeGauge, rangeStatus, stepFor } from './metric-entry.mjs';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

test('lengths: plain numbers, decimal commas, units, feet and inches', () => {
  near(parseLength('98.5').value, 98.5); near(parseLength('98,5').value, 98.5); near(parseLength(' 98.5 cm ').value, 98.5);
  near(parseLength('985 mm').value, 98.5); near(parseLength('1.75 m').value, 175);
  near(parseLength('39 in').value, 99.06); near(parseLength('39"', 'cm').value, 99.06); near(parseLength('39', 'in').value, 99.06);
  near(parseLength("5'10").value, 177.8); near(parseLength('5 ft 10 in').value, 177.8); near(parseLength("5′10″").value, 177.8); near(parseLength('6ft').value, 182.88);
});

test('lengths: rubbish gets a helpful hint, not a crash', () => {
  for (const bad of ['', 'abc', '12 13 14', '-5', "5'13"]) { const r = parseLength(bad); assert.equal(r.ok, false, bad); assert.ok(r.hint.length > 5); }
});

test('mass: kg, lb, stones and pounds', () => {
  near(parseMass('74.5').value, 74.5); near(parseMass('74,5 kg').value, 74.5); near(parseMass('163 lb').value, 73.94); near(parseMass('163lbs').value, 73.94);
  near(parseMass('163', 'lb').value, 73.94); near(parseMass('11 st 9').value, 73.94); near(parseMass('11 st').value, 69.85); near(parseMass('74000 g').value, 74);
  assert.equal(parseMass('heavy').ok, false);
});

test('formatting round-trips what people entered', () => {
  assert.equal(formatLength(98.5, 'cm'), '98.5 cm');
  assert.equal(formatLength(177.8, 'in'), '70 in');
  assert.equal(formatLength(177.8, 'ft'), '5′10″');
  near(cmToIn(parseLength('39 in').value), 39);
});

test('range feedback blocks only the impossible and asks about the unusual', () => {
  const opts = { hard: [40, 250], typical: [65, 110], unit: 'cm' };
  assert.equal(rangeStatus(82, opts).level, 'ok');
  assert.equal(rangeStatus(130, opts).level, 'check');
  assert.match(rangeStatus(130, opts).message, /Above the usual range \(65 to 110 cm\)/);
  assert.equal(rangeStatus(30, opts).level, 'invalid');
  assert.equal(rangeStatus(NaN, opts).level, 'invalid');
});

test('the gauge always places the marker on the bar and names the zone', () => {
  const g = rangeGauge(82, [65, 110]); assert.equal(g.zone, 'within'); assert.ok(g.position > g.bandStart && g.position < g.bandEnd);
  assert.equal(rangeGauge(300, [65, 110]).position, 1); assert.equal(rangeGauge(300, [65, 110]).zone, 'above');
  assert.equal(rangeGauge(10, [65, 110]).position, 0); assert.equal(rangeGauge(60, [65, 110]).zone, 'below');
});

test('progress matches the app formula for goals that go down and up', () => {
  const appFormula = ({ baseline, current, goal }) => { const span = goal - baseline; const p = Math.abs(span) < 0.0001 ? (Math.abs(current - goal) < 0.0001 ? 100 : 0) : ((current - baseline) / span) * 100; return Math.max(0, Math.min(100, p)); };
  for (const c of [{ baseline: 92, current: 88, goal: 82 }, { baseline: 90, current: 95, goal: 100 }, { baseline: 90, current: 93, goal: 82 }, { baseline: 90, current: 90, goal: 90 }, { baseline: 90, current: 70, goal: 82 }]) {
    near(progressToward(c).percent, appFormula(c), 0.5);
  }
});

test('the label says how far there is to go, in words, and flags the wrong direction', () => {
  assert.equal(progressToward({ baseline: 92, current: 88, goal: 82 }).label, '40% there · 6 cm to go');
  assert.equal(progressToward({ baseline: 92, current: 82, goal: 82 }).label, 'Goal reached');
  const wrong = progressToward({ baseline: 92, current: 94, goal: 82 }); assert.equal(wrong.wrongWay, true); assert.match(wrong.label, /moving away/);
  assert.equal(progressToward({ baseline: 92, current: 88 }).percent, null);
  assert.equal(progressToward({ baseline: 92, current: 88, goal: 82 }).direction, 'down');
});

test('steps are small by default and ten times larger with Shift', () => {
  assert.equal(stepFor('cm'), 0.5); assert.equal(stepFor('cm', true), 5); assert.equal(stepFor('kg'), 0.1); assert.equal(stepFor('unknown'), 1);
});
