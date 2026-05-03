import React, { useState } from 'react';
import { Plus, Trash2, Pin, PinOff, Save, Search, FileText } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';
import useStore, { 
  selectNotes, selectAddNote, selectDeleteNote, selectUpdateNote 
} from '../store/useStore';

const NOTE_COLORS = [
  { val: 'var(--accent)', label: 'Accent' },
  { val: '#10b981', label: 'Mint' },
  { val: '#3b82f6', label: 'Blue' },
  { val: '#8b5cf6', label: 'Violet' },
  { val: '#f43f5e', label: 'Rose' },
  { val: '#f59e0b', label: 'Amber' },
];

export default function Notes() {
  const notes = useStore(selectNotes);
  const addNote = useStore(selectAddNote);
  const deleteNoteAction = useStore(selectDeleteNote);
  const updateNote = useStore(selectUpdateNote);
  const isLoading = useStore(s => s.isLoading);

  const [selected, setSelected] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('var(--accent)');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const selectNote = (note) => {
    setSelected(note.id);
    setEditTitle(note.title);
    setEditContent(note.content || '');
    setEditColor(note.color || 'var(--accent)');
  };

  const handleCreateNote = async () => {
    const newNote = { title: 'New Note', content: '', color: 'var(--accent)', pinned: false };
    await addNote(newNote);
    toast.success('Note created');
  };

  const handleSaveNote = async () => {
    if (!selected) return;
    if (!editTitle.trim()) { toast.error('Note title cannot be empty'); return; }
    setSaving(true);
    try {
      await updateNote(selected, { title: editTitle.trim(), content: editContent, color: editColor });
      toast.success('Note saved');
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const handleTogglePin = async (note) => {
    await updateNote(note.id, { pinned: !note.pinned });
  };

  const handleDeleteNote = (id) => {
    setConfirmDelete(id);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    await deleteNoteAction(confirmDelete);
    if (selected === confirmDelete) { setSelected(null); setEditTitle(''); setEditContent(''); }
    toast.success('Note deleted');
    setConfirmDelete(null);
  };

  const filtered = (notes || []).filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);
  const ordered = [...pinned, ...unpinned];
  const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0', height: '100%' }}>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this note?"
        description="This action cannot be undone. The note content will be permanently purged."
        confirmLabel="Delete Note"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Personal Knowledge Base</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={28} color="var(--accent)" /> Notes
          </h2>
          <p className="text-secondary" style={{ marginTop: '0.35rem' }}>{notes.length} notes · synced to cloud</p>
        </div>
        <button className="btn-primary" onClick={handleCreateNote}><Plus size={16} /> NEW NOTE</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', height: 'calc(100vh - 250px)' }}>
        {/* Sidebar */}
        <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-dark)', borderRadius: '10px', padding: '8px 12px' }}>
              <Search size={14} color="var(--text-3)" />
              <input
                type="text" placeholder="Search notes…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: '0.85rem', outline: 'none', flex: 1 }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Syncing…</div>
            ) : ordered.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
                No notes yet.<br />Create your first one!
              </div>
            ) : (
              ordered.map(note => (
                <div key={note.id} onClick={() => selectNote(note)}
                  style={{
                    padding: '1rem 1.25rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: `3px solid ${note.color || 'var(--accent)'}`,
                    background: selected === note.id ? 'var(--accent-soft)' : 'transparent',
                    transition: 'background 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (selected !== note.id) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={e => { if (selected !== note.id) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-1)', lineHeight: 1.3, flex: 1, marginRight: '8px' }}>{note.title}</p>
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); handleTogglePin(note); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.pinned ? 'var(--accent)' : 'var(--text-3)', padding: '2px', display: 'flex' }}>
                        {note.pinned ? <Pin size={12} /> : <PinOff size={12} />}
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px', display: 'flex' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {note.content || 'Empty note'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        {selected ? (
          <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Editor Toolbar */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={editTitle} onChange={e => setEditTitle(e.target.value)}
                placeholder="Note title…"
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', outline: 'none', minWidth: '150px' }}
              />
              {/* Color Picker */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {NOTE_COLORS.map(c => (
                  <button key={c.val} onClick={() => setEditColor(c.val)} title={c.label}
                    style={{ width: '18px', height: '18px', borderRadius: '50%', background: c.val, border: 'none', cursor: 'pointer', outline: editColor === c.val ? `2.5px solid ${c.val}` : '2px solid transparent', outlineOffset: '2px', transform: editColor === c.val ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.2s' }}
                  />
                ))}
              </div>
              <button onClick={handleSaveNote} className="btn-primary" disabled={saving} style={{ padding: '7px 16px' }}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {/* Text Area */}
            <textarea
              value={editContent} onChange={e => setEditContent(e.target.value)}
              placeholder="Start writing…&#10;&#10;Supports plain text. Use empty lines to separate sections."
              style={{
                flex: 1, background: 'transparent', border: 'none', color: 'var(--text-1)',
                fontSize: '0.95rem', lineHeight: 1.8, padding: '1.5rem 2rem',
                resize: 'none', outline: 'none', fontFamily: 'var(--font-body)'
              }}
              onKeyDown={e => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSaveNote(); } }}
            />
            {/* Footer */}
            <div style={{ padding: '0.75rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{wordCount} words</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{editContent.length} characters</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent)', marginLeft: 'auto' }}>Ctrl+S to save</span>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-3)' }}>
            <FileText size={48} style={{ opacity: 0.25 }} />
            <p style={{ fontSize: '0.9rem' }}>Select a note to edit, or create a new one</p>
            <button className="btn-primary" onClick={handleCreateNote}><Plus size={16} /> Create Note</button>
          </div>
        )}
      </div>
    </div>
  );
}
