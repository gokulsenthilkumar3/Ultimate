import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all events for a tree
export const getEventsByTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const { treeId } = req.params;
    
    // In a real app, verify access control here

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
