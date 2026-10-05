import { describe, expect, it } from 'vitest';
import { MAX_MARKDOWN_BYTES, markdownFilename, noteToMarkdown, previewMarkdownImport } from './notes';

describe('portable Markdown Notes contract', () => {
  it('round-trips title and content including Markdown syntax and leading whitespace', () => {
    const note = { title: 'A practical note', content: '\n## Work\n\n- [ ] Read [[Research]]\n\n```js\nconst n = 1;\n```\n' };
    expect(previewMarkdownImport(noteToMarkdown(note), 'export.md')).toEqual(note);
  });

  it('uses a filename when there is no leading title and preserves the body', () => {
    expect(previewMarkdownImport('## Topic\n\nBody', 'Research.markdown')).toEqual({ title: 'Research', content: '## Topic\n\nBody' });
    expect(previewMarkdownImport('\uFEFF# Title\r\n\r\nBody', 'import.md')).toEqual({ title: 'Title', content: 'Body' });
  });

  it('rejects empty, binary, and oversized content, including multibyte text', () => {
    expect(() => previewMarkdownImport(' \n ', 'empty.md')).toThrow('empty');
    expect(() => previewMarkdownImport('abc\0def', 'binary.md')).toThrow('text');
    expect(() => previewMarkdownImport('é'.repeat(MAX_MARKDOWN_BYTES / 2 + 1), 'large.md')).toThrow('1 MB');
  });

  it('creates portable download filenames without path traversal or Windows device names', () => {
    expect(markdownFilename('../Private: Notes?')).toBe('..-Private- Notes-.md');
    expect(markdownFilename('CON')).toBe('note-CON.md');
    expect(markdownFilename('title. ')).toBe('title.md');
  });
});
