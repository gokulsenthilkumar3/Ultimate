import { BODY_METRIC_RANGES } from '../../src/lib/bodyMetricContract.js';
import { isDeepStrictEqual } from 'node:util';
import { domainError } from './errors.js';
import { PLAN_DOCUMENTS, PLAN_ID_FIELDS } from './planContract.js';

export { PLAN_DOCUMENTS } from './planContract.js';
const has = (object, key) => Object.hasOwn(object, key);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const parse = value => { try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return value; } };
const invalid = message => { throw domainError(400, 'INVALID_PLAN_RECORD', message); };
const encoded = value => JSON.stringify(value);
const extra = value => object(parse(value)) ? parse(value) : {};
const unchanged = (previous, key, value) => has(previous, key) && isDeepStrictEqual(previous[key], value);

function scalar(value) {
  const valueType = value === null ? 'null' : typeof value;
  if (!['number', 'string', 'boolean', 'null'].includes(valueType) || (valueType === 'number' && !Number.isFinite(value))) invalid('A reading must be finite text, number, boolean or null.');
  return { valueType, value: valueType === 'number' ? value : null, stringValue: valueType === 'string' ? value : null, booleanValue: valueType === 'boolean' ? value : null };
}
const scalarValue = row => row.valueType === 'number' ? row.value : row.valueType === 'string' ? row.stringValue : row.valueType === 'boolean' ? row.booleanValue : null;

function typed(value, type, field) {
  if (value === null) return null;
  if (type === 'String') {
    if (typeof value !== 'string') invalid(`${field} must be text.`);
    return value;
  }
  if (type === 'Boolean') {
    if (typeof value !== 'boolean') invalid(`${field} must be a boolean.`);
    return value;
  }
  if (type === 'Labels') {
    if (!Array.isArray(value) || value.length > 1000 || value.some(item => typeof item !== 'string')) invalid(`${field} must be a bounded list of text.`);
    return encoded(value);
  }
  if (!['number', 'string'].includes(typeof value) || !String(value).trim()) invalid(`${field} must be numeric.`);
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > 1e12 || (type === 'Int' && (!Number.isInteger(number) || number < 0 || number > 2147483647))) invalid(`${field} is outside its supported numeric range.`);
  return number;
}

export function planInclude(definition) {
  const include = {};
  for (const [key, child] of Object.entries(definition.children || {})) {
    const nested = planInclude(child);
    include[key] = { orderBy: { position: 'asc' }, ...(Object.keys(nested).length ? { include: nested } : {}) };
  }
  if (definition.maps) include.readings = true;
  return include;
}

export function preparePlanRecord(input, definition, previous = {}) {
  if (!object(input)) invalid('A plan must be a record object or null.');
  const residual = { ...input }, row = {}, present = [];
  for (const [key, column] of Object.entries(PLAN_ID_FIELDS)) if (has(input, key)) {
    try {
      if (key === 'id') {
        const value = scalar(input.id);
        if (!['string', 'number', 'null'].includes(value.valueType)) invalid('Record id must be text, a finite number or null.');
        row.clientId = input.id === null ? null : String(input.id); row.clientIdType = value.valueType;
      } else row[column] = typed(input[key], 'String', key);
      delete residual[key]; present.push(key);
    } catch (error) { if (error.status !== 400 || !unchanged(previous, key, input[key])) throw error; }
  }
  for (const [key, type] of Object.entries(definition.fields)) if (has(input, key) && input[key] !== undefined) {
    try {
      if (type === 'Scalar') {
        const reading = scalar(input[key]);
        for (const [field, value] of Object.entries(reading)) row[`${key}${field[0].toUpperCase()}${field.slice(1)}`] = value;
      } else row[key] = typed(input[key], type, key);
      delete residual[key]; present.push(key);
    } catch (error) { if (error.status !== 400 || !unchanged(previous, key, input[key])) throw error; }
  }
  for (const [key, child] of Object.entries(definition.children || {})) if (has(input, key)) {
    if (input[key] === null) { present.push(key); continue; } // null stays a structural marker in residual data
    if (!Array.isArray(input[key]) || input[key].length > 1000 || input[key].some(item => !object(item))) {
      if (unchanged(previous, key, input[key])) continue;
      invalid(`${key} must be a list of at most 1,000 record objects.`);
    }
    const old = Array.isArray(previous[key]) ? previous[key] : [];
    row[key] = { create: input[key].map((item, position) => ({ ...preparePlanRecord(item, child, (item.id != null ? old.find(row => row?.id === item.id) : old[position]) || {}), position })) };
    delete residual[key]; present.push(key);
  }
  const readings = [];
  for (const [scope, specification] of Object.entries(definition.maps || {})) if (has(input, scope)) {
    if (input[scope] === null) { present.push(scope); continue; }
    if (!object(input[scope]) || Object.keys(input[scope]).length > 1000) {
      if (unchanged(previous, scope, input[scope])) continue;
      invalid(`${scope} must be a bounded keyed object.`);
    }
    const remaining = {};
    for (const [key, rawValue] of Object.entries(input[scope])) {
      if (rawValue === undefined) continue;
      const retain = () => Object.defineProperty(remaining, key, { value: rawValue, enumerable: true, configurable: true });
      if (object(rawValue) || Array.isArray(rawValue)) { retain(); continue; }
      try {
        const value = specification.numeric && rawValue !== null ? typed(rawValue, 'Float', key) : rawValue;
        readings.push({ scope, key, ...scalar(value), unit: specification.unit || (typeof value === 'number' ? BODY_METRIC_RANGES[key]?.unit : null) || null });
      } catch (error) {
        if (error.status !== 400 || !unchanged(extra(previous[scope]), key, rawValue)) throw error;
        retain();
      }
    }
    if (Object.keys(remaining).length) residual[scope] = remaining; else delete residual[scope];
    present.push(scope);
  }
  if (definition.maps) row.readings = { create: readings };
  return { ...row, present: encoded(present), data: Object.keys(residual).length ? encoded(residual) : null };
}

