import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { domainError, sendDomainError, transactionWithRetry } from './errors.js';
import { setupRequired } from './providers.js';

export const FINANCE_HEADERS = ['amount', 'type', 'category', 'method', 'date', 'note'];
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;
const PREVIEW_TTL = 15 * 60 * 1000;
const TYPES = { income: 'Income', expense: 'Expense', investment: 'Investment' };

export function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function transactionFingerprint(row) {
  const normalized = FINANCE_HEADERS.map(key => key === 'amount' ? Number(row[key]) : key === 'type'
    ? String(row[key] || '').trim().toLowerCase() : String(row[key] || '').replace(/\r\n/g, '\n').trim());
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function parseFinanceCsv(content) {
  if (typeof content !== 'string' || !content.trim()) throw domainError(400, 'CSV_REQUIRED', 'CSV content is required.');
  if (Buffer.byteLength(content, 'utf8') > MAX_BYTES) throw domainError(413, 'CSV_TOO_LARGE', 'CSV cannot exceed 2 MB.');
  let records;
  try {
    records = parse(content, { bom: true, skip_empty_lines: true, relax_column_count: true, max_record_size: MAX_BYTES });
  } catch {
    throw domainError(400, 'CSV_SYNTAX', 'CSV quoting is invalid. Check the statement and try again.');
  }
  if (records.length < 2 || records.length > MAX_ROWS + 1) throw domainError(400, 'CSV_ROW_LIMIT', 'CSV needs a header and between 1 and 5,000 rows.');
  const headers = records.shift().map(header => String(header).trim().toLowerCase());
  if (new Set(headers).size !== headers.length || headers.some(header => !FINANCE_HEADERS.includes(header))
    || ['amount', 'type', 'date'].some(header => !headers.includes(header))) {
    throw domainError(400, 'CSV_HEADERS', 'Use unique columns amount,type,date and optional category,method,note.');
  }
  return records.map((cells, index) => {
    const raw = Object.fromEntries(headers.map((header, column) => [header, String(cells[column] ?? '').trim()]));
    const errors = [];
    const add = (field, message) => errors.push({ field, message });
    if (cells.length !== headers.length) add('row', 'Column count does not match the header.');
    const amount = Number(raw.amount);
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw.amount) || !Number.isFinite(amount) || amount <= 0 || amount > 1e12) add('amount', 'Amount must be a positive decimal up to 1 trillion.');
    const type = TYPES[raw.type?.toLowerCase()];
    if (!type) add('type', 'Type must be Income, Expense, or Investment.');
    if (!isDate(raw.date)) add('date', 'Use a valid date in YYYY-MM-DD format.');
    for (const field of ['category', 'method', 'note']) {
      if ((raw[field] || '').length > (field === 'note' ? 4000 : 120)) add(field, `${field} is too long.`);
      if ((raw[field] || '').includes('\u0000')) add(field, `${field} cannot contain null characters.`);
    }
    const transaction = { amount: Number.isFinite(amount) ? amount : null, type: type || raw.type, date: raw.date,
      category: raw.category || null, method: raw.method || null, note: raw.note?.replace(/\r\n/g, '\n') || null };
    return { row: index + 2, status: errors.length ? 'invalid' : 'valid', transaction, errors };
  });
}

export function csvCell(value) {
  let text = String(value ?? '');
  // Whitespace/control characters may hide a spreadsheet formula prefix.
  let firstVisible = 0;
  while (firstVisible < text.length && (text.charCodeAt(firstVisible) <= 32 || /\s/u.test(text[firstVisible]))) firstVisible += 1;
  if (['=', '+', '-', '@'].includes(text[firstVisible]) || ['\t', '\r', '\n'].includes(text[0])) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function financeExportWhere(userId, query = {}) {
  const where = { userId };
  for (const key of ['from', 'to']) if (query[key] !== undefined && !isDate(query[key])) throw domainError(400, 'INVALID_FILTER', `${key} must be a valid YYYY-MM-DD date.`);
  if (query.from && query.to && query.from > query.to) throw domainError(400, 'INVALID_FILTER', 'from cannot be after to.');
  if (query.from || query.to) where.date = { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) };
  if (query.type) {
    const type = typeof query.type === 'string' && TYPES[query.type.toLowerCase()];
    if (!type) throw domainError(400, 'INVALID_FILTER', 'type must be Income, Expense, or Investment.');
    where.type = type;
  }
  for (const key of ['category', 'method', 'search']) {
    if (query[key] !== undefined && (typeof query[key] !== 'string' || query[key].length > 120)) throw domainError(400, 'INVALID_FILTER', `${key} must be text up to 120 characters.`);
  }
  for (const key of ['category', 'method']) if (query[key]) where[key] = query[key];
  if (query.search) where.OR = ['note', 'category', 'method'].map(key => ({ [key]: { contains: query.search } }));
  return where;
}

