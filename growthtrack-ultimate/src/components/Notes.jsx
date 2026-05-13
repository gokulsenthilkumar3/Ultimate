import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Pin, PinOff, Save, Search, FileText, Tag, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';
import useStore, {
  selectNotes, selectAddNote, selectDeleteNote, selectUpdateNote
} from '../store/useStore';

const NOTE_COLORS = [
  { val: 'var(--accent)', label: 'Accent' },
  { val: '#10b981',       label: 'Mint'   },
  { val: '#3b82f6',       label: 'Blue'   },
  { val: '#8b5cf6',       label: 'Violet' },
  { val: '#f43f5e',       label: 'Rose'   },
  { val: '#f59e0b',       label: 'Amber'  },
];

/** Wrap query matches in <mark> — returns array of React nodes */
function highlightText(text, query) {
  if (!query || !text) return text || '';
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: 'rgba(6,182,212,0.35)', color: '#fff', borderRadius: '2px', padding: '0 1px' }}>{part}</mark>
      : part
  );
}

export default function Notes() {
  const notes             = useStore(selectNotes);
  const addNote           = useStore(selectAddNote);
  const deleteNoteAction  = useStore(selectDeleteNote);
  const updateNote        = useStore(selectUpdateNote);
  const isLoading         = useStore(s => s.isLoading);

  const [selected, setSelected]     = useState(null);
  const [editTitle, setEditTitle]   = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor]   = useState('var(--accent)');
  const [editTags, setEditTags]     = useState([]);   // tags for current open note
  const [tagInput, setTagInput]     = useState('');
  const [search, setSearch]         = useState('');
  const [saving, setSaving]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const selectNote = (note) => {
    setSelected(note.id);
    setEditTitle(note.title);
    setEditContent(note.content || '');
    setEditColor(note.color || 'var(--accent)');
    setEditTags(note.tags || []);
  };

  const handleCreateNote = async () => {
    const newNote = { title: 'New Note', content: '', color: 'var(--accent)', pinned: false, tags: [] };
    await addNote(newNote);
    toast.success('Note created');
  };

  const handleSaveNote = async () => {
    if (!selected) return;
    if (!editTitle.trim()) { toast.error('Note title cannot be empty'); return; }
    setSaving(true);
    try {
      await updateNote(selected, { title: editTitle.trim(), content: editContent, color: editColor, tags: editTags });
      toast.success('Note saved');
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const handleTogglePin = async (note) => { await updateNote(note.id, { pinned: !note.pinned }); };

  const doDelete = async () => {
    if (!confirmDelete) return;
    await deleteNoteAction(confirmDelete);
    if (selected === confirmDelete) { setSelected(null); setEditTitle(''); setEditContent(''); setEditTags([]); }
    toast.success('Note deleted');
    setConfirmDelete(null);
  };

  // Tag helpers
  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || editTags.includes(t)) { setTagInput(''); return; }
    setEditTags(prev => [...prev, t]);
    setTagInput('');
  };
  const removeTag = (t) => setEditTags(prev => prev.filter(x => x !== t));

  // All unique tags across notes (for quick-filter later)
  const allTags = useMemo(() => [...new Set((notes || []).flatMap(n => n.tags || []))], [notes]);

  const filtered = (notes || []).filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase()) ||
    (n.tags || []).some(t => t.includes(search.toLowerCase()))
  );
  const pinned   = filtered.filter(n =>  n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);
  const ordered  = [...pinned, ...unpinned];
  const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0', height: '100%' }}>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this note?"
        description="This action cannot be undone."
        confirmLabel="Delete Note"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Personal Knowledge Base</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={28} color="var(--accent)" /> Notes
          </h2>
          <p className="text-secondary" style={{ marginTop: '0.35rem' }}>{(notes || []).length} notes · {allTags.length} tags</p>
        </div>
        <button className="btn-primary" onClick={handleCreateNote}><Plus size={16} /> NEW NOTE</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', height: 'calc(100vh - 250px)' }}>

        {/* ── Sidebar ── */}
        <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-dark)', borderRadius: '10px', padding: '8px 12px' }}>
              <Search size={14} color="var(--text-3)" />
              <input type="text" placeholder="Search notes, tags…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: '0.85rem', outline: 'none', flex: 1 }} />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0, display: 'flex' }}><X size={12} /></button>
              )}
            </div>
          </div>

          {/* Note list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Syncing…</div>
            ) : ordered.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>No notes yet.<br />Create your first one!</div>
            ) : ordered.map(note => (
              <div key={note.id} onClick={() => selectNote(note)}
                style={{
                  padding: '0.9rem 1.1rem', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${note.color || 'var(--accent)'}`,
                  background: selected === note.id ? 'var(--accent-soft)' : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { if (selected !== note.id) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { if (selected !== note.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-1)', lineHeight: 1.3, flex: 1, marginRight: '6px' }}>
                    {highlightText(note.title, search)}
                  </p>
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); handleTogglePin(note); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.pinned ? 'var(--accent)' : 'var(--text-3)', padding: '2px', display: 'flex' }}>
                      {note.pinned ? <Pin size={12} /> : <PinOff size={12} />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(note.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px', display: 'flex' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Sidebar search-highlight preview */}
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {highlightText(note.content || 'Empty note', search)}
                </p>

                {/* Tag chips in sidebar */}
                {(note.tags || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {(note.tags).slice(0, 4).map(t => (
                      <span key={t} style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '10px', background: 'rgba(6,182,212,0.12)', color: 'var(--accent)', fontWeight: 700 }}>
                        #{t}
                      </span>
                    ))}
                    {note.tags.length > 4 && <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>+{note.tags.length - 4}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Editor ── */}
        {selected ? (
          <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                placeholder="Note title…"
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: '1.2rem', fontWeight: 800, outline: 'none', minWidth: '150px' }} />
              {NOTE_COLORS.map(c => (
                <button key={c.val} onClick={() => setEditColor(c.val)} title={c.label}
                  style={{ width: '18px', height: '18px', borderRadius: '50%', background: c.val, border: 'none', cursor: 'pointer',
                    outline: editColor === c.val ? `2.5px solid ${c.val}` : '2px solid transparent', outlineOffset: '2px',
                    transform: editColor === c.val ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.2s' }} />
              ))}
              <button onClick={handleSaveNote} className="btn-primary" disabled={saving} style={{ padding: '7px 16px' }}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {/* Tags bar */}
            <div style={{ padding: '0.6rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <Tag size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              {editTags.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(6,182,212,0.12)', color: 'var(--accent)', fontWeight: 700, border: '1px solid rgba(6,182,212,0.25)' }}>
                  #{t}
                  <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex', lineHeight: 1 }}><X size={10} /></button>
                </span>
              ))}
              <input
                type="text" placeholder="+ add tag" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', fontSize: '0.75rem', outline: 'none', minWidth: '70px', flex: 1 }}
              />
              {tagInput && (
                <button onClick={addTag} style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(6,182,212,0.15)', color: 'var(--accent)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Add</button>
              )}
            </div>

            {/* Content */}
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
              placeholder={`Start writing…\n\nTip: Use Ctrl+S to save quickly.`}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: '0.95rem', lineHeight: 1.8, padding: '1.5rem 2rem', resize: 'none', outline: 'none', fontFamily: 'var(--font-body)' }}
              onKeyDown={e => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSaveNote(); } }}
            />

            {/* Footer */}
            <div style={{ padding: '0.6rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{wordCount} words</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{editContent.length} chars</span>
              {editTags.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>{editTags.length} tag{editTags.length !== 1 ? 's' : ''}</span>}
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
