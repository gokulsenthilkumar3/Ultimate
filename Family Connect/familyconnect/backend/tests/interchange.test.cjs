const test = require('node:test');
const assert = require('node:assert/strict');
const { createInterchangeHandlers } = require('../dist/controllers/interchange.controller');
const { buildGedcom } = require('../dist/services/gedcom');

const response = () => ({ code: 200, headers: {}, status(code) { this.code = code; return this; }, set(name, value) { this.headers[name] = value; return this; }, json(body) { this.body = body; return this; } });
const d = value => new Date(value + 'T00:00:00Z');
const SOURCE = buildGedcom({
  people: [{ id: 'a', name: 'Imported Parent', gender: 'male', birthDate: d('1950-01-02') }, { id: 'b', name: 'Imported Partner', gender: 'female' }, { id: 'c', name: 'Imported Child', gender: 'male', birthLocation: 'Example Town' }],
  relationships: [{ member1Id: 'a', member2Id: 'b', type: 'spouse', marriageDate: d('1975-05-05') }, { member1Id: 'a', member2Id: 'c', type: 'parent' }, { member1Id: 'b', member2Id: 'c', type: 'parent' }],
}).text;

function fixture({ role = 'editor', existing = [], conflict = false, failure = null } = {}) {
  const writes = [], audit = [], audits = [], keys = new Map(), reads = { counts: { member: 3, relationship: 2 } };
  const stored = [
    { id: 'e1', name: 'Existing Person', gender: null, birthDate: d('1990-04-04'), birthLocation: null, deathDate: null, occupation: null, religion: null, bio: null },
    ...existing,
  ];
  const tx = {
    accessControl: { findUnique: async ({ where }) => where.treeId_userId.userId === 'member' ? { role } : null, findMany: async () => [{ userId: 'member' }, { userId: 'other' }] },
    familyTree: { findUnique: async () => ({ name: 'Fictional Family / Tree' }) },
    auditLog: { create: async input => { audits.push(input.data); return input.data; } },
    idempotencyKey: {
      findUnique: async ({ where }) => keys.get(JSON.stringify(where.userId_scope_key)) || null,
      create: async ({ data }) => { const id = JSON.stringify({ userId: data.userId, scope: data.scope, key: data.key }); if (keys.has(id)) throw Object.assign(new Error('unique'), { code: 'P2002' }); keys.set(id, data); return data; },
      deleteMany: async () => ({ count: 0 }),
    },
    member: {
      count: async () => reads.counts.member, findMany: async () => stored,
      createMany: async input => { writes.push(['member.createMany', input.data]); return { count: input.data.length }; },
    },
    relationship: { count: async () => reads.counts.relationship, findMany: async () => [], createMany: async input => { writes.push(['relationship.createMany', input.data]); return { count: input.data.length }; } },
  };
  const db = { $transaction: async callback => { if (conflict || failure) throw Object.assign(new Error('transaction failure'), { code: failure || 'P2034' }); return callback(tx); } };
  db.auditLog = tx.auditLog;
  return { writes, audit, audits, keys, reads, db, handlers: createInterchangeHandlers(db, event => audit.push(event)) };
}
const request = (body, actor = 'member', id = 'tree-a') => ({ user: actor ? { id: actor } : undefined, params: { id }, body });

test('export: every tree member may export; others, bad IDs and oversized trees are refused', async () => {
  for (const role of ['viewer', 'editor', 'admin']) {
    const f = fixture({ role }), res = response();
    await f.handlers.exportGedcom(request(undefined), res);
    assert.equal(res.code, 200); assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(res.body.filename, 'Fictional-Family-Tree.ged'); assert.match(res.body.gedcom, /^0 HEAD\r\n/); assert.equal(res.body.summary.people, 1);
    assert.equal(f.writes.length, 0);
    assert.deepEqual(f.audit.map(({ at, ...event }) => event), [{ event: 'family.interchange', actorId: 'member', action: 'export-gedcom', treeId: 'tree-a', people: 1 }]);
    assert.equal(JSON.stringify(f.audit).includes('Existing Person'), false, 'audit is metadata only');
  }
  const stranger = fixture(), denied = response(); await stranger.handlers.exportGedcom(request(undefined, 'stranger'), denied); assert.equal(denied.code, 403);
  const anonymous = response(); await fixture().handlers.exportGedcom(request(undefined, null), anonymous); assert.equal(anonymous.code, 401);
  const bad = response(); await fixture().handlers.exportGedcom(request(undefined, 'member', '../x'), bad); assert.equal(bad.code, 400);
  const big = fixture(); big.reads.counts.member = 5001; const tooBig = response(); await big.handlers.exportGedcom(request(undefined), tooBig); assert.equal(tooBig.code, 413);
});

