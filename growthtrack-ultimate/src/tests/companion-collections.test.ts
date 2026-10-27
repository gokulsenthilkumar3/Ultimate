import { describe, it, expect } from 'vitest';
import { useFamilyStore, selectMembers, selectRelationships, selectEvents, selectDocuments } from '../../../Family Connect/familyconnect/frontend/src/store/familyStore';

describe('Family Connect collection snapshots', () => {
  it('keeps collection snapshots stable through repeated reads and unrelated changes', () => {
    const selectors = [selectMembers, selectRelationships, selectEvents, selectDocuments];
    const initial = useFamilyStore.getState();
    for (const select of selectors) {
      const before = select(initial);
      expect(select(initial)).toBe(before);
      expect(select({ ...initial, currentUserRole: 'viewer' })).toBe(before);
    }
  });

  it('invalidates only the collection whose immutable records changed', () => {
    const initial = useFamilyStore.getState();
    const member = { id: 'fixture-member', treeId: 'fixture-tree', name: 'Alex', createdAt: '', updatedAt: '' };
    const populated = { ...initial, memberIds: [member.id], membersById: { [member.id]: member } };
    const before = selectMembers(populated);
    const edited = { ...populated, membersById: { [member.id]: { ...member, name: 'Updated fixture' } } };
    expect(selectMembers(edited)).not.toBe(before);
    expect(selectMembers(edited)[0].name).toBe('Updated fixture');
    expect(selectDocuments(edited)).toBe(selectDocuments(populated));
    expect(selectMembers(populated)).toBe(before);
  });
});
