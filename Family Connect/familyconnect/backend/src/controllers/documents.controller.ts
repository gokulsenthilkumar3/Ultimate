import { Request, Response } from 'express';
import { PrismaClient, DocumentType } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { authorizeTree, createTreePolicy } from '../services/treeAccess';
import { getStorage, keyFromReference, StorageAdapter, storageReference } from '../services/storage';
import { cacheInvalidate } from '../services/cache.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { recordAudit } from '../services/audit';
import { documentWhere } from '../services/recordFilters';
import { z } from 'zod';

const prisma = new PrismaClient();
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5 } });
const documentTypes = ['birth_certificate', 'marriage_certificate', 'passport', 'property_deed', 'photo', 'other'];
const extensions = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.txt', '.doc', '.docx']);

export const getDocumentsByTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const treeId = req.params.treeId as string;
    if (!await authorizeTree(req, res, treeId)) return;
    const where = documentWhere(treeId,req.query);
    res.set('Cache-Control', 'private, no-store');
    if (req.query.page !== undefined) {
      const page = Math.max(0, Math.min(100000, Math.floor(Number(req.query.page) || 0))), limit = 25;
      const [rows, total] = await prisma.$transaction([prisma.document.findMany({ where, orderBy: [{ uploadedAt: 'desc' }, { id: 'asc' }], skip: page * limit, take: limit, include: { member: { select: { id: true, name: true } } } }), prisma.document.count({ where })]);
      res.json({ rows, total, page, limit }); return;
    }
    res.json(await prisma.document.findMany({ where, orderBy: { uploadedAt: 'desc' }, include: { member: { select: { id: true, name: true, photoUrl: true } } } }));
  } catch(error) { res.status(error instanceof z.ZodError?400:500).json({ error: error instanceof z.ZodError?'Choose a valid document type and person filter.':'Failed to fetch documents.' }); }
};

export function createDocumentHandlers({ database = prisma, storage = getStorage() }: { database?: PrismaClient; storage?: StorageAdapter } = {}) {
const { authorizeTree: authorize, membersBelongToTree } = createTreePolicy(database);
const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  let createdKey: string | null = null;
  try {
    const { treeId, memberId, type } = req.body;
    if (!await authorize(req, res, treeId, true)) return;
    if (!req.file || !documentTypes.includes(type) || !await membersBelongToTree(treeId, [memberId])) { res.status(400).json({ error: 'Choose a supported file, type and member in this tree.' }); return; }
    const extension = path.extname(req.file.originalname).toLowerCase();
    if (!extensions.has(extension) || (type === 'photo' && !['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extension))) { res.status(400).json({ error: 'Use a PDF, image, text or Word document. Photos must be a supported image.' }); return; }
    const filename = randomUUID() + extension;
    await storage.put(filename, req.file.buffer);
    createdKey = filename;
    const fileUrl = storageReference(filename);
    const document = await database.$transaction(async tx => {
      const record = await tx.document.create({ data: { treeId, memberId: memberId || null, type: type as DocumentType, fileUrl, fileName: path.basename(req.file!.originalname).slice(0, 240) }, include: { member: { select: { id: true, name: true } } } });
      await recordAudit(tx, { treeId, actorId: (req as AuthRequest).user!.id, action: 'document.upload', entity: 'document', entityId: record.id, details: { type, profilePhoto: type === 'photo' && Boolean(memberId) } });
      if (type === 'photo' && memberId) await tx.member.update({ where: { id: memberId }, data: { photoUrl: fileUrl } });
      return record;
    });
    createdKey = null;
    await cacheInvalidate('members:' + treeId);
    res.status(201).json(document);
  } catch {
    // Only an uncommitted file created by this request is eligible for cleanup.
    if (createdKey) await storage.remove(createdKey).catch(() => {});
    res.status(500).json({ error: 'Failed to upload document.' });
  }
};

const downloadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const document = req.params.documentId
      ? await database.document.findUnique({ where: { id: req.params.documentId as string } })
      : await database.document.findFirst({ where: { fileUrl: '/uploads/' + req.params.filename } });
    if (!document) { res.status(404).json({ error: 'Document not found.' }); return; }
    if (!await authorize(req, res, document.treeId)) return;
    let key: string;
    try { key = keyFromReference(document.fileUrl); } catch { res.status(404).json({ error: 'Document not available.' }); return; }
    const found = await storage.open(key);
    if (!found) { res.status(404).json({ error: 'The stored file is unavailable.' }); return; }
    res.set('Cache-Control', 'private, no-store');
    if (found.kind === 'file') {
      res.download(found.path, document.fileName, error => { if (error && !res.headersSent) res.status(404).json({ error: 'The stored file is unavailable.' }); });
      return;
    }
    res.attachment(document.fileName);
    if (found.size !== undefined) res.setHeader('Content-Length', String(found.size));
    found.stream.on('error', () => { if (!res.headersSent) res.status(404).json({ error: 'The stored file is unavailable.' }); else res.destroy(); });
    found.stream.pipe(res);
  } catch { if (!res.headersSent) res.status(500).json({ error: 'Failed to download document.' }); }
};
return { uploadDocument, downloadDocument };
}
export const { uploadDocument, downloadDocument } = createDocumentHandlers();
