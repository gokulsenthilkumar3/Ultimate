import { Z_INDEX } from '../constants';
import React, { useState, useRef, useEffect } from 'react';
import { Zap, Moon, Sun, Bell, Circle, Settings, Plus, CheckSquare, Flame, Utensils, Target, FileText, DollarSign, Dumbbell } from 'lucide-react';
import HealthScoreRing from './HealthScoreRing';
import useStore from '../store/useStore';

const PALETTES = [
  { id: 'gold',   color: '#e5a50a', name: 'Gold' },
  { id: 'ocean',  color: '#0ea5e9', name: 'Ocean' },
  { id: 'mint',   color: '#10b981', name: 'Mint' },
  { id: 'violet', color: '#8b5cf6', name: 'Violet' },
  { id: 'rose',   color: '#f43f5e', name: 'Rose' },
];

// ── Quick Action Tray ──
function QuickActionTray({ open, onClose, accentColor, setActiveTab }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const actions = [
    { id: 'tasks',     icon: CheckSquare, label: '+ Task',    color: '#f59e0b' },
    { id: 'habits',    icon: Flame,       label: '+ Habit',   color: '#f97316' },
    { id: 'nutrition', icon: Utensils,    label: '+ Meal',    color: '#84cc16' },
    { id: 'goals',     icon: Target,      label: '+ Goal',    color: '#60a5fa' },
    { id: 'notes',     icon: FileText,    label: '+ Note',    color: '#a78bfa' },
    { id: 'finance',   icon: DollarSign,  label: '+ Finance', color: '#34d399' },
    { id: 'training',  icon: Dumbbell,    label: '+ Workout', color: '#fb923c' },
  ];

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 12px)', right: '0', zIndex: Z_INDEX.OVERLAY,
      background: 'var(--bg-card)',
      border: '1px solid var(--border-strong)',
      borderRadius: '16px',
      backdropFilter: 'blur(24px)',
      padding: '8px',
      display: 'flex', flexDirection: 'column', gap: '4px',
      minWidth: '160px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--text-3)', fontWeight: 700, padding: '4px 8px 2px', textTransform: 'uppercase' }}>Quick Add</p>
      {actions.map(a => (
        <button
          key={a.id}
          onClick={() => {
            setActiveTab(a.id);
            // Delay so the component mounts before receiving the open-form event
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-add-form', { detail: { tab: a.id } }));
            }, 150);
            onClose();
          }}
          className="hover-bg-subtle"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', borderRadius: '10px',
            border: 'none', background: 'transparent',
            color: a.color, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700
          }}
        >
          <a.icon size={13} />
          {a.label}
        </button>
      ))}
    </div>
  );
}

export default function Header({ user, theme, setTheme, palette, setPalette, onOpenSettings, unreadCount = 0, onOpenNotifications }) {
  const accentColor = PALETTES.find(p => p.id === palette)?.color || '#e5a50a';
  const setActiveTab = useStore(s => s.setActiveTab);

  const [showQuickAdd, setShowQuickAdd] = useState(false);

  return (
    <header style={{
      margin: '14px 0',
      padding: '10px 20px',
      borderRadius: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      zIndex: Z_INDEX.HEADER,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

        {/* Palette Dots */}
        <div style={{
          display: 'flex', gap: '6px', padding: '6px 10px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '999px',
          border: '1px solid var(--border)',
        }}>
          {PALETTES.map(p => (
            <button key={p.id} onClick={() => setPalette(p.id)} aria-label={`${p.name} theme`} title={p.name}
              style={{
                width: '18px', height: '18px', borderRadius: '50%', background: p.color, border: 'none',
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

        {/* ── Quick Add tray button ── */}
        <div style={{ position: 'relative' }}>
          <button
            title="Quick Add"
            onClick={() => setShowQuickAdd(v => !v)}
            className="hover-border-accent"
            style={{
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', padding: 0,
              borderRadius: '12px', background: showQuickAdd ? `${accentColor}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showQuickAdd ? accentColor : 'var(--border)'}`,
              cursor: 'pointer', color: showQuickAdd ? accentColor : 'var(--text-2)'
            }}
          >
            <Plus size={16} />
          </button>
          <QuickActionTray
            open={showQuickAdd}
            onClose={() => setShowQuickAdd(false)}
            accentColor={accentColor}
            setActiveTab={setActiveTab}
          />
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
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: '10px' }}>
          <HealthScoreRing size={36} />
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

        {/* Theme Toggle */}
        <button
          onClick={() => {
            const nextTheme = theme === 'dark' ? 'amoled' : (theme === 'amoled' ? 'light' : 'dark');
            setTheme(nextTheme);
          }}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'amoled' : (theme === 'amoled' ? 'light' : 'dark')} mode`}
          className="hover-border-accent"
          style={{
            width: '36px', height: '36px', padding: 0, borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)', cursor: 'pointer'
          }}>
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
