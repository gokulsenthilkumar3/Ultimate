import type { NoteDocument } from '../domain/notes';

/** Native and web clients can provide file contents without a browser File type. */
export interface ReadableNoteFile { name: string; size: number; readText(): Promise<string> }
export interface NoteFilePort {
  read(file: ReadableNoteFile): Promise<NoteDocument>;
  download(note: NoteDocument): void;
}
