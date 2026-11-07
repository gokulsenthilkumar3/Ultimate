import { Prisma, PrismaClient, EventType, RelationshipType } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';
import { cacheInvalidate } from '../services/cache.service';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { validateRelationship, FamilyRuleError } from '../services/relationshipRules';

const prisma = new PrismaClient();
const id = z.string().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/);
const date = z.union([z.iso.date(), z.iso.datetime()]);
const nullableDate = date.nullable();
export const eventPatch = z.object({
  title: z.string().trim().min(1).max(300).optional(), type: z.enum(EventType).optional(),
  date: date.optional(), memberId: id.nullable().optional(),
  location: z.string().max(300).nullable().optional(), description: z.string().max(10000).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0);
export const relationshipPatch = z.object({
  member1Id: id.optional(), member2Id: id.optional(), type: z.enum(RelationshipType).optional(),
  customLabel: z.string().max(160).nullable().optional(), marriageDate: nullableDate.optional(), divorceDate: nullableDate.optional(),
}).strict().refine(value => Object.keys(value).length > 0);

type Kind = 'member' | 'relationship' | 'event' | 'document';
class Rejected extends Error { constructor(public status: number, message: string) { super(message); } }
async function access(tx: Prisma.TransactionClient, req: AuthRequest, treeId: string, admin = false) {
  const row = await tx.accessControl.findUnique({ where: { treeId_userId: { treeId, userId: req.user!.id } } });
  if (!row || !(admin ? row.role === 'admin' : ['admin', 'editor', 'family_head'].includes(row.role))) throw new Rejected(403, admin ? 'Tree admin access is required to delete records.' : 'Tree editor access is required.');
}
async function sameTree(tx: Prisma.TransactionClient, treeId: string, ids: (string | null | undefined)[]) {
  const selected = [...new Set(ids.filter(Boolean))] as string[];
  if (await tx.member.count({ where: { treeId, id: { in: selected } } }) !== selected.length) throw new Rejected(400, 'Choose people from this family tree.');
}

// Only known storage roots are eligible. No recursive removal or user-selected filesystem paths.
async function eraseFile(fileUrl: string) {
  if (!/^\/uploads\/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(fileUrl)) throw new Error('Unknown storage reference');
  const filename = path.basename(fileUrl);
  for (const root of [path.resolve(__dirname, '../../uploads'), path.resolve(__dirname, '../../../uploads')]) {
    try { await unlink(path.join(root, filename)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
}

export function createRecordMutationHandlers(database = prisma, removeFile = eraseFile, audit = (event: object) => console.info(JSON.stringify(event))) {
  const handler = (kind: Kind, operation: 'update' | 'delete') => async (req: AuthRequest, res: Response): Promise<void> => {
    const parsedId = id.safeParse(req.params.id);
    if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
    if (!parsedId.success) { res.status(400).json({ error: 'A valid record ID is required.' }); return; }
    if (operation === 'delete' && (!z.object({ confirm: z.literal(parsedId.data) }).strict().safeParse(req.body).success)) { res.status(400).json({ error: 'Confirm permanent deletion using this record ID.' }); return; }
    try {
      const result = await database.$transaction(async tx => {
        const record = kind === 'member' ? await tx.member.findUnique({ where: { id: parsedId.data } })
          : kind === 'relationship' ? await tx.relationship.findUnique({ where: { id: parsedId.data } })
          : kind === 'event' ? await tx.event.findUnique({ where: { id: parsedId.data } })
          : await tx.document.findUnique({ where: { id: parsedId.data } });
        if (!record) throw new Rejected(404, 'Family record not found.');
        await access(tx, req, record.treeId, operation === 'delete');
        if (operation === 'update' && kind === 'event') {
          const parsed = eventPatch.safeParse(req.body);
          if (!parsed.success) throw new Rejected(400, 'Review the milestone fields. Tree and record ownership cannot change.');
          await sameTree(tx, record.treeId, [parsed.data.memberId]);
          const updated = await tx.event.update({ where: { id: record.id }, data: { ...parsed.data, ...(parsed.data.date ? { date: new Date(parsed.data.date) } : {}) } });
          return { treeId: record.treeId, data: updated };
        }
        if (operation === 'update' && kind === 'relationship') {
          const parsed = relationshipPatch.safeParse(req.body);
          if (!parsed.success) throw new Rejected(400, 'Review the relationship fields. Tree and record ownership cannot change.');
          const original = record as { member1Id: string; member2Id: string; type: RelationshipType };
          const next = { ...original, ...parsed.data };
          await validateRelationship(tx, record.treeId, next.member1Id, next.member2Id, next.type, record.id);
          const updated = await tx.relationship.update({ where: { id: record.id }, data: { ...parsed.data,
            ...('marriageDate' in parsed.data ? { marriageDate: parsed.data.marriageDate ? new Date(parsed.data.marriageDate) : null } : {}),
            ...('divorceDate' in parsed.data ? { divorceDate: parsed.data.divorceDate ? new Date(parsed.data.divorceDate) : null } : {}),
          } });
          return { treeId: record.treeId, data: updated };
        }
        if (operation !== 'delete') throw new Rejected(405, 'Unsupported record operation.');
        let fileUrl: string | undefined;
        if (kind === 'member') {
          await tx.familyTree.updateMany({ where: { id: record.treeId, rootMemberId: record.id }, data: { rootMemberId: null } });
          await tx.relationship.deleteMany({ where: { treeId: record.treeId, OR: [{ member1Id: record.id }, { member2Id: record.id }] } });
          await tx.event.updateMany({ where: { treeId: record.treeId, memberId: record.id }, data: { memberId: null } });
          await tx.document.updateMany({ where: { treeId: record.treeId, memberId: record.id }, data: { memberId: null } });
          await tx.member.delete({ where: { id: record.id } });
        } else if (kind === 'relationship') await tx.relationship.delete({ where: { id: record.id } });
        else if (kind === 'event') await tx.event.delete({ where: { id: record.id } });
        else {
          const stored = record as { fileUrl: string };
          await tx.document.delete({ where: { id: record.id } });
          if (await tx.document.count({ where: { fileUrl: stored.fileUrl } }) === 0) {
            await tx.member.updateMany({ where: { treeId: record.treeId, photoUrl: stored.fileUrl }, data: { photoUrl: null } });
            fileUrl = stored.fileUrl;
          }
        }
        return { treeId: record.treeId, data: { deleted: true, id: record.id }, fileUrl };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      let storageCleanupPending = false;
      if ('fileUrl' in result && result.fileUrl) {
        try { await removeFile(result.fileUrl); } catch { storageCleanupPending = true; }
      }
      await cacheInvalidate(`trees:user:${req.user.id}`, `tree:${result.treeId}:user:${req.user.id}`, `members:${result.treeId}`, `member:${parsedId.data}`);
      // Metadata only: private names, biographies, filenames and document contents are excluded.
      try { audit({ event: 'family.record', actorId: req.user.id, action: operation, entity: kind, entityId: parsedId.data, treeId: result.treeId, storageCleanupPending, at: new Date().toISOString() }); } catch { /* A committed operation must not be replayed after a log sink failure. */ }
      res.set('Cache-Control', 'no-store');
      res.json(storageCleanupPending ? { ...result.data, storageCleanupPending: true } : result.data);
    } catch (error) {
      if (error instanceof Rejected || error instanceof FamilyRuleError) { res.status(error.status).json({ error: error.message }); return; }
      if ((error as { code?: string }).code === 'P2034') { res.status(409).json({ error: 'Family data changed during this operation. Refresh and review before retrying.' }); return; }
      res.status(500).json({ error: 'The Family record could not be changed.' });
    }
  };
  return { deleteMember: handler('member', 'delete'), updateRelationship: handler('relationship', 'update'), deleteRelationship: handler('relationship', 'delete'), updateEvent: handler('event', 'update'), deleteEvent: handler('event', 'delete'), deleteDocument: handler('document', 'delete') };
}
export const { deleteMember, updateRelationship, deleteRelationship, updateEvent, deleteEvent, deleteDocument } = createRecordMutationHandlers();
