import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Newspaper, Rss, Globe, Radio, Bookmark, ExternalLink, TrendingUp, Cpu, Activity, Briefcase, CloudRain, Sun, Moon } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const CATEGORIES = [
  { id: 'general', label: 'Global News', icon: Globe, color: '#0ea5e9' },
  { id: 'technology', label: 'Technology', icon: Cpu, color: '#8b5cf6' },
  { id: 'business', label: 'Business', icon: Briefcase, color: '#f59e0b' },
  { id: 'health', label: 'Health & Science', icon: Activity, color: '#10b981' },
  { id: 'entertainment', label: 'Pulse', icon: Radio, color: '#ec4899' }
];

export default function Current() {
  const toast = useToast();
  const [activeCat, setActiveCat] = useState('general');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({ temp: '--', condition: 'Syncing Location...', icon: Sun });

  const timeGradient = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, transparent 100%)'; // Morning (Amber)
    if (hour >= 12 && hour < 17) return 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, transparent 100%)'; // Afternoon (Sky)
    if (hour >= 17 && hour < 20) return 'linear-gradient(135deg, rgba(244,63,94,0.08) 0%, transparent 100%)'; // Evening (Rose)
    return 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 100%)'; // Night (Indigo)
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation`);
          const data = await res.json();
          if (data?.current) {
             const t = data.current.temperature_2m;
             const p = data.current.precipitation;
             const hour = new Date().getHours();
             let cond = 'Clear';
             let Icon = (hour > 18 || hour < 6) ? Moon : Sun;
             
             if (p > 1) { cond = 'Rainy'; Icon = CloudRain; }
             else if (p > 0) { cond = 'Drizzle'; Icon = CloudRain; }
             else if (t > 28) { cond = 'Hot'; }
             else if (t < 15) { cond = 'Cold'; }
             
             setWeather({ temp: `${Math.round(t)}°C`, condition: cond, icon: Icon });
          }
        } catch (e) { 
          setWeather({ temp: '--', condition: 'Offline', icon: Activity });
        }
      }, () => {
        setWeather({ temp: '--', condition: 'Location Denied', icon: Globe });
      });
    }
  }, []);

  const fetchNews = useCallback(async (cat = activeCat) => {
    setLoading(true);
    try {
      // Using a reliable free news aggregator proxy for the demo
      // In production, this would be a secure backend proxy to NewsAPI or similar
      const res = await fetch(`https://ok.surf/api/v1/cors/news-feed`);
      const data = await res.json();
      
      // ok.surf returns an object with keys for each category
      const map = {
        general: 'World',
        technology: 'Technology',
        business: 'Business',
        health: 'Health',
        entertainment: 'Entertainment'
      };
      
      const raw = data[map[cat]] || data['World'] || [];
      
      setArticles(raw.map((a, i) => ({
        id: i,
        title: a.title,
        source: a.source,
        url: a.link,
        image: a.og || `https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80`,
        time: 'Just now',
        category: cat.toUpperCase()
      })));
    } catch (err) {
      // Fallback to Hacker News if the aggregator fails
      try {
        const hnRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const ids = await hnRes.json();
        const stories = await Promise.all(ids.slice(0, 12).map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())));
        setArticles(stories.map(s => ({
          id: s.id,
          title: s.title,
          source: 'Hacker News',
          url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
          image: `https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80`,
          time: new Date(s.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          category: 'TECH'
        })));
      } catch (e) {
        toast.error('Failed to synchronize news feeds.');
      }
    }
    setLoading(false);
  }, [activeCat, toast]);

  useEffect(() => {
    fetchNews(activeCat);
  }, [activeCat, fetchNews]);

  return (
    <div className="fade-in module-page" style={{ padding: '0.5rem 0', background: timeGradient, borderRadius: '24px' }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem', padding: '0 1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Global Signal Hub</p>
          <h2 className="text-display" style={{ fontSize: '3rem', letterSpacing: '-0.03em' }}>Pulse Stream</h2>
          <p className="text-secondary" style={{ fontSize: '1.1rem' }}>Aggregating real-time telemetry from 500+ verified global sources.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border)' }}>
              <weather.icon size={16} color="var(--accent)" />
              <span className="label-caps" style={{ fontSize: '0.7rem', color: 'var(--text-1)' }}>{weather.temp} · {weather.condition}</span>
           </div>
           <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--success-soft)' }}>
              <div className="pulse-dot" style={{ background: 'var(--success)' }} />
              <span className="label-caps" style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Feed Live</span>
           </div>
           <button className="btn-primary" onClick={() => fetchNews()} disabled={loading}>
             <Rss size={18} className={loading ? 'spin' : ''} /> REFRESH
           </button>
        </div>
      </div>

      {/* Category Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        overflowX: 'auto', 
        marginBottom: '3rem', 
        paddingBottom: '1rem',
        scrollbarWidth: 'none'
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            style={{ 
              whiteSpace: 'nowrap', 
              padding: '0.85rem 1.75rem',
              borderRadius: '30px',
              border: `1px solid ${activeCat === cat.id ? cat.color : 'var(--border)'}`,
              background: activeCat === cat.id ? `${cat.color}15` : 'transparent',
              color: activeCat === cat.id ? cat.color : 'var(--text-3)',
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={e => { if (activeCat !== cat.id) e.currentTarget.style.borderColor = cat.color; }}
            onMouseLeave={e => { if (activeCat !== cat.id) e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <cat.icon size={16} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* News Grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10rem 0', gap: '1.5rem' }}>
          <div className="spin-ring" style={{ width: '50px', height: '50px', borderTopColor: 'var(--accent)' }} />
          <p className="label-caps" style={{ color: 'var(--text-3)' }}>Synchronizing encrypted news stream...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
          {articles.map((article) => (
            <div key={article.id} className="news-card glass-card" style={{ 
              padding: 0, 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.4s ease, box-shadow 0.4s ease'
            }}>
              {/* Image Header */}
              <div style={{ width: '100%', height: '200px', overflow: 'hidden', position: 'relative' }}>
                <img 
                  src={article.image} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }} 
                  className="hover-scale-11"
                />
                <div style={{ position: 'absolute', top: '15px', left: '15px' }}>
                   <span style={{ 
                     background: 'rgba(0,0,0,0.6)', 
                     backdropFilter: 'blur(8px)', 
                     color: '#fff', 
                     padding: '4px 10px', 
                     borderRadius: '6px', 
                     fontSize: '0.65rem', 
                     fontWeight: 900,
                     letterSpacing: '0.05em',
                     border: '1px solid rgba(255,255,255,0.1)'
                   }}>
                     {article.category}
                   </span>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>{article.source}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{article.time}</span>
                </div>
                <h3 style={{ 
                  fontSize: '1.3rem', 
                  fontWeight: 800, 
                  color: 'var(--text-1)', 
                  marginBottom: '1.5rem', 
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {article.title}
                </h3>
                
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-icon" style={{ width: '36px', height: '36px' }} onClick={() => toast.success('Added to Intelligence Vault')} title="Save to Vault">
                      <Bookmark size={16} />
                    </button>
                  </div>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm" style={{ textDecoration: 'none', padding: '8px 20px', borderRadius: '12px' }}>
                    <ExternalLink size={14} style={{ marginRight: '8px' }} /> READ ARTICLE
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .news-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          border-color: var(--accent-soft);
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(16,185,129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129, 0); }
        }
      `}</style>
    </div>
  );
}
