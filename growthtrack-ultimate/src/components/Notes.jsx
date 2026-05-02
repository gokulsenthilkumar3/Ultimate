import React, { useState, useRef } from 'react';
import { Mic, MicOff, Save, Trash2, FileText, Play } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Notes() {
  const [notes, setNotes] = useState([
    { id: 1, title: 'Project Ideas', content: 'Explore brain-computer interfaces for workflow automation.', type: 'text', date: '2026-05-02' },
    { id: 2, title: 'Daily Log', content: 'Audio note recorded.', type: 'audio', date: '2026-05-01' }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const toast = useToast();

  const toggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success('Voice note saved.');
      setNotes([{ id: Date.now(), title: newTitle || 'Voice Note', content: 'Audio recording', type: 'audio', date: new Date().toISOString().split('T')[0] }, ...notes]);
      setNewTitle('');
    } else {
      setIsRecording(true);
      toast.info('Recording started...');
    }
  };

  const saveTextNote = () => {
    if (!newContent.trim()) return toast.error('Note cannot be empty.');
    setNotes([{ id: Date.now(), title: newTitle || 'Text Note', content: newContent, type: 'text', date: new Date().toISOString().split('T')[0] }, ...notes]);
    setNewTitle('');
    setNewContent('');
    toast.success('Note saved.');
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Knowledge Base</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Notes & Voice Memos</h2>
          <p className="text-secondary">Capture your thoughts via text or audio recordings.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Editor / Recorder */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
           <h3 className="card-title" style={{ marginBottom: '1rem' }}>New Entry</h3>
           <input 
             type="text" 
             placeholder="Title (optional)" 
             value={newTitle} 
             onChange={(e) => setNewTitle(e.target.value)} 
             className="form-input" 
             style={{ marginBottom: '1rem' }} 
           />
           <textarea 
             placeholder="Write your note here..." 
             value={newContent} 
             onChange={(e) => setNewContent(e.target.value)} 
             className="form-input" 
             style={{ minHeight: '150px', marginBottom: '1rem', resize: 'vertical' }} 
           />
           <div style={{ display: 'flex', gap: '1rem' }}>
             <button onClick={saveTextNote} className="btn-primary" style={{ flex: 1 }}>
               <Save size={16} style={{ marginRight: '8px' }} /> Save Note
             </button>
             <button 
               onClick={toggleRecord} 
               className="btn-ghost" 
               style={{ flex: 1, background: isRecording ? 'rgba(244, 63, 94, 0.1)' : 'var(--bg-elevated)', color: isRecording ? 'var(--danger)' : 'var(--text-1)', border: isRecording ? '1px solid var(--danger)' : '1px solid var(--border)' }}
             >
               {isRecording ? <MicOff size={16} style={{ marginRight: '8px' }} /> : <Mic size={16} style={{ marginRight: '8px' }} />}
               {isRecording ? 'Stop Recording' : 'Record Voice'}
             </button>
           </div>
        </div>

        {/* Notes List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notes.map(note => (
            <div key={note.id} className="glass-card" style={{ padding: '1.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {note.type === 'text' ? <FileText size={18} color="var(--accent)" /> : <Mic size={18} color="var(--info)" />}
                  {note.title}
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{note.date}</span>
              </div>
              
              {note.type === 'text' ? (
                <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.5 }}>{note.content}</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--bg-dark)', borderRadius: '30px' }}>
                  <button className="btn-icon" style={{ background: 'var(--accent)', color: 'white' }}><Play size={14}/></button>
                  <div style={{ flex: 1, height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px' }}>
                    <div style={{ width: '30%', height: '100%', background: 'var(--accent)' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem' }}>00:45</span>
                </div>
              )}

              <button 
                onClick={() => deleteNote(note.id)} 
                className="btn-icon" 
                style={{ position: 'absolute', top: '15px', right: '15px', color: 'var(--text-3)' }}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
