import { describe, expect, it, vi } from 'vitest';
import { createNotesApi, createNotesWrites } from './notesApi';

const record = { id: 'note-a', title: 'Research', content: 'Text', tags: [], color: '#f59e0b', pinned: false, starred: false, revision: 1, kind: 'workspace', deletedAt: null, updatedAt: '2026-10-05T00:00:00.000Z' };
function state() {
  const rows = new Map([[record.id, record]]);
  return { assertSession: vi.fn(), get: id => rows.get(id), publish: vi.fn(saved => saved.deletedAt ? rows.delete(saved.id) : rows.set(saved.id, saved)) };
}

describe('versioned Notes adapter', () => {
  it('uses a stable create receipt and strips transport-unrelated metadata', async () => {
    const request = vi.fn().mockResolvedValue(record);
    const api = createNotesApi(request);
    await api.create({ ...record, userId: 'injected', createdAt: 'yesterday' });
    const body = JSON.parse(request.mock.calls[0][1].body);
    expect(body.id).toBe(record.id);
    expect(body.mutationId).toBe(`create:${record.id}`);
    expect(body.userId).toBeUndefined();
    expect(body.revision).toBeUndefined();
    expect(request.mock.calls[0][0]).toBe('/api/v1/workspace/notes');
  });
  it('rejects malformed acknowledgements and journals instead of claiming a saved note', async () => {
    const request = vi.fn().mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ ...record, kind: 'mind-journal' });
    const api = createNotesApi(request);
    await expect(api.create(record)).rejects.toThrow();
    await expect(api.get(record.id)).rejects.toThrow();
  });
  it('reuses an update mutation after an ambiguous response and retains the read revision', async () => {
    const api = { update: vi.fn().mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ ...record, content: 'Changed', revision: 2 }) };
    const cache = state();
    const uuid = vi.fn(() => 'mutation-a');
    const writes = createNotesWrites(api, cache, uuid);
    await expect(writes.update(record.id, { content: 'Changed' }, { expectedRevision: 1 })).rejects.toThrow('Response lost');
    expect(cache.publish).not.toHaveBeenCalled();
    await writes.update(record.id, { content: 'Changed' }, { expectedRevision: 1 });
    expect(api.update.mock.calls[0][1]).toEqual(api.update.mock.calls[1][1]);
    expect(api.update.mock.calls[1][1]).toMatchObject({ expectedRevision: 1, mutationId: 'mutation-a' });
    expect(uuid).toHaveBeenCalledTimes(1);
    expect(cache.publish).toHaveBeenCalledTimes(1);
  });
  it('refreshes the comparison record on conflict without publishing the losing draft', async () => {
    const server = { ...record, content: 'Winner', revision: 2 };
    const error = Object.assign(new Error('Conflict'), { status: 409, payload: { current: server } });
    const cache = state();
    const writes = createNotesWrites({ update: vi.fn().mockRejectedValue(error) }, cache, () => 'attempt');
    await expect(writes.update(record.id, { content: 'Losing draft' }, { expectedRevision: 1 })).rejects.toThrow('Conflict');
    expect(cache.publish).toHaveBeenCalledWith(server);
    expect(cache.get(record.id).content).toBe('Winner');
  });
  it('does not publish an acknowledgement into an account that changed mid-request', async () => {
    let resolve;
    const request = new Promise(done => { resolve = done; });
    const cache = state();
    const writes = createNotesWrites({ create: () => request }, cache);
    const result = writes.add(record);
    await vi.waitFor(() => expect(cache.assertSession).toHaveBeenCalledTimes(1));
    cache.assertSession.mockImplementation(() => { throw new Error('Session changed'); });
    resolve(record);
    await expect(result).rejects.toThrow('Session changed');
    expect(cache.publish).not.toHaveBeenCalled();
  });
  it('retains a deletion revision for undo and restores through the explicit API', async () => {
    const cache = state();
    const tombstone = { ...record, deletedAt: '2026-10-05T01:00:00.000Z', revision: 2 };
    const api = { remove: vi.fn().mockResolvedValue(tombstone), restore: vi.fn().mockResolvedValue({ ...record, revision: 3 }) };
    const writes = createNotesWrites(api, cache, () => 'mutation');
    await writes.remove(record.id);
    expect(cache.get(record.id)).toBeUndefined();
    await writes.restore(record.id, 1);
    expect(api.restore).toHaveBeenCalledWith(record.id, { revision: 1, expectedRevision: 2, mutationId: 'mutation' });
    expect(cache.get(record.id).revision).toBe(3);
  });
});
