class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

let storage;

try {
  // Test if localStorage is accessible and working
  const testKey = '__storage_test__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
  storage = window.localStorage;
} catch (e) {
  console.warn('localStorage is not available, falling back to memory storage.', e);
  storage = new MemoryStorage();
}

export const safeLocalStorage = storage;
export default safeLocalStorage;
