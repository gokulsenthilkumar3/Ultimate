import { create } from 'zustand';
import type { FamilyTree, Member, Relationship, FamilyEvent, FamilyDocument } from '../types/family';

// ─── Normalised shape ─────────────────────────────────────────────────────────
// Store members/relationships/events/documents as id-keyed maps for O(1) lookup
// and granular subscriptions (components only re-render when their slice changes).

interface FamilyState {
  activeTree: FamilyTree | null;
  currentUserRole: 'viewer' | 'editor' | 'admin' | 'family_head' | null;

  // Normalised maps
  membersById: Record<string, Member>;
  memberIds: string[];
  relationshipsById: Record<string, Relationship>;
  relationshipIds: string[];
  eventsById: Record<string, FamilyEvent>;
  eventIds: string[];
  documentsById: Record<string, FamilyDocument>;
  documentIds: string[];

  // Actions
  setActiveTree: (tree: FamilyTree | null) => void;
  setCurrentUserRole: (role: 'viewer' | 'editor' | 'admin' | 'family_head' | null) => void;

  setMembers: (members: Member[]) => void;
  setRelationships: (relationships: Relationship[]) => void;
  setEvents: (events: FamilyEvent[]) => void;
  setDocuments: (documents: FamilyDocument[]) => void;

  addMember: (member: Member) => void;
  updateMember: (id: string, data: Partial<Member>) => void;
  deleteMember: (id: string) => void;

  addRelationship: (rel: Relationship) => void;
  deleteRelationship: (id: string) => void;
}

// Helper: array → normalised map
const toMap = <T extends { id: string }>(arr: T[]): Record<string, T> =>
  arr.reduce<Record<string, T>>((acc, item) => { acc[item.id] = item; return acc; }, {});

export const useFamilyStore = create<FamilyState>((set) => ({
  activeTree: null,
  currentUserRole: null,

  membersById: {},
  memberIds: [],
  relationshipsById: {},
  relationshipIds: [],
  eventsById: {},
  eventIds: [],
  documentsById: {},
  documentIds: [],

  setActiveTree: (tree) => set({ activeTree: tree }),
  setCurrentUserRole: (role) => set({ currentUserRole: role }),

  setMembers: (members) => set({
    membersById: toMap(members),
    memberIds: members.map((m) => m.id),
  }),

  setRelationships: (relationships) => set({
    relationshipsById: toMap(relationships),
    relationshipIds: relationships.map((r) => r.id),
  }),

  setEvents: (events) => set({
    eventsById: toMap(events),
    eventIds: events.map((e) => e.id),
  }),

  setDocuments: (documents) => set({
    documentsById: toMap(documents),
    documentIds: documents.map((d) => d.id),
  }),

  addMember: (member) => set((state) => ({
    membersById: { ...state.membersById, [member.id]: member },
    memberIds: [...state.memberIds, member.id],
  })),

  updateMember: (id, data) => set((state) => ({
    membersById: {
      ...state.membersById,
      [id]: { ...state.membersById[id], ...data },
    },
  })),

  deleteMember: (id) => set((state) => {
    const { [id]: _removed, ...remainingMembers } = state.membersById;
    // Also remove relationships involving this member
    const remainingRelIds = state.relationshipIds.filter(
      (rid) => {
        const r = state.relationshipsById[rid];
        return r.member1Id !== id && r.member2Id !== id;
      }
    );
    const remainingRels = remainingRelIds.reduce<Record<string, Relationship>>(
      (acc, rid) => { acc[rid] = state.relationshipsById[rid]; return acc; }, {}
    );
    return {
      membersById: remainingMembers,
      memberIds: state.memberIds.filter((mid) => mid !== id),
      relationshipsById: remainingRels,
      relationshipIds: remainingRelIds,
    };
  }),

  addRelationship: (rel) => set((state) => ({
    relationshipsById: { ...state.relationshipsById, [rel.id]: rel },
    relationshipIds: [...state.relationshipIds, rel.id],
  })),

  deleteRelationship: (id) => set((state) => {
    const { [id]: _removed, ...remaining } = state.relationshipsById;
    return {
      relationshipsById: remaining,
      relationshipIds: state.relationshipIds.filter((rid) => rid !== id),
    };
  }),
}));

// ─── Granular selectors (use these instead of the whole store) ────────────────

// useSyncExternalStore requires the same snapshot while the selected collection
// is unchanged. Mapping on every read otherwise loops under Zustand 5/React 19.
function collectionSelector<T>(read: (s: FamilyState) => [string[], Record<string, T>]) {
  const cache = new WeakMap<Record<string, T>, WeakMap<string[], T[]>>();
  return (state: FamilyState): T[] => {
    const [ids, records] = read(state);
    let byIds = cache.get(records);
    if (!byIds) { byIds = new WeakMap(); cache.set(records, byIds); }
    let values = byIds.get(ids);
    if (!values) { values = ids.map(id => records[id]); byIds.set(ids, values); }
    return values;
  };
}

export const selectMembers = collectionSelector<Member>(s => [s.memberIds, s.membersById]);
export const selectRelationships = collectionSelector<Relationship>(s => [s.relationshipIds, s.relationshipsById]);
export const selectEvents = collectionSelector<FamilyEvent>(s => [s.eventIds, s.eventsById]);
export const selectDocuments = collectionSelector<FamilyDocument>(s => [s.documentIds, s.documentsById]);

export const selectMemberById = (id: string) => (s: FamilyState) =>
  s.membersById[id];
