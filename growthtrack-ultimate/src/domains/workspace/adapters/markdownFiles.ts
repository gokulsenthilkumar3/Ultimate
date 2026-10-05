import { MAX_MARKDOWN_BYTES, markdownFilename, noteToMarkdown, previewMarkdownImport, type NoteDocument } from '../domain/notes';
import type { ReadableNoteFile } from '../application/noteFiles';

export async function readMarkdownFile(file: ReadableNoteFile): Promise<NoteDocument> {
  if (!/\.(md|markdown)$/i.test(file.name)) throw new Error('Choose a .md or .markdown file.');
  if (file.size > MAX_MARKDOWN_BYTES) throw new Error('Choose a Markdown file no larger than 1 MB.');
  return previewMarkdownImport(await file.readText(), file.name);
}

export function downloadMarkdownNote(note: NoteDocument): void {
  const url = URL.createObjectURL(new Blob([noteToMarkdown(note)], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = markdownFilename(note.title);
  document.body.append(anchor);
  try { anchor.click(); }
  finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
}
