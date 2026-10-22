import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { cacheGet, cacheSet, cacheInvalidate, CACHE_TTL } from '../services/cache.service';

const prisma = new PrismaClient();

export const createMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { treeId, name, birthDate, birthLocation, deathDate, gender, religion, bio, photoUrl } = req.body;
    if (!treeId || !name) { res.status(400).json({ error: 'TreeId and Name are required' }); return; }

    const access = await prisma.accessControl.findFirst({ where: { treeId, userId } });
    if (!access) { res.status(403).json({ error: 'Access denied to this family tree' }); return; }

    const member = await prisma.member.create({
      data: {
        treeId, name,
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

    const cacheKey = `members:${treeId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) { res.status(200).json(cached); return; }

    const members = await prisma.member.findMany({
      where: { treeId: treeId as string },
      select: {
        id: true, name: true, gender: true, birthDate: true, deathDate: true,
        photoUrl: true, religion: true, birthLocation: true, createdAt: true,
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

    const updatedMember = await prisma.member.update({ where: { id }, data: req.body });
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
