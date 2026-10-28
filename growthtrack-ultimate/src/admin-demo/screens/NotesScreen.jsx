import React, { useState } from 'react';
import { ArrowUpRight, BookOpen, Button, Empty, Panel, Plus } from '../components';

import { NOTES } from '../models/noteModel';

export default function NotesScreen({ view, added = [], addRecord, openRecord, noteDrafts, onNoteChange }) {
  const notes = [...NOTES, ...added.map((note, i) => ({ ...note, id: note.id || `added-${i}` }))];
  const [selectedId, setSelectedId] = useState(NOTES[0].id);
  const [localDrafts, setLocalDrafts] = useState({});
  const drafts = noteDrafts || localDrafts;
  const updateNote = (id, text) => onNoteChange ? onNoteChange(id, text) : setLocalDrafts({ ...localDrafts, [id]: text });
  const visible = view === 'pinned' ? notes.filter(note => note.pinned) : notes;
  const selected = visible.find(note => note.id === selectedId) || visible[0];
  return <div className="notes-layout"><Panel title="Your notes" subtitle={view === 'tags' ? 'Personal growth · your sample collection' : 'A place to think things through.'} action={<Button icon={Plus} onClick={() => addRecord('note')}>New note</Button>}><div className="note-list">{visible.length ? visible.map(note => <button key={note.id} aria-pressed={selected?.id === note.id} className={selected?.id === note.id ? 'note-selected' : ''} onClick={() => setSelectedId(note.id)}><BookOpen size={18} /><span><strong>{note.title}</strong><small>{note.pinned ? 'Pinned · ' : ''}Personal · Sample note</small></span><ArrowUpRight size={16} /></button>) : <Empty title="No notes in this view" />}</div></Panel>
    {selected && <Panel title={selected.title} subtitle="Personal · Sample note" action={<Button onClick={() => openRecord({ ...selected, notes: drafts[selected.id] ?? selected.notes, type: 'Note' })}>Details</Button>}><article className="note-paper"><span className="eyebrow">A LITTLE SPACE TO THINK</span>{view === 'editor' ? <label className="note-editor-label">Note body<textarea aria-label="Note body" value={drafts[selected.id] ?? selected.notes ?? ''} onChange={event => updateNote(selected.id, event.target.value)} rows={12} /><small>Edits stay in this local demo session.</small></label> : <p className="note-body">{drafts[selected.id] ?? selected.notes}</p>}<div className="note-tag">Personal growth</div></article></Panel>}
  </div>;
}
