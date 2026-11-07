import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getJwtSecret } from '../config/environment';
import { ultimateIdentity, openUltimateSession } from '../services/ultimateIdentity';

const prisma = new PrismaClient();

export const ultimateSession = async (req: Request, res: Response): Promise<void> => {
  let identity;
  try { identity = ultimateIdentity(req); } catch { res.status(401).json({ error: 'A valid Ultimate session is required.' }); return; }
  try { res.set('Cache-Control', 'no-store'); res.json(await openUltimateSession(identity, prisma.user)); }
  catch { res.status(503).json({ error: 'The Family account could not be opened. Review the shared account configuration.' }); }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name
      }
    });

    const tree = await prisma.familyTree.create({
      data: {
        name: `${name}'s Family Tree`,
        ownerId: user.id,
        accessControl: {
          create: {
            userId: user.id,
            role: 'admin'
          }
        }
      }
    });

    const rootMember = await prisma.member.create({
      data: {
        treeId: tree.id,
        name: name,
        createdById: user.id
      }
    });

    await prisma.familyTree.update({
      where: { id: tree.id },
      data: { rootMemberId: rootMember.id }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
