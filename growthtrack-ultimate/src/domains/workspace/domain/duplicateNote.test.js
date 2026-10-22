import { expect, it } from 'vitest';
import { duplicateNote } from './duplicateNote';

it('copies editable content and stable links without identity, revision or ownership metadata', () => {
  const note = { id: 'source', title: 'Research', content: '[[target|Plan]]', tags: ['work'], color: '#123456', userId: 'owner', revision: 7, pinned: true, starred: true, data: { secret: true } };
  const copy = duplicateNote(note, 'copy');
  expect(copy).toEqual({ id: 'copy', title: 'Research (copy)', content: '[[target|Plan]]', tags: ['work'], color: '#123456', pinned: false, starred: false });
  copy.tags.push('new'); expect(note.tags).toEqual(['work']);
  expect(duplicateNote({ ...note, title: 'a'.repeat(500) }).title).toHaveLength(500);
});
it('refuses journal and deleted records', () => {
  for (const note of [null, { source: 'mind-journal' }, { kind: 'mind-journal' }, { deletedAt: '2026-10-22' }]) expect(() => duplicateNote(note)).toThrow();
});
