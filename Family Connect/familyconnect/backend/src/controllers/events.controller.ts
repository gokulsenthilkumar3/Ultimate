import { Request, Response } from 'express';
import { PrismaClient, EventType } from '@prisma/client';
import { authorizeTree, membersBelongToTree } from '../services/treeAccess';

const prisma = new PrismaClient();

// Get all events for a tree
export const getEventsByTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const { treeId } = req.params;
    
    if (!await authorizeTree(req, res, treeId)) return;
    if (req.query.page !== undefined) {
      const page = Math.max(0, Math.min(100000, Math.floor(Number(req.query.page) || 0))), limit = 25;
      const where = { treeId: treeId as string };
      const [rows, total] = await prisma.$transaction([prisma.event.findMany({ where, orderBy: [{ date: 'desc' }, { id: 'asc' }], skip: page * limit, take: limit, include: { member: { select: { id: true, name: true } } } }), prisma.event.count({ where })]);
      res.set('Cache-Control', 'private, no-store'); res.json({ rows, total, page, limit }); return;
    }

    const events = await prisma.event.findMany({
      where: { treeId: treeId as string },
      orderBy: { date: 'asc' }, // Chronological order
      include: {
        member: {
          select: { id: true, name: true, photoUrl: true }
        }
      }
    });

    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Create a new event
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { treeId, memberId, type, title, date, location, description, photos } = req.body;

    if (!treeId || !type || !title || !date) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (!await authorizeTree(req, res, treeId, true)) return;
    if (!Object.values(EventType).includes(type)) { res.status(400).json({ error: 'Choose a supported milestone type.' }); return; }
    if (!await membersBelongToTree(treeId, [memberId]) || !Number.isFinite(Date.parse(date)) || typeof title !== 'string' || title.length > 300) { res.status(400).json({ error: 'Review the event date, title and member.' }); return; }

    const event = await prisma.event.create({
      data: {
        treeId,
        memberId,
        type,
        title,
        date: new Date(date),
        location,
        description,
        photos: photos || [],
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};
