import crypto from 'node:crypto';
import multer from 'multer';
import { TextDecoder } from 'node:util';
import { domainError, sendDomainError, transactionWithRetry } from './errors.js';
import { fileMetadata, fileToClient } from './fileMetadata.js';
import { mutationCondition, nextUpdatedAt } from './mutations.js';
import { setupRequired } from './providers.js';

export const FILE_LIMITS = Object.freeze({ maxFileBytes: 25 * 1024 * 1024, maxTotalBytes: 250 * 1024 * 1024, maxFiles: 100 });

export function safeFilename(name) {
  const cleaned = Array.from(String(name || 'file').toWellFormed().normalize('NFKC'), char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? '_' : char)
    .join('').replace(/[/\\:"<>|?*]/g, '_').replace(/^\.+/, '').trim();
  return [...cleaned || 'file'].slice(0, 180).join('');
}

export function attachmentDisposition(name) {
  const safe = safeFilename(name);
  const fallback = safe.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(safe).replace(/['()*]/g, value => `%${value.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export function detectPreview(bytes, name) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { previewKind: 'image', mime: 'image/png' };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { previewKind: 'image', mime: 'image/jpeg' };
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) return { previewKind: 'image', mime: 'image/gif' };
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return { previewKind: 'image', mime: 'image/webp' };
  if (/\.(txt|csv|log|md|json)$/i.test(name) && !bytes.includes(0)) {
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return { previewKind: 'text', mime: 'text/plain' }; } catch { /* Binary downloads remain supported. */ }
  }
  return { previewKind: null, mime: 'application/octet-stream' };
}

export function createFileHandlers({ prisma, storage, limits = FILE_LIMITS, auditCrud = async () => {} }) {
  const wrap = handler => async (req, res) => { try { return await handler(req, res); } catch (error) { return sendDomainError(res, error); } };
  const findOwned = async req => {
    const row = await prisma.document.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!row) throw domainError(404, 'FILE_NOT_FOUND', 'File not found.');
    return row;
  };
  const readOwned = async req => {
    const row = await findOwned(req);
    const metadata = fileMetadata(row);
    if (!fileToClient(row).available) throw domainError(410, 'FILE_UNAVAILABLE', 'This legacy record has no stored file bytes. Upload the original file.');
    const bytes = await storage.read(metadata.key, limits.maxFileBytes);
    if (bytes.length !== metadata.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== metadata.sha256) throw domainError(410, 'FILE_UNAVAILABLE', 'Stored file bytes could not be verified.');
    return { row, bytes };
  };
  const privateHeaders = res => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox; frame-ancestors 'none'");
  };
  return {
    list: wrap(async (req, res) => {
      privateHeaders(res);
      const rows = await prisma.document.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
      const files = rows.map(fileToClient);
      res.json({ files, usage: { files: files.filter(file => file.available).length, bytes: files.reduce((sum, file) => sum + file.sizeBytes, 0) }, limits });
    }),
    legacyList: wrap(async (req, res) => { privateHeaders(res); res.json((await prisma.document.findMany({ where: { userId: req.user.id } })).map(fileToClient)); }),
    upload: wrap(async (req, res) => {
      if (!req.file?.buffer) throw domainError(400, 'FILE_REQUIRED', 'Choose one file to upload using multipart/form-data.');
      if (!req.file.buffer.length) throw domainError(400, 'EMPTY_FILE', 'Empty files cannot be uploaded.');
      if (req.file.buffer.length > limits.maxFileBytes) throw domainError(413, 'FILE_TOO_LARGE', 'File exceeds the upload size limit.');
      if (req.body?.visibility && req.body.visibility !== 'private') throw domainError(400, 'PRIVATE_ONLY', 'Vault uploads are private.');
      const name = safeFilename(req.file.originalname);
      const key = crypto.randomBytes(32).toString('hex');
      const metadata = { key, bytes: req.file.buffer.length, ...detectPreview(req.file.buffer, name), sha256: crypto.createHash('sha256').update(req.file.buffer).digest('hex') };
      await storage.put(key, req.file.buffer);
      let row;
      try {
        row = await transactionWithRetry(prisma, async tx => {
          const records = await tx.document.findMany({ where: { userId: req.user.id } });
          const stored = records.map(fileMetadata).filter(Boolean);
          if (stored.length >= limits.maxFiles || stored.reduce((sum, file) => sum + file.bytes, 0) + metadata.bytes > limits.maxTotalBytes) throw domainError(413, 'VAULT_QUOTA', 'Vault storage limit reached. Delete a file before uploading.');
          return tx.document.create({ data: { userId: req.user.id, title: name, url: null, data: JSON.stringify({ _vault: metadata }), createdBy: req.user.id, updatedBy: req.user.id } });
        });
      } catch (error) {
        try { await storage.remove(key); } catch { /* Private orphan can be reconciled by an operator. */ }
        throw error;
      }
      await auditCrud({ action: 'create', table_name: 'documents', item_id: row.id, details: { bytes: metadata.bytes, visibility: 'private' }, userId: req.user.id, req });
      privateHeaders(res);
      res.status(201).json(fileToClient(row));
    }),
    download: wrap(async (req, res) => {
      const { row, bytes } = await readOwned(req);
      privateHeaders(res);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', attachmentDisposition(row.title));
      res.send(bytes);
    }),
    preview: wrap(async (req, res) => {
      const { row, bytes } = await readOwned(req);
      const preview = detectPreview(bytes, row.title);
      privateHeaders(res);
      if (preview.previewKind === 'text') return res.json({ kind: 'text', text: bytes.subarray(0, 128 * 1024).toString('utf8'), truncated: bytes.length > 128 * 1024 });
      if (preview.previewKind !== 'image') throw domainError(415, 'PREVIEW_UNSUPPORTED', 'Preview is available for raster images and text files. Download this file to open it.');
      res.setHeader('Content-Type', preview.mime);
      res.setHeader('Content-Disposition', 'inline');
      res.send(bytes);
    }),
    rename: wrap(async (req, res) => {
      const row = await findOwned(req);
      const supplied = req.body?.name ?? req.body?.title;
      if (typeof supplied !== 'string' || !supplied.trim()) throw domainError(400, 'INVALID_FILENAME', 'A file name is required.');
      if (Object.keys(req.body).some(key => !['name', 'title', 'expectedUpdatedAt'].includes(key))) throw domainError(400, 'INVALID_FILE_FIELD', 'Only the file name can be updated.');
      const title = safeFilename(supplied);
      const updatedAt = nextUpdatedAt(row);
      const result = await prisma.document.updateMany({ where: mutationCondition(req, row), data: { title, updatedAt, updatedBy: req.user.id } });
      if (!result.count) throw domainError(409, 'VERSION_CONFLICT', 'This file has changed. Refresh before saving.');
      await auditCrud({ action: 'update', table_name: 'documents', item_id: row.id, details: { fields: ['name'] }, userId: req.user.id, req });
      res.json({ success: true, count: result.count, updatedAt, file: fileToClient({ ...row, title, updatedAt }) });
    }),
    delete: wrap(async (req, res) => {
      const row = await findOwned(req);
      const result = await prisma.document.deleteMany({ where: mutationCondition(req, row) });
      if (!result.count) throw domainError(409, 'VERSION_CONFLICT', 'This file has changed. Refresh before deleting.');
      let storageCleanupPending = false;
      const metadata = fileMetadata(row);
      if (metadata?.key) { try { await storage.remove(metadata.key); } catch { storageCleanupPending = true; } }
      await auditCrud({ action: 'delete', table_name: 'documents', item_id: row.id, details: { storageCleanupPending }, userId: req.user.id, req });
      res.json({ success: true, count: result.count, storageCleanupPending });
    }),
  };
}

