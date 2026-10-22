import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

export const createRelationship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { treeId, member1Id, member2Id, type, customLabel, marriageDate, divorceDate } = req.body;

    if (!treeId || !member1Id || !member2Id || !type) {
      res.status(400).json({ error: 'treeId, member1Id, member2Id, and type are required' });
      return;
    }

    // Check access
    const access = await prisma.accessControl.findFirst({
      where: {
        treeId: treeId,
        userId: userId
      }
    });

    if (!access) {
      res.status(403).json({ error: 'Access denied to this family tree' });
      return;
    }

    const relationship = await prisma.relationship.create({
      data: {
        treeId,
        member1Id,
        member2Id,
        type,
        customLabel,
        marriageDate: marriageDate ? new Date(marriageDate) : null,
        divorceDate: divorceDate ? new Date(divorceDate) : null
      }
    });

    res.status(201).json(relationship);
  } catch (error) {
    console.error('Create relationship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
