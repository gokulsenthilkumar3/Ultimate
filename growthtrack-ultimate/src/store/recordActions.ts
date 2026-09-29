import { apiSync } from './useStore';
import { captureSession, createWriteQueue, requireRecord, requireAcknowledgement, recordFields, mutationPayload } from './persistence';

// Collections other than Tasks publish changes after acknowledgement. A failed
// request leaves the previous record and its metadata intact.
export function createRecordActions(set: any, get: any, key: string, route: string) {
  const queue = createWriteQueue();
  const run = (id: string, operation: (current: () => boolean) => Promise<any>) => {
    const current = captureSession(get);
    return queue(`${get()._sessionVersion}:${get().user?.id}:${id}`, async () => {
      if (!current()) throw new Error('The session changed. Refresh and try again.');
      return operation(current);
    });
  };
  return {
    add: (payload: any) => run('create', async current => {
      const response = requireRecord(await apiSync(route, 'POST', payload));
      const saved = { ...payload, ...response };
      if (current()) set((state: any) => ({ [key]: [saved, ...(state[key] || []).filter((row: any) => String(row.id) !== String(saved.id))] }));
      return saved;
    }),
    update: (id: string, patch: any) => run(id, async current => {
      const previous = (get()[key] || []).find((row: any) => String(row.id) === String(id));
      const updates = typeof patch === 'function' ? patch(previous) : patch;
      const response = requireAcknowledgement(await apiSync(`${route}/${encodeURIComponent(id)}`, 'PUT', mutationPayload(previous, updates)));
      const saved = { ...previous, ...updates, ...recordFields(response) };
      if (current()) set((state: any) => ({ [key]: (state[key] || []).map((row: any) => String(row.id) === String(id) ? { ...row, ...updates, ...recordFields(response) } : row) }));
      return saved;
    }),
    remove: (id: string) => run(id, async current => {
      const previous = (get()[key] || []).find((row: any) => String(row.id) === String(id));
      const response = requireAcknowledgement(await apiSync(`${route}/${encodeURIComponent(id)}`, 'DELETE', mutationPayload(previous)));
      if (current()) set((state: any) => ({ [key]: (state[key] || []).filter((row: any) => String(row.id) !== String(id)) }));
      return response;
    }),
    upsertDate: (payload: any) => run(`date:${payload.date}`, async current => {
      const previous = (get()[key] || []).find((row: any) => row.date === payload.date);
      const response = previous?.id
        ? requireAcknowledgement(await apiSync(`${route}/${encodeURIComponent(previous.id)}`, 'PUT', mutationPayload(previous, payload)))
        : requireRecord(await apiSync(route, 'POST', payload));
      const saved = { ...previous, ...payload, ...(previous ? recordFields(response) : response) };
      if (current()) set((state: any) => ({ [key]: [saved, ...(state[key] || []).filter((row: any) => row.date !== payload.date)].sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))) }));
      return saved;
    }),
  };
}
