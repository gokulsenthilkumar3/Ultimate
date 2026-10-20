import { unified } from 'unified';
import remarkParse from 'remark-parse';

const parser = unified().use(remarkParse);
const normalize = text => text.normalize('NFKC').trim().toLocaleLowerCase();
const textOf = node => node.type === 'image' ? node.alt || '' : node.value || (node.children || []).map(textOf).join('');
function visit(node, work) { work(node); if (node.type === 'link' || node.type === 'linkReference') return; for (const child of node.children || []) visit(child, work); }
function escaped(text, index) { let count = 0; while (index > 0 && text[--index] === '\\') count++; return count % 2 === 1; }

function references(text) {
  return [...text.matchAll(/\[\[([^\]\n]+)\]\]/g)].map(match => {
    const separator = match[1].indexOf('|');
    const target = (separator < 0 ? match[1] : match[1].slice(0, separator)).trim();
    const label = (separator < 0 ? target : match[1].slice(separator + 1)).trim() || target;
    return { target, label, start: match.index, end: match.index + match[0].length };
  }).filter(reference => reference.target);
}
export const wikiReferences = text => references(text).filter(reference => !escaped(text, reference.start));
function textReferences(node, source) {
  if (!source || !node.position) return wikiReferences(node.value);
  const raw = source.slice(node.position.start.offset, node.position.end.offset);
  const original = references(raw);
  const parsed = references(node.value);
  // Escaped brackets stay literal. Entity-decoded brackets are also literal;
  // when raw and decoded counts differ, retain ordinary Markdown text.
  if (original.length !== parsed.length) return [];
  return parsed.filter((_reference, index) => !escaped(raw, original[index].start));
}

export function noteStructure(markdown) {
  const tree = parser.parse(markdown || '');
  const headings = [];
  const references = [];
  visit(tree, node => {
    if (node.type === 'heading') headings.push({ id: `note-heading-${headings.length}`, text: textOf(node), depth: node.depth, offset: node.position?.start.offset || 0 });
    // Markdown parsing keeps fenced/indented/inline code and HTML separate.
    // A literal bracket inside those nodes is never a knowledge link.
    if (node.type === 'text') references.push(...textReferences(node, markdown));
  });
  return { headings, references };
}

export function resolveNoteReference(notes, target) {
  const owned = notes.filter(note => note.source !== 'mind-journal' && note.kind !== 'mind-journal' && !note.deletedAt);
  const byId = owned.find(note => note.id === target);
  if (byId) return [byId];
  const title = normalize(target);
  return owned.filter(note => normalize(note.title || '') === title);
}

export function noteBacklinks(notes, target) {
  return notes.filter(note => note.id !== target.id && note.source !== 'mind-journal' && note.kind !== 'mind-journal' && !note.deletedAt)
    .filter(note => noteStructure(note.content).references.some(reference => resolveNoteReference(notes, reference.target).some(match => match.id === target.id)));
}

export const stableNoteLink = note => `[[${note.id}|${(note.title || 'Untitled Note').replace(/[\]|\r\n]/g, ' ')}]]`;

export function remarkNoteKnowledge() {
  return (tree, file) => {
    let headingIndex = 0;
    function transform(node) {
      if (node.type === 'heading') {
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: `note-heading-${headingIndex++}` } };
      }
      if (!node.children || node.type === 'link' || node.type === 'linkReference') return;
      const children = [];
      for (const child of node.children) {
        if (child.type !== 'text') { transform(child); children.push(child); continue; }
        let cursor = 0;
        for (const reference of textReferences(child, String(file?.value || ''))) {
          if (reference.start > cursor) children.push({ type: 'text', value: child.value.slice(cursor, reference.start) });
          children.push({ type: 'link', url: `#ultimate-note=${encodeURIComponent(reference.target)}`, children: [{ type: 'text', value: reference.label }] });
          cursor = reference.end;
        }
        if (cursor < child.value.length) children.push({ type: 'text', value: child.value.slice(cursor) });
      }
      node.children = children;
    }
    transform(tree);
  };
}
