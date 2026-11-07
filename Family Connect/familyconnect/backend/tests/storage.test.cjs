process.env.REDIS_DISABLED = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { createLocalStorage, createMemoryStorage, getStorage, registerStorageAdapter, storageReference, keyFromReference, StorageError } = require('../dist/services/storage');
const { createDocumentHandlers } = require('../dist/controllers/documents.controller');

const read = async opened => {
  if (opened.kind === 'file') return fs.readFile(opened.path);
  const chunks = []; for await (const chunk of opened.stream) chunks.push(chunk); return Buffer.concat(chunks);
};
const refused = async (promise, code) => assert.rejects(promise, error => error instanceof StorageError && error.code === code);

/** The behavior every adapter must have, including future AWS S3 and Azure Blob adapters. */
function storageContract(name, create) {
  test(`${name}: stores, reads, refuses to overwrite and removes idempotently`, async () => {
    const storage = await create();
    await storage.put('photo-1.png', Buffer.from('first'));
    assert.equal((await read(await storage.open('photo-1.png'))).toString(), 'first');
    await refused(storage.put('photo-1.png', Buffer.from('second')), 'exists');
    assert.equal((await read(await storage.open('photo-1.png'))).toString(), 'first', 'the original survives a refused overwrite');
    assert.equal(await storage.open('missing.png'), null);
    await storage.remove('photo-1.png'); await storage.remove('photo-1.png'); await storage.remove('never-existed.png');
    assert.equal(await storage.open('photo-1.png'), null);
  });
  test(`${name}: rejects keys that could escape the store`, async () => {
    const storage = await create();
    for (const key of ['../x.txt', 'a/b.txt', 'a\\b.txt', '', '.', '..', `${'x'.repeat(300)}.txt`, 'bad key.txt', null, undefined, 42]) {
      await refused(storage.put(key, Buffer.from('x')), 'invalid_key'); await refused(storage.open(key), 'invalid_key'); await refused(storage.remove(key), 'invalid_key');
    }
    // Without an extension a key is not one this service creates: it can be looked up (older data) but not written or removed.
    await refused(storage.put('no-extension', Buffer.from('x')), 'invalid_key'); await refused(storage.remove('no-extension'), 'invalid_key'); assert.equal(await storage.open('no-extension'), null);
  });
}

let directory;
test.before(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'family-storage-')); });
test.after(async () => { await fs.rm(directory, { recursive: true, force: true }); });
storageContract('local adapter', async () => createLocalStorage({ root: await fs.mkdtemp(path.join(directory, 'root-')), legacyRoots: [] }));
storageContract('memory adapter', async () => createMemoryStorage());

test('local adapter reads and cleans a legacy folder but only ever writes to its own root', async () => {
  const root = await fs.mkdtemp(path.join(directory, 'new-')), legacy = await fs.mkdtemp(path.join(directory, 'old-'));
  await fs.writeFile(path.join(legacy, 'old.photo.v2.jpg'), 'legacy bytes');
  const storage = createLocalStorage({ root, legacyRoots: [legacy] });
  assert.equal((await read(await storage.open('old.photo.v2.jpg'))).toString(), 'legacy bytes', 'older multi-dot names stay readable');
  await storage.put('fresh-1.png', Buffer.from('new'));
  assert.deepEqual(await fs.readdir(root), ['fresh-1.png']); assert.deepEqual(await fs.readdir(legacy), ['old.photo.v2.jpg']);
  await storage.put('same-1.png', Buffer.from('a')); await fs.copyFile(path.join(root, 'same-1.png'), path.join(legacy, 'same-1.png'));
  await storage.remove('same-1.png'); assert.equal((await fs.readdir(legacy)).includes('same-1.png'), false, 'cleanup covers both folders');
  await refused(storage.remove('old.photo.v2.jpg'), 'invalid_key'); // as before, only keys this service creates are removable
});

