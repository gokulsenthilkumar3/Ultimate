import { Prisma, PrismaClient, RelationshipType } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';
import kinship from '../contracts/kinship.json';
import { validateRelationship, FamilyRuleError } from '../services/relationshipRules';
import { cacheInvalidate } from '../services/cache.service';
import { recordAudit } from '../services/audit';

const prisma = new PrismaClient();
export const relationshipCreate = z.object({
  treeId: z.string().min(1).max(200), member1Id: z.string().min(1).max(200), member2Id: z.string().min(1).max(200),
  type: z.enum(RelationshipType).optional(), presetId: z.string().max(80).optional(), customLabel: z.string().max(160).optional(),
  marriageDate: z.union([z.iso.date(), z.iso.datetime(), z.literal(''), z.null()]).optional(),
  divorceDate: z.union([z.iso.date(), z.iso.datetime(), z.literal(''), z.null()]).optional(),
}).strict();

export function createRelationshipHandler(database = prisma) { return async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
  const parsed = relationshipCreate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Choose two people and a valid relationship.' }); return; }
  const { treeId, member1Id, member2Id, presetId, type: requestedType, customLabel, marriageDate, divorceDate } = parsed.data;
  const preset = presetId ? kinship.find(item => item.id === presetId) : null;
  if ((presetId && !preset) || (!preset && !requestedType) || (preset && requestedType && preset.type !== requestedType)) { res.status(400).json({ error: 'Choose a supported relationship.' }); return; }
  const type = (preset?.type || requestedType) as RelationshipType;
  try {
    const relationship = await database.$transaction(async tx => {
      const access = await tx.accessControl.findUnique({ where: { treeId_userId: { treeId, userId: req.user!.id } } });
      if (!access || !['admin', 'editor', 'family_head'].includes(access.role)) throw new FamilyRuleError(403, 'Tree editor access is required.');
      await validateRelationship(tx, treeId, member1Id, member2Id, type);
      const created = await tx.relationship.create({ data: { treeId, member1Id, member2Id, type,
        customLabel: customLabel || (preset ? `${preset.tamil} · ${preset.roman} (${preset.meaning})` : null),
        marriageDate: marriageDate ? new Date(marriageDate) : null, divorceDate: divorceDate ? new Date(divorceDate) : null,
      } });
      await recordAudit(tx, { treeId, actorId: req.user!.id, action: 'relationship.create', entity: 'relationship', entityId: created.id, details: { type } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await cacheInvalidate(`tree:${treeId}:user:${req.user.id}`);
    res.status(201).json(relationship);
  } catch (error) {
    if (error instanceof FamilyRuleError) { res.status(error.status).json({ error: error.message }); return; }
    res.status((error as { code?: string }).code === 'P2034' ? 409 : 500).json({ error: 'The relationship could not be saved. Refresh before trying again.' });
  }
}; }
export const createRelationship = createRelationshipHandler();
