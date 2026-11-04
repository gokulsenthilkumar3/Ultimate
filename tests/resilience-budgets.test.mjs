import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Synthetic checker inputs only. These tests are not browser measurements.
test('performance gate rejects regressions and incomplete evidence', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'growthtrack-budget-test-'));
  const checker = new URL('../growthtrack-ultimate/scripts/check-resilience-performance.mjs', import.meta.url);
  const sample = { interactions: [{ passed: true }], browserConfig: { network: '4g', cpuThrottle: 4 }, lcp: 1000, cls: .01, blocking: 100, measuredInputEvents: [{ duration: 40 }], memorySoak: Array.from({ length: 20 }, (_, i) => ({ elapsedMs: (i + 1) * 30000, heapBytes: 1000000, nodes: 100, jsEventListeners: 10 })) };
  async function check(mode, mutate = () => {}) {
    const report = { pages: [{ id: 'overview', failures: [], samples: [structuredClone(sample)] }] };
    mutate(report);
    await writeFile(path.join(directory, 'fixture.json'), JSON.stringify(report));
    return spawnSync(process.execPath, [fileURLToPath(checker), '--report=fixture', `--output=${directory}`, mode], { encoding: 'utf8' });
  }
  for (const mode of ['--slow', '--soak']) await t.test(`${mode} accepts complete bounded evidence`, async () => assert.equal((await check(mode)).status, 0));
  for (const [name, mode, mutate] of [
    ['missing paint', '--slow', r => { r.pages[0].samples[0].lcp = null; }],
    ['slow interaction', '--slow', r => { r.pages[0].samples[0].measuredInputEvents[0].duration = 1200; }],
    ['failed browser flow', '--slow', r => { r.pages[0].failures = ['render failed']; }],
    ['missing endurance samples', '--soak', r => { r.pages[0].samples[0].memorySoak = []; }],
    ['listener growth', '--soak', r => { r.pages[0].samples[0].memorySoak.at(-1).jsEventListeners = 10000; }],
    ['heap growth', '--soak', r => { r.pages[0].samples[0].memorySoak.at(-1).heapBytes = 100000000; }],
  ]) await t.test(`rejects ${name}`, async () => assert.notEqual((await check(mode, mutate)).status, 0));
});