test('the provider comes from FAMILY_STORAGE and an unknown one fails loudly', () => {
  assert.equal(getStorage({}).name, 'local'); assert.equal(getStorage({ FAMILY_STORAGE: ' local ' }).name, 'local');
  assert.throws(() => getStorage({ FAMILY_STORAGE: 's3' }), error => error instanceof StorageError && error.code === 'unknown_provider' && /not installed/.test(error.message));
  registerStorageAdapter('memory-test', () => createMemoryStorage()); assert.equal(getStorage({ FAMILY_STORAGE: 'memory-test' }).name, 'memory');
});

test('persisted references are opaque keys under /uploads and nothing else', () => {
  assert.equal(storageReference('abc-1.png'), '/uploads/abc-1.png'); assert.equal(keyFromReference('/uploads/abc-1.png'), 'abc-1.png');
  for (const bad of ['/uploads/../x.png', '/uploads/a/b.png', '/other/a.png', 'https://example.invalid/a.png', '/uploads/', '', null]) assert.throws(() => keyFromReference(bad), StorageError, String(bad));
});

// ── The document handlers use the adapter, not the filesystem ────────────────
function response() {
  const res = new PassThrough();
  Object.assign(res, { code: 200, headers: {}, status(code) { this.code = code; return this; }, set(name, value) { this.headers[name] = value; return this; }, setHeader(name, value) { this.headers[name] = value; }, attachment(name) { this.attached = name; return this; }, download(file, name) { this.downloaded = [file, name]; this.end(); }, json(body) { this.body = body; this.end(); return this; } });
  return res;
}
function fixture({ role = 'editor', failTransaction = false } = {}) {
  const state = { documents: [], audits: [], photo: null }, storage = createMemoryStorage();
  const tx = {
    document: { create: async ({ data }) => { const row = { id: `doc-${state.documents.length + 1}`, uploadedAt: new Date('2026-11-07T00:00:00Z'), ...data }; state.documents.push(row); return row; } },
    auditLog: { create: async ({ data }) => { state.audits.push(data); return data; } },
    member: { update: async ({ data }) => { state.photo = data.photoUrl; return data; } },
  };
  const database = {
    accessControl: { findFirst: async ({ where }) => (where.treeId === 'tree-a' && where.userId === 'member' ? { role } : null) },
    member: { count: async ({ where }) => where.id.in.filter(id => id === 'person-a').length },
    document: { findUnique: async ({ where }) => state.documents.find(row => row.id === where.id) || null, findFirst: async () => null },
    $transaction: async callback => { if (failTransaction) throw new Error('database unavailable'); return callback(tx); },
  };
  return { state, storage, handlers: createDocumentHandlers({ database, storage }) };
}
const upload = (body, file, user = 'member') => ({ user: user ? { id: user } : undefined, body, file, params: {}, query: {} });
const file = (name = 'certificate.pdf', content = 'synthetic file') => ({ originalname: name, buffer: Buffer.from(content) });

test('uploads store the bytes through the adapter, record metadata, and write one trail entry with the row', async () => {
  const f = fixture(), res = response();
  await f.handlers.uploadDocument(upload({ treeId: 'tree-a', memberId: 'person-a', type: 'photo' }, file('face.png', 'image bytes')), res);
  assert.equal(res.code, 201); assert.equal(f.state.documents.length, 1); assert.equal(f.storage.keys().length, 1);
  const row = f.state.documents[0], key = keyFromReference(row.fileUrl);
  assert.deepEqual(f.storage.keys(), [key]); assert.match(key, /^[0-9a-f-]{36}\.png$/); assert.equal(row.fileName, 'face.png'); assert.equal(f.state.photo, row.fileUrl);
  assert.deepEqual(f.state.audits.map(({ details, ...entry }) => [entry.action, entry.entity, entry.treeId, entry.actorId, details]), [['document.upload', 'document', 'tree-a', 'member', { type: 'photo', profilePhoto: true }]]);
  assert.equal(/face\.png|image bytes/.test(JSON.stringify(f.state.audits)), false, 'file names and contents never enter the trail');
});

