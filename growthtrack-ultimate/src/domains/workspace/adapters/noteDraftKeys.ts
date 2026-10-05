const KEY_DATABASE = 'growthtrack-note-draft-keys-v1';
const keys = new Map<string, Promise<CryptoKey>>();

function openKeys(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB || !globalThis.crypto?.subtle) { reject(new Error('Encrypted note drafts are unavailable.')); return; }
    const request = indexedDB.open(KEY_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('keys', { keyPath: 'ownerId' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('The note draft key store could not be opened.'));
  });
}

async function loadOrCreateKey(ownerId: string): Promise<CryptoKey> {
  const candidate = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const database = await openKeys();
  return new Promise((resolve, reject) => {
    // The read and add share one transaction, so simultaneous tabs use the same
    // stored key rather than replacing a key already used to encrypt a draft.
    const transaction = database.transaction('keys', 'readwrite');
    const store = transaction.objectStore('keys');
    const request = store.get(ownerId);
    let selected: CryptoKey;
    request.onsuccess = () => {
      selected = request.result?.key || candidate;
      if (!request.result) store.add({ ownerId, key: candidate });
    };
    transaction.oncomplete = () => {
      database.close();
      if (selected?.type !== 'secret' || selected.extractable || selected.algorithm.name !== 'AES-GCM') reject(new Error('The stored note draft key is invalid.'));
      else resolve(selected);
    };
    transaction.onerror = transaction.onabort = () => { database.close(); reject(new Error('The note draft key could not be stored.')); };
  });
}

export function getNoteDraftKey(ownerId: string): Promise<CryptoKey> {
  if (!ownerId) return Promise.reject(new Error('A note draft requires a signed-in owner.'));
  let pending = keys.get(ownerId);
  if (!pending) {
    pending = loadOrCreateKey(ownerId);
    keys.set(ownerId, pending);
    void pending.catch(() => { keys.delete(ownerId); });
  }
  return pending;
}
