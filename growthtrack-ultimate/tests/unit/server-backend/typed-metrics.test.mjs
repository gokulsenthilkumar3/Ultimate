import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { metricPayload, metricToClient } from '../../../server/domains/metricPayload.js';
import { healthProfilePayload, healthProfileData } from '../../../server/domains/healthProfile.js';
import MetricLogController from '../../../server/controllers/MetricLogController.js';
import { BODY_METRIC_RANGES } from '../../../src/lib/bodyMetricContract.js';
import { migratedFixture, request, call } from './fixture.mjs';

const migrations = new URL('../../../prisma/migrations/', import.meta.url);
const target = '20261102140000_typed_metrics';
function baseline() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const name of fs.readdirSync(migrations).sort()) {
    const file = new URL(`${name}/migration.sql`, migrations);
    if (name < target && fs.existsSync(file)) db.exec(fs.readFileSync(file, 'utf8'));
  }
  db.exec("INSERT INTO User(id,email,passwordHash,fullName,referralCode,updatedAt) VALUES ('u','u@example.test','hash','User','u',CURRENT_TIMESTAMP)");
  return db;
}
const migrate = db => db.exec(fs.readFileSync(new URL(`${target}/migration.sql`, migrations), 'utf8'));
function metricRow(db, id) {
  const row = db.prepare('SELECT * FROM MetricLog WHERE id=?').get(id);
  row.measurements = db.prepare('SELECT * FROM MetricMeasurement WHERE metricLogId=?').all(id).map(row => ({ ...row, booleanValue: row.booleanValue == null ? null : Boolean(row.booleanValue) }));
  return row;
}
function healthRow(db, id) {
  return { ...db.prepare('SELECT * FROM health_profiles WHERE id=?').get(id),
    senses: db.prepare('SELECT * FROM HealthSense WHERE profileId=?').all(id),
    specialized: db.prepare('SELECT * FROM HealthSpecialized WHERE profileId=? ORDER BY position').all(id),
    recoveryMetrics: db.prepare('SELECT * FROM HealthRecoveryMetric WHERE profileId=? ORDER BY position').all(id).map(row => ({ ...row, booleanValue: row.booleanValue == null ? null : Boolean(row.booleanValue) })),
  };
}

test('populated metric backfill promotes scalar metadata and readings without changing timestamps', () => {
  const db = baseline();
  try {
    const metadata = { type: 'strength', exercise: 'Squat', weight: '75.5', reps: 5, sets: 3, note: 'steady', photo_url: null, label: 'Check-in', stringValue: 'ready', logged_at: '2026-11-01T10:30:00+05:30', chest: '99', customFlag: false, absentValue: null, metrics: { waist: 82, hairStyle: 'short', consent: false, empty: null, invalid: { extension: [1, 2] } }, avatarSnapshot: { version: 2, morphs: [0.2] } };
    db.prepare('INSERT INTO MetricLog(id,userId,data,createdAt,updatedAt) VALUES (?,?,?, ?,?)').run('m','u',JSON.stringify(metadata),'2026-10-01 10:00:00','2026-10-02 10:00:00');
    db.prepare('INSERT INTO MetricLog(id,userId,data) VALUES (?,?,?)').run('broken','u','{malformed');
    migrate(db);
    const row = metricRow(db, 'm');
    assert.equal(row.weight, 75.5);
    assert.equal(row.reps, 5);
    assert.equal(row.stringValue, 'ready');
    assert.equal(row.updatedAt, '2026-10-02 10:00:00');
    const restored = metricToClient(row);
    assert.equal(restored.chest, 99);
    assert.equal(restored.customFlag, false);
    assert.equal(restored.absentValue, null);
    assert.deepEqual(restored.metrics, { waist: 82, hairStyle: 'short', consent: false, empty: null, invalid: { extension: [1, 2] } });
    assert.equal(restored.note, 'steady');
    assert.equal(restored.logged_at, '2026-11-01T05:00:00.000Z');
    assert.deepEqual(JSON.parse(row.data), { metrics: { invalid: { extension: [1, 2] } }, avatarSnapshot: { version: 2, morphs: [0.2] } });
    assert.equal(metricRow(db, 'broken').data, '{malformed');
    db.exec("DELETE FROM MetricLog WHERE id='m'");
    assert.equal(db.prepare('SELECT count(*) AS n FROM MetricMeasurement').get().n, 0);
  } finally { db.close(); }
});

