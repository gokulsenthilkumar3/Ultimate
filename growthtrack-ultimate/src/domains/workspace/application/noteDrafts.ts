import type { NoteEditorDraft } from '../domain/notes';

export interface RecoverableNoteDraft { updatedAt: string; data: NoteEditorDraft }
export interface NoteDraftPort {
  list(ownerId: string): Promise<{ drafts: RecoverableNoteDraft[]; unreadable: number }>;
  save(ownerId: string, draft: NoteEditorDraft): Promise<void>;
  remove(ownerId: string, noteId: string): Promise<void>;
}
