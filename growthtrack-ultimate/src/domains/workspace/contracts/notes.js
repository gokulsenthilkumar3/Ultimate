import { z } from 'zod';

const identifier = z.string().min(1).max(256);
const fields = {
  title: z.string().trim().min(1).max(500),
  content: z.string().max(1024 * 1024).refine(value => new TextEncoder().encode(value).byteLength <= 1024 * 1024, 'Note content must be no larger than 1 MB.'),
  tags: z.array(z.string().trim().min(1).max(50)).max(50),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  pinned: z.boolean(),
  starred: z.boolean(),
};
export const noteCreateSchema = z.object({
  id: identifier, mutationId: identifier,
  title: fields.title.default('Untitled Note'), content: fields.content.default(''),
  tags: fields.tags.default([]), color: fields.color.default('#f59e0b'),
  pinned: fields.pinned.default(false), starred: fields.starred.default(false),
}).strict();
export const noteUpdateSchema = z.object({
  mutationId: identifier, expectedRevision: z.number().int().positive(),
  ...Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.optional()])),
}).strict().refine(value => Object.keys(fields).some(key => key in value), 'Supply a note field to update.');
export const noteDeleteSchema = z.object({ mutationId: identifier, expectedRevision: z.number().int().positive() }).strict();
export const noteRestoreSchema = noteDeleteSchema.extend({ revision: z.number().int().positive() });
export const noteListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  after: identifier.optional(), search: z.string().max(500).optional(),
  view: z.enum(['all', 'pinned', 'tags', 'editor']).default('all'),
});
export const noteSyncSchema = z.object({
  cursor: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const noteRecordSchema = z.object({
  id: identifier, title: z.string().nullable(), content: z.string().nullable(),
  revision: z.number().int().positive(), updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(), kind: z.literal('workspace'),
  tags: z.array(z.string()).default([]), color: z.string().default('#f59e0b'),
  pinned: z.boolean(), starred: z.boolean(),
}).passthrough();

export const noteSyncResponseSchema = z.object({
  cursor: z.number().int().nonnegative(), hasMore: z.boolean(),
  changes: z.array(z.object({
    sequence: z.number().int().positive(), noteId: identifier,
    revision: z.number().int().positive(),
    operation: z.enum(['create', 'update', 'delete', 'restore']),
    note: noteRecordSchema.nullable(),
  })).max(100),
});
