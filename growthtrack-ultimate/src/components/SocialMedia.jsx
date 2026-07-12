import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Globe, Link2, ExternalLink, Save, Copy, Check, Trash2,
  TrendingUp, Users, Heart, Eye, BarChart2, Activity
} from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';

// ── Brand config ───────────────────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  LinkedIn:  { color: '#0a66c2', bg: 'rgba(10,102,194,0.1)',   border: 'rgba(10,102,194,0.3)',  icon: '💼', placeholder: 'https://linkedin.com/in/username',   followerLabel: 'Connections',  likeLabel: 'Reactions' },
  Instagram: { color: '#e1306c', bg: 'rgba(225,48,108,0.08)',  border: 'rgba(225,48,108,0.3)',  icon: '📸', placeholder: 'https://instagram.com/username',    followerLabel: 'Followers',    likeLabel: 'Avg Likes' },
  Twitter:   { color: '#1da1f2', bg: 'rgba(29,161,242,0.08)',  border: 'rgba(29,161,242,0.3)',  icon: '🐦', placeholder: 'https://twitter.com/username',     followerLabel: 'Followers',    likeLabel: 'Avg Likes' },
  Threads:   { color: '#f0f6fc', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)',icon: '🧵', placeholder: 'https://threads.net/@username',    followerLabel: 'Followers',    likeLabel: 'Avg Likes' },
  WhatsApp:  { color: '#25d366', bg: 'rgba(37,211,102,0.08)',  border: 'rgba(37,211,102,0.3)',  icon: '💬', placeholder: '+91 9876543210 or wa.me link',      followerLabel: 'Contacts',     likeLabel: 'Replies' },
  GitHub:    { color: '#f0f6fc', bg: 'rgba(240,246,252,0.06)', border: 'rgba(240,246,252,0.15)',icon: '🐱', placeholder: 'https://github.com/username',      followerLabel: 'Followers',    likeLabel: 'Stars' },
  YouTube:   { color: '#ff0000', bg: 'rgba(255,0,0,0.08)',     border: 'rgba(255,0,0,0.28)',    icon: '▶️', placeholder: 'https://youtube.com/@channel',   followerLabel: 'Subscribers',  likeLabel: 'Avg Likes' },
};

function getBrandConfig(platform) {
  return PLATFORM_CONFIG[platform] || {
    color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'var(--accent)',
    icon: '🔗', placeholder: `https://${platform.toLowerCase()}.com/profile`,
    followerLabel: 'Followers', likeLabel: 'Likes'
  };
}

// ── Engagement rate calculation ────────────────────────────────────────────────
function calcEngagementRate(followers, avgLikes) {
  if (!followers || !avgLikes || followers === 0) return null;
  return ((avgLikes / followers) * 100).toFixed(2);
}

// ── Mini sparkline component ───────────────────────────────────────────────────
function Sparkline({ data = [] }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  return (
    <div className="sparkline-inline">
      {data.map((v, i) => (
        <div key={i} className={`sparkline-inline__bar${i === data.length - 1 ? ' sparkline-inline__bar--active' : ''}`}
          style={{ height: `${max > 0 ? Math.round((v / max) * 22) + 2 : 4}px` }} />
      ))}
    </div>
  );
}

