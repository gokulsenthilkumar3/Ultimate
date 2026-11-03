import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { collectionPayload, collectionToClient } from '../server/collectionPayload.js';
import { collectionChildPayload } from '../server/domains/collectionChildren.js';
import { metricPayload, metricToClient } from '../server/domains/metricPayload.js';
import { prepareUserStructures } from '../server/domains/userStructures.js';
import { PLAN_DOCUMENTS, preparePlanDocuments, planRecordToClient } from '../server/domains/planDocuments.js';

// A reviewable sample from a real, isolated SQLite database. No environment,
// connection string, local product database or personal record is ever read.
const application = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(application, '../.evergreen/ultimate-record-example.json');
const db = new DatabaseSync(':memory:');
try {
  db.exec('PRAGMA foreign_keys=ON');
  db.exec(fs.readFileSync(path.join(application, 'prisma/fresh-schema.sql'), 'utf8'));
  const insert = (table, values) => {
    const entries = Object.entries(values).filter(([, value]) => value !== undefined);
    db.prepare(`INSERT INTO "${table}" (${entries.map(([key]) => `"${key}"`).join(',')}) VALUES (${entries.map(() => '?').join(',')})`)
      .run(...entries.map(([, value]) => value instanceof Date ? value.toISOString() : typeof value === 'boolean' ? Number(value) : value));
  };
  const rows = table => db.prepare(`SELECT * FROM "${table}"`).all();
  insert('User', { id: 'example-owner', email: 'example@example.test', passwordHash: 'synthetic-only', fullName: 'Synthetic example', referralCode: 'example' });

  const goal = { title: 'Read ten books', category: 'learning', status: 'active', target_value: 10, current_value: 2, unit: 'books', deadline: '2026-12-01', is_focus: true, subtasks: [{ id: 'first-book', text: 'Finish the first book', done: true }] };
  insert('Goal', { id: 'example-goal', userId: 'example-owner', ...collectionPayload('goals', goal) });
  for (const row of collectionChildPayload('goals', goal).rows) insert('GoalSubtask', { ...row, goalId: 'example-goal' });

  const { measurements, ...metric } = metricPayload({ metric: 'body_checkin', date: '2026-11-03', metrics: { headCirc: 58, footLength: 27, waist: 82 }, notes: 'Synthetic measurement snapshot' });
  insert('MetricLog', { id: 'example-checkin', userId: 'example-owner', ...metric });
  for (const row of measurements.create) insert('MetricMeasurement', { id: `example-${row.key}`, metricLogId: 'example-checkin', ...row });

  const skill = prepareUserStructures({ skills: [{ id: 'drawing', name: 'Drawing', category: 'creative', xp: 25, weeklyTarget: 3, nextAction: 'Draw a cube', practiceCount: 1 }] }).skills[0];
  insert('user_skills', { id: 'example-skill', userId: 'example-owner', ...skill });

  const writePlan = (definition, prepared, id, parentId) => {
    const values = { id, ...(parentId ? { parentId } : { userId: 'example-owner' }) };
    for (const [key, value] of Object.entries(prepared)) if (!Object.hasOwn(definition.children || {}, key) && key !== 'readings') values[key] = value;
    insert(definition.table, values);
    for (const [key, child] of Object.entries(definition.children || {})) {
      for (const [index, row] of (prepared[key]?.create || []).entries()) writePlan(child, row, `${id}-${key}-${index}`, id);
    }
    for (const [index, row] of (prepared.readings?.create || []).entries()) insert(definition.reading.table, { id: `${id}-reading-${index}`, parentId: id, ...row });
  };
  const definition = PLAN_DOCUMENTS.trainingPlan;
  writePlan(definition, preparePlanDocuments({ trainingPlan: { streak: 1, schedule: [{ id: 'monday', day: 'Mon', muscleGroup: 'Upper', exercises: [{ name: 'Row', sets: 3, reps: 8, weight: 20 }] }], PRs: { row: 20 } } }).trainingPlan, 'example-training');
  const readPlan = (definition, row) => ({ ...row,
    ...Object.fromEntries(Object.entries(definition.children || {}).map(([key, child]) => [key, db.prepare(`SELECT * FROM "${child.table}" WHERE parentId=? ORDER BY position`).all(row.id).map(childRow => readPlan(child, childRow))])),
    ...(definition.maps ? { readings: db.prepare(`SELECT * FROM "${definition.reading.table}" WHERE parentId=?`).all(row.id) } : {}),
  });
  const tables = Object.fromEntries(['Goal', 'GoalSubtask', 'MetricLog', 'MetricMeasurement', 'user_skills', 'training_plans', 'training_days', 'planned_exercises', 'training_personal_records'].map(table => [table, rows(table)]));
  const record = { synthetic: true, description: 'Records created in an in-memory SQLite database through the application payload contracts.', tables,
    reloaded: {
      goal: collectionToClient('goals', { ...tables.Goal[0], is_focus: Boolean(tables.Goal[0].is_focus), subtaskRows: tables.GoalSubtask }),
      metric: metricToClient({ ...tables.MetricLog[0], measurements: tables.MetricMeasurement }),
      trainingPlan: planRecordToClient(readPlan(definition, tables.training_plans[0]), definition),
    },
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Synthetic record snapshot: ${output}`);
} finally { db.close(); }