test('preview: editors only, writes nothing, flags probable duplicates and invalid files', async () => {
  const viewer = fixture({ role: 'viewer' }), denied = response();
  await viewer.handlers.previewGedcom(request({ text: SOURCE }), denied); assert.equal(denied.code, 403);
  const f = fixture({ existing: [{ id: 'e2', name: 'Parent,  IMPORTED', birthDate: null }] }), res = response();
  await f.handlers.previewGedcom(request({ text: SOURCE }), res);
  assert.equal(res.code, 200); assert.equal(res.body.canImport, true); assert.deepEqual(res.body.stats, { people: 3, families: 1, relationships: 3 });
  assert.deepEqual(res.body.duplicates.rows.map(row => [row.name, row.existingId]), [['Imported Parent', 'e2']]); assert.equal(res.body.duplicates.count, 1);
  assert.equal(res.body.sample.length, 3); assert.equal(f.writes.length, 0);
  const empty = response(); await f.handlers.previewGedcom(request({ text: '0 HEAD\n0 TRLR' }), empty);
  assert.equal(empty.body.canImport, false); assert.match(empty.body.errors[0], /No people/);
  for (const body of [undefined, {}, { text: 1 }, { text: 'x', extra: true }]) { const bad = response(); await f.handlers.previewGedcom(request(body), bad); assert.equal(bad.code, 400); }
});

test('import: viewers and strangers write nothing; editors create only new people and mapped connections', async () => {
  for (const [role, actor] of [['viewer', 'member'], ['editor', 'stranger']]) {
    const f = fixture({ role }), res = response(); await f.handlers.importGedcom(request({ text: SOURCE }, actor), res);
    assert.equal(res.code, 403); assert.equal(f.writes.length, 0); assert.equal(f.audit.length, 0);
  }
  const f = fixture({ role: 'family_head' }), res = response();
  await f.handlers.importGedcom(request({ text: SOURCE }), res);
  assert.equal(res.code, 201); assert.deepEqual(res.body.imported, { people: 3, relationships: 3 });
  const creates = f.writes.filter(item => item[0] === 'member.createMany').flatMap(item => item[1]);
  assert.deepEqual(creates.map(row => [row.name, row.treeId, row.createdById]).sort(), [['Imported Child', 'tree-a', 'member'], ['Imported Parent', 'tree-a', 'member'], ['Imported Partner', 'tree-a', 'member']]);
  assert.ok(creates.every(row => /^c[a-f0-9]{24}$/.test(row.id))); assert.equal(new Set(creates.map(row => row.id)).size, 3);
  assert.equal(creates.find(row => row.name === 'Imported Parent').birthDate.toISOString(), '1950-01-02T00:00:00.000Z');
  assert.equal(creates.find(row => row.name === 'Imported Child').birthLocation, 'Example Town');
  const idOf = name => creates.find(row => row.name === name).id;
  const links = f.writes.find(item => item[0] === 'relationship.createMany')[1];
  assert.deepEqual(links.map(row => [row.type, row.member1Id, row.member2Id]).sort(), [
    ['parent', idOf('Imported Parent'), idOf('Imported Child')], ['parent', idOf('Imported Partner'), idOf('Imported Child')], ['spouse', idOf('Imported Parent'), idOf('Imported Partner')],
  ].sort());
  assert.equal(links.find(row => row.type === 'spouse').marriageDate.toISOString(), '1975-05-05T00:00:00.000Z'); assert.ok(links.every(row => row.treeId === 'tree-a' && row.customLabel === null));
  assert.deepEqual(f.audit.map(({ at, ...event }) => event), [{ event: 'family.interchange', actorId: 'member', action: 'import-gedcom', treeId: 'tree-a', people: 3, relationships: 3, warnings: 0 }]);
  assert.equal(JSON.stringify(f.audit).includes('Imported'), false);
});

