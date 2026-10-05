import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEncryptedNoteDrafts } from './encryptedNoteDrafts';

function fixture() {
  const rows = new Map<string, { ownerId: string; module: string; updatedAt: string; data: unknown }>();
  const keys = new Map<string, CryptoKey>();
  const storage = {
    list: async (ownerId: string) => [...rows.values()].filter(row => row.ownerId === ownerId),
    save: async (ownerId: string, module: string, data: unknown) => { rows.set(JSON.stringify([ownerId, module]), { ownerId, module, updatedAt: new Date().toISOString(), data }); },
    remove: async (ownerId: string, module: string) => { rows.delete(JSON.stringify([ownerId, module])); },
  };
  const keyStore = { get: async (ownerId: string) => {
    if (!keys.has(ownerId)) keys.set(ownerId, await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) as unknown as CryptoKey);
    return keys.get(ownerId)!;
  } };
  const adapter = createEncryptedNoteDrafts(storage, keyStore, webcrypto as unknown as Crypto);
  return { adapter, rows, keys };
}
const draft = { noteId: 'note-1', title: 'Private draft', content: 'Sensitive unfinished text', tags: ['work'], color: '#6366f1', baseUpdatedAt: '2026-10-01T00:00:00.000Z' };

describe('encrypted owner-scoped note drafts', () => {
  it('stores ciphertext, recovers exact content, and uses a nonextractable key', async () => {
    const { adapter, rows, keys } = fixture();
    await adapter.save('owner', draft);
    const envelope = [...rows.values()][0].data as { iv: Uint8Array; ciphertext: ArrayBuffer };
    expect(envelope.iv.length).toBe(12);
    expect(new TextDecoder().decode(envelope.ciphertext)).not.toContain(draft.content);
    expect(envelope).not.toHaveProperty('content');
    expect((await adapter.list('owner')).drafts[0].data).toEqual(draft);
    await expect(webcrypto.subtle.exportKey('raw', keys.get('owner')!)).rejects.toThrow();
  });

  it('isolates owners and refuses an envelope copied to another owner or note ID', async () => {
    const { adapter, rows } = fixture();
    await adapter.save('owner', draft);
    expect(await adapter.list('other')).toEqual({ drafts: [], unreadable: 0 });
    const original = [...rows.values()][0];
    rows.set('foreign', { ...original, ownerId: 'other' });
    expect(await adapter.list('other')).toEqual({ drafts: [], unreadable: 1 });
    rows.set('moved', { ...original, module: 'workspace-note:note-2' });
    const result = await adapter.list('owner');
    expect(result.drafts).toHaveLength(1);
    expect(result.unreadable).toBe(1);
  });

  it('keeps unreadable drafts and serializes edits before acknowledged cleanup', async () => {
    const { adapter, rows } = fixture();
    await Promise.all([
      adapter.save('owner', draft),
      adapter.save('owner', { ...draft, content: 'Latest edit' }),
      adapter.remove('owner', draft.noteId),
    ]);
    expect(rows.size).toBe(0);
    await adapter.save('owner', draft);
    const original = [...rows.values()][0];
    const envelope = original.data as { ciphertext: ArrayBuffer };
    new Uint8Array(envelope.ciphertext)[0] ^= 255;
    expect(await adapter.list('owner')).toEqual({ drafts: [], unreadable: 1 });
    expect(rows.size).toBe(1);
  });
});
