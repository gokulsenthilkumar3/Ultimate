import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { once } from 'node:events';
import { createFileHandlers, registerFileRoutes, detectPreview, attachmentDisposition } from '../../../server/domains/files.js';
import { fileMetadata, fileToClient } from '../../../server/domains/fileMetadata.js';
import { collectionToClient } from '../../../server/collectionPayload.js';
import { isolatedFixture, request, call } from './fixture.mjs';

function fileRequest(bytes, name = 'note.txt', userId = 'owner-a') {
  const req = request({ visibility: 'private' }, userId);
  req.file = { originalname: name, mimetype: 'text/html', buffer: Buffer.from(bytes) };
  return req;
}

test('upload transfers real bytes, hides storage metadata and enforces owner access', async t => {
  const { prisma, storage } = await isolatedFixture(t);
  const audits = [];
  const handlers = createFileHandlers({ prisma, storage, auditCrud: event => audits.push(event) });
  const upload = await call(handlers.upload, fileRequest('Private bytes\n<script>alert(1)</script>', 'private-note.txt'));
  assert.equal(upload.statusCode, 201);
  assert.equal(upload.body.available, true);
  assert.equal(upload.body.type, 'Private');
  assert.ok(!JSON.stringify(upload.body).includes('sha256'));
  assert.ok(!JSON.stringify(upload.body).includes('_vault'));
  const download = await call(handlers.download, request({}, 'owner-a', upload.body.id));
  assert.equal(download.body.toString(), 'Private bytes\n<script>alert(1)</script>');
  assert.equal(download.headers['content-type'], 'application/octet-stream');
  assert.equal(download.headers['cache-control'], 'private, no-store');
  assert.match(download.headers['content-disposition'], /^attachment;/);
  const preview = await call(handlers.preview, request({}, 'owner-a', upload.body.id));
  assert.equal(preview.body.kind, 'text');
  assert.equal(preview.body.text, 'Private bytes\n<script>alert(1)</script>');
  assert.match(preview.headers['content-security-policy'], /sandbox/);
  assert.equal((await call(handlers.download, request({}, 'owner-b', upload.body.id))).statusCode, 404);
  assert.equal((await call(handlers.preview, request({}, 'owner-b', upload.body.id))).statusCode, 404);
  assert.equal((await call(handlers.delete, request({}, 'owner-b', upload.body.id))).statusCode, 404);
  assert.equal((await call(handlers.list, request({}, 'owner-b'))).body.files.length, 0);
  assert.ok(!JSON.stringify(audits.map(audit => audit.details)).includes('private-note'));
});

test('filename injection is neutralized and safe text/raster detection ignores uploaded MIME', () => {
  const disposition = attachmentDisposition('../../合同\r\nContent-Type: text/html".txt');
  assert.ok(!/[\r\n]/.test(disposition));
  assert.ok(!disposition.includes('../'));
  assert.match(disposition, /filename\*=UTF-8''/);
  assert.deepEqual(detectPreview(Buffer.from('<script>alert(1)</script>'), 'file.html'), { previewKind: null, mime: 'application/octet-stream' });
  assert.equal(detectPreview(Buffer.from('<svg onload="alert(1)"></svg>'), 'file.svg').previewKind, null);
  assert.equal(detectPreview(Buffer.from('<svg onload="alert(1)"></svg>'), 'file.txt').previewKind, 'text');
  assert.equal(detectPreview(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'file.html').mime, 'image/png');
  assert.equal(detectPreview(Buffer.from([0, 255, 20]), 'file.txt').previewKind, null);
});

test('HTML/SVG previews fail honestly while byte downloads remain available', async t => {
  const { prisma, storage } = await isolatedFixture(t);
  const handlers = createFileHandlers({ prisma, storage });
  for (const name of ['active.html', 'active.svg', 'statement.pdf']) {
    const upload = await call(handlers.upload, fileRequest('<svg onload="alert(1)"></svg>', name));
    assert.equal(upload.body.previewKind, null);
    assert.equal((await call(handlers.preview, request({}, 'owner-a', upload.body.id))).statusCode, 415);
    assert.equal((await call(handlers.download, request({}, 'owner-a', upload.body.id))).statusCode, 200);
  }
});

test('quota failures clean up bytes and do not create records', async t => {
  const { prisma, storage } = await isolatedFixture(t);
  const handlers = createFileHandlers({ prisma, storage, limits: { maxFileBytes: 20, maxTotalBytes: 10, maxFiles: 1 } });
  assert.equal((await call(handlers.upload, fileRequest('12345'))).statusCode, 201);
  assert.equal((await call(handlers.upload, fileRequest('67890'))).body.code, 'VAULT_QUOTA');
  assert.equal((await call(handlers.upload, fileRequest('x'.repeat(21)))).statusCode, 413);
  assert.equal((await call(handlers.upload, fileRequest(''))).statusCode, 400);
  assert.equal(await prisma.document.count(), 1);
  assert.equal((await fs.readdir(storage.root)).length, 1);
});

test('database failures remove staged bytes', async t => {
  const { prisma, storage } = await isolatedFixture(t);
  const handlers = createFileHandlers({ prisma: { $transaction: () => { throw new Error('Injected write failure'); } }, storage });
  assert.equal((await call(handlers.upload, fileRequest('private'))).statusCode, 500);
  assert.equal((await fs.readdir(storage.root)).length, 0);
  assert.equal(await prisma.document.count(), 0);
});

