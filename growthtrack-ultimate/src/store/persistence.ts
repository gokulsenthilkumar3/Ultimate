// Responses and rollbacks must not affect another account or a newer snapshot.
export function captureSession(get: () => any) {
  const version = get()._sessionVersion;
  const revision = get()._dataRevision;
  const owner = get().user?.id ?? get().user?.email ?? null;
  return () => get()._sessionVersion === version && get()._dataRevision === revision
    && (get().user?.id ?? get().user?.email ?? null) === owner;
}

export function requireRecord(response: any) {
  if (!response || response.id == null || response.id === '') {
    throw new Error('The server did not acknowledge the saved record. Please refresh before retrying.');
  }
  return response;
}

// Collection PUT/DELETE returns { success, count }, rather than a record.
export function requireAcknowledgement(response: any) {
  if (response?.id != null || (response?.success === true && response.count !== 0)) return response;
  throw new Error('The server did not acknowledge the change. Please refresh before retrying.');
}

export function recordFields(response: any) {
  if (response?.id != null) return response;
  // Acknowledgements may contain the new version without a full record.
  return Object.fromEntries(['updatedAt', 'updatedBy'].filter(key => response?.[key] != null).map(key => [key, response[key]]));
}

export function mutationPayload(previous: any, updates: any = {}) {
  return { ...updates, ...(previous?.updatedAt ? { expectedUpdatedAt: previous.updatedAt } : {}) };
}

export function createWriteQueue() {
  const queues = new Map<string, Promise<any>>();
  return <T>(key: string, operation: () => Promise<T>): Promise<T> => {
    const request = (queues.get(key) || Promise.resolve()).then(operation);
    // Observe rejection for existing fire-and-forget consumers; the returned
    // promise still rejects for callers that await it.
    const tail = request.catch(() => undefined);
    queues.set(key, tail);
    void tail.then(() => { if (queues.get(key) === tail) queues.delete(key); });
    return request;
  };
}
