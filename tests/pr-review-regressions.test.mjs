// Executes the historical preview's actual handlers in isolated synthetic hosts.
// These are logic regressions, not rendered browser coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const page = fs.readFileSync(new URL('../growthtrack-ultimate/docs/3d-plans/plan-assets/plan-page.js', import.meta.url), 'utf8');
const stage = fs.readFileSync(new URL('../growthtrack-ultimate/docs/3d-plans/plan-assets/src/human-stage.mjs', import.meta.url), 'utf8');
const noop = () => {};

for (const [date, expectedWaist] of [['2026-02-01', 82], ['2026-02-15', 82], ['2025-12-01', undefined]]) {
  test(`check-in ${date} preserves its own or preceding metrics without copying future values`, () => {
    const state = { checkins: [
      { date: '2026-01-01', m: { weight: 80, waist: 85 } },
      { date: '2026-02-01', m: { weight: 78, waist: 82 } },
      { date: '2026-03-01', m: { weight: 75, waist: 79 } },
    ], now: {} };
    const inputs = { 'ci-date': { value: date }, 'ci-weight': { value: '77' }, 'ci-waist': { value: '' }, 'ci-msg': {} };
    const context = { state, $: selector => inputs[selector.slice(1)], TODAY: '2026-03-01', parseNum: value => value === '' ? null : Number(value),
      fromDisplay: (_type, value) => value, histPos: null, renderHistory: noop, showCheckin: noop, applyGhost: noop, renderBlueprint: noop };
    const handler = page.slice(page.indexOf('  function saveCheckin()'), page.indexOf('  /* ------------------------------------------------------------ render glue */'));
    vm.runInNewContext(handler + '\nsaveCheckin();', context);
    const saved = state.checkins.find(row => row.date === date);
    assert.equal(saved.m.weight, 77);
    assert.equal(saved.m.waist, expectedWaist);
    assert.equal(state.checkins.at(-1).m.waist, 79);
  });
}

test('imperial input validates converted centimetres and kilograms', () => {
  const validate = page.match(/    const validate = value => .*?;\r?\n/)[0];
  const apply = page.match(/      const apply = display => .*?;\r?\n/)[0];
  for (const [display, factor, range] of [[33, 2.54, [55, 140]], [170, 1 / 2.2046226218, [35, 160]]]) {
    const warn = { textContent: '' }, saved = [];
    vm.runInNewContext(validate + apply + `\napply(${display});`, {
      warn, m: { range, type: 'length' }, t: 'length', fromDisplay: (_type, value) => value * factor,
      show: (_type, value) => String(value), sourceSel: { value: 'Measured' },
      commit: (_metric, value) => saved.push(value), renderReadout: noop,
    });
    assert.equal(warn.textContent, '');
    assert.equal(saved[0], display * factor);
  }
});

test('split and normal viewports stay in CSS pixels at DPR 2', () => {
  const calls = [], figures = { primary: { group: {}, eyeMeshes: [] }, secondary: { group: {}, eyeMeshes: [] } };
  const compare = { mode: 'split', split: 0.5 };
  const context = { canvas: { width: 1600, height: 1200 }, compare, figures, camera: { updateMatrixWorld: noop },
    scene: {}, updateHairUniforms: noop, aimEyes: noop, Vector2: class {}, renderer: {
      getSize: target => Object.assign(target, { x: 800, y: 600 }),
      setViewport: (...args) => calls.push(['viewport', ...args]), setScissor: (...args) => calls.push(['scissor', ...args]),
      setScissorTest: noop, render: noop,
    } };
  const handler = stage.slice(stage.indexOf('  function renderScene()'), stage.indexOf('  function frame(now)'));
  vm.runInNewContext(handler + '\nrenderScene();', context);
  assert.deepEqual(calls, [['viewport', 0, 0, 800, 600], ['scissor', 0, 0, 400, 600], ['scissor', 400, 0, 400, 600]]);
  compare.mode = 'ghost'; calls.length = 0;
  vm.runInNewContext('renderScene();', context);
  assert.deepEqual(calls, [['viewport', 0, 0, 800, 600]]);
});

test('history charts omit unknown measurements and preserve check-in selection indices', () => {
  const elements = [], host = { innerHTML: '', append: noop };
  const selected = [];
  const context = { state: { chartKey: 'waist', checkIndex: 1, checkins: [{ date: 'first', m: {} }, { date: 'second', m: { waist: 82 } }] },
    histType: () => 'length', toDisplay: (_type, value) => value, $: () => host,
    M_BY_ID: { waist: { label: 'Waist' } }, trim: value => String(value), unitName: () => 'cm', fmtDate: value => value,
    gotoCheckin: index => selected.push(index), document: { createElementNS: (_ns, tag) => {
      const element = { tag, attrs: {}, events: {}, setAttribute(key, value) { this.attrs[key] = value; }, append: noop,
        addEventListener(name, callback) { this.events[name] = callback; } };
      elements.push(element); return element;
    } } };
  const handler = page.slice(page.indexOf('  function renderChart()'), page.indexOf('  function applyGhost()'));
  vm.runInNewContext(handler + '\nrenderChart();', context);
  const circles = elements.filter(element => element.tag === 'circle');
  assert.equal(circles.length, 1);
  assert.equal(circles[0].attrs.class, 'pt on');
  assert.doesNotMatch(JSON.stringify(elements.map(element => element.attrs)), /NaN|undefined/);
  circles[0].events.click(); assert.deepEqual(selected, [1]);
  context.state.checkins = [{ date: 'first', m: {} }];
  vm.runInNewContext('renderChart();', context);
  assert.equal(host.textContent, 'No measurements recorded for this metric.');
});
