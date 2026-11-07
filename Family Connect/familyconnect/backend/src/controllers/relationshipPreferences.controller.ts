import { Prisma, PrismaClient } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();
const body = z.object({ memberId: z.string().min(1).max(200), circle: z.enum(['inner','close','friend','acquaintance']).nullable(), roles: z.array(z.enum(['childhood','colleague','neighbour','mentor','mentee','friend'])).max(6), integrations: z.array(z.enum(['calendar','tasks','notes','files','finance','wellness','places','entertainment','skills'])).max(9) }).strict();
const object = (value: Prisma.JsonValue | undefined): Prisma.JsonObject => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function createRelationshipPreferencesHandlers(database = prisma) {
  const handle = (write: boolean) => async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Sign in to continue.' }); return; }
    const parsed = write ? body.safeParse(req.body) : null;
    if (parsed && !parsed.success) { res.status(400).json({ error: 'Review the person, circle and integrations.' }); return; }
    try {
      const result = await database.$transaction(async tx => {
        const treeId = String(req.params.id), userId = req.user!.id;
        if (!await tx.accessControl.findUnique({ where: { treeId_userId: { treeId, userId } } })) return { status: 403, error: 'Access denied to this tree.' };
        const user = await tx.user.findUnique({ where: { id: userId }, select: { preferences: true } });
        const preferences = object(user?.preferences), all = object(preferences.relationshipPreferences), tree = object(all[treeId]);
        if (parsed?.success) {
          if (!await tx.member.findFirst({ where: { id: parsed.data.memberId, treeId }, select: { id: true } })) return { status: 400, error: 'Choose a person in this tree.' };
          const { memberId, ...value } = parsed.data;
          const next = { ...tree, [memberId]: value };
          await tx.user.update({ where: { id: userId }, data: { preferences: { ...preferences, relationshipPreferences: { ...all, [treeId]: next } } } });
          return { status: 200, people: next };
        }
        return { status: 200, people: tree };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      res.set('Cache-Control','no-store'); res.status(result.status).json(result);
    } catch (error) { res.status((error as { code?: string }).code === 'P2034' ? 409 : 503).json({ error: 'Preferences could not be saved or loaded. Refresh before retrying.' }); }
  };
  return { getRelationshipPreferences: handle(false), saveRelationshipPreferences: handle(true) };
}
export const { getRelationshipPreferences, saveRelationshipPreferences } = createRelationshipPreferencesHandlers();