test('uploads refuse viewers, strangers and unsupported files without storing anything', async () => {
  for (const [role, user, body, upload_, status] of [
    ['viewer', 'member', { treeId: 'tree-a', type: 'other' }, file(), 403], ['editor', 'stranger', { treeId: 'tree-a', type: 'other' }, file(), 403],
    ['editor', 'member', { treeId: 'tree-a', type: 'other' }, file('script.exe'), 400], ['editor', 'member', { treeId: 'tree-a', type: 'photo' }, file('notes.pdf'), 400],
    ['editor', 'member', { treeId: 'tree-a', type: 'other', memberId: 'someone-else' }, file(), 400], ['editor', 'member', { treeId: 'tree-a', type: 'other' }, undefined, 400],
  ]) {
    const f = fixture({ role }), res = response(); await f.handlers.uploadDocument(upload(body, upload_, user), res);
    assert.equal(res.code, status, `${role}/${user}`); assert.deepEqual(f.storage.keys(), []); assert.equal(f.state.documents.length, 0);
  }
});

test('a database failure after the bytes were stored removes them again, so no orphan is left', async () => {
  const f = fixture({ failTransaction: true }), res = response();
  await f.handlers.uploadDocument(upload({ treeId: 'tree-a', type: 'other' }, file()), res);
  assert.equal(res.code, 500); assert.deepEqual(f.storage.keys(), []); assert.deepEqual(f.state.audits, []);
});

test('downloads stream from any adapter after the live access check and never from a tampered reference', async () => {
  const f = fixture(), done = response();
  await f.handlers.uploadDocument(upload({ treeId: 'tree-a', type: 'other' }, file('Will.pdf', 'private contents')), done);
  const id = done.body.id, chunks = [];
  const res = response(); res.on('data', chunk => chunks.push(chunk));
  const finished = new Promise(resolve => res.on('end', resolve));
  await f.handlers.downloadDocument({ user: { id: 'member' }, params: { documentId: id }, query: {} }, res); await finished;
  assert.equal(Buffer.concat(chunks).toString(), 'private contents'); assert.equal(res.attached, 'Will.pdf'); assert.equal(res.headers['Content-Length'], String('private contents'.length)); assert.equal(res.headers['Cache-Control'], 'private, no-store');
  const stranger = response(); await f.handlers.downloadDocument({ user: { id: 'stranger' }, params: { documentId: id }, query: {} }, stranger); assert.equal(stranger.code, 403);
  const missing = response(); await f.handlers.downloadDocument({ user: { id: 'member' }, params: { documentId: 'nope' }, query: {} }, missing); assert.equal(missing.code, 404);
  for (const fileUrl of ['/uploads/../secret.pdf', '/elsewhere/x.pdf', 'https://example.invalid/x.pdf', '/uploads/a/b.pdf']) {
    f.state.documents[0].fileUrl = fileUrl; const bad = response();
    await f.handlers.downloadDocument({ user: { id: 'member' }, params: { documentId: id }, query: {} }, bad); assert.equal(bad.code, 404, fileUrl);
  }
  f.state.documents[0].fileUrl = '/uploads/gone-1.pdf'; const gone = response();
  await f.handlers.downloadDocument({ user: { id: 'member' }, params: { documentId: id }, query: {} }, gone); assert.equal(gone.code, 404); assert.match(gone.body.error, /unavailable/);
});

test('a filesystem adapter is sent with res.download, as before', async () => {
  const root = await fs.mkdtemp(path.join(directory, 'download-')); await fs.writeFile(path.join(root, 'keep-1.pdf'), 'on disk');
  const f = fixture(); f.state.documents.push({ id: 'doc-x', treeId: 'tree-a', fileUrl: '/uploads/keep-1.pdf', fileName: 'Keep.pdf' });
  const handlers = createDocumentHandlers({ database: { accessControl: { findFirst: async () => ({ role: 'viewer' }) }, member: { count: async () => 0 }, document: { findUnique: async () => f.state.documents[0], findFirst: async () => null }, $transaction: async () => { throw new Error('unused'); } }, storage: createLocalStorage({ root, legacyRoots: [] }) });
  const res = response(); await handlers.downloadDocument({ user: { id: 'member' }, params: { documentId: 'doc-x' }, query: {} }, res);
  assert.deepEqual(res.downloaded, [path.join(root, 'keep-1.pdf'), 'Keep.pdf']);
});
