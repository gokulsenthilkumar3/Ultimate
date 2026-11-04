import fs from 'node:fs';
import path from 'node:path';
import { createLayaAdvisor } from '../../server/agents/jev.js';

// Synthetic input only. First use may download the pinned server's model checkpoint.
const warmup = process.argv.includes('--warmup');
const signal = AbortSignal.timeout(warmup ? 300000 : 10000);
const advisor = createLayaAdvisor({ enabled: true, baseUrl: 'http://127.0.0.1:8011' });
const started = performance.now();
let result;
try {
  result = await advisor.decide('I want to record my sleep duration and review sleep history.', signal, 'sleep');
} catch (error) {
  result = { status: 'failed', code: signal.aborted ? 'deadline_exceeded' : error.code || 'unavailable' };
  process.exitCode = 1;
}
const report = { measuredAt: new Date().toISOString(), fixture: 'Synthetic sleep-navigation request; no owner records', warmup, deadlineMs: warmup ? 300000 : 10000, elapsedMs: Math.round(performance.now() - started), ...result, qualityVerified: false };
const destination = path.resolve(import.meta.dirname, '../../../.tmp/laya-inference-smoke.json');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
