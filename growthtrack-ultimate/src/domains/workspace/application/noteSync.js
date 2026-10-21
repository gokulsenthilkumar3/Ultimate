import { noteRecordSchema, noteSyncResponseSchema } from '../contracts/notes';

// Receipts replay the original acknowledgement. That acknowledgement can be
// older than a later edit already received from another client.
export function createNotePublisher(state) {
  const versions = new Map();
  return input => {
    state.assertSession();
    const saved = noteRecordSchema.parse(input);
    const currentRevision = Math.max(versions.get(saved.id) || 0, state.get(saved.id)?.revision || 0);
    if (saved.revision <= currentRevision) return;
    state.publish(saved);
    versions.set(saved.id, saved.revision);
  };
}

// A cursor advances only after the complete validated page has been applied.
// Replaying a page after failure is safe through the monotonic publisher.
export function createNoteSync(api, state) {
  let cursor = 0;
  let active;
  const pull = async () => {
    let more;
    do {
      state.assertSession();
      const page = noteSyncResponseSchema.parse(await api.sync(cursor));
      state.assertSession();
      let sequence = cursor;
      for (const change of page.changes) {
        if (change.sequence <= sequence || change.sequence > page.cursor
          || (change.note && (change.note.id !== change.noteId || change.note.revision < change.revision))) throw new Error('Invalid Notes sync page. Retry without advancing the cursor.');
        sequence = change.sequence;
      }
      if (page.cursor !== sequence || (page.hasMore && !page.changes.length)) throw new Error('Notes sync did not advance safely.');
      for (const change of page.changes) if (change.note) state.publish(change.note);
      cursor = page.cursor;
      more = page.hasMore;
    } while (more);
    return cursor;
  };
  return {
    pull() {
      if (!active) {
        active = pull().finally(() => { active = undefined; });
      }
      return active;
    },
    cursor: () => cursor,
  };
}
