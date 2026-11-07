import { Prisma, PrismaClient } from '@prisma/client';

export function selfFromPreferences(preferences: Prisma.JsonValue | null, treeId: string): string | null {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return null;
  const map = preferences.familySelf;
  return map && typeof map === 'object' && !Array.isArray(map) && Object.hasOwn(map, treeId) && typeof map[treeId] === 'string' ? map[treeId] as string : null;
}

export async function saveSelf(tx: Prisma.TransactionClient, userId: string, treeId: string, memberId: string | null) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { preferences: true } });
  if (!user) throw new Error('Account missing');
  const preferences = user.preferences && typeof user.preferences === 'object' && !Array.isArray(user.preferences) ? user.preferences : {};
  const previous = preferences.familySelf;
  const familySelf = { ...(previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {}), [treeId]: memberId };
  await tx.user.update({ where: { id: userId }, data: { preferences: { ...preferences, familySelf } } });
}

export async function selectedSelf(database: Pick<PrismaClient, 'user' | 'member'>, userId: string, treeId: string) {
  const user = await database.user.findUnique({ where: { id: userId }, select: { preferences: true } });
  const memberId = selfFromPreferences(user?.preferences || null, treeId);
  return memberId ? database.member.findFirst({ where: { id: memberId, treeId }, select: { id: true, name: true, birthDate: true, birthDatePrecision: true, birthDateApproximate: true, gender: true } }) : null;
}
