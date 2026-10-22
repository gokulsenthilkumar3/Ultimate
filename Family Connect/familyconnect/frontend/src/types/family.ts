// ─── Core Type Definitions for FamilyConnect ────────────────────────────────

export type Gender = 'male' | 'female' | 'other';

export type RelationshipType =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'cousin'
  | 'aunt_uncle'
  | 'niece_nephew'
  | 'inlaw'
  | 'friend'
  | 'godparent'
  | 'mentor'
  | 'step_parent'
  | 'step_child'
  | 'adopted';

export type EventType =
  | 'birthday'
  | 'marriage'
  | 'death'
  | 'anniversary'
  | 'festival'
  | 'gathering'
  | 'migration'
  | 'achievement';

export type DocumentType =
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'passport'
  | 'property_deed'
  | 'photo'
  | 'other';

export type Role = 'viewer' | 'editor' | 'admin' | 'family_head';

export type TreeLayout = 'vertical' | 'horizontal' | 'circular';

// ─── Entities ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  profilePic?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  treeId: string;
  name: string;
  birthDate?: string;
  birthLocation?: string;
  deathDate?: string;
  gender?: Gender;
  religion?: string;
  bio?: string;
  photoUrl?: string;
  occupation?: string;
  hobbies?: string[];
  phone?: string;
  email?: string;
  socialHandles?: Record<string, string>;
  relationshipToRoot?: string;
  createdAt: string;
  updatedAt: string;
  // Computed / UI helpers
  age?: number;
  isAlive?: boolean;
}

export interface Relationship {
  id: string;
  treeId: string;
  member1Id: string;
  member2Id: string;
  type: RelationshipType;
  customLabel?: string;
  marriageDate?: string;
  divorceDate?: string;
  createdAt: string;
}

export interface FamilyEvent {
  id: string;
  treeId: string;
  memberId?: string;
  type: EventType;
  title: string;
  date: string;
  location?: string;
  description?: string;
  photos?: string[];
  createdAt: string;
}

export interface FamilyDocument {
  id: string;
  treeId: string;
  memberId?: string;
  type: DocumentType;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface FamilyTree {
  id: string;
  name: string;
  ownerId: string;
  rootMemberId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccessControl {
  id: string;
  treeId: string;
  userId: string;
  role: Role;
  grantedAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'member_added' | 'member_updated' | 'relationship_added' | 'event_added' | 'photo_added';
  actorName: string;
  actorPhoto?: string;
  description: string;
  timestamp: string;
  targetName?: string;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface ModalState {
  addMember: boolean;
  editMember: boolean;
  memberDetail: boolean;
  addEvent: boolean;
  addRelationship: boolean;
}

export interface TreeStats {
  totalMembers: number;
  generations: number;
  totalRelationships: number;
  livingMembers: number;
  countries: number;
  cities: string[];
}
