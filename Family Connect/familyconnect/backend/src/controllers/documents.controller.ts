import { Request, Response } from 'express';
import { PrismaClient, DocumentType } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { authorizeTree, membersBelongToTree } from '../services/treeAccess';
import { cacheInvalidate } from '../services/cache.service';
import { documentWhere } from '../services/recordFilters';
import { z } from 'zod';

const prisma = new PrismaClient();
const uploadDir = path.resolve(__dirname, '../../uploads');
const legacyUploadDir = path.resolve(__dirname, '../../../uploads');
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

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  let createdPath: string | null = null;
  try {
    const { treeId, memberId, type } = req.body;
    if (!await authorizeTree(req, res, treeId, true)) return;
    if (!req.file || !documentTypes.includes(type) || !await membersBelongToTree(treeId, [memberId])) { res.status(400).json({ error: 'Choose a supported file, type and member in this tree.' }); return; }
    const extension = path.extname(req.file.originalname).toLowerCase();
    if (!extensions.has(extension) || (type === 'photo' && !['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extension))) { res.status(400).json({ error: 'Use a PDF, image, text or Word document. Photos must be a supported image.' }); return; }
    await fs.mkdir(uploadDir, { recursive: true });
    const filename = randomUUID() + extension;
    createdPath = path.join(uploadDir, filename);
    await fs.writeFile(createdPath, req.file.buffer, { flag: 'wx' });
    const fileUrl = '/uploads/' + filename;
    const document = await prisma.$transaction(async tx => {
      const record = await tx.document.create({ data: { treeId, memberId: memberId || null, type: type as DocumentType, fileUrl, fileName: path.basename(req.file!.originalname).slice(0, 240) }, include: { member: { select: { id: true, name: true } } } });
      if (type === 'photo' && memberId) await tx.member.update({ where: { id: memberId }, data: { photoUrl: fileUrl } });
      return record;
    });
    createdPath = null;
    await cacheInvalidate('members:' + treeId);
    res.status(201).json(document);
  } catch {
    // Only an uncommitted file created by this request is eligible for cleanup.
    if (createdPath) await fs.unlink(createdPath).catch(() => {});
    res.status(500).json({ error: 'Failed to upload document.' });
  }
};

export const downloadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const document = req.params.documentId
      ? await prisma.document.findUnique({ where: { id: req.params.documentId as string } })
      : await prisma.document.findFirst({ where: { fileUrl: '/uploads/' + req.params.filename } });
    if (!document) { res.status(404).json({ error: 'Document not found.' }); return; }
    if (!await authorizeTree(req, res, document.treeId)) return;
    const filename = path.basename(document.fileUrl);
    if (document.fileUrl !== '/uploads/' + filename || !/^[a-zA-Z0-9_.-]+$/.test(filename)) { res.status(404).json({ error: 'Document not available.' }); return; }
    const candidates = [path.join(uploadDir, filename), path.join(legacyUploadDir, filename)];
    let target: string | null = null;
    for (const candidate of candidates) { try { await fs.access(candidate); target = candidate; break; } catch { /* keep legacy files in place */ } }
    if (!target) { res.status(404).json({ error: 'The stored file is unavailable.' }); return; }
    res.set('Cache-Control', 'private, no-store');
    res.download(target, document.fileName, error => { if (error && !res.headersSent) res.status(404).json({ error: 'The stored file is unavailable.' }); });
  } catch { if (!res.headersSent) res.status(500).json({ error: 'Failed to download document.' }); }
};
