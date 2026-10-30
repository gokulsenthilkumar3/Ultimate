import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { cacheGet, cacheSet, cacheInvalidate, CACHE_TTL } from '../services/cache.service';
import { authorizeTree } from '../services/treeAccess';
import { z } from 'zod';

const prisma = new PrismaClient();
export const memberFields = z.object({
  name: z.string().trim().min(1).max(160),
  birthDate: z.union([z.iso.date(), z.iso.datetime(), z.literal(''), z.null()]).optional(),
  deathDate: z.union([z.iso.date(), z.iso.datetime(), z.literal(''), z.null()]).optional(),
  birthLocation: z.string().max(300).nullable().optional(), gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  religion: z.string().max(200).nullable().optional(), bio: z.string().max(10000).nullable().optional(), occupation: z.string().max(300).nullable().optional(),
  photoUrl: z.string().regex(/^\/uploads\/[a-zA-Z0-9_.-]+$/).nullable().optional(),
});
const dates = (fields: Record<string, any>) => ({ ...fields, ...('birthDate' in fields ? { birthDate: fields.birthDate ? new Date(fields.birthDate) : null } : {}), ...('deathDate' in fields ? { deathDate: fields.deathDate ? new Date(fields.deathDate) : null } : {}) });

export const createMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { treeId, name, birthDate, birthLocation, deathDate, gender, religion, bio, photoUrl } = req.body;
    if (!treeId || !name) { res.status(400).json({ error: 'TreeId and Name are required' }); return; }

    if (!await authorizeTree(req, res, treeId, true)) return;
    const parsed = memberFields.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Review the member name, dates and profile fields.' }); return; }

    const member = await prisma.member.create({
      data: {
        ...dates(parsed.data), treeId, name: parsed.data.name,
        birthDate:     birthDate     ? new Date(birthDate)  : null,
        birthLocation: birthLocation ?? null,
        deathDate:     deathDate     ? new Date(deathDate)  : null,
        gender:        gender        ?? null,
        religion:      religion      ?? null,
        bio:           bio           ?? null,
        photoUrl:      photoUrl      ?? null,
        createdById:   userId,
      },
    });
    await cacheInvalidate(`tree:${treeId}:user:${userId}`, `members:${treeId}`);
    res.status(201).json(member);
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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
      const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 160) : '';
      const where = { treeId: treeId as string, ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}) };
      const [rows, total] = await prisma.$transaction([prisma.member.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: page * limit, take: limit }), prisma.member.count({ where })]);
      res.set('Cache-Control', 'private, no-store'); res.json({ rows, total, page, limit }); return;
    }

    const cacheKey = `members:${treeId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) { res.status(200).json(cached); return; }

    const members = await prisma.member.findMany({
      where: { treeId: treeId as string },
      select: {
        id: true, name: true, gender: true, birthDate: true, deathDate: true,
        photoUrl: true, religion: true, birthLocation: true, createdAt: true, bio: true, occupation: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    await cacheSet(cacheKey, members, CACHE_TTL.MEMBERS);
    res.status(200).json(members);
  } catch (error) {
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
    const updatedMember = await prisma.member.update({ where: { id }, data: dates(parsed.data) });
    await cacheInvalidate(
      `tree:${existing.treeId}:user:${userId}`,
      `members:${existing.treeId}`,
      `member:${id}`,
    );
    res.status(200).json(updatedMember);
  } catch (error) {
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
