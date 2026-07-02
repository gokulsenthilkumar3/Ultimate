import React, { useState, useEffect } from 'react';
import { Globe, Link2, ExternalLink, Save, Share2 } from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';

export default function SocialMedia() {
  const user = useStore(state => state.user);
  const fetchInitialData = useStore(state => state.fetchInitialData);
  const [socialData, setSocialData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (user?.socialMedia) {
      setSocialData(user.socialMedia);
    } else {
      setSocialData({
        LinkedIn: '', Instagram: '', Twitter: '', Threads: '', WhatsApp: '', GitHub: '', YouTube: ''
      });
    }
  }, [user]);

  const validateUrls = () => {
    for (const [platform, link] of Object.entries(socialData)) {
      if (!link || !link.trim()) continue;
      // If it looks like a URL (has a dot or starts with http) but isn't valid → warn
      const looksLikeUrl = link.includes('.') || link.startsWith('http');
      if (looksLikeUrl) {
        try {
          const url = link.startsWith('http') ? link : 'https://' + link;
          new URL(url);
        } catch {
          return platform; // return the invalid platform name
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const invalid = validateUrls();
    if (invalid) {
      toast.error(`Invalid URL for ${invalid}. Please enter a valid URL or handle.`);
      return;
    }
    setIsSaving(true);
    try {
      const updatedUser = { ...user, socialMedia: socialData };
      await apiSync('/user_profile', 'PUT', updatedUser);
      toast.success('Social graph synchronized.');
      fetchInitialData();
    } catch (err) {
      toast.error('Failed to sync social media data.');
    }
    setIsSaving(false);
  };

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Digital Identity</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Social Graph Sync</h2>
          <p className="text-secondary">Manage and synchronize your presence across the digital ecosystem.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} /> {isSaving ? 'SYNCING...' : 'SYNC TO PORTFOLIO'}
        </button>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {Object.entries(socialData).map(([platform, link]) => (
          <div key={platform} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                <Share2 size={16} color="var(--accent)" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{platform}</h3>
            </div>
            
            <div style={{ position: 'relative' }}>
              <Link2 size={16} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder={`Enter ${platform} URL or Handle...`}
                value={link}
                onChange={(e) => setSocialData(prev => ({ ...prev, [platform]: e.target.value }))}
                style={{ width: '100%', paddingLeft: '38px', fontSize: '0.85rem' }}
              />
            </div>

            {link && link.startsWith('http') && (
              <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, padding: 0, textDecoration: 'none' }}>
                <ExternalLink size={14} /> LAUNCH PORTAL
              </a>
            )}
          </div>
        ))}

        {/* Add Custom Platform Card */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px dashed var(--border)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '0.75rem' }}>
           <Globe size={24} style={{ marginBottom: '4px', opacity: 0.5 }} />
           <p style={{ fontWeight: 800, marginBottom: '0.25rem' }}>Add Custom Platform</p>
           <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
             <input
               className="form-input"
               placeholder="Platform name…"
               value={newPlatform}
               onChange={e => setNewPlatform(e.target.value)}
               onKeyDown={e => {
                 if (e.key === 'Enter' && newPlatform.trim()) {
                   setSocialData(prev => ({ ...prev, [newPlatform.trim()]: '' }));
                   setNewPlatform('');
                 }
               }}
               style={{ flex: 1, fontSize: '0.85rem' }}
             />
             <button className="btn-primary" style={{ padding: '8px 12px' }}
               disabled={!newPlatform.trim()}
               onClick={() => {
                 if (newPlatform.trim()) {
                   setSocialData(prev => ({ ...prev, [newPlatform.trim()]: '' }));
                   setNewPlatform('');
                 }
               }}
             >Add</button>
           </div>
        </div>
      </div>
    </div>
  );
}
