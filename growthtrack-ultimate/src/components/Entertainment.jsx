import React, { useState } from 'react';
import { Film, Tv, Play, Star, Plus, Trash2, Search } from 'lucide-react';

const Entertainment = () => {
  const [media, setMedia] = useState([
    { id: 1, title: 'Tokyo Revengers', type: 'Anime', season: 3, episode: 12, rating: 4.5, status: 'Watching' },
    { id: 2, title: 'Vinland Saga', type: 'Anime', season: 2, episode: 24, rating: 5.0, status: 'Completed' },
    { id: 3, title: 'The Boys', type: 'Series', season: 4, episode: 1, rating: 4.8, status: 'Watching' },
    { id: 4, title: 'Interstellar', type: 'Movie', season: 1, episode: 1, rating: 5.0, status: 'Completed' }
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

  const deleteItem = (id) => {
    setMedia(media.filter(m => m.id !== id));
  };

  const updateProgress = (id, field, value) => {
    setMedia(media.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const filteredMedia = media.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', marginBottom: '10px' }}>
          <Film size={28} color="#ec4899" />
          Entertainment Tracker
        </h2>
        <p style={{ color: '#94a3b8' }}>Track your favorite Anime, Series, and Movies</p>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '150px', background: 'rgba(236, 72, 153, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 5px 0' }}>Total Titles</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{media.length}</p>
        </div>
        <div style={{ flex: 1, minWidth: '150px', background: 'rgba(59, 130, 246, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 5px 0' }}>Watching</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{media.filter(m => m.status === 'Watching').length}</p>
        </div>
        <div style={{ flex: 1, minWidth: '150px', background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 5px 0' }}>Completed</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{media.filter(m => m.status === 'Completed').length}</p>
        </div>
      </div>

      {/* Add & Search Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Add New Title</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input
              type="text"
              placeholder="Title name"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={newItem.type}
                onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
              >
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={newItem.status}
                onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button
              onClick={addItem}
              style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', color: 'white', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Plus size={18} /> Add to Library
            </button>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search your library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {filteredMedia.map(item => (
          <div key={item.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', tracking: '1px', color: '#ec4899', fontWeight: 'bold', background: 'rgba(236,72,153,0.1)', padding: '2px 8px', borderRadius: '10px' }}>{item.type}</span>
                  <h4 style={{ margin: '5px 0 0 0', fontSize: '18px' }}>{item.title}</h4>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 5px 0' }}>Season</p>
                  <input
                    type="number"
                    value={item.season}
                    onChange={(e) => updateProgress(item.id, 'season', parseInt(e.target.value))}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', color: 'white', padding: '5px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 5px 0' }}>Episode</p>
                  <input
                    type="number"
                    value={item.episode}
                    onChange={(e) => updateProgress(item.id, 'episode', parseInt(e.target.value))}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', color: 'white', padding: '5px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Star size={14} color="#f59e0b" fill="#f59e0b" />
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.rating}</span>
                </div>
                <select
                  value={item.status}
                  onChange={(e) => updateProgress(item.id, 'status', e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '5px', color: 'white', fontSize: '12px', padding: '5px' }}
                >
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ height: '3px', width: '100%', background: 'rgba(255,255,255,0.1)' }}>
              <div style={{ height: '100%', width: item.status === 'Completed' ? '100%' : '40%', background: '#ec4899' }} />
            </div>
          </div>
        ))}
      </div>
      {filteredMedia.length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
          <Tv size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
          <p>No titles found in your library</p>
        </div>
      )}
    </div>
  );
};

export default Entertainment;
