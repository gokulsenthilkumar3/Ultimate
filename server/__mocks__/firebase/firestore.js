// Manual mock for firebase/firestore used by server/__tests__/api.test.js
// Vitest resolves __mocks__ next to node_modules automatically.

const mockDocs = new Map();

const makeId = () => Math.random().toString(36).slice(2, 10);

export const getFirestore = vi.fn(() => ({}));
export const collection  = vi.fn((db, col) => ({ _col: col }));
export const doc         = vi.fn((db, col, id) => ({ _col: col, _id: id }));

export const addDoc = vi.fn(async (colRef, data) => {
  const id = makeId();
  const key = `${colRef._col}/${id}`;
  mockDocs.set(key, { id, ...data });
  return { id };
});

export const setDoc = vi.fn(async (docRef, data, opts = {}) => {
  const key = `${docRef._col}/${docRef._id}`;
  const existing = mockDocs.get(key) || {};
  mockDocs.set(key, opts.merge ? { ...existing, ...data } : { id: docRef._id, ...data });
});

export const updateDoc = vi.fn(async (docRef, data) => {
  const key = `${docRef._col}/${docRef._id}`;
  const existing = mockDocs.get(key) || { id: docRef._id };
  mockDocs.set(key, { ...existing, ...data });
});

export const deleteDoc = vi.fn(async (docRef) => {
  const key = `${docRef._col}/${docRef._id}`;
  mockDocs.delete(key);
});

export const getDocs = vi.fn(async (q) => {
  const prefix = `${q._col}/`;
  const entries = [...mockDocs.entries()]
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => ({ id: v.id, data: () => v }));
  return { docs: entries, empty: entries.length === 0 };
});

export const query  = vi.fn((colRef, ...constraints) => ({ ...colRef, _constraints: constraints }));
export const where  = vi.fn(() => ({}));
export const orderBy = vi.fn(() => ({}));
export const limit  = vi.fn(() => ({}));

// expose mockDocs so tests can inspect/reset state
export { mockDocs };

// allow tests to reset between runs
beforeEach(() => mockDocs.clear());
