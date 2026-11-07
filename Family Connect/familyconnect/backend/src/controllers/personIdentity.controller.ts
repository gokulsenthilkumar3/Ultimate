import { Prisma, PrismaClient } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';
import { saveSelf, selectedSelf } from '../services/personIdentity';

const prisma = new PrismaClient();
export const meSelectionBody = z.object({ memberId: z.string().min(1).max(200).nullable() }).strict();
export function createPersonIdentityHandlers(database = prisma) {
  return {
    getMe: async (req: AuthRequest, res: Response): Promise<void> => {
      if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
      const treeId = req.params.id as string;
      try {
        const access = await database.accessControl.findUnique({ where: { treeId_userId: { treeId, userId: req.user.id } } });
        if (!access) { res.status(403).json({ error: 'Access denied to this family tree.' }); return; }
        const member = await selectedSelf(database, req.user.id, treeId);
        res.set('Cache-Control', 'no-store'); res.json({ memberId: member?.id || null, member });
      } catch { res.status(503).json({ error: 'Your Me selection could not be loaded.' }); }
    },
    setMe: async (req: AuthRequest, res: Response): Promise<void> => {
      if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
      const parsed = meSelectionBody.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: 'Choose one person in this tree, or clear your selection.' }); return; }
      const treeId = req.params.id as string;
      try {
        const result = await database.$transaction(async tx => {
          const access = await tx.accessControl.findUnique({ where: { treeId_userId: { treeId, userId: req.user!.id } } });
          if (!access) return { status: 403, error: 'Access denied to this family tree.' };
          const member = parsed.data.memberId ? await tx.member.findFirst({ where: { id: parsed.data.memberId, treeId }, select: { id: true, name: true, birthDate: true, gender: true } }) : null;
          if (parsed.data.memberId && !member) return { status: 400, error: 'Choose a person from this family tree.' };
          await saveSelf(tx, req.user!.id, treeId, member?.id || null);
          return { status: 200, memberId: member?.id || null, member };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        res.set('Cache-Control', 'no-store'); res.status(result.status).json(result);
      } catch (error) { res.status((error as { code?: string }).code === 'P2034' ? 409 : 503).json({ error: 'Your selection could not be saved. Refresh before trying again.' }); }
    },
  };
}
export const { getMe, setMe } = createPersonIdentityHandlers();
