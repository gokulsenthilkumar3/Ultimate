import { Prisma, RelationshipType } from '@prisma/client';
export class FamilyRuleError extends Error { constructor(public status: number, message: string) { super(message); } }
export const parentPair = (a: string, b: string, type: string) => ['parent', 'step_parent'].includes(type) ? [a, b] : ['child', 'step_child'].includes(type) ? [b, a] : null;

export async function validateRelationship(tx: Prisma.TransactionClient, treeId: string, member1Id: string, member2Id: string, type: RelationshipType, excludeId?: string) {
  if (member1Id === member2Id) throw new FamilyRuleError(400, 'Choose two different people.');
  if (await tx.member.count({ where: { treeId, id: { in: [member1Id, member2Id] } } }) !== 2) throw new FamilyRuleError(400, 'Choose people from this family tree.');
  const symmetric = ['spouse', 'sibling', 'cousin', 'friend'].includes(type);
  const duplicate = await tx.relationship.findFirst({ where: { treeId, ...(excludeId ? { id: { not: excludeId } } : {}), type,
    OR: [{ member1Id, member2Id }, ...(symmetric ? [{ member1Id: member2Id, member2Id: member1Id }] : [])],
  } });
  if (duplicate) throw new FamilyRuleError(409, 'These people already have this relationship.');
  const pair = parentPair(member1Id, member2Id, type);
  if (!pair) return;
  const edges = await tx.relationship.findMany({ where: { treeId, type: { in: ['parent', 'child', 'step_parent', 'step_child'] }, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { member1Id: true, member2Id: true, type: true }, take: 10001 });
  if (edges.length > 10000) throw new FamilyRuleError(409, 'This large tree needs a separate ancestry check before adding this link.');
  const [parent, child] = pair, children = new Map<string, string[]>();
  for (const edge of edges) {
    const normalized = parentPair(edge.member1Id, edge.member2Id, edge.type)!;
    if (normalized[0] === parent && normalized[1] === child) throw new FamilyRuleError(409, 'This parent and child are already connected.');
    children.set(normalized[0], [...(children.get(normalized[0]) || []), normalized[1]]);
  }
  const queue = [child], seen = new Set<string>();
  for (let index = 0; index < queue.length; index++) {
    const person = queue[index];
    if (person === parent) throw new FamilyRuleError(400, 'This would make a person their own ancestor. Check the relationship direction.');
    if (seen.has(person)) continue;
    seen.add(person); queue.push(...(children.get(person) || []));
  }
}
