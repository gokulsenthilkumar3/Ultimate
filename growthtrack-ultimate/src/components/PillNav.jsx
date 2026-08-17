import React, { useCallback } from 'react';
import { Sparkles, Shield, Heart, Wallet, FileText } from 'lucide-react';

const GROUPS = [
  { id: 'command',    label: 'Today',  icon: Sparkles, firstTab: 'overview',     color: '#0ea5e9' },
  { id: 'physiology', label: 'Body',   icon: Shield,   firstTab: 'humanoid',     color: '#10b981' },
  { id: 'lifestyle',  label: 'Life',   icon: Heart,    firstTab: 'sleep',        color: '#f43f5e' },
  { id: 'operations', label: 'Work',   icon: Wallet,   firstTab: 'tasks',        color: '#f59e0b' },
  { id: 'library',    label: 'More',   icon: FileText,  firstTab: 'entertainment', color: '#8b5cf6' },
];

export const TAB_GROUP_MAP = {
  overview: 'command', dashboards: 'command', logs: 'command',
  settings: 'command', apps: 'command', current: 'command', about: 'command',
  humanoid: 'physiology', physique: 'physiology', training: 'physiology',
  nutrition: 'physiology', assessment: 'physiology', medical: 'physiology',
  strength: 'physiology', hydration: 'physiology',
  sleep: 'lifestyle', lifestyle: 'lifestyle', goals: 'lifestyle',
  progress: 'lifestyle', health: 'lifestyle', mind: 'lifestyle',
  skills: 'lifestyle', analytics: 'lifestyle', forecast: 'lifestyle',
  tasks: 'operations', finance: 'operations', timesheet: 'operations',
  projects: 'operations', shopping: 'operations', calendar: 'operations',
  sip: 'operations',
  entertainment: 'library', notes: 'library', documents: 'library',
  databases: 'library', portfolio: 'library', social: 'library',
  ai: 'library', maps: 'library',
};

export default function PillNav({ activeTab, onTabChange }) {
  const activeGroup = TAB_GROUP_MAP[activeTab] || 'command';

  const handleSelect = useCallback((group) => {
    if (group.id !== activeGroup) {
      onTabChange(group.firstTab);
    }
  }, [activeGroup, onTabChange]);

  return (
    <div style={styles.container}>
      <nav style={styles.navBar} className="clay-panel" aria-label="Main navigation">
        <style>{`
          @keyframes labelIn {
            0% { opacity: 0; width: 0; transform: translateX(-4px); }
            100% { opacity: 1; width: auto; transform: translateX(0); }
          }
        `}</style>
        {GROUPS.map((group) => {
          const isActive = activeGroup === group.id;
          const Icon = group.icon;
          
          return (
            <button
              key={group.id}
              onClick={() => handleSelect(group)}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
                color: isActive ? group.color : 'var(--text-3)',
                boxShadow: isActive ? 'var(--shadow-neu-in)' : 'none',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
              }}
              aria-current={isActive ? 'page' : undefined}
              title={group.label}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{ transition: 'all 0.4s var(--ease)' }} />
              {isActive && <span style={styles.navLabel}>{group.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    pointerEvents: 'none',
    width: '100%',
    display: 'flex',
    justifyContent: 'center'
  },
  navBar: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px',
    borderRadius: '999px', // Pill shape
    // Incorporates glassmorphism & claymorphism (uses clay-panel class)
    background: 'var(--bg-glass)',
    backdropFilter: 'blur(28px) saturate(180%)',
    border: '1px solid var(--border-glow)',
  },
  navItem: {
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '999px',
    padding: '12px 14px',
    transition: 'all 0.4s var(--ease)',
  },
  navItemActive: {
    padding: '12px 20px',
  },
  navLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: '0.85rem',
    letterSpacing: '0.04em',
    animation: 'labelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    whiteSpace: 'nowrap',
    overflow: 'hidden'
  }
};
