import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('console logs receive timestamps independently of the file transport', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ultimate-logger-'));
  const loggerUrl = new URL('../growthtrack-ultimate/logger.js', import.meta.url).href;
  const script = `const {serverLogger} = await import(${JSON.stringify(loggerUrl)});
const transport = serverLogger.transports.find(item => item.name === 'console');
const formatted = transport.format.transform({level:'info', [Symbol.for('level')]:'info', message:'timestamp-regression'}, {});
console.log(formatted[Symbol.for('message')]);
serverLogger.close();`;
  const result = spawnSync(process.execPath, ['--input-type=module'], { input: script, encoding: 'utf8', env: { ...process.env, LOG_DIR: directory } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\d{4}-\d{2}-\d{2}T[\d:.]+Z .*timestamp-regression/);
  assert.ok(!result.stdout.includes('undefined ['));
});

test('FinSync Tailwind config loads as ESM without a global require', () => {
  const configUrl = new URL('../FinSync/apps/web/tailwind.config.ts', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module'], { input: `const {default: config} = await import(${JSON.stringify(configUrl)}); if (config.plugins.length !== 1 || typeof config.plugins[0] !== 'function') throw new Error('Forms plugin missing');`, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
