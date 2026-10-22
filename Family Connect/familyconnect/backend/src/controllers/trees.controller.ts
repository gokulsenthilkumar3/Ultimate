import { Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { cacheGet, cacheSet, cacheInvalidate, CACHE_TTL } from '../services/cache.service';

const prisma = new PrismaClient();

export const createTree = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, isPublic } = req.body;
    if (!name) { res.status(400).json({ error: 'Tree name is required' }); return; }

    const tree = await prisma.familyTree.create({
      data: {
        name,
        ownerId: userId,
        isPublic: isPublic || false,
        accessControl: { create: { userId, role: 'admin' } },
      },
    });
    res.status(201).json(tree);
  } catch (error) {
    console.error('Create tree error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTrees = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cacheKey = `trees:user:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) { res.status(200).json(cached); return; }

    const trees = await prisma.familyTree.findMany({
      where: { accessControl: { some: { userId } } },
      select: {
        id: true, name: true, isPublic: true, ownerId: true,
        rootMemberId: true, createdAt: true, updatedAt: true,
      },
    });
    await cacheSet(cacheKey, trees, CACHE_TTL.MEMBERS);
    res.status(200).json(trees);
  } catch (error) {
    console.error('Get trees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTreeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;   // cast: Express params are string at runtime
    const cacheKey = `tree:${id}:user:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) { res.status(200).json(cached); return; }

    const tree = await prisma.familyTree.findFirst({
      where: { id, accessControl: { some: { userId } } },
      include: {
        members: {
          select: {
            id: true, name: true, gender: true,
            birthDate: true, deathDate: true, photoUrl: true,
          },
        },
        relationships: {
          select: {
            id: true, member1Id: true, member2Id: true,
            type: true, customLabel: true, marriageDate: true,
          },
        },
        accessControl: true,
      },
    });

    if (!tree) { res.status(404).json({ error: 'Tree not found or access denied' }); return; }

    const userAccess = tree.accessControl.find((ac) => ac.userId === userId);
    const payload = { ...tree, currentUserRole: userAccess?.role ?? 'viewer' };
    await cacheSet(cacheKey, payload, CACHE_TTL.TREE);
    res.status(200).json(payload);
  } catch (error) {
    console.error('Get tree by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const inviteUserToTree = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const treeId = req.params.id as string;  // cast
    const { email, role } = req.body;

    const requesterAccess = await prisma.accessControl.findFirst({
      where: { treeId, userId, role: 'admin' },
    });
    if (!requesterAccess) { res.status(403).json({ error: 'Only admins can invite members' }); return; }

    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) { res.status(404).json({ error: 'User not found in the system' }); return; }

    const access = await prisma.accessControl.upsert({
      where: { treeId_userId: { treeId, userId: invitedUser.id } },
      update: { role: role as Role },
      create: { treeId, userId: invitedUser.id, role: role as Role },
    });
    await cacheInvalidate(`tree:${treeId}:user:${userId}`, `trees:user:${invitedUser.id}`);
    res.status(200).json(access);
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTreeAccessList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const treeId = req.params.id as string;  // cast

    const hasAccess = await prisma.accessControl.findFirst({ where: { treeId, userId } });
    if (!hasAccess) { res.status(403).json({ error: 'Access denied' }); return; }

    const accessList = await prisma.accessControl.findMany({
      where: { treeId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(200).json(accessList);
  } catch (error) {
    console.error('Get tree access list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
