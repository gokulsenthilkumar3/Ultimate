import React, { useState, useRef, useEffect } from 'react';
import { Zap, Moon, Sun, Bell, Search, Command, Circle, Settings } from 'lucide-react';
import HealthScoreRing from './HealthScoreRing';

const PALETTES = [
  { id: 'gold',   color: '#e5a50a', name: 'Gold' },
  { id: 'ocean',  color: '#0ea5e9', name: 'Ocean' },
  { id: 'mint',   color: '#10b981', name: 'Mint' },
  { id: 'violet', color: '#8b5cf6', name: 'Violet' },
  { id: 'rose',   color: '#f43f5e', name: 'Rose' },
];

export default function Header({ user, theme, setTheme, palette, setPalette, onOpenSettings }) {
  const accentColor = PALETTES.find(p => p.id === palette)?.color || '#e5a50a';

  return (
    <header style={{
      margin: '14px 0',
      padding: '10px 20px',
      borderRadius: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      zIndex: 1000,
      background: 'var(--bg-glass)',
      border: '1px solid var(--border-strong)',
      backdropFilter: 'blur(32px) saturate(200%)',
      WebkitBackdropFilter: 'blur(32px) saturate(200%)',
      boxShadow: `0 4px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 60px -20px ${accentColor}40`,
      transition: 'box-shadow 0.5s ease',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`,
          padding: '9px',
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 20px ${accentColor}50, 0 0 0 1px rgba(255,255,255,0.1) inset`,
          minWidth: '40px', minHeight: '40px', flexShrink: 0,
          transition: 'box-shadow 0.4s ease, background 0.4s ease',
        }}>
          <Zap color="#fff" size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.25rem', lineHeight: 1.1,
            color: accentColor, fontWeight: 900,
            transition: 'color 0.4s ease',
          }}>Ultimate</h1>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '2px' }}>
            Digital Twin v2.0
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

        {/* Palette Dots */}
        <div style={{
          display: 'flex', gap: '6px', padding: '6px 10px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '999px',
          border: '1px solid var(--border)',
        }}>
          {PALETTES.map(p => (
            <button key={p.id} onClick={() => setPalette(p.id)} aria-label={`${p.name} theme`}
              title={p.name}
              style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: p.color, border: 'none',
                outline: palette === p.id ? `2.5px solid ${p.color}` : '2px solid transparent',
                outlineOffset: '2.5px',
                boxShadow: palette === p.id ? `0 0 12px ${p.color}70` : 'none',
                cursor: 'pointer', padding: 0,
                transform: palette === p.id ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Notification */}
        <button title="Notifications" style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px', padding: 0,
          borderRadius: '12px', background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)',
          transition: 'all 0.25s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
          <Bell size={16} />
          <span style={{
            position: 'absolute', top: '7px', right: '8px',
            width: '6px', height: '6px',
            background: 'var(--danger)', borderRadius: '50%',
            border: '1.5px solid var(--bg-card)',
          }} />
        </button>

        {/* Health Score Ring */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: '10px' }}>
          <HealthScoreRing size={36} />
        </div>

        {/* Settings Toggle */}
        <button onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          style={{
            width: '36px', height: '36px', padding: 0,
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
          <Settings size={16} />
        </button>

        {/* Theme Toggle */}
        <button onClick={() => {
            const nextTheme = theme === 'dark' ? 'amoled' : (theme === 'amoled' ? 'light' : 'dark');
            setTheme(nextTheme);
          }}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'amoled' : (theme === 'amoled' ? 'light' : 'dark')} mode`}
          style={{
            width: '36px', height: '36px', padding: 0,
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
          {theme === 'dark' ? <Moon size={16} /> : (theme === 'amoled' ? <Circle size={16} fill="currentColor" /> : <Sun size={16} />)}
        </button>

        {/* Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          paddingLeft: '14px',
          borderLeft: '1px solid var(--border)',
        }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
              {user?.name || 'Athlete'}
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: accentColor, marginTop: '2px', transition: 'color 0.4s ease' }}>
              Ultimate Plan
            </p>
          </div>
          <div style={{
            width: '36px', height: '36px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.9rem',
            boxShadow: `0 3px 14px ${accentColor}50`,
            flexShrink: 0,
            transition: 'all 0.4s ease',
            cursor: 'pointer',
          }}>
            {user?.name?.[0]?.toUpperCase() || 'G'}
          </div>
        </div>
      </div>
    </header>
  );
}