test('import: probable duplicates stop the import until the editor confirms; invalid files and conflicts change nothing', async () => {
  const f = fixture({ existing: [{ id: 'e2', name: 'Imported Child', birthDate: null }] }), blocked = response();
  await f.handlers.importGedcom(request({ text: SOURCE }), blocked);
  assert.equal(blocked.code, 409); assert.equal(blocked.body.code, 'DUPLICATES'); assert.equal(blocked.body.duplicates.count, 1); assert.equal(f.writes.length, 0);
  const allowed = response(); await f.handlers.importGedcom(request({ text: SOURCE, allowDuplicates: true }), allowed);
  assert.equal(allowed.code, 201); assert.equal(f.writes.filter(item => item[0] === 'member.createMany').flatMap(item => item[1]).length, 3);
  const invalid = fixture(), refused = response(); await invalid.handlers.importGedcom(request({ text: 'not a gedcom file' }), refused);
  assert.equal(refused.code, 422); assert.equal(invalid.writes.length, 0);
  const conflict = fixture({ conflict: true }), retry = response(); await conflict.handlers.importGedcom(request({ text: SOURCE }), retry);
  assert.equal(retry.code, 409); assert.match(retry.body.error, /Nothing was changed/); assert.equal(conflict.audit.length, 0);
});

test('import: precision, approximation and a death without a date are stored as recorded', async () => {
  const text = ['0 HEAD', '0 @I1@ INDI', '1 NAME Fictional /Year/', '1 BIRT', '2 DATE ABT 1950', '1 DEAT Y', '0 @I2@ INDI', '1 NAME Fictional /Month/', '1 BIRT', '2 DATE MAR 1951', '0 TRLR'].join('\n');
  const f = fixture(), res = response(); await f.handlers.importGedcom(request({ text }), res);
  assert.equal(res.code, 201);
  const rows = Object.fromEntries(f.writes.filter(item => item[0] === 'member.createMany').flatMap(item => item[1]).map(row => [row.name, row]));
  assert.deepEqual([rows['Fictional Year'].birthDate.toISOString().slice(0, 10), rows['Fictional Year'].birthDatePrecision, rows['Fictional Year'].birthDateApproximate, rows['Fictional Year'].deathDate, rows['Fictional Year'].deathRecorded], ['1950-01-01', 'year', true, null, true]);
  assert.deepEqual([rows['Fictional Month'].birthDatePrecision, rows['Fictional Month'].birthDateApproximate, rows['Fictional Month'].deathRecorded], ['month', false, false]);
});

test('import: duplicate matching compares years when either birth date is less precise', async () => {
  const existing = [{ id: 'e2', name: 'Fictional Year', birthDate: d('1950-06-15'), birthDatePrecision: 'day', birthDateApproximate: false }, { id: 'e3', name: 'Fictional Month', birthDate: d('1960-01-01'), birthDatePrecision: 'year', birthDateApproximate: false }];
  const text = ['0 HEAD', '0 @I1@ INDI', '1 NAME Fictional /Year/', '1 BIRT', '2 DATE 1950', '0 @I2@ INDI', '1 NAME Fictional /Month/', '1 BIRT', '2 DATE MAR 1951', '0 TRLR'].join('\n');
  const f = fixture({ existing }), res = response(); await f.handlers.previewGedcom(request({ text }), res);
  assert.deepEqual(res.body.duplicates.rows.map(row => [row.name, row.existingId]), [['Fictional Year', 'e2']], 'same year matches; 1951 versus 1960 does not');
});

test('import: adoptive links keep their label and a transaction timeout is reported as rolled back', async () => {
  const adoptive = ['0 HEAD', '0 @I1@ INDI', '1 NAME Fictional /Parent/', '0 @I2@ INDI', '1 NAME Fictional /Child/', '1 FAMC @F1@', '2 PEDI adopted', '0 @F1@ FAM', '1 HUSB @I1@', '1 CHIL @I2@', '0 TRLR'].join('\n');
  const f = fixture(), res = response(); await f.handlers.importGedcom(request({ text: adoptive }), res);
  assert.equal(res.code, 201); assert.match(res.body.warnings.join(' '), /Adoptive parent/);
  const links = f.writes.find(item => item[0] === 'relationship.createMany')[1];
  assert.deepEqual(links.map(row => [row.type, row.customLabel]), [['parent', 'Adoptive parent']]);
  const slow = fixture({ failure: 'P2028' }), timedOut = response(); await slow.handlers.importGedcom(request({ text: SOURCE }), timedOut);
  assert.equal(timedOut.code, 503); assert.match(timedOut.body.error, /rolled back.*Nothing was changed.*smaller parts/); assert.equal(slow.audit.length, 0);
});

