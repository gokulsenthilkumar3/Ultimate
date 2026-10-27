/** Portable semantic editing state. Geometry and pose snapshots are separate assets. */
export const AVATAR_DOCUMENT_FORMAT = 'growthtrack-avatar';
export const AVATAR_DOCUMENT_VERSION = 1;
export const MAX_AVATAR_DOCUMENT_BYTES = 1024 * 1024;

const CONTEXTS = ['current', 'goal'];
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const ASSET_FIELDS = ['family', 'sourceRevision', 'topologyHash', 'lod', 'rigVersion', 'materialVersion', 'sourceHash', 'basisReference', 'parameterVersion', 'solverVersion'];
const REQUIRED_ASSET_FIELDS = ['family', 'sourceRevision', 'topologyHash', 'lod', 'rigVersion'];
const CONTEXT_FIELDS = ['parameters', 'proportions', 'expressions', 'pose', 'appearance', 'equipment', 'measurements', 'provenance', 'customEdits'];
const NUMBER_FIELDS = new Set(['parameters', 'proportions', 'expressions']);
const KEY = /^[a-zA-Z][a-zA-Z0-9_.:-]{0,127}$/;

function fail(message) { throw new Error(`Avatar document: ${message}`); }
function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label} must be an object.`);
}
function exactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) if (DANGEROUS_KEYS.has(key) || !allowed.includes(key)) fail(`unsupported ${label} field "${key}".`);
}
function string(value, label, max = 256) {
  if (typeof value !== 'string' || value.length < 1 || value.length > max || Array.from(value).some((character) => character.charCodeAt(0) < 32)) fail(`${label} must be a nonempty string of at most ${max} characters.`);
  return value;
}
function date(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || !/^\d{4}-\d{2}-\d{2}T/.test(value)) fail(`${label} must be an ISO date.`);
  return value;
}

// Bounded JSON copying prevents reference leakage between Current/Goal and
// rejects values JSON.stringify would otherwise silently drop or coerce.
function cloneJson(value, label, depth = 0, budget = { count: 0 }) {
  if (++budget.count > 20000 || depth > 12) fail(`${label} is too complex.`);
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > 1e9) fail(`${label} must contain finite, bounded numbers.`);
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > 8192 || value.includes(String.fromCharCode(0))) fail(`${label} contains an oversized or invalid string.`);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 4096) fail(`${label} contains an oversized array.`);
    return value.map((item, index) => cloneJson(item, `${label}[${index}]`, depth + 1, budget));
  }
  record(value, label);
  const result = {};
  if (Object.keys(value).length > 4096) fail(`${label} contains too many fields.`);
  for (const [key, item] of Object.entries(value)) {
    if (!KEY.test(key) || DANGEROUS_KEYS.has(key)) fail(`${label} contains an invalid key.`);
    result[key] = cloneJson(item, `${label}.${key}`, depth + 1, budget);
  }
  return result;
}

export function validateAvatarAsset(asset) {
  record(asset, 'asset');
  exactKeys(asset, ASSET_FIELDS, 'asset');
  const result = {};
  for (const key of REQUIRED_ASSET_FIELDS) result[key] = string(asset[key], `asset.${key}`);
  for (const key of ASSET_FIELDS) if (!REQUIRED_ASSET_FIELDS.includes(key) && asset[key] !== undefined) result[key] = string(asset[key], `asset.${key}`, key === 'basisReference' ? 2048 : 256);
  return result;
}

/** Exact identity match only. A matching vertex count alone is not compatibility. */
export function assertAvatarAssetCompatible(asset, expectedAsset) {
  const actual = validateAvatarAsset(asset);
  const expected = validateAvatarAsset(expectedAsset);
  for (const key of ASSET_FIELDS) {
    if (expected[key] !== undefined && actual[key] !== expected[key]) fail(`asset ${key} does not match; this topology/rig/version needs an explicit adapter.`);
  }
  return actual;
}

function validateContext(input, label) {
  record(input, label);
  exactKeys(input, CONTEXT_FIELDS, label);
  const result = {};
  for (const key of CONTEXT_FIELDS) {
    const value = input[key] ?? {};
    if (key !== 'customEdits') record(value, `${label}.${key}`);
    result[key] = cloneJson(value, `${label}.${key}`);
    if (NUMBER_FIELDS.has(key)) {
      for (const number of Object.values(result[key])) if (typeof number !== 'number') fail(`${label}.${key} values must be numbers.`);
    }
  }
  return result;
}

/** Returns detached validated state; never repairs unsupported versions silently. */
export function validateAvatarDocument(input, { expectedAsset } = {}) {
  record(input, 'root');
  exactKeys(input, ['format', 'schemaVersion', 'id', 'createdAt', 'updatedAt', 'activeContext', 'units', 'asset', 'contexts'], 'root');
  if (input.format !== AVATAR_DOCUMENT_FORMAT) fail('unsupported format.');
  if (input.schemaVersion !== AVATAR_DOCUMENT_VERSION) fail(`unsupported schema version ${input.schemaVersion}; migration is required.`);
  if (!CONTEXTS.includes(input.activeContext)) fail('activeContext must be current or goal.');
  if (input.units !== 'm') fail('geometry units must be metres (m).');
  record(input.contexts, 'contexts');
  exactKeys(input.contexts, CONTEXTS, 'contexts');
  const result = {
    format: AVATAR_DOCUMENT_FORMAT,
    schemaVersion: AVATAR_DOCUMENT_VERSION,
    id: string(input.id, 'id', 128),
    createdAt: date(input.createdAt, 'createdAt'),
    updatedAt: date(input.updatedAt, 'updatedAt'),
    activeContext: input.activeContext,
    units: 'm',
    asset: expectedAsset ? assertAvatarAssetCompatible(input.asset, expectedAsset) : validateAvatarAsset(input.asset),
    contexts: { current: validateContext(input.contexts.current, 'current'), goal: validateContext(input.contexts.goal, 'goal') },
  };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_AVATAR_DOCUMENT_BYTES) fail('document exceeds the 1 MiB limit.');
  return result;
}

export function createAvatarDocument({ asset, current = {}, goal = {}, activeContext = 'current', id = globalThis.crypto.randomUUID(), createdAt = new Date().toISOString(), updatedAt = createdAt } = {}) {
  return validateAvatarDocument({ format: AVATAR_DOCUMENT_FORMAT, schemaVersion: AVATAR_DOCUMENT_VERSION, id, createdAt, updatedAt, activeContext, units: 'm', asset, contexts: { current, goal } });
}

/** Apply a partial context edit without changing another context or saved history. */
export function updateAvatarDocumentContext(document, context, patch, { updatedAt = new Date().toISOString() } = {}) {
  const next = validateAvatarDocument(document);
  if (!CONTEXTS.includes(context)) fail('edit context must be current or goal.');
  record(patch, 'context patch');
  exactKeys(patch, CONTEXT_FIELDS, 'context patch');
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'customEdits' && Array.isArray(value)) next.contexts[context][key] = cloneJson(value, `${context}.${key}`);
    else {
      record(value, `${context}.${key}`);
      next.contexts[context][key] = { ...next.contexts[context][key], ...cloneJson(value, `${context}.${key}`) };
    }
  }
  return validateAvatarDocument({ ...next, updatedAt });
}

export function serializeAvatarDocument(document) {
  const text = JSON.stringify(validateAvatarDocument(document), null, 2);
  if (new TextEncoder().encode(text).byteLength > MAX_AVATAR_DOCUMENT_BYTES) fail('document exceeds the 1 MiB limit.');
  return text;
}

export function parseAvatarDocument(text, options) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_AVATAR_DOCUMENT_BYTES) fail('document exceeds the 1 MiB limit or is not text.');
  let parsed;
  try { parsed = JSON.parse(text); } catch { fail('invalid JSON.'); }
  return validateAvatarDocument(parsed, options);
}
