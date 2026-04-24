import React, { useState } from 'react';
import { Film, Tv, Star, Plus, Trash2, Search } from 'lucide-react';

const Entertainment = () => {
  const [media, setMedia] = useState([
    { id: 1, title: 'Tokyo Revengers', type: 'Anime', season: 3, episode: 12, rating: 4.5, status: 'Watching' },
    { id: 2, title: 'Vinland Saga', type: 'Anime', season: 2, episode: 24, rating: 5.0, status: 'Completed' },
    { id: 3, title: 'The Boys', type: 'Series', season: 4, episode: 1, rating: 4.8, status: 'Watching' },
    { id: 4, title: 'Interstellar', type: 'Movie', season: 1, episode: 1, rating: 5.0, status: 'Completed' },
  ]);

  const [newItem, setNewItem] = useState({ title: '', type: 'Anime', season: 1, episode: 1, rating: 0, status: 'Watching' });
  const [searchTerm, setSearchTerm] = useState('');

  const types = ['Anime', 'Series', 'Movie', 'Documentary'];
  const statuses = ['Watching', 'Plan to Watch', 'Completed', 'Dropped'];

  const addItem = () => {
    if (newItem.title.trim()) {
      setMedia([...media, { ...newItem, id: Date.now() }]);
      setNewItem({ title: '', type: 'Anime', season: 1, episode: 1, rating: 0, status: 'Watching' });
    }
  };

  const deleteItem = (id) => setMedia(media.filter(m => m.id !== id));
  const updateProgress = (id, field, value) => setMedia(media.map(m => m.id === id ? { ...m, [field]: value } : m));

  const filteredMedia = media.filter(m =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (s) => ({ Watching: 'var(--info)', Completed: 'var(--success)', Dropped: 'var(--danger)', 'Plan to Watch': 'var(--warning)' }[s] || 'var(--text-3)');
  const getTypeColor = (t) => ({ Anime: '#ec4899', Series: '#0ea5e9', Movie: '#e5a50a', Documentary: '#10b981' }[t] || 'var(--text-3)');

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Entertainment</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
          <Film size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
          Entertainment Tracker
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Track your favourite Anime, Series, and Movies</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Titles', val: media.length, color: 'var(--accent)' },
          { label: 'Watching', val: media.filter(m => m.status === 'Watching').length, color: 'var(--info)' },
          { label: 'Completed', val: media.filter(m => m.status === 'Completed').length, color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <p className="label-caps">{s.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color, marginTop: '0.2rem' }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Add & Search */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <span className="card-title">Add New Title</span>
          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.75rem' }}>
            <input type="text" placeholder="Title name" value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} className="form-input" />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })} className="form-input">
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={newItem.status} onChange={(e) => setNewItem({ ...newItem, status: e.target.value })} className="form-input">
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={addItem} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={16} /> Add to Library
            </button>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="card-title">Search Library</span>
          <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input type="text" placeholder="Search by title or type..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input" style={{ paddingLeft: '40px' }} />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filteredMedia.map(item => (
          <div key={item.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: getTypeColor(item.type),
                    background: `${getTypeColor(item.type)}18`, padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                  }}>{item.type}</span>
                  <h4 style={{ margin: '0.3rem 0 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>{item.title}</h4>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{
                  background: 'none', border: 'none', color: 'var(--danger)',
                  cursor: 'pointer', padding: '4px', opacity: 0.6,
                }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ flex: 1 }}>
                  <p className="label-caps" style={{ marginBottom: '4px' }}>Season</p>
                  <input type="number" value={item.season}
                    onChange={(e) => updateProgress(item.id, 'season', parseInt(e.target.value))}
                    className="form-input" style={{ padding: '0.4rem', fontSize: '0.82rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="label-caps" style={{ marginBottom: '4px' }}>Episode</p>
                  <input type="number" value={item.episode}
                    onChange={(e) => updateProgress(item.id, 'episode', parseInt(e.target.value))}
                    className="form-input" style={{ padding: '0.4rem', fontSize: '0.82rem' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={14} color="#e5a50a" fill="#e5a50a" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>{item.rating}</span>
                </div>
                <select value={item.status} onChange={(e) => updateProgress(item.id, 'status', e.target.value)}
                  className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: '0.72rem' }}>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ height: '3px', background: 'var(--bg-elevated)' }}>
              <div style={{
                height: '100%',
                width: item.status === 'Completed' ? '100%' : '40%',
                background: `linear-gradient(90deg, ${getStatusColor(item.status)}, ${getTypeColor(item.type)})`,
                transition: 'width 0.6s var(--ease)',
              }} />
            </div>
          </div>
        ))}
      </div>

      {filteredMedia.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
          <Tv size={56} style={{ color: 'var(--text-3)', opacity: 0.2, marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>No titles found in your library</p>
        </div>
      )}
    </div>
  );
};

export default Entertainment;
