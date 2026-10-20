import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { isolatedFixture } from './fixture.mjs';
import { createSQLiteBackup, localDatabaseFile } from '../../../server/domains/sqliteBackup.js';

test('backup includes committed WAL records, verifies a fresh restore and preserves live owner storage', async t => {
  const { directory, url } = await isolatedFixture(t);
  const source = path.join(directory, 'test.db');
  const writer = createClient({ url });
  try {
    await writer.execute('PRAGMA journal_mode=WAL');
    await writer.execute('PRAGMA wal_autocheckpoint=0');
    await writer.execute("INSERT INTO \"Transaction\" (id, userId, amount, note) VALUES ('wal-record', 'owner-a', 42, 'Committed WAL text')");
    const result = await createSQLiteBackup({ source, directory: path.join(directory, 'backups') });
    assert.equal(result.manifest.restoreVerified, true);
    assert.equal(result.manifest.counts.Transaction, 1);
    assert.equal(result.manifest.sha256.length, 64);
    assert.equal(result.manifest.encrypted, false);
    assert.notEqual(result.backup, source);
    const restored = createClient({ url: `file:${result.restored.replaceAll('\\', '/')}` });
    try { assert.equal((await restored.execute('SELECT note FROM "Transaction"')).rows[0].note, 'Committed WAL text'); }
    finally { restored.close(); }
    assert.equal((await writer.execute('SELECT count(*) AS count FROM "Transaction"')).rows[0].count, 1);
    assert.equal((await fs.stat(result.manifestPath)).isFile(), true);
  } finally { writer.close(); }
});

test('backup does not create an empty source or replace an existing backup', async t => {
  const { directory } = await isolatedFixture(t);
  const missing = path.join(directory, 'missing.db');
  await assert.rejects(createSQLiteBackup({ source: missing, directory: path.join(directory, 'backups') }), { code: 'ENOENT' });
  await assert.rejects(fs.stat(missing), { code: 'ENOENT' });
  const source = path.join(directory, 'test.db');
  const first = await createSQLiteBackup({ source, directory: path.join(directory, 'backups') });
  const second = await createSQLiteBackup({ source, directory: path.join(directory, 'backups') });
  assert.notEqual(first.backup, second.backup);
  assert.equal(first.manifest.sha256, second.manifest.sha256);
});

test('backup configuration matches server-relative paths and rejects remote URLs', () => {
  assert.equal(localDatabaseFile('D:/project', {}), path.resolve('D:/project/dev.db'));
  assert.equal(localDatabaseFile('D:/project', { DATABASE_URL: 'file:./private.db' }), path.resolve('D:/project/private.db'));
  assert.throws(() => localDatabaseFile('D:/project', { DATABASE_URL: 'https://remote.example' }), /local SQLite/);
  assert.throws(() => localDatabaseFile('D:/project', { DATABASE_URL: 'file://remote/share.db' }), /local SQLite/);
});
