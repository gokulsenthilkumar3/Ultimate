import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { noteStructure, resolveNoteReference, noteBacklinks, stableNoteLink, remarkNoteKnowledge } from './noteKnowledge';

describe('Notes knowledge rules', () => {
  it('extracts ATX and setext headings while excluding code and HTML from references', () => {
    const content = '# First\n\nSecond\n------\n\n[[Target|Alias]] and `[[inline]]`.\n\n```md\n# Code\n[[fenced]]\n```\n\n    [[indented]]\n\n<!-- [[comment]] -->';
    const result = noteStructure(content);
    expect(result.headings.map(heading => heading.text)).toEqual(['First', 'Second']);
    expect(result.headings[1].depth).toBe(2);
    expect(result.references.map(reference => reference.target)).toEqual(['Target']);
    expect(content.slice(result.headings[1].offset)).toMatch(/^Second/);
  });
  it('resolves IDs before titles, preserves ambiguity and excludes private/deleted records', () => {
    const notes = [{ id: 'one', title: 'Café' }, { id: 'two', title: 'Cafe\u0301' }, { id: 'hidden', title: 'Café', source: 'mind-journal' }, { id: 'deleted', title: 'Café', deletedAt: 'today' }];
    expect(resolveNoteReference(notes, '  CAFÉ ').map(note => note.id)).toEqual(['one', 'two']);
    expect(resolveNoteReference(notes, 'one').map(note => note.id)).toEqual(['one']);
    expect(resolveNoteReference(notes, 'hidden')).toEqual([]);
  });
  it('keeps escaped brackets and ordinary-link labels literal', () => {
    const source = '\\[[literal]] and [[valid]] and [caption [[external]]](https://example.test)';
    expect(noteStructure(source).references.map(reference => reference.target)).toEqual(['valid']);
    const processor = unified().use(remarkParse).use(remarkNoteKnowledge);
    const tree = processor.runSync(processor.parse(source), source);
    const links = tree.children[0].children.filter(node => node.type === 'link');
    expect(links.map(node => node.url)).toEqual(['#ultimate-note=valid', 'https://example.test']);
  });
  it('derives backlinks through stable IDs and keeps them after rename', () => {
    const target = { id: 'target-id', title: 'Renamed' };
    const notes = [target, { id: 'source', title: 'Source', content: '[[target-id|Old title]]' }, { id: 'private', source: 'mind-journal', content: '[[target-id]]' }, { id: 'code', content: '`[[target-id]]`' }];
    expect(noteBacklinks(notes, target).map(note => note.id)).toEqual(['source']);
    expect(stableNoteLink({ id: 'target-id', title: 'Bad ] |\nLabel' })).toBe('[[target-id|Bad     Label]]');
  });
  it('transforms text links and heading IDs without changing normal links or code nodes', () => {
    const processor = unified().use(remarkParse).use(remarkNoteKnowledge);
    const tree = processor.runSync(processor.parse('# Heading\n\n[[target|Readable]] and `[[literal]]` and [ordinary](https://example.test)'));
    expect(tree.children[0].data.hProperties.id).toBe('note-heading-0');
    const nodes = tree.children[1].children;
    expect(nodes.find(node => node.type === 'link').url).toBe('#ultimate-note=target');
    expect(nodes.find(node => node.type === 'inlineCode').value).toBe('[[literal]]');
    expect(nodes.filter(node => node.type === 'link').at(-1).url).toBe('https://example.test');
  });
});
