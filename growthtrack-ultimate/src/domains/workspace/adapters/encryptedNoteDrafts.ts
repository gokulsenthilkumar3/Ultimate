import { listDrafts, removeDraft, saveDraft } from '../../../lib/drafts';
import { parseNoteDraft, type NoteEditorDraft } from '../domain/notes';
import type { NoteDraftPort, RecoverableNoteDraft } from '../application/noteDrafts';
import { getNoteDraftKey } from './noteDraftKeys';

const PREFIX = 'workspace-note:';
interface Envelope { version: 1; iv: Uint8Array<ArrayBuffer>; ciphertext: ArrayBuffer }
interface RawDraft { ownerId: string; module: string; updatedAt: string; data: unknown }
interface StoragePort {
  list(ownerId: string): Promise<RawDraft[]>;
  save(ownerId: string, module: string, data: Envelope): Promise<void>;
  remove(ownerId: string, module: string): Promise<void>;
}
interface KeyPort { get(ownerId: string): Promise<CryptoKey> }
const scope = (ownerId: string, noteId: string) => new TextEncoder().encode(JSON.stringify([ownerId, noteId]));

export function createEncryptedNoteDrafts(storage: StoragePort, keys: KeyPort, cryptography: Crypto = crypto): NoteDraftPort {
  const writes = new Map<string, Promise<void>>();
  const queue = (ownerId: string, noteId: string, work: () => Promise<void>) => {
    const id = JSON.stringify([ownerId, noteId]);
    const pending = (writes.get(id) || Promise.resolve()).catch(() => undefined).then(work);
    writes.set(id, pending);
    void pending.then(() => { if (writes.get(id) === pending) writes.delete(id); }, () => { if (writes.get(id) === pending) writes.delete(id); });
    return pending;
  };
  return {
    save: (ownerId, draft) => queue(ownerId, draft.noteId, async () => {
      if (!ownerId || !parseNoteDraft(draft)) throw new Error('A valid owned note draft is required.');
      const key = await keys.get(ownerId);
      const iv = cryptography.getRandomValues(new Uint8Array(12));
      const ciphertext = await cryptography.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: scope(ownerId, draft.noteId) }, key, new TextEncoder().encode(JSON.stringify(draft)));
      await storage.save(ownerId, PREFIX + draft.noteId, { version: 1, iv, ciphertext });
    }),
    async list(ownerId) {
      const records = (await storage.list(ownerId)).filter(record => record.ownerId === ownerId && record.module.startsWith(PREFIX));
      if (!records.length) return { drafts: [], unreadable: 0 };
      const key = await keys.get(ownerId);
      const drafts: RecoverableNoteDraft[] = [];
      let unreadable = 0;
      for (const record of records) {
        try {
          const envelope = record.data as Envelope;
          if (envelope?.version !== 1 || !envelope.iv || !envelope.ciphertext) throw new Error('Unsupported draft envelope.');
          const noteId = record.module.slice(PREFIX.length);
          const plaintext = await cryptography.subtle.decrypt({ name: 'AES-GCM', iv: envelope.iv, additionalData: scope(ownerId, noteId) }, key, envelope.ciphertext);
          const draft = parseNoteDraft(JSON.parse(new TextDecoder().decode(plaintext)));
          if (!draft || draft.noteId !== noteId) throw new Error('The draft identity is invalid.');
          drafts.push({ updatedAt: record.updatedAt, data: draft });
        } catch { unreadable++; }
      }
      return { drafts, unreadable };
    },
    remove: (ownerId, noteId) => queue(ownerId, noteId, () => storage.remove(ownerId, PREFIX + noteId)),
  };
}

export const encryptedNoteDrafts = createEncryptedNoteDrafts({ list: listDrafts, save: saveDraft, remove: removeDraft }, { get: getNoteDraftKey });