export function createFinanceHandlers({ prisma, auditCrud = async () => {}, now = Date.now, uuid = crypto.randomUUID }) {
  const previews = new Map();
  function expirePreviews() {
    for (const [id, preview] of previews) if (preview.expires <= now()) previews.delete(id);
  }
  async function buildPreview(req) {
    expirePreviews();
    if (previews.size >= 100 || [...previews.values()].filter(p => p.userId === req.user.id && !p.result).length >= 10) throw domainError(429, 'PREVIEW_LIMIT', 'Too many active previews. Commit an existing preview or wait for expiry.');
    const rows = parseFinanceCsv(req.body?.content);
    const existing = await prisma.transaction.findMany({ where: { userId: req.user.id } });
    const seen = new Set(existing.map(transactionFingerprint));
    for (const row of rows) {
      if (row.errors.length) continue;
      const fingerprint = transactionFingerprint(row.transaction);
      if (seen.has(fingerprint)) row.status = 'duplicate';
      seen.add(fingerprint);
    }
    const summary = { total: rows.length, valid: rows.filter(row => !row.errors.length).length,
      invalid: rows.filter(row => row.errors.length).length, duplicates: rows.filter(row => row.status === 'duplicate').length,
      importable: rows.filter(row => row.status === 'valid').length };
    const canCommit = summary.invalid === 0;
    const previewId = canCommit ? uuid() : null;
    const expires = now() + PREVIEW_TTL;
    if (previewId) previews.set(previewId, { userId: req.user.id, rows, expires, result: null, pending: null });
    return { previewId, expiresAt: canCommit ? new Date(expires).toISOString() : null, canCommit, summary, rows };
  }
  async function commitPreview(req) {
    expirePreviews();
    const preview = previews.get(req.body?.previewId);
    if (!preview || preview.userId !== req.user.id) throw domainError(410, 'PREVIEW_EXPIRED', 'Preview is unavailable or expired. Preview the CSV again.');
    if (preview.result) return { ...preview.result, replayed: true };
    if (preview.pending) return { ...await preview.pending, replayed: true };
    preview.pending = transactionWithRetry(prisma, async tx => {
      const existing = await tx.transaction.findMany({ where: { userId: req.user.id } });
      const seen = new Set(existing.map(transactionFingerprint));
      let imported = 0;
      for (const row of preview.rows) {
        const fingerprint = transactionFingerprint(row.transaction);
        if (seen.has(fingerprint)) continue;
        // A database primary key protects simultaneous commits across processes.
        const id = `csv-${crypto.createHash('sha256').update(`${req.user.id}:${fingerprint}`).digest('hex')}`;
        // Retain idempotence if an imported transaction was later edited.
        if (await tx.transaction.findFirst({ where: { id, userId: req.user.id } })) continue;
        await tx.transaction.create({ data: { ...row.transaction, id, userId: req.user.id, createdBy: req.user.id, updatedBy: req.user.id } });
        seen.add(fingerprint);
        imported += 1;
      }
      return { imported, duplicates: preview.rows.length - imported, total: preview.rows.length, replayed: false };
    });
    try {
      preview.result = await preview.pending;
      preview.rows = []; // Completed previews retain only the replay result.
      if (preview.result.imported) await auditCrud({ action: 'create', table_name: 'finance', item_id: 'csv-import',
        details: { imported: preview.result.imported, duplicates: preview.result.duplicates }, userId: req.user.id, req });
      else req.auditWritten = true;
      return preview.result;
    } finally { preview.pending = null; }
  }
  const wrap = handler => async (req, res) => { try { return await handler(req, res); } catch (error) { return sendDomainError(res, error); } };
  return {
    preview: wrap(async (req, res) => { req.auditWritten = true; res.json(await buildPreview(req)); }),
    commit: wrap(async (req, res) => { req.auditWritten = true; res.json(await commitPreview(req)); }),
    legacyImport: wrap(async (req, res) => {
      req.auditWritten = true;
      if (req.body?.mode === 'preview') return res.json(await buildPreview(req));
      if (req.body?.previewId) return res.json(await commitPreview(req));
      const preview = await buildPreview(req);
      if (!preview.canCommit) return res.status(422).json({ error: 'CSV has invalid rows. Correct them before importing.', code: 'CSV_INVALID_ROWS', ...preview });
      res.json(await commitPreview({ ...req, body: { previewId: preview.previewId } }));
    }),
    export: wrap(async (req, res) => {
      const rows = await prisma.transaction.findMany({ where: financeExportWhere(req.user.id, req.query), orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'attachment; filename="growthtrack-finance.csv"');
      res.send([FINANCE_HEADERS.join(','), ...rows.map(row => FINANCE_HEADERS.map(key => csvCell(row[key])).join(','))].join('\r\n'));
    }),
  };
}

export function registerFinanceRoutes(app, auth, dependencies) {
  const handlers = createFinanceHandlers(dependencies);
  app.post('/api/finance/import/csv/preview', auth, handlers.preview);
  app.post('/api/finance/import/csv/commit', auth, handlers.commit);
  app.post('/api/finance/import/csv', auth, handlers.legacyImport);
  app.get('/api/finance/export', auth, handlers.export);
  app.post('/api/finance/sync/bank', auth, setupRequired('bank', 'Bank sync is not configured. Import a CSV statement; no transactions were changed.', { supportedImport: 'csv' }));
  return handlers;
}
