import { createHash } from 'node:crypto';
import { z } from 'zod';
import { domainError, sendDomainError, transactionWithRetry } from './errors.js';
import { normalizePortfolioPayload } from './portfolio.js';
import { normalizeEvent, validateEvent } from '../../src/components/calendar/calendarModel.js';
import { DEFAULT_CONFIG } from '../config.js';
import { RECORD_FIELDS, RECORD_NULLS, recordPayload, recordStorageData } from './recordFields.js';

// Calendar events and portfolio holdings stored one row per record. Each row
// has an integer revision; owner writes must name the revision they read, so a
// stale tab receives 409 with the current record instead of overwriting a
// newer edit or a sync. Receipts make retried writes idempotent; tombstones
// and a change feed let other devices catch up.
const PROTECTED = new Set(['id', 'revision', 'userId', 'user', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'deletedAt', 'mutationId', 'expectedRevision', 'expectedUpdatedAt', 'position', 'syncProvider', 'readOnly', '__proto__', 'prototype', 'constructor']);
const idSchema = z.string().trim().min(1).max(120).regex(/^[^\s/\\?#]+$/, 'Use an identifier without spaces or slashes.');
PROTECTED.add(RECORD_NULLS);
const mutationSchema = z.string().trim().min(8).max(160);
const plain = z.record(z.string(), z.unknown());
const createSchema = z.object({ id: idSchema, mutationId: mutationSchema, record: plain }).strict();
const updateSchema = z.object({ mutationId: mutationSchema, expectedRevision: z.number().int().min(1), record: plain }).strict();
const deleteSchema = z.object({ mutationId: mutationSchema, expectedRevision: z.number().int().min(1) }).strict();
const listSchema = z.object({ after: idSchema.optional(), limit: z.coerce.number().int().min(1).max(500).default(500) });
const feedSchema = z.object({ cursor: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(500).default(200) });

function parse(schema, value, code) {
  const result = schema.safeParse(value ?? {});
  if (!result.success) throw domainError(400, code, result.error.issues[0]?.message || 'Invalid request.');
  return result.data;
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
export const fingerprint = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const strip = record => Object.fromEntries(Object.entries(record || {}).filter(([key]) => !PROTECTED.has(key)));

function normalizeCalendar(record, id) {
  const zone = typeof record.timeZone === 'string' && record.timeZone ? record.timeZone : 'UTC';
  let event;
  try { event = normalizeEvent({ ...record, id }, zone); } catch (error) { throw domainError(400, 'INVALID_EVENT', error.message); }
  for (const [field, type] of Object.entries(RECORD_FIELDS.calendar)) {
    if (type === 'String' && event[field] != null && typeof event[field] !== 'string') throw domainError(400, 'INVALID_EVENT', `${field} must be text.`);
  }
  const problem = validateEvent(event, zone);
  if (problem) throw domainError(400, 'INVALID_EVENT', problem);
  return strip(event);
}
function normalizeHolding(record, id) {
  return strip(normalizePortfolioPayload([{ ...record, id }])[0]);
}

export const COLLECTIONS = Object.freeze({
  calendar: { model: 'calendarEvent', label: 'event', normalize: normalizeCalendar, ordered: false, readOnlyWhenSynced: true },
  holdings: { model: 'portfolioHolding', label: 'holding', normalize: normalizeHolding, ordered: true, readOnlyWhenSynced: false },
});

export function toClient(row, collection) {
  const kind = typeof collection === 'string' ? collection : Object.hasOwn(row, 'units') || Object.hasOwn(row, 'name') ? 'holdings' : 'calendar';
  const data = recordPayload(row, kind);
  return { ...data, id: row.id, revision: row.revision, updatedAt: new Date(row.updatedAt).toISOString(),
    ...(row.syncProvider ? { syncProvider: row.syncProvider, readOnly: true } : {}) };
}

export function createRecordService(prisma, collection, { now = () => new Date(), limits = DEFAULT_CONFIG.records.limits, maxRecordBytes = DEFAULT_CONFIG.records.maxRecordBytes } = {}) {
  if (!COLLECTIONS[collection]) throw new Error(`Unknown record collection ${collection}.`);
  const spec = { ...COLLECTIONS[collection], limit: limits[collection] };
  const table = db => db[spec.model];
  const clientRecord = row => toClient(row, collection);
  const key = (userId, id) => ({ userId_id: { userId, id } });
  const order = spec.ordered ? [{ position: 'asc' }, { id: 'asc' }] : [{ id: 'asc' }];

  function encode(data) {
    const text = JSON.stringify(data);
    if (Buffer.byteLength(text, 'utf8') > maxRecordBytes) throw domainError(413, 'RECORD_TOO_LARGE', `This ${spec.label} is too large to store.`);
    return recordStorageData(collection, data);
  }
  async function log(tx, userId, row, operation) {
    await tx.recordChange.create({ data: { userId, collection, recordId: row.id, revision: row.revision, operation } });
    return clientRecord(row);
  }
  function conflict(row, message = `This ${spec.label} changed elsewhere. Review the latest version before saving.`) {
    return Object.assign(domainError(409, 'VERSION_CONFLICT', message), { current: row ? clientRecord(row) : null });
  }
  async function commit(userId, mutationId, request, work) {
    const hash = fingerprint(request);
    return transactionWithRetry(prisma, async tx => {
      const receipt = await tx.recordMutation.findUnique({ where: { userId_collection_mutationId: { userId, collection, mutationId } } });
      if (receipt) {
        if (receipt.fingerprint !== hash) throw domainError(409, 'MUTATION_REUSED', 'This mutation identifier was already used for a different request.');
        return JSON.parse(receipt.response);
      }
      const result = await work(tx);
      await tx.recordMutation.create({ data: { userId, collection, mutationId, fingerprint: hash, response: JSON.stringify(result) } });
      return result;
    });
  }
  // Conditional write: the WHERE clause re-checks the revision, so two
  // processes that read the same revision cannot both succeed.
  async function bump(tx, row, data, extra = {}) {
    const result = await table(tx).updateMany({ where: { userId: row.userId, id: row.id, revision: row.revision },
      data: { ...data, ...extra, revision: row.revision + 1, updatedAt: now() } });
    if (!result.count) throw conflict(await table(tx).findUnique({ where: key(row.userId, row.id) }));
    return table(tx).findUnique({ where: key(row.userId, row.id) });
  }
  async function owned(tx, userId, id) {
    const row = await table(tx).findUnique({ where: key(userId, id) });
    if (!row || row.deletedAt) throw domainError(404, 'RECORD_NOT_FOUND', `This ${spec.label} no longer exists.`);
    if (spec.readOnlyWhenSynced && row.syncProvider) throw domainError(409, 'READ_ONLY_RECORD', `This ${spec.label} is mirrored from a connected source. Change it there.`);
    return row;
  }

  return {
    collection,
    async listAll(userId, db = prisma) {
      return (await table(db).findMany({ where: { userId, deletedAt: null }, orderBy: order })).map(clientRecord);
    },
    async list(userId, query = {}) {
      const input = parse(listSchema, query, 'INVALID_QUERY');
      const rows = await table(prisma).findMany({ where: { userId, deletedAt: null, ...(input.after ? { id: { gt: input.after } } : {}) }, orderBy: [{ id: 'asc' }], take: input.limit + 1 });
      const items = rows.slice(0, input.limit);
      return { items: items.map(clientRecord), nextCursor: rows.length > input.limit ? items.at(-1).id : null };
    },
    async create(userId, body) {
      const input = parse(createSchema, body, 'INVALID_RECORD');
      const data = spec.normalize(strip(input.record), input.id);
      return commit(userId, input.mutationId, { operation: 'create', id: input.id, data }, async tx => {
        const existing = await table(tx).findUnique({ where: key(userId, input.id) });
        // Re-creating a deleted record (for example Undo) revives its row with
        // a new revision rather than failing on the retained tombstone.
        if (existing && !existing.deletedAt) throw domainError(409, 'DUPLICATE_RECORD', `This ${spec.label} identifier is already in use.`);
        if (await table(tx).count({ where: { userId, deletedAt: null } }) >= spec.limit) throw domainError(413, 'RECORD_LIMIT', `At most ${spec.limit} ${spec.label}s can be stored.`);
        const position = spec.ordered ? ((await table(tx).aggregate({ where: { userId }, _max: { position: true } }))._max.position ?? -1) + 1 : undefined;
        const row = existing
          ? await bump(tx, existing, { ...encode(data), deletedAt: null, updatedBy: userId }, spec.ordered ? { position } : {})
          : await table(tx).create({ data: { userId, id: input.id, ...encode(data), createdBy: userId, updatedBy: userId, createdAt: now(), updatedAt: now(), ...(spec.ordered ? { position } : {}) } });
        return log(tx, userId, row, existing ? 'restore' : 'create');
      });
    },
    async update(userId, id, body) {
      parse(idSchema, id, 'INVALID_RECORD');
      const input = parse(updateSchema, body, 'INVALID_RECORD');
      return commit(userId, input.mutationId, { operation: 'update', id, input }, async tx => {
        const row = await owned(tx, userId, id);
        if (row.revision !== input.expectedRevision) throw conflict(row);
        const data = spec.normalize({ ...recordPayload(row, collection), ...strip(input.record) }, id);
        return log(tx, userId, await bump(tx, row, { ...encode(data), updatedBy: userId }), 'update');
      });
    },
    async remove(userId, id, body) {
      parse(idSchema, id, 'INVALID_RECORD');
      const input = parse(deleteSchema, body, 'INVALID_RECORD');
      return commit(userId, input.mutationId, { operation: 'delete', id, input }, async tx => {
        const row = await owned(tx, userId, id);
        if (row.revision !== input.expectedRevision) throw conflict(row);
        const saved = await bump(tx, row, { deletedAt: now(), updatedBy: userId });
        await log(tx, userId, saved, 'delete');
        return { id, revision: saved.revision, deleted: true };
      });
    },
    async changes(userId, query = {}) {
      const input = parse(feedSchema, query, 'INVALID_QUERY');
      const rows = await prisma.recordChange.findMany({ where: { userId, collection, sequence: { gt: input.cursor } }, orderBy: { sequence: 'asc' }, take: input.limit + 1 });
      const items = rows.slice(0, input.limit);
      const records = await table(prisma).findMany({ where: { userId, id: { in: [...new Set(items.map(row => row.recordId))] } } });
      const byId = new Map(records.map(row => [row.id, row]));
      return { changes: items.map(change => {
        const row = byId.get(change.recordId);
        return { sequence: change.sequence, id: change.recordId, revision: change.revision, operation: change.operation, record: row && !row.deletedAt ? clientRecord(row) : null };
      }), cursor: items.at(-1)?.sequence ?? input.cursor, hasMore: rows.length > input.limit };
    },

    // ── System writes used by the Sync Engine inside its own transaction ──
    /** Write a record on behalf of a connector. Changes bump the revision so
        any client still holding the older revision gets a conflict. */
    async systemPut(tx, userId, record, { syncProvider = null, actor = 'sync' } = {}) {
      const id = String(record.id);
      const data = spec.normalize(strip(record), id);
      const storage = encode(data);
      const existing = await table(tx).findUnique({ where: key(userId, id) });
      if (!existing) {
        const position = spec.ordered ? ((await table(tx).aggregate({ where: { userId }, _max: { position: true } }))._max.position ?? -1) + 1 : undefined;
        const row = await table(tx).create({ data: { userId, id, ...storage, createdBy: actor, updatedBy: actor, createdAt: now(), updatedAt: now(),
          ...(spec.readOnlyWhenSynced ? { syncProvider } : {}), ...(spec.ordered ? { position } : {}) } });
        await log(tx, userId, row, 'create');
        return 'added';
      }
      if (!existing.deletedAt && fingerprint(recordPayload(existing, collection)) === fingerprint(data)
        && (!spec.readOnlyWhenSynced || existing.syncProvider === syncProvider)) return 'unchanged';
      const row = await bump(tx, existing, { ...storage, deletedAt: null, updatedBy: actor }, spec.readOnlyWhenSynced ? { syncProvider } : {});
      await log(tx, userId, row, existing.deletedAt ? 'restore' : 'update');
      return existing.deletedAt ? 'added' : 'updated';
    },
    async systemRemove(tx, userId, id, actor = 'sync') {
      const existing = await table(tx).findUnique({ where: key(userId, id) });
      if (!existing || existing.deletedAt) return false;
      await log(tx, userId, await bump(tx, existing, { deletedAt: now(), updatedBy: actor }), 'delete');
      return true;
    },
    async syncedIds(tx, userId, syncProvider) {
      return (await table(tx).findMany({ where: { userId, syncProvider, deletedAt: null }, select: { id: true } })).map(row => row.id);
    },
  };
}

export function createRecordServices(prisma, options) {
  return { calendar: createRecordService(prisma, 'calendar', options), holdings: createRecordService(prisma, 'holdings', options) };
}

export function registerRecordRoutes(app, { authMiddleware, services, enabled = false }) {
  const handle = work => async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!enabled) return res.status(503).json({ code: 'RECORD_ROWS_MIGRATION_REQUIRED', error: 'Record storage has not been migrated on this installation.' });
    try { req.auditWritten = true; res.json(await work(req)); }
    catch (error) {
      if (error.status === 409 && 'current' in error) return res.status(409).json({ code: error.code, error: error.message, current: error.current });
      sendDomainError(res, error);
    }
  };
  for (const [base, service] of [['/api/v1/calendar/events', services.calendar], ['/api/v1/finance/holdings', services.holdings]]) {
    app.get(`${base}/changes`, authMiddleware, handle(req => service.changes(req.user.id, req.query)));
    app.get(base, authMiddleware, handle(req => service.list(req.user.id, req.query)));
    app.post(base, authMiddleware, handle(req => service.create(req.user.id, req.body)));
    app.put(`${base}/:id`, authMiddleware, handle(req => service.update(req.user.id, req.params.id, req.body)));
    app.delete(`${base}/:id`, authMiddleware, handle(req => service.remove(req.user.id, req.params.id, req.body)));
  }
}

/** Whole-document writes from an outdated client would overwrite newer rows,
    so after migration they are refused with a reload instruction. */
export function legacyWriteRetired(res) {
  return res.status(409).json({ code: 'LEGACY_WRITE_RETIRED', error: 'This screen is out of date. Reload to keep editing; nothing was changed.' });
}
