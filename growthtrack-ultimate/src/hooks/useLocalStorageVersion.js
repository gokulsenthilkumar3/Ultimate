import safeLocalStorage from '../utils/safeLocalStorage';
/**
 * useLocalStorageVersion
 * Utility to check the current persisted store version.
 * Useful in the Info/About tab to display store health.
 */
export function getPersistedStoreVersion(storeName = 'growthtrack-user') {
  try {
    const raw = safeLocalStorage.getItem(storeName);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.version ?? 0;
  } catch {
    return null;
  }
}

export function clearPersistedStore(storeName = 'growthtrack-user') {
  safeLocalStorage.removeItem(storeName);
}
