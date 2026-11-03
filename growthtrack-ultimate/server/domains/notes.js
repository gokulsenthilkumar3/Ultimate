import { createHash, randomUUID } from 'node:crypto';
import { noteCreateSchema, noteUpdateSchema, noteDeleteSchema, noteRestoreSchema, noteListSchema, noteSyncSchema } from '../../src/domains/workspace/contracts/notes.js';
import { collectionPayload, collectionToClient } from '../collectionPayload.js';
import { COLLECTION_COLUMNS } from './collectionFields.js';
import { mutationInput, mutationCondition, nextUpdatedAt } from './mutations.js';
import { domainError, sendDomainError, transactionWithRetry } from './errors.js';

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw domainError(400, 'INVALID_NOTE', result.error.issues[0]?.message || 'Invalid note request.');
  return result.data;
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
const fingerprint = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const client = row => JSON.parse(JSON.stringify(collectionToClient('notes', row)));
const scope = (ownerId, id) => ({ userId: ownerId, ...(id ? { id } : {}), kind: 'workspace' });
const snapshotFields = ['title', 'content', 'data', ...Object.keys(COLLECTION_COLUMNS.notes)];
const snapshot = row => ({ noteId: row.id, revision: row.revision,
  ...Object.fromEntries(snapshotFields.map(key => [key, row[key]])),
  deletedAt: row.deletedAt, actorId: row.updatedBy || row.userId });

