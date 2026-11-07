import { DocumentType, EventType } from '@prisma/client';
import { z } from 'zod';
const personId = z.string().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/).optional();
export function memberWhere(treeId: string, query: Record<string, unknown>) {
  const input = z.object({ life: z.enum(['all','living','deceased']).default('all'), search: z.string().trim().max(160).default('') }).parse({ life: query.life, search: query.search });
  return { treeId, ...(input.search ? { name: { contains: input.search, mode: 'insensitive' as const } } : {}), ...(input.life==='living'?{deathDate:null}:input.life==='deceased'?{deathDate:{not:null}}:{}) };
}
export function eventWhere(treeId: string, query: Record<string, unknown>) {
  const input = z.object({ type: z.enum(EventType).optional(), memberId: personId }).parse({ type: query.type, memberId: query.memberId });
  return { treeId, ...(input.type?{type:input.type}:{}), ...(input.memberId?{memberId:input.memberId}:{}) };
}
export function documentWhere(treeId: string, query: Record<string, unknown>) {
  const input = z.object({ type: z.enum(DocumentType).optional(), memberId: personId }).parse({ type: query.type, memberId: query.memberId });
  return { treeId, ...(input.type?{type:input.type}:{}), ...(input.memberId?{memberId:input.memberId}:{}) };
}
