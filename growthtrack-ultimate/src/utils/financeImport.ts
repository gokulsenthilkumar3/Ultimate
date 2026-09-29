import { z } from 'zod';
import useStore, { apiSync } from '../store/useStore';
import { captureSession } from '../store/persistence';

export const IMPORT_FIELDS = ['amount', 'type', 'category', 'method', 'date', 'note'] as const;
export type ImportField = typeof IMPORT_FIELDS[number];
export type ImportMapping = Record<ImportField, string>;
export interface CsvSource { headers: string[]; rows: string[][] }
export const MAX_FINANCE_CSV_BYTES = 2 * 1024 * 1024;

/** Only source-column reading happens here. The server validates mapped rows. */
export function readFinanceCsv(content: string): CsvSource {
  const input = content.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let cells: string[] = [], cell = '', quoted = false, closed = false;
  const pushRow = () => {
    cells.push(cell);
    if (cells.some(value => value.trim())) records.push(cells);
    cells = []; cell = ''; closed = false;
    if (records.length > 5001) throw new Error('CSV supports up to 5,000 rows.');
  };
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === '"') {
      if (cell || closed) throw new Error('CSV quoting is invalid.');
      quoted = true;
    } else if (char === ',') { cells.push(cell); cell = ''; closed = false; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index++;
      pushRow();
    } else {
      if (closed && !/\s/.test(char)) throw new Error('CSV contains text after a closing quote.');
      if (!closed) cell += char;
    }
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  if (cell || cells.length || closed) pushRow();
  if (records.length < 2) throw new Error('CSV needs a header and at least one data row.');
  return { headers: records.shift() || [], rows: records };
}

export function suggestFinanceMapping(headers: string[]): ImportMapping {
  const aliases: Record<ImportField, string[]> = {
    amount: ['amount', 'value', 'transactionamount'], type: ['type', 'transactiontype'], category: ['category'],
    method: ['method', 'paymentmethod', 'account'], date: ['date', 'transactiondate', 'postingdate'], note: ['note', 'description', 'narration', 'memo'],
  };
  return Object.fromEntries(IMPORT_FIELDS.map(field => {
    const index = headers.findIndex(header => aliases[field].includes(header.toLowerCase().replace(/[^a-z0-9]/g, '')));
    return [field, index < 0 ? '' : String(index)];
  })) as ImportMapping;
}

export function mappedFinanceCsv(source: CsvSource, mapping: ImportMapping): string {
  for (const field of ['amount', 'type', 'date'] as const) if (mapping[field] === '') throw new Error('Map the amount, type, and date columns.');
  const chosen = Object.values(mapping).filter(value => value !== '');
  if (new Set(chosen).size !== chosen.length) throw new Error('Map each source column to only one field.');
  if (chosen.some(value => !/^\d+$/.test(value) || Number(value) >= source.headers.length)) throw new Error('Column mapping is invalid.');
  const malformed = source.rows.findIndex(row => row.length !== source.headers.length);
  if (malformed !== -1) throw new Error('Row ' + (malformed + 2) + ': column count does not match the header. Correct the CSV before previewing.');
  const cell = (value: string) => '"' + value.replaceAll('"', '""') + '"';
  // Formula protection belongs to exports; preserve source values for duplicate fingerprints.
  return [IMPORT_FIELDS.join(','), ...source.rows.map(row => IMPORT_FIELDS.map(field => cell(mapping[field] === '' ? '' : row[Number(mapping[field])] || '')).join(','))].join('\r\n');
}

const count = z.number().int().nonnegative();
const previewRow = z.object({
  row: z.number().int().positive(), status: z.enum(['valid', 'invalid', 'duplicate']),
  transaction: z.object({ amount: z.number().nullable(), type: z.string(), date: z.string(), category: z.string().nullable(), method: z.string().nullable(), note: z.string().nullable() }),
  errors: z.array(z.object({ field: z.string(), message: z.string() })),
});
export const FinancePreviewSchema = z.object({
  previewId: z.string().min(1).nullable(), expiresAt: z.iso.datetime().nullable(), canCommit: z.boolean(),
  summary: z.object({ total: count, valid: count, invalid: count, duplicates: count, importable: count }), rows: z.array(previewRow),
}).refine(value => value.summary.total === value.rows.length
  && value.rows.every(row => (row.status === 'invalid') === (row.errors.length > 0))
  && value.summary.invalid === value.rows.filter(row => row.status === 'invalid').length
  && value.summary.duplicates === value.rows.filter(row => row.status === 'duplicate').length
  && value.summary.importable === value.rows.filter(row => row.status === 'valid').length
  && value.summary.valid === value.summary.importable + value.summary.duplicates
  && (!value.canCommit || Boolean(value.previewId && value.expiresAt) && value.summary.invalid === 0), 'Invalid preview acknowledgment.');
export const FinanceCommitSchema = z.object({ imported: count, duplicates: count, total: count, replayed: z.boolean() }).refine(value => value.imported + value.duplicates === value.total, 'Invalid import acknowledgment.');
export type FinancePreview = z.infer<typeof FinancePreviewSchema>;
export type FinanceCommit = z.infer<typeof FinanceCommitSchema>;
export async function previewFinanceCsv(content: string): Promise<FinancePreview> {
  const current = captureSession(useStore.getState);
  const response: unknown = await apiSync('/finance/import/csv/preview', 'POST', { content });
  if (!current()) throw new Error('The session changed. Preview the CSV again in the current account.');
  return FinancePreviewSchema.parse(response);
}
export async function commitFinanceCsv(previewId: string): Promise<FinanceCommit> {
  const current = captureSession(useStore.getState);
  const response: unknown = await apiSync('/finance/import/csv/commit', 'POST', { previewId });
  if (!current()) throw new Error('The session changed. Reload the original account to confirm the import.');
  return FinanceCommitSchema.parse(response);
}
