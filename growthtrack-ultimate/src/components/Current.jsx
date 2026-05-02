import React, { useState, useEffect } from 'react';
import { Newspaper, Rss, Globe, Radio, Bookmark, ExternalLink } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Current() {
  const toast = useToast();
  const [activeFeed, setActiveFeed] = useState('Global Tech');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const feeds = ['Global Tech'];

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const storyIds = await res.json();
      const top10 = storyIds.slice(0, 10);
      
      const storyPromises = top10.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()));
      const stories = await Promise.all(storyPromises);
      
      setArticles(stories.filter(s => s && s.title).map(s => ({
        id: s.id,
        title: s.title,
        source: s.url ? new URL(s.url).hostname.replace('www.', '') : 'Hacker News',
        url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        time: new Date(s.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: 'Technology'
      })));
    } catch (err) {
      toast.error('Failed to fetch real-time news.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Information Stream</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Pulse / Current</h2>
          <p className="text-secondary">Real-time news aggregator connected to global APIs.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-ghost" onClick={() => { toast.info('Refreshing...'); fetchNews(); }}>
            <Rss size={16} className={loading ? 'spin' : ''} style={{ marginRight: '8px' }} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '4px' }}>
        {feeds.map(feed => (
          <button
            key={feed}
            onClick={() => setActiveFeed(feed)}
            className={`btn-sm ${activeFeed === feed ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap', padding: '0.6rem 1.25rem' }}
          >
            <Globe size={14} style={{ marginRight: '6px' }} />
            {feed}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spin-ring" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {articles.map((article, i) => (
            <div key={i} className="glass-card" style={{ padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="label-caps" style={{ color: 'var(--accent)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article.source}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{article.time}</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                {article.title}
              </h3>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: '4px' }}>
                  {article.category}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-icon" onClick={() => toast.success('Article saved!')} title="Read Later"><Bookmark size={16}/></button>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                    <ExternalLink size={14} style={{ marginRight: '4px' }} /> Read
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