export function registerFileRoutes(app, auth, dependencies) {
  const handlers = createFileHandlers(dependencies);
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: dependencies.limits?.maxFileBytes || FILE_LIMITS.maxFileBytes, files: 1, fields: 1, fieldSize: 50, parts: 2 } }).single('file');
  const receiveUpload = (req, res, next) => {
    if (!req.is('multipart/form-data')) return res.status(415).json({ code: 'MULTIPART_REQUIRED', error: 'Upload file bytes using multipart/form-data.' });
    upload(req, res, error => {
      if (!error) return next();
      res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ code: error.code || 'INVALID_UPLOAD', error: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 25 MB limit.' : 'Upload one file in the file field.' });
    });
  };
  app.get('/api/files', auth, handlers.list);
  app.get('/api/documents', auth, handlers.legacyList);
  for (const prefix of ['/api/files', '/api/documents']) {
    app.post(prefix, auth, receiveUpload, handlers.upload);
    app.get(`${prefix}/:id/download`, auth, handlers.download);
    app.get(`${prefix}/:id/preview`, auth, handlers.preview);
    app.patch(`${prefix}/:id`, auth, handlers.rename);
    app.put(`${prefix}/:id`, auth, handlers.rename);
    app.delete(`${prefix}/:id`, auth, handlers.delete);
  }
  app.post('/api/files/providers/:provider/connect', auth, (req, res) => setupRequired(req.params.provider, 'Document provider setup is required. No account was connected.')(req, res));
  return handlers;
}
