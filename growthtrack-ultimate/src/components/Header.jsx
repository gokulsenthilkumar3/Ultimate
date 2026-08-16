import { Z_INDEX } from '../constants';
import React from 'react';
import { Zap, Moon, Sun, Circle, Bell, Settings } from 'lucide-react';
import HealthScoreRing from './HealthScoreRing';

export default function Header({ user, theme, setTheme, palette, onOpenSettings, unreadCount = 0, onOpenNotifications }) {
  const accentColor = palette === 'ocean' ? '#06b6d4' : palette === 'mint' ? '#10b981' : palette === 'violet' ? '#7c3aed' : palette === 'rose' ? '#f43f5e' : palette === 'gold' ? '#e5a50a' : '#06b6d4';

  return (
    <header style={{
      margin: '8px 0',
      padding: '8px 14px',
      borderRadius: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      zIndex: Z_INDEX.HEADER,
      background: 'var(--bg-glass)',
      border: '1px solid var(--border-strong)',
      backdropFilter: 'blur(40px) saturate(210%)',
      WebkitBackdropFilter: 'blur(40px) saturate(210%)',
      boxShadow: `0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px -20px ${accentColor}50`,
      transition: 'box-shadow 0.5s ease',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
          padding: '8px', borderRadius: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 16px ${accentColor}44, 0 0 0 1px rgba(255,255,255,0.08) inset`,
          minWidth: '36px', minHeight: '36px', flexShrink: 0,
          transition: 'all 0.4s ease',
        }}>
          <Zap color="#fff" size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: 1.1,
            fontWeight: 900, transition: 'color 0.4s ease',
            background: `linear-gradient(90deg, ${accentColor}, #22d3ee, ${accentColor})`,
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 4s linear infinite',
          }}>Ultimate</h1>
          <p style={{ fontFamily: 'var(--font-mono, var(--font-display))', fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '1px' }}>
            Digital Twin v2
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

        {/* Theme mode segmented control */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '3px', borderRadius: '999px',
          border: '1px solid var(--border)', background: 'rgba(255,255,255,0.025)'
        }}>
        {(['dark', 'amoled', 'light']).map((mode) => {
            const active = theme === mode;
            const icon = mode === 'dark' ? Moon : mode === 'amoled' ? Circle : Sun;

            return (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                aria-label={`Switch to ${mode} mode`}
                title={mode}
                style={{
                  width: '30px', height: '30px',
                  borderRadius: '999px', border: 'none',
                  background: active ? accentColor : 'transparent',
                  color: active ? '#fff' : 'var(--text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.22s ease',
                  boxShadow: active ? `0 0 12px ${accentColor}66` : 'none',
                }}
              >
                {React.createElement(icon, { size: 13, fill: mode === 'amoled' ? 'currentColor' : 'none' })}
              </button>
            );
          })}
        </div>

        {/* Notification Bell */}
        <button
          title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          onClick={onOpenNotifications}
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '32px', padding: 0,
            borderRadius: '10px',
            background: unreadCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.035)',
            border: `1px solid ${unreadCount > 0 ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
            cursor: 'pointer',
            color: unreadCount > 0 ? '#ef4444' : 'var(--text-2)',
            transition: 'all 0.2s ease',
          }}
        >
          <Bell size={14} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-5px', right: '-5px',
              minWidth: '15px', height: '15px', borderRadius: '99px',
              background: '#ef4444', border: '2px solid var(--bg-base)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.5rem', fontWeight: 900, color: '#fff', padding: '0 2px',
              boxShadow: '0 0 8px rgba(239,68,68,0.6)',
              animation: 'pulse 2s infinite',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Health Score Ring */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: '2px' }}>
          <HealthScoreRing size={28} />
        </div>

        {/* Settings */}
        <button onClick={onOpenSettings} aria-label="Open settings" title="Settings"
          style={{
            width: '32px', height: '32px', padding: 0, borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)', background: 'rgba(255,255,255,0.035)',
            border: '1px solid var(--border)', cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}>
          <Settings size={14} />
        </button>

        {/* Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          paddingLeft: '12px', borderLeft: '1px solid var(--border)',
        }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
              {user?.name || 'Athlete'}
            </p>
            <p style={{ fontFamily: 'var(--font-mono, var(--font-display))', fontSize: '0.48rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: accentColor, marginTop: '1px', transition: 'color 0.4s ease' }}>
              Ultimate
            </p>
          </div>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.82rem',
            boxShadow: `0 0 14px ${accentColor}44`,
            flexShrink: 0, transition: 'all 0.4s ease', cursor: 'pointer',
          }}>
            {user?.name?.[0]?.toUpperCase() || 'G'}
          </div>
        </div>
      </div>
    </header>
  );
}
