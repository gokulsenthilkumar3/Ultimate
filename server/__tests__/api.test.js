/**
 * GrowthTrack Backend — Firebase/Firestore Integration Tests
 *
 * The Express/Render backend has been replaced by Firebase Firestore.
 * These tests validate the Firestore CRUD helper logic using mocked SDK.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// — Mock Firebase SDK ——————————————————————————————————————————
const mockDocs = new Map();

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
  logEvent: vi.fn(),
  setUserProperties: vi.fn(),
}));

vi.mock('firebase/performance', () => ({
  getPerformance: vi.fn(() => ({})),
  trace: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));

vi.mock('firebase/remote-config', () => ({
      getRemoteConfig: vi.fn(() => ({ settings: {}, defaultConfig: {} })),
  fetchAndActivate: vi.fn(() => Promise.resolve(true)),
  getValue: vi.fn(() => ({ asString: () => '' })),
}));

vi.mock('firebase/ai', () => ({
  getAI: vi.fn(() => ({})),
  getGenerativeModel: vi.fn(() => ({})),
  GoogleAIBackend: vi.fn(),
}));

vi.mock('firebase/firestore', () => {
  const addDoc = vi.fn(async (colRef, data) => {
    const id = `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    mockDocs.set(id, { ...data, id });
    return { id };
  });
  const setDoc = vi.fn(async (docRef, data) => {
    mockDocs.set(docRef._id, { ...data });
  });
  const updateDoc = vi.fn(async (docRef, data) => {
    const existing = mockDocs.get(docRef._id) || {};
    mockDocs.set(docRef._id, { ...existing, ...data });
  });
  const deleteDoc = vi.fn(async (docRef) => {
    mockDocs.delete(docRef._id);
  });
  const getDocs = vi.fn(async () => ({
    docs: [...mockDocs.entries()].map(([id, d]) => ({
      id,
      data: () => d,
    })),
  }));
  const collection = vi.fn((db, col) => ({ _col: col }));
  const doc = vi.fn((db, col, id) => ({ _col: col, _id: id }));
  const query = vi.fn((ref) => ref);
  const where = vi.fn(() => ({}));
  // getFirestore MUST return a truthy value so FIREBASE_ENABLED guard is bypassed
  const getFirestore = vi.fn(() => ({ _isMock: true }));
  return { addDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, doc, query, where, getFirestore };
});

// Override FIREBASE_ENABLED check: patch env so firebaseConfig looks valid
// This ensures db is not null before the tests import firebase.js
process.env.VITE_FIREBASE_PROJECT_ID       = 'test-project';
process.env.VITE_FIREBASE_API_KEY          = 'test-api-key';
process.env.VITE_FIREBASE_APP_ID           = 'test-app-id';

// — Import helpers AFTER mocks are registered ——————————————————
const { fsAdd, fsUpdate, fsDelete, fsGetCollection } = await import('../../growthtrack-ultimate/src/lib/firebase.js');

// ——————————————————————————————————————————————————————————————
describe('fsAdd', () => {
  beforeEach(() => mockDocs.clear());

  it('creates a task and returns an id', async () => {
    const result = await fsAdd('tasks', { title: 'Test Task', priority: 'high', done: false });
    expect(result).not.toBeNull();
    expect(result.id).toBeDefined();
  });

  it('creates a shopping item', async () => {
    const result = await fsAdd('shopping', { name: 'Whey Protein', qty: 1, purchased: false });
    expect(result).not.toBeNull();
    expect(result.id).toBeDefined();
  });

  it('creates a metric log', async () => {
    const result = await fsAdd('metric_logs', { weight: 72.5, date: '2026-05-16', userId: 'default_user' });
    expect(result).not.toBeNull();
    expect(result.id).toBeDefined();
  });

  it('creates a sleep log', async () => {
    const result = await fsAdd('sleep_logs', { date: '2026-05-16', hours: 7.5, quality: 'good', userId: 'default_user' });
    expect(result).not.toBeNull();
    expect(result.id).toBeDefined();
  });
});

describe('fsUpdate', () => {
  beforeEach(() => mockDocs.clear());

  it('updates an existing task', async () => {
    const created = await fsAdd('tasks', { title: 'Test Task', priority: 'high', done: false });
    expect(created).not.toBeNull();
    await fsUpdate('tasks', created.id, { done: true });
    const doc = mockDocs.get(created.id);
    expect(doc?.done).toBe(true);
  });
});

describe('fsDelete', () => {
  beforeEach(() => mockDocs.clear());

  it('removes a shopping item', async () => {
    const created = await fsAdd('shopping', { name: 'Whey Protein', qty: 1, purchased: false });
    expect(created).not.toBeNull();
    await fsDelete('shopping', created.id);
    expect(mockDocs.has(created.id)).toBe(false);
  });
});

describe('fsGetCollection', () => {
  beforeEach(() => mockDocs.clear());

  it('returns all tasks', async () => {
    await fsAdd('tasks', { title: 'Task A' });
    await fsAdd('tasks', { title: 'Task B' });
    const tasks = await fsGetCollection('tasks');
    expect(tasks.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for unknown collection', async () => {
    const result = await fsGetCollection('empty_collection');
    expect(Array.isArray(result)).toBe(true);
  });
});
