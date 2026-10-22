import type { Member, Relationship, FamilyEvent, FamilyTree } from '../types/family';

export const MOCK_TREE: FamilyTree = {
  id: 'tree-1',
  name: 'The Sharma Family',
  ownerId: 'user-1',
  rootMemberId: 'mem-1',
  isPublic: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_MEMBERS: Member[] = [
  // Generation 1 (Grandparents)
  {
    id: 'mem-1',
    treeId: 'tree-1',
    name: 'Ramesh Sharma',
    gender: 'male',
    birthDate: '1945-05-12',
    bio: 'Family patriarch, retired civil engineer.',
    photoUrl: 'https://i.pravatar.cc/150?u=ramesh',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAlive: true,
  },
  {
    id: 'mem-2',
    treeId: 'tree-1',
    name: 'Sushma Sharma',
    gender: 'female',
    birthDate: '1948-08-20',
    bio: 'Matriarch, amazing cook, loves gardening.',
    photoUrl: 'https://i.pravatar.cc/150?u=sushma',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAlive: true,
  },

  // Generation 2 (Parents & Aunts/Uncles)
  {
    id: 'mem-3',
    treeId: 'tree-1',
    name: 'Rajesh Sharma',
    gender: 'male',
    birthDate: '1970-10-15',
    bio: 'Eldest son. Works in finance in Mumbai.',
    photoUrl: 'https://i.pravatar.cc/150?u=rajesh',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAlive: true,
  },
  {
    id: 'mem-4',
    treeId: 'tree-1',
    name: 'Priya Sharma',
    gender: 'female',
    birthDate: '1975-03-22',
    bio: 'Rajesh\'s wife. Architect.',
    photoUrl: 'https://i.pravatar.cc/150?u=priya',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAlive: true,
  },
  {
    id: 'mem-5',
    treeId: 'tree-1',
    name: 'Anjali Verma (née Sharma)',
    gender: 'female',
    birthDate: '1973-12-05',
    bio: 'Ramesh and Sushma\'s daughter. Teacher.',
    photoUrl: 'https://i.pravatar.cc/150?u=anjali',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAlive: true,
  },
  {
    id: 'mem-6',
    treeId: 'tree-1',
    name: 'Ravi Verma',
    gender: 'male',
    birthDate: '1971-06-18',
    bio: 'Anjali\'s husband. Software engineer.',
    photoUrl: 'https://i.pravatar.cc/150?u=ravi',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAlive: true,
  },

  // Generation 3 (Children/Cousins)
  {
    id: 'mem-7',
    treeId: 'tree-1',
    name: 'Rahul Sharma',
    gender: 'male',
    birthDate: '1998-09-10',
    bio: 'Rajesh & Priya\'s son. Currently in college.',
    photoUrl: 'https://i.pravatar.cc/150?u=rahul',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAlive: true,
  },
  {
    id: 'mem-8',
    treeId: 'tree-1',
    name: 'Neha Sharma',
    gender: 'female',
    birthDate: '2002-04-14',
    bio: 'Rajesh & Priya\'s daughter. High school student.',
    photoUrl: 'https://i.pravatar.cc/150?u=neha',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAlive: true,
  },
  {
    id: 'mem-9',
    treeId: 'tree-1',
    name: 'Karan Verma',
    gender: 'male',
    birthDate: '2000-11-30',
    bio: 'Anjali & Ravi\'s son. Graphic designer.',
    photoUrl: 'https://i.pravatar.cc/150?u=karan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAlive: true,
  },
];

export const MOCK_RELATIONSHIPS: Relationship[] = [
  // Grandparents marriage
  {
    id: 'rel-1',
    treeId: 'tree-1',
    member1Id: 'mem-1', // Ramesh
    member2Id: 'mem-2', // Sushma
    type: 'spouse',
    customLabel: 'Dada-Dadi',
    marriageDate: '1968-02-15',
    createdAt: new Date().toISOString(),
  },
  
  // Ramesh & Sushma's children
  {
    id: 'rel-2',
    treeId: 'tree-1',
    member1Id: 'mem-1', // Ramesh
    member2Id: 'mem-3', // Rajesh
    type: 'parent',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rel-3',
    treeId: 'tree-1',
    member1Id: 'mem-2', // Sushma
    member2Id: 'mem-3', // Rajesh
    type: 'parent',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rel-4',
    treeId: 'tree-1',
    member1Id: 'mem-1', // Ramesh
    member2Id: 'mem-5', // Anjali
    type: 'parent',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rel-5',
    treeId: 'tree-1',
    member1Id: 'mem-2', // Sushma
    member2Id: 'mem-5', // Anjali
    type: 'parent',
    createdAt: new Date().toISOString(),
  },

  // Rajesh's Marriage
  {
    id: 'rel-6',
    treeId: 'tree-1',
    member1Id: 'mem-3', // Rajesh
    member2Id: 'mem-4', // Priya
    type: 'spouse',
    marriageDate: '1996-11-20',
    createdAt: new Date().toISOString(),
  },

  // Rajesh & Priya's Children
  {
    id: 'rel-7',
    treeId: 'tree-1',
    member1Id: 'mem-3', // Rajesh
    member2Id: 'mem-7', // Rahul
    type: 'parent',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rel-8',
    treeId: 'tree-1',
    member1Id: 'mem-4', // Priya
    member2Id: 'mem-7', // Rahul
    type: 'parent',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rel-9',
    treeId: 'tree-1',
    member1Id: 'mem-3', // Rajesh
    member2Id: 'mem-8', // Neha
    type: 'parent',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rel-10',
    treeId: 'tree-1',
    member1Id: 'mem-4', // Priya
    member2Id: 'mem-8', // Neha
    type: 'parent',
    createdAt: new Date().toISOString(),
  },

  // Anjali's Marriage
  {
    id: 'rel-11',
    treeId: 'tree-1',
    member1Id: 'mem-5', // Anjali
    member2Id: 'mem-6', // Ravi
    type: 'spouse',
    marriageDate: '1998-01-25',
    createdAt: new Date().toISOString(),
  },

  // Anjali & Ravi's Children
  {
    id: 'rel-12',
    treeId: 'tree-1',
    member1Id: 'mem-5', // Anjali
    member2Id: 'mem-9', // Karan
    type: 'parent',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rel-13',
    treeId: 'tree-1',
    member1Id: 'mem-6', // Ravi
    member2Id: 'mem-9', // Karan
    type: 'parent',
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_EVENTS: FamilyEvent[] = [
  {
    id: 'event-1',
    treeId: 'tree-1',
    title: 'Diwali Gathering',
    type: 'festival',
    date: '2023-11-12',
    location: 'Ramesh\'s House, Mumbai',
    description: 'Whole family gathered for Diwali celebrations.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'event-2',
    treeId: 'tree-1',
    memberId: 'mem-1',
    title: 'Ramesh\'s 80th Birthday',
    type: 'birthday',
    date: '2025-05-12',
    location: 'Mumbai',
    description: 'Grand celebration planned for Dada\'s 80th birthday.',
    createdAt: new Date().toISOString(),
  }
];