export function planRecordToClient(row, definition) {
  const result = { ...extra(row.data) };
  const present = parse(row.present) || [];
  for (const key of present) {
    if (has(PLAN_ID_FIELDS, key)) {
      result[key] = key === 'id' ? row.clientIdType === 'number' ? Number(row.clientId) : row.clientId : row[PLAN_ID_FIELDS[key]];
    } else if (has(definition.fields, key)) {
      const type = definition.fields[key];
      result[key] = type === 'Scalar' ? scalarValue(Object.fromEntries(['valueType', 'value', 'stringValue', 'booleanValue'].map(field => [field, row[`${key}${field[0].toUpperCase()}${field.slice(1)}`]])))
        : type === 'Labels' ? parse(row[key]) : row[key];
    } else if (has(definition.children || {}, key) && result[key] !== null) result[key] = (row[key] || []).map(child => planRecordToClient(child, definition.children[key]));
    else if (has(definition.maps || {}, key) && result[key] !== null) {
      const values = { ...extra(result[key]) };
      for (const reading of row.readings || []) if (reading.scope === key) Object.defineProperty(values, reading.key, { value: scalarValue(reading), enumerable: true, configurable: true, writable: true });
      result[key] = values;
    }
  }
  return result;
}

export function preparePlanDocuments(changes, current = {}) {
  const prepared = {};
  for (const [key, definition] of Object.entries(PLAN_DOCUMENTS)) if (has(changes, key) && changes[key] !== undefined) {
    const value = parse(changes[key]);
    if (Buffer.byteLength(encoded(value), 'utf8') > 1024 * 1024) throw domainError(413, 'PLAN_TOO_LARGE', `${key} is too large.`);
    if (value !== null && !object(value) && unchanged(current, key, value)) continue;
    prepared[key] = value === null ? null : preparePlanRecord(value, definition, object(current[key]) ? current[key] : {});
  }
  return prepared;
}

export async function loadPlanDocuments(prisma, userId, legacy = {}) {
  return Object.fromEntries(await Promise.all(Object.entries(PLAN_DOCUMENTS).map(async ([key, definition]) => {
    const include = planInclude(definition);
    const row = await prisma[definition.model].findUnique({ where: { userId }, ...(Object.keys(include).length ? { include } : {}) });
    return [key, row ? planRecordToClient(row, definition) : parse(legacy?.[key] ?? null)];
  })));
}

// Called inside the caller's transaction, including the clearing of the legacy
// singleton: a child failure must never leave half a replacement or lose JSON.
export async function writePlanDocuments(tx, userId, prepared) {
  for (const [key, value] of Object.entries(prepared)) {
    const definition = PLAN_DOCUMENTS[key];
    const existing = await tx[definition.model].findUnique({ where: { userId }, select: { id: true } });
    if (value === null) { await tx[definition.model].deleteMany({ where: { userId } }); continue; }
    if (existing) {
      const children = Object.fromEntries(Object.entries(value).filter(([field]) => has(definition.children || {}, field) || field === 'readings').map(([field, relation]) => [field, { deleteMany: {}, ...relation }]));
      // Omitted children also clear: singleton writes replace the whole document.
      for (const field of [...Object.keys(definition.children || {}), ...(definition.maps ? ['readings'] : [])]) children[field] ||= { deleteMany: {} };
      const nullable = Object.fromEntries(Object.entries(definition.fields).flatMap(([field, type]) => type === 'Scalar'
        ? ['ValueType', 'Value', 'StringValue', 'BooleanValue'].map(suffix => [`${field}${suffix}`, null]) : [[field, null]]));
      await tx[definition.model].update({ where: { userId }, data: { ...nullable, clientId: null, clientIdType: null, clientCreatedAt: null, clientUpdatedAt: null, ...value, ...children, updatedBy: userId } });
    } else await tx[definition.model].create({ data: { ...value, userId, createdBy: userId, updatedBy: userId } });
  }
}
