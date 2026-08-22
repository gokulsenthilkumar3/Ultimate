import { Z_INDEX } from '../constants';
import React from 'react';
import { Zap, Moon, Sun, Bell, Settings } from 'lucide-react';
import HealthScoreRing from './HealthScoreRing';

export default function Header({ user, theme, setTheme, palette, onOpenSettings, unreadCount = 0, onOpenNotifications, serverStatus }) {
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

        {/* Theme toggle — dark / light */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '999px',
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.035)',
            color: 'var(--text-2)', cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 600,
            transition: 'all 0.25s ease',
          }}
        >
          {theme === 'dark'
            ? <><Moon size={12} /><span>Dark</span></>
            : <><Sun size={12} /><span>Light</span></>
          }
        </button>

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

        {/* Server status pill */}
        {serverStatus && serverStatus !== 'unknown' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '20px',
            background: serverStatus === 'online' ? 'var(--success-10, rgba(16, 185, 129, 0.1))' : 'rgba(255, 165, 0, 0.1)',
            border: `1px solid ${serverStatus === 'online' ? 'var(--success-20, rgba(16, 185, 129, 0.2))' : 'rgba(255, 165, 0, 0.3)'}`,
            fontSize: '0.65rem', fontWeight: 800,
            color: serverStatus === 'online' ? 'var(--success)' : 'orange',
            marginLeft: '8px'
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: serverStatus === 'online' ? 'var(--success)' : 'orange',
              boxShadow: `0 0 8px ${serverStatus === 'online' ? 'var(--success)' : 'orange'}`,
              animation: serverStatus === 'online' ? 'pulse 2s infinite' : 'none',
              display: 'inline-block',
            }} />
            {serverStatus === 'online' ? 'API ONLINE' : 'LOCAL SAVES'}
          </div>
        )}

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
