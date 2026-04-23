import React from 'react';
import { Zap, Moon, Sun } from 'lucide-react';

const PALETTES = [
  { id: 'gold',   color: '#f59e0b', name: 'Gold' },
  { id: 'ocean',  color: '#0ea5e9', name: 'Ocean' },
  { id: 'mint',   color: '#10b981', name: 'Mint' },
  { id: 'violet', color: '#8b5cf6', name: 'Violet' },
  { id: 'rose',   color: '#f43f5e', name: 'Rose' },
];

export default function Header({ user, theme, setTheme, palette, setPalette }) {
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
      zIndex: 1000,
      border: '1px solid var(--border-strong)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
        <div style={{
          background: 'var(--accent)',
          padding: '10px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px var(--accent-glow)',
          minWidth: '44px',
          minHeight: '44px',
        }}>
          <Zap color="#ffffff" size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-display gradient-text" style={{ fontSize: '1.5rem', lineHeight: 1.1 }}>Ultimate</h1>
          <p className="label-caps" style={{ fontSize: '0.65rem', marginTop: '4px', letterSpacing: '0.2em' }}>Digital Twin v2.0</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Palette Selection */}
        <div style={{
          display: 'flex', gap: '8px', padding: '6px',
          background: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)',
          borderRadius: '999px',
          border: '1px solid var(--border)'
        }}>
          {PALETTES.map(p => (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              style={{
                width: '18px', height: '18px', borderRadius: '50%', background: p.color,
                border: palette === p.id ? `2.5px solid ${theme === 'dark' ? '#fff' : '#111'}` : '2px solid transparent',
                boxShadow: palette === p.id ? `0 0 10px ${p.color}` : 'none',
                cursor: 'pointer', padding: 0, transition: 'var(--transition)',
                outline: palette === p.id && theme === 'light' ? `1px solid ${p.color}` : 'none',
                outlineOffset: '2px',
              }}
              title={p.name}
            />
          ))}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-ghost"
          style={{
            width: '40px', height: '40px', padding: 0, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-1)',
            background: theme === 'light' ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)',
            border: '1px solid var(--border)',
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-1)' }}>{user?.name || 'Athlete'}</p>
            <p className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--accent)' }}>Ultimate Plan</p>
          </div>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'var(--accent)', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.9rem', boxShadow: '0 4px 12px var(--accent-glow)',
            minWidth: '40px',
          }}>
            {user?.name?.[0] || 'G'}
          </div>
        </div>
      </div>
    </header>
  );
}
