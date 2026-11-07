import { Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { cacheGet, cacheSet, cacheInvalidate, CACHE_TTL } from '../services/cache.service';

const prisma = new PrismaClient();

export const createTree = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, isPublic } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 160) { res.status(400).json({ error: 'A tree name of up to 160 characters is required.' }); return; }

    const tree = await prisma.familyTree.create({
      data: {
        name: name.trim(),
        ownerId: userId,
        isPublic: isPublic || false,
        accessControl: { create: { userId, role: 'admin' } },
      },
    });
    await cacheInvalidate(`trees:user:${userId}`);
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
    const tree = await prisma.familyTree.findFirst({
      where: { id, accessControl: { some: { userId } } },
      include: {
        members: {
          ...(req.query.native === '1' ? { take: 120, orderBy: { createdAt: 'asc' as const } } : {}),
          select: {
            id: true, name: true, gender: true,
            birthDate: true, deathDate: true, photoUrl: true,
          },
        },
        relationships: {
          ...(req.query.native === '1' ? { take: 600, orderBy: { createdAt: 'asc' as const } } : {}),
          select: {
            id: true, member1Id: true, member2Id: true,
            type: true, customLabel: true, marriageDate: true,
          },
        },
        accessControl: true,
        _count: { select: { members: true, relationships: true, events: true, documents: true } },
      },
    });

    if (!tree) { res.status(404).json({ error: 'Tree not found or access denied' }); return; }

    const userAccess = tree.accessControl.find((ac) => ac.userId === userId);
    if (req.query.native === '1' && typeof req.query.focus === 'string' && req.query.focus.length <= 200) {
      const focus = await prisma.member.findFirst({ where: { id: req.query.focus, treeId: id }, select: { id: true, name: true, gender: true, birthDate: true, deathDate: true, photoUrl: true } });
      if (focus) {
        const near = await prisma.relationship.findMany({ where: { treeId: id, OR: [{ member1Id: focus.id }, { member2Id: focus.id }] }, orderBy: { createdAt: 'asc' }, take: 60 });
        const ids = [...new Set(near.flatMap(edge => [edge.member1Id, edge.member2Id]))];
        const neighbors = await prisma.member.findMany({ where: { treeId: id, id: { in: ids } }, take: 120, select: { id: true, name: true, gender: true, birthDate: true, deathDate: true, photoUrl: true } });
        tree.members = [...new Map([focus, ...neighbors, ...tree.members].map(person => [person.id, person])).values()].slice(0, 120);
        tree.relationships = [...new Map([...near, ...tree.relationships].map(edge => [edge.id, edge])).values()].slice(0, 600);
      }
    }
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
    if (typeof email !== 'string' || !['viewer', 'editor', 'admin', 'family_head'].includes(role)) { res.status(400).json({ error: 'A registered email and valid role are required.' }); return; }

    const requesterAccess = await prisma.accessControl.findFirst({
      where: { treeId, userId, role: 'admin' },
    });
    if (!requesterAccess) { res.status(403).json({ error: 'Only admins can invite members' }); return; }

    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) { res.status(404).json({ error: 'User not found in the system' }); return; }
    const treeOwner = await prisma.familyTree.findUnique({ where: { id: treeId }, select: { ownerId: true } });
    if (treeOwner?.ownerId === invitedUser.id && role !== 'admin') { res.status(400).json({ error: 'The tree owner must remain an admin.' }); return; }

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