test('metric payload writes typed scalars, preserves zero/false/null, and does not clear a value on a note-only update', () => {
  const payload = metricPayload({ type: 'strength', value: 75, weight: '75', reps: '5', sets: 0, note: 'steady', stringValue: 'ready', logged_at: '2026-11-01T05:00:00Z', chest: 99, customFlag: false, metrics: { waist: 82, enabled: false, missing: null }, avatarSnapshot: { version: 2 } });
  assert.equal(payload.metric, 'strength');
  assert.equal(payload.weight, 75);
  assert.equal(payload.sets, 0);
  assert.equal(payload.stringValue, 'ready');
  assert.ok(payload.measuredAt instanceof Date);
  assert.deepEqual(JSON.parse(payload.data), { avatarSnapshot: { version: 2 } });
  const row = { id: 'm', userId: 'u', ...payload, measurements: payload.measurements.create };
  const updated = metricPayload({ note: 'changed', metrics: { waist: 81 } }, row);
  assert.equal(updated.value, 75);
  assert.equal(updated.notes, 'changed');
  assert.deepEqual(updated.measurements.deleteMany, {});
  assert.equal(updated.measurements.create.find(row => row.key === 'enabled').booleanValue, false);
  assert.equal(updated.measurements.create.find(row => row.key === 'waist').value, 81);
  for (const invalid of [{ value: Infinity }, { confidence: 1.1 }, { reps: 1.5 }, { weight: false }, { stringValue: {} }, { measuredAt: 'not a date' }]) assert.throws(() => metricPayload(invalid), error => error.status === 400);
});

test('unconvertible legacy metric values survive partial edits in residual JSON', () => {
  const old = { id: 'm', userId: 'u', value: 4, weight: null, type: null, data: JSON.stringify({ weight: 'unknown', chest: 'unrecorded', metrics: { waist: 'unrecorded' }, extra: { keep: true } }), measurements: [] };
  const updated = metricPayload({ notes: 'new note' }, old);
  assert.equal(updated.value, 4);
  assert.equal(updated.notes, 'new note');
  assert.equal(JSON.parse(updated.data).weight, 'unknown');
  assert.equal(JSON.parse(updated.data).chest, 'unrecorded');
  assert.equal(JSON.parse(updated.data).metrics.waist, 'unrecorded');
});

test('health backfill normalizes structured children, keeping malformed and extension properties', () => {
  const db = baseline();
  try {
    const metadata = { lifestyle: { posture: 'Neutral', broncoTest: '5:45', diets: ['vegetarian'], hobbies: ['walking'], custom: false }, senses: { vision: { level: 0, note: null, currentPower: '20/20', targetPower: '20/20', color: '#fff', exercises: ['focus'], extension: { retained: true } }, custom: false }, specialized: [{ name: 'Custom', score: 0, color: null, extra: false }], recoveryMetrics: [{ id: 'r', name: 'Readiness', value: false, status: 'Pending', details: { keep: true } }, { id: 'r2', name: null, value: null, status: null }], other: { nested: [1] } };
    db.prepare('INSERT INTO health_profiles(id,userId,data,updatedAt) VALUES (?,?,?,?)').run('h','u',JSON.stringify(metadata),'2026-10-02 10:00:00');
    migrate(db);
    const row = healthRow(db, 'h');
    const restored = healthProfileData(row);
    assert.equal(row.posture, 'Neutral');
    assert.equal(row.updatedAt, '2026-10-02 10:00:00');
    assert.deepEqual(restored.lifestyle, metadata.lifestyle);
    assert.equal(restored.senses.vision.level, 0);
    assert.equal(restored.senses.vision.note, null);
    assert.deepEqual(restored.senses.vision.extension, { retained: true });
    assert.equal(restored.senses.custom, false);
    assert.equal(restored.specialized[0].extra, false);
    assert.equal(restored.recoveryMetrics[0].value, false);
    assert.equal(restored.recoveryMetrics[1].value, null);
    assert.deepEqual(JSON.parse(row.data), { lifestyle: { custom: false }, senses: { custom: false }, other: { nested: [1] } });
    db.exec("DELETE FROM health_profiles WHERE id='h'");
    for (const table of ['HealthSense','HealthSpecialized','HealthRecoveryMetric']) assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
  } finally { db.close(); }
});

test('health writes remove promoted data and retain custom properties, zero, false and null', () => {
  const payload = healthProfilePayload({ lifestyle: { posture: null, diets: [], custom: false }, recoveryMetrics: [{ id: 'r', name: '', value: false, status: 'Pending', custom: null }], senses: { vision: { level: 0, note: null, exercises: [], custom: false } } });
  assert.equal(payload.posture, null);
  assert.equal(payload.diets, '[]');
  assert.deepEqual(JSON.parse(payload.data), { lifestyle: { custom: false } });
  assert.deepEqual(JSON.parse(payload.recoveryMetrics.create[0].data), { custom: null });
  assert.equal(payload.recoveryMetrics.create[0].booleanValue, false);
  assert.deepEqual(JSON.parse(payload.senses.create[0].data), { custom: false });
  const current = { data: '{"lifestyle":{"diets":false,"custom":0}}', posture: 'Old', senses: [], specialized: [], recoveryMetrics: [] };
  assert.deepEqual(JSON.parse(healthProfilePayload({ lifestyle: { posture: 'New' } }, current).data), { lifestyle: { diets: false, custom: 0 } });
});

