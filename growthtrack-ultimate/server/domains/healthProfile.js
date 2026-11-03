import { mutationInput } from './mutations.js';
import { domainError } from './errors.js';
import { storedObject, readingValue } from './metricPayload.js';

export const HEALTH_PROFILE_INCLUDE = Object.freeze({ senses: true, specialized: { orderBy: { position: 'asc' } }, recoveryMetrics: { orderBy: { position: 'asc' } } });
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const invalid = message => { throw domainError(400, 'INVALID_HEALTH_PROFILE', message); };
const senseFields = { level: 'number', note: 'string', currentPower: 'string', targetPower: 'string', path: 'string', color: 'string' };
const specializedFields = { name: 'string', score: 'number', color: 'string' };
const recoveryFields = { name: 'string', status: 'string' };
function fields(input, specification) {
  const residual = { ...input };
  const columns = {};
  for (const [key, type] of Object.entries(specification)) {
    if (!has(input, key)) continue;
    const value = input[key];
    if (value !== null && (typeof value !== type || (type === 'number' && !Number.isFinite(value)))) invalid(`${key} must be ${type} or null.`);
    columns[key] = value;
    delete residual[key];
  }
  return { columns, residual };
}
function labels(value, name) {
  if (!Array.isArray(value) || value.length > 500 || value.some(label => typeof label !== 'string')) invalid(`${name} must be a bounded list of text labels.`);
  return JSON.stringify(value);
}
function fromChild(row, specification) {
  const result = { ...storedObject(row.data) };
  for (const key of Object.keys(specification)) {
    if (row[key] != null || !has(result, key)) result[key] = row[key] ?? null;
  }
  return result;
}

export function healthProfileData(profile) {
  if (!profile) return {};
  const result = { ...storedObject(profile.data) };
  if (has(result, 'lifestyle') || ['posture', 'broncoTest', 'diets', 'hobbies'].some(key => profile[key] != null)) {
    const lifestyle = { ...storedObject(result.lifestyle) };
    for (const key of ['posture', 'broncoTest']) if (profile[key] != null || !has(lifestyle, key)) lifestyle[key] = profile[key] ?? null;
    for (const key of ['diets', 'hobbies']) {
      if (profile[key] != null) { try { lifestyle[key] = JSON.parse(profile[key]); } catch { /* Legacy residual stays readable. */ } }
      else if (!has(lifestyle, key)) lifestyle[key] = [];
    }
    result.lifestyle = lifestyle;
  }
  if (profile.senses?.length) {
    const senses = { ...storedObject(result.senses) };
    for (const row of profile.senses) {
      const sense = fromChild(row, senseFields);
      if (row.exercises != null) { try { sense.exercises = JSON.parse(row.exercises); } catch { /* Keep residual. */ } }
      else if (!has(sense, 'exercises')) sense.exercises = [];
      Object.defineProperty(senses, row.key, { value: sense, enumerable: true });
    }
    result.senses = senses;
  }
  if (profile.specialized?.length) result.specialized = [...profile.specialized].sort((a, b) => a.position - b.position).map(row => fromChild(row, specializedFields));
  if (profile.recoveryMetrics?.length) result.recoveryMetrics = [...profile.recoveryMetrics].sort((a, b) => a.position - b.position).map(row => {
    const value = fromChild(row, recoveryFields);
    if (row.clientId != null || !has(value, 'id')) value.id = row.clientId ?? null;
    if (row.valueType != null) value.value = readingValue(row);
    return value;
  });
  return result;
}

