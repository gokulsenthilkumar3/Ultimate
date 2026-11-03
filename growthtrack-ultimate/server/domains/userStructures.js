import { randomUUID } from 'node:crypto';
import { writePlanDocuments } from './planDocuments.js';

// Stable user-owned records have relational columns. Only custom extension
// fields remain in data; the old User JSON fields are migration inputs only.
export const USER_STRUCTURES = Object.freeze({
  skills: { model: 'userSkill', table: 'user_skills', fields: {
    name: 'string', category: 'string', xp: 'number', description: 'string',
    weeklyTarget: 'number', resource: 'string', nextAction: 'string',
    lastPracticed: 'string', practiceCount: 'integer',
  } },
  manualProjects: { model: 'manualProject', table: 'manual_projects', fields: {
    title: 'string', description: 'string', stack: 'string', status: 'string',
    url: 'string', startDate: 'string', endDate: 'string',
  } },
  assessmentQA: { model: 'assessmentRound', table: 'assessment_rounds', fields: { round: 'string', color: 'string' } },
  repoNotes: { model: 'repositoryNote', table: 'repository_notes', fields: {} },
});
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const parse = value => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};
function invalid(message, status = 400) { throw Object.assign(new Error(message), { status, code: 'INVALID_USER_RECORDS' }); }
const scalarValid = (value, type) => type === 'string' ? typeof value === 'string'
  : typeof value === 'number' && Number.isFinite(value) && (type !== 'integer' || (Number.isInteger(value) && value >= 0 && value <= 2147483647));

function rowPayload(item, fields) {
  if (!object(item)) invalid('Every record must be an object.');
  const extra = { ...item };
  const row = {};
  for (const [key, type] of Object.entries(fields)) {
    if (item[key] === undefined) continue;
    if (item[key] === null) { row[key] = null; continue; } // retain explicit sparse null in extensions
    if (!scalarValid(item[key], type)) invalid(`${key} must be a finite ${type}.`);
    row[key] = item[key]; delete extra[key];
  }
  for (const [client, column] of [['id', 'clientId'], ['createdAt', 'clientCreatedAt'], ['updatedAt', 'clientUpdatedAt']]) {
    if (item[client] == null) continue;
    if (client === 'id') {
      if (typeof item.id !== 'string' && !(typeof item.id === 'number' && Number.isFinite(item.id))) invalid('Record id must be text or a finite number.');
      row.clientId = String(item.id); row.clientIdType = typeof item.id;
    } else {
      if (typeof item[client] !== 'string') invalid(`${client} must be text.`);
      row[column] = item[client];
    }
    delete extra[client];
  }
  row.data = Object.keys(extra).length ? JSON.stringify(extra) : null;
  return row;
}

export function prepareUserStructures(changes) {
  const prepared = {};
  for (const [key, definition] of Object.entries(USER_STRUCTURES)) {
    if (changes[key] === undefined) continue;
    const value = parse(changes[key]);
    if (Buffer.byteLength(JSON.stringify(value ?? null), 'utf8') > 1024 * 1024) invalid(`${key} is too large.`, 413);
    if (key === 'repoNotes') {
      if (value != null && !object(value)) invalid('Repository notes must be an object keyed by repository id.');
      prepared[key] = Object.entries(value || {}).map(([repositoryId, note]) => {
        if (typeof note !== 'string') invalid('Repository notes must contain text.');
        return { repositoryId, note };
      });
      continue;
    }
    if (value != null && !Array.isArray(value)) invalid(`${key} must be an array.`);
    if ((value || []).length > 10000) invalid(`${key} has too many records.`, 413);
    prepared[key] = (value || []).map((item, position) => {
      const row = rowPayload(item, definition.fields);
      if (key === 'assessmentQA') {
        if (item.items != null && !Array.isArray(item.items)) invalid('Assessment items must be an array.');
        row.answers = (item.items || []).map((answer, index) => {
          const mapped = rowPayload(answer, { key: 'string', q: 'string', a: 'string' });
          const { key: questionKey, q: question, a: answerText, ...metadata } = mapped;
          return { ...metadata, questionKey, question, answer: answerText, position: index };
        });
        const extra = row.data ? JSON.parse(row.data) : {};
        delete extra.items;
        row.data = Object.keys(extra).length ? JSON.stringify(extra) : null;
      }
      return { ...row, position };
    });
  }
  return prepared;
}

function toClient(row, fields) {
  const result = { ...(parse(row.data) || {}) };
  for (const key of Object.keys(fields)) if (row[key] != null) result[key] = row[key];
  if (row.clientId != null) result.id = row.clientIdType === 'number' ? Number(row.clientId) : row.clientId;
  if (row.clientCreatedAt != null) result.createdAt = row.clientCreatedAt;
  if (row.clientUpdatedAt != null) result.updatedAt = row.clientUpdatedAt;
  return result;
}

export async function loadUserStructures(prisma, userId, user = {}) {
  const entries = await Promise.all(Object.entries(USER_STRUCTURES).map(async ([key, definition]) => {
    const rows = await prisma[definition.model].findMany({ where: { userId },
      orderBy: key === 'repoNotes' ? { repositoryId: 'asc' } : { position: 'asc' },
      ...(key === 'assessmentQA' ? { include: { answers: { orderBy: { position: 'asc' } } } } : {}),
    });
    // Malformed historical documents are left untouched by the additive migration.
    // Their legacy shape remains available until the owner explicitly repairs it.
    if (!rows.length && user[key] != null) return [key, parse(user[key])];
    if (key === 'repoNotes') return [key, Object.fromEntries(rows.map(row => [row.repositoryId, row.note]))];
    return [key, rows.map(row => {
      const result = toClient(row, definition.fields);
      if (key === 'assessmentQA' && (row.answers.length || !('items' in result))) result.items = row.answers.map(answer => {
        const item = toClient(answer, {});
        for (const [field, client] of [['questionKey', 'key'], ['question', 'q'], ['answer', 'a']]) if (answer[field] != null) item[client] = answer[field];
        return item;
      });
      return result;
    })];
  }));
  return Object.fromEntries(entries);
}

export async function saveUserStructures(prisma, userId, prepared, otherUserChanges = {}, plans = {}) {
  return prisma.$transaction(async tx => {
    await writePlanDocuments(tx, userId, plans);
    for (const [key, rows] of Object.entries(prepared)) {
      const definition = USER_STRUCTURES[key];
      await tx[definition.model].deleteMany({ where: { userId } });
      for (const source of rows) {
        const { answers, ...row } = source;
        await tx[definition.model].create({ data: { ...row, id: randomUUID(), userId, createdBy: userId, updatedBy: userId,
          ...(answers ? { answers: { create: answers.map(answer => ({ ...answer, id: randomUUID() })) } } : {}),
        } });
      }
    }
    // Stop writing complete record collections to the legacy JSON singletons.
    return tx.user.update({ where: { id: userId }, data: { ...otherUserChanges,
      ...Object.fromEntries(Object.keys(prepared).map(key => [key, null])),
      ...Object.fromEntries(Object.keys(plans).map(key => [key, null])),
    } });
  });
}
