import { randomUUID } from 'node:crypto';
import { COLLECTION_COLUMNS } from './collectionFields.js';

export const LEGACY_NOTE_SELECT = Object.freeze(Object.fromEntries(
  ['id', 'userId', 'title', 'content', 'data', 'createdAt', 'createdBy', 'updatedBy', 'updatedAt'].map(key => [key, true]),
));

// The regenerated client knows the additive columns before an installation has
// migrated. Explicit reads and the old INSERT keep that installation usable.
export function legacyNotesModel(prisma, { typedFields = false } = {}) {
  const select = typedFields ? { ...LEGACY_NOTE_SELECT, kind: true, ...Object.fromEntries(Object.keys(COLLECTION_COLUMNS.notes).map(key => [key, true])) } : LEGACY_NOTE_SELECT;
  return {
    findMany: args => prisma.note.findMany({ ...args, select }),
    findFirst: args => prisma.note.findFirst({ ...args, select }),
    count: args => prisma.note.count(args),
    async updateMany(args) {
      if (typedFields && Object.hasOwn(args.data, 'source')) {
        const current = await prisma.note.findFirst({ where: args.where, select: { kind: true } });
        if (current && (args.data.source === 'mind-journal') !== (current.kind === 'mind-journal')) {
          throw Object.assign(new Error('Moving a note between Workspace and the private Mind journal requires a reviewed migration.'), { status: 400, code: 'NOTE_DOMAIN_CHANGE' });
        }
      }
      return prisma.note.updateMany(args);
    },
    deleteMany: args => prisma.note.deleteMany(args),
    async create({ data }) {
      if (typedFields) return prisma.note.create({ data: { ...data, kind: data.source === 'mind-journal' ? 'mind-journal' : 'workspace' }, select });
      const id = data.id || randomUUID();
      const now = new Date();
      await prisma.$executeRawUnsafe(
        'INSERT INTO "Note" ("id", "userId", "title", "content", "data", "createdAt", "createdBy", "updatedBy", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        id, data.userId, data.title ?? null, data.content ?? null, data.data ?? null,
        data.createdAt || now, data.createdBy ?? null, data.updatedBy ?? null, data.updatedAt || now,
      );
      return prisma.note.findFirst({ where: { id, userId: data.userId }, select: LEGACY_NOTE_SELECT });
    },
  };
}
