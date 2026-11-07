import { PrismaClient } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();
const PAGE_SIZE = 50;
export const auditQuery = z.object({ page: z.string().regex(/^\d{1,5}$/).optional() }).strict();
const treeParam = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);

/** Tree admins read the metadata-only trail of their own tree; nobody can edit or delete entries through the API. */
export function createAuditReader(database: PrismaClient = prisma) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
    const treeId = treeParam.safeParse(req.params.id), query = auditQuery.safeParse(req.query);
    if (!treeId.success || !query.success) { res.status(400).json({ error: 'Use a valid tree and an optional page number.' }); return; }
    const page = Number(query.data.page || 0);
    try {
      const result = await database.$transaction(async tx => {
        const access = await tx.accessControl.findUnique({ where: { treeId_userId: { treeId: treeId.data, userId: req.user!.id } } });
        if (!access || access.role !== 'admin') return null;
        const where = { treeId: treeId.data };
        const rows = await tx.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: page * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, actorId: true, action: true, entity: true, entityId: true, details: true, createdAt: true } });
        return { rows, total: await tx.auditLog.count({ where }), page, limit: PAGE_SIZE };
      });
      if (!result) { res.status(403).json({ error: 'Only tree admins can read the audit trail.' }); return; }
      res.set('Cache-Control', 'no-store').json(result);
    } catch { res.status(503).json({ error: 'The audit trail could not be loaded.' }); }
  };
}
export const getAuditTrail = createAuditReader();
