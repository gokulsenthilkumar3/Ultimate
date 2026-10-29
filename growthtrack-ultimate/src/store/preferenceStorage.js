import { createJSONStorage } from 'zustand/middleware';

/** Keep synchronous preference storage from serializing unchanged cache data. */
export function createPreferenceStorage(storage) {
  const json = createJSONStorage(() => storage);
  if (!json) return json;
  const saved = new Map();
  return {
    getItem(name) {
      saved.delete(name);
      return json.getItem(name);
    },
    setItem(name, value) {
      const previous = saved.get(name);
      const keys = Object.keys(value.state);
      if (previous && previous.version === value.version && keys.length === Object.keys(previous.state).length
        && keys.every(key => Object.prototype.hasOwnProperty.call(previous.state, key) && Object.is(previous.state[key], value.state[key]))) return;
      // Cache only successful writes. Persisted store slices use immutable updates.
      const result = json.setItem(name, value);
      saved.set(name, { version: value.version, state: { ...value.state } });
      return result;
    },
    removeItem(name) {
      saved.delete(name);
      return json.removeItem(name);
    },
  };
}
