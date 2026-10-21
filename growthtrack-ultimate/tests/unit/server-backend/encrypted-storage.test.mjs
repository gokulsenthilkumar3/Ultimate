import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createPrivateStorage } from '../../../server/domains/privateStorage.js';
import { createEncryptedPrivateStorage } from '../../../server/domains/encryptedPrivateStorage.js';
import { createFileHandlers } from '../../../server/domains/files.js';
import { fileMetadata } from '../../../server/domains/fileMetadata.js';
import { isolatedFixture, request, call } from './fixture.mjs';

test('encrypted uploads keep plaintext out of stored bytes while owned download and preview round-trip', async t => {
  const { directory, prisma } = await isolatedFixture(t);
  const raw = createPrivateStorage(path.join(directory, 'encrypted-files'));
  const storage = createEncryptedPrivateStorage(raw, randomBytes(32).toString('hex'));
  const handlers = createFileHandlers({ prisma, storage });
  const req = request();
  req.file = { originalname: 'private.txt', buffer: Buffer.from('Sensitive owner file content') };
  const upload = await call(handlers.upload, req);
  assert.equal(upload.statusCode, 201);
  assert.equal(upload.body.encryptedAtRest, true);
  const row = await prisma.document.findUnique({ where: { id: upload.body.id } });
  const metadata = fileMetadata(row);
  const stored = await fs.readFile(path.join(raw.root, metadata.key));
  assert.equal(stored.includes(req.file.buffer), false);
  assert.equal(stored.length, req.file.buffer.length + 28);
  const download = await call(handlers.download, request({}, 'owner-a', row.id));
  assert.deepEqual(download.body, req.file.buffer);
  assert.equal((await call(handlers.preview, request({}, 'owner-a', row.id))).body.text, req.file.buffer.toString());
  assert.equal((await call(handlers.download, request({}, 'owner-b', row.id))).statusCode, 404);
  assert.equal(JSON.stringify(upload.body).includes(metadata.encryption.keyId), false);
});

test('ciphertext tampering, relocation and unavailable keys fail without returning plaintext', async t => {
  const { directory } = await isolatedFixture(t);
  const raw = createPrivateStorage(path.join(directory, 'encrypted-files'));
  const storage = createEncryptedPrivateStorage(raw, randomBytes(32).toString('hex'));
  const first = randomBytes(32).toString('hex');
  const second = randomBytes(32).toString('hex');
  const metadata = await storage.put(first, Buffer.from('Private bytes'));
  const bytes = await raw.read(first, 100);
  await raw.put(second, bytes);
  await assert.rejects(storage.read(second, 100, metadata), { code: 'FILE_UNAVAILABLE' });
  await assert.rejects(createEncryptedPrivateStorage(raw).read(first, 100, metadata), { code: 'FILE_KEY_REQUIRED' });
  await assert.rejects(createEncryptedPrivateStorage(raw, randomBytes(32).toString('hex')).read(first, 100, metadata), { code: 'FILE_KEY_REQUIRED' });
  bytes[bytes.length - 1] ^= 1;
  await fs.writeFile(path.join(raw.root, first), bytes);
  await assert.rejects(storage.read(first, 100, metadata), { code: 'FILE_UNAVAILABLE' });
});

test('encryption retains explicit legacy byte compatibility and validates key format', async t => {
  const { directory } = await isolatedFixture(t);
  const raw = createPrivateStorage(path.join(directory, 'mixed-files'));
  const identifier = randomBytes(32).toString('hex');
  const unencrypted = createEncryptedPrivateStorage(raw);
  assert.equal(await unencrypted.put(identifier, Buffer.from('Original legacy bytes')), undefined);
  const encrypted = createEncryptedPrivateStorage(raw, randomBytes(32).toString('hex'));
  assert.equal((await encrypted.read(identifier, 100)).toString(), 'Original legacy bytes');
  assert.throws(() => createEncryptedPrivateStorage(raw, 'not-a-key'), /64 hexadecimal/);
});
