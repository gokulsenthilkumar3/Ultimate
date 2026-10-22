import { Request, Response } from 'express';
import { PrismaClient, DocumentType } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get all documents for a tree
export const getDocumentsByTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const { treeId } = req.params;

    const documents = await prisma.document.findMany({
      where: { treeId: treeId as string },
      orderBy: { uploadedAt: 'desc' },
      include: {
        member: {
          select: { id: true, name: true, photoUrl: true }
        }
      }
    });

    res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

// Upload a document
export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const { treeId, memberId, type } = req.body;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (!treeId || !type) {
      // Clean up the uploaded file since validation failed
      fs.unlinkSync(file.path);
      res.status(400).json({ error: 'Missing required fields (treeId, type)' });
      return;
    }

    // Determine the public URL path
    const fileUrl = `/uploads/${file.filename}`;
    const fileName = file.originalname;

    const document = await prisma.document.create({
      data: {
        treeId,
        memberId: memberId || null,
        type: type as DocumentType,
        fileUrl,
        fileName,
      },
      include: {
        member: {
          select: { id: true, name: true, photoUrl: true }
        }
      }
    });

    // If it's a profile photo, we might also want to update the member's photoUrl
    if (type === 'photo' && memberId) {
      await prisma.member.update({
        where: { id: memberId },
        data: { photoUrl: fileUrl }
      });
    }

    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    if (req.file) fs.unlinkSync(req.file.path); // Cleanup on error
    res.status(500).json({ error: 'Failed to upload document' });
  }
};
