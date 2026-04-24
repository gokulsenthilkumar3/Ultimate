import React from 'react';
import { Zap, Moon, Sun } from 'lucide-react';

const PALETTES = [
  { id: 'gold',   color: '#e5a50a', name: 'Gold' },
  { id: 'ocean',  color: '#0ea5e9', name: 'Ocean' },
  { id: 'mint',   color: '#10b981', name: 'Mint' },
  { id: 'violet', color: '#8b5cf6', name: 'Violet' },
  { id: 'rose',   color: '#f43f5e', name: 'Rose' },
];

export default function Header({ user, theme, setTheme, palette, setPalette }) {
  const accentColor = PALETTES.find(p => p.id === palette)?.color || '#e5a50a';
  const accentGlow = accentColor + '30';

  return (
    <header className="glass-card" style={{
      margin: '16px 0',
      padding: '14px 24px',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      zIndex: 1000,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          padding: '10px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 20px ${accentGlow}`,
          minWidth: '42px', minHeight: '42px',
          flexShrink: 0,
        }}>
          <Zap color="#fff" size={22} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-display" style={{
            fontSize: '1.35rem', lineHeight: 1.1,
            color: accentColor,
            fontWeight: 900,
          }}>Ultimate</h1>
          <p className="label-caps" style={{ fontSize: '0.6rem', marginTop: '3px' }}>
            Digital Twin v2.0
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Palette Dots */}
        <div style={{
          display: 'flex', gap: '7px', padding: '5px 8px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border)',
        }}>
          {PALETTES.map(p => (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              aria-label={`${p.name} palette`}
              style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: p.color, border: 'none',
                outline: palette === p.id ? `2px solid ${p.color}` : '2px solid transparent',
                outlineOffset: '2px',
                boxShadow: palette === p.id ? `0 0 10px ${p.color}50` : 'none',
                cursor: 'pointer', padding: 0,
                transition: 'all 0.3s ease',
                transform: palette === p.id ? 'scale(1.15)' : 'scale(1)',
              }}
              title={p.name}
            />
          ))}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          style={{
            width: '38px', height: '38px', padding: 0,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.65rem',
          paddingLeft: '1rem',
          borderLeft: '1px solid var(--border)',
        }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
              {user?.name || 'Athlete'}
            </p>
            <p className="label-caps" style={{ fontSize: '0.5rem', color: accentColor }}>
              Ultimate Plan
            </p>
          </div>
          <div style={{
            width: '38px', height: '38px',
            borderRadius: 'var(--radius-sm)',
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.95rem',
            boxShadow: `0 3px 12px ${accentGlow}`,
            flexShrink: 0,
          }}>
            {user?.name?.[0] || 'G'}
          </div>
        </div>
      </div>
    </header>
  );
}
