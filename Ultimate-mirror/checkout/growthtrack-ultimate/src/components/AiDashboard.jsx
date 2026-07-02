import React, { useState } from 'react';
import { Bot, Search, BrainCircuit, Sparkles, ExternalLink, Command } from 'lucide-react';

export default function AiDashboard() {
  const [query, setQuery] = useState('');
  const launchPerplexity = (e) => {
    e.preventDefault();
    if (!query) return;
    window.open(`https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  const launchGoogleAI = (e) => {
    e.preventDefault();
    if (!query) return;
    window.open(`https://gemini.google.com/prompt?q=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Cognitive Expansion</p>
          <h2 className="text-display" style={{ fontSize: '2.5rem' }}>AI Research Hub</h2>
          <p className="text-secondary">Direct uplink to Google Gemini and Perplexity LLM engines.</p>
        </div>
        <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>UPLINK ACTIVE</span>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', marginBottom: '2rem', background: 'var(--bg-glass)' }}>
        <BrainCircuit size={48} color="var(--accent)" style={{ margin: '0 auto 1.5rem', filter: 'drop-shadow(0 0 10px var(--accent-glow))' }} />
        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '2rem' }}>Omni-Search Interface</h3>
        
        <form style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
           <Command size={20} style={{ position: 'absolute', top: '50%', left: '20px', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
           <input 
             type="text" 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             placeholder="What do you want to research today?"
             style={{ 
               width: '100%', padding: '1.25rem 1.25rem 1.25rem 50px', 
               fontSize: '1.1rem', borderRadius: '16px', border: '1px solid var(--border-strong)',
               background: 'var(--bg-elevated)', color: 'white',
               boxShadow: '0 10px 30px rgba(0,0,0,0.5)', outline: 'none'
             }}
           />
           <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <button onClick={launchPerplexity} className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Search size={18} /> ASK PERPLEXITY
              </button>
              <button onClick={launchGoogleAI} className="btn-ghost" style={{ padding: '1rem 2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                <Sparkles size={18} color="#4285F4" /> ASK GOOGLE AI
              </button>
           </div>
        </form>
      </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
           <div className="glass-card" style={{ padding: '2rem' }}>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Search size={20} color="var(--accent)" /> Perplexity Engine
              </h4>
              <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Optimized for deep research, citation aggregation, and factual synthesis. Use this engine for coding solutions, historical data, and academic queries.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['React 19 patterns', 'Next.js API routing', 'Workout science'].map(t => (
                  <button key={t} onClick={() => setQuery(t)} className="btn-ghost" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>{t}</button>
                ))}
              </div>
           </div>

           <div className="glass-card" style={{ padding: '2rem' }}>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={20} color="#4285F4" /> Google Gemini
              </h4>
              <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Optimized for creative generation, Google Workspace integration, and conversational brainstorming. Use this for drafting content or conceptual ideation.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Draft an email', 'Explain quantum physics', 'Brainstorm app ideas'].map(t => (
                  <button key={t} onClick={() => setQuery(t)} className="btn-ghost" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>{t}</button>
                ))}
              </div>
           </div>
        </div>
    </div>
  );
}
