import { PrismaClient, Prisma } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();
export const eventRangeQuery = z.object({
  treeId: z.string().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/),
  from: z.iso.date(), to: z.iso.date(),
  page: z.string().regex(/^\d{1,5}$/).optional(),
}).strict().refine(value => {
  const span = Date.parse(value.to) - Date.parse(value.from);
  return span >= 0 && span <= 366 * 86_400_000;
});

/** Existing recorded milestones only; recurring birthday expansion is a later integration. */
export function createEventRangeHandler(database = prisma) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
    const parsed = eventRangeQuery.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: 'Use treeId, YYYY-MM-DD from/to, and an optional page. The range may span at most 366 days.' }); return; }
    const { treeId, from, to } = parsed.data, page = Number(parsed.data.page || 0), limit = 100;
    try {
      const result = await database.$transaction(async tx => {
        const access = await tx.accessControl.findUnique({ where: { treeId_userId: { treeId, userId: req.user!.id } } });
        if (!access) return null;
        const where = { treeId, date: { gte: new Date(from + 'T00:00:00Z'), lt: new Date(Date.parse(to + 'T00:00:00Z') + 86_400_000) } };
        const rows = await tx.event.findMany({ where, orderBy: [{ date: 'asc' }, { id: 'asc' }], skip: page * limit, take: limit, include: { member: { select: { id: true, name: true } } } });
        const total = await tx.event.count({ where });
        return { rows, total, page, limit, from, to };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      if (!result) { res.status(403).json({ error: 'Access denied to this family tree.' }); return; }
      res.set('Cache-Control', 'no-store'); res.json(result);
    } catch { res.status(503).json({ error: 'The Family event range could not be loaded.' }); }
  };
}
export const getEventsInRange = createEventRangeHandler();
