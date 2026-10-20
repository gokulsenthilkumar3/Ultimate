import { randomUUID } from 'node:crypto';

export const LEGACY_NOTE_SELECT = Object.freeze(Object.fromEntries(
  ['id', 'userId', 'title', 'content', 'data', 'createdAt', 'createdBy', 'updatedBy', 'updatedAt'].map(key => [key, true]),
));

// The regenerated client knows the additive columns before an installation has
// migrated. Explicit reads and the old INSERT keep that installation usable.
export function legacyNotesModel(prisma) {
  return {
    findMany: args => prisma.note.findMany({ ...args, select: LEGACY_NOTE_SELECT }),
    findFirst: args => prisma.note.findFirst({ ...args, select: LEGACY_NOTE_SELECT }),
    count: args => prisma.note.count(args),
    updateMany: args => prisma.note.updateMany(args),
    deleteMany: args => prisma.note.deleteMany(args),
    async create({ data }) {
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