test('simultaneous uploads cannot exceed the owner file quota', async t => {
  const { prisma, storage } = await isolatedFixture(t);
  const handlers = createFileHandlers({ prisma, storage, limits: { maxFileBytes: 20, maxTotalBytes: 100, maxFiles: 1 } });
  const results = await Promise.all([call(handlers.upload, fileRequest('first')), call(handlers.upload, fileRequest('second'))]);
  assert.deepEqual(results.map(result => result.statusCode).sort(), [201, 413]);
  assert.equal(await prisma.document.count(), 1);
  assert.equal((await fs.readdir(storage.root)).length, 1);
});

test('legacy records are preserved and mapped truthfully without stored bytes', async t => {
  const { prisma, storage } = await isolatedFixture(t);
  const legacy = await prisma.document.create({ data: { userId: 'owner-a', title: 'Legacy document', url: 'https://example.test/file', data: '{"size":"2 MB","type":"Public"}' } });
  const handlers = createFileHandlers({ prisma, storage });
  const list = await call(handlers.list, request());
  assert.equal(list.body.files[0].metadataOnly, true);
  assert.equal(list.body.files[0].downloadUrl, null);
  assert.equal(list.body.usage.bytes, 0);
  assert.equal((await call(handlers.download, request({}, 'owner-a', legacy.id))).statusCode, 410);
  assert.equal(await prisma.document.count(), 1);
  assert.equal((await prisma.document.findUnique({ where: { id: legacy.id } })).url, 'https://example.test/file');
});

test('stale file mutations preserve bytes and protected metadata cannot be overwritten', async t => {
  const { prisma, storage } = await isolatedFixture(t);
  const handlers = createFileHandlers({ prisma, storage });
  const upload = await call(handlers.upload, fileRequest('original'));
  const updated = await call(handlers.rename, request({ name: 'renamed.txt', expectedUpdatedAt: upload.body.updatedAt.toISOString() }, 'owner-a', upload.body.id));
  assert.equal(updated.statusCode, 200);
  const stale = request({ expectedUpdatedAt: upload.body.updatedAt.toISOString() }, 'owner-a', upload.body.id);
  assert.equal((await call(handlers.delete, stale)).statusCode, 409);
  assert.equal((await call(handlers.rename, request({ name: 'bad', data: { _vault: { key: 'other' } } }, 'owner-a', upload.body.id))).statusCode, 400);
  assert.equal((await call(handlers.download, request({}, 'owner-a', upload.body.id))).body.toString(), 'original');
  const stored = await prisma.document.findUnique({ where: { id: upload.body.id } });
  assert.equal(collectionToClient('documents', stored).name, 'renamed.txt');
  assert.ok(!JSON.stringify(collectionToClient('documents', stored)).includes(fileMetadata(stored).key));
  assert.equal((await call(handlers.delete, request({ expectedUpdatedAt: updated.body.updatedAt.toISOString() }, 'owner-a', upload.body.id))).body.success, true);
  assert.equal(await prisma.document.count(), 0);
  assert.equal((await fs.readdir(storage.root)).length, 0);
});

test('tampered bytes are not served', async t => {
  const { prisma, storage } = await isolatedFixture(t);
  const handlers = createFileHandlers({ prisma, storage });
  const upload = await call(handlers.upload, fileRequest('original'));
  const row = await prisma.document.findUnique({ where: { id: upload.body.id } });
  await fs.writeFile(path.join(storage.root, fileMetadata(row).key), 'tampered');
  assert.equal((await call(handlers.download, request({}, 'owner-a', row.id))).statusCode, 410);
  assert.equal(fileToClient({ data: '{"_vault":{"key":"../public/x"}}' }).available, false);
});

test('Express compatibility routes authenticate before multipart parsing and deliver real bytes', async t => {
  const { prisma, storage } = await isolatedFixture(t);
  const app = express();
  app.use(express.json());
  const auth = (req, res, next) => {
    if (req.headers['x-test-owner'] !== 'owner-a') return res.status(401).json({ error: 'Sign in.' });
    req.user = { id: 'owner-a' }; next();
  };
  registerFileRoutes(app, auth, { prisma, storage, limits: { maxFileBytes: 1024, maxFiles: 100, maxTotalBytes: 10000 } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const form = () => { const data = new FormData(); data.append('file', new Blob(['hello private file']), 'note.txt'); data.append('visibility', 'private'); return data; };
  assert.equal((await fetch(`${base}/api/files`, { method: 'POST', body: form() })).status, 401);
  const posted = await fetch(`${base}/api/documents`, { method: 'POST', body: form(), headers: { 'x-test-owner': 'owner-a' } });
  assert.equal(posted.status, 201);
  const file = await posted.json();
  const downloaded = await fetch(`${base}/api/files/${file.id}/download`, { headers: { 'x-test-owner': 'owner-a' } });
  assert.equal(await downloaded.text(), 'hello private file');
  const legacy = await fetch(`${base}/api/documents`, { headers: { 'x-test-owner': 'owner-a' } });
  assert.equal((await legacy.json())[0].id, file.id);
  assert.equal((await fetch(`${base}/api/documents`, { method: 'POST', body: JSON.stringify({ name: 'fake' }), headers: { 'x-test-owner': 'owner-a', 'content-type': 'application/json' } })).status, 415);
  const tooLarge = new FormData(); tooLarge.append('file', new Blob(['x'.repeat(1025)]), 'large.txt');
  assert.equal((await fetch(`${base}/api/files`, { method: 'POST', body: tooLarge, headers: { 'x-test-owner': 'owner-a' } })).status, 413);
  const provider = await fetch(`${base}/api/files/providers/google_drive/connect`, { method: 'POST', headers: { 'x-test-owner': 'owner-a' } });
  assert.equal(provider.status, 501);
  assert.equal((await provider.json()).setupRequired, true);
});