// ── Analytics Card per platform ────────────────────────────────────────────────
function PlatformAnalyticsCard({ platform, cfg, link, analyticsData, copiedPlatform, onCopy, onDelete, isDefault, onChange }) {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const isLinked = !!link?.trim();

  const er = analyticsData
    ? calcEngagementRate(analyticsData.followers, analyticsData.avgLikes)
    : null;

  const erColor = er === null ? 'var(--text-3)'
    : parseFloat(er) >= 3 ? '#22c55e'
    : parseFloat(er) >= 1 ? '#f59e0b'
    : '#ef4444';

  return (
    <div className="platform-analytics-card" style={{ border: `1px solid ${isLinked ? cfg.border : 'var(--border)'}`, background: isLinked ? cfg.bg : undefined }}>
      {/* Header */}
      <div className="platform-analytics-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${cfg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
            {cfg.icon}
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: isLinked ? cfg.color : 'var(--text-1)', margin: 0 }}>{platform}</h3>
            {isLinked && er && (
              <span className="engagement-rate-pill" style={{ fontSize: '0.6rem', padding: '2px 8px', marginTop: '3px', display: 'inline-flex' }}>
                <Activity size={9} /> {er}% ER
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {isLinked && analyticsData && (
            <button onClick={() => setShowAnalytics(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showAnalytics ? cfg.color : 'var(--text-3)', transition: 'color 0.2s', display: 'flex' }}>
              <BarChart2 size={16} />
            </button>
          )}
          {!isDefault && (
            <button onClick={onDelete} title="Remove platform"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', opacity: 0.6, display: 'flex' }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* URL input */}
      <div style={{ padding: '0 1.5rem', paddingBottom: isLinked ? '0' : '1.25rem' }}>
        <div style={{ position: 'relative', marginBottom: isLinked ? '0.75rem' : 0 }}>
          <Link2 size={14} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: isLinked ? cfg.color : 'var(--text-3)', opacity: 0.7 }} />
          <input
            type="text"
            className="form-input"
            placeholder={cfg.placeholder}
            value={link}
            onChange={e => onChange(e.target.value)}
            style={{ width: '100%', paddingLeft: '38px', fontSize: '0.82rem' }}
          />
        </div>
      </div>

      {/* Quick actions */}
      {isLinked && (
        <div style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {link.startsWith('http') && (
            <a href={link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: cfg.color, fontWeight: 700, textDecoration: 'none' }}>
              <ExternalLink size={12} /> Open
            </a>
          )}
          <button onClick={() => onCopy(platform, link)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: copiedPlatform === platform ? '#10b981' : 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            {copiedPlatform === platform ? <Check size={12} /> : <Copy size={12} />}
            {copiedPlatform === platform ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Analytics panel */}
      {showAnalytics && analyticsData && (
        <div className="platform-analytics-card__metrics" style={{ animation: 'fadeInUp 0.3s ease both' }}>
          {[
            { icon: Users, label: cfg.followerLabel, value: analyticsData.followers?.toLocaleString(), color: cfg.color },
            { icon: Heart, label: cfg.likeLabel, value: analyticsData.avgLikes?.toLocaleString(), color: '#ef4444' },
            { icon: Eye, label: 'Avg Views', value: analyticsData.avgViews?.toLocaleString(), color: '#8b5cf6' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="platform-analytics-card__metric">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                <Icon size={12} color={color} />
              </div>
              <div className="platform-analytics-card__metric-value" style={{ color }}>{value || '—'}</div>
              <div className="platform-analytics-card__metric-label">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main SocialMedia Component ─────────────────────────────────────────────────
export default function SocialMedia() {
  const user = useStore(state => state.user);
  const fetchInitialData = useStore(state => state.fetchInitialData);
  const [socialData, setSocialData] = useState({});
  const [analyticsData, setAnalyticsData] = useState({}); // { platform: { followers, avgLikes, avgViews } }
  const [isSaving, setIsSaving] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const [copiedPlatform, setCopiedPlatform] = useState(null);
  const [activeTab, setActiveTab] = useState('profiles');
  const toast = useToast();

  useEffect(() => {
    if (user?.socialMedia) {
      setSocialData(user.socialMedia);
    } else {
      setSocialData({ LinkedIn: '', Instagram: '', Twitter: '', Threads: '', WhatsApp: '', GitHub: '', YouTube: '' });
    }
    // Load any saved analytics data
    if (user?.socialAnalytics) {
      setAnalyticsData(user.socialAnalytics);
    }
  }, [user]);

  const validateUrls = () => {
    for (const [platform, link] of Object.entries(socialData)) {
      if (!link?.trim()) continue;
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
      await apiSync('/user_profile', 'PUT', { ...user, socialMedia: socialData, socialAnalytics: analyticsData });
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

  const handleAnalyticsChange = (platform, field, value) => {
    setAnalyticsData(prev => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [field]: parseInt(value) || 0 }
    }));
  };

  const linkedPlatforms = useMemo(() =>
    Object.entries(socialData).filter(([, v]) => v?.trim()),
    [socialData]
  );

  // Aggregate stats
  const totalEngagement = useMemo(() => {
    return linkedPlatforms.reduce((acc, [platform]) => {
      const ad = analyticsData[platform];
      if (!ad) return acc;
      const er = parseFloat(calcEngagementRate(ad.followers, ad.avgLikes));
      return isNaN(er) ? acc : { count: acc.count + 1, sum: acc.sum + er };
    }, { count: 0, sum: 0 });
  }, [linkedPlatforms, analyticsData]);

  const avgER = totalEngagement.count > 0
    ? (totalEngagement.sum / totalEngagement.count).toFixed(2)
    : null;

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Digital Identity</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem', marginBottom: '0.35rem' }}>Social Graph Sync</h2>
          <p className="text-secondary">Manage and track your presence across the digital ecosystem.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary">
          <Save size={16} /> {isSaving ? 'SYNCING…' : 'SYNC & SAVE'}
        </button>
      </div>

      {/* Stats overview */}
      {linkedPlatforms.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Linked Platforms', value: linkedPlatforms.length, icon: Globe, color: 'var(--accent)' },
            { label: 'Avg Engagement Rate', value: avgER ? `${avgER}%` : '—', icon: TrendingUp, color: '#22c55e' },
            { label: 'Total Followers', value: Object.values(analyticsData).reduce((a, d) => a + (d?.followers || 0), 0).toLocaleString() || '—', icon: Users, color: '#6366f1' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card card-shine-wrap" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="label-caps">{label}</span>
                <Icon size={16} color={color} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color, fontFamily: 'var(--font-display)', marginTop: '0.4rem', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem' }}>
        {['profiles', 'analytics'].map(tab => (
          <button key={tab} className={`btn-sm${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)} style={{ textTransform: 'capitalize', padding: '0.5rem 1.25rem' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Connected strip */}
      {linkedPlatforms.length > 0 && activeTab === 'profiles' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '0.85rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, alignSelf: 'center', marginRight: '4px' }}>LINKED:</span>
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

      {/* PROFILES TAB */}
      {activeTab === 'profiles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {Object.entries(socialData).map(([platform, link]) => {
            const cfg = getBrandConfig(platform);
            const isDefault = platform in PLATFORM_CONFIG;
            return (
              <PlatformAnalyticsCard
                key={platform}
                platform={platform}
                cfg={cfg}
                link={link}
                analyticsData={analyticsData[platform]}
                copiedPlatform={copiedPlatform}
                onCopy={handleCopy}
                onDelete={() => setSocialData(prev => { const n = { ...prev }; delete n[platform]; return n; })}
                isDefault={isDefault}
                onChange={val => setSocialData(prev => ({ ...prev, [platform]: val }))}
              />
            );
          })}

          {/* Add custom platform */}
          <div className="glass-card" style={{ padding: '1.5rem', border: '2px dashed var(--border)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', gap: '0.75rem' }}>
            <Globe size={28} style={{ opacity: 0.3 }} />
            <p style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-2)' }}>Add Custom Platform</p>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <input className="form-input" placeholder="Platform name…" value={newPlatform}
                onChange={e => setNewPlatform(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newPlatform.trim()) {
                    setSocialData(prev => ({ ...prev, [newPlatform.trim()]: '' }));
                    setNewPlatform('');
                  }
                }}
                style={{ flex: 1, fontSize: '0.85rem' }} />
              <button className="btn-primary" style={{ padding: '8px 14px' }} disabled={!newPlatform.trim()}
                onClick={() => {
                  if (newPlatform.trim()) {
                    setSocialData(prev => ({ ...prev, [newPlatform.trim()]: '' }));
                    setNewPlatform('');
                  }
                }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {linkedPlatforms.map(([platform]) => {
            const cfg = getBrandConfig(platform);
            const ad = analyticsData[platform] || {};
            const er = calcEngagementRate(ad.followers, ad.avgLikes);
            const erColor = er === null ? 'var(--text-3)'
              : parseFloat(er) >= 3 ? '#22c55e'
              : parseFloat(er) >= 1 ? '#f59e0b'
              : '#ef4444';

            return (
              <div key={platform} className="glass-card card-shine-wrap" style={{ border: `1px solid ${cfg.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{cfg.icon}</span>
                  <h3 style={{ fontWeight: 800, color: cfg.color, fontSize: '1rem', flex: 1 }}>{platform}</h3>
                  {er && (
                    <span className="engagement-rate-pill" style={{ color: erColor, background: `${erColor}18`, borderColor: `${erColor}40` }}>
                      {er}% ER
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { key: 'followers', label: cfg.followerLabel, icon: Users, color: cfg.color },
                    { key: 'avgLikes', label: cfg.likeLabel, icon: Heart, color: '#ef4444' },
                    { key: 'avgViews', label: 'Avg Views', icon: Eye, color: '#8b5cf6' },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <div key={key}>
                      <label className="label-caps" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                        <Icon size={10} color={color} /> {label}
                      </label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={ad[key] || ''}
                        onChange={e => handleAnalyticsChange(platform, key, e.target.value)}
                        className="form-input"
                        style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}
                      />
                    </div>
                  ))}
                  {er && (
                    <div style={{ marginTop: '0.25rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: `${erColor}10`, border: `1px solid ${erColor}30` }}>
                      <span className="label-caps" style={{ display: 'block', marginBottom: '4px' }}>Engagement Rate</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 900, color: erColor, fontFamily: 'var(--font-display)' }}>{er}%</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: '6px' }}>
                        {parseFloat(er) >= 3 ? '✓ Excellent' : parseFloat(er) >= 1 ? '~ Good' : '↓ Needs work'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {linkedPlatforms.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '4rem', textAlign: 'center', color: 'var(--text-3)' }}>
              <Globe size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.2 }} />
              <p style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: '4px' }}>No linked platforms</p>
              <p style={{ fontSize: '0.82rem' }}>Add your profile URLs in the Profiles tab first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