test('metric controller preserves nested writes and optimistic ownership filters', async () => {
  let created;
  let updated;
  const current = { id: 'm', userId: 'u', metric: 'weight', value: 75, data: '{}', updatedAt: new Date('2026-10-01T00:00:00Z'), measurements: [] };
  const model = { create: async options => { created = options; return { ...current, ...options.data, measurements: options.data.measurements.create }; }, findFirst: async options => { assert.ok(options.include.measurements); return current; }, update: async options => { updated = options; return current; } };
  const controller = new MetricLogController(model, 'metric_logs');
  const res = () => ({ statusCode: 200, status(value) { this.statusCode=value; return this; }, json(value) { this.body=value; return this; } });
  await controller.create({ user: { id: 'u' }, body: { value: 75, measuredAt: '2026-11-01T00:00:00Z', metrics: { waist: 82 } } }, res());
  assert.ok(created.data.measuredAt instanceof Date);
  assert.equal(created.data.measurements.create[0].value, 82);
  const response = res();
  await controller.update({ user: { id: 'u' }, params: { id: 'm' }, body: { notes: 'new' } }, response);
  assert.equal(updated.data.value, 75);
  assert.equal(updated.where.userId, 'u');
  assert.equal(updated.where.updatedAt, current.updatedAt);
  assert.deepEqual(updated.data.measurements.deleteMany, {});
  assert.equal(response.body.count, 1);
});

test('every supported head-to-foot measurement creates typed history rows with its unit and reloads without scalar JSON', async t => {
  const { prisma } = await migratedFixture(t);
  const metrics = Object.fromEntries(Object.entries(BODY_METRIC_RANGES).map(([key, range]) => [key, (range.min + range.max) / 2]));
  const controller = new MetricLogController(prisma.metricLog, 'metric_logs');
  const created = await call(controller.create.bind(controller), request({ id: 'full-body', metric: 'body_checkin', date: '2026-11-03', metrics, notes: 'Synthetic measurement record', avatarSnapshot: { format: 'custom', channels: [0.25] } }));
  assert.equal(created.statusCode, 200, JSON.stringify(created.body));
  const row = await prisma.metricLog.findUnique({ where: { id: created.body.id }, include: { measurements: true } });
  assert.equal(row.measurements.length, Object.keys(metrics).length);
  assert.deepEqual(JSON.parse(row.data), { avatarSnapshot: { format: 'custom', channels: [0.25] } });
  for (const [key, value] of Object.entries(metrics)) {
    const reading = row.measurements.find(reading => reading.key === key);
    assert.equal(reading.value, value, key);
    assert.equal(reading.unit, BODY_METRIC_RANGES[key].unit, key);
    assert.equal(reading.valueType, 'number', key);
  }
  const reloaded = (await call(controller.getAll.bind(controller), request())).body[0];
  assert.deepEqual(reloaded.metrics, metrics);
  const updated = await call(controller.update.bind(controller), request({ metrics: { headCirc: 58, footLength: 27 }, expectedUpdatedAt: row.updatedAt.toISOString() }, 'owner-a', row.id));
  assert.equal(updated.statusCode, 200);
  const after = await prisma.metricLog.findUnique({ where: { id: row.id }, include: { measurements: true } });
  assert.deepEqual(metricToClient(after).metrics, { ...metrics, headCirc: 58, footLength: 27 });
  const denied = await call(controller.update.bind(controller), request({ metrics: { headCirc: 60 } }, 'owner-b', row.id));
  assert.equal(denied.statusCode, 404);
  const stale = await call(controller.update.bind(controller), request({ notes: 'stale' , expectedUpdatedAt: row.updatedAt.toISOString() }, 'owner-a', row.id));
  assert.equal(stale.statusCode, 409);
  const profile = await prisma.bodyProfile.create({ data: { userId: 'owner-a', heightCm: 175, headCircCm: 58, handLengthCm: 19, footLengthCm: 27, targetWeightKg: 72 } });
  const saved = await prisma.bodyProfile.findUnique({ where: { userId: 'owner-a' } });
  for (const key of ['heightCm','headCircCm','handLengthCm','footLengthCm','targetWeightKg']) assert.equal(saved[key], profile[key]);
});
