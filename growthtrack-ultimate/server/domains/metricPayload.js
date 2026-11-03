import { BODY_METRIC_RANGES } from '../../src/lib/bodyMetricContract.js';
import { mutationInput } from './mutations.js';
import { domainError } from './errors.js';

export const METRIC_INCLUDE = Object.freeze({ measurements: true });
const strings = new Set(['date', 'metric', 'unit', 'side', 'phase', 'source', 'stringValue', 'type', 'exercise', 'notes', 'photoUrl', 'label']);
const numbers = new Set(['value', 'confidence', 'weight', 'reps', 'sets']);
const promoted = new Set([...strings, ...numbers, 'measuredAt']);
const aliases = { note: 'notes', photo_url: 'photoUrl', logged_at: 'measuredAt' };
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const storedObject = value => {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return {}; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};
const invalid = message => { throw domainError(400, 'INVALID_METRIC', message); };
const empty = value => value === null || value === '';
function finite(value, key) {
  if (empty(value)) return null;
  if (typeof value === 'boolean' || !['string', 'number'].includes(typeof value) || !Number.isFinite(Number(value))) invalid(`${key} must be a finite number.`);
  return Number(value);
}
function scalarReading(key, input, container, metric) {
  let value = input;
  if (BODY_METRIC_RANGES[key] && !empty(value)) value = finite(value, key);
  const valueType = value === null ? 'null' : typeof value;
  if (!['number', 'string', 'boolean', 'null'].includes(valueType)) return null;
  if (valueType === 'number' && !Number.isFinite(value)) invalid(`${key} must be finite.`);
  return {
    container, key, valueType,
    value: valueType === 'number' ? value : null,
    stringValue: valueType === 'string' ? value : null,
    booleanValue: valueType === 'boolean' ? value : null,
    // Wide legacy/manual check-ins do not reliably identify their length unit.
    unit: container === 'metrics' || metric === 'profile_baseline' ? BODY_METRIC_RANGES[key]?.unit ?? null : null,
  };
}
export const readingValue = row => row.valueType === 'number' ? row.value
  : row.valueType === 'string' ? row.stringValue : row.valueType === 'boolean' ? row.booleanValue : null;

export function metricToClient(row) {
  if (!row) return row;
  const metadata = storedObject(row.data);
  const result = { ...metadata, ...row, data: undefined, measurements: undefined };
  // New nullable columns must not hide malformed legacy values retained in JSON.
  for (const key of ['type', 'exercise', 'weight', 'reps', 'sets', 'notes', 'photoUrl', 'label', 'stringValue']) {
    if (row[key] == null && has(metadata, key)) result[key] = metadata[key];
  }
  const nested = { ...storedObject(metadata.metrics) };
  for (const reading of row.measurements || []) {
    if (reading.container === 'metrics') Object.defineProperty(nested, reading.key, { value: readingValue(reading), enumerable: true, configurable: true, writable: true });
    else if (reading.container === 'top' && !promoted.has(reading.key)) Object.defineProperty(result, reading.key, { value: readingValue(reading), enumerable: true, configurable: true, writable: true });
  }
  if (Object.keys(nested).length || (has(metadata, 'metrics') && metadata.metrics && typeof metadata.metrics === 'object' && !Array.isArray(metadata.metrics))) result.metrics = nested;
  if (row.notes != null || (!has(metadata, 'note') && has(row, 'notes'))) { result.notes = row.notes; result.note = row.notes; }
  if (row.photoUrl != null || (!has(metadata, 'photo_url') && has(row, 'photoUrl'))) result.photo_url = row.photoUrl;
  if (row.measuredAt != null) result.logged_at = row.measuredAt instanceof Date ? row.measuredAt.toISOString() : row.measuredAt;
  if (/^apple[ _-]?health$/i.test(String(row.source || '').trim())) {
    result.provenance = 'unverified';
    result.provenanceWarning = 'Legacy Apple Health reading: its origin has not been verified.';
  }
  return result;
}

// A nested relation write keeps all readings in the same Prisma transaction.
export function metricPayload(input, existing = null) {
  const clean = mutationInput(input);
  const previous = existing ? metricToClient(existing) : {};
  const incoming = { ...storedObject(clean.data), ...clean };
  const raw = mutationInput({ ...previous, ...incoming });
  delete raw.data; delete raw.measurements;
  for (const [alias, column] of Object.entries(aliases)) {
    if (has(incoming, alias) && !has(incoming, column)) raw[column] = incoming[alias];
    else if (raw[column] == null && has(raw, alias)) raw[column] = raw[alias];
    delete raw[alias];
  }
  if (raw.metric == null && typeof raw.type === 'string') raw.metric = raw.type;
  if (existing && incoming.metrics && typeof incoming.metrics === 'object' && !Array.isArray(incoming.metrics)) raw.metrics = { ...storedObject(previous.metrics), ...incoming.metrics };
  const columns = {};
  const details = { ...storedObject(existing?.data) };
  const readings = [];
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    const supplied = has(incoming, key) || Object.entries(aliases).some(([alias, column]) => column === key && has(incoming, alias));
    try {
    delete details[key];
    if (strings.has(key)) {
      if (value !== null && typeof value !== 'string') invalid(`${key} must be text or null.`);
      columns[key] = value;
    } else if (numbers.has(key)) {
      columns[key] = finite(value, key);
      if (['reps', 'sets'].includes(key) && columns[key] !== null && (!Number.isInteger(columns[key]) || columns[key] < 0 || columns[key] > 2147483647)) invalid(`${key} must be a non-negative integer.`);
      if (key === 'confidence' && columns[key] !== null && (columns[key] < 0 || columns[key] > 1)) invalid('confidence must be between zero and one.');
    } else if (key === 'measuredAt') {
      if (empty(value)) columns.measuredAt = null;
      else {
        const parsed = value instanceof Date ? value : new Date(value);
        if (typeof value === 'boolean' || Number.isNaN(parsed.getTime())) invalid('measuredAt must be a valid timestamp.');
        columns.measuredAt = parsed;
      }
    } else if (key === 'metrics' && value && typeof value === 'object' && !Array.isArray(value)) {
      const residual = {};
      for (const [name, measurement] of Object.entries(value)) {
        if (measurement === undefined) continue;
        let reading;
        try { reading = scalarReading(name, measurement, 'metrics', raw.metric); }
        catch (error) {
          if (!existing || has(storedObject(incoming.metrics), name)) throw error;
          Object.defineProperty(residual, name, { value: measurement, enumerable: true });
          continue;
        }
        if (reading) readings.push(reading); else Object.defineProperty(residual, name, { value: measurement, enumerable: true });
      }
      if (Object.keys(residual).length || !Object.keys(value).length) details.metrics = residual;
    } else {
      const reading = scalarReading(key, value, 'top', raw.metric);
      if (reading) readings.push(reading); else Object.defineProperty(details, key, { value, enumerable: true });
    }
    if (promoted.has(key)) for (const [alias, column] of Object.entries(aliases)) if (column === key) delete details[alias];
    } catch (error) {
      if (!existing || supplied || error.status !== 400) throw error;
      details[key] = value;
    }
  }
  if (columns.measuredAt && !has(raw, 'date')) columns.date = columns.measuredAt.toISOString().slice(0, 10);
  return { ...columns, data: JSON.stringify(details), measurements: { ...(existing ? { deleteMany: {} } : {}), create: readings } };
}
