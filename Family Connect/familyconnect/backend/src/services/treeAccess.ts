import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();
export const canEditTree = (role: string): boolean => ['admin', 'editor', 'family_head'].includes(role);

export function createTreePolicy(database: Pick<PrismaClient, 'accessControl' | 'member'> = prisma) {

/** Always check the live ACL before private reads or mutations, even when data is cached. */
async function authorizeTree(req: AuthRequest, res: Response, treeId: unknown, write = false): Promise<boolean> {
  if (!req.user) { res.status(401).json({ error: 'Sign in to Family Connect.' }); return false; }
  if (typeof treeId !== 'string' || !treeId || treeId.length > 200) { res.status(400).json({ error: 'A valid tree is required.' }); return false; }
  const access = await database.accessControl.findFirst({ where: { treeId, userId: req.user.id } });
  if (!access || (write && !canEditTree(access.role))) { res.status(403).json({ error: write ? 'An editor role is required for this family tree.' : 'Access denied to this family tree.' }); return false; }
  return true;
}

async function membersBelongToTree(treeId: string, ids: unknown[]): Promise<boolean> {
  const selected = [...new Set(ids.filter(id => id !== undefined && id !== null && id !== ''))];
  if (selected.some(id => typeof id !== 'string')) return false;
  return await database.member.count({ where: { treeId, id: { in: selected as string[] } } }) === selected.length;
}
return { authorizeTree, membersBelongToTree };
}
export const { authorizeTree, membersBelongToTree } = createTreePolicy();
