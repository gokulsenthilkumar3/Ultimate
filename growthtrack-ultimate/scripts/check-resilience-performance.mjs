import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const label = process.argv.find(arg => arg.startsWith('--report='))?.split('=')[1];
assert(label && /^[\w-]+$/.test(label), 'A safe report label is required');
assert(process.argv.includes('--slow') !== process.argv.includes('--soak'), 'Choose exactly one budget profile');
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length);
const report = JSON.parse(await readFile(output ? path.resolve(output, `${label}.json`) : new URL(`../../.gstack/benchmark-reports/${label}.json`, import.meta.url)));
assert(report.pages.length > 0);
for (const page of report.pages) {
  assert.deepEqual(page.failures, [], `${page.id}: browser failures`);
  assert(page.samples.length > 0);
  for (const sample of page.samples) {
    assert(sample.interactions.length > 0, `${page.id}: no interactions measured`);
    assert(sample.interactions.every(item => item.passed), `${page.id}: interaction failed`);
    if (process.argv.includes('--slow')) {
      assert(sample.browserConfig.network === '4g' && sample.browserConfig.cpuThrottle === 4);
      assert(Number.isFinite(sample.lcp) && sample.lcp > 0 && sample.lcp < 15000, `${page.id}: slow LCP exceeds 15s`);
      assert(sample.cls < 0.25, `${page.id}: excessive layout shift`);
      assert(sample.blocking < 3000, `${page.id}: blocking exceeds 3s`);
      for (const event of sample.measuredInputEvents) assert(event.duration < 1000, `${page.id}: interaction exceeds 1s`);
    }
    if (process.argv.includes('--soak')) {
      const samples = sample.memorySoak;
      assert(samples.length >= 10 && samples.at(-1).elapsedMs >= 540000, 'Missing endurance samples');
      const start = samples[2], end = samples.at(-1);
      assert(Number.isFinite(end.heapBytes) && end.heapBytes < 256 * 1024 * 1024, 'Heap exceeds 256MiB');
      assert(end.heapBytes - start.heapBytes < 64 * 1024 * 1024, 'Heap growth exceeds 64MiB');
      assert(end.nodes - start.nodes < 3000, 'DOM growth exceeds 3000 nodes');
      assert(end.jsEventListeners - start.jsEventListeners < 500, 'Listener growth exceeds 500');
    }
  }
}
console.log(`Resilience budgets passed: ${label}. Synthetic fixture only; not field performance.`);
