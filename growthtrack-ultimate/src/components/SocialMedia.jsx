import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Link2, ExternalLink, Save, Share2, Copy, Check, Trash2 } from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';

// Brand config: colour, emoji icon, display label, placeholder URL
const PLATFORM_CONFIG = {
  LinkedIn:  { color: '#0a66c2', bg: 'rgba(10,102,194,0.12)',  border: 'rgba(10,102,194,0.3)',  icon: '💼', placeholder: 'https://linkedin.com/in/username' },
  Instagram: { color: '#e1306c', bg: 'rgba(225,48,108,0.1)',   border: 'rgba(225,48,108,0.3)',  icon: '📸', placeholder: 'https://instagram.com/username' },
  Twitter:   { color: '#1da1f2', bg: 'rgba(29,161,242,0.1)',   border: 'rgba(29,161,242,0.3)',  icon: '🐦', placeholder: 'https://twitter.com/username' },
  Threads:   { color: '#f0f6fc', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)',icon: '🧵', placeholder: 'https://threads.net/@username' },
  WhatsApp:  { color: '#25d366', bg: 'rgba(37,211,102,0.1)',   border: 'rgba(37,211,102,0.3)',  icon: '💬', placeholder: '+91 9876543210 or wa.me link' },
  GitHub:    { color: '#f0f6fc', bg: 'rgba(240,246,252,0.07)', border: 'rgba(240,246,252,0.18)',icon: '🐱', placeholder: 'https://github.com/username' },
  YouTube:   { color: '#ff0000', bg: 'rgba(255,0,0,0.1)',      border: 'rgba(255,0,0,0.3)',     icon: '▶️', placeholder: 'https://youtube.com/@channel' },
};

function getBrandConfig(platform) {
  return PLATFORM_CONFIG[platform] || {
    color: 'var(--accent)', bg: 'rgba(255,199,0,0.08)', border: 'rgba(255,199,0,0.2)',
    icon: '🔗', placeholder: `https://${platform.toLowerCase()}.com/profile`
  };
}

export default function SocialMedia() {
  const user = useStore(state => state.user);
  const fetchInitialData = useStore(state => state.fetchInitialData);
  const [socialData, setSocialData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const [copiedPlatform, setCopiedPlatform] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (user?.socialMedia) {
      setSocialData(user.socialMedia);
    } else {
      setSocialData({ LinkedIn: '', Instagram: '', Twitter: '', Threads: '', WhatsApp: '', GitHub: '', YouTube: '' });
    }
  }, [user]);

  const validateUrls = () => {
    for (const [platform, link] of Object.entries(socialData)) {
      if (!link || !link.trim()) continue;
      const looksLikeUrl = link.includes('.') || link.startsWith('http');
      if (looksLikeUrl) {
        try { new URL(link.startsWith('http') ? link : 'https://' + link); }
        catch { return platform; }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const invalid = validateUrls();
    if (invalid) { toast.error(`Invalid URL for ${invalid}.`); return; }
    setIsSaving(true);
    try {
      await apiSync('/user_profile', 'PUT', { ...user, socialMedia: socialData });
      toast.success('Social graph synchronized.');
      fetchInitialData();
    } catch { toast.error('Failed to sync social media data.'); }
    setIsSaving(false);
  };

  const handleCopy = useCallback((platform, link) => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedPlatform(platform);
      toast.success(`${platform} link copied!`);
      setTimeout(() => setCopiedPlatform(null), 2000);
    });
  }, [toast]);

  const linkedPlatforms = Object.entries(socialData).filter(([, v]) => v?.trim());

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Digital Identity</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Social Graph Sync</h2>
          <p className="text-secondary">Manage and synchronize your presence across the digital ecosystem.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} /> {isSaving ? 'SYNCING...' : 'SYNC TO PORTFOLIO'}
        </button>
      </div>

      {/* Connected platforms strip */}
      {linkedPlatforms.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.75rem', padding: '0.9rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, alignSelf: 'center', marginRight: '4px' }}>CONNECTED:</span>
          {linkedPlatforms.map(([platform]) => {
            const cfg = getBrandConfig(platform);
            return (
              <span key={platform} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '99px', background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: '0.72rem', fontWeight: 700, color: cfg.color }}>
                {cfg.icon} {platform}
              </span>
            );
          })}
        </div>
      )}

      {/* Platform cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {Object.entries(socialData).map(([platform, link]) => {
          const cfg = getBrandConfig(platform);
          const isDefault = platform in PLATFORM_CONFIG;
          return (
            <div key={platform} className="glass-card" style={{ padding: '1.5rem', border: `1px solid ${link ? cfg.border : 'var(--border)'}`, background: link ? cfg.bg : undefined, transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: `1px solid ${cfg.border}` }}>
                  {cfg.icon}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: link ? cfg.color : 'var(--text-1)', flex: 1 }}>{platform}</h3>
                {!isDefault && (
                  <button onClick={() => setSocialData(prev => { const n = {...prev}; delete n[platform]; return n; })} title="Remove platform" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', opacity: 0.6 }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', marginBottom: link ? '0.75rem' : 0 }}>
                <Link2 size={14} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: link ? cfg.color : 'var(--text-3)', opacity: 0.7 }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder={cfg.placeholder}
                  value={link}
                  onChange={(e) => setSocialData(prev => ({ ...prev, [platform]: e.target.value }))}
                  style={{ width: '100%', paddingLeft: '38px', fontSize: '0.82rem' }}
                />
              </div>

              {link && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {link.startsWith('http') && (
                    <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: cfg.color, fontWeight: 700, textDecoration: 'none' }}>
                      <ExternalLink size={12} /> Open
                    </a>
                  )}
                  <button onClick={() => handleCopy(platform, link)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: copiedPlatform === platform ? '#10b981' : 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                    {copiedPlatform === platform ? <Check size={12} /> : <Copy size={12} />}
                    {copiedPlatform === platform ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Custom Platform */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px dashed var(--border)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '0.75rem' }}>
          <Globe size={24} style={{ opacity: 0.4 }} />
          <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>Add Custom Platform</p>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <input className="form-input" placeholder="Platform name…" value={newPlatform} onChange={e => setNewPlatform(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newPlatform.trim()) { setSocialData(prev => ({ ...prev, [newPlatform.trim()]: '' })); setNewPlatform(''); } }}
              style={{ flex: 1, fontSize: '0.85rem' }} />
            <button className="btn-primary" style={{ padding: '8px 12px' }} disabled={!newPlatform.trim()}
              onClick={() => { if (newPlatform.trim()) { setSocialData(prev => ({ ...prev, [newPlatform.trim()]: '' })); setNewPlatform(''); } }}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
