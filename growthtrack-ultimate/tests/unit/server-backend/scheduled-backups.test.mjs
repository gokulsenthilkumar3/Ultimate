import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createEncryptedSQLiteBackup, restoreEncryptedSQLiteBackup, createBackupScheduler } from '../../../server/domains/scheduledBackups.js';
import { loadServerConfig } from '../../../server/config.js';
import { isolatedFixture } from './fixture.mjs';

const KEY = 'a'.repeat(64);
test('encrypted backups restore committed SQLite data, reject tampering and never replace existing files', async t => {
  const { directory, prisma } = await isolatedFixture(t);
  const note = 'PRIVATE FIXTURE: encrypted archive must not contain this';
  await prisma.transaction.create({ data: { id: 'private-fixture', userId: 'owner-a', note, amount: 42 } });
  const source = path.join(directory, 'test.db');
  const result = await createEncryptedSQLiteBackup({ source, directory: path.join(directory, 'encrypted'), keyHex: KEY });
  assert.equal(result.manifest.encrypted, true); assert.equal(result.manifest.restoreVerified, true);
  const bytes = await fs.readFile(result.backup);
  assert.equal(bytes.includes(Buffer.from(note)), false);
  assert.equal((await fs.readdir(path.dirname(result.backup))).some(file => file.endsWith('.db')), false);
  const destination = path.join(directory, 'recovered.db');
  await restoreEncryptedSQLiteBackup({ backup: result.backup, destination, keyHex: KEY });
  const restored = new DatabaseSync(destination);
  try { assert.equal(restored.prepare('SELECT note FROM "Transaction"').get().note, note); }
  finally { restored.close(); }
  await assert.rejects(restoreEncryptedSQLiteBackup({ backup: result.backup, destination, keyHex: KEY }), { code: 'EEXIST' });
  assert.equal((await fs.stat(destination)).isFile(), true);
  const wrongKeyTarget = path.join(directory, 'wrong-key.db');
  await assert.rejects(restoreEncryptedSQLiteBackup({ backup: result.backup, destination: wrongKeyTarget, keyHex: 'b'.repeat(64) }));
  await assert.rejects(fs.stat(wrongKeyTarget), { code: 'ENOENT' });
  bytes[30] ^= 1; await fs.writeFile(result.backup, bytes);
  await assert.rejects(restoreEncryptedSQLiteBackup({ backup: result.backup, destination: wrongKeyTarget, keyHex: KEY }));
  assert.equal(await prisma.transaction.count(), 1);
});

test('backup scheduler avoids overlap, reports failures, retries and drains on shutdown', async () => {
  let clock = 0, finish, runs = 0, fail = false;
  const jobs = new Map(); let id = 0;
  const timers = { setTimeout(fn) { jobs.set(++id, fn); return id; }, clearTimeout(key) { jobs.delete(key); } };
  const errors = [];
  const scheduler = createBackupScheduler({ enabled: true, intervalMs: 1000, firstRunMs: 10, now: () => clock, timers,
    backup: () => { runs += 1; return fail ? Promise.reject(new Error('private SQL/path')) : new Promise(resolve => { finish = resolve; }); }, onError: error => errors.push(error) });
  assert.equal(scheduler.status().nextRunAt, new Date(10).toISOString());
  const first = scheduler.run(); await Promise.resolve();
  assert.equal(scheduler.run(), first); assert.equal(runs, 1); assert.equal(scheduler.status().status, 'running');
  clock = 50; finish(); await first;
  assert.equal(scheduler.status().lastSuccessAt, new Date(50).toISOString());
  fail = true; await scheduler.run();
  assert.equal(scheduler.status().status, 'error'); assert.equal(errors.length, 1);
  assert.equal(JSON.stringify(scheduler.status()).includes('private'), false);
  fail = false; const pending = scheduler.run(); await Promise.resolve();
  let stopped = false; const stopping = scheduler.stop().then(() => { stopped = true; });
  await Promise.resolve(); assert.equal(stopped, false);
  finish(); await pending; await stopping;
  assert.equal(jobs.size, 0); assert.equal(scheduler.status().nextRunAt, null);
});

test('scheduled backups are opt-in and fail closed without an encryption key', () => {
  assert.equal(loadServerConfig({}).backup.enabled, false);
  assert.throws(() => loadServerConfig({ BACKUP_ENABLED: 'on' }), /APP_ENCRYPTION_KEY/);
  assert.equal(loadServerConfig({ BACKUP_ENABLED: 'on', APP_ENCRYPTION_KEY: KEY }).backup.intervalMs, 86_400_000);
  assert.throws(() => loadServerConfig({ BACKUP_INTERVAL_HOURS: '0' }), /BACKUP_INTERVAL_HOURS/);
});
