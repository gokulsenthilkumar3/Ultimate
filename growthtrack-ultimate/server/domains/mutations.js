import { domainError } from './errors.js';

const PROTECTED = new Set(['id', 'userId', 'user_id', 'user', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'expectedUpdatedAt', '__proto__', 'prototype', 'constructor']);
const AUDIT_FIELDS = new Set('title status due_date priority done completedAt project section tags amount type category method date note limit_amount month logged_at notes duration_minutes volume name purchased duration progress content targetDate url hours quality streak cost active mood vital value dosage goalId metric unit side phase confidence measuredAt source stringValue'.split(' '));

export function mutationInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw domainError(400, 'INVALID_RECORD', 'A record object is required.');
  return Object.fromEntries(Object.entries(input).filter(([key]) => !PROTECTED.has(key)));
}

export function redactedAuditFields(input) {
  const keys = Object.keys(mutationInput(input));
  return { fields: keys.filter(key => AUDIT_FIELDS.has(key)), redactedFields: keys.filter(key => !AUDIT_FIELDS.has(key)).length };
}

export function mutationCondition(req, current) {
  const expected = req.body?.expectedUpdatedAt;
  if (expected !== undefined) {
    if (typeof expected !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(expected) || !Number.isFinite(Date.parse(expected))) {
      throw domainError(400, 'INVALID_VERSION', 'expectedUpdatedAt must be an ISO timestamp.');
    }
    if (new Date(expected).getTime() !== new Date(current.updatedAt).getTime()) {
      throw domainError(409, 'VERSION_CONFLICT', 'This record has changed. Refresh before saving.');
    }
  }
  return { id: req.params.id, userId: req.user.id, updatedAt: current.updatedAt };
}

export const nextUpdatedAt = current => new Date(Math.max(Date.now(), new Date(current.updatedAt).getTime() + 1));
