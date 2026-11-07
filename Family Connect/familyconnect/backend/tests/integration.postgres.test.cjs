/**
 * Real PostgreSQL checks for what injected-database tests cannot prove: migration defaults, foreign keys,
 * transaction rollback, serializable writes and the audit/idempotency tables.
 *
 * Skipped unless FAMILY_TEST_DATABASE_URL points at a DISPOSABLE local database whose name contains
 * "test" (host 127.0.0.1 or localhost). Apply the migrations to it first:
 *   DATABASE_URL=<that url> npx prisma migrate deploy
 * Never point this at a database that holds family records: it creates and deletes its own rows only,
 * but the safety check below refuses anything that does not look disposable.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

process.env.REDIS_DISABLED = '1';
const url = process.env.FAMILY_TEST_DATABASE_URL || '';
const disposable = /^postgres(?:ql)?:\/\/[^@/]+@(?:127\.0\.0\.1|localhost)(?::\d+)?\/[^/?]*test[^/?]*$/i.test(url);
const skip = disposable ? false : 'Set FAMILY_TEST_DATABASE_URL to a disposable local database named *test* (see docs/plans/2026-11-07-family-completion.md).';
if (disposable) process.env.DATABASE_URL = url; // controllers that own a module-level client connect to the same disposable database

const response = () => ({ code: 200, headers: {}, status(code) { this.code = code; return this; }, set(name, value) { this.headers[name] = value; return this; }, json(body) { this.body = body; return this; } });
const d = value => new Date(value + 'T00:00:00Z');

test('Family against a real PostgreSQL', { skip }, async t => {
  const { PrismaClient } = require('@prisma/client');
  const { buildGedcom, parseGedcom } = require('../dist/services/gedcom');
  const { createInterchangeHandlers } = require('../dist/controllers/interchange.controller');
  const { createAuditReader } = require('../dist/controllers/audit.controller');
  const { createRecordMutationHandlers } = require('../dist/controllers/recordMutations.controller');
  const { createPersonHandler, updateMember } = require('../dist/controllers/members.controller');
  const { createRelationshipHandler } = require('../dist/controllers/relationships.controller');
  const { createTree, inviteUserToTree } = require('../dist/controllers/trees.controller');
  const { createEvent } = require('../dist/controllers/events.controller');
  const { memberWhere } = require('../dist/services/recordFilters');
  const { generateUpcomingBirthdayNotifications } = require('../dist/services/cron.service');

  const prisma = new PrismaClient({ datasourceUrl: url });
  const tag = randomUUID().slice(0, 8), id = name => `${name}-${tag}`;
  const users = { admin: id('admin'), editor: id('editor'), viewer: id('viewer'), stranger: id('stranger'), invitee: id('invitee') };
  const treeIds = [];
  const audit = [], silent = event => audit.push(event);
  const req = (user, extra = {}) => ({ user: user ? { id: users[user] || user } : undefined, params: {}, query: {}, body: {}, ...extra });

  for (const [role, userId] of Object.entries(users)) await prisma.user.create({ data: { id: userId, email: `${role}.${tag}@example.invalid`, passwordHash: 'not-a-real-hash', name: `Fictional ${role}` } });
  const tree = await prisma.familyTree.create({ data: { id: id('tree'), name: 'Fictional integration tree', ownerId: users.admin, accessControl: { create: [{ userId: users.admin, role: 'admin' }, { userId: users.editor, role: 'editor' }, { userId: users.viewer, role: 'viewer' }] } } });
  treeIds.push(tree.id);
  t.after(async () => {
    await prisma.auditLog.deleteMany({ where: { OR: [{ treeId: { in: treeIds } }, { actorId: { in: Object.values(users) } }] } });
    await prisma.idempotencyKey.deleteMany({ where: { userId: { in: Object.values(users) } } });
    await prisma.notification.deleteMany({ where: { userId: { in: Object.values(users) } } });
    await prisma.familyTree.deleteMany({ where: { id: { in: treeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(users) } } });
    await prisma.$disconnect();
  });
  const members = where => prisma.member.findMany({ where: { treeId: tree.id, ...where }, orderBy: { name: 'asc' } });

  await t.test('migration defaults keep rows written by older code exact and living', async () => {
    await prisma.$executeRawUnsafe(`INSERT INTO members (id, "treeId", name, "createdById", "updatedAt") VALUES ($1, $2, 'Fictional legacy writer', $3, NOW())`, id('legacy'), tree.id, users.admin);
    const row = await prisma.member.findUniqueOrThrow({ where: { id: id('legacy') } });
    assert.deepEqual([row.birthDatePrecision, row.birthDateApproximate, row.deathDatePrecision, row.deathDateApproximate, row.deathRecorded], ['day', false, 'day', false, false]);
  });

  await t.test('GEDCOM import stores precision, relationships and the trail atomically, and a retry does not import twice', async () => {
    const source = buildGedcom({
      people: [
        { id: 'a', name: 'Fictional Parent', gender: 'male', birthDate: d('1950-03-12') },
        { id: 'b', name: 'Fictional Partner', gender: 'female', birthDate: d('1952-01-01'), birthDatePrecision: 'year', birthDateApproximate: true, deathRecorded: true },
        { id: 'c', name: 'Fictional Child', birthDate: d('1980-05-01'), birthDatePrecision: 'month', deathDate: d('2001-01-01'), deathDatePrecision: 'year' },
      ],
      relationships: [{ member1Id: 'a', member2Id: 'b', type: 'spouse', marriageDate: d('1975-06-01') }, { member1Id: 'a', member2Id: 'c', type: 'parent', customLabel: 'Adoptive parent' }, { member1Id: 'b', member2Id: 'c', type: 'parent', customLabel: 'Adoptive parent' }],
    }).text;
    const handlers = createInterchangeHandlers(prisma, silent), key = `retry-${tag}-0001`;
    const first = response(); await handlers.importGedcom(req('editor', { params: { id: tree.id }, body: { text: source, idempotencyKey: key } }), first);
    assert.equal(first.code, 201, JSON.stringify(first.body));
    const byName = Object.fromEntries((await members({ name: { startsWith: 'Fictional ' } })).filter(row => ['Parent', 'Partner', 'Child'].some(word => row.name.endsWith(word))).map(row => [row.name, row]));
    assert.deepEqual([byName['Fictional Partner'].birthDatePrecision, byName['Fictional Partner'].birthDateApproximate, byName['Fictional Partner'].deathRecorded, byName['Fictional Partner'].deathDate], ['year', true, true, null]);
    assert.deepEqual([byName['Fictional Child'].birthDatePrecision, byName['Fictional Child'].deathDatePrecision, byName['Fictional Child'].deathRecorded], ['month', 'year', false]);
    const links = await prisma.relationship.findMany({ where: { treeId: tree.id } });
    assert.deepEqual(links.map(link => link.type).sort(), ['parent', 'parent', 'spouse']);
    assert.ok(links.every(link => [link.member1Id, link.member2Id].every(memberId => Object.values(byName).some(row => row.id === memberId))));
    assert.deepEqual(links.filter(link => link.type === 'parent').map(link => link.customLabel), ['Adoptive parent', 'Adoptive parent'], 'a shared pedigree survives as a label on both parent links');
    assert.equal((await prisma.auditLog.findMany({ where: { treeId: tree.id, action: 'gedcom.import' } })).length, 1);
    assert.equal(await prisma.idempotencyKey.count({ where: { userId: users.editor, key } }), 1);
    const before = await prisma.member.count({ where: { treeId: tree.id } });
    const retry = response(); await handlers.importGedcom(req('editor', { params: { id: tree.id }, body: { text: source, idempotencyKey: key } }), retry);
    assert.equal(retry.code, 200); assert.equal(retry.body.replayed, true); assert.equal(await prisma.member.count({ where: { treeId: tree.id } }), before, 'the retry wrote nothing');
    const blocked = response(); await handlers.importGedcom(req('editor', { params: { id: tree.id }, body: { text: source } }), blocked);
    assert.equal(blocked.code, 409); assert.equal(blocked.body.code, 'DUPLICATES'); assert.equal(await prisma.member.count({ where: { treeId: tree.id } }), before);
    const denied = response(); await handlers.importGedcom(req('viewer', { params: { id: tree.id }, body: { text: source } }), denied); assert.equal(denied.code, 403);
  });

  await t.test('a failure part-way through an import rolls back people, the trail and the retry key', async () => {
    const before = { members: await prisma.member.count({ where: { treeId: tree.id } }), audits: await prisma.auditLog.count({ where: { treeId: tree.id } }) };
    const failing = { $transaction: (callback, options) => prisma.$transaction(tx => callback(new Proxy(tx, { get: (target, prop) => (prop === 'relationship' ? new Proxy(target.relationship, { get: (inner, name) => (name === 'createMany' ? async () => { throw new Error('simulated failure after people were written'); } : inner[name]) }) : target[prop]) })), options), auditLog: prisma.auditLog };
    const source = ['0 HEAD', '0 @I1@ INDI', '1 NAME Rollback /Probe/', '0 @I2@ INDI', '1 NAME Rollback /Twin/', '0 @F1@ FAM', '1 HUSB @I1@', '1 CHIL @I2@', '0 TRLR'].join('\n');
    const res = response(); await createInterchangeHandlers(failing, silent).importGedcom(req('editor', { params: { id: tree.id }, body: { text: source, idempotencyKey: `rollback-${tag}` } }), res);
    assert.equal(res.code, 500);
    assert.equal(await prisma.member.count({ where: { treeId: tree.id } }), before.members, 'no person survived the failure');
    assert.equal(await prisma.auditLog.count({ where: { treeId: tree.id } }), before.audits, 'no trail entry survived the failure');
    assert.equal(await prisma.idempotencyKey.count({ where: { key: `rollback-${tag}` } }), 0, 'the key is free for a real retry');
  });

  await t.test('export round trips what the database holds, including precision and an undated death', async () => {
    const res = response(); await createInterchangeHandlers(prisma, silent).exportGedcom(req('viewer', { params: { id: tree.id } }), res);
    assert.equal(res.code, 200); assert.ok(res.body.gedcom.includes('1 DEAT Y\r\n')); assert.ok(res.body.gedcom.includes('2 DATE ABT 1952\r\n'));
    const parsed = parseGedcom(res.body.gedcom), rows = await members({});
    assert.equal(parsed.people.length, rows.length); assert.deepEqual(parsed.errors, []);
    const partner = parsed.people.find(person => person.name === 'Fictional Partner');
    assert.deepEqual([partner.birthDate, partner.birthDatePrecision, partner.birthDateApproximate, partner.deathRecorded], ['1952-01-01', 'year', true, true]);
    const stranger = response(); await createInterchangeHandlers(prisma, silent).exportGedcom(req('stranger', { params: { id: tree.id } }), stranger); assert.equal(stranger.code, 403);
  });

  await t.test('profile writes normalize certainty, refuse certainty without a date, and leave trail entries', async () => {
    const person = await prisma.member.create({ data: { treeId: tree.id, createdById: users.admin, name: 'Fictional Edit Target', birthDate: d('1960-04-04'), deathDate: d('2020-02-02') } });
    const call = async body => { const res = response(); await updateMember(req('editor', { params: { id: person.id }, body }), res); return res; };
    let res = await call({ birthDate: '1960-04-27', birthDatePrecision: 'month' }); assert.equal(res.code, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.birthDate.toISOString().slice(0, 10), res.body.birthDatePrecision], ['1960-04-01', 'month']);
    res = await call({ deathDate: '', deathRecorded: true }); assert.deepEqual([res.body.deathDate, res.body.deathRecorded, res.body.deathDatePrecision], [null, true, 'day']);
    res = await call({ deathDatePrecision: 'year' }); assert.equal(res.code, 400, 'certainty without a date is refused');
    res = await call({ name: 'Fictional Edit Target' }); assert.equal(res.body.deathRecorded, true, 'untouched fields stay as they were');
    const trail = await prisma.auditLog.findMany({ where: { entityId: person.id }, orderBy: { createdAt: 'asc' } });
    assert.deepEqual(trail.map(row => row.action), ['member.update', 'member.update', 'member.update']);
    assert.deepEqual(trail.map(row => row.details.fields), [['birthDate', 'birthDatePrecision'], ['deathDate', 'deathRecorded'], ['name']]);
    const viewer = response(); await updateMember(req('viewer', { params: { id: person.id }, body: { name: 'Nope' } }), viewer); assert.equal(viewer.code, 403);
    assert.equal(await prisma.auditLog.count({ where: { entityId: person.id } }), 3, 'a refused change leaves no entry');
  });

  await t.test('living and deceased filters and birthday reminders agree on who has died', async () => {
    const make = (name, extra) => prisma.member.create({ data: { treeId: tree.id, createdById: users.admin, name, ...extra } });
    const now = new Date(), soon = new Date(Date.UTC(1990, now.getUTCMonth(), now.getUTCDate() + 2));
    const [living, dated, recorded, yearOnly, guess] = await Promise.all([
      make('Reminder Living', { birthDate: soon }), make('Reminder Dated Death', { birthDate: soon, deathDate: d('2020-01-01') }), make('Reminder Recorded Death', { birthDate: soon, deathRecorded: true }),
      make('Reminder Year Only', { birthDate: new Date(Date.UTC(1990, 0, 1)), birthDatePrecision: 'year' }), make('Reminder Guess', { birthDate: soon, birthDateApproximate: true }),
    ]);
    const names = async life => (await prisma.member.findMany({ where: { ...memberWhere(tree.id, { life, search: 'Reminder' }) }, orderBy: { name: 'asc' } })).map(row => row.name);
    assert.deepEqual(await names('living'), ['Reminder Guess', 'Reminder Living', 'Reminder Year Only']);
    assert.deepEqual(await names('deceased'), ['Reminder Dated Death', 'Reminder Recorded Death']);
    assert.equal((await names('all')).length, 5);
    await generateUpcomingBirthdayNotifications(prisma, now);
    const sent = (await prisma.notification.findMany({ where: { userId: users.admin } })).map(row => row.message).join('\n');
    assert.ok(sent.includes('Reminder Living'), 'an exact living birthday is announced');
    for (const excluded of ['Reminder Dated Death', 'Reminder Recorded Death', 'Reminder Year Only', 'Reminder Guess']) assert.equal(sent.includes(excluded), false, excluded);
    assert.ok(living && dated && recorded && yearOnly && guess);
  });

  await t.test('creating records, access grants, trees and deletions each write one metadata-only entry in the same transaction', async () => {
    const person = response(); await createPersonHandler(prisma)(req('editor', { body: { treeId: tree.id, name: 'Fictional Created', birthDate: '1990-01-01', birthDatePrecision: 'year', markAsMe: true } }), person);
    assert.equal(person.code, 201, JSON.stringify(person.body)); assert.equal(person.body.birthDatePrecision, 'year');
    const other = await prisma.member.create({ data: { treeId: tree.id, createdById: users.admin, name: 'Fictional Other' } });
    const link = response(); await createRelationshipHandler(prisma)(req('editor', { body: { treeId: tree.id, member1Id: person.body.id, member2Id: other.id, type: 'sibling' } }), link); assert.equal(link.code, 201);
    const event = response(); await createEvent(req('editor', { body: { treeId: tree.id, memberId: person.body.id, type: 'achievement', title: 'Fictional milestone', date: '2020-01-01' } }), event); assert.equal(event.code, 201);
    const made = response(); await createTree(req('invitee', { body: { name: 'Fictional second tree' } }), made); assert.equal(made.code, 201); treeIds.push(made.body.id);
    const invited = response(); await inviteUserToTree(req('invitee', { params: { id: made.body.id }, body: { email: `viewer.${tag}@example.invalid`, role: 'viewer' } }), invited); assert.equal(invited.code, 200);
    const rows = await prisma.auditLog.findMany({ where: { OR: [{ entityId: { in: [person.body.id, link.body.id, event.body.id, made.body.id, users.viewer] } }] } });
    const seen = Object.fromEntries(rows.map(row => [row.action, row]));
    assert.deepEqual(Object.keys(seen).sort(), ['access.grant', 'event.create', 'member.create', 'relationship.create', 'tree.create']);
    assert.deepEqual(seen['member.create'].details, { connected: false }); assert.deepEqual(seen['access.grant'].details, { role: 'viewer' }); assert.equal(seen['tree.create'].treeId, made.body.id);
    assert.equal(/Fictional|2020|1990/.test(JSON.stringify(rows.map(row => row.details))), false, 'no names or dates in details');

    const handlers = createRecordMutationHandlers(prisma, async () => {}, silent), remove = response();
    await handlers.deleteMember(req('admin', { params: { id: person.body.id }, body: { confirm: person.body.id } }), remove);
    assert.equal(remove.code, 200); assert.equal(await prisma.member.count({ where: { id: person.body.id } }), 0); assert.equal(await prisma.relationship.count({ where: { id: link.body.id } }), 0, 'connections went with the person');
    assert.equal(await prisma.auditLog.count({ where: { entityId: person.body.id, action: 'member.delete' } }), 1);
    assert.equal(await prisma.auditLog.count({ where: { entityId: person.body.id } }) >= 2, true, 'the trail outlives the record it describes');
    const forbidden = response(); await handlers.deleteMember(req('editor', { params: { id: other.id }, body: { confirm: other.id } }), forbidden); assert.equal(forbidden.code, 403); assert.equal(await prisma.member.count({ where: { id: other.id } }), 1);
  });

  await t.test('only tree admins can read the trail, and entries cannot name another tree', async () => {
    const read = createAuditReader(prisma), asAdmin = response(); await read(req('admin', { params: { id: tree.id } }), asAdmin);
    assert.equal(asAdmin.code, 200); assert.ok(asAdmin.body.total >= 5); assert.ok(asAdmin.body.rows.every(row => !('treeId' in row)));
    const times = asAdmin.body.rows.map(row => new Date(row.createdAt).getTime()); assert.deepEqual(times, [...times].sort((a, b) => b - a), 'newest first');
    for (const role of ['editor', 'viewer', 'stranger']) { const denied = response(); await read(req(role, { params: { id: tree.id } }), denied); assert.equal(denied.code, 403, role); }
  });
});