export function healthProfilePayload(input, current = null) {
  const clean = mutationInput(input);
  if (Buffer.byteLength(JSON.stringify(clean)) > 1024 * 1024) throw domainError(413, 'HEALTH_PROFILE_TOO_LARGE', 'Health profile is too large.');
  const residual = { ...storedObject(current?.data), ...clean };
  const columns = {};
  if (has(clean, 'lifestyle')) {
    if (!object(clean.lifestyle)) invalid('lifestyle must be an object.');
    const lifestyle = { ...storedObject(storedObject(current?.data).lifestyle), ...clean.lifestyle };
    const moved = fields(clean.lifestyle, { posture: 'string', broncoTest: 'string' });
    Object.assign(columns, moved.columns);
    for (const key of ['posture', 'broncoTest']) if (has(clean.lifestyle, key)) delete lifestyle[key];
    for (const key of ['diets', 'hobbies']) if (has(clean.lifestyle, key)) { columns[key] = labels(clean.lifestyle[key], key); delete lifestyle[key]; }
    // An empty object records that an explicitly cleared lifestyle was supplied.
    residual.lifestyle = lifestyle;
  }
  if (has(clean, 'senses')) {
    if (!object(clean.senses) || Object.keys(clean.senses).length > 100) invalid('senses must be a bounded keyed object.');
    const create = Object.entries(clean.senses).map(([key, input]) => {
      if (!object(input)) invalid('Each sense must be an object.');
      const moved = fields(input, senseFields);
      if (has(input, 'exercises')) { moved.columns.exercises = labels(input.exercises, 'exercises'); delete moved.residual.exercises; }
      return { key, ...moved.columns, data: JSON.stringify(moved.residual) };
    });
    columns.senses = { ...(current ? { deleteMany: {} } : {}), create };
    if (create.length) delete residual.senses;
  }
  for (const key of ['specialized', 'recoveryMetrics']) if (has(clean, key)) {
    if (!Array.isArray(clean[key]) || clean[key].length > 500) invalid(`${key} must be a bounded list.`);
    const create = clean[key].map((input, position) => {
      if (!object(input)) invalid(`Each ${key} entry must be an object.`);
      const moved = fields(input, key === 'specialized' ? specializedFields : recoveryFields);
      if (key === 'recoveryMetrics') {
        if (has(input, 'id')) {
          if (input.id !== null && typeof input.id !== 'string') invalid('Recovery metric id must be text or null.');
          moved.columns.clientId = input.id; delete moved.residual.id;
        }
        if (has(input, 'value')) {
          const type = input.value === null ? 'null' : typeof input.value;
          if (!['number', 'string', 'boolean', 'null'].includes(type) || (type === 'number' && !Number.isFinite(input.value))) invalid('Recovery value must be a finite scalar or null.');
          moved.columns.valueType = type;
          moved.columns.value = type === 'number' ? input.value : null;
          moved.columns.stringValue = type === 'string' ? input.value : null;
          moved.columns.booleanValue = type === 'boolean' ? input.value : null;
          delete moved.residual.value;
        }
      }
      return { position, ...moved.columns, data: JSON.stringify(moved.residual) };
    });
    columns[key] = { ...(current ? { deleteMany: {} } : {}), create };
    if (create.length) delete residual[key];
  }
  const data = JSON.stringify(residual);
  if (Buffer.byteLength(data) > 1024 * 1024) throw domainError(413, 'HEALTH_PROFILE_TOO_LARGE', 'Health profile is too large.');
  return { ...columns, data };
}

export function registerHealthProfileRoutes(app, { prisma, authMiddleware, auditCrud, sendInternalError }) {
  app.get('/api/health-profile', authMiddleware, async (req, res) => {
    try {
      const profile = await prisma.healthProfile.findUnique({ where: { userId: req.user.id }, include: HEALTH_PROFILE_INCLUDE });
      res.json(profile ? { ...profile, data: healthProfileData(profile) } : { data: {} });
    } catch (error) { sendInternalError(res, error, 'Health profile read'); }
  });
  app.put('/api/health-profile', authMiddleware, async (req, res) => {
    try {
      const current = await prisma.healthProfile.findUnique({ where: { userId: req.user.id }, include: HEALTH_PROFILE_INCLUDE });
      const payload = healthProfilePayload(req.body, current);
      const profile = await prisma.healthProfile.upsert({ where: { userId: req.user.id }, update: { ...payload, updatedBy: req.user.id }, create: { userId: req.user.id, createdBy: req.user.id, updatedBy: req.user.id, ...payload }, include: HEALTH_PROFILE_INCLUDE });
      await auditCrud({ action: current ? 'update' : 'create', table_name: 'health_profiles', item_id: profile.id, details: { fields: Object.keys(req.body || {}) }, userId: req.user.id, req });
      res.json({ ...profile, data: healthProfileData(profile) });
    } catch (error) {
      if ([400, 413].includes(error.status)) return res.status(error.status).json({ error: error.message, code: error.code });
      sendInternalError(res, error, 'Health profile save');
    }
  });
}
