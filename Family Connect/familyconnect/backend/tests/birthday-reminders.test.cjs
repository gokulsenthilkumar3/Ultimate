const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Prisma } = require('@prisma/client');

// Run the actual compiled scheduler with an isolated database and clock.
function loadJob(database) {
  let scheduled;
  const errors = [], exports = {};
  const sandbox = { exports, console: { log() {}, error(...args) { errors.push(args); } },
    require(name) {
      if (name === 'node-cron') return { schedule(_expression, handler) { scheduled = handler; } };
      if (name === '@prisma/client') return { PrismaClient: function () { return database; } };
      return require(name);
    }, Date, Set, Map,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/services/cron.service.js'), 'utf8'), sandbox);
  return { api: exports, errors, run: async () => { exports.startCronJobs(); await scheduled(); } };
}

test('scheduled reminder queries only fields in the generated Member schema', async () => {
  const fields = new Set(Prisma.dmmf.datamodel.models.find(model => model.name === 'Member').fields.map(field => field.name));
  let where;
  const job = loadJob({ member: { findMany: async input => {
    where = input.where;
    for (const name of Object.keys(where)) assert.ok(fields.has(name), `Unknown Member field: ${name}`);
    return [];
  } } });
  await job.run();
  assert.equal(job.errors.length, 0, job.errors.map(args => args.map(String).join(' ')).join('\n'));
  assert.equal(where.deathDate, null);
  assert.ok(where.birthDate);
});

const { schemaShape } = require('../scripts/check-schema.cjs');
test('generated Prisma schema matches the checked-in schema', () => {
  const canonical = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8');
  const generated = fs.readFileSync(path.join(__dirname, '../node_modules/.prisma/client/schema.prisma'), 'utf8');
  assert.deepEqual(schemaShape(generated), schemaShape(canonical), 'Run prisma:generate from the canonical Family schema before building.');
});

test('birthday dates handle year/month boundaries, leap days and exclude out-of-window dates', () => {
  const { upcomingBirthday } = loadJob({}).api;
  const date = text => new Date(text + 'T00:00:00Z');
  const result = (birth, today) => JSON.parse(JSON.stringify(upcomingBirthday(date(birth), date(today))));
  assert.deepEqual(result('2000-01-02', '2026-12-29'), { daysUntil: 4, ageTurning: 27 });
  assert.deepEqual(result('2000-03-01', '2026-02-27'), { daysUntil: 2, ageTurning: 26 });
  assert.deepEqual(result('2000-02-29', '2027-02-28'), { daysUntil: 0, ageTurning: 27 });
  assert.deepEqual(result('2000-02-29', '2028-02-28'), { daysUntil: 1, ageTurning: 28 });
  assert.deepEqual(result('2000-11-14', '2026-11-07'), { daysUntil: 7, ageTurning: 26 });
  assert.equal(result('2000-11-15', '2026-11-07'), null);
  assert.equal(result('2030-11-07', '2026-11-07'), null);
  assert.equal(upcomingBirthday(new Date('invalid'), date('2026-11-07')), null);
});

test('only living upcoming members notify admins/heads and reruns do not repeat daily reminders', async () => {
  const notifications = [], accessControl = ['admin','family_head','editor','viewer'].map(role => ({ userId: role, role }));
  const now = new Date('2026-12-29T12:00:00Z');
  const database = {
    member: { findMany: async () => [
      { id: 'living', name: 'Fictional person', birthDate: new Date('2000-01-02T00:00:00Z'), deathDate: null, tree: { accessControl } },
      { id: 'deceased', name: 'Excluded', birthDate: new Date('2000-01-02T00:00:00Z'), deathDate: now, tree: { accessControl } },
    ] },
    notification: {
      findFirst: async ({ where }) => notifications.find(row => row.userId === where.userId && row.message === where.message && row.title === where.title),
      create: async ({ data }) => { notifications.push(data); return data; },
    },
  };
  const job = loadJob(database).api;
  assert.equal((await job.generateUpcomingBirthdayNotifications(database, now)).created, 2);
  assert.equal((await job.generateUpcomingBirthdayNotifications(database, now)).created, 0);
  assert.deepEqual(notifications.map(row => row.userId), ['admin', 'family_head']);
  assert.match(notifications[0].message, /4 days.*27/);
});
