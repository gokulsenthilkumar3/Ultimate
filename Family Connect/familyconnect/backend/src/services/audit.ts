/**
 * Durable audit trail. Entries are metadata only: who did what to which record, plus counts, kinds or
 * field NAMES. Names, biographies, file names, dates and before/after values never belong here, and
 * the Me marker is a private preference that is not audited at all.
 *
 * Write entries with the same transaction client as the change they describe, so both commit or
 * neither does. Validation throws before anything is stored: a programming mistake that would leak
 * private text fails the change instead of persisting it.
 */
export type AuditDetails = Record<string, string | number | boolean | null | string[]>;
export interface AuditEntry {
  treeId?: string | null;
  actorId: string;
  action: string;
  entity: 'member' | 'relationship' | 'event' | 'document' | 'tree' | 'access' | 'gedcom';
  entityId?: string | null;
  details?: AuditDetails;
}
export interface AuditWriter { auditLog: { create(args: { data: any }): Promise<unknown> } }

const ACTION = /^[a-z][a-z0-9_.-]{1,59}$/, KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/, ID = /^[A-Za-z0-9_-]{1,200}$/;
const invalid = () => new Error('Invalid audit entry.');

export function auditData(entry: AuditEntry) {
  const details = entry.details || {};
  if (!ACTION.test(entry.action) || !ID.test(entry.actorId) || (entry.treeId != null && !ID.test(entry.treeId)) || (entry.entityId != null && !ID.test(entry.entityId))) throw invalid();
  const keys = Object.keys(details);
  if (keys.length > 20) throw invalid();
  for (const key of keys) {
    const value = details[key];
    const scalar = (item: unknown) => item === null || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item)) || (typeof item === 'string' && item.length <= 100 && !/[\u0000-\u001f]/.test(item));
    if (!KEY.test(key) || !(scalar(value) || (Array.isArray(value) && value.length <= 50 && value.every(item => typeof item === 'string' && item.length <= 60 && !/[\u0000-\u001f]/.test(item))))) throw invalid();
  }
  return { treeId: entry.treeId ?? null, actorId: entry.actorId, action: entry.action, entity: entry.entity, entityId: entry.entityId ?? null, details };
}

export const recordAudit = (writer: AuditWriter, entry: AuditEntry) => writer.auditLog.create({ data: auditData(entry) });

/** Field names only, in a stable order. */
export const changedFields = (patch: object): string[] => Object.keys(patch).sort();
