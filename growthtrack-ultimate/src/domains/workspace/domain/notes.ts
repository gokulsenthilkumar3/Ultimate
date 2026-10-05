/** Portable Notes document rules. No UI, network, storage, or platform imports. */
export interface NoteDocument { title: string; content: string }
export interface NoteEditorDraft extends NoteDocument {
  noteId: string;
  tags: string[];
  color: string;
  baseUpdatedAt: string | null;
}
export const MAX_MARKDOWN_BYTES = 1024 * 1024;

function titleText(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim() || 'Untitled Note';
}

export function noteToMarkdown(note: NoteDocument): string {
  return `# ${titleText(note.title)}\n\n${note.content}`;
}

export function previewMarkdownImport(source: string, filename: string): NoteDocument {
  if (new TextEncoder().encode(source).byteLength > MAX_MARKDOWN_BYTES) {
    throw new Error('Choose a Markdown file no larger than 1 MB.');
  }
  if (!source.trim()) throw new Error('The selected Markdown file is empty.');
  if (source.includes('\0')) throw new Error('Choose a text Markdown file.');
  const markdown = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const heading = /^# ([^\n]+)(?:\n|$)/.exec(markdown);
  const title = heading?.[1] || filename.replace(/^.*[\\/]/, '').replace(/\.(?:md|markdown)$/i, '');
  const rest = heading ? markdown.slice(heading[0].length) : markdown;
  return { title: titleText(title), content: heading && rest.startsWith('\n') ? rest.slice(1) : rest };
}

export function markdownFilename(title: string): string {
  let name = titleText(title).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 80);
  if (!name || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = `note-${name || 'untitled'}`;
  return `${name}.md`;
}

export function parseNoteDraft(value: unknown): NoteEditorDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as NoteEditorDraft;
  if (typeof draft.noteId !== 'string' || !draft.noteId || draft.noteId.length > 256
    || typeof draft.title !== 'string' || typeof draft.content !== 'string'
    || !Array.isArray(draft.tags) || draft.tags.some(tag => typeof tag !== 'string')
    || typeof draft.color !== 'string'
    || !(draft.baseUpdatedAt === null || typeof draft.baseUpdatedAt === 'string' && Number.isFinite(Date.parse(draft.baseUpdatedAt)))) return null;
  return { noteId: draft.noteId, title: draft.title, content: draft.content, tags: [...draft.tags], color: draft.color, baseUpdatedAt: draft.baseUpdatedAt };
}
