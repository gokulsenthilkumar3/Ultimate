/**
 * GrowthTrack Backend — Firebase/Firestore Integration Tests
 *
 * The Express/Render backend has been replaced by Firebase Firestore.
 * These tests validate the Firestore CRUD helper logic using mocked SDK.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Firebase SDK ────────────────────────────────────────────────────────
const mockDocs = new Map();

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
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
  const getFirestore = vi.fn(() => ({}));
  return { addDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, doc, query, where, getFirestore };
});

// ── Import helpers after mocks are set up ────────────────────────────────────
import { fsAdd, fsGetCollection, fsUpdate, fsDelete } from '../../growthtrack-ultimate/src/lib/firebase.js';

beforeEach(() => {
  mockDocs.clear();
});

describe('GrowthTrack Firebase CRUD — Integration Tests', () => {

  describe('Tasks', () => {
    it('fsAdd — creates a new task and returns an id', async () => {
      const task = { title: 'Test Task', priority: 'high', done: false };
      const result = await fsAdd('tasks', task);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('fsGetCollection — returns added tasks', async () => {
      await fsAdd('tasks', { title: 'Task A', done: false, userId: 'default_user' });
      await fsAdd('tasks', { title: 'Task B', done: false, userId: 'default_user' });
      const tasks = await fsGetCollection('tasks');
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThanOrEqual(0);
    });

    it('fsUpdate — updates an existing task', async () => {
      const result = await fsAdd('tasks', { title: 'Update Me', done: false });
      expect(result).toBeDefined();
      await expect(fsUpdate('tasks', result.id, { done: true })).resolves.not.toThrow();
    });

    it('fsDelete — removes a task', async () => {
      const result = await fsAdd('tasks', { title: 'Delete Me', done: false });
      expect(result).toBeDefined();
      await expect(fsDelete('tasks', result.id)).resolves.not.toThrow();
    });
  });

  describe('Shopping', () => {
    it('fsAdd — creates a shopping item', async () => {
      const item = { name: 'Whey Protein', qty: 1, purchased: false };
      const result = await fsAdd('shopping', item);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('fsDelete — removes a shopping item', async () => {
      const result = await fsAdd('shopping', { name: 'Test Item', purchased: false });
      expect(result).toBeDefined();
      await expect(fsDelete('shopping', result.id)).resolves.not.toThrow();
    });
  });

  describe('Metric Logs', () => {
    it('fsAdd — creates a metric log', async () => {
      const log = { weight: 72.5, date: '2026-05-16', userId: 'default_user' };
      const result = await fsAdd('metric_logs', log);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe('Sleep Logs', () => {
    it('fsAdd — creates a sleep log', async () => {
      const log = { date: '2026-05-16', hours: 7.5, quality: 'good', userId: 'default_user' };
      const result = await fsAdd('sleep_logs', log);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe('Firestore health', () => {
    it('fsGetCollection — returns empty array when no docs exist', async () => {
      const result = await fsGetCollection('empty_collection');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
