import React from 'react';
import { USER } from '../data/userData';
import { Zap, Moon, Sun, Palette } from 'lucide-react';

const PALETTES = [
  { id: 'gold',   color: '#f59e0b', name: 'Gold' },
  { id: 'ocean',  color: '#0ea5e9', name: 'Ocean' },
  { id: 'mint',   color: '#10b981', name: 'Mint' },
  { id: 'violet', color: '#8b5cf6', name: 'Violet' },
  { id: 'rose',   color: '#f43f5e', name: 'Rose' },
];

export default function Header({ theme, setTheme, palette, setPalette, onOpenSettings }) {
  return (
    <header className="glass-card" style={{ 
      margin: '20px auto', 
      maxWidth: '1200px', 
      padding: '16px 24px', 
      borderRadius: '24px',
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      position: 'relative',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))', 
          padding: '10px', 
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px var(--accent-glow)'
        }}>
          <Zap color="var(--bg-base)" size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-display gradient-text" style={{ fontSize: '1.5rem', lineHeight: 1.1 }}>GrowthTrack</h1>
          <p className="label-caps" style={{ fontSize: '0.65rem', marginTop: '4px', letterSpacing: '0.2em' }}>Ultimate Digital Twin</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {/* Palette Selection */}
        <div style={{ display: 'flex', gap: '8px', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '999px', border: '1px solid var(--border)' }}>
          {PALETTES.map(p => (
            <button 
              key={p.id}
              onClick={() => setPalette(p.id)}
              style={{
                width: '20px', height: '20px', borderRadius: '50%', background: p.color,
                border: palette === p.id ? '2px solid var(--text-1)' : 'none',
                boxShadow: palette === p.id ? `0 0 10px ${p.color}` : 'none',
                cursor: 'pointer', padding: 0, transition: 'var(--transition)'
              }}
              title={p.name}
            />
          ))}
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-ghost"
          style={{ width: '44px', height: '44px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
           <button onClick={onOpenSettings} style={{ 
              background: 'var(--accent)', color: 'var(--bg-base)', 
              borderRadius: '50%', width: '44px', height: '44px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px var(--accent-glow)', border: 'none', cursor: 'pointer', transition: 'var(--transition)'
           }}>
             <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>GT</span>
           </button>
        </div>
      </div>
    </header>
  );
}
