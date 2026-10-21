import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { isolatedFixture } from './fixture.mjs';
import { initializeDatabase } from '../../../server/domains/databaseInitialization.js';
import { loadDeploymentSecrets } from '../../../server/deploymentSecrets.js';

test('initialization creates only new storage and refuses an existing owner database', async t => {
  const { directory } = await isolatedFixture(t);
  const existing = path.join(directory, 'test.db');
  const before = await fs.readFile(existing);
  await assert.rejects(initializeDatabase({ filename: existing, schema: 'CREATE TABLE Attempt (id TEXT);' }), { code: 'EEXIST' });
  assert.deepEqual(await fs.readFile(existing), before);
  const target = path.join(directory, 'fresh', 'new.db');
  await initializeDatabase({ filename: target, schema: 'CREATE TABLE Example (id TEXT PRIMARY KEY); INSERT INTO Example VALUES (\'new\');' });
  const client = createClient({ url: `file:${target.replaceAll('\\', '/')}` });
  try { assert.equal((await client.execute('SELECT id FROM Example')).rows[0].id, 'new'); }
  finally { client.close(); }
});

test('secret files use an allowlist and reject conflicting or empty values without exposing contents', () => {
  const environment = { HANDOFF_SECRET_FILE: '/secret/handoff', UNRELATED_FILE: '/private' };
  const reads = [];
  loadDeploymentSecrets(environment, filename => { reads.push(filename); return 'private-secret\n'; });
  assert.equal(environment.HANDOFF_SECRET, 'private-secret');
  assert.deepEqual(reads, ['/secret/handoff']);
  assert.throws(() => loadDeploymentSecrets(environment, () => 'private-secret'), /either HANDOFF_SECRET or HANDOFF_SECRET_FILE/);
  assert.throws(() => loadDeploymentSecrets({ OWNER_PASSWORD_FILE: '/empty' }, () => '\n'), /nonempty secret/);
});