export function createNotesService(prisma) {
  async function commit(ownerId, mutationId, request, work) {
    const hash = fingerprint(request);
    return transactionWithRetry(prisma, async tx => {
      const receipt = await tx.noteMutation.findUnique({ where: { userId_mutationId: { userId: ownerId, mutationId } } });
      if (receipt) {
        if (receipt.fingerprint !== hash) throw domainError(409, 'MUTATION_REUSED', 'This mutation identifier was already used for a different request.');
        return JSON.parse(receipt.response);
      }
      const result = await work(tx);
      await tx.noteMutation.create({ data: { userId: ownerId, mutationId, fingerprint: hash, response: JSON.stringify(result) } });
      return result;
    });
  }
  async function record(tx, row, operation) {
    await tx.noteRevision.create({ data: snapshot(row) });
    await tx.noteChange.create({ data: { userId: row.userId, noteId: row.id, revision: row.revision, operation } });
    return client(row);
  }
  async function current(tx, ownerId, id, includeDeleted = false, includeJournal = false) {
    const row = await tx.note.findFirst({ where: { userId: ownerId, id, ...(!includeJournal ? { kind: 'workspace' } : {}), ...(!includeDeleted ? { deletedAt: null } : {}) } });
    if (!row) throw domainError(404, 'NOTE_NOT_FOUND', 'Note not found.');
    return row;
  }
  function check(row, expected) {
    if (row.revision !== expected) throw Object.assign(domainError(409, 'VERSION_CONFLICT', 'This note has changed. Review the current version before saving.'), { current: client(row) });
  }
  async function change(tx, row, data, operation) {
    const result = await tx.note.updateMany({ where: { id: row.id, userId: row.userId, revision: row.revision }, data: { ...data, revision: row.revision + 1, updatedBy: row.userId, updatedAt: nextUpdatedAt(row) } });
    if (!result.count) throw domainError(409, 'VERSION_CONFLICT', 'This note has changed. Review it before saving.');
    return record(tx, await tx.note.findUnique({ where: { id: row.id } }), operation);
  }
  return {
    async list(ownerId, query = {}) {
      const input = parse(noteListSchema, query);
      const rows = await prisma.note.findMany({
        where: { ...scope(ownerId), deletedAt: null, ...(input.after ? { id: { gt: input.after } } : {}),
          ...(input.search ? { OR: [{ title: { contains: input.search } }, { content: { contains: input.search } }] } : {}),
          ...(input.view === 'pinned' ? { pinned: true } : {}) },
        orderBy: { id: 'asc' }, take: input.limit + 1,
      });
      const items = rows.slice(0, input.limit);
      return { items: items.map(client), nextCursor: rows.length > input.limit ? items.at(-1).id : null };
    },
    async get(ownerId, id) { return client(await current(prisma, ownerId, id)); },
    async create(ownerId, body) {
      const input = parse(noteCreateSchema, body);
      return commit(ownerId, input.mutationId, { operation: 'create', input }, async tx => {
        if (await tx.note.findUnique({ where: { id: input.id } })) throw domainError(409, 'DUPLICATE_RECORD', 'This note identifier is already in use.');
        const row = await tx.note.create({ data: { ...collectionPayload('notes', input), pinned: input.pinned, starred: input.starred, id: input.id, userId: ownerId, kind: 'workspace', createdBy: ownerId, updatedBy: ownerId } });
        return record(tx, row, 'create');
      });
    },
    async update(ownerId, id, body) {
      const input = parse(noteUpdateSchema, body);
      return commit(ownerId, input.mutationId, { operation: 'update', id, input }, async tx => {
        const row = await current(tx, ownerId, id);
        check(row, input.expectedRevision);
        const { mutationId: _mutation, expectedRevision: _revision, ...fields } = input;
        return change(tx, row, { ...collectionPayload('notes', fields, row), ...('pinned' in fields ? { pinned: fields.pinned } : {}), ...('starred' in fields ? { starred: fields.starred } : {}) }, 'update');
      });
    },
    async remove(ownerId, id, body) {
      const input = parse(noteDeleteSchema, body);
      return commit(ownerId, input.mutationId, { operation: 'delete', id, input }, async tx => {
        const row = await current(tx, ownerId, id);
        check(row, input.expectedRevision);
        return change(tx, row, { deletedAt: new Date() }, 'delete');
      });
    },
    async revisions(ownerId, id, query = {}) {
      await current(prisma, ownerId, id, true);
      const input = parse(noteSyncSchema, query);
      const rows = await prisma.noteRevision.findMany({ where: { noteId: id, revision: { gt: input.cursor } }, orderBy: { revision: 'asc' }, take: input.limit + 1 });
      const items = rows.slice(0, input.limit).map(row => ({ ...row, data: undefined, tags: client(row).tags || [] }));
      return { items, nextCursor: rows.length > input.limit ? items.at(-1).revision : null };
    },
    async restore(ownerId, id, body) {
      const input = parse(noteRestoreSchema, body);
      return commit(ownerId, input.mutationId, { operation: 'restore', id, input }, async tx => {
        const row = await current(tx, ownerId, id, true);
        check(row, input.expectedRevision);
        const old = await tx.noteRevision.findUnique({ where: { noteId_revision: { noteId: id, revision: input.revision } } });
        if (!old) throw domainError(404, 'REVISION_NOT_FOUND', 'Revision not found.');
        return change(tx, row, { ...Object.fromEntries(snapshotFields.map(key => [key, old[key]])), deletedAt: null }, 'restore');
      });
    },
    async sync(ownerId, query = {}) {
      const input = parse(noteSyncSchema, query);
      const changes = await prisma.noteChange.findMany({ where: { userId: ownerId, sequence: { gt: input.cursor } }, orderBy: { sequence: 'asc' }, take: input.limit + 1 });
      const items = changes.slice(0, input.limit);
      const notes = await prisma.note.findMany({ where: { ...scope(ownerId), id: { in: items.map(row => row.noteId) } } });
      return { changes: items.map(change => ({ ...change, note: notes.find(note => note.id === change.noteId) ? client(notes.find(note => note.id === change.noteId)) : null })), cursor: items.at(-1)?.sequence ?? input.cursor, hasMore: changes.length > input.limit };
    },
    // Legacy clients share the same rows and history when v1 is enabled. They
    // keep timestamp preconditions; only the versioned API requires receipts.
    async legacyCreate(ownerId, body) {
      const id = body.id == null ? randomUUID() : String(body.id);
      const data = collectionPayload('notes', mutationInput(body));
      return commit(ownerId, `legacy:create:${id}`, { operation: 'legacy-create', id, data }, async tx => {
        if (await tx.note.findUnique({ where: { id } })) throw domainError(409, 'DUPLICATE_RECORD', 'This note identifier is already in use.');
        const row = await tx.note.create({ data: { ...data, id, userId: ownerId, kind: data.source === 'mind-journal' ? 'mind-journal' : 'workspace', createdBy: ownerId, updatedBy: ownerId } });
        await tx.noteRevision.create({ data: snapshot(row) });
        if (row.kind === 'workspace') await tx.noteChange.create({ data: { userId: ownerId, noteId: id, revision: 1, operation: 'create' } });
        return client(row);
      });
    },
    async legacyUpdate(ownerId, id, body, deleting = false) {
      return transactionWithRetry(prisma, async tx => {
        const row = await current(tx, ownerId, id, false, true);
        mutationCondition({ body, user: { id: ownerId }, params: { id } }, row);
        const data = deleting ? { deletedAt: new Date() } : collectionPayload('notes', mutationInput(body), row);
        if (!deleting) {
          const metadata = collectionToClient('notes', { ...row, ...data });
          if ((metadata.source === 'mind-journal') !== (row.kind === 'mind-journal')) throw domainError(400, 'NOTE_DOMAIN_CHANGE', 'Moving a note between Workspace and the private Mind journal requires a reviewed migration.');
        }
        const result = await tx.note.updateMany({ where: { id, userId: ownerId, revision: row.revision }, data: { ...data, revision: row.revision + 1, updatedBy: ownerId, updatedAt: nextUpdatedAt(row) } });
        if (!result.count) throw domainError(409, 'VERSION_CONFLICT', 'This note has changed.');
        const saved = await tx.note.findUnique({ where: { id } });
        await tx.noteRevision.create({ data: snapshot(saved) });
        if (row.kind === 'workspace') await tx.noteChange.create({ data: { userId: ownerId, noteId: id, revision: saved.revision, operation: deleting ? 'delete' : 'update' } });
        return client(saved);
      });
    },
  };
}

