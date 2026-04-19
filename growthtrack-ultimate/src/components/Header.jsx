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

export default function Header({ theme, setTheme, palette, setPalette }) {
  return (
    <header className="glass-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ 
          background: 'var(--accent)', 
          padding: '8px', 
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px var(--accent-glow)'
        }}>
          <Zap color="#000" size={20} />
        </div>
        <div>
          <h1 className="text-display gradient-text" style={{ fontSize: '1.2rem', lineHeight: 1 }}>GrowthTrack</h1>
          <p className="label-caps" style={{ fontSize: '0.6rem', marginTop: '2px' }}>Ultimate Digital Twin</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Palette Selection */}
        <div style={{ display: 'flex', gap: '6px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '999px' }}>
          {PALETTES.map(p => (
            <button 
              key={p.id}
              onClick={() => setPalette(p.id)}
              style={{
                width: '18px', height: '18px', borderRadius: '50%', background: p.color,
                border: palette === p.id ? '2px solid #fff' : 'none',
                cursor: 'pointer', padding: 0
              }}
              title={p.name}
            />
          ))}
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-ghost"
          style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
           <div className="btn-primary" style={{ padding: '8px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <span style={{ fontSize: '12px', fontWeight: 800 }}>GT</span>
           </div>
        </div>
      </div>
    </header>
  );
}
