import { noteCreateSchema, noteUpdateSchema, noteRecordSchema, noteSyncResponseSchema } from '../contracts/notes';

const BASE = '/api/v1/workspace/notes';
const fields = ['title', 'content', 'tags', 'color', 'pinned', 'starred'];
const editable = input => Object.fromEntries(fields.filter(key => input[key] !== undefined).map(key => [key, input[key]]));

// Request is an injected authenticated transport; native clients can bind the
// same contract to their session and network adapters without importing React.
export function createNotesApi(request) {
  const send = async (path, method, input) => noteRecordSchema.parse(await request(path, { method, body: JSON.stringify(input) }));
  return {
    async list(query = {}) {
      const page = await request(`${BASE}?${new URLSearchParams(query)}`);
      return { ...page, items: page.items.map(row => noteRecordSchema.parse(row)) };
    },
    get: async id => noteRecordSchema.parse(await request(`${BASE}/${encodeURIComponent(id)}`)),
    create: input => send(BASE, 'POST', noteCreateSchema.parse({ ...editable(input), id: input.id, mutationId: input.mutationId || `create:${input.id}` })),
    update: (id, input) => send(`${BASE}/${encodeURIComponent(id)}`, 'PUT', noteUpdateSchema.parse(input)),
    remove: (id, input) => send(`${BASE}/${encodeURIComponent(id)}`, 'DELETE', input),
    revisions: (id, cursor = 0) => request(`${BASE}/${encodeURIComponent(id)}/revisions?cursor=${cursor}`),
    restore: (id, input) => send(`${BASE}/${encodeURIComponent(id)}/restore`, 'POST', input),
    sync: async (cursor = 0) => noteSyncResponseSchema.parse(await request(`${BASE}/sync?cursor=${cursor}`)),
  };
}

export function createNotesWrites(api, state, uuid = () => crypto.randomUUID()) {
  const pending = new Map();
  const mutations = new Map();
  const tombstones = new Map();
  const publish = saved => {
    if (saved.deletedAt) tombstones.set(saved.id, saved); else tombstones.delete(saved.id);
    state.publish(saved);
  };
  const queue = (id, work) => {
    const next = (pending.get(id) || Promise.resolve()).catch(() => undefined).then(work);
    pending.set(id, next);
    void next.then(() => { if (pending.get(id) === next) pending.delete(id); }, () => { if (pending.get(id) === next) pending.delete(id); });
    return next;
  };
  const write = (id, operation, input, work) => queue(id, async () => {
    state.assertSession();
    const key = JSON.stringify([operation, id, input]);
    const mutationId = mutations.get(key) || uuid();
    mutations.set(key, mutationId);
    let saved;
    try { saved = await work({ ...input, mutationId }); }
    catch (error) {
      if (error.status === 409 && error.payload?.current?.id === id) { state.assertSession(); publish(noteRecordSchema.parse(error.payload.current)); }
      throw error;
    }
    state.assertSession();
    publish(saved);
    mutations.delete(key);
    return saved;
  });
  return {
    add: payload => queue(payload.id, async () => {
      state.assertSession();
      const saved = await api.create(payload);
      state.assertSession(); publish(saved); return saved;
    }),
    update: (id, patch, condition) => {
      const previous = state.get(id);
      const input = { ...editable(typeof patch === 'function' ? patch(previous) : patch), expectedRevision: condition?.expectedRevision ?? previous?.revision };
      return write(id, 'update', input, body => api.update(id, body));
    },
    remove: id => write(id, 'delete', { expectedRevision: state.get(id)?.revision }, input => api.remove(id, input)),
    revisions: (id, cursor = 0) => { state.assertSession(); return api.revisions(id, cursor); },
    restore: (id, revision) => write(id, 'restore', { revision, expectedRevision: (state.get(id) || tombstones.get(id))?.revision }, input => api.restore(id, input)),
  };
}
