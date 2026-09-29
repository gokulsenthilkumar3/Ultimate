import { apiSync } from './useStore';
import { captureSession, createWriteQueue, requireRecord } from './persistence';

export const JOURNAL_SOURCE = 'mind-journal';
export const LEGACY_JOURNAL_KEY = 'gt_journal_entries';

export function validLegacyJournals(value: any) {
  if (!Array.isArray(value)) return [];
  return value.filter(entry => entry && typeof entry.text === 'string' && entry.text.trim()
    && typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date));
}

export function journalPayload(entry: any) {
  const text = String(entry.text || '').trim();
  return {
    ...entry, source: JOURNAL_SOURCE, journalVersion: 1,
    title: `Journal · ${entry.date}`, content: text, text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

// The same entry imported by the same owner always uses the same server ID.
// This also permits reconciliation after a response is lost after commit.
export async function legacyJournalId(owner: string, entry: any) {
  const canonical = JSON.stringify([owner, entry.id ?? null, entry.date, entry.time ?? null, entry.text, entry.prompt ?? null]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return `journal-import-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function createJournalActions(set: any, get: any) {
  const queue = createWriteQueue();
  return {
    importLegacyJournals: (entries: any[], confirmed = false) => {
      const current = captureSession(get);
      const owner = get().user?.id;
      return queue(`${get()._sessionVersion}:${owner}:journal-import`, async () => {
        if (!confirmed || !owner) throw new Error('Confirm that the selected journals belong to your signed-in account.');
        if (!current()) throw new Error('The session changed. Refresh and try again.');
        const selected = validLegacyJournals(entries);
        if (selected.length !== entries.length) throw new Error('Some selected journal entries are invalid. Review the preview.');
        let rows = await apiSync('/notes', 'GET');
        if (!Array.isArray(rows)) throw new Error('Journal records could not be verified. Try again.');
        const saved: any[] = [];
        for (const entry of selected) {
          if (!current()) throw new Error('The session changed. Refresh and try again.');
          const id = await legacyJournalId(owner, entry);
          if (!current()) throw new Error('The session changed. Refresh and try again.');
          let note = rows.find((row: any) => row.id === id);
          if (!note) {
            const payload = journalPayload({ ...entry, id, legacyImportId: id });
            try { note = requireRecord(await apiSync('/notes', 'POST', payload)); }
            catch (error) {
              // Do not resend an ambiguous write. Verify the deterministic ID.
              try {
                const refreshed = await apiSync('/notes', 'GET');
                if (Array.isArray(refreshed)) note = refreshed.find((row: any) => row.id === id);
              } catch { /* preserve the original write error */ }
              if (!note) throw error;
            }
          }
          if (note.id !== id || (note.userId && note.userId !== owner) || note.source !== JOURNAL_SOURCE) throw new Error('The imported journal could not be verified.');
          if (!current()) throw new Error('The session changed. Refresh and try again.');
          set((state: any) => ({ notes: [note, ...(state.notes || []).filter((row: any) => row.id !== id)] }));
          saved.push(note);
          rows = [note, ...rows];
        }
        // Originals remain as a local backup, even after successful import.
        return saved;
      });
    },
  };
}
