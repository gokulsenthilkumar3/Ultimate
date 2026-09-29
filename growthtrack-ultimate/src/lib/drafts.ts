export interface PrivateDraft<T = unknown> { key: string; ownerId: string; module: string; updatedAt: string; data: T }
const DATABASE = 'growthtrack-private-drafts-v1';
const writes = new Map<string, Promise<unknown>>();
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Recoverable drafts are unavailable in this browser.')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'key' }).createIndex('ownerId', 'ownerId');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Private draft storage could not be opened.'));
  });
}
function key(ownerId: string, module: string): string {
  if (!ownerId || !module) throw new Error('Drafts require a signed-in owner and module.');
  return JSON.stringify([ownerId, module]);
}
function serializeWrite<T>(draftKey: string, work: () => Promise<T>): Promise<T> {
  const previous = writes.get(draftKey) ?? Promise.resolve();
  const queued = previous.catch(() => undefined).then(work);
  writes.set(draftKey, queued);
  void queued.then(
    () => { if (writes.get(draftKey) === queued) writes.delete(draftKey); },
    () => { if (writes.get(draftKey) === queued) writes.delete(draftKey); },
  );
  return queued;
}
async function operation<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await open();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('drafts', mode);
    const request = action(transaction.objectStore('drafts'));
    transaction.oncomplete = () => { database.close(); resolve(request.result); };
    transaction.onerror = () => { database.close(); reject(new Error('Private draft storage failed. Your entry has not been submitted.')); };
    transaction.onabort = transaction.onerror;
  });
}
export async function readDraft<T>(ownerId: string, module: string): Promise<PrivateDraft<T> | null> {
  const record = await operation<PrivateDraft<T> | undefined>('readonly', store => store.get(key(ownerId, module)));
  return record?.ownerId === ownerId ? record : null;
}
export async function saveDraft<T>(ownerId: string, module: string, data: T): Promise<void> {
  const draftKey = key(ownerId, module);
  const record: PrivateDraft<T> = { key: draftKey, ownerId, module, data, updatedAt: new Date().toISOString() };
  await serializeWrite(draftKey, () => operation('readwrite', store => store.put(record)));
}
export async function removeDraft(ownerId: string, module: string): Promise<void> {
  const draftKey = key(ownerId, module);
  await serializeWrite(draftKey, () => operation('readwrite', store => store.delete(draftKey)));
}
export async function listDrafts(ownerId: string): Promise<PrivateDraft[]> {
  if (!ownerId) return [];
  const records = await operation<PrivateDraft[]>('readonly', store => store.index('ownerId').getAll(ownerId));
  return records.filter(record => record.ownerId === ownerId);
}
export async function removeOwnerDrafts(ownerId: string): Promise<void> {
  const records = await listDrafts(ownerId);
  await Promise.all(records.map(record => removeDraft(ownerId, record.module)));
}
