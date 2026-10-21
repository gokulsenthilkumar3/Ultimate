import { describe, expect, it, vi } from 'vitest';
import { createNotePublisher, createNoteSync } from './noteSync';

const note = { id: 'note-a', title: 'Research', content: 'Body', tags: [], color: '#f59e0b', pinned: false, starred: false, kind: 'workspace', revision: 1, updatedAt: '2026-10-06T00:00:00.000Z', deletedAt: null };
function fixture() {
  const rows = new Map();
  const state = { assertSession: vi.fn(), get: id => rows.get(id), publish: vi.fn(value => value.deletedAt ? rows.delete(value.id) : rows.set(value.id, value)) };
  return { state, publish: createNotePublisher(state), rows };
}
const change = (sequence, record = note) => ({ sequence, noteId: record.id, revision: record.revision, operation: record.deletedAt ? 'delete' : 'update', note: record });

describe('Notes live synchronization', () => {
  it('keeps newer records and tombstones when older acknowledgements arrive', () => {
    const { publish, rows, state } = fixture();
    publish({ ...note, revision: 3, content: 'Newer' });
    publish(note);
    expect(rows.get(note.id).content).toBe('Newer');
    publish({ ...note, revision: 4, deletedAt: note.updatedAt });
    publish({ ...note, revision: 3 });
    expect(rows.has(note.id)).toBe(false);
    publish({ ...note, revision: 5, content: 'Restored' });
    expect(rows.get(note.id).content).toBe('Restored');
    expect(state.publish).toHaveBeenCalledTimes(3);
  });
  it('applies all pages, accepts a current revision newer than the change, and advances once', async () => {
    const { state, publish, rows } = fixture();
    const api = { sync: vi.fn().mockResolvedValueOnce({ changes: [change(2, { ...note, revision: 3 })], cursor: 2, hasMore: true })
      .mockResolvedValueOnce({ changes: [change(4, { ...note, revision: 4, deletedAt: note.updatedAt })], cursor: 4, hasMore: false }) };
    const sync = createNoteSync(api, { ...state, publish });
    await expect(sync.pull()).resolves.toBe(4);
    expect(api.sync.mock.calls).toEqual([[0], [2]]);
    expect(rows.has(note.id)).toBe(false);
  });
  it('validates the full page before publishing and retains its cursor on invalid ordering', async () => {
    const { state, publish } = fixture();
    const api = { sync: vi.fn().mockResolvedValue({ changes: [change(2), change(1)], cursor: 2, hasMore: false }) };
    const sync = createNoteSync(api, { ...state, publish });
    await expect(sync.pull()).rejects.toThrow('Invalid Notes sync page');
    expect(sync.cursor()).toBe(0);
    expect(state.publish).not.toHaveBeenCalled();
  });
  it('retries from the last complete page after a connection failure', async () => {
    const { state, publish } = fixture();
    const api = { sync: vi.fn().mockResolvedValueOnce({ changes: [change(1)], cursor: 1, hasMore: true })
      .mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ changes: [], cursor: 1, hasMore: false }) };
    const sync = createNoteSync(api, { ...state, publish });
    await expect(sync.pull()).rejects.toThrow('Offline');
    expect(sync.cursor()).toBe(1);
    await expect(sync.pull()).resolves.toBe(1);
    expect(api.sync.mock.calls).toEqual([[0], [1], [1]]);
  });
  it('shares concurrent pulls and prevents late cross-account publication', async () => {
    const { state, publish } = fixture();
    let resolve;
    const pending = new Promise(done => { resolve = done; });
    const api = { sync: vi.fn(() => pending) };
    const sync = createNoteSync(api, { ...state, publish });
    const first = sync.pull();
    expect(sync.pull()).toBe(first);
    state.assertSession.mockImplementation(() => { throw new Error('Session changed'); });
    resolve({ changes: [change(1)], cursor: 1, hasMore: false });
    await expect(first).rejects.toThrow('Session changed');
    expect(state.publish).not.toHaveBeenCalled();
    expect(api.sync).toHaveBeenCalledTimes(1);
  });
  it('rejects a mismatched record and an empty page that claims more changes', async () => {
    const { state, publish } = fixture();
    const api = { sync: vi.fn().mockResolvedValueOnce({ changes: [{ ...change(1), noteId: 'other' }], cursor: 1, hasMore: false })
      .mockResolvedValueOnce({ changes: [], cursor: 0, hasMore: true }) };
    const sync = createNoteSync(api, { ...state, publish });
    await expect(sync.pull()).rejects.toThrow('Invalid Notes sync page');
    await expect(sync.pull()).rejects.toThrow('did not advance safely');
    expect(state.publish).not.toHaveBeenCalled();
  });
});
