import { Response } from 'express';
import { DatePrecision, Prisma, PrismaClient, RelationshipType } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { cacheGet, cacheSet, cacheInvalidate, CACHE_TTL } from '../services/cache.service';
import { authorizeTree } from '../services/treeAccess';
import { z } from 'zod';
import kinship from '../contracts/kinship.json';
import { saveSelf } from '../services/personIdentity';
import { validateRelationship, FamilyRuleError } from '../services/relationshipRules';
import { normalizeProfileDates } from '../services/datePrecision';
import { auditData, changedFields, recordAudit } from '../services/audit';
import { memberWhere } from '../services/recordFilters';

const prisma = new PrismaClient();
export const memberFields = z.object({
  name: z.string().trim().min(1).max(160),
  birthDate: z.union([z.iso.date(), z.iso.datetime(), z.literal(''), z.null()]).optional(),
  deathDate: z.union([z.iso.date(), z.iso.datetime(), z.literal(''), z.null()]).optional(),
  birthDatePrecision: z.enum(DatePrecision).optional(), birthDateApproximate: z.boolean().optional(),
  deathDatePrecision: z.enum(DatePrecision).optional(), deathDateApproximate: z.boolean().optional(), deathRecorded: z.boolean().optional(),
  birthLocation: z.string().max(300).nullable().optional(), gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  religion: z.string().max(200).nullable().optional(), bio: z.string().max(10000).nullable().optional(), occupation: z.string().max(300).nullable().optional(),
  photoUrl: z.string().regex(/^\/uploads\/[a-zA-Z0-9_.-]+$/).nullable().optional(),
});
const dates = normalizeProfileDates;

export const createFields = memberFields.extend({
  treeId: z.string().min(1).max(200), markAsMe: z.boolean().optional(),
  relative: z.object({ memberId: z.string().min(1).max(200), presetId: z.string().max(80).optional(), type: z.enum(RelationshipType).optional(), customLabel: z.string().max(160).optional(), marriageDate: z.iso.date().optional() }).strict().optional(),
}).strict();

export function createPersonHandler(database = prisma) { return async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
    const userId = req.user.id, parsed = createFields.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Review the person’s name, dates and relationship.' }); return; }
    const { treeId, relative, markAsMe, ...profile } = parsed.data;
    const preset = relative?.presetId ? kinship.find(item => item.id === relative.presetId) : null;
    if (relative && ((relative.presetId && !preset) || (!preset && !relative.type) || (preset && relative.type && preset.type !== relative.type))) { res.status(400).json({ error: 'Choose a supported relationship.' }); return; }
    const member = await database.$transaction(async tx => {
      const access = await tx.accessControl.findUnique({ where: { treeId_userId: { treeId, userId } } });
      if (!access || !['admin', 'editor', 'family_head'].includes(access.role)) throw new FamilyRuleError(403, 'Tree editor access is required.');
      const created = await tx.member.create({ data: { ...dates(profile), name: profile.name, treeId, createdById: userId } });
      // The private Me marker is a preference, not a record change, so it is deliberately absent from the trail.
      await recordAudit(tx, { treeId, actorId: userId, action: 'member.create', entity: 'member', entityId: created.id, details: { connected: Boolean(relative) } });
      if (relative) {
        const type = (preset?.type || relative.type) as RelationshipType;
        await validateRelationship(tx, treeId, created.id, relative.memberId, type);
        await tx.relationship.create({ data: { treeId, member1Id: created.id, member2Id: relative.memberId, type, customLabel: relative.customLabel || (preset ? `${preset.tamil} · ${preset.roman} (${preset.meaning})` : null), ...(relative.marriageDate ? { marriageDate: new Date(relative.marriageDate) } : {}) } });
      }
      if (markAsMe) await saveSelf(tx, userId, treeId, created.id);
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await cacheInvalidate(`tree:${treeId}:user:${userId}`, `members:${treeId}`);
    res.status(201).json(member);
  } catch (error) {
    if (error instanceof FamilyRuleError) { res.status(error.status).json({ error: error.message }); return; }
    if ((error as { code?: string }).code === 'P2034') { res.status(409).json({ error: 'The tree changed. Refresh before adding this person again.' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
}; }
export const createMember = createPersonHandler();

export const getMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { treeId } = req.query;
    if (!treeId) { res.status(400).json({ error: 'treeId query parameter is required' }); return; }

    const access = await prisma.accessControl.findFirst({ where: { treeId: treeId as string, userId } });
    if (!access) { res.status(403).json({ error: 'Access denied to this family tree' }); return; }
    if (req.query.page !== undefined) {
      const page = Math.max(0, Math.min(100000, Math.floor(Number(req.query.page) || 0)));
      const limit = Math.max(1, Math.min(100, Math.floor(Number(req.query.limit) || 25)));
      const where = memberWhere(treeId as string,req.query);
      const [rows, total] = await prisma.$transaction([prisma.member.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: page * limit, take: limit }), prisma.member.count({ where })]);
      res.set('Cache-Control', 'private, no-store'); res.json({ rows, total, page, limit }); return;
    }

    const cacheKey = `members:${treeId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) { res.status(200).json(cached); return; }

    const members = await prisma.member.findMany({
      where: { treeId: treeId as string },
      select: {
        id: true, name: true, gender: true, birthDate: true, birthDatePrecision: true, birthDateApproximate: true, deathDate: true, deathDatePrecision: true, deathDateApproximate: true, deathRecorded: true,
        photoUrl: true, religion: true, birthLocation: true, createdAt: true, bio: true, occupation: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    await cacheSet(cacheKey, members, CACHE_TTL.MEMBERS);
    res.status(200).json(members);
  } catch (error) {
    if(error instanceof z.ZodError){res.status(400).json({error:'Choose a valid living status and a search of up to 160 characters.'});return;}
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;  // cast: Express params are always string at runtime

    const existing = await prisma.member.findUnique({ where: { id }, select: { treeId: true } });
    if (!existing) { res.status(404).json({ error: 'Member not found' }); return; }
    if (!await authorizeTree(req, res, existing.treeId, true)) return;
    const parsed = memberFields.partial().strict().safeParse(req.body);
    if (!parsed.success || !Object.keys(parsed.data).length) { res.status(400).json({ error: 'Only valid member profile fields can be updated.' }); return; }
    const [updatedMember] = await prisma.$transaction([
      prisma.member.update({ where: { id }, data: dates(parsed.data) }),
      prisma.auditLog.create({ data: auditData({ treeId: existing.treeId, actorId: userId, action: 'member.update', entity: 'member', entityId: id, details: { fields: changedFields(parsed.data) } }) }),
    ]);
    await cacheInvalidate(
      `tree:${existing.treeId}:user:${userId}`,
      `members:${existing.treeId}`,
      `member:${id}`,
    );
    res.status(200).json(updatedMember);
  } catch (error) {
    if (error instanceof FamilyRuleError) { res.status(error.status).json({ error: error.message }); return; }
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
};

export const getMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = await prisma.member.findUnique({ where: { id: req.params.id as string } });
    if (!member) { res.status(404).json({ error: 'Member not found.' }); return; }
    if (!await authorizeTree(req, res, member.treeId)) return;
    res.set('Cache-Control', 'private, no-store'); res.json(member);
  } catch { res.status(500).json({ error: 'The member profile could not be loaded.' }); }
};
