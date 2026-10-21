import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';
import { isolatedFixture } from './fixture.mjs';
import { initializeDatabase } from '../../../server/domains/databaseInitialization.js';
import { inspectDesktopDatabase } from '../../../server/domains/desktopDatabase.js';
import { provisionLocalOwner, validateOwnerSetup } from '../../../server/domains/ownerProvisioning.js';

const userSchema = 'CREATE TABLE "User" (id TEXT PRIMARY KEY, email TEXT UNIQUE, fullName TEXT, passwordHash TEXT, subscriptionTier TEXT, referralCode TEXT UNIQUE, createdAt DATETIME, updatedAt DATETIME);';
const noteSchema = 'CREATE TABLE "Note" (id TEXT PRIMARY KEY, userId TEXT, title TEXT, content TEXT, data TEXT, updatedAt DATETIME);';
const owner = { email: ' OWNER@example.invalid ', fullName: ' Private Owner ', password: 'a-long-private-password' };

test('desktop inspection never creates missing storage and preserves invalid or partial schemas', async t => {
  const { directory } = await isolatedFixture(t);
  const missing = path.join(directory, 'missing.db');
  assert.deepEqual(await inspectDesktopDatabase(missing), { phase: 'new', ownerRequired: true });
  await assert.rejects(fs.stat(missing), { code: 'ENOENT' });
  const target = path.join(directory, 'desktop.db');
  await initializeDatabase({ filename: target, schema: userSchema + noteSchema });
  assert.deepEqual(await inspectDesktopDatabase(target), { phase: 'notes-upgrade', ownerRequired: true, recordRows: false });
  const client = createClient({ url: `file:${target.replaceAll('\\', '/')}` });
  await client.execute('ALTER TABLE "Note" ADD COLUMN revision INTEGER');
  client.close();
  const before = await fs.readFile(target);
  await assert.rejects(inspectDesktopDatabase(target), /partial Notes upgrade/);
  assert.deepEqual(await fs.readFile(target), before);
});

test('desktop record rows are enabled only when the desktop database has every record table', async t => {
  const { directory } = await isolatedFixture(t);
  const target = path.join(directory, 'rows.db');
  const partial = ['calendar_events', 'portfolio_holdings', 'record_mutations'].map(name => `CREATE TABLE "${name}" (id TEXT);`).join('');
  await initializeDatabase({ filename: target, schema: userSchema + noteSchema + partial });
  assert.equal((await inspectDesktopDatabase(target)).recordRows, false, 'a partial set keeps the legacy path');
  const client = createClient({ url: `file:${target.replaceAll('\\', '/')}` });
  await client.execute('CREATE TABLE "record_changes" (sequence INTEGER)');
  client.close();
  assert.equal((await inspectDesktopDatabase(target)).recordRows, true);
});

test('first-owner provisioning hashes credentials, normalizes identity and refuses existing accounts', async t => {
  const { directory } = await isolatedFixture(t);
  const target = path.join(directory, 'owner.db');
  await initializeDatabase({ filename: target, schema: userSchema });
  const result = await provisionLocalOwner(target, owner);
  assert.equal(result.email, 'owner@example.invalid');
  const client = createClient({ url: `file:${target.replaceAll('\\', '/')}` });
  try {
    const row = (await client.execute('SELECT * FROM "User"')).rows[0];
    assert.equal(row.fullName, 'Private Owner');
    assert.notEqual(row.passwordHash, owner.password);
    assert.equal(await bcrypt.compare(owner.password, row.passwordHash), true);
    await assert.rejects(provisionLocalOwner(target, { ...owner, email: 'second@example.invalid' }), /already has an account/);
    assert.equal((await client.execute('SELECT count(*) AS count FROM "User"')).rows[0].count, 1);
  } finally { client.close(); }
});

test('simultaneous first-owner requests create exactly one account', async t => {
  const { directory } = await isolatedFixture(t);
  const target = path.join(directory, 'concurrent.db');
  await initializeDatabase({ filename: target, schema: userSchema });
  const results = await Promise.allSettled([provisionLocalOwner(target, owner), provisionLocalOwner(target, { ...owner, email: 'other@example.invalid' })]);
  assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
  assert.equal(results.filter(value => value.status === 'rejected').length, 1);
});

test('owner passwords reject bcrypt byte truncation and malformed identity', () => {
  assert.throws(() => validateOwnerSetup({ ...owner, password: '😊'.repeat(19) }), /72 UTF-8 bytes/);
  assert.throws(() => validateOwnerSetup({ ...owner, password: 'short' }), /12 characters/);
  assert.throws(() => validateOwnerSetup({ ...owner, email: 'invalid' }), /valid email/);
});
