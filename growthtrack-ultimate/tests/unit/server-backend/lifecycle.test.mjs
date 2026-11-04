import test from 'node:test';
import assert from 'node:assert/strict';
import { createServerCloser } from '../../../server/lifecycle.js';

test('server shutdown stops timers, drains HTTP and backups, and disconnects once', async () => {
  const calls = [];
  let finishRequests, finishBackup;
  const close = createServerCloser({
    server: { close(done) { calls.push('http'); finishRequests = done; } },
    stopScheduling() { calls.push('timers'); },
    stopBackups() { calls.push('backups'); return new Promise(resolve => { finishBackup = resolve; }); },
    async disconnect() { calls.push('disconnect'); },
  });
  const first = close(); assert.equal(close(), first); await Promise.resolve();
  assert.deepEqual(calls, ['timers', 'http', 'backups']);
  finishRequests(); await Promise.resolve(); assert.ok(!calls.includes('disconnect'));
  finishBackup(); await first;
  assert.deepEqual(calls, ['timers', 'http', 'backups', 'disconnect']);
  await close(); assert.equal(calls.filter(value => value === 'disconnect').length, 1);
});