export function registerNotesRoutes(app, { prisma, authMiddleware, enabled = false }) {
  const service = createNotesService(prisma);
  const handle = work => async (req, res) => {
    if (!enabled) return res.status(503).json({ code: 'NOTES_MIGRATION_REQUIRED', error: 'Versioned Notes is not enabled on this installation.' });
    try { res.json(await work(req)); }
    catch (error) {
      if (error.status === 409 && error.current) return res.status(409).json({ code: error.code, error: error.message, current: error.current });
      sendDomainError(res, error);
    }
  };
  const base = '/api/v1/workspace/notes';
  app.get(`${base}/sync`, authMiddleware, handle(req => service.sync(req.user.id, req.query)));
  app.get(base, authMiddleware, handle(req => service.list(req.user.id, req.query)));
  app.post(base, authMiddleware, handle(req => service.create(req.user.id, req.body)));
  app.get(`${base}/:id/revisions`, authMiddleware, handle(req => service.revisions(req.user.id, req.params.id, req.query)));
  app.post(`${base}/:id/restore`, authMiddleware, handle(req => service.restore(req.user.id, req.params.id, req.body)));
  app.get(`${base}/:id`, authMiddleware, handle(req => service.get(req.user.id, req.params.id)));
  app.put(`${base}/:id`, authMiddleware, handle(req => service.update(req.user.id, req.params.id, req.body)));
  app.delete(`${base}/:id`, authMiddleware, handle(req => service.remove(req.user.id, req.params.id, req.body)));
  if (enabled) {
    app.get('/api/notes', authMiddleware, handle(async req => (await prisma.note.findMany({ where: { userId: req.user.id, deletedAt: null } })).map(client)));
    app.post('/api/notes', authMiddleware, handle(req => service.legacyCreate(req.user.id, req.body)));
    app.put('/api/notes/:id', authMiddleware, handle(req => service.legacyUpdate(req.user.id, req.params.id, req.body)));
    app.patch('/api/notes/:id', authMiddleware, handle(req => service.legacyUpdate(req.user.id, req.params.id, req.body)));
    app.delete('/api/notes/:id', authMiddleware, handle(async req => { const row = await service.legacyUpdate(req.user.id, req.params.id, req.body, true); return { success: true, count: 1, updatedAt: row.updatedAt, revision: row.revision }; }));
  }
  return service;
}
