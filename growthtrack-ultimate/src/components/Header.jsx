import { Z_INDEX } from '../constants';
import React from 'react';
import { Zap, Moon, Sun, Bell, Circle, Settings } from 'lucide-react';
import HealthScoreRing from './HealthScoreRing';

export default function Header({ user, theme, setTheme, palette, onOpenSettings, unreadCount = 0, onOpenNotifications }) {
  const accentColor = palette === 'ocean' ? '#0ea5e9' : palette === 'mint' ? '#10b981' : palette === 'violet' ? '#8b5cf6' : palette === 'rose' ? '#f43f5e' : '#e5a50a';

  return (
    <header style={{
      margin: '12px 0',
      padding: '10px 16px',
      borderRadius: '18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      zIndex: Z_INDEX.HEADER,
      background: 'var(--bg-glass)',
      border: '1px solid var(--border-strong)',
      backdropFilter: 'blur(32px) saturate(200%)',
      WebkitBackdropFilter: 'blur(32px) saturate(200%)',
      boxShadow: `0 4px 22px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 42px -20px ${accentColor}40`,
      transition: 'box-shadow 0.5s ease',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`,
          padding: '9px', borderRadius: '14px',
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
            color: accentColor, fontWeight: 900, transition: 'color 0.4s ease',
          }}>Ultimate</h1>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '2px' }}>
            Digital Twin v2.0
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* Theme mode segmented control */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px',
          borderRadius: '999px',
          border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.03)'
        }}>
          {['dark', 'amoled', 'light'].map((mode) => {
            const active = theme === mode;
            const icon = mode === 'dark' ? Moon : mode === 'amoled' ? Circle : Sun;
            return (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                aria-label={`Switch to ${mode} mode`}
                title={mode}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '999px',
                  border: 'none',
                  background: active ? accentColor : 'transparent',
                  color: active ? '#fff' : 'var(--text-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                }}
              >
                {React.createElement(icon, { size: 15, fill: mode === 'amoled' ? 'currentColor' : 'none' })}
              </button>
            );
          })}
        </div>

        {/* ── Notification Bell with live unread count ── */}
        <button
          title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          onClick={onOpenNotifications}
          className="hover-border-accent"
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', padding: 0,
            borderRadius: '12px',
            background: unreadCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${unreadCount > 0 ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
            cursor: 'pointer',
            color: unreadCount > 0 ? '#ef4444' : 'var(--text-2)'
          }}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-5px', right: '-5px',
              minWidth: '17px', height: '17px', borderRadius: '99px',
              background: '#ef4444',
              border: '2px solid var(--bg-base)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.55rem', fontWeight: 900, color: '#fff',
              padding: '0 2px',
              boxShadow: '0 0 8px rgba(239,68,68,0.6)',
              animation: 'pulse 2s infinite',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Health Score Ring */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: '4px' }}>
          <HealthScoreRing size={32} />
        </div>

        {/* Settings */}
        <button onClick={onOpenSettings} aria-label="Open settings" title="Settings"
          className="hover-border-accent"
          style={{
            width: '36px', height: '36px', padding: 0, borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)', cursor: 'pointer'
          }}>
          <Settings size={16} />
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
            width: '36px', height: '36px', borderRadius: '12px',
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.9rem',
            boxShadow: `0 3px 14px ${accentColor}50`,
            flexShrink: 0, transition: 'all 0.4s ease', cursor: 'pointer',
          }}>
            {user?.name?.[0]?.toUpperCase() || 'G'}
          </div>
        </div>
      </div>
    </header>
  );
}
