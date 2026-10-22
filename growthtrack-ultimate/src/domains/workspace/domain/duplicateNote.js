// Copy only editable Workspace fields. Ownership, revisions, timestamps,
// deletion state and private journal metadata must never travel with a copy.
export function duplicateNote(note, id = crypto.randomUUID()) {
  if (!note || note.source === 'mind-journal' || note.kind === 'mind-journal' || note.deletedAt) {
    throw new Error('Only an active Workspace note can be duplicated.');
  }
  const title = (note.title || 'Untitled Note').trim() || 'Untitled Note';
  return { id, title: `${title.slice(0, 493)} (copy)`, content: note.content || '',
    tags: [...(note.tags || [])], color: note.color || '#6366f1', pinned: false, starred: false };
}