test('import: a failing log sink does not turn a committed import into an error', async () => {
  const db = { $transaction: async callback => callback({
    accessControl: { findUnique: async () => ({ role: 'editor' }), findMany: async () => [] },
    member: { findMany: async () => [], createMany: async () => ({ count: 0 }) }, relationship: { createMany: async () => ({ count: 0 }) },
    auditLog: { create: async () => ({}) }, idempotencyKey: { findUnique: async () => null, create: async () => ({}), deleteMany: async () => ({ count: 0 }) },
  }) };
  const handlers = createInterchangeHandlers(db, () => { throw new Error('log sink down'); }), res = response();
  await handlers.importGedcom(request({ text: SOURCE }), res); assert.equal(res.code, 201);
});

test('import and export leave durable metadata-only trail entries; a failed import leaves none', async () => {
  const f = fixture(), exported = response(); await f.handlers.exportGedcom(request(undefined), exported);
  const imported = response(); await f.handlers.importGedcom(request({ text: SOURCE }), imported);
  assert.deepEqual(f.audits.map(({ details, ...entry }) => [entry.action, entry.entity, entry.treeId, entry.actorId, details]), [
    ['gedcom.export', 'gedcom', 'tree-a', 'member', { people: 1 }], ['gedcom.import', 'gedcom', 'tree-a', 'member', { people: 3, relationships: 3, warnings: 0 }],
  ]);
  assert.equal(/Imported|Existing Person/.test(JSON.stringify(f.audits)), false, 'names never enter the trail');
  const failed = fixture({ failure: 'P2034' }); await failed.handlers.importGedcom(request({ text: SOURCE }), response()); assert.equal(failed.audits.length, 0);
  const denied = fixture({ role: 'viewer' }); await denied.handlers.importGedcom(request({ text: SOURCE }), response()); assert.equal(denied.audits.length, 0);
});

test('import: a retry with the same key returns the committed result instead of importing again', async () => {
  const f = fixture(), key = 'retry-key-0001', body = { text: SOURCE, idempotencyKey: key };
  const first = response(); await f.handlers.importGedcom(request(body), first);
  assert.equal(first.code, 201); assert.equal(f.writes.filter(item => item[0] === 'member.createMany').length, 1); assert.equal(f.keys.size, 1);
  const retry = response(); await f.handlers.importGedcom(request(body), retry);
  assert.equal(retry.code, 200); assert.equal(retry.body.replayed, true); assert.deepEqual(retry.body.imported, first.body.imported);
  assert.equal(f.writes.filter(item => item[0] === 'member.createMany').length, 1, 'nothing was written twice'); assert.equal(f.audits.filter(entry => entry.action === 'gedcom.import').length, 1);
  const other = response(); await f.handlers.importGedcom(request({ text: SOURCE.replace('/Child/', '/Kid/'), idempotencyKey: key }), other);
  assert.equal(other.code, 422); assert.match(other.body.error, /different file/); assert.equal(f.writes.filter(item => item[0] === 'member.createMany').length, 1);
  const anotherUser = response(); await f.handlers.importGedcom({ ...request(body), user: { id: 'other' } }, anotherUser); assert.equal(anotherUser.code, 403, 'a key is never a way around permissions');
  const bad = response(); await f.handlers.importGedcom(request({ text: SOURCE, idempotencyKey: 'short' }), bad); assert.equal(bad.code, 400);
});

test('import: a concurrent duplicate key is refused rather than importing twice', async () => {
  const f = fixture({ failure: 'P2002' }), res = response(); await f.handlers.importGedcom(request({ text: SOURCE, idempotencyKey: 'retry-key-0002' }), res);
  assert.equal(res.code, 409); assert.match(res.body.error, /already running or has finished/); assert.equal(f.writes.length, 0);
});
