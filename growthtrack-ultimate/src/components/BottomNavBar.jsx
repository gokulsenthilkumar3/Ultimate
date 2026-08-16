import React from 'react';
import { Shield, Heart, Wallet, FileText, Sparkles } from 'lucide-react';

// Tab → group mapping (single source of truth)
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

export const GROUPS = [
  { id: 'command',    label: 'Today',      icon: Sparkles,        firstTab: 'overview' },
  { id: 'physiology', label: 'Body',       icon: Shield,          firstTab: 'humanoid' },
  { id: 'lifestyle',  label: 'Life',       icon: Heart,           firstTab: 'sleep'    },
  { id: 'operations', label: 'Work',      icon: Wallet,          firstTab: 'tasks'    },
  { id: 'library',    label: 'More',      icon: FileText,        firstTab: 'entertainment' },
];

export default function BottomNavBar({ activeTab, onTabChange }) {
  const activeGroup = TAB_GROUP_MAP[activeTab] || 'command';

  return (
    <nav className="mobile-bottom-nav" role="tablist" aria-label="Section navigation">
      {GROUPS.map((group) => {
        const isActive = activeGroup === group.id;
        return (
          <button
            key={group.id}
            role="tab"
            aria-selected={isActive}
            aria-label={`${group.label} section`}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(group.firstTab)}
          >
            <span className="bottom-nav-dot" aria-hidden="true" />
            <span className="bottom-nav-label" aria-hidden={!isActive}>
              {group.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
